from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from .config import PORT
from .services.coordination_agent import sio
from .services.vector_store import faiss_store
from .routers import (
    health,
    routes,
    emergency_places,
    weather,
    incidents,
    resources,
    allocations,
    shelters,
    alerts,
    audit,
    broadcasts,
    analytics,
    chatbot,
)

# Initialize FastAPI application
app = FastAPI(
    title="PS20 Agentic Disaster Relief Coordinator",
    description="FastAPI Backend for Emergency Coordination and Multi-Agent AI Response",
    version="1.0.0"
)

# Enable CORS for frontend Vite ports (5173, 5174, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api
api_prefix = "/api"
app.include_router(health.router, prefix=api_prefix)
app.include_router(routes.router, prefix=api_prefix)
app.include_router(emergency_places.router, prefix=api_prefix)
app.include_router(weather.router, prefix=api_prefix)
app.include_router(incidents.router, prefix=api_prefix)
app.include_router(resources.router, prefix=api_prefix)
app.include_router(allocations.router, prefix=api_prefix)
app.include_router(shelters.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(audit.router, prefix=api_prefix)
app.include_router(broadcasts.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(chatbot.router, prefix=api_prefix)

# Socket.IO lifecycle event handlers
@sio.event
async def connect(sid, environ):
    print(f"[Socket.IO] Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[Socket.IO] Client disconnected: {sid}")

# Wrap FastAPI with python-socketio ASGI application
socket_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path="socket.io"
)

@app.on_event("startup")
async def on_startup():
    print("=======================================================")
    print("[PS20 FastAPI] Agentic Disaster Coordinator Server Online")
    print(f"[REST API] http://localhost:{PORT}/api")
    print(f"[Socket.IO] Real-time engine active on port {PORT}")
    print("[Database Mode] In-Memory Fallback Repository with Supabase integration")
    print("=======================================================")
    
    # Init RAG Index
    await faiss_store.hydrate_mock_state_from_db()
