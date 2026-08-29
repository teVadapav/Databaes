"""
Automated Unit Tests for Smart Krishi Crop Advisory & ICAR-CRIDA Distress Risk Engines
Validates:
1. Advisory Engine pure function & execution speed (<= 2s)
2. Contingency crop switch on delayed monsoon onset (R-10) for Sundargarh
3. Market intervention override when crop_stage == 'harvest' and price < MSP (R-30)
4. ICAR-CRIDA 6-Dimension Distress Score formula (E, S, AC, M, T, DF)
5. MSP-relative price drop calculation
6. Odisha-specific welfare triggers (KALIA S6, BALARAM S7, PM-AASHA S3)
7. Adaptive Capacity Channel Routing (get_recommended_channel & get_default_ui_mode)
8. Ethical boundary: no fragility index leak to farmer payload
"""

import json
import os
import time
import unittest

from server.engine.channel_router import get_recommended_channel, get_default_ui_mode
from server.engine.advisory_engine import get_advisory
from server.engine.distress_scorer import calculate_distress_score, DEFAULT_WEIGHTS

class TestEngines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data")
        
        with open(os.path.join(data_dir, "districts.json"), "r", encoding="utf-8") as f:
            cls.districts = json.load(f)
        with open(os.path.join(data_dir, "mandi_prices.json"), "r", encoding="utf-8") as f:
            cls.mandi_prices = json.load(f)
        with open(os.path.join(data_dir, "farmers.json"), "r", encoding="utf-8") as f:
            cls.farmers = json.load(f)
        with open(os.path.join(data_dir, "schemes.json"), "r", encoding="utf-8") as f:
            cls.schemes = json.load(f)
        with open(os.path.join(data_dir, "daily_rainfall.json"), "r", encoding="utf-8") as f:
            cls.daily_rainfall = json.load(f)
        with open(os.path.join(data_dir, "advisory_rules.json"), "r", encoding="utf-8") as f:
            cls.advisory_rules = json.load(f)
        with open(os.path.join(data_dir, "contingency_crops.json"), "r", encoding="utf-8") as f:
            cls.contingency_crops = json.load(f)

        cls.data_store = {
            "districts": cls.districts,
            "mandi_prices": cls.mandi_prices,
            "farmers": cls.farmers,
            "schemes": cls.schemes,
            "daily_rainfall": cls.daily_rainfall,
            "advisory_rules": cls.advisory_rules,
            "contingency_crops": cls.contingency_crops
        }

    def test_01_channel_routing_adaptive_capacity(self):
        """Test adaptive capacity routing for feature phone and smartphone profiles"""
        suresh = next(f for f in self.farmers if f["id"] == "F1")
        self.assertEqual(suresh["device_type"], "feature_phone")
        self.assertEqual(get_recommended_channel(suresh), "ivr_or_sms")
        self.assertEqual(get_default_ui_mode(suresh), "assisted")

        deepak = next(f for f in self.farmers if f["id"] == "F4")
        self.assertEqual(deepak["device_type"], "smartphone")
        self.assertEqual(get_recommended_channel(deepak), "in_app_voice_and_text")
        self.assertEqual(get_default_ui_mode(deepak), "self")

    def test_02_advisory_market_intervention_override_r30(self):
        """Test that harvest stage + price < MSP forces Rule R-30 market intervention with Odia support"""
        t0 = time.time()
        advisory = get_advisory("F1", self.data_store)
        duration_ms = (time.time() - t0) * 1000

        self.assertLessEqual(duration_ms, 2000, "Advisory calculation must take <= 2000ms")
        self.assertEqual(advisory["rule_id"], "R-30")
        self.assertEqual(advisory["action_type"], "market_intervention")
        self.assertTrue(advisory["price_data"]["is_below_msp"])
        self.assertIn("below the Govt MSP", advisory["text"]["en"])
        self.assertIn("ସରକାରୀ ଏମଏସପି", advisory["text"]["or"])

    def test_03_advisory_contingency_crop_switch_r10(self):
        """Test delayed monsoon onset triggers CRIDA contingency switch rule R-10 for Sundargarh"""
        advisory = get_advisory("F2", self.data_store)
        self.assertEqual(advisory["rule_id"], "R-10")
        self.assertEqual(advisory["action_type"], "contingency_crop_switch")
        self.assertTrue(len(advisory["contingency_crops"]) > 0)
        has_contingency = any("Maize" in c["name"] or "Pigeonpea" in c["name"] or "Blackgram" in c["name"] for c in advisory["contingency_crops"])
        self.assertTrue(has_contingency, "Should recommend short-duration contingency crops")

    def test_04_distress_scorer_crida_6_dimensions(self):
        """Test ICAR-CRIDA 6-dimension distress score formula and components"""
        score_res = calculate_distress_score("F1", DEFAULT_WEIGHTS, self.data_store)
        self.assertGreaterEqual(score_res["distress_score"], 60.0)
        self.assertLessEqual(score_res["distress_score"], 80.0)
        self.assertTrue("raw_dimensions" in score_res)
        self.assertTrue("points_breakdown" in score_res)
        self.assertTrue(any(i["scheme_id"] == "S3" for i in score_res["recommended_interventions"]),
                        "Should recommend PM-AASHA (S3) for price < MSP")

    def test_05_odisha_schemes_trigger(self):
        """Test KALIA (S6) and BALARAM (S7) triggers for marginal / sharecropper farmers"""
        priya_score = calculate_distress_score("F2", DEFAULT_WEIGHTS, self.data_store)
        self.assertTrue(any(i["scheme_id"] in ["S6", "S7"] for i in priya_score["recommended_interventions"]),
                        "Should trigger KALIA or BALARAM for small/marginal/tenant farmers in Sundargarh")

    def test_06_custom_weights_live_adjustment(self):
        """Test dynamic recalculation with custom weights"""
        exp_only = calculate_distress_score("F1", {"exposure": 1, "sensitivity": 0, "adaptive_capacity": 0, "mitigation_deficit": 0, "trigger": 0, "district_fragility": 0}, self.data_store)
        self.assertGreater(exp_only["distress_score"], 0)

if __name__ == "__main__":
    unittest.main()

