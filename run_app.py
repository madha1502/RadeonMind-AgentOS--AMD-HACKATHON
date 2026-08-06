import os
import sys
import subprocess
import webbrowser
import time

sys.path.insert(0, os.path.dirname(__file__))

def main():
    print("==========================================================================")
    print("  RadeonMind-AgentOS: AMD Radeon GPU-Accelerated Agent Platform")
    print("==========================================================================")
    
    # 1. Start FastAPI Backend Server
    print("[1/2] Starting FastAPI Backend & Hardware Telemetry Server on http://127.0.0.1:8000...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "radeonmind.api.server:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=os.path.dirname(__file__))

    time.sleep(2.0)

    # 2. Start Frontend Dev Server
    print("[2/2] Starting Frontend Vite Server on http://localhost:5173...")
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
    frontend_cmd = "npx vite --port 5173"
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir, shell=True)

    print("\n[OK] Both Backend & Frontend servers are live!")
    print("--> Open http://localhost:5173 in your browser to access the dashboard.")
    print("Press Ctrl+C to stop all servers.\n")

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
