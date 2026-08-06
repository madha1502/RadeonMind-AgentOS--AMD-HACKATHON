import time
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("radeonmind.planner")

class TaskNode:
    """Represents an atomic task step in a plan DAG."""
    def __init__(self, step_id: int, title: str, description: str, tool_hint: Optional[str] = None):
        self.step_id = step_id
        self.title = title
        self.description = description
        self.tool_hint = tool_hint
        self.status = "pending"  # pending, in_progress, completed, failed
        self.result: Optional[Any] = None
        self.error: Optional[str] = None
        self.execution_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "title": self.title,
            "description": self.description,
            "tool_hint": self.tool_hint,
            "status": self.status,
            "result": self.result,
            "error": self.error,
            "execution_time_ms": self.execution_time_ms
        }

class AgentPlanner:
    """
    Decomposes high-level user requests into structured, executable DAG plans with step dependencies.
    """
    def __init__(self):
        pass

    def create_plan(self, goal: str) -> List[TaskNode]:
        """Decomposes a user goal into step-by-step task nodes."""
        logger.info(f"Generating execution plan for goal: {goal}")
        
        goal_lower = goal.lower()
        plan: List[TaskNode] = []

        if "rag" in goal_lower or "document" in goal_lower or "knowledge" in goal_lower:
            plan = [
                TaskNode(1, "Retrieve Knowledge Context", "Query local vector store for relevant document chunks.", tool_hint="search_knowledge_base_rag"),
                TaskNode(2, "Analyze & Synthesize Context", "Synthesize retrieved context with local model reasoning.", tool_hint=None),
                TaskNode(3, "Format Final Insight", "Structure answer into concise report format.", tool_hint=None)
            ]
        elif "code" in goal_lower or "python" in goal_lower or "script" in goal_lower or "benchmark" in goal_lower:
            plan = [
                TaskNode(1, "Analyze Problem Specification", "Decompose algorithmic requirement into sub-functions.", tool_hint=None),
                TaskNode(2, "Generate & Execute Code", "Run generated script in Python sandbox.", tool_hint="execute_python_code"),
                TaskNode(3, "Verify Execution & Stats", "Validate output, calculate execution metrics and format response.", tool_hint="analyze_data_summary")
            ]
        elif "web" in goal_lower or "search" in goal_lower or "research" in goal_lower:
            plan = [
                TaskNode(1, "Web Information Gathering", "Query web search for recent domain data.", tool_hint="web_search_and_extract"),
                TaskNode(2, "Synthesize & Index Facts", "Index findings into RAG memory store.", tool_hint="index_document_rag"),
                TaskNode(3, "Cross-Verify & Summarize", "Evaluate facts for consistency and produce response.", tool_hint=None)
            ]
        else:
            plan = [
                TaskNode(1, "Task Analysis & Strategy", f"Analyze goal requirements for '{goal}'.", tool_hint=None),
                TaskNode(2, "Context & Tool Execution", "Query vector memory and execute necessary tools.", tool_hint="search_knowledge_base_rag"),
                TaskNode(3, "Final Reflection & Output Generation", "Synthesize findings and compile final answer.", tool_hint=None)
            ]

        return plan
