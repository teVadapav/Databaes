import sys
import os

# Ensure coding/ is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
coding_dir = os.path.join(current_dir, "coding")
if coding_dir not in sys.path:
    sys.path.insert(0, coding_dir)

from server.main import app
