import faiss
import numpy as np
import json
import asyncio
from typing import List, Dict, Any, Tuple
from openai import AsyncOpenAI
import hashlib

from ..config import OPENAI_API_KEY
from ..repository import repository

_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY and "your_openai" not in OPENAI_API_KEY else None

class FAISSVectorStore:
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(self.dimension)
        self.document_map: Dict[int, Dict[str, Any]] = {}  # Maps FAISS integer ID to JSON chunk
        self.current_id = 0

    def _get_heuristic_vector(self, text: str) -> np.ndarray:
        """Fallback deterministic vector if OpenAI API key is unavailable."""
        hash_val = int(hashlib.md5(text.encode('utf-8')).hexdigest(), 16)
        vec = np.zeros(self.dimension, dtype=np.float32)
        # Populate parts of the vector pseudo-randomly based on text hash
        for i in range(min(50, len(text))):
            idx = (hash_val + i * 13) % self.dimension
            vec[idx] += (ord(text[i]) / 255.0)
        
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.reshape(1, -1)

    async def get_embedding(self, text: str) -> np.ndarray:
        """Get 1536-dimensional vector embedding from OpenAI or Fallback generator."""
        if _openai_client:
            try:
                res = await _openai_client.embeddings.create(
                    input=text.replace("\n", " "),
                    model="text-embedding-ada-002"
                )
                vec = np.array(res.data[0].embedding, dtype=np.float32)
                return vec.reshape(1, -1)
            except Exception as e:
                print(f"[FAISS] OpenAI Embedding failed: {e}. Falling back to heuristic.")
        
        return self._get_heuristic_vector(text)

    async def ingest_document(self, metadata: Dict[str, Any], text_content: str):
        vec = await self.get_embedding(text_content)
        self.index.add(vec)
        self.document_map[self.current_id] = metadata
        self.current_id += 1

    async def hydrate_mock_state_from_db(self):
        """Pulls everything from the database and inserts it as mock RAG state."""
        print("[FAISS] Beginning mass ingestion of mock DB state...")
        
        incidents = await repository.get_incidents()
        for i in incidents:
            if i.status in ["RESOLVED", "CANCELLED"]: continue
            doc_text = f"INCIDENT {i.id}: {i.title}. Category {i.category}, Severity {i.severity}. Triggers: {', '.join(getattr(i, 'detectedKeywords', []))}. Trapped: {getattr(i, 'peopleTrapped', 0)}. Needs: {', '.join(getattr(i, 'urgentNeeds', []))}. Desc: {i.description}"
            await self.ingest_document({"type": "incident", "data": i.model_dump()}, doc_text)
            
        resources = await repository.get_resources()
        for r in resources:
            if r.status != "AVAILABLE": continue
            doc_text = f"RESOURCE {r.id}: {r.callsign}. Type {r.category}. Ready to dispatch. {r.personnelCount} personnel onboard. Fuel {r.fuelOrSupplyPct}%."
            await self.ingest_document({"type": "resource", "data": r.model_dump()}, doc_text)
            
        shelters = await repository.get_shelters()
        for s in shelters:
            if not getattr(s, 'isOpen', True) and getattr(s, 'status', 'OPEN') != 'OPEN': continue
            cap = s.capacity
            occ = getattr(s, 'currentOccupancy', getattr(s, 'occupied', 0))
            doc_text = f"SHELTER {s.id}: {s.name}. Located at {s.location.address}. Capacity {cap}, Occupied {occ}. Medical Staff: {s.medicalStaffCount}."
            await self.ingest_document({"type": "shelter", "data": s.model_dump()}, doc_text)
            
        print(f"[FAISS] Ingestion complete. Index size: {self.current_id} vectors.")

    async def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        vec = await self.get_embedding(query)
        # Search the index
        distances, indices = self.index.search(vec, top_k)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx != -1 and idx in self.document_map:
                results.append({
                    "distance": float(dist),
                    "document": self.document_map[idx]
                })
        return results

# Expose global asynchronous instance
faiss_store = FAISSVectorStore()
