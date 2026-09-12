import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import datetime

from ..repository import repository
from ..config import OPENAI_API_KEY

router = APIRouter(tags=["Zen AI Chatbot"])

# Initialize OpenAI Client safely
_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY and "your_openai" not in OPENAI_API_KEY else None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    text: str
    modelUsed: str

@router.post("/chat")
async def chat_with_zen_ai(request: ChatRequest) -> ChatResponse:
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # 1. Extract context via FAISS RAG Similarity Search
    from ..services.vector_store import faiss_store
    
    # Retrieve top 6 most relevant documents from the vector store based on user query
    search_results = await faiss_store.search(query, top_k=6)
    
    rag_context = [res["document"] for res in search_results]

    # Compress database context for token efficiency
    db_context = {
        "timestamp": datetime.datetime.now().isoformat(),
        "faiss_rag_retrieved_documents": rag_context,
        "search_metadata": {
            "query": query,
            "results_found": len(rag_context)
        }
    }

    # 2. Try OpenAI LLM parsing if configured
    if _openai_client:
        system_prompt = f"""You are 'Zen AI', the intelligent emergency crisis response and disaster logistics coordinator assistant.
Your goal is to answer queries from emergency operators providing meaningful insights using the ACTUAL live database context provided below.

LIVE DATABASE TELEMETRY CONTEXT:
{json.dumps(db_context, indent=2)}

Guidelines:
1. Speak professionally, concisely, and with authoritative emergency protocol phrasing.
2. Directly answer the user's question using the metrics from the live database context.
3. If they ask about incidents, tell them exact numbers and mention critical ones.
4. If they ask about resources, list exactly what we have available.
5. If they ask about shelters, mention the remaining total evacuee capacity.
6. Do NOT hallucinate data. Only use the provided context. Max 3-4 sentences per response."""

        try:
            messages = [{"role": "system", "content": system_prompt}]
            for msg in (request.history or [])[-5:]:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": query})

            response = await _openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.3,
                max_tokens=250
            )
            return ChatResponse(
                text=response.choices[0].message.content or "Error forming response.",
                modelUsed="OpenAI GPT-4o-mini"
            )
        except Exception as e:
            print(f"[Zen AI] OpenAI API failed, falling back to heuristic engine. Error: {e}")

    # 3. Fallback Heuristic Rules Engine (if no OpenAI key or API down)
    lower_query = query.lower()
    
    # Simple count from RAG context (which contains top 6 relevant docs)
    rag_incidents = [r.get("data", {}) for r in rag_context if r.get("type") == "incident"]
    rag_resources = [r.get("data", {}) for r in rag_context if r.get("type") == "resource"]
    rag_shelters = [r.get("data", {}) for r in rag_context if r.get("type") == "shelter"]

    resp = "I have analyzed your request based on live database telemetry."

    if "incident" in lower_query or "status" in lower_query or "happening" in lower_query:
        resp = f"System analysis: My semantic vector search found {len(rag_incidents)} highly relevant active incidents matching your context. Deploying NDRF is advised if severity requires it."
    elif "resource" in lower_query or "available" in lower_query or "ambulance" in lower_query or "help" in lower_query:
        resp = f"Resource telemetry indicates we have {len(rag_resources)} immediately relevant units standing by for your query parameters. Command Center can dispatch these via the Resources map."
    elif "shelter" in lower_query or "bed" in lower_query or "safe" in lower_query:
        resp = f"We are tracking {len(rag_shelters)} OPEN shelters network-wide relevant to your search."
    elif "sos" in lower_query:
        resp = f"🚨 SOS PRIORITY RECEIVED. The database confirms semantic resource availability ({len(rag_resources)} relevant units). Please navigate to the Command Center to manually route."
    else:
        resp = f"Acknowledged. As a reminder, the semantic FAISS engine retrieved {len(rag_context)} documents matching your context. How specifically should I query the logistics engine?"

    return ChatResponse(text=resp, modelUsed="Heuristic Context Engine")
