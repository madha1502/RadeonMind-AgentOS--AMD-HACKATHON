import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from radeonmind.engine.hardware_accelerator import accelerator
from radeonmind.engine.benchmark import benchmark_suite
from radeonmind.agents.agent_core import IntelligentAgent
from radeonmind.memory.memory_manager import memory_system
from radeonmind.tools.tool_registry import registry
from radeonmind.orchestrator.multi_agent_system import orchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("radeonmind.api")

app = FastAPI(
    title="RadeonMind-AgentOS API",
    description="AMD Radeon GPU-Accelerated Multi-Agent Reasoning & Workflow Automation Platform Server",
    version="1.0.0"
)

# Enable CORS for local Vite development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---
class AgentRequest(BaseModel):
    goal: str
    mode: Optional[str] = "react"
    agent_role: Optional[str] = "General Intelligence & Task Assistant"

class RAGIndexRequest(BaseModel):
    content: str
    title: Optional[str] = "Document Note"
    category: Optional[str] = "General"

class RAGSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3

class CodeExecuteRequest(BaseModel):
    code: str

# --- REST Endpoints ---
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "RadeonMind-AgentOS", "version": "1.0.0"}

@app.get("/api/hardware")
def get_hardware_telemetry():
    """Returns AMD Radeon GPU hardware status, VRAM, and acceleration provider info."""
    return {
        "device_info": accelerator.device_info,
        "telemetry": accelerator.get_telemetry()
    }

from radeonmind.engine.report_generator import generate_benchmark_report

@app.get("/api/benchmark")
def run_benchmark():
    """Executes live comparative benchmark between CPU baseline and AMD Radeon DirectML GPU."""
    return benchmark_suite.run_full_benchmark()

@app.get("/api/benchmark/report")
def export_benchmark_report():
    """Generates and exports a downloadable Markdown benchmark report file."""
    return generate_benchmark_report()

@app.get("/api/tools")
def list_available_tools():
    """Returns registered LLM function calling tools and JSON schemas."""
    return {"tools": registry.list_tools()}

@app.post("/api/tools/execute")
def execute_tool_endpoint(tool_name: str, payload: Dict[str, Any]):
    return registry.execute_tool(tool_name, payload)

@app.post("/api/rag/index")
def index_rag_document(req: RAGIndexRequest):
    return registry.execute_tool("index_document_rag", {
        "content": req.content,
        "title": req.title,
        "category": req.category
    })

@app.post("/api/rag/search")
def search_rag_document(req: RAGSearchRequest):
    return registry.execute_tool("search_knowledge_base_rag", {
        "query": req.query,
        "top_k": req.top_k
    })

@app.get("/api/memory")
def inspect_memory():
    """Returns short-term context and long-term vector store document inspect data."""
    return {
        "short_term_messages": memory_system.short_term.messages,
        "running_summary": memory_system.short_term.running_summary,
        "long_term_doc_count": len(memory_system.long_term.documents),
        "long_term_documents": memory_system.long_term.documents[-20:]
    }

@app.post("/api/agent/run")
def run_agent_sync(req: AgentRequest):
    """Synchronous single-shot execution for an agent request."""
    agent = IntelligentAgent(role=req.agent_role)
    events = list(agent.run_agent_loop(req.goal, mode=req.mode))
    final_event = events[-1] if events else {}
    return {
        "status": "completed",
        "events": events,
        "result": final_event.get("data", {})
    }

# --- WebSocket Real-Time Telemetry & Agent Stream ---
@app.websocket("/ws/agent")
async def websocket_agent_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        data_text = await websocket.receive_text()
        req_json = json.loads(data_text)
        goal = req_json.get("goal", "Execute agent reasoning benchmark task.")
        is_multi_agent = req_json.get("multi_agent", False)

        if is_multi_agent:
            for step_update in orchestrator.execute_team_workflow(goal):
                await websocket.send_json({"type": "multi_agent_update", "data": step_update})
                await asyncio.sleep(0.1)
        else:
            agent = IntelligentAgent()
            for update in agent.run_agent_loop(goal):
                await websocket.send_json(update)
                await asyncio.sleep(0.02)
                
        await websocket.close()
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("radeonmind.api.server:app", host="127.0.0.1", port=8000, reload=True)
