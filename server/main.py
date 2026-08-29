import os
import sys
import importlib.util

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
coding_dir = os.path.join(root_dir, "coding")
if coding_dir not in sys.path:
    sys.path.insert(0, coding_dir)

actual_main_path = os.path.join(coding_dir, "server", "main.py")
spec = importlib.util.spec_from_file_location("coding_server_main", actual_main_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
app = module.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
