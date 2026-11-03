"""Load faster-whisper on the GPU when possible, else on the CPU.

CTranslate2 (faster-whisper) needs cublas64_12.dll / cudnn on Windows. PyTorch cu12 already ships
them in torch/lib, so we put that folder on the DLL search path instead of installing CUDA.
Import this module before anything that loads CTranslate2, in a process that does not run XTTS
(mixing both CUDA stacks in one process is what scripts/audio/first/align.py avoids).
Set WHISPER_DEVICE=cpu to force the CPU.
"""
import importlib.util
import os
from pathlib import Path


def _torch_dlls():
    spec = importlib.util.find_spec('torch')
    if spec is None or spec.origin is None:
        return None
    lib = Path(spec.origin).parent / 'lib'
    return lib if (lib / 'cublas64_12.dll').exists() or (lib / 'libcublas.so.12').exists() else None


def load_whisper(size, download_root):
    """Return (model, device label)."""
    from faster_whisper import WhisperModel
    if os.environ.get('WHISPER_DEVICE', '').lower() != 'cpu':
        lib = _torch_dlls()
        if lib is not None:
            os.environ['PATH'] = str(lib) + os.pathsep + os.environ.get('PATH', '')
            if hasattr(os, 'add_dll_directory'):
                os.add_dll_directory(str(lib))
        try:
            import ctranslate2
            if ctranslate2.get_cuda_device_count() > 0:
                model = WhisperModel(size, device='cuda', compute_type='float16', download_root=str(download_root))
                # The DLLs load lazily: run one tiny encode now so a missing library falls back here.
                import numpy as np
                list(model.transcribe(np.zeros(16000, dtype=np.float32), language='fr')[0])
                return model, 'cuda float16'
        except Exception as error:  # missing DLL, out of memory…
            print(f'Whisper GPU indisponible ({str(error)[:80]}), passage au CPU.', flush=True)
    model = WhisperModel(size, device='cpu', compute_type='int8', cpu_threads=min(8, os.cpu_count() or 1), download_root=str(download_root))
    return model, 'cpu int8'
