import sys
import os

# Ensure backend root is in Python path for Netlify execution context
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from mangum import Mangum
from backend.app.main import app

# Mangum wraps FastAPI for Netlify AWS Lambda serverless runtime
handler = Mangum(app, api_gateway_base_path="/.netlify/functions/api")
