import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from server.main import app

class TestFarmerManagementAndOnboarding(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_farmers_list(self):
        resp = self.client.get("/api/farmers")
        self.assertEqual(resp.status_code, 200)
        farmers = resp.json()
        self.assertGreaterEqual(len(farmers), 5)
        # Check fields present
        f = farmers[0]
        self.assertIn("id", f)
        self.assertIn("name", f)
        self.assertIn("crop", f)
        self.assertIn("crop_stage", f)
        self.assertIn("district_id", f)
        self.assertIn("district_name", f)
        self.assertIn("irrigation_type", f)

    def test_02_auth_login_endpoints(self):
        # 1. Login by ID
        resp1 = self.client.post("/api/auth/login", json={"phone_or_id": "F1"})
        self.assertEqual(resp1.status_code, 200)
        data1 = resp1.json()
        self.assertEqual(data1["user"]["id"], "F1")
        self.assertEqual(data1["farmer_id"], "F1")

        # 2. Login by Phone (with +91 or clean)
        resp2 = self.client.post("/api/auth/login", json={"phone_or_id": "9823110293"})
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        self.assertEqual(data2["user"]["id"], "F1")

        # 3. Login by Name
        resp3 = self.client.post("/api/auth/login", json={"phone_or_id": "Sunita"})
        self.assertEqual(resp3.status_code, 200)
        data3 = resp3.json()
        self.assertEqual(data3["user"]["id"], "F2")

    def test_03_save_onboarding_profile_update_existing(self):
        payload = {
            "farmer_id": "F1",
            "farmer_name": "Ramesh Patil",
            "phone_number": "9823110293",
            "state": "Maharashtra",
            "district": "D1",
            "land_details": {
                "total_area": 3.0,
                "unit": "acres",
                "soil_type": "black"
            },
            "primary_crops": ["onion"],
            "crop_stage": "flowering",
            "irrigation_type": "protective_well",
            "borewell_failed": False,
            "has_pmfby": True,
            "has_kcc": True,
            "informal_debt": False,
            "loan_due_date": "2026-12-01",
            "loan_amount": 60000,
            "device_type": "android_smartphone",
            "preferred_language": "mr-IN"
        }

        resp = self.client.post("/api/onboarding/profile", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["farmer_id"], "F1")
        self.assertEqual(data["user"]["crop_stage"], "flowering")
        self.assertEqual(data["user"]["irrigation_type"], "protective_well")
        self.assertEqual(data["user"]["loan_due_date"], "2026-12-01")

        # Verify through GET /api/farmers/F1
        get_resp = self.client.get("/api/farmers/F1")
        self.assertEqual(get_resp.status_code, 200)
        f1_data = get_resp.json()
        self.assertEqual(f1_data["crop_stage"], "flowering")
        self.assertEqual(f1_data["irrigation_type"], "protective_well")
        self.assertEqual(f1_data["loan_due_date"], "2026-12-01")
        self.assertEqual(f1_data["soil_type"], "black")

    def test_04_create_new_farmer_onboarding(self):
        payload = {
            "farmer_id": None,
            "farmer_name": "Balwinder Singh",
            "phone_number": "9876543210",
            "state": "Maharashtra",
            "district": "D2",
            "land_details": {
                "total_area": 4.5,
                "unit": "hectares",
                "soil_type": "red_sandy"
            },
            "primary_crops": ["soybean"],
            "crop_stage": "vegetative",
            "irrigation_type": "canal",
            "borewell_failed": False,
            "has_pmfby": True,
            "has_kcc": True,
            "informal_debt": False,
            "loan_due_date": "2026-11-20",
            "loan_amount": 75000,
            "device_type": "android_smartphone",
            "preferred_language": "hi-IN"
        }

        resp = self.client.post("/api/onboarding/profile", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        new_fid = data["farmer_id"]
        self.assertTrue(new_fid.startswith("F"))

        # Verify new farmer appears in /api/farmers
        all_resp = self.client.get("/api/farmers")
        self.assertEqual(all_resp.status_code, 200)
        farmers = all_resp.json()
        new_farmer = next((f for f in farmers if f["id"] == new_fid), None)
        self.assertIsNotNone(new_farmer)
        self.assertEqual(new_farmer["name"], "Balwinder Singh")
        self.assertEqual(new_farmer["crop"], "soybean")
        self.assertEqual(new_farmer["crop_stage"], "vegetative")
        self.assertEqual(new_farmer["irrigation_type"], "canal")

if __name__ == "__main__":
    unittest.main()
