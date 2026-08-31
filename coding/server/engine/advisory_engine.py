"""
Module A: Advisory Engine (Python)
Pure agronomy & market intervention logic.
Combines weather, soil, phenological crop stage, CRIDA contingency logic,
and Mandi price vs Govt MSP evaluations.
"""

def format_rule_i18n(rule: dict, replacements: dict) -> tuple:
    languages = ['en', 'hi', 'mr', 'or', 'as', 'kn']
    titles = {}
    texts = {}
    for lang in languages:
        title = rule.get(f"title_{lang}") or rule.get("title_en", "")
        template = rule.get(f"template_{lang}") or rule.get("template_en", "")
        for k, v in replacements.items():
            template = template.replace(f"{{{k}}}", str(v))
        titles[lang] = title
        texts[lang] = template
    return titles, texts

def get_advisory(farmer_id: str, data: dict) -> dict:
    """
    Generates plain-language spoken and text advisory for a farmer across all supported languages.
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
    weather = dict(next((w for w in daily_rainfall if w["district_id"] == farmer["district_id"]), {
        "rainfall_deviation_pct": 0,
        "dry_spell_days": 0,
        "onset_status": "normal",
        "onset_delay_days": 0
    }))

    # Hyperspecific Block Match for Sundargarh / Micro-climate data
    sundargarh_blocks = data.get("sundargarh_blocks", [])
    matched_block = None
    farmer_village = (farmer.get("village") or "").lower()
    if farmer.get("district_id") == "D_OD_SUN" or "sundargarh" in district.get("name", "").lower():
        matched_block = next((b for b in sundargarh_blocks if b["block_name"].lower() in farmer_village or farmer_village in b["block_name"].lower()), None)
        if not matched_block and sundargarh_blocks:
            matched_block = sundargarh_blocks[0]
    
    if matched_block:
        weather["rainfall_deviation_pct"] = matched_block.get("rainfall_deviation_pct", weather.get("rainfall_deviation_pct", 0))
        weather["dry_spell_days"] = matched_block.get("consecutive_dry_days", weather.get("dry_spell_days", 0))
        weather["flood_hazard_risk"] = matched_block.get("flood_hazard_risk", "Low")
        weather["mean_summer_lst_c"] = matched_block.get("mean_summer_lst_c", 40.0)
        weather["ndms_alert_category"] = matched_block.get("ndms_alert_category", "Green (Normal)")
        weather["block_name"] = matched_block.get("block_name")

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
        titles, texts = format_rule_i18n(r30, {"price": price_str, "msp": msp_str})

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "block_name": weather.get("block_name"),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-30",
            "action_type": "market_intervention",
            "priority": "CRITICAL",
            "title": titles,
            "text": texts,
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
                "flood_hazard_risk": weather.get("flood_hazard_risk", "Low"),
                "mean_summer_lst_c": weather.get("mean_summer_lst_c"),
                "ndms_alert_category": weather.get("ndms_alert_category"),
                "onset_status": weather.get("onset_status", "normal"),
                "onset_delay_days": weather.get("onset_delay_days", 0)
            }
        }

    # 2. Delayed Onset (>15 days delay) in Sowing Stage -> Contingency Crop Switch (R-10)
    onset_delay = weather.get("onset_delay_days", 0)
    if farmer.get("crop_stage") == "sowing" and (weather.get("onset_status") == "delayed" or onset_delay > 15):
        r10 = next((r for r in advisory_rules if r["rule_id"] == "R-10"), {})
        delay_days = onset_delay if onset_delay > 0 else 20
        titles, texts = format_rule_i18n(r10, {"onset_delay_days": delay_days})

        relevant_contingency = [
            c for c in contingency_crops
            if c.get("crop", "").lower() == crop_name or c.get("soil_type") == district.get("soil_type")
        ]
        contingency_list = relevant_contingency[0].get("recommended_contingency_crops", []) if relevant_contingency else []

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "block_name": weather.get("block_name"),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-10",
            "action_type": "contingency_crop_switch",
            "priority": "HIGH",
            "title": titles,
            "text": texts,
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
                "flood_hazard_risk": weather.get("flood_hazard_risk", "Low"),
                "mean_summer_lst_c": weather.get("mean_summer_lst_c"),
                "ndms_alert_category": weather.get("ndms_alert_category"),
                "onset_status": weather.get("onset_status", "delayed"),
                "onset_delay_days": weather.get("onset_delay_days", 0)
            }
        }

    # 3. High Flood Hazard / Inundation Risk in Riverine Blocks -> R-OD-02
    flood_risk = weather.get("flood_hazard_risk", "Low")
    if flood_risk == "High" or weather.get("rainfall_deviation_pct", 0) >= 10.0:
        r_od2 = next((r for r in advisory_rules if r["rule_id"] == "R-OD-02"), None)
        if r_od2:
            titles, texts = format_rule_i18n(r_od2, {})
            relevant_contingency = [c for c in contingency_crops if c.get("crop", "").lower() == "paddy" and c.get("soil_type") == "Red & Yellow"]
            contingency_list = relevant_contingency[0].get("recommended_contingency_crops", []) if relevant_contingency else []
            return {
                "farmer_id": farmer["id"],
                "farmer_name": farmer["name"],
                "district_name": district.get("name", farmer["district_id"]),
                "block_name": weather.get("block_name"),
                "crop": farmer["crop"],
                "crop_stage": farmer["crop_stage"],
                "rule_id": "R-OD-02",
                "action_type": "flood_drainage_and_swarna_sub1",
                "priority": "CRITICAL" if flood_risk == "High" else "HIGH",
                "title": titles,
                "text": texts,
                "audio_stub_url": f"/audio/advisories/{farmer.get('language', 'or')}_R-OD-02.mp3",
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
                    "flood_hazard_risk": flood_risk,
                    "mean_summer_lst_c": weather.get("mean_summer_lst_c"),
                    "ndms_alert_category": weather.get("ndms_alert_category"),
                    "onset_status": weather.get("onset_status", "normal"),
                    "onset_delay_days": weather.get("onset_delay_days", 0)
                }
            }

    # 4. Severe Dry Spell / High CDD (>= 18 days) in Red & Yellow soil -> R-OD-01
    dry_spell = weather.get("dry_spell_days", 0)
    soil_type = district.get("soil_type", "")
    if dry_spell >= 18 and ("red" in soil_type.lower() or matched_block is not None):
        r_od1 = next((r for r in advisory_rules if r["rule_id"] == "R-OD-01"), None)
        if r_od1:
            titles, texts = format_rule_i18n(r_od1, {"dry_spell_days": dry_spell})
            return {
                "farmer_id": farmer["id"],
                "farmer_name": farmer["name"],
                "district_name": district.get("name", farmer["district_id"]),
                "block_name": weather.get("block_name"),
                "crop": farmer["crop"],
                "crop_stage": farmer["crop_stage"],
                "rule_id": "R-OD-01",
                "action_type": "moisture_conservation_and_chahata",
                "priority": "HIGH",
                "title": titles,
                "text": texts,
                "audio_stub_url": f"/audio/advisories/{farmer.get('language', 'or')}_R-OD-01.mp3",
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
                    "dry_spell_days": dry_spell,
                    "flood_hazard_risk": weather.get("flood_hazard_risk", "Low"),
                    "mean_summer_lst_c": weather.get("mean_summer_lst_c"),
                    "ndms_alert_category": weather.get("ndms_alert_category"),
                    "onset_status": weather.get("onset_status", "normal"),
                    "onset_delay_days": weather.get("onset_delay_days", 0)
                }
            }

    # 3. Flowering Stage + Severe Dry Spell (>= 12 days) or Borewell Failure -> R-12
    dry_spell = weather.get("dry_spell_days", 0)
    borewell_failed = bool(farmer.get("borewell_failed", False))

    if farmer.get("crop_stage") == "flowering" and (dry_spell >= 12 or borewell_failed):
        r12 = next((r for r in advisory_rules if r["rule_id"] == "R-12"), {})
        display_days = dry_spell if dry_spell > 0 else (14 if borewell_failed else 12)
        titles, texts = format_rule_i18n(r12, {"dry_spell_days": display_days})

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-12",
            "action_type": "critical_irrigation_and_claim",
            "priority": "HIGH",
            "title": titles,
            "text": texts,
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

    # 4. Vegetative / Growing Stage + Dry Spell (>= 7 days) or Borewell Failure -> R-11
    if (dry_spell >= 7 or borewell_failed) and farmer.get("crop_stage") != "harvest":
        r11 = next((r for r in advisory_rules if r["rule_id"] == "R-11"), {})
        display_days = dry_spell if dry_spell > 0 else (8 if borewell_failed else 7)
        titles, texts = format_rule_i18n(r11, {"dry_spell_days": display_days})

        return {
            "farmer_id": farmer["id"],
            "farmer_name": farmer["name"],
            "district_name": district.get("name", farmer["district_id"]),
            "crop": farmer["crop"],
            "crop_stage": farmer["crop_stage"],
            "rule_id": "R-11",
            "action_type": "moisture_conservation",
            "priority": "MEDIUM",
            "title": titles,
            "text": texts,
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
    titles, texts = format_rule_i18n(r20, {})
    return {
        "farmer_id": farmer["id"],
        "farmer_name": farmer["name"],
        "district_name": district.get("name", farmer["district_id"]),
        "crop": farmer["crop"],
        "crop_stage": farmer["crop_stage"],
        "rule_id": "R-20",
        "action_type": "optimal_management",
        "priority": "NORMAL",
        "title": titles,
        "text": texts,
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
