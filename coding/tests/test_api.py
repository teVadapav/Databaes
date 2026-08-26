"""
API Integration Tests for FastAPI Backend
"""

import json
import unittest
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
        resp = self.client.post("/api/simulate/sms", json={"farmer_id": "F1"})
        self.assertEqual(resp.status_code, 200)
        sms = resp.json()
        self.assertIn("BELOW Govt MSP", sms["sms_body"])
        self.assertEqual(sms["delivery_status"], "DELIVERED")

if __name__ == "__main__":
    unittest.main()
