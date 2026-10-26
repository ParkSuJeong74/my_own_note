import os
import sys
from huggingface_hub import snapshot_download

model_dir = os.environ["COSYVOICE_MODEL_DIR"]
print("[EasyOpen] 검증된 CosyVoice 모델을 확인하고 있습니다.", flush=True)
snapshot_download(
    repo_id=os.environ["COSYVOICE_MODEL_REPO"],
    revision=os.environ["COSYVOICE_MODEL_REVISION"],
    local_dir=model_dir,
)
print("[EasyOpen] 모델 준비를 마쳤습니다. 로컬 Web UI를 시작합니다.", flush=True)
os.chdir("/opt/CosyVoice")
os.execv(
    sys.executable,
    [sys.executable, "webui.py", "--port", "50000", "--model_dir", model_dir],
)
