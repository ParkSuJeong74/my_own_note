import os
import subprocess
from huggingface_hub import snapshot_download

model_dir = os.environ["COSYVOICE_MODEL_DIR"]
snapshot_download(
    repo_id=os.environ["COSYVOICE_MODEL_REPO"],
    revision=os.environ["COSYVOICE_MODEL_REVISION"],
    local_dir=model_dir,
)
subprocess.run(
    ["python", "webui.py", "--port", "50000", "--model_dir", model_dir],
    cwd="/opt/CosyVoice",
    check=True,
)
