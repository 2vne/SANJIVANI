import uvicorn
import os
from app.config import PORT

if __name__ == "__main__":
    uvicorn.run("app.main:socket_app", host="0.0.0.0", port=PORT, reload=True)
