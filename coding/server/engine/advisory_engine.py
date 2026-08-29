"""
Module A: Advisory Engine (Python)
Pure agronomy & market intervention logic.
Combines weather, soil, phenological crop stage, CRIDA contingency logic,
and Mandi price vs Govt MSP evaluations.
Supports languages: Odia (or), Hindi (hi), English (en)
"""

from datetime import datetime


def _fmt_date(date_str: str) -> str:
    """Convert YYYY-MM-DD to DD/MM/YYYY for display."""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return d.strftime("%d/%m/%Y")
    except Exception:
        return date_str


def _get_text(rule: dict, lang: str, key: str = "template") -> str:
    """Resolve template/title for the given language, falling back to English."""
    val = rule.get(f"{key}_{lang}", "")
    if not val:
        val = rule.get(f"{key}_en", "")
    return val


def get_advisory(farmer_id: str, data: dict) -> dict:
    """
    Generates plain-language spoken and text advisory for a farmer.
    Language support: Odia (or), Hindi (hi), English (en).
    """
    farmers = data.get("farmers", [])
    districts = data.get("districts", [])
    mandi_prices = data.get("mandi_prices", [])
    daily_rainfall = data.get("daily_rainfall", [])
    advisory_rules = data.get("advisory_rules", [])
    contingency_crops = data.get("contingency_crops", [])

    farmer = next((f for f in farmers if f["id"] == farmer_id), None)
    if not farmer:
        raise ValueError(f"Farmer with id {farmer_id} not found")

    district = next((d for d in districts if d["id"] == farmer["district_id"]), {})
    weather = next((w for w in daily_rainfall if w["district_id"] == farmer["district_id"]), {
        "rainfall_deviation_pct": 0,
        "dry_spell_days": 0,
        "onset_status": "normal",
        "onset_delay_days": 0
    })

    crop_name = farmer.get("crop", "").lower()
    lang = farmer.get("language", "en")

    mandi_price = next(
        (p for p in mandi_prices if p["district_id"] == farmer["district_id"] and p["crop"].lower() == crop_name),
        {
            "price_per_quintal": 0,
            "govt_msp_per_quintal": 0,
            "recent_avg_price": 0,
            "market_name": "District APMC",
            "date": "2026-08-26"
        }
    )

    current_price = mandi_price.get("price_per_quintal", 0)
    govt_msp = mandi_price.get("govt_msp_per_quintal", 0)
    is_below_msp = govt_msp > 0 and current_price < govt_msp

    msp_shortfall_pct = round(((govt_msp - current_price) / govt_msp * 100), 1) if is_below_msp else 0.0
    price_str = f"{current_price:,.0f}"
    msp_str = f"{govt_msp:,.0f}"
    display_date = _fmt_date(mandi_price.get("date", "2026-08-26"))

    def build_price_data():
        return {
            "crop": farmer["crop"],
            "current_price": current_price,
            "govt_msp": govt_msp,
            "is_below_msp": is_below_msp,
            "shortfall_pct": msp_shortfall_pct,
            "market_name": mandi_price.get("market_name", "District APMC"),
            "date": display_date
        }

    def build_weather_data():
        return {
            "rainfall_deviation_pct": weather.get("rainfall_deviation_pct", 0),
            "dry_spell_days": weather.get("dry_spell_days", 0),
            "onset_status": weather.get("onset_status", "normal"),
            "onset_delay_days": weather.get("onset_delay_days", 0)
        }

    # 1. [CRITICAL SPEC] Harvest stage + Price < MSP -> Force Rule R-30
    if farmer.get("crop_stage") == "harvest" and is_below_msp:
        r30 = next((r for r in advisory_rules if r["rule_id"] == "R-30"), {})
        text_en = _get_text(r30, "en").replace("{price}", price_str).replace("{msp}", msp_str)
        text_hi = _get_text(r30, "hi").replace("{price}", price_str).replace("{msp}", msp_str)
        text_or = _get_text(r30, "or").replace("{price}", price_str).replace("{msp}", msp_str)

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-30",
            "action_type": "market_intervention",
            "priority": "CRITICAL",
            "title": {
                "en": _get_text(r30, "en", "title"),
                "hi": _get_text(r30, "hi", "title"),
                "or": _get_text(r30, "or", "title")
            },
            "text": {"en": text_en, "hi": text_hi, "or": text_or},
            "audio_stub_url": f"/audio/advisories/{lang}_R-30.mp3",
            "contingency_crops": [],
            "price_data": build_price_data(),
            "weather_data": build_weather_data()
        }

    # 2. Delayed Onset (>15 days delay) in Sowing Stage -> Contingency Crop Switch (R-10)
    onset_delay = weather.get("onset_delay_days", 0)
    if farmer.get("crop_stage") == "sowing" and (weather.get("onset_status") == "delayed" or onset_delay > 15):
        r10 = next((r for r in advisory_rules if r["rule_id"] == "R-10"), {})
        delay_days = onset_delay if onset_delay > 0 else 20

        text_en = _get_text(r10, "en").replace("{onset_delay_days}", str(delay_days))
        text_hi = _get_text(r10, "hi").replace("{onset_delay_days}", str(delay_days))
        text_or = _get_text(r10, "or").replace("{onset_delay_days}", str(delay_days))

        relevant_contingency = [
            c for c in contingency_crops
            if c.get("crop", "").lower() == crop_name or c.get("soil_type") == district.get("soil_type")
        ]
        contingency_list = relevant_contingency[0].get("recommended_contingency_crops", []) if relevant_contingency else []

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-10",
            "action_type": "contingency_crop_switch",
            "priority": "HIGH",
            "title": {
                "en": _get_text(r10, "en", "title"),
                "hi": _get_text(r10, "hi", "title"),
                "or": _get_text(r10, "or", "title")
            },
            "text": {"en": text_en, "hi": text_hi, "or": text_or},
            "audio_stub_url": f"/audio/advisories/{lang}_R-10.mp3",
            "contingency_crops": contingency_list,
            "price_data": build_price_data(),
            "weather_data": build_weather_data()
        }

    # 3. Paddy Vegetative + Moderate Dry Spell (>= 7 days) -> R-15
    dry_spell = weather.get("dry_spell_days", 0)
    if crop_name == "paddy" and farmer.get("crop_stage") == "vegetative" and dry_spell >= 7:
        r15 = next((r for r in advisory_rules if r["rule_id"] == "R-15"), {})
        text_en = _get_text(r15, "en").replace("{dry_spell_days}", str(dry_spell))
        text_hi = _get_text(r15, "hi").replace("{dry_spell_days}", str(dry_spell))
        text_or = _get_text(r15, "or").replace("{dry_spell_days}", str(dry_spell))

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-15",
            "action_type": "moisture_conservation",
            "priority": "HIGH",
            "title": {
                "en": _get_text(r15, "en", "title"),
                "hi": _get_text(r15, "hi", "title"),
                "or": _get_text(r15, "or", "title")
            },
            "text": {"en": text_en, "hi": text_hi, "or": text_or},
            "audio_stub_url": f"/audio/advisories/{lang}_R-15.mp3",
            "contingency_crops": [],
            "price_data": build_price_data(),
            "weather_data": build_weather_data()
        }

    # 4. Flowering Stage + Severe Dry Spell (>= 12 days) -> R-12
    if farmer.get("crop_stage") == "flowering" and dry_spell >= 12:
        r12 = next((r for r in advisory_rules if r["rule_id"] == "R-12"), {})
        text_en = _get_text(r12, "en").replace("{dry_spell_days}", str(dry_spell))
        text_hi = _get_text(r12, "hi").replace("{dry_spell_days}", str(dry_spell))
        text_or = _get_text(r12, "or").replace("{dry_spell_days}", str(dry_spell))

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-12",
            "action_type": "critical_irrigation_and_claim",
            "priority": "HIGH",
            "title": {
                "en": _get_text(r12, "en", "title"),
                "hi": _get_text(r12, "hi", "title"),
                "or": _get_text(r12, "or", "title")
            },
            "text": {"en": text_en, "hi": text_hi, "or": text_or},
            "audio_stub_url": f"/audio/advisories/{lang}_R-12.mp3",
            "contingency_crops": [],
            "price_data": build_price_data(),
            "weather_data": build_weather_data()
        }

    # 5. Vegetative Stage + Moderate Dry Spell (>= 7 days) -> R-11
    if farmer.get("crop_stage") == "vegetative" and dry_spell >= 7:
        r11 = next((r for r in advisory_rules if r["rule_id"] == "R-11"), {})
        text_en = _get_text(r11, "en").replace("{dry_spell_days}", str(dry_spell))
        text_hi = _get_text(r11, "hi").replace("{dry_spell_days}", str(dry_spell))
        text_or = _get_text(r11, "or").replace("{dry_spell_days}", str(dry_spell))

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-11",
            "action_type": "moisture_conservation",
            "priority": "MEDIUM",
            "title": {
                "en": _get_text(r11, "en", "title"),
                "hi": _get_text(r11, "hi", "title"),
                "or": _get_text(r11, "or", "title")
            },
            "text": {"en": text_en, "hi": text_hi, "or": text_or},
            "audio_stub_url": f"/audio/advisories/{lang}_R-11.mp3",
            "contingency_crops": [],
            "price_data": build_price_data(),
            "weather_data": build_weather_data()
        }

    # 6. Normal / Favorable Conditions -> R-20
    r20 = next((r for r in advisory_rules if r["rule_id"] == "R-20"), {})
    return {
        "farmer_id": farmer["id"],
        "farmer_name": farmer["name"],
        "district_name": district.get("name", farmer["district_id"]),
        "crop": farmer["crop"],
        "crop_stage": farmer["crop_stage"],
        "rule_id": "R-20",
        "action_type": "optimal_management",
        "priority": "NORMAL",
        "title": {
            "en": _get_text(r20, "en", "title") or "Optimal Seasonal Care",
            "hi": _get_text(r20, "hi", "title") or "अनुकूल मौसम सलाह",
            "or": _get_text(r20, "or", "title") or "ଉପଯୁକ୍ତ ଫସଲ ସଂରକ୍ଷଣ"
        },
        "text": {
            "en": _get_text(r20, "en") or f"Crop stage is {farmer.get('crop_stage')}. Maintain balanced nutrition and proactive weed control.",
            "hi": _get_text(r20, "hi") or f"फसल {farmer.get('crop_stage')} अवस्था में है। संतुलित पोषण और समय पर खरपतवार नियंत्रण रखें।",
            "or": _get_text(r20, "or") or f"ଫସଲ {farmer.get('crop_stage')} ଅବସ୍ଥାରେ ଅଛି। ସଠିକ ସାର ଦିଅନ୍ତୁ।"
        },
        "audio_stub_url": f"/audio/advisories/{lang}_R-20.mp3",
        "contingency_crops": [],
        "price_data": build_price_data(),
        "weather_data": build_weather_data()
    }
