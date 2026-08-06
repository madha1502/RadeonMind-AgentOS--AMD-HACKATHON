import inspect
import json
import logging
from typing import Callable, Dict, Any, List, Optional

logger = logging.getLogger("radeonmind.tools")

class Tool:
    """
    Base Tool representation with automatic JSON Schema generation for LLM Function Calling.
    """
    def __init__(self, name: str, description: str, func: Callable, parameters_schema: Dict[str, Any]):
        self.name = name
        self.description = description
        self.func = func
        self.parameters_schema = parameters_schema

    def execute(self, **kwargs) -> Dict[str, Any]:
        try:
            logger.info(f"Executing Tool '{self.name}' with arguments: {kwargs}")
            result = self.func(**kwargs)
            return {
                "success": True,
                "tool_name": self.name,
                "output": result,
                "error": None
            }
        except Exception as e:
            logger.error(f"Error executing Tool '{self.name}': {e}", exc_info=True)
            return {
                "success": False,
                "tool_name": self.name,
                "output": None,
                "error": str(e)
            }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema
            }
        }

class ToolRegistry:
    """
    Registry managing tool registration, lookup, schema export, and execution.
    """
    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, name: str, description: str, parameters_schema: Dict[str, Any]):
        def decorator(func: Callable):
            tool = Tool(name=name, description=description, func=func, parameters_schema=parameters_schema)
            self._tools[name] = tool
            return func
        return decorator

    def register_tool_instance(self, tool: Tool):
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        return [tool.to_dict() for tool in self._tools.values()]

    def execute_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        tool = self.get_tool(name)
        if not tool:
            return {
                "success": False,
                "tool_name": name,
                "output": None,
                "error": f"Tool '{name}' is not registered in the system registry."
            }
        return tool.execute(**arguments)

# Global registry singleton
registry = ToolRegistry()
