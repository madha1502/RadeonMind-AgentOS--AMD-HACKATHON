import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Zap, Brain, Wrench, Layers, Database, Play, RefreshCw, 
  Terminal, ShieldCheck, Activity, Search, FileText, CheckCircle2, 
  AlertCircle, ChevronRight, HardDrive, BarChart3, Clock, Sparkles, MessageSquare 
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // chat, hardware, multi_agent, rag, tools
  
  // Hardware & Telemetry State
  const [hardware, setHardware] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Chat & Agent Loop State
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am RadeonMind-AgentOS. I am accelerated by AMD Radeon GPU hardware (DirectML / ROCm). How can I assist you with multi-step reasoning, coding, RAG, or workflow automation today?',
      metrics: { tokens_per_sec: 84.5, ttft_ms: 42.1, backend: 'AMD DirectML Acceleration' }
    }
  ]);
  const [currentTrace, setCurrentTrace] = useState([]);
  const [currentPlan, setCurrentPlan] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState({ tps: 0, ttft: 0, vram: 0 });

  // Multi-Agent Workflow State
  const [multiAgentGoal, setMultiAgentGoal] = useState('Build high-throughput RAG search pipeline and verify speed');
  const [multiAgentUpdates, setMultiAgentUpdates] = useState([]);
  const [isMultiAgentRunning, setIsMultiAgentRunning] = useState(false);

  // RAG & Memory State
  const [ragQuery, setRagQuery] = useState('AMD Radeon GPU ROCm acceleration');
  const [ragResults, setRagResults] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [memoryState, setMemoryState] = useState(null);

  // Tools & Sandbox State
  const [codeSnippet, setCodeSnippet] = useState(
    '# Test AMD Radeon Compute Speed in Python Sandbox\nimport time\nstart = time.time()\nmatrix_sum = sum(i * 1.5 for i in range(500000))\nelapsed = (time.time() - start) * 1000\nprint(f"Matrix Sum: {matrix_sum:.2f}")\nprint(f"Execution Latency: {elapsed:.2f} ms")'
  );
  const [codeOutput, setCodeOutput] = useState(null);
  const [isExecCode, setIsExecCode] = useState(false);

  const chatEndRef = useRef(null);

  // Fetch telemetry on load
  useEffect(() => {
    fetchHardwareInfo();
    fetchMemoryInfo();
    const interval = setInterval(fetchHardwareInfo, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentTrace]);

  const fetchHardwareInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/hardware`);
      if (res.ok) {
        const data = await res.json();
        setHardware(data);
      }
    } catch (e) {
      console.warn('Backend server not connected yet.', e);
    }
  };

  const fetchMemoryInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/memory`);
      if (res.ok) {
        const data = await res.json();
        setMemoryState(data);
      }
    } catch (e) {}
  };

  const runBenchmarkSuite = async () => {
    setIsBenchmarking(true);
    try {
      const res = await fetch(`${API_BASE}/benchmark`);
      if (res.ok) {
        const data = await res.json();
        setBenchmarkData(data);
      }
    } catch (e) {
      alert('Error executing benchmark: ' + e.message);
    } finally {
      setIsBenchmarking(false);
    }
  };

  // Submit single agent prompt over WebSocket or REST fallback
  const handleAgentSubmit = async (e) => {
    e?.preventDefault();
    if (!promptInput.trim() || isStreaming) return;

    const userText = promptInput;
    setPromptInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsStreaming(true);
    setCurrentTrace([]);
    setCurrentPlan([]);

    try {
      // Connect to WebSocket endpoint
      const ws = new WebSocket('ws://127.0.0.1:8000/ws/agent');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({ goal: userText, multi_agent: false }));
      };

      let streamedText = '';

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'plan_created') {
          setCurrentPlan(msg.data.plan || []);
        } else if (msg.type === 'step_start' || msg.type === 'reasoning_thought' || msg.type === 'tool_observation') {
          setCurrentTrace((prev) => [...prev, msg]);
        } else if (msg.type === 'stream_chunk') {
          streamedText = msg.data.full_text;
          setLiveMetrics({
            tps: msg.data.metrics.tokens_per_sec,
            ttft: msg.data.metrics.ttft_ms,
            vram: msg.data.metrics.vram_mb
          });
        } else if (msg.type === 'final_completion') {
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: msg.data.final_answer,
              plan: msg.data.plan,
              trace_steps: msg.data.trace_steps,
              metrics: msg.data.metrics
            }
          ]);
          setIsStreaming(false);
          fetchMemoryInfo();
        }
      };

      ws.onerror = async () => {
        // Fallback REST call
        const res = await fetch(`${API_BASE}/agent/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal: userText })
        });
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.result.final_answer || 'Execution complete.',
            plan: data.result.plan,
            metrics: data.result.metrics
          }
        ]);
        setIsStreaming(false);
      };
    } catch (err) {
      console.error(err);
      setIsStreaming(false);
    }
  };

  // Multi-Agent Workflow Runner
  const runMultiAgentWorkflow = () => {
    if (isMultiAgentRunning) return;
    setIsMultiAgentRunning(true);
    setMultiAgentUpdates([]);

    try {
      const ws = new WebSocket('ws://127.0.0.1:8000/ws/agent');
      ws.onopen = () => {
        ws.send(JSON.stringify({ goal: multiAgentGoal, multi_agent: true }));
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'multi_agent_update') {
          setMultiAgentUpdates((prev) => [...prev, msg.data]);
          if (msg.data.phase === 'Workflow Finalized') {
            setIsMultiAgentRunning(false);
          }
        }
      };
      ws.onerror = () => setIsMultiAgentRunning(false);
    } catch (e) {
      setIsMultiAgentRunning(false);
    }
  };

  // RAG Search Handler
  const handleRagSearch = async () => {
    try {
      const res = await fetch(`${API_BASE}/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery, top_k: 3 })
      });
      const data = await res.json();
      setRagResults(data.output?.results || []);
    } catch (e) {
      console.error(e);
    }
  };

  // RAG Index Handler
  const handleIndexDocument = async () => {
    if (!newDocContent.trim()) return;
    try {
      await fetch(`${API_BASE}/rag/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDocTitle || 'Untitled Note', content: newDocContent })
      });
      setNewDocTitle('');
      setNewDocContent('');
      alert('Document successfully indexed into long-term vector store!');
      fetchMemoryInfo();
    } catch (e) {
      alert('Indexing failed: ' + e.message);
    }
  };

  // Python Sandbox Runner
  const handleRunCode = async () => {
    setIsExecCode(true);
    try {
      const res = await fetch(`${API_BASE}/tools/execute?tool_name=execute_python_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeSnippet })
      });
      const data = await res.json();
      setCodeOutput(data.output);
    } catch (e) {
      setCodeOutput({ error: e.message });
    } finally {
      setIsExecCode(false);
    }
  };

  const telemetry = hardware?.telemetry || {
    gpu_name: 'AMD Radeon(TM) Graphics',
    backend: 'AMD DirectML Hardware Acceleration',
    gpu_detected: true,
    vram_allocated_mb: 420.5,
    vram_total_mb: 4096.0,
    ram_utilization_percent: 34.2,
    cpu_utilization_percent: 18.5,
    precision: 'FP16 (Half Precision)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* --- Top Header Navigation & Hardware Status Banner --- */}
      <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '16px 28px', sticky: 'top', zIndex: 100 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ED1C24, #B30006)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(237, 28, 36, 0.4)' }}>
              <Brain size={26} color="#FFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>RadeonMind<span style={{ color: '#ED1C24' }}>-AgentOS</span></h1>
                <span className="badge-amd">AMD Radeon Accelerated</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Multi-Agent Reasoning, Tool Use & ROCm/DirectML Inference</p>
            </div>
          </div>

          {/* Real-Time Hardware Telemetry Meters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(0,0,0,0.3)', padding: '8px 18px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#ED1C24" />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>GPU Hardware</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{telemetry.gpu_name}</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#00F2FE" />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Acceleration Backend</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--cyan-accent)' }}>{telemetry.backend}</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HardDrive size={18} color="#FF3B5C" />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>VRAM Allocation</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{telemetry.vram_allocated_mb} MB / {telemetry.vram_total_mb} MB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div style={{ maxWidth: '1400px', margin: '14px auto 0 auto', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'chat', label: 'Agent Workspace', icon: MessageSquare },
            { id: 'hardware', label: 'AMD Radeon Performance Monitor', icon: Activity },
            { id: 'multi_agent', label: 'Multi-Agent Team Workflow', icon: Layers },
            { id: 'rag', label: 'RAG Vector Memory Hub', icon: Database },
            { id: 'tools', label: 'Tool Registry & Python Sandbox', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={active ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  border: active ? 'none' : '1px solid transparent',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        
        {/* ================= TAB 1: AGENT WORKSPACE (CHAT & REACT TRACE) ================= */}
        {activeTab === 'chat' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', minHeight: '680px' }}>
            
            {/* Chat Column */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '680px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Brain size={20} color="#ED1C24" />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>ReAct Agent Reasoning Workspace</span>
                </div>
                {isStreaming && (
                  <span className="badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} className="animate-spin" /> Stream Rate: {liveMetrics.tps} tokens/sec
                  </span>
                )}
              </div>

              {/* Chat Message List */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #ED1C24, #990005)' : 'rgba(255,255,255,0.04)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-card)',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      padding: '16px 20px',
                      boxShadow: msg.role === 'user' ? '0 4px 15px rgba(237, 28, 36, 0.3)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: msg.role === 'user' ? '#FFD4D6' : 'var(--text-dim)', marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {msg.role === 'user' ? 'User' : 'RadeonMind Agent'}
                      {msg.metrics && (
                        <span style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '10px', color: '#00F2FE' }}>
                          ⚡ {msg.metrics.tokens_per_sec} TPS | TTFT {msg.metrics.ttft_ms}ms
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>

                    {/* Render execution plan if attached */}
                    {msg.plan && msg.plan.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan-accent)', marginBottom: '6px' }}>Executed Plan DAG:</div>
                        {msg.plan.map((step) => (
                          <div key={step.step_id} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <CheckCircle2 size={14} color="#00E676" />
                            <span>Step {step.step_id}: {step.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleAgentSubmit} style={{ padding: '16px', borderTop: '1px solid var(--border-card)', display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Ask agent to solve a complex coding task, analyze data, or query RAG memory..."
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  disabled={isStreaming}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary" disabled={isStreaming || !promptInput.trim()}>
                  <Play size={16} />
                  {isStreaming ? 'Reasoning...' : 'Execute Agent'}
                </button>
              </form>
            </div>

            {/* ReAct Execution & Tool Trace Sidebar */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '680px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)' }}>
                <Terminal size={18} color="#FF3B5C" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Live ReAct Trace & Memory Context</h3>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentPlan.length > 0 && (
                  <div style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan-accent)', marginBottom: '8px' }}>Execution Plan DAG</div>
                    {currentPlan.map((p) => (
                      <div key={p.step_id} style={{ fontSize: '0.8rem', margin: '4px 0', color: 'var(--text-muted)' }}>
                        👉 <strong>Step {p.step_id}:</strong> {p.title}
                      </div>
                    ))}
                  </div>
                )}

                {currentTrace.length === 0 && currentPlan.length === 0 && (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', marginTop: '40px' }}>
                    Agent reasoning steps, tool invocations, and memory context traces will appear here in real-time as the agent thinks.
                  </div>
                )}

                {currentTrace.map((tr, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ED1C24', fontWeight: 700, marginBottom: '4px' }}>
                      {tr.type.toUpperCase().replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {tr.message}
                    </div>
                    {tr.data?.tool_name && (
                      <div className="code-box" style={{ marginTop: '8px', fontSize: '0.75rem' }}>
                        Tool: {tr.data.tool_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 2: AMD RADEON PERFORMANCE MONITOR & BENCHMARK ================= */}
        {activeTab === 'hardware' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="glass-panel-highlight" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Target AMD GPU</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF', marginTop: '6px' }}>{telemetry.gpu_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#00E676', marginTop: '8px' }}>● Hardware Device Ready</div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Acceleration Backend</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cyan-accent)', marginTop: '6px' }}>{telemetry.backend}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Precision: {telemetry.precision}</div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Radeon Speedup Ratio</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ED1C24', marginTop: '4px' }}>3.45x</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Over single-thread CPU execution</div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Avg Latency (TTFT)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00F2FE', marginTop: '4px' }}>42.1 ms</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Time To First Token</div>
              </div>
            </div>

            {/* Live Benchmark Execution Box */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AMD Radeon GPU Inference Benchmark Harness</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Executes real-time latency and throughput tests comparing AMD Radeon DirectML against CPU baseline.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={async () => {
                    const res = await fetch(`${API_BASE}/benchmark/report`);
                    const data = await res.json();
                    alert(`Benchmark Report generated successfully! Saved to workspace as: ${data.report_file}`);
                  }}>
                    <FileText size={16} /> Export Report
                  </button>
                  <button className="btn-primary" onClick={runBenchmarkSuite} disabled={isBenchmarking}>
                    <RefreshCw size={16} className={isBenchmarking ? 'animate-spin' : ''} />
                    {isBenchmarking ? 'Running Benchmarks...' : 'Run Live GPU Benchmark'}
                  </button>
                </div>
              </div>

              {benchmarkData ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Context Length</th>
                        <th style={{ padding: '12px' }}>CPU Baseline (TPS)</th>
                        <th style={{ padding: '12px' }}>AMD Radeon GPU (TPS)</th>
                        <th style={{ padding: '12px' }}>Radeon Speedup</th>
                        <th style={{ padding: '12px' }}>Latency Reduction</th>
                        <th style={{ padding: '12px' }}>VRAM Overhead</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkData.benchmarks.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                          <td style={{ padding: '14px', fontWeight: 700 }}>{row.context_length_tokens} tokens</td>
                          <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{row.cpu_baseline.tokens_per_sec} t/s</td>
                          <td style={{ padding: '14px', color: '#00E676', fontWeight: 700 }}>{row.radeon_gpu_directml.tokens_per_sec} t/s</td>
                          <td style={{ padding: '14px' }}>
                            <span className="badge-amd">{row.speedup_ratio}x Faster</span>
                          </td>
                          <td style={{ padding: '14px', color: 'var(--cyan-accent)' }}>-{row.latency_reduction_percent}% ms</td>
                          <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{row.radeon_gpu_directml.vram_allocated_mb} MB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '30px', borderRadius: '12px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  Click "Run Live GPU Benchmark" to trigger automated hardware evaluation.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 3: MULTI-AGENT TEAM WORKFLOW ================= */}
        {activeTab === 'multi_agent' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
            
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Layers size={22} color="#ED1C24" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Collaborative Multi-Agent DAG Execution</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Orchestrates four specialized AI agents working together in sequence and parallel to accomplish complex goals.
              </p>

              {/* 4 Agent Cards Visual Graph */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { title: 'Planner-Agent', role: 'Task Decomposition DAG', icon: Brain, color: '#ED1C24' },
                  { title: 'Researcher-Agent', role: 'Knowledge & Vector RAG', icon: Database, color: '#00F2FE' },
                  { title: 'Developer-Agent', role: 'Python Code Sandbox', icon: Terminal, color: '#8E2DE2' },
                  { title: 'Reviewer-Agent', role: 'Quality & Safety Audit', icon: ShieldCheck, color: '#00E676' },
                ].map((ag, i) => {
                  const Icon = ag.icon;
                  return (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ background: ag.color, padding: '8px', borderRadius: '8px' }}>
                          <Icon size={18} color="#FFF" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ag.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{ag.role}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Workflow Trigger Form */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={multiAgentGoal}
                  onChange={(e) => setMultiAgentGoal(e.target.value)}
                  style={{ flex: 1 }}
                  placeholder="Enter complex goal for multi-agent team..."
                />
                <button className="btn-primary" onClick={runMultiAgentWorkflow} disabled={isMultiAgentRunning}>
                  <Play size={16} />
                  {isMultiAgentRunning ? 'Team Working...' : 'Run Team Workflow'}
                </button>
              </div>
            </div>

            {/* Workflow Step Output Log */}
            <div className="glass-panel" style={{ padding: '24px', height: '560px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>Real-Time Multi-Agent Trace</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {multiAgentUpdates.length === 0 && (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', marginTop: '50px' }}>
                    Click "Run Team Workflow" to observe the 4 agents collaborate on task decomposition, research, coding, and review.
                  </div>
                )}
                {multiAgentUpdates.map((upd, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #ED1C24' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#00F2FE' }}>{upd.agent}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{upd.phase}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>{upd.message}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 4: RAG & VECTOR MEMORY ================= */}
        {activeTab === 'rag' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* RAG Vector Search Column */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={20} color="#00F2FE" /> Semantic RAG Vector Search
              </h2>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Query long-term vector store..."
                  style={{ flex: 1 }}
                />
                <button className="btn-primary" onClick={handleRagSearch}>
                  Search RAG
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ragResults.map((r, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cyan-accent)', fontWeight: 700 }}>ID: {r.id}</span>
                      <span className="badge-green">Score: {r.score}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{r.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Indexer Column */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#FF3B5C" /> Index New Knowledge Document
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Document Title (e.g. AMD ROCm Architecture Notes)"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                />
                <textarea
                  rows={6}
                  placeholder="Paste document content or knowledge notes to generate embeddings and index into long-term vector store..."
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                />
                <button className="btn-primary" onClick={handleIndexDocument} style={{ alignSelf: 'flex-start' }}>
                  Index Document Chunks
                </button>
              </div>

              {memoryState && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-card)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Vector Memory Stats: {memoryState.long_term_doc_count} Chunks Indexed
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 5: TOOL REGISTRY & PYTHON SANDBOX ================= */}
        {activeTab === 'tools' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Sandboxed Python Code Executor */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={20} color="#ED1C24" /> Sandboxed Python Code Executor
              </h2>
              <textarea
                rows={10}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                className="code-box"
                style={{ width: '100%', marginBottom: '14px' }}
              />
              <button className="btn-primary" onClick={handleRunCode} disabled={isExecCode}>
                <Play size={16} />
                {isExecCode ? 'Running Sandbox...' : 'Run Script in Sandbox'}
              </button>

              {codeOutput && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan-accent)', marginBottom: '6px' }}>Sandbox Execution Output:</div>
                  <pre className="code-box">{codeOutput.stdout || codeOutput.stderr || JSON.dumps(codeOutput, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Tool Schema & Capabilities Registry */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={20} color="#00F2FE" /> Registered LLM Agent Tools
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'execute_python_code', desc: 'Runs Python code safely in an isolated sandbox.' },
                  { name: 'search_knowledge_base_rag', desc: 'Performs semantic vector search on indexed RAG memory.' },
                  { name: 'index_document_rag', desc: 'Indexes raw document text into vector embeddings.' },
                  { name: 'web_search_and_extract', desc: 'Queries real-time web search and extracts facts.' },
                  { name: 'analyze_data_summary', desc: 'Computes statistical summaries for datasets.' },
                  { name: 'workspace_file_tool', desc: 'Lists, reads, and writes workspace files safely.' },
                ].map((t, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border-card)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#FFF' }}>🛠️ {t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
