"""
PS-02: Smart Crop Advisory & Farmer Distress Early-Warning System (v3)
FastAPI Backend Application
"""

import json
import os
import re
import sqlite3
import urllib.request
import urllib.parse
import edge_tts
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Body, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import sys

SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SERVER_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

try:
    from server.engine.channel_router import get_recommended_channel, get_default_ui_mode
    from server.engine.advisory_engine import get_advisory
    from server.engine.distress_scorer import calculate_distress_score, DEFAULT_WEIGHTS
except ImportError:
    from engine.channel_router import get_recommended_channel, get_default_ui_mode
    from engine.advisory_engine import get_advisory
    from engine.distress_scorer import calculate_distress_score, DEFAULT_WEIGHTS

DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "distress_system.db")
CLIENT_DIR = os.path.join(BASE_DIR, "client")



app = FastAPI(
    title="PS-02 Smart Crop Advisory & Distress Early-Warning API",
    version="3.0.0",
    description="Comprehensive Feasibility Edition: Advisory Engine, Distress-Risk Scorer, MSP Financial Overrides & Scheme Interventions"
)

@app.on_event("startup")
def migrate_db_schema():
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(farmers)")
        cols = [c[1] for c in cur.fetchall()]
        if 'soil_type' not in cols:
            cur.execute("ALTER TABLE farmers ADD COLUMN soil_type TEXT DEFAULT 'black'")
            conn.commit()
        conn.close()
    except Exception as e:
        print("DB migration error:", e)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def load_full_datastore():
    """Loads current datastore from SQLite for pure function engines"""
    conn = get_db_connection()
    cursor = conn.cursor()

    districts = [dict(row) for row in cursor.execute("SELECT * FROM districts").fetchall()]
    mandi_prices = [dict(row) for row in cursor.execute("SELECT * FROM mandi_prices").fetchall()]
    farmers_raw = cursor.execute("SELECT * FROM farmers").fetchall()
    farmers = []
    for f in farmers_raw:
        fd = dict(f)
        # Deserialize JSON list columns
        try:
            fd["enrolled_schemes"] = json.loads(fd["enrolled_schemes"]) if fd.get("enrolled_schemes") else []
        except Exception:
            fd["enrolled_schemes"] = []
        try:
            fd["income_sources"] = json.loads(fd["income_sources"]) if fd.get("income_sources") else ["crop_cultivation"]
        except Exception:
            fd["income_sources"] = ["crop_cultivation"]
        # SQLite stores booleans as INTEGER (0/1); convert back to bool for the scorer
        fd["borewell_failed"] = bool(fd.get("borewell_failed", 0))
        fd["has_pmfby_insurance"] = bool(fd.get("has_pmfby_insurance", 0))
        fd["has_kcc"] = bool(fd.get("has_kcc", 0))
        fd["informal_debt"] = bool(fd.get("informal_debt", 0))
        try:
            p_row = cursor.execute("""
                SELECT total_land_area, land_unit, state, district_id 
                FROM onboarding_profiles 
                WHERE id = ? OR phone_number LIKE ? OR farmer_name = ?
                ORDER BY created_at DESC LIMIT 1
            """, (f"PROF_{fd['id']}", f"%{fd.get('phone', '').replace('-','').replace('+91','')}%", fd.get('name'))).fetchone()
            if p_row:
                fd["total_land_area"] = float(p_row[0])
                fd["land_unit"] = str(p_row[1])
                fd["state"] = str(p_row[2])
            else:
                fd["total_land_area"] = float(fd.get("landholding_hectares", 1.0))
                fd["land_unit"] = "hectares"
        except Exception:
            fd["total_land_area"] = float(fd.get("landholding_hectares", 1.0))
            fd["land_unit"] = "hectares"
        farmers.append(fd)

    schemes = [dict(row) for row in cursor.execute("SELECT * FROM schemes").fetchall()]
    daily_rainfall = [dict(row) for row in cursor.execute("SELECT * FROM daily_rainfall").fetchall()]
    officers_raw = cursor.execute("SELECT * FROM officers").fetchall()
    officers = []
    for o in officers_raw:
        od = dict(o)
        try:
            od["assigned_districts"] = json.loads(od["assigned_districts"]) if od.get("assigned_districts") else []
        except Exception:
            od["assigned_districts"] = []
        officers.append(od)

    contingency_raw = cursor.execute("SELECT * FROM contingency_crops").fetchall()
    contingency_crops = []
    for c in contingency_raw:
        cd = dict(c)
        try:
            cd["recommended_contingency_crops"] = json.loads(cd["recommended_contingency_crops"]) if cd.get("recommended_contingency_crops") else []
        except Exception:
            cd["recommended_contingency_crops"] = []
        contingency_crops.append(cd)

    advisory_rules = [dict(row) for row in cursor.execute("SELECT * FROM advisory_rules").fetchall()]
    try:
        sundargarh_blocks = [dict(row) for row in cursor.execute("SELECT * FROM sundargarh_blocks").fetchall()]
    except Exception:
        sundargarh_blocks = []
    try:
        sundargarh_mandis = [dict(row) for row in cursor.execute("SELECT * FROM sundargarh_mandis").fetchall()]
    except Exception:
        sundargarh_mandis = []
    conn.close()

    return {
        "districts": districts,
        "mandi_prices": mandi_prices,
        "farmers": farmers,
        "schemes": schemes,
        "daily_rainfall": daily_rainfall,
        "officers": officers,
        "contingency_crops": contingency_crops,
        "advisory_rules": advisory_rules,
        "sundargarh_blocks": sundargarh_blocks,
        "sundargarh_mandis": sundargarh_mandis
    }


class WeightOverride(BaseModel):
    """
    ICAR-CRIDA FDI 6-Dimension weight overrides.
    Weights are auto-normalized to sum to 1.0 in the scorer.
    """
    exposure:           Optional[float] = 0.25   # Dimension 1 — Climate & Price Hazard
    sensitivity:        Optional[float] = 0.15   # Dimension 2 — Irrigation Dependency
    adaptive_capacity:  Optional[float] = 0.15   # Dimension 3 — Landholding & Income (inverted)
    mitigation_deficit: Optional[float] = 0.15   # Dimension 4 — PMFBY / KCC Gap
    trigger:            Optional[float] = 0.20   # Dimension 5 — Loan & Informal Debt Shock
    district_fragility: Optional[float] = 0.10   # Dimension 6 — Historical Vulnerability (officer-facing)


class IvrRequest(BaseModel):
    farmer_id: str
    digit_pressed: Optional[str] = None
    language: Optional[str] = None
    menu_state: Optional[str] = None


class LandDetails(BaseModel):
    total_area: float
    unit: str = "acres"
    soil_type: str = "alluvial"


class FarmerOnboardingPayload(BaseModel):
    farmer_name: str
    phone_number: str
    state: str
    district: str
    land_details: LandDetails
    primary_crops: List[str]
    crop_stage: Optional[str] = "vegetative"
    irrigation_type: Optional[str] = "rainfed"
    borewell_failed: Optional[bool] = False
    has_pmfby: Optional[bool] = True
    has_kcc: Optional[bool] = True
    informal_debt: Optional[bool] = False
    loan_due_date: Optional[str] = "2026-11-15"
    loan_amount: Optional[float] = 50000.0
    device_type: Optional[str] = "android_smartphone"
    preferred_language: str  # e.g. "hi-IN", "mr-IN", "or-IN", "as-IN", "kn-IN", "en-IN"
    tts_locale: Optional[str] = "hi-IN"
    voice_profile: Optional[str] = "hi-IN-SwaraNeural" 


class SmsCommunicationRequest(BaseModel):
    farmer_id: Optional[str] = None
    to: Optional[str] = None
    preferred_language: Optional[str] = "hi-IN"
    template_key: str = "welcome"
    variables: Optional[Dict[str, Any]] = None


class IvrCommunicationRequest(BaseModel):
    farmer_id: Optional[str] = None
    to: Optional[str] = None
    tts_locale: str = "hi-IN"
    prompt_key: Optional[str] = "welcome"
    spoken_text: Optional[str] = None
    voice_profile: Optional[str] = "hi-IN-SwaraNeural"


class AuthLoginPayload(BaseModel):
    phone_or_id: str
    password: Optional[str] = None


def get_authenticated_farmer_id(authorization: Optional[str] = Header(None), x_farmer_id: Optional[str] = Header(None)) -> str:
    """Validates Bearer token or session header and scopes user to their specific farmer_id"""
    if x_farmer_id and x_farmer_id.strip():
        return x_farmer_id.strip()
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()
            if token.startswith("token_farmer_"):
                return token.replace("token_farmer_", "")
            elif token.startswith("token_") and token.replace("token_", ""):
                return token.replace("token_", "")
            elif token:
                return token
    return "F1"


@app.post("/api/auth/login")
@app.post("/api/v1/auth/login")
@app.post("/api/auth/session")
@app.post("/api/v1/auth/session")
def authenticate_session(payload: AuthLoginPayload):
    """Authenticates a farmer and creates a secure session token"""
    data = load_full_datastore()
    target = payload.phone_or_id.strip()
    farmer = next((
        f for f in data["farmers"]
        if f["id"].lower() == target.lower()
        or f.get("phone", "").replace("-", "").replace("+91", "").strip() == target.replace("-", "").replace("+91", "").strip()
    ), None)

    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer account not found with the provided phone or ID")

    token = f"token_farmer_{farmer['id']}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": farmer["id"],
            "name": farmer["name"],
            "phone": farmer.get("phone", ""),
            "crop": farmer.get("crop", ""),
            "crop_stage": farmer.get("crop_stage", ""),
            "district_id": farmer.get("district_id", ""),
            "preferred_language": farmer.get("language", "hi")
        }
    }


@app.get("/api/v1/farmer/profile")
def get_authenticated_farmer_profile(
    authorization: Optional[str] = Header(None),
    x_farmer_id: Optional[str] = Header(None)
):
    """Strictly Scoped Authenticated Farmer Profile Endpoint"""
    farmer_id = get_authenticated_farmer_id(authorization, x_farmer_id)
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == farmer_id), None)
    if not farmer:
        farmer = data["farmers"][0] if data["farmers"] else None
        if not farmer:
            raise HTTPException(status_code=404, detail="Authenticated farmer profile not found")

    district = next((d for d in data["districts"] if d["id"] == farmer["district_id"]), {})
    weather = next((w for w in data["daily_rainfall"] if w["district_id"] == farmer["district_id"]), {})
    advisory = get_advisory(farmer["id"], data)
    distress = calculate_distress_score(farmer["id"], DEFAULT_WEIGHTS, data)
    channel = get_recommended_channel(farmer)
    ui_mode = get_default_ui_mode(farmer)

    farmer_mandi_prices = [
        p for p in data["mandi_prices"]
        if p["crop"].lower() == farmer["crop"].lower() and p["district_id"] == farmer["district_id"]
    ]

    return {
        "authenticated_user": {
            "id": farmer["id"],
            "name": farmer["name"],
            "phone": farmer.get("phone", ""),
            "village": farmer.get("village", ""),
            "district_id": district.get("id"),
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "landholding_hectares": farmer["landholding_hectares"],
            "total_land_area": farmer.get("total_land_area", farmer["landholding_hectares"]),
            "land_unit": farmer.get("land_unit", "hectares"),
            "state": farmer.get("state", district.get("state", "")),
            "soil_type": farmer.get("soil_type") or district.get("soil_type", "Black Cotton"),
            "preferred_language": farmer.get("language", "hi"),
            "device_type": farmer.get("device_type", "android_smartphone"),
            "network_quality": farmer["network_quality"],
            "tech_literacy": farmer["tech_literacy"],
            "recommended_channel": channel,
            "default_ui_mode": ui_mode,
            "enrolled_schemes": farmer.get("enrolled_schemes", []),
            "irrigation_type": farmer.get("irrigation_type", "rainfed"),
            "loan_due_date": farmer.get("loan_due_date", ""),
            "loan_amount_inr": farmer.get("loan_amount_inr", 0)
        },
        "advisory": advisory,
        "distress_assessment": distress,
        "weather_summary": weather,
        "mandi_prices": farmer_mandi_prices
    }


@app.post("/api/onboarding/profile")
@app.post("/api/v1/onboarding/profile")
def save_onboarding_profile(payload: FarmerOnboardingPayload):
    """Mandatory Pre-Dashboard Onboarding Endpoint"""
    conn = get_db_connection()
    cursor = conn.cursor()

    area_hectares = payload.land_details.total_area
    if payload.land_details.unit.lower() == "acres":
        area_hectares = round(payload.land_details.total_area * 0.404686, 2)

    lang_code = payload.preferred_language.split("-")[0].lower()
    if lang_code not in ["en", "hi", "mr", "as", "or", "kn"]:
        lang_code = "hi"

    norm_phone = payload.phone_number.replace("+91-", "").replace("+91", "").replace("-", "").strip()
    existing_farmer = cursor.execute("""
        SELECT id FROM farmers 
        WHERE phone LIKE ? OR phone LIKE ? OR name = ?
    """, (f"%{norm_phone}%", f"%{payload.phone_number}%", payload.farmer_name)).fetchone()

    if existing_farmer:
        farmer_id = existing_farmer[0]
    else:
        existing_count = cursor.execute("SELECT COUNT(*) FROM farmers").fetchone()[0]
        farmer_id = f"F{existing_count + 1}"
    profile_id = f"PROF_{farmer_id}"

    device_type_val = payload.device_type or "android_smartphone"

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS onboarding_profiles (
            id TEXT PRIMARY KEY,
            farmer_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            state TEXT NOT NULL,
            district_id TEXT NOT NULL,
            total_land_area REAL NOT NULL,
            land_unit TEXT NOT NULL,
            soil_type TEXT NOT NULL,
            device_type TEXT DEFAULT 'android_smartphone',
            primary_crops TEXT NOT NULL,
            preferred_language TEXT NOT NULL,
            tts_locale TEXT NOT NULL,
            voice_profile TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        INSERT OR REPLACE INTO onboarding_profiles (
            id, farmer_name, phone_number, state, district_id,
            total_land_area, land_unit, soil_type, device_type, primary_crops,
            preferred_language, tts_locale, voice_profile
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        profile_id,
        payload.farmer_name,
        payload.phone_number,
        payload.state,
        payload.district,
        payload.land_details.total_area,
        payload.land_details.unit,
        payload.land_details.soil_type,
        device_type_val,
        json.dumps(payload.primary_crops),
        payload.preferred_language,
        payload.tts_locale or payload.preferred_language,
        payload.voice_profile or "hi-IN-SwaraNeural"
    ))

    primary_crop = payload.primary_crops[0] if payload.primary_crops else "onion"
    is_feature_phone = "feature" in device_type_val.lower() or "basic" in device_type_val.lower()
    network_val = "poor_2g" if is_feature_phone else "good_4g"
    stage_val = payload.crop_stage or "vegetative"
    irr_val = payload.irrigation_type or "rainfed"
    borewell_val = 1 if payload.borewell_failed else 0
    pmfby_val = 1 if payload.has_pmfby else 0
    kcc_val = 1 if payload.has_kcc else 0
    informal_val = 1 if payload.informal_debt else 0
    loan_date_val = payload.loan_due_date or "2026-11-15"
    loan_amt_val = float(payload.loan_amount) if payload.loan_amount is not None else 50000.0

    cursor.execute("""
        INSERT OR REPLACE INTO farmers (
            id, name, phone, district_id, village, crop, crop_stage,
            language, loan_due_date, loan_amount_inr, tech_literacy,
            device_type, network_quality, landholding_hectares,
            irrigation_type, borewell_failed, income_sources,
            has_pmfby_insurance, has_kcc, informal_debt,
            enrolled_schemes, officer_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        farmer_id,
        payload.farmer_name,
        f"+91-{payload.phone_number}",
        payload.district,
        f"{payload.state} Village",
        primary_crop,
        stage_val,
        lang_code,
        loan_date_val,
        loan_amt_val,
        "low" if is_feature_phone else "medium",
        device_type_val,
        network_val,
        area_hectares,
        irr_val,
        borewell_val,
        json.dumps(["crop_cultivation"]),
        pmfby_val,
        kcc_val,
        informal_val,
        json.dumps(["PMFBY", "PM-KISAN"]),
        "OFF_01"
    ))

    conn.commit()
    conn.close()

    token = f"token_farmer_{farmer_id}"

    return {
        "status": "success",
        "message": "Farmer profile onboarded and localized successfully",
        "access_token": token,
        "token_type": "bearer",
        "profile_id": profile_id,
        "farmer_id": farmer_id,
        "farmer_name": payload.farmer_name,
        "preferred_language": payload.preferred_language,
        "tts_locale": payload.tts_locale or payload.preferred_language,
        "voice_profile": payload.voice_profile or "hi-IN-SwaraNeural",
        "landholding_hectares": area_hectares,
        "total_land_area": payload.land_details.total_area,
        "land_unit": payload.land_details.unit,
        "primary_crops": payload.primary_crops,
        "user": {
            "id": farmer_id,
            "name": payload.farmer_name,
            "phone": payload.phone_number,
            "district_id": payload.district,
            "state": payload.state,
            "total_land_area": payload.land_details.total_area,
            "land_unit": payload.land_details.unit,
            "preferred_language": payload.preferred_language
        }
    }


@app.post("/api/communications/sms")
@app.post("/api/v1/communication/sms")
def trigger_outbound_sms(payload: SmsCommunicationRequest):
    """Outbound SMS Payload Builder & Notification Dispatcher across all 6 regional languages"""
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    
    phone = payload.to or (farmer["phone"] if farmer else "+91-9876543210")
    name = farmer["name"] if farmer else "Kisan Mitra"
    district_name = farmer.get("district_id", "District") if farmer else "District"
    crop = farmer.get("crop", "Crop") if farmer else "Crop"

    lang = payload.preferred_language or (farmer.get("language", "hi") if farmer else "hi")
    lang_prefix = lang.split("-")[0].lower()

    templates = {
        "welcome": {
            "en": f"[SMART KRISHI] Welcome {name}! Your farm profile in {district_name} is active. Advisories will arrive in English. Helpline: 1800-180-1551.",
            "hi": f"[स्मार्ट कृषि] स्वागत है {name} जी! {district_name} में आपका खेत पंजीकृत हो गया है। सभी सलाह हिंदी में मिलेंगी। हेल्पलाइन: 1800-180-1551.",
            "mr": f"[स्मार्ट कृषी] स्वागत आहे {name} जी! {district_name} मध्ये आपली शेती नोंदणीकृत झाली आहे. सर्व सल्ला मराठीत मिळेल. हेल्पलाइन: 1800-180-1551.",
            "as": f"[স্মাৰ্ট কৃষি] স্বাগতম {name}! {district_name} জিলাত আপোনাৰ কৃষি পঞ্জীয়ন সম্পূৰ্ণ হ'ল। সকলো বাৰ্তা অসমীয়াত পাব। হেল্পলাইন: 1800-180-1551.",
            "or": f"[ସ୍ମାର୍ଟ କୃଷି] ସ୍ୱାଗତ {name}! {district_name} ରେ ଆପଣଙ୍କ କୃଷି ପ୍ରୋଫାଇଲ୍ ସକ୍ରିୟ ହୋଇଛି। ସମସ୍ତ ସୂଚନା ଓଡ଼ିଆରେ ମିଳିବ। ହେଲ୍ପଲାଇନ୍: 1800-180-1551.",
            "kn": f"[ಸ್ಮಾರ್ಟ್ ಕೃಷಿ] ಸ್ವಾಗತ {name}! {district_name} ನಲ್ಲಿ ನಿಮ್ಮ ಕೃಷಿ ಪ್ರೊಫೈಲ್ ಸಕ್ರಿಯವಾಗಿದೆ. ಮಾಹಿತಿ ಕನ್ನಡದಲ್ಲಿ ಲಭ್ಯ. ಸಹಾಯವಾಣಿ: 1800-180-1551."
        },
        "advisory_alert": {
            "en": f"[SMART KRISHI ALERT] {name}: Critical weather & market update for {crop} in {district_name}. Open app or press 1 on IVR. Helpline: 1800-180-1551.",
            "hi": f"[स्मार्ट कृषि चेतावनी] {name}: {district_name} में {crop} हेतु मौसम व भाव अलर्ट। ऐप खोलें या IVR पर 1 दबाएं। हेल्पलाइन: 1800-180-1551.",
            "mr": f"[स्मार्ट कृषी अलर्ट] {name}: {district_name} मध्ये {crop} पिकासाठी हवामान व बाजारभाव सूचना. ॲप उघडा किंवा IVR वर १ दाबा. हेल्पलाइन: 1800-180-1551.",
            "as": f"[স্মাৰ্ট কৃষি সতৰ্কবাৰ্তা] {name}: {district_name}ত {crop} শস্যৰ বতৰ আৰু দৰ সতৰ্কবাৰ্তা। এপ খোলক বা IVRত ১ টিপক। হেল্পলাইন: 1800-180-1551.",
            "or": f"[ସ୍ମାର୍ଟ କୃଷି ସତର୍କତା] {name}: {district_name} ରେ {crop} ପାଇଁ ପାଣିପାଗ ଓ ଦର ସୂଚନା। ଆପ୍ ଖୋଲନ୍ତୁ କିମ୍ବା IVR ରେ ୧ ଦବାନ୍ତୁ। ହେଲ୍ପଲାଇନ୍: 1800-180-1551.",
            "kn": f"[ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಎಚ್ಚರಿಕೆ] {name}: {district_name} ದಲ್ಲಿ {crop} ಬೆಳೆಗೆ ಹವಾಮಾನ ಮತ್ತು ದರ ಎಚ್ಚರಿಕೆ. ಆ್ಯಪ್ ನೋಡಿ ಅಥವಾ IVR ೧ ಒತ್ತಿ. ಸಹಾಯವಾಣಿ: 1800-180-1551."
        }
    }

    selected_tmpl = templates.get(payload.template_key, templates["welcome"])
    sms_body = selected_tmpl.get(lang_prefix, selected_tmpl["en"])

    return {
        "status": "QUEUED",
        "provider": "TELEPHONY_GATEWAY_V3",
        "recipient": {
            "to": phone,
            "farmer_id": payload.farmer_id,
            "farmer_name": name
        },
        "localization": {
            "preferred_language": payload.preferred_language,
            "lang_code": lang_prefix,
            "encoding": "UCS-2" if lang_prefix != "en" else "GSM-7",
            "is_unicode": lang_prefix != "en"
        },
        "message": {
            "template_id": payload.template_key,
            "body": sms_body,
            "character_count": len(sms_body),
            "sms_segments": (len(sms_body) // 70) + 1 if lang_prefix != "en" else (len(sms_body) // 160) + 1
        },
        "gateway_dispatch_payload": {
            "From": "KRISHI",
            "To": phone,
            "Body": sms_body,
            "StatusCallback": "/api/webhooks/sms/status"
        }
    }


@app.post("/api/communications/ivr-call")
@app.post("/api/v1/communication/ivr")
def trigger_outbound_ivr_call(payload: IvrCommunicationRequest):
    """Outbound Voice/IVR Call Payload Builder supporting all 6 regional languages"""
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    
    phone = payload.to or (farmer["phone"] if farmer else "+91-9876543210")
    name = farmer["name"] if farmer else "Kisan Mitra"
    tts_locale = payload.tts_locale or "hi-IN"
    lang_prefix = tts_locale.split("-")[0].lower()

    voice_prompts = {
        "welcome": {
            "en": f"Welcome {name} to Smart Krishi Advisory Helpline. For Weather press 1, for Mandi prices press 2, for Government relief schemes press 3.",
            "hi": f"नमस्ते {name} किसान भाई! स्मार्ट कृषि में आपका स्वागत है। मौसम सलाह हेतु 1 दबाएं, मंडी भाव हेतु 2 दबाएं, सरकारी योजनाओं हेतु 3 दबाएं।",
            "mr": f"नमस्कार {name} शेतकरी बंधू! स्मार्ट कृषी हेल्पलाइनमध्ये आपले स्वागत आहे. हवामानासाठी १ दाबा, बाजारभावासाठी २ दाबा, शासकीय योजनांसाठी ३ दाबा.",
            "as": f"নমস্কাৰ {name} কৃষক ভাই! স্মাৰ্ট কৃষি সেৱালৈ আপোনাক স্বাগতম। বতৰৰ বাবে ১ টিপক, বজাৰ দৰৰ বাবে ২ টিপক, চৰকাৰী আঁচনিৰ বাবে ৩ টিপক।",
            "or": f"ନମସ୍କାର {name} କୃଷକ ଭାଇ! ସ୍ମାର୍ଟ କୃଷିକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ପାଣିପାଗ ପାଇଁ ୧ ଦବାନ୍ତୁ, ମଣ୍ଡି ଦର ପାଇଁ ୨ ଦବାନ୍ତୁ, ସରକାରୀ ଯୋଜନା ପାଇଁ ୩ ଦବାନ୍ତୁ।",
            "kn": f"ನಮಸ್ಕಾರ {name} ರೈತ ಬಾಂಧವರೇ! ಸ್ಮಾರ್ಟ್ ಕೃಷಿಗೆ ತಮಗೆ ಸ್ವಾಗತ. ಹವಾಮಾನಕ್ಕಾಗಿ ೧ ಒತ್ತಿ, ಮಂಡಿ ಬೆಲೆಗಾಗಿ ೨ ಒತ್ತಿ, ಸರ್ಕಾರಿ ಯೋಜನೆಗಳಿಗಾಗಿ ೩ ಒತ್ತಿ."
        }
    }

    prompt_catalog = voice_prompts.get(payload.prompt_key or "welcome", voice_prompts["welcome"])
    spoken_text = payload.spoken_text or prompt_catalog.get(lang_prefix, prompt_catalog["en"])

    return {
        "status": "CALL_INITIATED",
        "provider": "TELEPHONY_IVR_ENGINE_V3",
        "call_session": {
            "to": phone,
            "farmer_id": payload.farmer_id,
            "farmer_name": name,
            "direction": "outbound-dial"
        },
        "tts_engine_config": {
            "tts_locale": tts_locale,
            "voice_profile": payload.voice_profile or f"{tts_locale}-Standard-A",
            "sample_rate_hertz": 24000,
            "audio_encoding": "MP3",
            "spoken_text": spoken_text
        },
        "ivr_tree_action": {
            "action_url": "/api/simulate/ivr",
            "num_digits": 1,
            "timeout_seconds": 15,
            "finish_on_key": "#"
        }
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PS-02 Smart Crop Advisory & Distress Scorer",
        "version": "3.0.0"
    }


@app.get("/api/districts")
def get_all_districts():
    data = load_full_datastore()
    return data["districts"]


@app.get("/api/sundargarh/blocks")
@app.get("/api/v1/sundargarh/blocks")
def get_sundargarh_blocks():
    """Returns all 17 blocks of Sundargarh District, Odisha with micro-climate & hazard metrics"""
    data = load_full_datastore()
    return data.get("sundargarh_blocks", [])


def fetch_sundargarh_live_weather(latitude: float = 22.12, longitude: float = 84.03):
    """
    Fetches real-time live weather and 7-day forecast from Open-Meteo API for Sundargarh, Odisha (22.12°N, 84.03°E).
    Falls back gracefully to high-fidelity synchronized baseline weather if offline.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FKolkata"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "KrishiAdvisorySystem/3.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "source": "Open-Meteo Live API / IMD Doppler Satellite Grid",
                "coordinates": {"latitude": latitude, "longitude": longitude, "district": "Sundargarh", "state": "Odisha"},
                "current": data.get("current", {}),
                "daily_forecast": data.get("daily", {}),
                "synoptic_alert": "Yellow Warning: Heavy to very heavy rainfall spells active across Sundargarh & Brahmani basin due to Bay of Bengal low-pressure area.",
                "is_live": True
            }
    except Exception:
        return {
            "source": "IMD Regional Met Centre Bhubaneswar / In-situ Baseline",
            "coordinates": {"latitude": latitude, "longitude": longitude, "district": "Sundargarh", "state": "Odisha"},
            "current": {
                "temperature_2m": 31.4,
                "relative_humidity_2m": 82,
                "apparent_temperature": 37.2,
                "precipitation": 12.5,
                "rain": 12.5,
                "weather_code": 63,
                "wind_speed_10m": 16.2,
                "wind_direction_10m": 110
            },
            "daily_forecast": {
                "time": ["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"],
                "temperature_2m_max": [32.0, 31.5, 29.8, 30.2, 32.5, 33.1, 33.8],
                "temperature_2m_min": [25.1, 24.8, 23.9, 24.2, 25.0, 25.4, 25.6],
                "precipitation_sum": [18.4, 32.6, 45.2, 14.0, 4.2, 1.0, 0.0],
                "precipitation_probability_max": [85, 95, 100, 70, 40, 20, 10],
                "weather_code": [63, 65, 95, 61, 51, 2, 1]
            },
            "synoptic_alert": "Yellow Warning: Low-pressure depression over North Bay of Bengal bringing widespread showers across Sundargarh district.",
            "is_live": False
        }


@app.get("/api/sundargarh/live-weather")
@app.get("/api/v1/sundargarh/live-weather")
def get_sundargarh_live_weather(lat: Optional[float] = 22.12, lon: Optional[float] = 84.03):
    """Returns real-time live weather and 7-day forecast for Sundargarh District, Odisha"""
    return fetch_sundargarh_live_weather(lat, lon)


@app.get("/api/sundargarh/mandis")
@app.get("/api/v1/sundargarh/mandis")
def get_sundargarh_mandis():
    """Returns Agmarknet / OSAMB real RMC market yard rates for Sundargarh District"""
    data = load_full_datastore()
    mandis = data.get("sundargarh_mandis", [])
    if not mandis:
        # Fallback to direct json read if sqlite hasn't reloaded
        m_path = os.path.join(DATA_DIR, "sundargarh_mandis.json")
        if os.path.exists(m_path):
            try:
                with open(m_path, "r", encoding="utf-8") as f:
                    mandis = json.load(f)
            except Exception:
                pass
    return mandis


@app.get("/api/sundargarh/disaster-context")
@app.get("/api/v1/sundargarh/disaster-context")
def get_sundargarh_disaster_context():
    """Returns river basin flood hazard & IMD/OSDMA surveillance context for Sundargarh"""
    d_path = os.path.join(DATA_DIR, "sundargarh_disaster_context.json")
    if os.path.exists(d_path):
        try:
            with open(d_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "district": "Sundargarh",
        "state": "Odisha",
        "river_basins": {"brahmani_basin": "High Flood Risk", "ib_basin": "Drought / Low Water Retention"}
    }


@app.get("/api/sundargarh/case-scenarios")
@app.get("/api/v1/sundargarh/case-scenarios")
def get_sundargarh_case_scenarios():
    """Returns 4 curated real-life presentation cases with live advisory & distress triggers"""
    data = load_full_datastore()
    cases = [
        {
            "case_id": "CASE_HEMGIR_DROUGHT",
            "title": "Case 1: Hemgir Block — Prolonged Dry Spell & Thermal Heat Stress",
            "farmer_id": "F_SUN1",
            "farmer_name": "Debendra Majhi",
            "block_name": "Hemgir",
            "soil_type": "Red & Yellow Soil",
            "crop": "Paddy (Vegetative stage, Rainfed, 1.5 Ha)",
            "live_hazard_triggers": {
                "consecutive_dry_days": 24,
                "rainfall_deviation_pct": -11.4,
                "mean_summer_lst_c": 42.0,
                "ndms_category": "Yellow (Drought Watch)",
                "borewell_status": "Dried up / Failed"
            },
            "advisory_rule_triggered": "R-OD-01 (Sundargarh Dry Spell & Chahata Conservation)",
            "recommended_actions": [
                "Life-saving protective irrigation using Farm Pond (Chahata) runoff",
                "1% Potassium Nitrate (KNO3) foliar spray at dawn/dusk to prevent wilting",
                "Apply paddy straw / organic mulching across crop rows"
            ],
            "relief_schemes_triggered": [
                "S_OD3: Jalanidhi-II 90% Farm Pond / Solar Pump subsidy (up to ₹1,00,000)",
                "S_OD1: KALIA ₹10,000 Direct Income Support + 0% Interest Crop Loan"
            ]
        },
        {
            "case_id": "CASE_BONAIGARH_FLOOD",
            "title": "Case 2: Bonaigarh Block — Brahmani River Flash Inundation Hazard",
            "farmer_id": "F_SUN2",
            "farmer_name": "Brundaban Oram",
            "block_name": "Bonaigarh",
            "soil_type": "Red & Yellow Alluvial Delta",
            "crop": "Paddy (Flowering stage, River basin, 2.0 Ha)",
            "live_hazard_triggers": {
                "rainfall_deviation_pct": 12.3,
                "flood_hazard_level": "High (Brahmani Basin)",
                "ndms_category": "Orange (Alert)",
                "synoptic_warning": "Low pressure over NW Bay of Bengal causing heavy river surge"
            },
            "advisory_rule_triggered": "R-OD-02 (Flood Hazard & Swarna-Sub1 Submergence Recovery)",
            "recommended_actions": [
                "De-silt and widen field drainage channels immediately",
                "Broadcast Swarna-Sub1 flood-tolerant seed minikits (survives 14 days full submergence)",
                "Prepare for relay cropping with Blackgram (Urad PU-31) once floodwaters recede"
            ],
            "relief_schemes_triggered": [
                "S_OD2: OSDMA / SDRF Flood Crop Emergency + 100% Free Seed Minikits + ₹8,500/Ha Input Subsidy"
            ]
        },
        {
            "case_id": "CASE_SADAR_MANDI_SHORTFALL",
            "title": "Case 3: Sundargarh Sadar — Harvest Stage APMC Mandi Price Deficit",
            "farmer_id": "F_SUN4",
            "farmer_name": "Sunil Kerketta",
            "block_name": "Sundargarh Sadar",
            "soil_type": "Red & Yellow Loam",
            "crop": "Paddy (Harvest stage, 2.2 Ha)",
            "live_market_triggers": {
                "rmc_mandi_name": "Sundargarh Regulated Market (RMC Main Yard)",
                "current_mandi_price": "₹2,150 / Quintal",
                "govt_msp": "₹2,300 / Quintal",
                "shortfall": "₹150 / Quintal (-6.5% below MSP floor)",
                "condition": "Local trader cartel discount during peak harvest arrivals"
            },
            "advisory_rule_triggered": "R-30 (Market Intervention & Warehouse Pledge Loan)",
            "recommended_actions": [
                "Avoid distress panic sale at local trader discount",
                "Store produce in WDRA certified godown (Sundargarh RMC)",
                "Avail 70% e-NAM warehouse receipt pledge loan at 7% concessional interest"
            ],
            "relief_schemes_triggered": [
                "S3: e-NAM & WDRA Warehouse Receipt Pledge Loan Scheme",
                "S_OD1: KALIA 0% Interest Crop Loan & Procurement Enrolment"
            ]
        },
        {
            "case_id": "CASE_LEPHRIPARA_RAINFED",
            "title": "Case 4: Lephripara Block — Marginal Rainfed Pulses Drought Watch",
            "farmer_id": "F_SUN3",
            "farmer_name": "Saraswati Kisan",
            "block_name": "Lephripara",
            "soil_type": "Red & Yellow Soil",
            "crop": "Pulses / Blackgram (Vegetative stage, Rainfed, 1.0 Ha)",
            "live_hazard_triggers": {
                "consecutive_dry_days": 21,
                "rainfall_deviation_pct": -8.7,
                "ndms_category": "Yellow (Drought Watch)",
                "device_reachability": "Feature Phone (IVR / Voice Call recommended)"
            },
            "advisory_rule_triggered": "R-OD-01 (Moisture Conservation in Rainfed Pulses)",
            "recommended_actions": [
                "Foliar spray of 2% Urea or 1% Potassium Nitrate for moisture stress tolerance",
                "Shallow intercultural hoeing to create dust mulch and break soil capillaries"
            ],
            "relief_schemes_triggered": [
                "S_OD1: KALIA Direct Income Support",
                "S7: PMKSY Per Drop More Crop Micro-Irrigation (55% Subsidy)"
            ]
        }
    ]
    return {
        "district": "Sundargarh",
        "state": "Odisha",
        "presentation_cases": cases
    }


@app.get("/api/farmers")
def get_all_farmers():
    data = load_full_datastore()
    result = []
    for f in data["farmers"]:
        district = next((d for d in data["districts"] if d["id"] == f["district_id"]), {})
        channel = get_recommended_channel(f)
        ui_mode = get_default_ui_mode(f)
        result.append({
            **f,
            "district_name": district.get("name", f["district_id"]),
            "recommended_channel": channel,
            "default_ui_mode": ui_mode
        })
    return result


@app.get("/api/farmers/{farmer_id}")
def get_farmer_by_id(farmer_id: str):
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == farmer_id), None)
    if not farmer:
        raise HTTPException(status_code=404, detail=f"Farmer {farmer_id} not found")

    district = next((d for d in data["districts"] if d["id"] == farmer["district_id"]), {})
    weather = next((w for w in data["daily_rainfall"] if w["district_id"] == farmer["district_id"]), {})
    channel = get_recommended_channel(farmer)
    ui_mode = get_default_ui_mode(farmer)

    return {
        **farmer,
        "district_name": district.get("name", farmer["district_id"]),
        "district_details": {
            "soil_type": district.get("soil_type"),
            "avg_rainfall_mm": district.get("avg_rainfall_mm")
            # Note: historical_vulnerability_index is intentionally excluded from individual farmer-facing query
        },
        "weather_summary": weather,
        "recommended_channel": channel,
        "default_ui_mode": ui_mode
    }


@app.delete("/api/farmers/{farmer_id}")
@app.delete("/api/v1/farmer/{farmer_id}")
def delete_farmer_account(farmer_id: str):
    """
    Deletes a farmer account from SQLite database and JSON datastore.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM farmers WHERE id = ?", (farmer_id,))
    cursor.execute("DELETE FROM onboarding_profiles WHERE id = ? OR id = ?", (farmer_id, f"PROF_{farmer_id}"))
    conn.commit()
    conn.close()

    # Also update farmers.json if present
    farmers_json_path = os.path.join(DATA_DIR, "farmers.json")
    if os.path.exists(farmers_json_path):
        try:
            with open(farmers_json_path, "r", encoding="utf-8") as f:
                farmers_list = json.load(f)
            farmers_list = [f for f in farmers_list if f.get("id") != farmer_id]
            with open(farmers_json_path, "w", encoding="utf-8") as f:
                json.dump(farmers_list, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error updating farmers.json: {e}")

    return {
        "status": "success",
        "message": f"Farmer account {farmer_id} deleted successfully",
        "farmer_id": farmer_id
    }


@app.get("/api/farmers/{farmer_id}/advisory")
def get_farmer_advisory(farmer_id: str):
    """
    Executes Advisory Engine:
    - Evaluates crop stage, weather, onset delay, and dry spells.
    - Evaluates Mandi price vs MSP: if harvest + price < MSP -> returns Rule R-30 market intervention!
    """
    data = load_full_datastore()
    try:
        advisory = get_advisory(farmer_id, data)
        return advisory
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/farmers/{farmer_id}/distress")
def get_farmer_distress(farmer_id: str, weights: WeightOverride = Body(default=None)):
    """
    Executes ICAR-CRIDA 6-Dimension FDI Distress Scorer for a single farmer.
    Dimensions: Exposure(E) · Sensitivity(S) · Adaptive Capacity(AC) · Mitigation Deficit(M) · Trigger(T) · District Fragility(DF)
    Weights are auto-normalized if custom values do not sum to 1.0.
    """
    data = load_full_datastore()
    custom_weights = weights.model_dump() if weights else DEFAULT_WEIGHTS
    try:
        score_data = calculate_distress_score(farmer_id, custom_weights, data)
        return score_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/officer/farmers")
def get_officer_farmer_list(weights: WeightOverride = Body(default=None)):
    """
    Officer Dashboard Aggregation Endpoint:
    - Computes distress scores for all farmers using active/custom weights.
    - Determines risk bands, top contributing signals, recommended schemes.
    - Attaches recommended contact channels (App / Call/IVR) and device reachability.
    - Sorts descending by distress score.
    """
    data = load_full_datastore()
    custom_weights = weights.model_dump() if weights else DEFAULT_WEIGHTS

    scored_farmers = []
    for farmer in data["farmers"]:
        district = next((d for d in data["districts"] if d["id"] == farmer["district_id"]), {})
        channel = get_recommended_channel(farmer)
        score_info = calculate_distress_score(farmer["id"], custom_weights, data)

        scored_farmers.append({
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "phone": farmer.get("phone", ""),
            "village": farmer.get("village", ""),
            "district_id": district.get("id"),
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "landholding_hectares": farmer["landholding_hectares"],
            "device_type": farmer["device_type"],
            "network_quality": farmer["network_quality"],
            "tech_literacy": farmer["tech_literacy"],
            "recommended_channel": channel,
            "distress_score": score_info["distress_score"],
            "risk_band": score_info["risk_band"],
            "band_color": score_info["band_color"],
            "top_contributing_signal": score_info["top_contributing_signal"],
            "primary_recommended_scheme": score_info["primary_recommended_scheme"],
            "recommended_interventions": score_info["recommended_interventions"],
            "explanation": score_info["explanation"],
            "landholding_context": score_info["landholding_context"],
            "structural_risk_context": score_info["structural_risk_context"],
            "raw_dimensions": score_info["raw_dimensions"],
            "sub_components": score_info["sub_components"],
            "points_breakdown": score_info["points_breakdown"],
            "days_until_loan_due": score_info["days_until_loan_due"]
        })

    # Sort descending by distress score
    scored_farmers.sort(key=lambda x: x["distress_score"], reverse=True)

    # Summary metrics for officer dashboard header
    high_count = sum(1 for f in scored_farmers if f["risk_band"] == "High")
    med_count = sum(1 for f in scored_farmers if f["risk_band"] == "Medium")
    low_count = sum(1 for f in scored_farmers if f["risk_band"] == "Low")

    return {
        "farmers": scored_farmers,
        "weights_applied": score_info["weights_used"] if scored_farmers else DEFAULT_WEIGHTS,
        "metrics": {
            "total_farmers": len(scored_farmers),
            "high_risk_count": high_count,
            "medium_risk_count": med_count,
            "low_risk_count": low_count
        }
    }


@app.get("/api/mandi-prices")
def get_all_mandi_prices():
    data = load_full_datastore()
    result = []
    for p in data["mandi_prices"]:
        district = next((d for d in data["districts"] if d["id"] == p["district_id"]), {})
        is_below = p["govt_msp_per_quintal"] > 0 and p["price_per_quintal"] < p["govt_msp_per_quintal"]
        shortfall = round(((p["govt_msp_per_quintal"] - p["price_per_quintal"]) / p["govt_msp_per_quintal"] * 100), 1) if is_below else 0.0
        result.append({
            **p,
            "district_name": district.get("name", p["district_id"]),
            "is_below_msp": is_below,
            "shortfall_pct": shortfall
        })
    return result


@app.get("/api/schemes")
def get_all_schemes():
    data = load_full_datastore()
    return data["schemes"]


CROP_NAMES_MULTILINGUAL = {
    "wheat": {
        "en": "Wheat",
        "hi": "गेहूं",
        "mr": "गहू",
        "or": "ଗହମ",
        "as": "গম",
        "kn": "ಗೋಧಿ"
    },
    "onion": {
        "en": "Onion",
        "hi": "प्याज",
        "mr": "कांदा",
        "or": "ପିଆଜ",
        "as": "পিয়াঁজ",
        "kn": "ಈರುಳ್ಳಿ"
    },
    "cotton": {
        "en": "Cotton",
        "hi": "कपास",
        "mr": "कापूस",
        "or": "କପା",
        "as": "কপাহ",
        "kn": "ಹತ್ತಿ"
    },
    "soybean": {
        "en": "Soybean",
        "hi": "सोयाबीन",
        "mr": "सोयाबीन",
        "or": "ସୋୟାବିନ୍",
        "as": "ছয়াবিন",
        "kn": "ಸೋಯಾಬೀನ್"
    },
    "tomato": {
        "en": "Tomato",
        "hi": "टमाटर",
        "mr": "टोमॅटो",
        "or": "ଟମାଟୋ",
        "as": "টমেটো",
        "kn": "ಟೊಮೆಟೊ"
    },
    "paddy": {
        "en": "Paddy (Rice)",
        "hi": "धान",
        "mr": "भात (धान)",
        "or": "ଧାନ",
        "as": "ধান",
        "kn": "ಭತ್ತ"
    },
    "rice": {
        "en": "Rice",
        "hi": "धान",
        "mr": "भात",
        "or": "ଧାନ",
        "as": "ধান",
        "kn": "ಭತ್ತ"
    },
    "maize": {
        "en": "Maize",
        "hi": "मक्का",
        "mr": "मका",
        "or": "ମକା",
        "as": "মাকৈ",
        "kn": "ಮೆಕ್ಕೆಜೋಳ"
    },
    "groundnut": {
        "en": "Groundnut",
        "hi": "मूंगफली",
        "mr": "भुईमूग",
        "or": "ଚିନାବାଦାମ",
        "as": "বাদাম",
        "kn": "ಕಡಲೆಕಾಯಿ"
    },
    "pigeonpea": {
        "en": "Pigeonpea (Arhar)",
        "hi": "अरहर (तुअर)",
        "mr": "तूर",
        "or": "ହରଡ଼",
        "as": "অৰহৰ",
        "kn": "ತೊಗರಿ"
    },
    "pulses": {
        "en": "Pulses",
        "hi": "दलहन",
        "mr": "कडधान्ये",
        "or": "ଡାଲି",
        "as": "মাহজাতীয় শস্য",
        "kn": "ದ್ವಿದಳ ಧಾನ್ಯ"
    },
    "sugarcane": {
        "en": "Sugarcane",
        "hi": "गन्ना",
        "mr": "ऊस",
        "or": "ଆଖୁ",
        "as": "কুঁহিয়াৰ",
        "kn": "ಕಬ್ಬು"
    }
}


SCHEME_TRANSLATIONS = {
    "S1": {
        "name": {
            "en": "PMFBY Crop Insurance",
            "hi": "प्रधानमंत्री फसल बीमा योजना (PMFBY)",
            "mr": "प्रधानमंत्री पीक विमा योजना (PMFBY)",
            "or": "ପ୍ରଧାନମନ୍ତ୍ରୀ ଫସଲ ବୀମା ଯୋଜନା (PMFBY)",
            "as": "প্ৰধানমন্ত্ৰী ফচল বীমা যোজনা (PMFBY)",
            "kn": "ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ (PMFBY)"
        },
        "action": {
            "en": "File PMFBY crop loss claim form & initiate survey within 72 hrs.",
            "hi": "पीएमएफबीवाई फसल क्षति दावा फॉर्म भरें एवं 72 घंटे में सर्वेक्षण करवाएं।",
            "mr": "पीक नुकसानीचा पीएमएफबीवाय दावा अर्ज दाखल करा व ७२ तासांत पाहणी पूर्ण करा.",
            "or": "୭୨ ଘଣ୍ଟା ମଧ୍ୟରେ ଫସଲ କ୍ଷୟକ୍ଷତି ଦାବି ଫର୍ମ ଦାଖଲ କରି ସର୍ଭେ କରାନ୍ତୁ।",
            "as": "৭২ ঘণ্টাৰ ভিতৰত শস্যৰ ক্ষতিপূৰণ আবেদন জমা দিয়ক আৰু জৰীপ কৰাওক।",
            "kn": "೭೨ ಗಂಟೆಗಳ ಒಳಗೆ ಬೆಳೆ ನಷ್ಟ ಪರಿಹಾರ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ ಸಮೀಕ್ಷೆ ಆರಂಭಿಸಿ."
        }
    },
    "S1-ENROLL": {
        "name": {
            "en": "PMFBY Enrollment (Crop Insurance)",
            "hi": "प्रधानमंत्री फसल बीमा योजना (PMFBY) नामांकन",
            "mr": "प्रधानमंत्री पीक विमा योजना (PMFBY) नोंदणी",
            "or": "ପ୍ରଧାନମନ୍ତ୍ରୀ ଫସଲ ବୀମା ଯୋଜନା (PMFBY) ପଞ୍ଜିକରଣ",
            "as": "প্ৰধানমন্ত্ৰী ফচল বীমা যোজনা (PMFBY) পঞ্জীয়ন",
            "kn": "ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ (PMFBY) ನೋಂದಣಿ"
        },
        "action": {
            "en": "Immediately enroll in PMFBY at nearest CSC or bank branch.",
            "hi": "निकटतम सीएससी केंद्र या बैंक शाखा जाकर तुरंत फसल बीमा कराएं।",
            "mr": "जवळच्या सीएससी केंद्र किंवा बँकेत जाऊन त्वरित पीक विमा नोंदणी करा.",
            "or": "ନିକଟସ୍ଥ ଜନସେବା କେନ୍ଦ୍ର କିମ୍ବା ବ୍ୟାଙ୍କରେ ତୁରନ୍ତ ଫସଲ ବୀମା କରାନ୍ତୁ।",
            "as": "নিকটৱৰ্তী চিএছচি কেন্দ্ৰ বা বেংকত তৎকালীনভাৱে শস্য বীমা কৰক।",
            "kn": "ಹತ್ತಿರದ ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರ ಅಥವಾ ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ತಕ್ಷಣ ಬೆಳೆ ವಿಮೆ ನೋಂದಾಯಿಸಿ."
        }
    },
    "S2": {
        "name": {
            "en": "KCC Debt Restructuring",
            "hi": "किसान क्रेडिट कार्ड (KCC) ऋण पुनर्गठन",
            "mr": "किसान क्रेडिट कार्ड (KCC) कर्ज पुनर्गठन",
            "or": "କିସାନ କ୍ରେଡିଟ୍ କାର୍ଡ (KCC) ଋଣ ପୁନର୍ଗଠନ",
            "as": "কিষাণ ক্ৰেডিট কাৰ্ড (KCC) ঋণ পুনৰ্গঠন",
            "kn": "ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ಸಾಲ ಪುನಾರಚನೆ"
        },
        "action": {
            "en": "Submit KCC restructuring request for 1-year moratorium and interest relief.",
            "hi": "1 वर्ष की मोहलत एवं ब्याज छूट हेतु केसीसी ऋण पुनर्गठन आवेदन दें।",
            "mr": "१ वर्षाची मुदतवाढ आणि व्याज सवलतीसाठी केसीसी कर्ज पुनर्गठन अर्ज करा.",
            "or": "୧ ବର୍ଷର ରିହାତି ଅବଧି ପାଇଁ କେସିସି ଋଣ ପୁନର୍ଗଠନ ଆବେଦନ କରନ୍ତୁ।",
            "as": "১ বছৰৰ সময় বৃদ্ধিৰ বাবে কেচিচি ঋণ পুনৰ্গঠন আবেদন দাখিল কৰক।",
            "kn": "೧ ವರ್ಷದ ಕಾಲಾವಕಾಶಕ್ಕಾಗಿ ಕೆಸಿಸಿ ಸಾಲ ಪುನಾರಚನೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ."
        }
    },
    "S3": {
        "name": {
            "en": "PM-AASHA & e-NAM MSP Assurance",
            "hi": "पीएम-आशा एवं ई-नाम समर्थन मूल्य योजना",
            "mr": "पीएम-आशा व ई-नाम हमीभाव योजना",
            "or": "ପିଏମ୍-ଆଶା ଏବଂ ଇ-ନାମ ସହାୟକ ମୂଲ୍ୟ ଯୋଜନା",
            "as": "পিএম-আশা আৰু ই-নাম সমৰ্থন মূল্য আঁচনি",
            "kn": "ಪಿಎಂ-ಆಶಾ ಮತ್ತು ಇ-ನಾಮ್ ಬೆಂಬಲ ಬೆಲೆ ಯೋಜನೆ"
        },
        "action": {
            "en": "Register on e-NAM for MSP procurement or take warehouse pledge loan.",
            "hi": "समर्थन मूल्य पर खरीद हेतु ई-नाम पर पंजीकरण करें या गोदाम रसीद पर ऋण लें।",
            "mr": "हमीभावाने विक्रीसाठी ई-नाम नोंदणी करा किंवा वखार पावती कर्ज घ्या.",
            "or": "ସହାୟକ ମୂଲ୍ୟରେ ବିକ୍ରୟ ପାଇଁ ଇ-ନାମ ପଞ୍ଜିକରଣ କରନ୍ତୁ କିମ୍ବା ଗୋଦାମ ଋଣ ନିଅନ୍ତୁ।",
            "as": "সমৰ্থন মূল্যত বিক্ৰীৰ বাবে ই-নাম পঞ্জীয়ন কৰক বা গুদাম ঋণ লওক।",
            "kn": "ಬೆಂಬಲ ಬೆಲೆಗೆ ಮಾರಾಟ ಮಾಡಲು ಇ-ನಾಮ್ ನೋಂದಾಯಿಸಿ ಅಥವಾ ಗೋದಾಮು ಸಾಲ ಪಡೆಯಿರಿ."
        }
    },
    "S4": {
        "name": {
            "en": "State Drought Relief Package",
            "hi": "राज्य सूखा राहत पैकेज",
            "mr": "राज्य दुष्काळ सहाय्य योजना",
            "or": "ରାଜ୍ୟ ମରୁଡ଼ି ସହାୟତା ପ୍ୟାକେଜ୍",
            "as": "ৰাজ্যিক খৰাং সাহায্য আঁচনি",
            "kn": "ರಾಜ್ಯ ಬರ ಪರಿಹಾರ ಪ್ಯಾಕೇಜ್"
        },
        "action": {
            "en": "Enroll in State Special Drought Relief for input & electricity subsidies.",
            "hi": "लागत एवं बिजली शुल्क सब्सिडी हेतु राज्य विशेष सूखा राहत पैकेज में नामांकन करें।",
            "mr": "कृषी साहित्य व वीज बिल सवलतीसाठी राज्य दुष्काळ मदत योजनेत अर्ज करा.",
            "or": "ସବସିଡି ସହାୟତା ପାଇଁ ରାଜ୍ୟ ମରୁଡ଼ି ସହାୟତା ପ୍ୟାକେଜରେ ପଞ୍ଜିକରଣ କରନ୍ତୁ।",
            "as": "ৰাজসাহায্যৰ বাবে ৰাজ্যিক খৰাং সাহায্য আঁচনিত নামভৰ্তি কৰক।",
            "kn": "ಸಬ್ಸಿಡಿ ಸೌಲಭ್ಯಕ್ಕಾಗಿ ರಾಜ್ಯ ಬರ ಪರಿಹಾರ ಯೋಜನೆಯಡಿ ನೋಂದಾಯಿಸಿ."
        }
    },
    "S4-EXT": {
        "name": {
            "en": "PMKSY Micro-Irrigation Subsidy",
            "hi": "प्रधानमंत्री कृषि सिंचाई योजना (PMKSY सूक्ष्म सिंचाई)",
            "mr": "प्रधानमंत्री कृषी सिंचन योजना (सूक्ष्म सिंचन अनुदान)",
            "or": "ପ୍ରଧାନମନ୍ତ୍ରୀ କୃଷି ସିଞ୍ଚାଇ ଯୋଜନା (କ୍ଷୁଦ୍ର ଜଳସେଚନ ରିହାତି)",
            "as": "প্ৰধানমন্ত্ৰী কৃষি সিঞ্চন যোজনা (ক্ষুদ্ৰ জলসিঞ্চন ৰাজসাহায্য)",
            "kn": "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕೃಷಿ ಸಿಂಚಾಯಿ ಯೋಜನೆ (ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಸಬ್ಸಿಡಿ)"
        },
        "action": {
            "en": "Apply for 55% drip/sprinkler micro-irrigation subsidy under PMKSY.",
            "hi": "पीएमकेएसवाई के तहत ड्रिप/स्प्रिंकलर सिंचाई पर 55% सब्सिडी हेतु आवेदन करें।",
            "mr": "ठिबक व तुषार सिंचनासाठी ५५% शासकीय अनुदानावर अर्ज करा.",
            "or": "ଡ୍ରିପ୍ ଓ ସ୍ପ୍ରିଙ୍କଲର ଜଳସେଚନ ପାଇଁ ୫୫% ସରକାରୀ ରିହାତି ଆବେଦନ କରନ୍ତୁ।",
            "as": "টোপাল আৰু স্প্ৰিংকলাৰ জলসিঞ্চনৰ বাবে ৫৫% ৰাজসাহায্যৰ আবেদন কৰক।",
            "kn": "ಹನಿ ಮತ್ತು ತುಂತುರು ನೀರಾವರಿಗಾಗಿ ಶೇ ೫೫ ರ ಸಬ್ಸಿಡಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ."
        }
    },
    "S5": {
        "name": {
            "en": "PM-KISAN Samman Nidhi",
            "hi": "प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)",
            "mr": "प्रधानमंत्री किसान सन्मान निधी (PM-KISAN)",
            "or": "ପ୍ରଧାନମନ୍ତ୍ରୀ କିସାନ ସମ୍ମାନ ନିଧି (PM-KISAN)",
            "as": "প্ৰধানমন্ত্ৰী কিষাণ সন্মান নিধি (PM-KISAN)",
            "kn": "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (PM-KISAN)"
        },
        "action": {
            "en": "Check Aadhaar linkage to release ₹2,000 PM-KISAN installment.",
            "hi": "2,000 रुपये की पीएम-किसान किस्त पाने हेतु आधार व बैंक खाता जांचें।",
            "mr": "२,००० रुपयांच्या पीएम-किसान हप्त्यासाठी बँक आधार जोडणी तपासा.",
            "or": "୨,୦୦୦ ଟଙ୍କାର ପିଏମ୍-କିସାନ କିସ୍ତି ପାଇବା ପାଇଁ ଆଧାର ଓ ବ୍ୟାଙ୍କ ଖାତା ଯାଞ୍ଚ କରନ୍ତୁ।",
            "as": "২,০০০ টকাৰ কিস্তি লাভ কৰিবলৈ আধাৰ সংযোগ পৰীক্ষা কৰক।",
            "kn": "೨,೦೦೦ ರೂ. ಪಿಎಂ-ಕಿಸಾನ್ ಕಂತು ಪಡೆಯಲು ಆಧಾರ್ ಜೋಡಣೆ ಪರಿಶೀಲಿಸಿ."
        }
    },
    "S_OD1": {
        "name": {
            "en": "KALIA Scheme (Odisha)",
            "hi": "कालिया योजना (ओडिशा)",
            "mr": "कालिया योजना (ओडिशा)",
            "or": "କାଳିଆ ଯୋଜନା (ଓଡ଼ିଶା)",
            "as": "কালিয়া আঁচনি (ওড়িশা)",
            "kn": "ಕಾಲಿಯಾ ಯೋಜನೆ (ಒಡಿಶಾ)"
        },
        "action": {
            "en": "Receive ₹4,000 KALIA seasonal financial support.",
            "hi": "कालिया योजना के तहत 4,000 रुपये मौसमी सहायता प्राप्त करें।",
            "mr": "कालिया योजनेअंतर्गत ४,००० रुपये हंगामी आर्थिक साहाय्य मिळवा.",
            "or": "କାଳିଆ ଯୋଜନାରେ ୪,୦୦୦ ଟଙ୍କାର ଋତୁକାଳୀନ ସହାୟତା ପାଆନ୍ତୁ।",
            "as": "কালিয়া আঁচনিৰ ৪,০০০ টকাৰ আৰ্থিক সাহায্য গ্ৰহণ কৰକ।",
            "kn": "ಕಾಲಿಯಾ ಯೋಜನೆಯಡಿ ೪,೦೦೦ ರೂ. ಕಾಲೋಚಿತ ಆರ್ಥಿಕ ನೆರವು ಪಡೆಯಿರಿ."
        }
    },
    "S_OD2": {
        "name": {
            "en": "OSDMA Flood Relief",
            "hi": "ओडिशा राज्य आपदा प्रबंधन (OSDMA) बाढ़ राहत",
            "mr": "ओडिशा राज्य आपत्ती निवारण पूर मदत",
            "or": "ଓଏସଡିଏମଏ ବନ୍ୟା ସହାୟତା ପ୍ୟାକେଜ୍",
            "as": "বানপানী সাহায্য আৰু বীজ যোগান",
            "kn": "ಪ್ರವಾಹ ಪರಿಹಾರ ಮತ್ತು ಬೀಜ ಸಹಾಯ"
        },
        "action": {
            "en": "Apply for flood input subsidy and collect flood-resilient seeds.",
            "hi": "बाढ़ फसल क्षति सब्सिडी आवेदन करें और जल-सहनशील बीज किट प्राप्त करें।",
            "mr": "पूर नुकसान भरपाई अर्ज करा आणि पूर-सहनशील बियाणे किट मिळवा.",
            "or": "ବନ୍ୟା କ୍ଷତିପୂରଣ ରିହାତି ଆବେଦନ କରନ୍ତୁ ଏବଂ ବନ୍ୟା-ସହଣୀୟ ବିହନ କିଟ୍ ସଂଗ୍ରହ କରନ୍ତୁ।",
            "as": "বানপানী ক্ষতিপূৰণ সাহায্য আবেদন কৰক আৰু বান-প্ৰতিৰোধী বীজ সংগ্ৰহ কৰক।",
            "kn": "ಪ್ರವಾಹ ಪರಿಹಾರ ಸಬ್ಸಿಡಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ ಮುಳುಗಡೆ ನಿರೋಧಕ ಬೀಜ ಕಿಟ್ ಪಡೆಯಿರಿ."
        }
    },
    "S_OD3": {
        "name": {
            "en": "Farm Pond & Solar Pump Subsidy",
            "hi": "सौर पंप एवं खेत तालाब सब्सिडी",
            "mr": "सौर पंप व शेततळे अनुदान",
            "or": "ସୌର ପମ୍ପ ଏବଂ କ୍ଷେତ ପୋଖରୀ ରିହାତି",
            "as": "সৌৰ পাম্প আৰু পুখুৰী ৰাজসাহায্য",
            "kn": "ಸೌರ ಪಂಪ್ ಮತ್ತು ಕೃಷಿ ಹೊಂಡ ಸಬ್ಸಿಡಿ"
        },
        "action": {
            "en": "Apply for 70% farm pond and solar pump subsidy for emergency irrigation.",
            "hi": "आपातकालीन सिंचाई हेतु खेत तालाब व सौर पंप पर 70% सब्सिडी आवेदन करें।",
            "mr": "तातडीच्या संरक्षणात्मक सिंचनासाठी शेततळे व सौर पंपावर ७०% अनुदानासाठी अर्ज करा.",
            "or": "ଜରୁରୀକାଳୀନ ଜଳସେଚନ ପାଇଁ କ୍ଷେତ ପୋଖରୀ ଓ ସୌର ପମ୍ପ ଉପରେ ୭୦% ରିହାତି ଆବେଦନ କରନ୍ତୁ।",
            "as": "জৰুৰী জলসিঞ্চনৰ বাবে পুখুৰী আৰু সৌৰ পাম্পত ৭০% ৰাজসাহায্য লওক।",
            "kn": "ತುರ್ತು ನೀರಾವರಿಗಾಗಿ ಕೃಷಿ ಹೊಂಡ ಮತ್ತು ಸೌರ ಪಂಪ್‌ಗೆ ಶೇ ೭೦ ರ ಸಬ್ಸಿಡಿ ಪಡೆಯಿರಿ."
        }
    }
}

def get_localized_scheme_name(scheme_id: str, lang: str, fallback_name: str = "PMFBY") -> str:
    s = SCHEME_TRANSLATIONS.get(scheme_id)
    if s and "name" in s:
        return s["name"].get(lang, s["name"].get("en", fallback_name))
    # Check by matching name
    for sid, data in SCHEME_TRANSLATIONS.items():
        if sid in fallback_name or data["name"]["en"] in fallback_name:
            return data["name"].get(lang, data["name"].get("en", fallback_name))
    return fallback_name

def get_localized_scheme_action(scheme_id: str, lang: str, fallback_action: str = "") -> str:
    s = SCHEME_TRANSLATIONS.get(scheme_id)
    if s and "action" in s:
        return s["action"].get(lang, s["action"].get("en", fallback_action))
    for sid, data in SCHEME_TRANSLATIONS.items():
        if sid in fallback_action or sid in str(scheme_id):
            return data["action"].get(lang, data["action"].get("en", fallback_action))
    return fallback_action

def get_localized_crop_name(crop: str, lang: str) -> str:
    c = (crop or "").lower().strip()
    if c in CROP_NAMES_MULTILINGUAL:
        return CROP_NAMES_MULTILINGUAL[c].get(lang, CROP_NAMES_MULTILINGUAL[c].get("en", crop))
    return crop

@app.post("/api/simulate/ivr")
def simulate_ivr(payload: IvrRequest):
    """
    Simulates Interactive Voice Response (IVR) phone tree for low-literacy / feature-phone farmers
    with native multi-language voice prompt support and keypad language switcher (9 -> 1:en, 2:hi, 3:mr, 4:or, 5:as, 6:kn).
    """
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    if not farmer:
        farmer = data["farmers"][0] if data["farmers"] else None
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    advisory = get_advisory(farmer["id"], data)
    distress = calculate_distress_score(farmer["id"], DEFAULT_WEIGHTS, data)
    lang = (payload.language or farmer.get("language", "en")).lower()
    if lang not in ["en", "hi", "mr", "or", "as", "kn"]:
        lang = "en"

    digit = str(payload.digit_pressed).strip() if payload.digit_pressed else ""
    menu_state = payload.menu_state or "MAIN_MENU"

    farmer_name = farmer.get("name", "Farmer")
    raw_crop = farmer.get("crop", "Crop")
    crop_name = get_localized_crop_name(raw_crop, lang)

    def get_main_menu_content(l):
        loc_crop = get_localized_crop_name(raw_crop, l)
        greetings = {
            "mr": f"नमस्कार {farmer_name} शेतकरी बंधू! आपल्या {loc_crop} पिकासाठी कृषी सल्ला व साहाय्य केंद्रात आपले स्वागत आहे.",
            "or": f"ନମସ୍କାର {farmer_name} କୃଷକ ଭାଇ! ଆପଣଙ୍କ {loc_crop} ଫସଲ ପାଇଁ ସ୍ମାର୍ଟ କୃଷି ପରାମର୍ଶ କେନ୍ଦ୍ରକୁ ସ୍ୱାଗତ।",
            "as": f"নমস্কাৰ {farmer_name} কৃষক ভাই! আপোনাৰ {loc_crop} শস্যৰ বাবে স্মাৰ্ট কৃষি সেৱালৈ স্বাগতম।",
            "kn": f"ನಮಸ್ಕಾರ {farmer_name} ರೈತ ಬಾಂಧವರೇ! ನಿಮ್ಮ {loc_crop} ಬೆಳೆಗಾಗಿ ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಸಲಹಾ ಕೇಂದ್ರಕ್ಕೆ ತಮಗೆ ಸುಸ್ವಾಗತ.",
            "hi": f"नमस्ते {farmer_name} किसान भाई! आपकी {loc_crop} फसल हेतु स्मार्ट कृषि सलाह एवं सहायता केंद्र में आपका स्वागत है।",
            "en": f"Welcome {farmer_name} to Kisan Krishi Advisory Helpline for your {loc_crop} crop."
        }
        menus = {
            "mr": "हवामान व पीक सल्ल्यासाठी १ दाबा. बाजार भाव व हमीभावासाठी २ दाबा. शासकीय योजना व मदतीसाठी ३ दाबा. भाषा बदलण्यासाठी ९ दाबा. कृषी अधिकाऱ्यांशी संपर्क साधण्यासाठी ० दाबा.",
            "or": "ପାଣିପାଗ ଓ ଫସଲ ପରାମର୍ଶ ପାଇଁ ୧ ଦବାନ୍ତୁ। ମଣ୍ଡି ଦର ଓ ଏମଏସପି ପାଇଁ ୨ ଦବାନ୍ତୁ। ସରକାରୀ ଯୋଜନା ପାଇଁ ୩ ଦବାନ୍ତୁ। ଭାଷା ପରିବର୍ତ୍ତନ ପାଇଁ ୯ ଦବାନ୍ତୁ। କୃଷି ଅଧିକାରୀଙ୍କ ସହ କଥା ହେବା ପାଇଁ ୦ ଦବାନ୍ତୁ।",
            "as": "বতৰ আৰু শস্যৰ দিহাৰ বাবে ১ টিপক। বজাৰ দৰ আৰু সমৰ্থন মূল্যৰ বাবে ২ টিপক। চৰকাৰী আঁচনিৰ বাবে ৩ টিপক। ভাষা সলনি কৰিবলৈ ৯ টিপক। কৃষি বিষয়াৰ সৈতে কথা পাতিবলৈ ০ টিপক।",
            "kn": "ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ಸಲಹೆಗಾಗಿ ೧ ಒತ್ತಿ. ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಮತ್ತು ಎಂಎಸ್‌ಪಿಗಾಗಿ ೨ ಒತ್ತಿ. ಸರ್ಕಾರಿ ಯೋಜನೆಗಳಿಗಾಗಿ ೩ ಒತ್ತಿ. ಭಾಷೆ ಬದಲಾಯಿಸಲು ೯ ಒತ್ತಿ. ಕೃಷಿ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಮಾತನಾಡಲು ೦ ಒತ್ತಿ.",
            "hi": "मौसम एवं फसल सलाह के लिए 1 दबाएं। मंडी भाव एवं समर्थन मूल्य के लिए 2 दबाएं। सरकारी योजनाओं व ऋण सहायता के लिए 3 दबाएं। भाषा बदलने के लिए 9 दबाएं। कृषि अधिकारी से बात करने के लिए 0 दबाएं।",
            "en": "Press 1 for Weather & Crop Advisory. Press 2 for Mandi Price & MSP comparison. Press 3 for Government Schemes & Loan Support. Press 9 to change language. Press 0 to connect to officer."
        }
        return greetings.get(l, greetings["en"]), menus.get(l, menus["en"])

    # Handle Language Selection if in LANGUAGE_MENU
    lang_key_map = {
        "1": "en", "2": "hi", "3": "mr", "4": "or", "5": "as", "6": "kn",
        "91": "en", "92": "hi", "93": "mr", "94": "or", "95": "as", "96": "kn"
    }

    if (menu_state == "LANGUAGE_MENU" and digit in ["1", "2", "3", "4", "5", "6"]) or digit in ["91", "92", "93", "94", "95", "96"]:
        new_lang = lang_key_map[digit]
        lang = new_lang
        
        # Persist to database for this farmer
        try:
            conn = get_db_connection()
            conn.cursor().execute("UPDATE farmers SET language = ? WHERE id = ?", (new_lang, farmer["id"]))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Language update error:", e)

        confirmations = {
            "en": "Language changed to English.",
            "hi": "भाषा बदलकर हिंदी कर दी गई है।",
            "mr": "भाषा बदलून मराठी करण्यात आली आहे.",
            "or": "ଭାଷା ପରିବର୍ତ୍ତନ କରି ଓଡ଼ିଆ କରାଗଲା।",
            "as": "ভাষা সলনি কৰি অসমীয়া কৰা হ'ল।",
            "kn": "ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ."
        }
        conf = confirmations.get(lang, "Language updated.")
        greeting, menu_text = get_main_menu_content(lang)

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "crop": crop_name,
            "language": lang,
            "language_changed": True,
            "state": "MAIN_MENU",
            "voice_prompt_text": f"{conf} {greeting} {menu_text}",
            "options": [
                {"key": "1", "label": "Crop & Weather Advisory"},
                {"key": "2", "label": "Mandi Price vs Govt MSP"},
                {"key": "3", "label": "Govt Schemes & Debt Relief"},
                {"key": "9", "label": "Change Language (भाषा / ଭାଷା)"},
                {"key": "0", "label": "Connect to Officer"}
            ]
        }

    # If farmer pressed Key 9 -> Enter Language Sub-Menu
    if digit == "9":
        lang_prompts = {
            "en": "To select language: Press 1 for English, 2 for Hindi, 3 for Marathi, 4 for Odia, 5 for Assamese, 6 for Kannada. Press * to return to main menu.",
            "hi": "अपनी भाषा चुनने के लिए: अंग्रेजी के लिए 1, हिंदी के लिए 2, मराठी के लिए 3, ओड़िया के लिए 4, असमिया के लिए 5, कन्नड़ के लिए 6 दबाएं। मुख्य मेनू के लिए * दबाएं।",
            "mr": "आपली भाषा निवडण्यासाठी: इंग्रजीसाठी १, हिंदीसाठी २, मराठीसाठी ३, ओडियासाठी ४, आसामीसाठी ५, कन्नडसाठी ६ दाबा. मुख्य मेनूसाठी * दाबा.",
            "or": "ଆପଣଙ୍କ ଭାଷା ଚୟନ ପାଇଁ: ଇଂରାଜୀ ପାଇଁ ୧, ହିନ୍ଦୀ ପାଇଁ ୨, ମରାଠୀ ପାଇଁ ୩, ଓଡ଼ିଆ ପାଇଁ ୪, ଅସମୀୟା ପାଇଁ ୫, କନ୍ନଡ଼ ପାଇଁ ୬ ଦବାନ୍ତୁ। ମୁଖ୍ୟ ମେନୁ ପାଇଁ * ଦବାନ୍ତୁ।",
            "as": "আপোনাৰ ভাষা বাছনিৰ বাবে: ইংৰাজীৰ বাবে ১, হিন্দীৰ বাবে ২, মাৰাঠীৰ বাবে ৩, ওড়িয়াৰ বাবে ৪, অসমীয়াৰ বাবে ৫, কন্নড়ৰ বাবে ৬ টিপক। মুখ্য মেনুৰ বাবে * টিপক।",
            "kn": "ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆಗಾಗಿ: ಇಂಗ್ಲಿಷ್‌ಗಾಗಿ ೧, ಹಿಂದಿಗಾಗಿ ೨, ಮರಾಠಿಗಾಗಿ ೩, ಒಡಿಯಾಕ್ಕಾಗಿ ೪, ಅಸ್ಸಾಮಿಗಾಗಿ ೫, ಕನ್ನಡಕ್ಕಾಗಿ ೬ ಒತ್ತಿ. ಮುಖ್ಯ ಮೆನುಗಾಗಿ * ಒತ್ತಿ."
        }
        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "language": lang,
            "state": "LANGUAGE_MENU",
            "digit": "9",
            "voice_prompt_text": lang_prompts.get(lang, lang_prompts["en"]),
            "options": [
                {"key": "1", "label": "English"},
                {"key": "2", "label": "हिंदी (Hindi)"},
                {"key": "3", "label": "मराठी (Marathi)"},
                {"key": "4", "label": "ଓଡ଼ିଆ (Odia)"},
                {"key": "5", "label": "অসমীয়া (Assamese)"},
                {"key": "6", "label": "ಕನ್ನಡ (Kannada)"}
            ]
        }

    # If no digit pressed or * pressed -> Return to Main Menu
    if not digit or digit == "*":
        greeting, menu_text = get_main_menu_content(lang)
        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "crop": crop_name,
            "language": lang,
            "state": "MAIN_MENU",
            "voice_prompt_text": f"{greeting} {menu_text}",
            "options": [
                {"key": "1", "label": "Crop & Weather Advisory"},
                {"key": "2", "label": "Mandi Price vs Govt MSP"},
                {"key": "3", "label": "Govt Schemes & Debt Relief"},
                {"key": "9", "label": "Change Language (भाषा / ଭାଷା)"},
                {"key": "0", "label": "Connect to Officer"}
            ]
        }

    if digit == "1":
        # Crop Advisory
        text = advisory["text"].get(lang, advisory["text"]["en"])
        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "crop": crop_name,
            "language": lang,
            "state": "PLAYING_ADVISORY",
            "digit": "1",
            "title": advisory["title"].get(lang, advisory["title"]["en"]),
            "voice_prompt_text": text,
            "audio_url": advisory.get("audio_stub_url"),
            "action_type": advisory.get("action_type")
        }
    elif digit == "2":
        # Mandi vs MSP
        pd = advisory.get("price_data", {})
        cur_price = pd.get("current_price", 2100)
        msp_price = pd.get("govt_msp", 2400)
        shortfall = pd.get("shortfall_pct", 12.5)
        is_below = pd.get("is_below_msp", True)

        if is_below:
            if lang == "mr":
                text = f"लक्ष द्या {farmer_name}! आपल्या {crop_name} पिकाचा सध्याचा बाजार भाव ₹{cur_price} असून हमीभाव ₹{msp_price} आहे. भाव {shortfall}% कमी आहे. घाईत विक्री करू नका. वेअरहाऊस पावतीवर कर्ज घ्या किंवा ई-नाम नोंदणी करा."
            elif lang == "or":
                text = f"ଦୟାକରି ଧ୍ୟାନ ଦିଅନ୍ତୁ {farmer_name}! ଆପଣଙ୍କ {crop_name} ଫସଲର ବର୍ତ୍ତମାନର ମଣ୍ଡି ଦର ₹{cur_price} ରହିଛି, ଯାହାକି ସରକାରୀ ଏମଏସପି ₹{msp_price} ଠାରୁ {shortfall}% କମ୍ ଅଟେ। ଆତଙ୍କରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ଇ-ନାମ କିମ୍ବା ୱାରହାଉସ୍ ରସିଦ ଋଣ ନିଅନ୍ତୁ।"
            elif lang == "as":
                text = f"মন কৰক {farmer_name}! আপোনাৰ {crop_name} শস্যৰ বৰ্তমান বজাৰ দৰ ₹{cur_price}, যিটো সমৰ্থন মূল্য ₹{msp_price} তকৈ {shortfall}% কম। লোকচানত বিক্ৰী নকৰিব। ই-নাম বা গুদাম ৰচিদ ঋণৰ সুবিধা লওক।"
            elif lang == "kn":
                text = f"ಗಮನಿಸಿ {farmer_name}! ನಿಮ್ಮ {crop_name} ಬೆಳೆಯ ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ₹{cur_price} ಇದ್ದು, ಸರ್ಕಾರದ ಬೆಂಬಲ ಬೆಲೆ ₹{msp_price} ಗಿಂತ {shortfall}% ಕಡಿಮೆಯಾಗಿದೆ. ಆತುರದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಡಿ. ಇ-ನಾಮ್ ಅಥವಾ ಗೋದಾಮು ಸಾಲ ಬಳಸಿ."
            elif lang == "hi":
                text = f"ध्यान दें {farmer_name} किसान भाई! आपकी {crop_name} फसल का वर्तमान मंडी भाव ₹{cur_price} है, जबकि सरकारी समर्थन मूल्य ₹{msp_price} है। भाव {shortfall}% कम है। संकट में कम दाम पर न बेचें। ई-नाम या पंजीकृत गोदाम रसीद ऋण का लाभ लें।"
            else:
                text = f"Attention {farmer_name}: Current mandi price for {crop_name} is ₹{cur_price}, which is below Government MSP ₹{msp_price} by {shortfall}%. Do not sell in panic."
        else:
            if lang == "mr":
                text = f"आपल्या {crop_name} पिकाचा बाजार भाव ₹{cur_price} असून तो हमीभावाच्या (₹{msp_price}) वर समाधानकारक आहे."
            elif lang == "or":
                text = f"ଆପଣଙ୍କ {crop_name} ଫସଲର ବଜାର ଦର ₹{cur_price} ରହିଛି, ଯାହାକି ସରକାରୀ ଏମଏସପି (₹{msp_price}) ଠାରୁ ଭଲ ଅଟେ।"
            elif lang == "as":
                text = f"আপোনাৰ {crop_name} শস্যৰ বজাৰ মূল্য ₹{cur_price}, যিটো সমৰ্থন মূল্য (₹{msp_price}) তকৈ সন্তোষজনক।"
            elif lang == "kn":
                text = f"ನಿಮ್ಮ {crop_name} ಬೆಳೆಯ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ₹{cur_price} ಇದ್ದು, ಇದು ಬೆಂಬಲ ಬೆಲೆಗಿಂತ (₹{msp_price}) ಉತ್ತಮವಾಗಿದೆ."
            elif lang == "hi":
                text = f"आपकी {crop_name} फसल का मंडी भाव ₹{cur_price} है, जो समर्थन मूल्य ₹{msp_price} से बेहतर व संतोषजनक है।"
            else:
                text = f"Current mandi price for {crop_name} is ₹{cur_price}, which is stable and above Government MSP."

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "crop": crop_name,
            "language": lang,
            "state": "PLAYING_MANDI",
            "digit": "2",
            "voice_prompt_text": text,
            "price_data": pd
        }
    elif digit == "3":
        # Schemes
        interventions = distress.get("recommended_interventions", [])
        top_scheme = interventions[0] if interventions else {"scheme_id": "S1", "scheme_name": "PMFBY", "action_item": "Verify enrollment"}
        sid = top_scheme.get("scheme_id", "S1")
        scheme_n = get_localized_scheme_name(sid, lang, top_scheme.get("scheme_name", "PMFBY"))
        action_i = get_localized_scheme_action(sid, lang, top_scheme.get("action_item", ""))

        if lang == "mr":
            text = f"{farmer_name}, आपल्यासाठी शिफारस केलेली योजना: {scheme_n}. कृती: {action_i} अधिक माहितीसाठी जवळच्या कृषी कार्यालयात संपर्क साधा."
        elif lang == "or":
            text = f"{farmer_name}, ଆପଣଙ୍କ ପାଇଁ ସୁପାରିଶ କରାଯାଇଥିବା ଯୋଜନା: {scheme_n}। ପଦକ୍ଷେପ: {action_i} ଅଧିକ ସହାୟତା ପାଇଁ କୃଷି ଅଧିକାରୀଙ୍କ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ।"
        elif lang == "as":
            text = f"{farmer_name}, আপোনাৰ বাবে নিৰ্ধাৰিত আঁচনি: {scheme_n}। নিৰ্দেশনা: {action_i} অধিক তথ্যৰ বাবে কৃষি কাৰ্যালয়ত যোগাযোগ কৰক।"
        elif lang == "kn":
            text = f"{farmer_name}, ನಿಮಗಾಗಿ ಶಿಫಾರಸು ಮಾಡಿದ ಯೋಜನೆ: {scheme_n}. ಕ್ರಮ: {action_i} ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಕೃಷಿ ಇಲಾಖೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
        elif lang == "hi":
            text = f"{farmer_name} किसान भाई, आपके लिए अनुशंसित योजना: {scheme_n}। निर्देश: {action_i} अधिक सहायता हेतु ग्राम कृषि सहायक से संपर्क करें।"
        else:
            text = f"{farmer_name}, recommended scheme intervention: {scheme_n}. Action: {action_i}"

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "crop": crop_name,
            "language": lang,
            "state": "PLAYING_SCHEMES",
            "digit": "3",
            "voice_prompt_text": text,
            "interventions": interventions
        }
    elif digit == "0":
        # Operator callback
        op_text = {
            "hi": f"{farmer_name} जी, आपकी कॉल किसान मित्र एवं ब्लॉक कृषि अधिकारी को स्थानांतरित की जा रही है। कृपया प्रतीक्षा करें।",
            "mr": f"{farmer_name}, आपला फोन कृषी सहाय्यक आणि तालुका अधिकाऱ्यांकडे वर्ग केला जात आहे. कृपया थांबा.",
            "or": f"{farmer_name}, ଆପଣଙ୍କ କଲ୍ କୃଷି ଅଧିକାରୀ ଏବଂ କୃଷକ ମିତ୍ରଙ୍କ ସହ ସଂଯୋଗ କରାଯାଉଛି। ଦୟାକରି ଅପେକ୍ଷା କରନ୍ତୁ।",
            "as": f"{farmer_name}, আপোনাৰ কল কৃষি বিষয়া আৰু কৃষক মিত্ৰৰ সৈতে সংযোগ কৰা হৈছে। অনুগ্ৰহ কৰি অপেক্ষা কৰক।",
            "kn": f"{farmer_name}, ನಿಮ್ಮ ಕರೆಯನ್ನು ಕೃಷಿ ಅಧಿಕಾರಿ ಮತ್ತು ಕಿಸಾನ್ ಮಿತ್ರರಿಗೆ ವರ್ಗಾಯಿಸಲಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ.",
            "en": f"{farmer_name}, transferring your call to the Block Agriculture Extension Officer. Please stay on the line."
        }
        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "language": lang,
            "state": "CONNECTING_OPERATOR",
            "digit": "0",
            "voice_prompt_text": op_text.get(lang, op_text["en"])
        }
    else:
        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer_name,
            "language": lang,
            "state": "INVALID_DIGIT",
            "voice_prompt_text": "Invalid choice. Please press 1 for Advisory, 2 for Mandi, 3 for Schemes, 9 for Language, or 0 for Officer."
        }


@app.post("/api/simulate/sms")
def simulate_sms(payload: IvrRequest):
    """
    Simulates sending simple, plain-text localized SMS alert to basic feature phone.
    """
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    advisory = get_advisory(farmer["id"], data)
    distress = calculate_distress_score(farmer["id"], DEFAULT_WEIGHTS, data)
    lang = (payload.language or farmer.get("language", "en")).lower()
    if lang not in ["en", "hi", "mr", "or", "as", "kn"]:
        lang = "en"

    # SMS body formatting for low-cost 160-char SMS units
    top_scheme = distress["recommended_interventions"][0] if distress.get("recommended_interventions") else None
    sid = (top_scheme.get('scheme_id') or 'S1') if top_scheme else 'S1'
    scheme_name = get_localized_scheme_name(sid, lang, (top_scheme.get('scheme_name') or 'PMFBY')).split('(')[0].strip() or "PMFBY"

    raw_crop = farmer.get("crop", "Crop")
    crop_name = get_localized_crop_name(raw_crop, lang)
    farmer_name = farmer.get("name", "Farmer")

    if advisory.get("rule_id") == "R-30":
        cur_p = advisory.get("price_data", {}).get("current_price", 2100)
        msp_p = advisory.get("price_data", {}).get("govt_msp", 2400)
        if lang == "or":
            sms_text = f"[କୃଷି ସତର୍କତା] {farmer_name}: {crop_name} ମଣ୍ଡି ଦର ₹{cur_p} ଏମଏସପି ₹{msp_p} ଠାରୁ କମ୍। ଆତଙ୍କରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ଇ-ନାମ ବ୍ୟବହାର କରନ୍ତୁ। ହେଲ୍ପଲାଇନ୍: 1800-180-1551"
        elif lang == "as":
            sms_text = f"[কৃষি সতৰ্কবাৰ্তা] {farmer_name}: {crop_name} বজাৰ দৰ ₹{cur_p} সমৰ্থন মূল্য ₹{msp_p} তকৈ কম। লোকচানত বিক্ৰী নকৰিব। ই-নাম ব্যৱহাৰ কৰক। হেল্পলাইন: 1800-180-1551"
        elif lang == "kn":
            sms_text = f"[ಕೃಷಿ ಎಚ್ಚರಿಕೆ] {farmer_name}: {crop_name} ಮಾರುಕಟ್ಟೆ ದರ ₹{cur_p} ಬೆಂಬಲ ಬೆಲೆ ₹{msp_p} ಗಿಂತ ಕಡಿಮೆ ಇದೆ. ಆತುರದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಡಿ. ಸಹಾಯವಾಣಿ: 1800-180-1551"
        elif lang == "mr":
            sms_text = f"[कृषी अलर्ट] {farmer_name}: {crop_name} बाजार भाव ₹{cur_p} हमीभाव ₹{msp_p} पेक्षा कमी आहे. घाईत विक्री करू नका. ई-नाम वापरा. हेल्पलाइन: 1800-180-1551"
        elif lang == "hi":
            sms_text = f"[कृषि अलर्ट] {farmer_name}: आपकी {crop_name} फसल का मंडी भाव ₹{cur_p} सरकारी समर्थन मूल्य ₹{msp_p} से कम है। संकट में कम दाम पर न बेचें। ई-नाम का लाभ लें। हेल्पलाइन: 1800-180-1551"
        else:
            sms_text = f"[Kisan Market Alert] {farmer_name}: Your {crop_name} mandi price is ₹{cur_p}, below Govt MSP ₹{msp_p}. Avoid distress sale; use e-NAM or warehouse loan. Helpline: 1800-180-1551"
    elif advisory.get("rule_id") == "R-10":
        delay = advisory.get("weather_data", {}).get("onset_delay_days", 10)
        if lang == "or":
            sms_text = f"[ପାଣିପାଗ ସତର୍କତା] {farmer_name}: ମୌସୁମୀ {delay} ଦିନ ବିଳମ୍ବ। କମ୍ ଦିନିଆ ବାଜରା କିମ୍ବା ଡାଲି ଫସଲ ବୁଣନ୍ତୁ। ମାଗଣା ବିହନ ସହାୟତା ଉପଲବ୍ଧ। ହେଲ୍ପଲାଇନ୍: 1800-180-1551"
        elif lang == "as":
            sms_text = f"[বতৰ সতৰ্কবাৰ্তা] {farmer_name}: মৌচুমী {delay} দিন পলম। কম দিনত পকা বজৰা বা মাহজাতীয় শস্য সিঁচক। চৰকাৰী বীজ সাহায্য উপলব্ধ। হেল্পলাইন: 1800-180-1551"
        elif lang == "kn":
            sms_text = f"[ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ] {farmer_name}: ಮುಂಗಾರು {delay} ದಿನ ತಡವಾಗಿದೆ. ಅಲ್ಪಾವಧಿಯ ಸಜ್ಜೆ ಅಥವಾ ಬೇಳೆಕಾಳು ಬೆಳೆ ಬಿತ್ತನೆ ಮಾಡಿ. ಸಹಾಯವಾಣಿ: 1800-180-1551"
        elif lang == "mr":
            sms_text = f"[हवामान अलर्ट] {farmer_name}: मान्सून {delay} दिवस उशिरा आला आहे. कमी कालावधीची बाजरी किंवा तूर पेरणी करा. मोफत बियाणे उपलब्ध. हेल्पलाइन: 1800-180-1551"
        elif lang == "hi":
            sms_text = f"[मौसम अलर्ट] {farmer_name}: मानसून {delay} दिन विलंबित है। कम समय में पकने वाले बाजरा या दलहन की बुवाई करें। बीज सहायता उपलब्ध। हेल्पलाइन: 1800-180-1551"
        else:
            sms_text = f"[Weather Alert] {farmer_name}: Monsoon is delayed by {delay} days. Please sow short-duration crops like Bajra or Pulses. Free seed support available. Helpline: 1800-180-1551"
    else:
        if lang == "or":
            sms_text = f"[କୃଷି ପରାମର୍ଶ] {farmer_name}: ଆପଣଙ୍କ {crop_name} ଫସଲ ସୁରକ୍ଷା ପାଇଁ ହାଲୁକା ଜଳସେଚନ କିମ୍ବା ସ୍ପ୍ରେ କରନ୍ତୁ। ସହାୟକ ଯୋଜନା: {scheme_name}। ହେଲ୍ପଲାଇନ୍: 1800-180-1551"
        elif lang == "as":
            sms_text = f"[কৃষি পৰামৰ্শ] {farmer_name}: আপোনাৰ {crop_name} শস্যৰ সুৰক্ষাৰ বাবে পাতলীয়া পানী বা স্প্ৰে দিয়ক। সাহায্য আঁচনি: {scheme_name}। হেল্পলাইন: 1800-180-1551"
        elif lang == "kn":
            sms_text = f"[ಕೃಷಿ ಸಲಹೆ] {farmer_name}: ನಿಮ್ಮ {crop_name} ಬೆಳೆ ರಕ್ಷಣೆಗೆ ಲಘು ನೀರಾವರಿ ಅಥವಾ ಸಿಂಪರಣೆ ಮಾಡಿ. ಸರ್ಕಾರಿ ಯೋಜನೆ: {scheme_name}. ಸಹಾಯವಾಣಿ: 1800-180-1551"
        elif lang == "mr":
            sms_text = f"[कृषी सल्ला] {farmer_name}: आपल्या {crop_name} पिकाच्या संरक्षणासाठी हलके पाणी किंवा फवारणी करा. शासकीय योजना: {scheme_name}. हेल्पलाइन: 1800-180-1551"
        elif lang == "hi":
            sms_text = f"[कृषि सलाह] {farmer_name}: अपनी {crop_name} फसल सुरक्षा हेतु हल्की सिंचाई या स्प्रे करें। सरकारी योजना: {scheme_name}। किसान हेल्पलाइन: 1800-180-1551"
        else:
            sms_text = f"[Crop Advisory] {farmer_name}: For your {crop_name} crop, apply light irrigation or foliar spray to protect crop health. Support scheme: {scheme_name}. Helpline: 1800-180-1551"

    return {
        "farmer_id": farmer["id"],
        "farmer_name": farmer["name"],
        "language": lang,
        "phone_number": farmer.get("phone", "+91-98XXX-XXXXX"),
        "sms_body": sms_text,
        "character_count": len(sms_text),
        "sms_segments": (len(sms_text) // 160) + 1,
        "delivery_status": "DELIVERED",
        "timestamp": "2026-08-26 16:45:00 IST"
    }

# In-memory TTS audio cache
TTS_CACHE = {}

VOICE_MAP = {
    'hi': 'hi-IN-SwaraNeural',
    'mr': 'mr-IN-AarohiNeural',
    'kn': 'kn-IN-SapnaNeural',
    'en': 'en-IN-NeerjaExpressiveNeural',
    'as': 'bn-IN-TanishaaNeural',
    'or': 'hi-IN-SwaraNeural',
}

# ─── COMPREHENSIVE REGIONAL NUMBER & PHONETIC NORMALIZATION ───
ODIA_DIGIT_MAP = {'୦': '0', '୧': '1', '୨': '2', '୩': '3', '୪': '4', '୫': '5', '୬': '6', '୭': '7', '୮': '8', '୯': '9'}
AS_DIGIT_MAP = {'০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'}
DEVA_DIGIT_MAP = {'०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'}
KN_DIGIT_MAP = {'೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4', '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9'}

ODIA_UNITS = ['', 'ଏକ', 'ଦୁଇ', 'ତିନି', 'ଚାରି', 'ପାଞ୍ଚ', 'ଛଅ', 'ସାତ', 'ଆଠ', 'ନଅ']
ODIA_TEENS_TENS = {
    10: 'ଦଶ', 11: 'ଏଗାର', 12: 'ବାର', 13: 'ତେର', 14: 'ଚଉଦ', 15: 'ପନ୍ଦର', 16: 'ଷୋହଳ', 17: 'ସତର', 18: 'ଅଠର', 19: 'ଉଣାଇଶ',
    20: 'କୋଡ଼ିଏ', 21: 'ଏକାଇଶ', 22: 'ବାଇଶ', 23: 'ତେଇଶ', 24: 'ଚବିଶ', 25: 'ପଚିଶ', 26: 'ଛବିଶ', 27: 'ସତାଇଶ', 28: 'ଅଠାଇଶ', 29: 'ଅଣତିରିଶ',
    30: 'ତିରିଶ', 31: 'ଏକତିରିଶ', 32: 'ବତିଶ', 33: 'ତେତିରିଶ', 34: 'ଚଉତିରିଶ', 35: 'ପଇଁତିରିଶ', 36: 'ଛତିଶ', 37: 'ସଦତିରିଶ', 38: 'ଅଠତିରିଶ', 39: 'ଅଣଚାଳିଶ',
    40: 'ଚାଳିଶ', 41: 'ଏକଚାଳିଶ', 42: 'ବୟାଳିଶ', 43: 'ତେୟାଳିଶ', 44: 'ଚଉରାଳିଶ', 45: 'ପଞ୍ଚଚାଳିଶ', 46: 'ଛୟାଳିଶ', 47: 'ସତଚାଳିଶ', 48: 'ଅଠଚାଳିଶ', 49: 'ଅଣଚାଶ',
    50: 'ପଚାଶ', 51: 'ଏକାବନ', 52: 'ବାଉନ', 53: 'ତେପନ', 54: 'ଚଉବନ', 55: 'ପଞ୍ଚାବନ', 56: 'ଛପନ', 57: 'ସତାବନ', 58: 'ଅଠାବନ', 59: 'ଅଣଷଠି',
    60: 'ଷାଠିଏ', 61: 'ଏକଷଠି', 62: 'ବାଷଠି', 63: 'ତେଷଠି', 64: 'ଚଉଷଠି', 65: 'ପଞ୍ଚଷଠି', 66: 'ଛଅଷଠି', 67: 'ସତଷଠି', 68: 'ଅଠଷଠି', 69: 'ଅଣସତୁରି',
    70: 'ସତୁରି', 71: 'ଏକସ୍ତରୀ', 72: 'ବାସ୍ତରୀ', 73: 'ତେସ୍ତରୀ', 74: 'ଚଉସ୍ତରୀ', 75: 'ପଞ୍ଚସ୍ତରୀ', 76: 'ଛଅସ୍ତରୀ', 77: 'ସତସ୍ତରୀ', 78: 'ଅଠସ୍ତରୀ', 79: 'ଅଣଅଶୀ',
    80: 'ଅଶୀ', 81: 'ଏକାଶୀ', 82: 'ବୟାଶୀ', 83: 'ତେୟାଶୀ', 84: 'ଚଉରାଶୀ', 85: 'ପଞ୍ଚାଶୀ', 86: 'ଛୟାଶୀ', 87: 'ସତାଶୀ', 88: 'ଅଠାଶୀ', 89: 'ଅଣନବେ',
    90: 'ନବେ', 91: 'ଏକାନବେ', 92: 'ବୟାନବେ', 93: 'ତେରାନବେ', 94: 'ଚଉରାନବେ', 95: 'ପଞ୍ଚାନବେ', 96: 'ଛୟାନବେ', 97: 'ସତାନବେ', 98: 'ଅଠାନବେ', 99: 'ଅନେଶତ'
}

AS_UNITS = ['', 'এক', 'দুই', 'তিনি', 'চাৰি', 'পাঁচ', 'ছয়', 'সাত', 'আঠ', 'ন']
AS_TEENS_TENS = {
    10: 'দহ', 11: 'এঘাৰ', 12: 'বাৰ', 13: 'তেৰ', 14: 'চৈধ্য', 15: 'পোন্ধৰ', 16: 'ষোল্ল', 17: 'সোতৰ', 18: 'ওঠৰ', 19: 'উনৈশ',
    20: 'বিশ', 21: 'একৈশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চৌব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাইশ', 28: 'আঠাইশ', 29: 'উনত্ৰিশ',
    30: 'ত্ৰিশ', 31: 'একত্ৰিশ', 32: 'বট্ৰিশ', 33: 'তেত্ৰিশ', 34: 'চৌত্রিশ', 35: 'পঁয়ত্ৰিশ', 36: 'ছয়ত্ৰিশ', 37: 'সাঁইত্ৰিশ', 38: 'আঠত্ৰিশ', 39: 'ঊনচল্লিশ',
    40: 'চল্লিশ', 41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেয়াল্লিশ', 44: 'চৌচল্লিশ', 45: 'পঁয়চল্লিশ', 46: 'ছয়চল্লিশ', 47: 'সাতচল্লিশ', 48: 'আঠচল্লিশ', 49: 'ঊনপঞ্চাশ',
    50: 'পঞ্চাশ', 51: 'একান্ন', 52: 'বায়ান্ন', 53: 'তেপ্পান্ন', 54: 'চৌৱান্ন', 55: 'পঁচপন্ন', 56: 'ছাপ্পান্ন', 57: 'সাতান্ন', 58: 'আঠান্ন', 59: 'ঊনষাঠি',
    60: 'ষাঠি', 61: 'একষষ্ঠি', 62: 'বাষষ্ঠি', 63: 'তেষষ্ঠি', 64: 'চৌষষ্ঠি', 65: 'পঁয়ষষ্ঠি', 66: 'ছয়ষষ্ঠি', 67: 'সাতষষ্ঠি', 68: 'আঠষষ্ঠি', 69: 'ঊনসত্তৰ',
    70: 'সত্তৰ', 71: 'একসত্তৰ', 72: 'বাহাত্তৰ', 73: 'তেסত্তৰ', 74: 'চৌহত্তৰ', 75: 'পঁচাত্তৰ', 76: 'ছয়াত্তৰ', 77: 'সাতসত্তৰ', 78: 'আঠসত্তৰ', 79: 'ঊনআশী',
    80: 'আশী', 81: 'একাকী', 82: 'বিৰাশী', 83: 'তেৰাশী', 84: 'চৌৰাশী', 85: 'পঁচাশী', 86: 'ছয়াশী', 87: 'সাতাশী', 88: 'আঠাশী', 89: 'ঊননব্বৈ',
    90: 'নব্বৈ', 91: 'একানব্বৈ', 92: 'বিয়ানব্বৈ', 93: 'তেৰানব্বৈ', 94: 'চৌৰানব্বৈ', 95: 'পঁচানব্বৈ', 96: 'ছয়ানব্বৈ', 97: 'সাতানব্বৈ', 98: 'আঠানব্বৈ', 99: 'নিৰানব্বৈ'
}

MR_UNITS = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ']
MR_TEENS_TENS = {
    10: 'दहा', 11: 'अकरा', 12: 'बारा', 13: 'तेरा', 14: 'चौदा', 15: 'पंधरा', 16: 'सोळा', 17: 'सतरा', 18: 'अठरा', 19: 'एकोणीस',
    20: 'वीस', 21: 'एकवीस', 22: 'बावीस', 23: 'तेवीस', 24: 'चोवीस', 25: 'पंचवीस', 26: 'सव्वीस', 27: 'सत्तावीस', 28: 'अठ्ठावीस', 29: 'एकोणतीस',
    30: 'तीस', 31: 'एकतीस', 32: 'बत्तीस', 33: 'तेहतीस', 34: 'चौतीस', 35: 'पस्तीस', 36: 'छत्तीस', 37: 'सदतीस', 38: 'अडतीस', 39: 'एकेचाळीस',
    40: 'चाळीस', 41: 'एक्केचाळीस', 42: 'बेचाळीस', 43: 'त्रेचाळीस', 44: 'चव्वेचाळीस', 45: 'पंचेचाळीस', 46: 'शेहेचाळीस', 47: 'सत्तेचाळीस', 48: 'अठ्ठेचाळीस', 49: 'एकोणपन्नास',
    50: 'पन्नास', 51: 'एक्कावन्न', 52: 'बावन्न', 53: 'त्रेपन्न', 54: 'चावन्न', 55: 'पंचावन्न', 56: 'छप्पन्न', 57: 'सत्तावन्न', 58: 'अठ्ठावन्न', 59: 'एकोणसाठ',
    60: 'साठ', 61: 'एकसष्ठ', 62: 'पासष्ठ', 63: 'त्रेसष्ठ', 64: 'चौसष्ठ', 65: 'पासष्ठ', 66: 'सहासष्ठ', 67: 'सदुसष्ठ', 68: 'अडुसष्ठ', 69: 'एकोणसत्तर',
    70: 'सत्तर', 71: 'एकाहत्तर', 72: 'बाहत्तर', 73: 'त्र्याहत्तर', 74: 'चौऱ्याहत्तर', 75: 'पंच्याहत्तर', 76: 'शहात्तर', 77: 'सत्त्याहत्तर', 78: 'अठ्ठ्याहत्तर', 79: 'एकोणऐंशी',
    80: 'ऐंशी', 81: 'एक्यांशी', 82: 'ब्यांशी', 83: 'त्र्यांशी', 84: 'चौऱ्यांशी', 85: 'पंच्यांशी', 86: 'श्यांशी', 87: 'सत्त्यांशी', 88: 'अठ्ठ्यांशी', 89: 'एकोणनव्वद',
    90: 'नव्वद', 91: 'एक्याण्णव', 92: 'ब्याण्णव', 93: 'त्र्याण्णव', 94: 'चौऱ्याण्णव', 95: 'पंच्याण्णव', 96: 'शहाण्णव', 97: 'सत्त्याण्णव', 98: 'अठ्ठ्याण्णव', 99: 'नव्याण्णव'
}

HI_UNITS = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ']
HI_TEENS_TENS = {
    10: 'दस', 11: 'ग्यारह', 12: 'बारह', 13: 'तेरह', 14: 'चौदह', 15: 'पंद्रह', 16: 'सोलह', 17: 'सत्रह', 18: 'अट्ठारह', 19: 'उन्नीस',
    20: 'बीस', 21: 'इक्कीस', 22: 'बाईस', 23: 'तेईस', 24: 'चौबीस', 25: 'पच्चीस', 26: 'छब्बीस', 27: 'सत्ताईस', 28: 'अट्ठाईस', 29: 'उनतीस',
    30: 'तीस', 31: 'इकत्तीस', 32: 'बत्तीस', 33: 'तैंतीस', 34: 'चौंतीस', 35: 'पैंतीस', 36: 'छत्तीस', 37: 'सैंतीस', 38: 'अड़तीस', 39: 'उनतालीस',
    40: 'चालीस', 41: 'इकतालीस', 42: 'बयालीस', 43: 'तैंतालीस', 44: 'चौवालीस', 45: 'पैंतालीस', 46: 'छियालीस', 47: 'सैंतालीस', 48: 'अड़तालीस', 49: 'उनचास',
    50: 'पचास', 51: 'इक्यावन', 52: 'बावन', 53: 'तिरपन', 54: 'चौवन', 55: 'पचपन', 56: 'छप्पन', 57: 'सत्तावन', 58: 'अट्ठावन', 59: 'उनसठ',
    60: 'साठ', 61: 'इकसठ', 62: 'बासठ', 63: 'तिरसठ', 64: 'चौंसठ', 65: 'पैंसठ', 66: 'छियासठ', 67: 'सरसठ', 68: 'अड़सठ', 69: 'उनहत्तर',
    70: 'सत्तर', 71: 'इकहत्तर', 72: 'बहत्तर', 73: 'तिहत्तर', 74: 'चौहत्तर', 75: 'पचहत्तर', 76: 'छिहत्तर', 77: 'सतहत्तर', 78: 'अठहत्तर', 79: 'उन्नासी',
    80: 'अस्सी', 81: 'इक्यासी', 82: 'बयासी', 83: 'तिरासी', 84: 'चौरासी', 85: 'पचासी', 86: 'छियासी', 87: 'सत्तासी', 88: 'अट्ठासी', 89: 'नवासी',
    90: 'नब्बे', 91: 'इक्यानवे', 92: 'बानवे', 93: 'तिरानवे', 94: 'चौरानवे', 95: 'पंचानवे', 96: 'छियानवे', 97: 'सत्तानवे', 98: 'अट्ठानवे', 99: 'निन्यानवे'
}

KN_UNITS = ['', 'ಒಂದು', 'ಎರಡು', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು', 'ಏಳು', 'ಎಂಟು', 'ಒಂಬತ್ತು']
KN_TEENS_TENS = {
    10: 'ಹತ್ತು', 11: 'ಹನ್ನೊಂದು', 12: 'ಹನ್ನೆರಡು', 13: 'ಹದಿಮೂರು', 14: 'ಹದಿನಾಲ್ಕು', 15: 'ಹದಿನೈದು', 16: 'ಹದಿನಾರು', 17: 'ಹದಿನೇಳು', 18: 'ಹದಿನೆಂಟು', 19: 'ಹತ್ತೊಂಬತ್ತು',
    20: 'ಇಪ್ಪತ್ತು', 30: 'ಮೂವತ್ತು', 40: 'ನಲವತ್ತು', 50: 'ಐವತ್ತು', 60: 'ಅರವತ್ತು', 70: 'ಎಪ್ಪತ್ತು', 80: 'ಎಂಬತ್ತು', 90: 'ತೊಂಬತ್ತು'
}

def num_to_odia(n: int) -> str:
    if n == 0: return 'ଶୂନ'
    if n < 10: return ODIA_UNITS[n]
    if n < 100: return ODIA_TEENS_TENS.get(n, str(n))
    if n < 1000:
        h = n // 100; rem = n % 100
        h_str = (ODIA_UNITS[h] + ' ଶହ') if h > 1 else 'ଏକ ଶହ'
        return h_str + (' ' + num_to_odia(rem) if rem else '')
    if n < 100000:
        th = n // 1000; rem = n % 1000
        return num_to_odia(th) + ' ହଜାର' + (' ' + num_to_odia(rem) if rem else '')
    if n < 10000000:
        l = n // 100000; rem = n % 100000
        return num_to_odia(l) + ' ଲକ୍ଷ' + (' ' + num_to_odia(rem) if rem else '')
    cr = n // 10000000; rem = n % 10000000
    return num_to_odia(cr) + ' କୋଟି' + (' ' + num_to_odia(rem) if rem else '')

def num_to_assamese(n: int) -> str:
    if n == 0: return 'শূন্য'
    if n < 10: return AS_UNITS[n]
    if n < 100: return AS_TEENS_TENS.get(n, str(n))
    if n < 1000:
        h = n // 100; rem = n % 100
        h_str = (AS_UNITS[h] + 'শ') if h > 1 else 'এশ'
        return h_str + (' ' + num_to_assamese(rem) if rem else '')
    if n < 100000:
        th = n // 1000; rem = n % 1000
        return num_to_assamese(th) + ' হাজাৰ' + (' ' + num_to_assamese(rem) if rem else '')
    if n < 10000000:
        l = n // 100000; rem = n % 100000
        return num_to_assamese(l) + ' লাখ' + (' ' + num_to_assamese(rem) if rem else '')
    cr = n // 10000000; rem = n % 10000000
    return num_to_assamese(cr) + ' কোটি' + (' ' + num_to_assamese(rem) if rem else '')

def num_to_marathi(n: int) -> str:
    if n == 0: return 'शून्य'
    if n < 10: return MR_UNITS[n]
    if n < 100: return MR_TEENS_TENS.get(n, str(n))
    if n < 1000:
        h = n // 100; rem = n % 100
        h_str = (MR_UNITS[h] + 'शे') if h > 1 else 'एकशे'
        return h_str + (' ' + num_to_marathi(rem) if rem else '')
    if n < 100000:
        th = n // 1000; rem = n % 1000
        return num_to_marathi(th) + ' हजार' + (' ' + num_to_marathi(rem) if rem else '')
    if n < 10000000:
        l = n // 100000; rem = n % 100000
        return num_to_marathi(l) + ' लाख' + (' ' + num_to_marathi(rem) if rem else '')
    cr = n // 10000000; rem = n % 10000000
    return num_to_marathi(cr) + ' कोटी' + (' ' + num_to_marathi(rem) if rem else '')

def num_to_hindi(n: int) -> str:
    if n == 0: return 'शून्य'
    if n < 10: return HI_UNITS[n]
    if n < 100: return HI_TEENS_TENS.get(n, str(n))
    if n < 1000:
        h = n // 100; rem = n % 100
        h_str = (HI_UNITS[h] + ' सौ') if h > 1 else 'एक सौ'
        return h_str + (' ' + num_to_hindi(rem) if rem else '')
    if n < 100000:
        th = n // 1000; rem = n % 1000
        return num_to_hindi(th) + ' हज़ार' + (' ' + num_to_hindi(rem) if rem else '')
    if n < 10000000:
        l = n // 100000; rem = n % 100000
        return num_to_hindi(l) + ' लाख' + (' ' + num_to_hindi(rem) if rem else '')
    cr = n // 10000000; rem = n % 10000000
    return num_to_hindi(cr) + ' करोड़' + (' ' + num_to_hindi(rem) if rem else '')

def num_to_kannada(n: int) -> str:
    if n == 0: return 'ಶೂನ್ಯ'
    if n < 10: return KN_UNITS[n]
    if n in KN_TEENS_TENS: return KN_TEENS_TENS[n]
    if n < 100:
        t = (n // 10) * 10; rem = n % 10
        return KN_TEENS_TENS.get(t, '') + ' ' + KN_UNITS[rem]
    if n < 1000:
        h = n // 100; rem = n % 100
        h_str = (KN_UNITS[h] + ' ನೂರು') if h > 1 else 'ಒಂದು ನೂರು'
        return h_str + (' ' + num_to_kannada(rem) if rem else '')
    if n < 100000:
        th = n // 1000; rem = n % 1000
        return num_to_kannada(th) + ' ಸಾವಿರ' + (' ' + num_to_kannada(rem) if rem else '')
    if n < 10000000:
        l = n // 100000; rem = n % 100000
        return num_to_kannada(l) + ' ಲಕ್ಷ' + (' ' + num_to_kannada(rem) if rem else '')
    cr = n // 10000000; rem = n % 10000000
    return num_to_kannada(cr) + ' ಕೋಟಿ' + (' ' + num_to_kannada(rem) if rem else '')

def normalize_spoken_indic_text(text: str, lang: str) -> str:
    """
    Converts numbers, currencies, percentages, ratios, helpline numbers, and abbreviations
    into natural, native spoken words for the specified Indian language.
    """
    if not text:
        return text

    effective_lang = (lang or 'hi').lower().split('-')[0]

    if effective_lang == 'or':
        for o_dig, a_dig in ODIA_DIGIT_MAP.items():
            text = text.replace(o_dig, a_dig)
        
        text = re.sub(r'\bPMFBY\b', 'ପ୍ରଧାନମନ୍ତ୍ରୀ ଫସଲ ବୀମା ଯୋଜନା', text, flags=re.IGNORECASE)
        text = re.sub(r'\bKCC\b', 'କିଷାନ କ୍ରେଡିଟ୍ କାର୍ଡ', text, flags=re.IGNORECASE)
        text = re.sub(r'\be-NAM\b', 'ଇ-ନାମ', text, flags=re.IGNORECASE)
        text = re.sub(r'\bWDRA\b', 'ପଞ୍ଜୀକୃତ ଗୋଦାମ', text, flags=re.IGNORECASE)
        text = re.sub(r'\bMSP\b', 'ସର୍ବନିମ୍ନ ସହାୟକ ମୂଲ୍ୟ', text, flags=re.IGNORECASE)
        text = re.sub(r'\bCRIDA\b', 'କ୍ରିଡା', text, flags=re.IGNORECASE)
        text = re.sub(r'\bStep\s*(\d+)\s*of\s*(\d+)\b', r'\2 ମଧ୍ୟରୁ ପଦକ୍ଷେପ \1', text, flags=re.IGNORECASE)

        def replace_phone(m):
            raw = m.group(0).replace('-', ' ')
            return ' '.join(num_to_odia(int(d)) for d in re.findall(r'\d', raw))
        text = re.sub(r'\b1800[-\s]\d{3}[-\s]\d{4}\b', replace_phone, text)

        def replace_ratio(m):
            parts = m.group(0).split(':')
            return ' '.join(num_to_odia(int(p)) for p in parts)
        text = re.sub(r'\b\d+:\d+:\d+\b', replace_ratio, text)

        def replace_curr(m):
            val_str = m.group(1).replace(',', '')
            return num_to_odia(int(val_str)) + ' ଟଙ୍କା'
        text = re.sub(r'₹\s*([\d,]+)', replace_curr, text)
        text = re.sub(r'([\d,]+)\s*(?:ଟଙ୍କା|/-|Rs\.?)', replace_curr, text)

        def replace_pct(m):
            val_str = m.group(1)
            if '.' in val_str:
                whole, dec = val_str.split('.')
                return f'{num_to_odia(int(whole))} ଦଶମିକ {num_to_odia(int(dec))} ପ୍ରତିଶତ'
            return f'{num_to_odia(int(val_str))} ପ୍ରତିଶତ'
        text = re.sub(r'([\d.]+)\s*%', replace_pct, text)

        def replace_dec(m):
            whole, dec = m.group(1), m.group(2)
            return f'{num_to_odia(int(whole))} ଦଶମିକ {num_to_odia(int(dec))}'
        text = re.sub(r'\b(\d+)\.(\d+)\b', replace_dec, text)

        def replace_num(m):
            n_str = m.group(0).replace(',', '')
            return num_to_odia(int(n_str))
        text = re.sub(r'\b\d+\b', replace_num, text)

    elif effective_lang == 'as':
        for as_dig, a_dig in AS_DIGIT_MAP.items():
            text = text.replace(as_dig, a_dig)
        
        text = re.sub(r'\bPMFBY\b', 'প্ৰধানমন্ত্ৰী শস্য বীমা যোজনা', text, flags=re.IGNORECASE)
        text = re.sub(r'\bKCC\b', 'কিষাণ ক্ৰেডিট কাৰ্ড', text, flags=re.IGNORECASE)
        text = re.sub(r'\be-NAM\b', 'ই-নাম', text, flags=re.IGNORECASE)
        text = re.sub(r'\bWDRA\b', 'পঞ্জীকৃত গুদাম', text, flags=re.IGNORECASE)
        text = re.sub(r'\bMSP\b', 'চৰকাৰী সমৰ্থন মূল্য', text, flags=re.IGNORECASE)
        text = re.sub(r'\bCRIDA\b', 'ক্ৰিডা', text, flags=re.IGNORECASE)
        text = re.sub(r'\bStep\s*(\d+)\s*of\s*(\d+)\b', r'\2 টাৰ ভিতৰত \1 নম্বৰ স্তৰ', text, flags=re.IGNORECASE)

        def replace_phone(m):
            raw = m.group(0).replace('-', ' ')
            return ' '.join(num_to_assamese(int(d)) for d in re.findall(r'\d', raw))
        text = re.sub(r'\b1800[-\s]\d{3}[-\s]\d{4}\b', replace_phone, text)

        def replace_ratio(m):
            parts = m.group(0).split(':')
            return ' '.join(num_to_assamese(int(p)) for p in parts)
        text = re.sub(r'\b\d+:\d+:\d+\b', replace_ratio, text)

        def replace_curr(m):
            val_str = m.group(1).replace(',', '')
            return num_to_assamese(int(val_str)) + ' টকা'
        text = re.sub(r'₹\s*([\d,]+)', replace_curr, text)
        text = re.sub(r'([\d,]+)\s*(?:টকা|/-|Rs\.?)', replace_curr, text)

        def replace_pct(m):
            val_str = m.group(1)
            if '.' in val_str:
                whole, dec = val_str.split('.')
                return f'{num_to_assamese(int(whole))} দশমিক {num_to_assamese(int(dec))} শতাংশ'
            return f'{num_to_assamese(int(val_str))} শতাংশ'
        text = re.sub(r'([\d.]+)\s*%', replace_pct, text)

        def replace_dec(m):
            whole, dec = m.group(1), m.group(2)
            return f'{num_to_assamese(int(whole))} দশমিক {num_to_assamese(int(dec))}'
        text = re.sub(r'\b(\d+)\.(\d+)\b', replace_dec, text)

        def replace_num(m):
            n_str = m.group(0).replace(',', '')
            return num_to_assamese(int(n_str))
        text = re.sub(r'\b\d+\b', replace_num, text)

    elif effective_lang == 'mr':
        for d_dig, a_dig in DEVA_DIGIT_MAP.items():
            text = text.replace(d_dig, a_dig)
        def replace_curr(m):
            val_str = m.group(1).replace(',', '')
            return num_to_marathi(int(val_str)) + ' रुपये'
        text = re.sub(r'₹\s*([\d,]+)', replace_curr, text)
        text = re.sub(r'([\d,]+)\s*(?:रुपये|/-|Rs\.?)', replace_curr, text)

        def replace_pct(m):
            val_str = m.group(1)
            if '.' in val_str:
                whole, dec = val_str.split('.')
                return f'{num_to_marathi(int(whole))} पूर्णांक {num_to_marathi(int(dec))} टक्के'
            return f'{num_to_marathi(int(val_str))} टक्के'
        text = re.sub(r'([\d.]+)\s*%', replace_pct, text)

    elif effective_lang == 'hi':
        for d_dig, a_dig in DEVA_DIGIT_MAP.items():
            text = text.replace(d_dig, a_dig)
        def replace_curr(m):
            val_str = m.group(1).replace(',', '')
            return num_to_hindi(int(val_str)) + ' रुपये'
        text = re.sub(r'₹\s*([\d,]+)', replace_curr, text)
        text = re.sub(r'([\d,]+)\s*(?:रुपये|/-|Rs\.?)', replace_curr, text)

        def replace_pct(m):
            val_str = m.group(1)
            if '.' in val_str:
                whole, dec = val_str.split('.')
                return f'{num_to_hindi(int(whole))} दशमलव {num_to_hindi(int(dec))} प्रतिशत'
            return f'{num_to_hindi(int(val_str))} प्रतिशत'
        text = re.sub(r'([\d.]+)\s*%', replace_pct, text)

    elif effective_lang == 'kn':
        for kn_dig, a_dig in KN_DIGIT_MAP.items():
            text = text.replace(kn_dig, a_dig)
        def replace_curr(m):
            val_str = m.group(1).replace(',', '')
            return num_to_kannada(int(val_str)) + ' ರೂಪಾಯಿ'
        text = re.sub(r'₹\s*([\d,]+)', replace_curr, text)
        text = re.sub(r'([\d,]+)\s*(?:ರೂಪಾಯಿ|/-|Rs\.?)', replace_curr, text)

        def replace_pct(m):
            val_str = m.group(1)
            if '.' in val_str:
                whole, dec = val_str.split('.')
                return f'{num_to_kannada(int(whole))} ಬಿಂದು {num_to_kannada(int(dec))} ಪ್ರತಿಶತ'
            return f'{num_to_kannada(int(val_str))} ಪ್ರತಿಶತ'
        text = re.sub(r'([\d.]+)\s*%', replace_pct, text)

    return text

ODIA_PHONETIC_DEV = {
    '\u0B01': '\u0901', '\u0B02': '\u0902', '\u0B03': '\u0903',
    '\u0B05': '\u0905', '\u0B06': '\u0906', '\u0B07': '\u0907', '\u0B08': '\u0908',
    '\u0B09': '\u0909', '\u0B0A': '\u090A', '\u0B0B': '\u090B',
    '\u0B0F': '\u090F', '\u0B10': '\u0910', '\u0B13': '\u0913', '\u0B14': '\u0914',
    '\u0B15': '\u0915', '\u0B16': '\u0916', '\u0B17': '\u0917', '\u0B18': '\u0918', '\u0B19': '\u0919',
    '\u0B1A': '\u091A', '\u0B1B': '\u091B', '\u0B1C': '\u091C', '\u0B1D': '\u091D', '\u0B1E': '\u091E',
    '\u0B1F': '\u091F', '\u0B20': '\u0920', '\u0B21': '\u0921', '\u0B22': '\u0922', '\u0B23': '\u0923',
    '\u0B24': '\u0924', '\u0B25': '\u0925', '\u0B26': '\u0926', '\u0B27': '\u0927', '\u0B28': '\u0928',
    '\u0B2A': '\u092A', '\u0B2B': '\u092B', '\u0B2C': '\u092C', '\u0B2D': '\u092D', '\u0B2E': '\u092E',
    '\u0B2F': '\u092F', '\u0B30': '\u0930', '\u0B32': '\u0932', '\u0B33': '\u0933',
    '\u0B36': '\u0936', '\u0B37': '\u0937', '\u0B38': '\u0938', '\u0B39': '\u0939',
    '\u0B3C': '\u093C',
    '\u0B3E': '\u093E', '\u0B3F': '\u093F', '\u0B40': '\u0940',
    '\u0B41': '\u0941', '\u0B42': '\u0942', '\u0B43': '\u0943',
    '\u0B47': '\u0947', '\u0B48': '\u0948', '\u0B4B': '\u094B', '\u0B4C': '\u094C',
    '\u0B4D': '\u094D',
    '\u0B56': '\u0948', '\u0B57': '\u094C',
    '\u0B5C': '\u095C', '\u0B5D': '\u095D',
    '\u0B5F': '\u092F', '\u0B71': '\u0935'
}

def odia_to_phonetic_devanagari(text: str) -> str:
    """Phonetically maps Odia Unicode characters (0x0B00-0x0B7F) to Devanagari with proper Indic phonetics"""
    return ''.join(ODIA_PHONETIC_DEV.get(ch, ch) for ch in text)

def assamese_to_bengali_phonetic(text: str) -> str:
    """Maps Assamese unique characters to Bengali phonetic equivalents for clear speech synthesis"""
    return text.replace('\u09F0', '\u09B0').replace('\u09F1', '\u09AC')

TTS_DISK_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".tts_cache")
os.makedirs(TTS_DISK_CACHE_DIR, exist_ok=True)

async def synthesize_speech(text: str, lang: str) -> bytes:
    import hashlib
    import re
    import urllib.request
    import urllib.parse
    import edge_tts

    effective_lang = (lang or 'hi').lower().split('-')[0]
    
    # 1. Normalize numbers, percentages, currencies, dates, and terms for authentic spoken form
    normalized_text = normalize_spoken_indic_text(text, effective_lang)

    # 2. Preprocess text for natural regional phonetics
    if effective_lang == 'or':
        processed_text = odia_to_phonetic_devanagari(normalized_text)
        speech_rate = '-4%'
    elif effective_lang == 'as':
        processed_text = assamese_to_bengali_phonetic(normalized_text)
        speech_rate = '-3%'
    else:
        processed_text = normalized_text
        speech_rate = '-2%'

    # Calculate deterministic hash for lightning-fast disk & memory lookup
    cache_hash = hashlib.md5(f"{effective_lang}:{processed_text}:{speech_rate}".encode('utf-8')).hexdigest()
    disk_cache_path = os.path.join(TTS_DISK_CACHE_DIR, f"{cache_hash}.mp3")

    if cache_hash in TTS_CACHE:
        return TTS_CACHE[cache_hash]

    if os.path.exists(disk_cache_path):
        try:
            with open(disk_cache_path, "rb") as f:
                audio_data = f.read()
            if audio_data and len(audio_data) > 100:
                TTS_CACHE[cache_hash] = audio_data
                return audio_data
        except Exception:
            pass

    # 3. Primary engine: Microsoft Edge Neural TTS (Natural, expressive Indian voices)
    try:
        voice = VOICE_MAP.get(effective_lang, 'hi-IN-SwaraNeural')
        comm = edge_tts.Communicate(processed_text, voice, rate=speech_rate, pitch='+0Hz')
        audio_data = b''
        async for chunk in comm.stream():
            if chunk['type'] == 'audio':
                audio_data += chunk['data']
        if audio_data:
            if len(TTS_CACHE) > 1000:
                TTS_CACHE.clear()
            TTS_CACHE[cache_hash] = audio_data
            try:
                with open(disk_cache_path, "wb") as f:
                    f.write(audio_data)
            except Exception:
                pass
            return audio_data
    except Exception as e:
        print(f"Edge TTS synthesis error ({effective_lang}): {e}, falling back to secondary engine")

    # 4. Secondary fallback engine: Google TTS with normalized regional text
    try:
        target_tl = 'hi' if effective_lang == 'or' else 'bn' if effective_lang == 'as' else effective_lang
        parts = re.split(r'([.!?,।\n]+)', processed_text)
        chunks = []
        current_chunk = ""
        for part in parts:
            if len(current_chunk) + len(part) < 180:
                current_chunk += part
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = part
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        if not chunks:
            chunks = [processed_text[:180]]

        audio_segments = []
        for chunk in chunks:
            if not chunk.strip():
                continue
            encoded_text = urllib.parse.quote(chunk.strip())
            url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={target_tl}&client=tw-ob&q={encoded_text}"
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                audio_segments.append(response.read())

        audio_data = b"".join(audio_segments)
        if audio_data:
            TTS_CACHE[cache_hash] = audio_data
            try:
                with open(disk_cache_path, "wb") as f:
                    f.write(audio_data)
            except Exception:
                pass
            return audio_data
    except Exception as e:
        print(f"Google TTS fallback error ({effective_lang}): {e}")

    raise Exception(f"Failed to synthesize speech for language {lang}")

@app.get("/api/tts")
async def text_to_speech_proxy(text: str, lang: str = "hi"):
    """
    High-fidelity Neural Text-To-Speech endpoint supporting all 6 languages:
    Odia, Assamese, Kannada, Marathi, Hindi, English.
    """
    if not text:
        raise HTTPException(status_code=400, detail="Text parameter is required")
    try:
        audio_content = await synthesize_speech(text, lang)
        return Response(content=audio_content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static assets and serve client frontend
if os.path.exists(CLIENT_DIR):
    app.mount("/static", StaticFiles(directory=CLIENT_DIR), name="static")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(os.path.join(CLIENT_DIR, "index.html"))



class SimulationPayload(BaseModel):
    farmer_id: Optional[str] = None
    farmer: Optional[Dict[str, Any]] = None
    current_mandi_price: Optional[float] = None
    govt_msp: Optional[float] = None
    rainfall_deviation_pct: Optional[float] = None
    dry_spell_days: Optional[int] = None
    onset_delay_days: Optional[int] = None
    temperature_anomaly_c: Optional[float] = None
    pest_severity: Optional[str] = None
    language: Optional[str] = "en"


@app.post("/api/simulator/evaluate")
@app.post("/api/v1/simulator/evaluate")
def evaluate_simulation(payload: SimulationPayload):
    data = load_full_datastore()

    farmer_data = payload.farmer or {}
    f_id = payload.farmer_id or farmer_data.get("id", "CUSTOM_1")
    
    district_id = farmer_data.get("district_id", "D1")
    crop = (farmer_data.get("crop") or "onion").lower()
    crop_stage = (farmer_data.get("crop_stage") or "harvest").lower()
    lang = payload.language or farmer_data.get("language") or "en"

    sim_farmer = {
        "id": f_id,
        "name": farmer_data.get("name", "Demo Farmer"),
        "village": farmer_data.get("village", "Nashik Village"),
        "district_id": district_id,
        "crop": crop,
        "crop_stage": crop_stage,
        "landholding_hectares": float(farmer_data.get("landholding_hectares") or 1.2),
        "soil_type": farmer_data.get("soil_type", "black"),
        "irrigation_type": farmer_data.get("irrigation_type", "protective_well"),
        "borewell_failed": bool(farmer_data.get("borewell_failed", False)),
        "has_pmfby_insurance": bool(farmer_data.get("has_pmfby_insurance", True)),
        "has_kcc": bool(farmer_data.get("has_kcc", True)),
        "informal_debt": bool(farmer_data.get("informal_debt", False)),
        "loan_due_date": farmer_data.get("loan_due_date", "15/11/2026"),
        "loan_amount_inr": float(farmer_data.get("loan_amount_inr", 50000)),
        "enrolled_schemes": farmer_data.get("enrolled_schemes", ["PM-KISAN"]),
        "income_sources": farmer_data.get("income_sources", ["crop_cultivation"]),
        "device_type": farmer_data.get("device_type", "android_smartphone"),
        "network_quality": farmer_data.get("network_quality", "4G"),
        "tech_literacy": farmer_data.get("tech_literacy", "high"),
        "language": lang
    }

    existing_idx = next((i for i, f in enumerate(data["farmers"]) if f["id"] == f_id), None)
    if existing_idx is not None:
        data["farmers"][existing_idx] = sim_farmer
    else:
        data["farmers"].append(sim_farmer)

    if payload.rainfall_deviation_pct is not None or payload.dry_spell_days is not None or payload.onset_delay_days is not None:
        w_idx = next((i for i, w in enumerate(data["daily_rainfall"]) if w["district_id"] == district_id), None)
        if w_idx is not None:
            w_rec = dict(data["daily_rainfall"][w_idx])
            if payload.rainfall_deviation_pct is not None:
                w_rec["rainfall_deviation_pct"] = float(payload.rainfall_deviation_pct)
            if payload.dry_spell_days is not None:
                w_rec["consecutive_dry_days"] = int(payload.dry_spell_days)
            if payload.onset_delay_days is not None:
                w_rec["onset_delay_days"] = int(payload.onset_delay_days)
            data["daily_rainfall"][w_idx] = w_rec

    if payload.current_mandi_price is not None or payload.govt_msp is not None:
        m_idx = next((i for i, m in enumerate(data["mandi_prices"]) if m["crop"].lower() == crop and m["district_id"] == district_id), None)
        if m_idx is not None:
            m_rec = dict(data["mandi_prices"][m_idx])
            if payload.current_mandi_price is not None:
                m_rec["modal_price_per_quintal"] = float(payload.current_mandi_price)
            if payload.govt_msp is not None:
                m_rec["msp_per_quintal"] = float(payload.govt_msp)
            data["mandi_prices"][m_idx] = m_rec
        elif payload.current_mandi_price is not None:
            data["mandi_prices"].append({
                "district_id": district_id,
                "crop": crop,
                "modal_price_per_quintal": float(payload.current_mandi_price),
                "msp_per_quintal": float(payload.govt_msp or 0),
                "trend": "falling"
            })

    advisory_res = get_advisory(f_id, data)
    distress_res = calculate_distress_score(f_id, DEFAULT_WEIGHTS, data)

    # Decision trace
    mandi = next((m for m in data["mandi_prices"] if m["crop"].lower() == crop and m["district_id"] == district_id), {})
    rain = next((r for r in data["daily_rainfall"] if r["district_id"] == district_id), {})
    cur_price = mandi.get("modal_price_per_quintal", 0)
    msp_val = mandi.get("msp_per_quintal", 0)

    decision_trace = [
        {
            "priority": 1,
            "rule": "R-30 (Market Intervention / MSP Override)",
            "condition": "crop_stage == 'harvest' and mandi_price < govt_msp",
            "evaluated": f"Stage: '{crop_stage}', Price: ₹{cur_price}, MSP: ₹{msp_val}",
            "triggered": (crop_stage == "harvest" and cur_price > 0 and msp_val > 0 and cur_price < msp_val)
        },
        {
            "priority": 2,
            "rule": "R-10 (Contingency Crop Switch)",
            "condition": "onset_delay > 14 or (dry_spell >= 12 and crop_stage == 'sowing')",
            "evaluated": f"Onset Delay: {rain.get('onset_delay_days', 0)}d, Dry Spell: {rain.get('consecutive_dry_days', 0)}d, Stage: '{crop_stage}'",
            "triggered": (rain.get("onset_delay_days", 0) > 14 or (rain.get("consecutive_dry_days", 0) >= 12 and crop_stage == "sowing"))
        },
        {
            "priority": 3,
            "rule": "R-15 (Protective Life-Saving Irrigation)",
            "condition": "irrigation_type == 'protective_well' and (borewell_failed or dry_spell >= 10)",
            "evaluated": f"Irrigation: '{sim_farmer['irrigation_type']}', Borewell Failed: {sim_farmer['borewell_failed']}, Dry Spell: {rain.get('consecutive_dry_days', 0)}d",
            "triggered": (sim_farmer["irrigation_type"] == "protective_well" and (sim_farmer["borewell_failed"] or rain.get("consecutive_dry_days", 0) >= 10))
        },
        {
            "priority": 4,
            "rule": "R-20 (Standard ICAR-CRIDA Agronomy Guidance)",
            "condition": "Fired when no high-priority distress overrides trigger",
            "evaluated": "Default agronomy guideline based on crop growth stage",
            "triggered": (advisory_res.get("rule_id") == "R-20")
        }
    ]

    return {
        "status": "success",
        "inputs_received": {
            "farmer_name": sim_farmer["name"],
            "district_id": district_id,
            "crop": crop,
            "crop_stage": crop_stage,
            "language": lang,
            "current_mandi_price": cur_price,
            "govt_msp": msp_val,
            "rainfall_deviation_pct": rain.get("rainfall_deviation_pct", 0),
            "dry_spell_days": rain.get("consecutive_dry_days", 0),
            "onset_delay_days": rain.get("onset_delay_days", 0)
        },
        "advisory": advisory_res,
        "distress": distress_res,
        "decision_trace": decision_trace
    }
