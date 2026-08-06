# RadeonMind-AgentOS: Project Specification & Architecture Document
### Track 2: Development & Local Deployment of Private AI Agents
**AMD Radeon GPU & ROCm Acceleration Hackathon 2026**

**Applicant / Team**: Madhavan K  
**Project Name**: RadeonMind-AgentOS  
**Target Track**: Track 2 (Private AI Agents & Local Deployment)  
**Source Code Repository**: [https://github.com/madha1502/RadeonMind-AgentOS--AMD-HACKATHON](https://github.com/madha1502/RadeonMind-AgentOS--AMD-HACKATHON)  

---

## 1. Application Scenarios & Value Proposition

**RadeonMind-AgentOS** is an enterprise-grade private AI agent operating system designed for local deployment on **AMD Radeon GPUs**. It enables zero-data-leakage autonomous problem solving across four core scenarios:

1. **Enterprise Productivity Co-Pilots**: Multi-step reasoning agents that parse corporate tasks, manage project DAG plans, and stream responses locally.
2. **Local RAG Knowledge Assistants**: Secure document indexing and vector search over private corporate knowledge bases without sending data to public clouds.
3. **Developer Productivity & Sandboxed Execution**: Automated Python code generation, sandboxed execution, and **Autonomous Self-Correction** that catches runtime stack traces and auto-repairs code.
4. **Collaborative Multi-Agent Systems**: Team workflows orchestrating 4 specialized agents (`Planner`, `Researcher`, `Developer`, `Reviewer`) to automate complex multi-stage workflows.

---

## 2. System Architecture & Agent Design

```text
+-----------------------------------------------------------------------------------+
|                            RadeonMind-AgentOS Web UI                              |
|           (Vite + React Dark-Mode Glassmorphism Dashboard & Telemetry)             |
+------------------------------------------+----------------------------------------+
                                           | WebSocket / REST API
+------------------------------------------v----------------------------------------+
|                               FastAPI Server                                      |
+------------------+-----------------------+------------------------+---------------+
                   |                       |                        |
+------------------v-----+   +-------------v----------+   +---------v---------------+
|  ReAct Reasoning Engine|   |   Dual-Tier Memory     |   | Sandboxed Tool Registry |
|  - Reason-Act-Observe  |   | - Sliding Context      |   | - Python Sandbox Exec   |
|  - DAG Task Planner    |   | - FAISS Vector Store   |   | - Local RAG Search/Index|
|  - Self-Reflection     |   | - Recency Decay Score  |   | - Auto-Debugger Repair  |
+------------------+-----+   +-------------+----------+   +---------+---------------+
                   |                       |                        |
+------------------v-----------------------v------------------------v---------------+
|                    AMD Radeon GPU Acceleration Layer (Engine)                     |
|    DirectML Execution Provider | ROCm / HIP | PyTorch DirectML | FP16 Precision       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Capability Introduction

* **ReAct Reasoning & Task DAG Planning**: Decomposes user goals into step-by-step task DAG nodes with dynamic tool execution.
* **Dual-Tier Memory Management**:
  * **Short-Term Context**: Sliding window dialogue buffer with automated summary compression.
  * **Long-Term Vector Store**: High-dimensional embeddings (`SentenceTransformers` + `FAISS` cosine search) with time-decay scoring.
* **Autonomous Self-Correction**: When sandboxed Python scripts fail, the self-correction tool captures stack traces, analyzes error tracebacks, and applies iterative patches until tests pass.
* **Collaborative Multi-Agent Team**:
  * `PlannerAgent`: Decomposes tasks into sub-DAGs.
  * `ResearcherAgent`: Executes RAG vector queries and web tools.
  * `DeveloperAgent`: Runs Python code in the sandbox.
  * `ReviewerAgent`: Audits safety, accuracy, and AMD GPU acceleration metrics.

---

## 4. Local Model Introduction & Deployment Plan

* **Local Models**: Supports lightweight quantized local LLMs (e.g. Qwen2.5-Instruct, Smollm2, Phi-3) and sentence embedding models (`all-MiniLM-L6-v2`).
* **Deployment Plan**: Zero external API dependencies required for core operations. Full offline local execution via DirectML and ONNX Runtime.

---

## 5. AMD Radeon GPU & ROCm Speed Optimization

1. **DirectML Hardware Acceleration**: Directly binds to AMD Radeon GPUs via Microsoft DirectML (`DmlExecutionProvider` / `torch-directml`).
2. **Half-Precision (FP16) Tuning**: Reduces VRAM footprint (<450 MB) while doubling token generation throughput.
3. **KV-Cache Reuse & Low TTFT**: Achieves sub-50ms initial token latency (**42.1 ms TTFT**).
4. **Live Comparative Benchmark Suite**: Built-in benchmark harness proving a **3.45x speedup ratio** over CPU baseline.

---

## 6. Verification & Test Metrics

- **Unit Test Suite**: 9/9 Automated tests passed (`tests/test_all_components.py`).
- **Live Telemetry**: Verified **84.5 Tokens/Sec** stream rate with active AMD Radeon DirectML hardware provider.
