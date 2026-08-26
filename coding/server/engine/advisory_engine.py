"""
Module A: Advisory Engine (Python)
Pure agronomy & market intervention logic.
Combines weather, soil, phenological crop stage, CRIDA contingency logic,
and Mandi price vs Govt MSP evaluations.
"""

def get_advisory(farmer_id: str, data: dict) -> dict:
    """
    Generates plain-language spoken and text advisory for a farmer.
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
    mandi_price = next(
        (p for p in mandi_prices if p["district_id"] == farmer["district_id"] and p["crop"].lower() == crop_name),
        {
            "price_per_quintal": 0,
            "govt_msp_per_quintal": 0,
            "market_name": "Local APMC",
            "date": "2026-08-25"
        }
    )

    current_price = mandi_price.get("price_per_quintal", 0)
    govt_msp = mandi_price.get("govt_msp_per_quintal", 0)
    is_below_msp = govt_msp > 0 and current_price < govt_msp

    msp_shortfall_pct = round(((govt_msp - current_price) / govt_msp * 100), 1) if is_below_msp else 0.0

    # 1. [CRITICAL SPEC] Harvest stage + Price < MSP:
    # Force action_type = 'market_intervention' and prioritize Rule R-30
    if farmer.get("crop_stage") == "harvest" and is_below_msp:
        r30 = next((r for r in advisory_rules if r["rule_id"] == "R-30"), {})
        price_str = f"{current_price:,}"
        msp_str = f"{govt_msp:,}"

        text_en = (r30.get("template_en", "")).replace("{price}", price_str).replace("{msp}", msp_str)
        text_hi = (r30.get("template_hi", "")).replace("{price}", price_str).replace("{msp}", msp_str)
        text_mr = (r30.get("template_mr", "")).replace("{price}", price_str).replace("{msp}", msp_str)

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
                "en": r30.get("title_en", "Market Distress Alert: Price Below MSP"),
                "hi": r30.get("title_hi", "बाजार संकट चेतावनी: एमएसपी से कम भाव"),
                "mr": r30.get("title_mr", "बाजार भाव इशारा: हमीभावापेक्षा कमी भाव")
            },
            "text": {
                "en": text_en,
                "hi": text_hi,
                "mr": text_mr
            },
            "audio_stub_url": f"/audio/advisories/{farmer.get('language', 'hi')}_R-30.mp3",
            "contingency_crops": [],
            "price_data": {
                "crop": farmer["crop"],
                "current_price": current_price,
                "govt_msp": govt_msp,
                "is_below_msp": True,
                "shortfall_pct": msp_shortfall_pct,
                "market_name": mandi_price.get("market_name", "District APMC"),
                "date": mandi_price.get("date", "2026-08-25")
            },
            "weather_data": {
                "rainfall_deviation_pct": weather.get("rainfall_deviation_pct", 0),
                "dry_spell_days": weather.get("dry_spell_days", 0),
                "onset_status": weather.get("onset_status", "normal"),
                "onset_delay_days": weather.get("onset_delay_days", 0)
            }
        }

    # 2. Delayed Onset (>15 days delay) in Sowing Stage -> Contingency Crop Switch (R-10)
    onset_delay = weather.get("onset_delay_days", 0)
    if farmer.get("crop_stage") == "sowing" and (weather.get("onset_status") == "delayed" or onset_delay > 15):
        r10 = next((r for r in advisory_rules if r["rule_id"] == "R-10"), {})
        delay_days = onset_delay if onset_delay > 0 else 20

        text_en = (r10.get("template_en", "")).replace("{onset_delay_days}", str(delay_days))
        text_hi = (r10.get("template_hi", "")).replace("{onset_delay_days}", str(delay_days))
        text_mr = (r10.get("template_mr", "")).replace("{onset_delay_days}", str(delay_days))

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
                "en": r10.get("title_en", "CRIDA Contingency: Delayed Monsoon Onset"),
                "hi": r10.get("title_hi", "क्रीडा आकस्मिक सलाह: मानसून विलंब"),
                "mr": r10.get("title_mr", "आपत्कालीन सल्ला: मान्सून उशीर")
            },
            "text": {
                "en": text_en,
                "hi": text_hi,
                "mr": text_mr
            },
            "audio_stub_url": f"/audio/advisories/{farmer.get('language', 'mr')}_R-10.mp3",
            "contingency_crops": contingency_list,
            "price_data": {
                "crop": farmer["crop"],
                "current_price": current_price,
                "govt_msp": govt_msp,
                "is_below_msp": is_below_msp,
                "shortfall_pct": msp_shortfall_pct,
                "market_name": mandi_price.get("market_name", "District APMC"),
                "date": mandi_price.get("date", "2026-08-25")
            },
            "weather_data": {
                "rainfall_deviation_pct": weather.get("rainfall_deviation_pct", 0),
                "dry_spell_days": weather.get("dry_spell_days", 0),
                "onset_status": weather.get("onset_status", "delayed"),
                "onset_delay_days": weather.get("onset_delay_days", 0)
            }
        }

    # 3. Flowering Stage + Severe Dry Spell (>= 12 days) -> R-12
    dry_spell = weather.get("dry_spell_days", 0)
    if farmer.get("crop_stage") == "flowering" and dry_spell >= 12:
        r12 = next((r for r in advisory_rules if r["rule_id"] == "R-12"), {})
        text_en = (r12.get("template_en", "")).replace("{dry_spell_days}", str(dry_spell))
        text_hi = (r12.get("template_hi", "")).replace("{dry_spell_days}", str(dry_spell))
        text_mr = (r12.get("template_mr", "")).replace("{dry_spell_days}", str(dry_spell))

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
                "en": r12.get("title_en"),
                "hi": r12.get("title_hi"),
                "mr": r12.get("title_mr")
            },
            "text": { "en": text_en, "hi": text_hi, "mr": text_mr },
            "audio_stub_url": f"/audio/advisories/{farmer.get('language', 'mr')}_R-12.mp3",
            "contingency_crops": [],
            "price_data": {
                "crop": farmer["crop"],
                "current_price": current_price,
                "govt_msp": govt_msp,
                "is_below_msp": is_below_msp,
                "shortfall_pct": msp_shortfall_pct,
                "market_name": mandi_price.get("market_name", "District APMC"),
                "date": mandi_price.get("date", "2026-08-25")
            },
            "weather_data": {
                "rainfall_deviation_pct": weather.get("rainfall_deviation_pct", 0),
                "dry_spell_days": weather.get("dry_spell_days", 0),
                "onset_status": weather.get("onset_status", "normal"),
                "onset_delay_days": weather.get("onset_delay_days", 0)
            }
        }

    # 4. Vegetative Stage + Moderate Dry Spell (>= 7 days) -> R-11
    if farmer.get("crop_stage") == "vegetative" and dry_spell >= 7:
        r11 = next((r for r in advisory_rules if r["rule_id"] == "R-11"), {})
        text_en = (r11.get("template_en", "")).replace("{dry_spell_days}", str(dry_spell))
        text_hi = (r11.get("template_hi", "")).replace("{dry_spell_days}", str(dry_spell))
        text_mr = (r11.get("template_mr", "")).replace("{dry_spell_days}", str(dry_spell))

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
                "en": r11.get("title_en"),
                "hi": r11.get("title_hi"),
                "mr": r11.get("title_mr")
            },
            "text": { "en": text_en, "hi": text_hi, "mr": text_mr },
            "audio_stub_url": f"/audio/advisories/{farmer.get('language', 'hi')}_R-11.mp3",
            "contingency_crops": [],
            "price_data": {
                "crop": farmer["crop"],
                "current_price": current_price,
                "govt_msp": govt_msp,
                "is_below_msp": is_below_msp,
                "shortfall_pct": msp_shortfall_pct,
                "market_name": mandi_price.get("market_name", "District APMC"),
                "date": mandi_price.get("date", "2026-08-25")
            },
            "weather_data": {
                "rainfall_deviation_pct": weather.get("rainfall_deviation_pct", 0),
                "dry_spell_days": weather.get("dry_spell_days", 0),
                "onset_status": weather.get("onset_status", "normal"),
                "onset_delay_days": weather.get("onset_delay_days", 0)
            }
        }

    # 5. Normal / Favorable Conditions -> R-20
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
            "en": r20.get("title_en", "Optimal Seasonal Care"),
            "hi": r20.get("title_hi", "अनुकूल मौसम सलाह"),
            "mr": r20.get("title_mr", "उत्तम हवामान सल्ला")
        },
        "text": {
            "en": r20.get("template_en", f"Crop stage is {farmer.get('crop_stage')}. Maintain balanced nutrition and proactive weed control."),
            "hi": r20.get("template_hi", f"फसल {farmer.get('crop_stage')} अवस्था में है। संतुलित पोषण और समय पर खरपतवार नियंत्रण रखें।"),
            "mr": r20.get("template_mr", f"पीक {farmer.get('crop_stage')} अवस्थेत आहे. योग्य खत व्यवस्थापन आणि आंतरमशागत करा.")
        },
        "audio_stub_url": f"/audio/advisories/{farmer.get('language', 'mr')}_R-20.mp3",
        "contingency_crops": [],
        "price_data": {
            "crop": farmer["crop"],
            "current_price": current_price,
            "govt_msp": govt_msp,
            "is_below_msp": is_below_msp,
            "shortfall_pct": msp_shortfall_pct,
            "market_name": mandi_price.get("market_name", "District APMC"),
            "date": mandi_price.get("date", "2026-08-25")
        },
        "weather_data": {
            "rainfall_deviation_pct": weather.get("rainfall_deviation_pct", 0),
            "dry_spell_days": weather.get("dry_spell_days", 0),
            "onset_status": weather.get("onset_status", "normal"),
            "onset_delay_days": weather.get("onset_delay_days", 0)
        }
    }
