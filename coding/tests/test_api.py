"""
API Integration Tests for FastAPI Backend
"""

import json
import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from server.main import app

class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")

    def test_02_get_farmers(self):
        resp = self.client.get("/api/farmers")
        self.assertEqual(resp.status_code, 200)
        farmers = resp.json()
        self.assertGreaterEqual(len(farmers), 5)
        # Check channel and default UI mode attached
        ramesh = next(f for f in farmers if f["id"] == "F1")
        self.assertEqual(ramesh["recommended_channel"], "ivr_or_sms")
        self.assertEqual(ramesh["default_ui_mode"], "assisted")

    def test_03_farmer_advisory_endpoint(self):
        # Ramesh F1: Harvest stage onion price < MSP
        resp = self.client.get("/api/farmers/F1/advisory")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["rule_id"], "R-30")
        self.assertEqual(data["action_type"], "market_intervention")
        self.assertTrue(data["price_data"]["is_below_msp"])

    def test_04_officer_farmers_endpoint(self):
        resp = self.client.post("/api/officer/farmers", json={"rainfall": 0.35, "price": 0.30, "loan": 0.20, "vulnerability": 0.15})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue("farmers" in data)
        self.assertTrue("metrics" in data)
        # Verify ranking order (descending distress score)
        scores = [f["distress_score"] for f in data["farmers"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_05_ivr_simulation(self):
        # Initial call
        resp = self.client.post("/api/simulate/ivr", json={"farmer_id": "F1"})
        self.assertEqual(resp.status_code, 200)
        ivr = resp.json()
        self.assertEqual(ivr["state"], "MAIN_MENU")
        self.assertIn("1", [o["key"] for o in ivr["options"]])

        # Press 2 for Mandi vs MSP
        resp_digit2 = self.client.post("/api/simulate/ivr", json={"farmer_id": "F1", "digit_pressed": "2"})
        self.assertEqual(resp_digit2.status_code, 200)
        data2 = resp_digit2.json()
        self.assertEqual(data2["state"], "PLAYING_MANDI")
        self.assertTrue(data2["price_data"]["is_below_msp"])

    def test_06_sms_simulation(self):
        # Default farmer language
        resp = self.client.post("/api/simulate/sms", json={"farmer_id": "F1"})
        self.assertEqual(resp.status_code, 200)
        sms = resp.json()
        self.assertEqual(sms["delivery_status"], "DELIVERED")
        self.assertTrue(len(sms["sms_body"]) > 0)

        # English override
        resp_en = self.client.post("/api/simulate/sms", json={"farmer_id": "F1", "language": "en"})
        self.assertEqual(resp_en.status_code, 200)
        sms_en = resp_en.json()
        self.assertIn("MSP", sms_en["sms_body"])

        # Odia override
        resp_or = self.client.post("/api/simulate/sms", json={"farmer_id": "F1", "language": "or"})
        self.assertEqual(resp_or.status_code, 200)
        sms_or = resp_or.json()
        self.assertIn("ମଣ୍ଡି ଦର", sms_or["sms_body"])

        # IVR Keypad Language switch (Key 9)
        resp_ivr_lang = self.client.post("/api/simulate/ivr", json={"farmer_id": "F1", "digit_pressed": "9"})
        self.assertEqual(resp_ivr_lang.status_code, 200)
        self.assertEqual(resp_ivr_lang.json()["state"], "LANGUAGE_MENU")

        # Select Odia via Keypad (Key 94)
        resp_ivr_or = self.client.post("/api/simulate/ivr", json={"farmer_id": "F1", "digit_pressed": "94"})
        self.assertEqual(resp_ivr_or.status_code, 200)
        self.assertEqual(resp_ivr_or.json()["language"], "or")
        self.assertIn("ନମସ୍କାର", resp_ivr_or.json()["voice_prompt_text"])

    def test_07_multi_language_tts_endpoints(self):
        # Test Odia, Assamese, Marathi, Kannada, Hindi, English
        languages = ["or", "as", "mr", "kn", "hi", "en"]
        sample_texts = {
            "or": "ନମସ୍କାର କୃଷକ ଭାଇ। ଏହା ଆପଣଙ୍କ ପରାମର୍ଶ।",
            "as": "নমস্কাৰ কৃষক ভাই। এইটো আপোনাৰ পৰামৰ্শ।",
            "mr": "नमस्कार शेतकरी बंधू. हा आपला सल्ला आहे.",
            "kn": "ನಮಸ್ಕಾರ ರೈತ ಬಾಂಧವರೇ. ಇದು ನಿಮ್ಮ ಸಲಹೆ.",
            "hi": "नमस्ते किसान भाई। यह आपकी सलाह है।",
            "en": "Hello farmer. This is your advisory."
        }
        for lang in languages:
            resp = self.client.get(f"/api/tts?text={sample_texts[lang]}&lang={lang}")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.headers["content-type"], "audio/mpeg")
            self.assertGreater(len(resp.content), 1000)

    def test_08_sundargarh_17_blocks_endpoint(self):
        resp = self.client.get("/api/sundargarh/blocks")
        self.assertEqual(resp.status_code, 200)
        blocks = resp.json()
        self.assertEqual(len(blocks), 17)
        block_names = [b["block_name"] for b in blocks]
        self.assertIn("Hemgir", block_names)
        self.assertIn("Bonaigarh", block_names)
        self.assertIn("Lephripara", block_names)
        self.assertIn("Koida", block_names)

        hemgir = next(b for b in blocks if b["block_name"] == "Hemgir")
        self.assertEqual(hemgir["consecutive_dry_days"], 24)
        self.assertEqual(hemgir["mean_summer_lst_c"], 42.0)
        self.assertEqual(hemgir["ndms_alert_category"], "Yellow (Drought Watch)")

    def test_09_sundargarh_hemgir_drought_advisory(self):
        # F_SUN1 in Hemgir: CDD 24, Red & Yellow soil -> R-OD-01
        resp = self.client.get("/api/farmers/F_SUN1/advisory")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["rule_id"], "R-OD-01")
        self.assertEqual(data["block_name"], "Hemgir")
        self.assertEqual(data["weather_data"]["dry_spell_days"], 24)
        self.assertEqual(data["action_type"], "moisture_conservation_and_chahata")

    def test_10_sundargarh_bonaigarh_flood_advisory(self):
        # F_SUN2 in Bonaigarh: Flood Hazard High -> R-OD-02
        resp = self.client.get("/api/farmers/F_SUN2/advisory")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["rule_id"], "R-OD-02")
        self.assertEqual(data["block_name"], "Bonaigarh")
        self.assertEqual(data["weather_data"]["flood_hazard_risk"], "High")

    def test_11_sundargarh_distress_scoring_with_microclimate(self):
        resp = self.client.post("/api/farmers/F_SUN1/distress", json={})
        self.assertEqual(resp.status_code, 200)
        score_data = resp.json()
        self.assertIn("distress_score", score_data)
        self.assertEqual(score_data["block_name"], "Hemgir")
        self.assertEqual(score_data["sub_components"]["consecutive_dry_days"], 24)
        self.assertEqual(score_data["sub_components"]["mean_summer_lst_c"], 42.0)
        # Verify Odisha scheme triggers (Chahata / Farm Pond & KALIA)
        scheme_ids = [i["scheme_id"] for i in score_data["recommended_interventions"]]
        self.assertTrue("S_OD3" in scheme_ids or "S_OD1" in scheme_ids)

if __name__ == "__main__":
    unittest.main()
