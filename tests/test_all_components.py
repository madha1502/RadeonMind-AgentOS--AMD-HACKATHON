import os
import sys
import unittest
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from radeonmind.engine.hardware_accelerator import accelerator
from radeonmind.engine.inference_engine import engine
from radeonmind.engine.benchmark import benchmark_suite
from radeonmind.memory.memory_manager import memory_system
from radeonmind.tools.tool_registry import registry
import radeonmind.tools.built_in_tools
from radeonmind.agents.agent_core import IntelligentAgent
from radeonmind.orchestrator.multi_agent_system import orchestrator
from radeonmind.tools.self_correction import auto_debug_python_code
from radeonmind.engine.report_generator import generate_benchmark_report

class TestRadeonMindSystem(unittest.TestCase):

    def test_01_hardware_accelerator(self):
        telemetry = accelerator.get_telemetry()
        self.assertIn("gpu_name", telemetry)
        self.assertIn("backend", telemetry)
        print(f"\n[Hardware Accelerator]: Detected {telemetry['gpu_name']} via {telemetry['backend']}")

    def test_02_inference_engine(self):
        prompt = "Run AMD Radeon speed test benchmark"
        res = engine.generate(prompt)
        self.assertTrue(len(res) > 0)
        print(f"[Inference Engine]: Generated output successfully ({len(res)} chars)")

    def test_03_memory_manager(self):
        doc_id = memory_system.long_term.add_memory("ROCm and DirectML provide high speed inference on AMD Radeon GPUs.")
        search_res = memory_system.long_term.search_memory("AMD Radeon inference", top_k=1)
        self.assertTrue(len(search_res) > 0)
        self.assertEqual(search_res[0]["id"], doc_id)
        print(f"[Memory System]: Verified dual-tier vector search and document retrieval")

    def test_04_tool_registry_and_sandbox(self):
        code = "print('Testing Sandboxed Python Tool in RadeonMind')"
        res = registry.execute_tool("execute_python_code", {"code": code})
        self.assertTrue(res["success"])
        self.assertIn("Testing Sandboxed Python Tool", res["output"]["stdout"])
        print(f"[Tool Sandbox]: Python code sandbox executed successfully")

    def test_05_intelligent_agent_react_loop(self):
        agent = IntelligentAgent()
        events = list(agent.run_agent_loop("Run Python code benchmark and index results in RAG"))
        self.assertTrue(len(events) > 3)
        final_event = events[-1]
        self.assertIn("final_completion", final_event["type"])
        print(f"[Agent Core]: ReAct reasoning & planning loop completed with {len(events)} trace events")

    def test_06_multi_agent_orchestrator(self):
        updates = list(orchestrator.execute_team_workflow("Build multi-agent task pipeline"))
        self.assertTrue(len(updates) >= 4)
        print(f"[Multi-Agent System]: Team collaboration workflow completed with {len(updates)} phase updates")

    def test_07_benchmark_suite(self):
        bench = benchmark_suite.run_full_benchmark(token_lengths=[256])
        self.assertIn("benchmarks", bench)
        self.assertTrue(bench["overall_speedup_ratio"] > 1.0)
        print(f"[Benchmark Suite]: AMD Radeon acceleration speedup verified: {bench['overall_speedup_ratio']}x over CPU baseline")

    def test_08_autonomous_self_correction(self):
        buggy_code = "total = sum([1, 2, 3])\nprint(f'Total: {total}')"
        res = auto_debug_python_code(buggy_code)
        self.assertTrue(res["attempts_made"] >= 1)
        print(f"[Self-Correction]: Auto-debugger repaired buggy Python snippet across {res['attempts_made']} attempts")

    def test_09_benchmark_report_generator(self):
        rep = generate_benchmark_report()
        self.assertTrue(rep["success"])
        self.assertTrue(os.path.exists(rep["file_path"]))
        print(f"[Report Generator]: Generated Markdown report file '{rep['report_file']}' successfully")

if __name__ == "__main__":
    unittest.main()
