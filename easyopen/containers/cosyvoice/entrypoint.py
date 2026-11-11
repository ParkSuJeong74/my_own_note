import os
import sys
from pathlib import Path

model_dir = Path(os.environ["COSYVOICE_MODEL_DIR"])
required_files = (
    "cosyvoice3.yaml",
    "flow.pt",
    "hift.pt",
    "llm.pt",
    "speech_tokenizer_v3.onnx",
)
missing = [name for name in required_files if not (model_dir / name).is_file()]
if missing:
    print(f"[EasyOpen] 승인된 CosyVoice 모델 파일이 없습니다: {', '.join(missing)}", file=sys.stderr, flush=True)
    raise SystemExit(78)
print("[EasyOpen] 이미지에 포함된 검증 모델을 확인했습니다. 로컬 Web UI를 시작합니다.", flush=True)
os.chdir("/opt/CosyVoice")
os.execv(
    sys.executable,
    [sys.executable, "webui.py", "--port", "50000", "--model_dir", str(model_dir)],
)
