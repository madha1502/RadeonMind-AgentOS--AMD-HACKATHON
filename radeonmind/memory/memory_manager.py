import time
import math
import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger("radeonmind.memory")

class ShortTermMemory:
    """
    Short-Term Context Window Buffer with sliding window and automatic summary compression.
    """
    def __init__(self, max_messages: int = 10):
        self.max_messages = max_messages
        self.messages: List[Dict[str, str]] = []
        self.running_summary: str = ""

    def add_message(self, role: str, content: str):
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": time.time()
        })
        if len(self.messages) > self.max_messages * 2:
            self._compress_context()

    def _compress_context(self):
        # Retain latest 4 messages and summarize earlier ones
        earlier = self.messages[:-4]
        summary_chunks = [f"{m['role'].upper()}: {m['content'][:100]}..." for m in earlier]
        self.running_summary = "Prior Context Summary: " + " | ".join(summary_chunks)
        self.messages = self.messages[-4:]

    def get_context_formatted(self) -> str:
        formatted = ""
        if self.running_summary:
            formatted += f"[SUMMARY]: {self.running_summary}\n\n"
        for msg in self.messages:
            formatted += f"[{msg['role'].upper()}]: {msg['content']}\n"
        return formatted

    def clear(self):
        self.messages.clear()
        self.running_summary = ""

class LongTermVectorMemory:
    """
    Long-Term Vector Memory powered by semantic embeddings and FAISS / cosine similarity.
    Supports episodic memory retrieval, document knowledge base indexing, and decay scoring.
    """
    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim
        self.documents: List[Dict[str, Any]] = []
        self.vectors: List[np.ndarray] = []
        self._embedder = None
        self._init_embedder()

    def _init_embedder(self):
        try:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("SentenceTransformer 'all-MiniLM-L6-v2' loaded successfully for vector memory.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer, using TF-IDF/Count fallback vectorizer: {e}")
            self._embedder = None

    def _encode(self, text: str) -> np.ndarray:
        if self._embedder is not None:
            emb = self._embedder.encode(text, convert_to_numpy=True)
            norm = np.linalg.norm(emb)
            return emb / max(1e-8, norm)
        else:
            # Deterministic fallback embedding for lightweight environments
            vec = np.zeros(self.embedding_dim, dtype=np.float32)
            words = text.lower().split()
            for i, word in enumerate(words):
                idx = hash(word) % self.embedding_dim
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            return vec / max(1e-8, norm)

    def add_memory(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        doc_id = f"mem_{len(self.documents) + 1}_{int(time.time())}"
        vec = self._encode(content)
        
        doc = {
            "id": doc_id,
            "content": content,
            "metadata": metadata or {},
            "created_at": time.time(),
            "access_count": 0
        }
        self.documents.append(doc)
        self.vectors.append(vec)
        return doc_id

    def search_memory(self, query: str, top_k: int = 4, relevance_threshold: float = 0.2) -> List[Dict[str, Any]]:
        if not self.vectors:
            return []

        q_vec = self._encode(query)
        matrix = np.vstack(self.vectors)
        similarities = np.dot(matrix, q_vec)

        results = []
        current_time = time.time()

        for idx, sim in enumerate(similarities):
            if sim >= relevance_threshold:
                doc = self.documents[idx]
                # Calculate recency decay factor (half life 7 days)
                age_days = (current_time - doc["created_at"]) / (3600 * 24)
                decay = math.exp(-age_days / 7.0)
                final_score = float(sim * (0.85 + 0.15 * decay))

                doc["access_count"] += 1
                results.append({
                    "id": doc["id"],
                    "content": doc["content"],
                    "score": round(final_score, 4),
                    "raw_similarity": round(float(sim), 4),
                    "metadata": doc["metadata"],
                    "created_at": doc["created_at"]
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

class MemoryManager:
    """
    Unified Memory Manager orchestrating both Short-Term Context Window and Long-Term Vector Store.
    """
    def __init__(self):
        self.short_term = ShortTermMemory()
        self.long_term = LongTermVectorMemory()

    def record_interaction(self, user_text: str, agent_response: str):
        self.short_term.add_message("user", user_text)
        self.short_term.add_message("assistant", agent_response)
        
        # Store important knowledge points in long-term vector store
        if len(user_text) > 30 or "remember" in user_text.lower() or "note" in user_text.lower():
            self.long_term.add_memory(
                content=f"User requested: {user_text}\nResult: {agent_response[:300]}",
                metadata={"source": "chat_interaction"}
            )

    def retrieve_context_for_query(self, query: str) -> Dict[str, Any]:
        short_context = self.short_term.get_context_formatted()
        relevant_long_memories = self.long_term.search_memory(query, top_k=3)
        
        return {
            "short_term_context": short_context,
            "long_term_memories": relevant_long_memories
        }

# Global memory manager
memory_system = MemoryManager()
