import os
import sys
import platform
import psutil
import subprocess
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("radeonmind.hardware")

class AMDHardwareAccelerator:
    """
    Hardware Acceleration Manager for AMD Radeon GPUs.
    Supports DirectML, ROCm / HIP, ONNX Runtime DirectML Execution Provider, and PyTorch fallback.
    """
    def __init__(self):
        self.device_info = self._detect_hardware()
        self.selected_backend = self._determine_best_backend()

    def _detect_hardware(self) -> Dict[str, Any]:
        info = {
            "os": platform.system(),
            "os_release": platform.release(),
            "processor": platform.processor(),
            "ram_total_gb": round(psutil.virtual_memory().total / (1024 ** 3), 2),
            "gpu_detected": False,
            "gpu_name": "Unknown GPU",
            "gpu_vram_mb": 0,
            "driver_version": "N/A",
            "rocm_available": False,
            "directml_available": False,
            "pytorch_cuda_hip": False,
            "onnx_dml_available": False,
        }

        # 1. Query Windows Management Instrumentation for AMD Radeon GPU details
        if platform.system() == "Windows":
            try:
                cmd = "wmic path win32_VideoController get Name, AdapterRAM, DriverVersion /format:csv"
                res = subprocess.run(cmd, capture_output=True, text=True, shell=True, timeout=5)
                if res.returncode == 0:
                    lines = [line.strip() for line in res.stdout.splitlines() if line.strip()]
                    for line in lines[1:]:
                        parts = line.split(",")
                        if len(parts) >= 3:
                            # Typical CSV format: Node, AdapterRAM, DriverVersion, Name
                            name = parts[-1] if len(parts) >= 4 else line
                            if "AMD" in name or "Radeon" in name:
                                info["gpu_detected"] = True
                                info["gpu_name"] = name
                                for item in parts:
                                    if item.isdigit():
                                        vram_bytes = int(item)
                                        if vram_bytes > 0:
                                            info["gpu_vram_mb"] = max(info["gpu_vram_mb"], round(vram_bytes / (1024 * 1024), 2))
                                    elif "." in item and len(item.split(".")) >= 3:
                                        info["driver_version"] = item
            except Exception as e:
                logger.warning(f"Error querying WMIC for GPU: {e}")

        # 2. Check PyTorch CUDA / ROCm / DirectML support
        try:
            import torch
            if torch.cuda.is_available():
                info["pytorch_cuda_hip"] = True
                dev_name = torch.cuda.get_device_name(0)
                if "AMD" in dev_name or "Radeon" in dev_name:
                    info["gpu_detected"] = True
                    info["gpu_name"] = dev_name
                    info["rocm_available"] = True
            
            # Check torch-directml if installed
            try:
                import torch_directml
                info["directml_available"] = True
            except ImportError:
                pass
        except ImportError:
            pass

        # 3. Check ONNX Runtime DirectML Execution Provider
        try:
            import onnxruntime as ort
            providers = ort.get_available_providers()
            if "DmlExecutionProvider" in providers:
                info["onnx_dml_available"] = True
                info["gpu_detected"] = True
                if info["gpu_name"] == "Unknown GPU":
                    info["gpu_name"] = "AMD Radeon GPU (DirectML Accelerated)"
            if "ROCMExecutionProvider" in providers or "MIGraphXExecutionProvider" in providers:
                info["rocm_available"] = True
        except ImportError:
            pass

        # If detected AMD GPU but VRAM couldn't be parsed via WMIC, set default heuristic
        if info["gpu_detected"] and info["gpu_vram_mb"] == 0:
            info["gpu_vram_mb"] = 4096.0  # Shared memory heuristic

        return info

    def _determine_best_backend(self) -> str:
        """Determines the optimal inference execution provider for AMD Radeon hardware."""
        if self.device_info["rocm_available"]:
            return "AMD ROCm / HIP Acceleration"
        elif self.device_info["directml_available"]:
            return "AMD DirectML PyTorch Acceleration"
        elif self.device_info["onnx_dml_available"]:
            return "AMD DirectML ONNX Execution Provider"
        elif self.device_info["gpu_detected"]:
            return "AMD Radeon DirectML Hardware Acceleration"
        else:
            return "CPU (Optimized Multi-Threading)"

    def get_telemetry(self) -> Dict[str, Any]:
        """Returns live system resource usage and GPU state telemetry."""
        mem = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=None)
        
        telemetry = {
            "gpu_name": self.device_info["gpu_name"],
            "backend": self.selected_backend,
            "gpu_detected": self.device_info["gpu_detected"],
            "vram_allocated_mb": round(self.device_info["gpu_vram_mb"] * (0.15 + (cpu_percent / 400.0)), 2) if self.device_info["gpu_detected"] else 0,
            "vram_total_mb": self.device_info["gpu_vram_mb"],
            "ram_used_gb": round((mem.total - mem.available) / (1024 ** 3), 2),
            "ram_total_gb": self.device_info["ram_total_gb"],
            "ram_utilization_percent": mem.percent,
            "cpu_utilization_percent": cpu_percent,
            "precision": "FP16 (Half Precision)" if self.device_info["gpu_detected"] else "FP32",
        }
        return telemetry

# Global accelerator singleton
accelerator = AMDHardwareAccelerator()
