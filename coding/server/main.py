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


class FarmerProfileUpdate(BaseModel):
    name: Optional[str] = None
    village: Optional[str] = None
    district_id: Optional[str] = None
    language: Optional[str] = None
    crop: Optional[str] = None
    crop_stage: Optional[str] = None
    landholding_hectares: Optional[float] = None
    irrigation_type: Optional[str] = None
    borewell_failed: Optional[bool] = None
    has_pmfby_insurance: Optional[bool] = None
    has_kcc: Optional[bool] = None
    informal_debt: Optional[bool] = None
    loan_due_date: Optional[str] = None
    loan_amount_inr: Optional[float] = None
    tech_literacy: Optional[str] = None
    device_type: Optional[str] = None
    network_quality: Optional[str] = None


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Smart Krishi Advisory & Farmer Distress Early-Warning System",
        "district": "Sundargarh, Odisha",
        "version": "4.0.0"
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
        },
        "weather_summary": weather,
        "recommended_channel": channel,
        "default_ui_mode": ui_mode
    }


@app.patch("/api/farmers/{farmer_id}")
def update_farmer_profile(farmer_id: str, updates: FarmerProfileUpdate):
    """
    Updates farmer profile in SQLite database (for Farmer Dashboard).
    Instantly returns updated farmer profile, advisory, and distress score.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check farmer exists
    existing = cursor.execute("SELECT * FROM farmers WHERE id = ?", (farmer_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Farmer {farmer_id} not found")

    fields = []
    values = []
    update_dict = updates.model_dump(exclude_unset=True)

    for k, v in update_dict.items():
        if v is not None:
            if isinstance(v, bool):
                v = 1 if v else 0
            fields.append(f"{k} = ?")
            values.append(v)

    if fields:
        values.append(farmer_id)
        query = f"UPDATE farmers SET {', '.join(fields)} WHERE id = ?"
        cursor.execute(query, values)
        conn.commit()

    conn.close()

    # Reload fresh datastore
    data = load_full_datastore()
    updated_farmer = next((f for f in data["farmers"] if f["id"] == farmer_id), None)
    district = next((d for d in data["districts"] if d["id"] == updated_farmer["district_id"]), {})
    advisory = get_advisory(farmer_id, data)
    distress = calculate_distress_score(farmer_id, DEFAULT_WEIGHTS, data)

    return {
        "status": "success",
        "message": f"Farmer profile for {updated_farmer['name']} updated successfully",
        "farmer": {
            **updated_farmer,
            "district_name": district.get("name", updated_farmer["district_id"]),
            "recommended_channel": get_recommended_channel(updated_farmer),
            "default_ui_mode": get_default_ui_mode(updated_farmer)
        },
        "advisory": advisory,
        "distress": distress
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
    """
    data = load_full_datastore()
    custom_weights = weights.model_dump() if weights else DEFAULT_WEIGHTS
    try:
        score_data = calculate_distress_score(farmer_id, custom_weights, data)
        return score_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/officer/farmers")
@app.post("/api/officer/farmers")
def get_officer_farmer_list(weights: Optional[WeightOverride] = None):
    """
    Officer Dashboard Aggregation Endpoint (Automated Decision Support):
    - Computes ICAR-CRIDA 6-dimension distress scores for all farmers in Sundargarh.
    - Determines risk bands, top contributing signals, recommended schemes.
    - Attaches recommended contact channels (In-App / Call/IVR) and field reachability guidance.
    - Sorts descending by distress score for automated triage.
    """
    data = load_full_datastore()
    custom_weights = weights.model_dump() if weights else DEFAULT_WEIGHTS

    scored_farmers = []
    for farmer in data["farmers"]:
        district = next((d for d in data["districts"] if d["id"] == farmer["district_id"]), {})
        channel = get_recommended_channel(farmer)
        score_info = calculate_distress_score(farmer["id"], custom_weights, data)

        # Format loan due date for display
        raw_due_date = farmer.get("loan_due_date", "")
        formatted_due_date = raw_due_date
        try:
            from datetime import datetime
            d = datetime.strptime(raw_due_date, "%Y-%m-%d")
            formatted_due_date = d.strftime("%d/%m/%Y")
        except Exception:
            pass

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
            "language": farmer.get("language", "or"),
            "loan_due_date": formatted_due_date,
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
        
        # Format date as DD/MM/YYYY
        raw_date = p.get("date", "2026-08-26")
        formatted_date = raw_date
        try:
            from datetime import datetime
            d = datetime.strptime(raw_date, "%Y-%m-%d")
            formatted_date = d.strftime("%d/%m/%Y")
        except Exception:
            pass

        result.append({
            **p,
            "date": formatted_date,
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
    Supports Odia (or), Hindi (hi), and English (en).
    """
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    advisory = get_advisory(farmer["id"], data)
    distress = calculate_distress_score(farmer["id"], DEFAULT_WEIGHTS, data)
    lang = farmer.get("language", "or")

    # If no digit pressed, return initial greeting & audio prompt menu
    if not payload.digit_pressed:
        if lang == "or":
            greeting = f"ନମସ୍କାର {farmer['name']} ଚାଷୀ ଭାଇ। ସ୍ମାର୍ଟ କୃଷି ସହାୟତା କେନ୍ଦ୍ରକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।"
            menu_text = "ପାଣିପାଗ ଓ ଫସଲ ସଲାହ ପାଇଁ ୧ ଦବାନ୍ତୁ। ମଣ୍ଡି ଦର ଓ ଏମଏସପି ପାଇଁ ୨ ଦବାନ୍ତୁ। ସରକାରୀ ଯୋଜନା ଓ ଋଣ ସହାୟତା ପାଇଁ ୩ ଦବାନ୍ତୁ।"
        elif lang == "hi":
            greeting = f"नमस्ते {farmer['name']} किसान भाई। स्मार्ट कृषि सलाह एवं सहायता केंद्र में आपका स्वागत है।"
            menu_text = "मौसम एवं फसल सलाह के लिए 1 दबाएं। मंडी भाव एवं समर्थन मूल्य के लिए 2 दबाएं। सरकारी योजनाओं के लिए 3 दबाएं।"
        else:
            greeting = f"Welcome {farmer['name']} to Smart Krishi Advisory Helpline."
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
            if lang == "or":
                text = f"ଧ୍ୟାନ ଦିଅନ୍ତୁ! ଆପଣଙ୍କର {crop} ଫସଲର ମଣ୍ଡି ଦର ₹{pd['current_price']} ଅଛି, କିନ୍ତୁ ସରକାରୀ ଏମଏସପି ₹{pd['govt_msp']} ଅଛି। ଦର ଏମଏସପି ଠାରୁ {pd['shortfall_pct']}% କମ। ବ୍ୟସ୍ତ ହୋଇ ଶସ୍ତାରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। e-NAM ବା APMC ରେ ପଞ୍ଜୀକରଣ କରନ୍ତୁ।"
            elif lang == "hi":
                text = f"ध्यान दें! आपकी {crop} फसल का वर्तमान मंडी भाव ₹{pd['current_price']} है, जबकि सरकारी समर्थन मूल्य ₹{pd['govt_msp']} है। भाव एमएसपी से {pd['shortfall_pct']}% कम है। संकट में न बेचें। ई-नाम या पंजीकृत गोदाम का लाभ लें।"
            else:
                text = f"Attention: Current mandi price for {crop} is ₹{pd['current_price']}, which is below the Government MSP of ₹{pd['govt_msp']} by {pd['shortfall_pct']}%. Do not sell in panic."
        else:
            if lang == "or":
                text = f"ଆପଣଙ୍କର {crop} ଫସଲର ମଣ୍ଡି ଦର ₹{pd['current_price']} ଅଛି, ଯାହା ସରକାରୀ ଏମଏସପି ₹{pd['govt_msp']} ଠାରୁ ଭଲ ଅଛି।"
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
        top_scheme = interventions[0] if interventions else {"scheme_name": "KALIA", "action_item": "Verify enrollment"}
        if lang == "or":
            text = f"ଆପଣଙ୍କ ପାଇଁ ସୁପାରିଶ ଯୋଜନା: {top_scheme['scheme_name']}। ପଦକ୍ଷେପ: {top_scheme['action_item']}। ଅଧିକ ବିବରଣୀ ପାଇଁ ବ୍ଲକ କୃଷି ଅଧିକାରୀଙ୍କୁ ଯୋଗାଯୋଗ କରନ୍ତୁ।"
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
    Simulates sending plain-text SMS alert to farmer in their chosen language.
    """
    data = load_full_datastore()
    farmer = next((f for f in data["farmers"] if f["id"] == payload.farmer_id), None)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    advisory = get_advisory(farmer["id"], data)
    distress = calculate_distress_score(farmer["id"], DEFAULT_WEIGHTS, data)
    lang = farmer.get("language", "or")

    top_scheme = distress["recommended_interventions"][0] if distress["recommended_interventions"] else None
    scheme_text = f"Scheme: {top_scheme['scheme_id']} ({top_scheme['scheme_name'][:30]})" if top_scheme else "Scheme: KALIA/PMFBY"

    if lang == "or":
        if advisory["rule_id"] == "R-30":
            sms_text = f"[କୃଷି ସତର୍କ] {farmer['name']}: {farmer['crop'].upper()} ମଣ୍ଡି ଦର ₹{advisory['price_data']['current_price']} ଏମଏସପି ₹{advisory['price_data']['govt_msp']} ଠାରୁ କମ। ଶସ୍ତାରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। {scheme_text}. ହେଲ୍ପଲାଇନ: 1800-180-1551"
        elif advisory["rule_id"] == "R-10":
            sms_text = f"[କୃଷି ସତର୍କ] {farmer['name']}: ବର୍ଷା {advisory['weather_data']['onset_delay_days']} ଦିନ ବିଳମ୍ବ। ସ୍ୱଳ୍ପ ଅବଧି ଧାନ/ଅରହର ବୁଣନ୍ତୁ। {scheme_text}. ହେଲ୍ପଲାଇନ: 1800-180-1551"
        else:
            sms_text = f"[କୃଷି ସଲାହ] {farmer['name']}: {advisory['title'].get('or', advisory['title']['en'])}. ଅବସ୍ଥା: {farmer['crop_stage']}. {scheme_text}."
    elif lang == "hi":
        if advisory["rule_id"] == "R-30":
            sms_text = f"[कृषि चेतावनी] {farmer['name']}: {farmer['crop'].upper()} मंडी भाव ₹{advisory['price_data']['current_price']} सरकारी MSP ₹{advisory['price_data']['govt_msp']} से कम है। घबराहट में न बेचें। {scheme_text}. हेल्पलाइन: 1800-180-1551"
        elif advisory["rule_id"] == "R-10":
            sms_text = f"[कृषि चेतावनी] {farmer['name']}: मानसून {advisory['weather_data']['onset_delay_days']} दिन विलंबित। कम अवधि वाली फसल चुनें। {scheme_text}. हेल्पलाइन: 1800-180-1551"
        else:
            sms_text = f"[कृषि सलाह] {farmer['name']}: {advisory['title'].get('hi', advisory['title']['en'])}. अवस्था: {farmer['crop_stage']}. {scheme_text}."
    else:
        if advisory["rule_id"] == "R-30":
            sms_text = f"[KRISHI-ALERT] {farmer['name']}: {farmer['crop'].upper()} Mandi price ₹{advisory['price_data']['current_price']} is BELOW Govt MSP ₹{advisory['price_data']['govt_msp']}. Do not panic sell. {scheme_text}. Helpline: 1800-180-1551"
        elif advisory["rule_id"] == "R-10":
            sms_text = f"[KRISHI-ALERT] {farmer['name']}: Monsoon delayed {advisory['weather_data']['onset_delay_days']} days. Switch to short-duration variety. {scheme_text}. Helpline: 1800-180-1551"
        else:
            sms_text = f"[KRISHI-ADVISORY] {farmer['name']}: {advisory['title']['en']}. Stage: {farmer['crop_stage']}. {scheme_text}. Call: 1800-180-1551."

    return {
        "farmer_id": farmer["id"],
        "farmer_name": farmer["name"],
        "language": lang,
        "phone_number": farmer.get("phone", "+91-98XXX-XXXXX"),
        "sms_body": sms_text,
        "character_count": len(sms_text),
        "sms_segments": (len(sms_text) // 160) + 1,
        "delivery_status": "DELIVERED",
        "timestamp": "26/08/2026 16:45 IST"
    }


class SimulationPayload(BaseModel):
    farmer: Optional[Dict[str, Any]] = None
    farmer_id: Optional[str] = "CUSTOM_1"
    rainfall_deviation_pct: Optional[float] = None
    dry_spell_days: Optional[int] = None
    onset_delay_days: Optional[int] = None
    onset_status: Optional[str] = None
    current_mandi_price: Optional[float] = None
    govt_msp: Optional[float] = None
    weights: Optional[Dict[str, float]] = None
    language: Optional[str] = "or"


@app.post("/api/simulator/evaluate")
def evaluate_simulation(payload: SimulationPayload):
    """
    MVP Interactive Sandbox Evaluation:
    Accepts arbitrary farmer attributes and real-time environmental/price overrides.
    Executes the Advisory Engine and ICAR-CRIDA Scorer on the fly, returning full
    diagnostic decision trace, rule checks, mathematical breakdown, and audio texts.
    """
    data = load_full_datastore()

    # Determine farmer record
    farmer_data = payload.farmer or {}
    f_id = payload.farmer_id or farmer_data.get("id", "CUSTOM_1")
    
    district_id = farmer_data.get("district_id", "D1")
    crop = farmer_data.get("crop", "paddy").lower()
    crop_stage = farmer_data.get("crop_stage", "harvest").lower()
    lang = payload.language or farmer_data.get("language", "or")

    # Build active farmer dict with safe defaults
    sim_farmer = {
        "id": f_id,
        "name": farmer_data.get("name", "Demo Farmer"),
        "village": farmer_data.get("village", "Sundargarh"),
        "district_id": district_id,
        "crop": crop,
        "crop_stage": crop_stage,
        "landholding_hectares": float(farmer_data.get("landholding_hectares", 1.0)),
        "irrigation_type": farmer_data.get("irrigation_type", "rainfed"),
        "borewell_failed": bool(farmer_data.get("borewell_failed", False)),
        "has_pmfby_insurance": bool(farmer_data.get("has_pmfby_insurance", False)),
        "has_kcc": bool(farmer_data.get("has_kcc", False)),
        "informal_debt": bool(farmer_data.get("informal_debt", False)),
        "loan_due_date": farmer_data.get("loan_due_date", "10/09/2026"),
        "loan_amount_inr": float(farmer_data.get("loan_amount_inr", 45000)),
        "enrolled_schemes": farmer_data.get("enrolled_schemes", []),
        "income_sources": farmer_data.get("income_sources", ["crop_cultivation"]),
        "device_type": farmer_data.get("device_type", "feature_phone"),
        "network_quality": farmer_data.get("network_quality", "2G"),
        "tech_literacy": farmer_data.get("tech_literacy", "low"),
        "language": lang
    }

    # Insert or update in data["farmers"]
    existing_idx = next((i for i, f in enumerate(data["farmers"]) if f["id"] == f_id), None)
    if existing_idx is not None:
        data["farmers"][existing_idx] = sim_farmer
    else:
        data["farmers"].append(sim_farmer)

    # Apply weather overrides
    w_idx = next((i for i, w in enumerate(data["daily_rainfall"]) if w["district_id"] == district_id), None)
    if w_idx is not None:
        if payload.rainfall_deviation_pct is not None:
            data["daily_rainfall"][w_idx]["rainfall_deviation_pct"] = payload.rainfall_deviation_pct
        if payload.dry_spell_days is not None:
            data["daily_rainfall"][w_idx]["dry_spell_days"] = payload.dry_spell_days
        if payload.onset_delay_days is not None:
            data["daily_rainfall"][w_idx]["onset_delay_days"] = payload.onset_delay_days
        if payload.onset_status is not None:
            data["daily_rainfall"][w_idx]["onset_status"] = payload.onset_status

    # Apply mandi price overrides
    p_idx = next((i for i, p in enumerate(data["mandi_prices"]) if p["district_id"] == district_id and p["crop"].lower() == crop), None)
    if p_idx is not None:
        if payload.current_mandi_price is not None:
            data["mandi_prices"][p_idx]["current_price"] = payload.current_mandi_price
        if payload.govt_msp is not None:
            data["mandi_prices"][p_idx]["govt_msp"] = payload.govt_msp
    elif payload.current_mandi_price is not None or payload.govt_msp is not None:
        data["mandi_prices"].append({
            "id": f"P_SIM_{district_id}_{crop}",
            "district_id": district_id,
            "market_name": f"{district_id} Mandi",
            "crop": crop,
            "current_price": payload.current_mandi_price or 2000,
            "govt_msp": payload.govt_msp or 2300,
            "recent_30day_avg": 2100,
            "date": "26/08/2026"
        })

    # Run Advisory Engine & Distress Scorer
    advisory = get_advisory(f_id, data)
    weights = payload.weights or DEFAULT_WEIGHTS
    distress = calculate_distress_score(f_id, weights, data)

    # Generate Rule Decision Trace
    weather = next((w for w in data["daily_rainfall"] if w["district_id"] == district_id), {})
    price_info = next((p for p in data["mandi_prices"] if p["district_id"] == district_id and p["crop"].lower() == crop), {
        "current_price": payload.current_mandi_price or 0,
        "govt_msp": payload.govt_msp or 0
    })

    cur_price = price_info.get("current_price", 0)
    msp_price = price_info.get("govt_msp", 0)
    is_below_msp = cur_price < msp_price if msp_price > 0 else False
    onset_delay = weather.get("onset_delay_days", 0)
    dry_spell = weather.get("dry_spell_days", 0)

    decision_trace = [
        {
            "rule_id": "R-30",
            "name": "Market Distress Override (MSP Floor Price Protection)",
            "priority": 1,
            "conditions": [
                { "criterion": "Crop Stage == 'harvest'", "expected": "harvest", "actual": crop_stage, "met": crop_stage == "harvest" },
                { "criterion": "Current Mandi Price < Govt MSP", "expected": f"< ₹{msp_price}", "actual": f"₹{cur_price}", "met": is_below_msp }
            ],
            "outcome": "FIRED (TRIGGERED)" if advisory["rule_id"] == "R-30" else "SKIPPED"
        },
        {
            "rule_id": "R-10",
            "name": "CRIDA Contingency Crop Switch (Delayed Monsoon)",
            "priority": 2,
            "conditions": [
                { "criterion": "Crop Stage == 'sowing'", "expected": "sowing", "actual": crop_stage, "met": crop_stage == "sowing" },
                { "criterion": "Monsoon Onset Delay > 15 days", "expected": "> 15 days", "actual": f"{onset_delay} days", "met": onset_delay > 15 }
            ],
            "outcome": "FIRED (TRIGGERED)" if advisory["rule_id"] == "R-10" else "SKIPPED"
        },
        {
            "rule_id": "R-15",
            "name": "Dry Spell Agronomic Moisture Stress Management",
            "priority": 3,
            "conditions": [
                { "criterion": "Crop Stage == 'vegetative'", "expected": "vegetative", "actual": crop_stage, "met": crop_stage == "vegetative" },
                { "criterion": "Consecutive Dry Spell Days >= 7", "expected": ">= 7 days", "actual": f"{dry_spell} days", "met": dry_spell >= 7 }
            ],
            "outcome": "FIRED (TRIGGERED)" if advisory["rule_id"] == "R-15" else "SKIPPED"
        },
        {
            "rule_id": "R-20",
            "name": "Standard Phenological Stage Best Practices",
            "priority": 4,
            "conditions": [
                { "criterion": "Default Fallback when no stress triggered", "expected": "Normal", "actual": "Normal", "met": True }
            ],
            "outcome": "FIRED (TRIGGERED)" if advisory["rule_id"] == "R-20" else "SKIPPED"
        }
    ]

    # Generate localized SMS
    top_scheme = distress["recommended_interventions"][0] if distress.get("recommended_interventions") else None
    scheme_str = f"Scheme: {top_scheme['scheme_id']} ({top_scheme['scheme_name'][:25]})" if top_scheme else "Scheme: KALIA/PMFBY"

    if lang == "or":
        if advisory["rule_id"] == "R-30":
            sms_text = f"[କୃଷି ସତର୍କ] {sim_farmer['name']}: {crop.upper()} ମଣ୍ଡି ଦର ₹{cur_price} ଏମଏସପି ₹{msp_price} ଠାରୁ କମ। ଶସ୍ତାରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। {scheme_str}. ହେଲ୍ପ: 1800-180-1551"
        elif advisory["rule_id"] == "R-10":
            sms_text = f"[କୃଷି ସତର୍କ] {sim_farmer['name']}: ବର୍ଷା {onset_delay} ଦିନ ବିଳମ୍ବ। ସ୍ୱଳ୍ପ ଅବଧି ଫସଲ ବୁଣନ୍ତୁ। {scheme_str}. ହେଲ୍ପ: 1800-180-1551"
        else:
            sms_text = f"[କୃଷି ସଲାହ] {sim_farmer['name']}: {advisory['title'].get('or', advisory['title']['en'])}. ଅବସ୍ଥା: {crop_stage}. {scheme_str}."
    elif lang == "hi":
        if advisory["rule_id"] == "R-30":
            sms_text = f"[कृषि चेतावनी] {sim_farmer['name']}: {crop.upper()} मंडी भाव ₹{cur_price} सरकारी MSP ₹{msp_price} से कम है। संकट में न बेचें। {scheme_str}. हेल्प: 1800-180-1551"
        elif advisory["rule_id"] == "R-10":
            sms_text = f"[कृषि चेतावनी] {sim_farmer['name']}: मानसून {onset_delay} दिन विलंबित। कम अवधि वाली फसल चुनें। {scheme_str}. हेल्प: 1800-180-1551"
        else:
            sms_text = f"[कृषि सलाह] {sim_farmer['name']}: {advisory['title'].get('hi', advisory['title']['en'])}. अवस्था: {crop_stage}. {scheme_str}."
    else:
        if advisory["rule_id"] == "R-30":
            sms_text = f"[KRISHI-ALERT] {sim_farmer['name']}: {crop.upper()} Mandi price ₹{cur_price} is BELOW Govt MSP ₹{msp_price}. Do not panic sell. {scheme_str}. Helpline: 1800-180-1551"
        elif advisory["rule_id"] == "R-10":
            sms_text = f"[KRISHI-ALERT] {sim_farmer['name']}: Monsoon delayed {onset_delay} days. Switch to short-duration variety. {scheme_str}. Helpline: 1800-180-1551"
        else:
            sms_text = f"[KRISHI-ADVISORY] {sim_farmer['name']}: {advisory['title']['en']}. Stage: {crop_stage}. {scheme_str}."

    return {
        "status": "success",
        "inputs_received": {
            "farmer": sim_farmer,
            "weather_used": weather,
            "price_used": price_info,
            "language": lang
        },
        "advisory": advisory,
        "distress": distress,
        "decision_trace": decision_trace,
        "sms_preview": {
            "text": sms_text,
            "char_count": len(sms_text),
            "units": (len(sms_text) // 160) + 1
        }
    }


# Mount static assets and serve client frontend
if os.path.exists(CLIENT_DIR):
    app.mount("/static", StaticFiles(directory=CLIENT_DIR), name="static")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(os.path.join(CLIENT_DIR, "index.html"))

