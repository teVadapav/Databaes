"""
PS-02: Smart Crop Advisory & Farmer Distress Early-Warning System (v3)
FastAPI Backend Application
"""

import json
import os
import sqlite3
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from server.engine.channel_router import get_recommended_channel, get_default_ui_mode
from server.engine.advisory_engine import get_advisory
from server.engine.distress_scorer import calculate_distress_score, DEFAULT_WEIGHTS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "distress_system.db")
CLIENT_DIR = os.path.join(BASE_DIR, "client")

app = FastAPI(
    title="PS-02 Smart Crop Advisory & Distress Early-Warning API",
    version="3.0.0",
    description="Comprehensive Feasibility Edition: Advisory Engine, Distress-Risk Scorer, MSP Financial Overrides & Scheme Interventions"
)

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
    conn.close()

    return {
        "districts": districts,
        "mandi_prices": mandi_prices,
        "farmers": farmers,
        "schemes": schemes,
        "daily_rainfall": daily_rainfall,
        "officers": officers,
        "contingency_crops": contingency_crops,
        "advisory_rules": advisory_rules
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


@app.post("/api/simulate/ivr")
def simulate_ivr(payload: IvrRequest):
    """
    Simulates Interactive Voice Response (IVR) phone tree for low-literacy / feature-phone farmers.
    """
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    advisory = get_advisory(farmer["id"], data)
    distress = calculate_distress_score(farmer["id"], DEFAULT_WEIGHTS, data)
    lang = farmer.get("language", "hi")

    # If no digit pressed, return initial greeting & audio prompt menu
    if not payload.digit_pressed:
        if lang == "mr":
            greeting = f"नमस्कार {farmer['name']} शेतकरी बंधू. कृषी सल्ला आणि मदत प्रणालीमध्ये आपले स्वागत आहे."
            menu_text = "हवामान व पीक सल्ल्यासाठी १ दाबा. बाजार भाव व हमीभावासाठी २ दाबा. शासकीय योजना व मदतीसाठी ३ दाबा."
        elif lang == "hi":
            greeting = f"नमस्ते {farmer['name']} किसान भाई। स्मार्ट कृषि सलाह एवं सहायता केंद्र में आपका स्वागत है।"
            menu_text = "मौसम एवं फसल सलाह के लिए 1 दबाएं। मंडी भाव एवं समर्थन मूल्य के लिए 2 दबाएं। सरकारी योजनाओं के लिए 3 दबाएं।"
        else:
            greeting = f"Welcome {farmer['name']} to Kisan Krishi Advisory Helpline."
            menu_text = "Press 1 for Weather & Crop Advisory. Press 2 for Mandi Price & MSP comparison. Press 3 for Government Schemes & Loan Support."

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "language": lang,
            "state": "MAIN_MENU",
            "voice_prompt_text": f"{greeting} {menu_text}",
            "options": [
                {"key": "1", "label": "Crop & Weather Advisory"},
                {"key": "2", "label": "Mandi Price vs Govt MSP"},
                {"key": "3", "label": "Govt Schemes & Debt Relief"}
            ]
        }

    # Handle digit navigation
    digit = str(payload.digit_pressed).strip()
    if digit == "1":
        # Crop Advisory
        text = advisory["text"].get(lang, advisory["text"]["en"])
        return {
            "farmer_id": farmer["id"],
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
        pd = advisory["price_data"]
        crop = farmer["crop"]
        if pd["is_below_msp"]:
            if lang == "mr":
                text = f"लक्ष द्या! आपल्या {crop} पिकाचा सध्याचा बाजार भाव ₹{pd['current_price']} असून शासकीय हमीभाव ₹{pd['govt_msp']} आहे. भाव हमीभावापेक्षा {pd['shortfall_pct']}% कमी आहे. घाईत विक्री करू नका. वेअरहाऊस पावतीवर कर्ज घ्या किंवा ई-नाम नोंदणी करा."
            elif lang == "hi":
                text = f"ध्यान दें! आपकी {crop} फसल का वर्तमान मंडी भाव ₹{pd['current_price']} है, जबकि सरकारी समर्थन मूल्य ₹{pd['govt_msp']} है। भाव एमएसपी से {pd['shortfall_pct']}% कम है। संकट में न बेचें। ई-नाम या पंजीकृत गोदाम का लाभ लें।"
            else:
                text = f"Attention: Current mandi price for {crop} is ₹{pd['current_price']}, which is below the Government MSP of ₹{pd['govt_msp']} by {pd['shortfall_pct']}%. Do not sell in panic."
        else:
            if lang == "mr":
                text = f"आपल्या {crop} पिकाचा बाजार भाव ₹{pd['current_price']} असून तो हमीभावाच्या (₹{pd['govt_msp']}) वर समाधानकारक आहे."
            elif lang == "hi":
                text = f"आपकी {crop} फसल का मंडी भाव ₹{pd['current_price']} है, जो समर्थन मूल्य ₹{pd['govt_msp']} से बेहतर है।"
            else:
                text = f"Current mandi price for {crop} is ₹{pd['current_price']}, which is stable and above Government MSP."

        return {
            "farmer_id": farmer["id"],
            "language": lang,
            "state": "PLAYING_MANDI",
            "digit": "2",
            "voice_prompt_text": text,
            "price_data": pd
        }
    elif digit == "3":
        # Schemes
        interventions = distress["recommended_interventions"]
        top_scheme = interventions[0] if interventions else {"scheme_name": "PM-KISAN", "action_item": "Verify enrollment"}
        if lang == "mr":
            text = f"आपल्यासाठी शिफारस केलेली योजना: {top_scheme['scheme_name']}. कृती: {top_scheme['action_item']}. अधिक माहितीसाठी जवळच्या कृषी कार्यालयात संपर्क साधा."
        elif lang == "hi":
            text = f"आपके लिए अनुशंसित योजना: {top_scheme['scheme_name']}। निर्देश: {top_scheme['action_item']}। अधिक सहायता हेतु ग्राम कृषि सहायक से संपर्क करें।"
        else:
            text = f"Recommended scheme intervention: {top_scheme['scheme_name']}. Action: {top_scheme['action_item']}."

        return {
            "farmer_id": farmer["id"],
            "language": lang,
            "state": "PLAYING_SCHEMES",
            "digit": "3",
            "voice_prompt_text": text,
            "interventions": interventions
        }
    else:
        return {
            "farmer_id": farmer["id"],
            "language": lang,
            "state": "INVALID_DIGIT",
            "voice_prompt_text": "Invalid choice. Please press 1, 2, or 3."
        }


@app.post("/api/simulate/sms")
def simulate_sms(payload: IvrRequest):
    """
    Simulates sending plain-text SMS alert to basic feature phone.
    """
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    advisory = get_advisory(farmer["id"], data)
    distress = calculate_distress_score(farmer["id"], DEFAULT_WEIGHTS, data)
    lang = farmer.get("language", "hi")

    # SMS body formatting for low-cost 160-char SMS units
    top_scheme = distress["recommended_interventions"][0] if distress["recommended_interventions"] else None
    scheme_text = f"Scheme: {top_scheme['scheme_id']} ({top_scheme['scheme_name'][:30]})" if top_scheme else "Scheme: PMFBY Active"

    if advisory["rule_id"] == "R-30":
        sms_text = f"[KRISHI-ALERT] {farmer['name']}: {farmer['crop'].upper()} Mandi price ₹{advisory['price_data']['current_price']} is BELOW Govt MSP ₹{advisory['price_data']['govt_msp']}. Do not panic sell. Use e-NAM or WDRA warehouse pledge loan. {scheme_text}. Helpline: 1800-180-1551"
    elif advisory["rule_id"] == "R-10":
        sms_text = f"[KRISHI-ALERT] {farmer['name']}: Monsoon delayed {advisory['weather_data']['onset_delay_days']} days. Switch from long cotton to short-duration Bajra/Arhar. Apply for {scheme_text}. Helpline: 1800-180-1551"
    else:
        sms_text = f"[KRISHI-ADVISORY] {farmer['name']}: {advisory['title']['en']}. Stage: {farmer['crop_stage']}. {scheme_text}. For voice advisory call 1800-180-1551."

    return {
        "farmer_id": farmer["id"],
        "farmer_name": farmer["name"],
        "phone_number": farmer.get("phone", "+91-98XXX-XXXXX"),
        "sms_body": sms_text,
        "character_count": len(sms_text),
        "sms_segments": (len(sms_text) // 160) + 1,
        "delivery_status": "DELIVERED",
        "timestamp": "2026-08-26 16:45:00 IST"
    }

# Mount static assets and serve client frontend
if os.path.exists(CLIENT_DIR):
    app.mount("/static", StaticFiles(directory=CLIENT_DIR), name="static")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(os.path.join(CLIENT_DIR, "index.html"))

