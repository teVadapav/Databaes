"""
API Integration Tests for FastAPI Backend (Smart Krishi)
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
        # Check channel and default UI mode attached for Suresh Majhi
        suresh = next(f for f in farmers if f["id"] == "F1")
        self.assertEqual(suresh["recommended_channel"], "ivr_or_sms")
        self.assertEqual(suresh["default_ui_mode"], "assisted")

    def test_03_farmer_advisory_endpoint(self):
        # Suresh F1: Harvest stage paddy price < MSP in Sundargarh
        resp = self.client.get("/api/farmers/F1/advisory")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["rule_id"], "R-30")
        self.assertEqual(data["action_type"], "market_intervention")
        self.assertTrue(data["price_data"]["is_below_msp"])

    def test_04_officer_farmers_endpoint(self):
        resp = self.client.get("/api/officer/farmers")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue("farmers" in data)
        self.assertTrue("metrics" in data)
        # Verify ranking order (descending distress score)
        scores = [f["distress_score"] for f in data["farmers"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_05_farmer_profile_patch(self):
        # Test farmer dashboard info update
        patch_payload = {
            "name": "Suresh Majhi Updated",
            "crop": "paddy",
            "crop_stage": "flowering",
            "language": "or",
            "has_pmfby_insurance": True,
            "has_kcc": True
        }
        resp = self.client.patch("/api/farmers/F1", json=patch_payload)
        self.assertEqual(resp.status_code, 200)
        res_data = resp.json()
        self.assertEqual(res_data["status"], "success")
        self.assertEqual(res_data["farmer"]["name"], "Suresh Majhi Updated")
        self.assertEqual(res_data["farmer"]["crop_stage"], "flowering")
        self.assertTrue(res_data["farmer"]["has_pmfby_insurance"])

        # Restore F1 back to harvest
        self.client.patch("/api/farmers/F1", json={
            "name": "Suresh Majhi",
            "crop": "paddy",
            "crop_stage": "harvest",
            "language": "or",
            "has_pmfby_insurance": False,
            "has_kcc": False
        })

    def test_06_ivr_simulation_odia(self):
        # Initial call in Odia
        resp = self.client.post("/api/simulate/ivr", json={"farmer_id": "F1"})
        self.assertEqual(resp.status_code, 200)
        ivr = resp.json()
        self.assertEqual(ivr["state"], "MAIN_MENU")
        self.assertEqual(ivr["language"], "or")
        self.assertIn("1", [o["key"] for o in ivr["options"]])

    def test_07_sms_simulation(self):
        resp = self.client.post("/api/simulate/sms", json={"farmer_id": "F1"})
        self.assertEqual(resp.status_code, 200)
        sms = resp.json()
        self.assertEqual(sms["delivery_status"], "DELIVERED")

if __name__ == "__main__":
    unittest.main()
