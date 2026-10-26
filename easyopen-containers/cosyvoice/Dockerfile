FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04 AS builder

ARG COSYVOICE_COMMIT=074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc
ARG MINIFORGE_VERSION=24.9.2-0
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONUNBUFFERED=1 \
    PIP_ROOT_USER_ACTION=ignore \
    PATH=/opt/conda/envs/cosyvoice/bin:/opt/conda/bin:$PATH \
    PYTHONPATH=/opt/CosyVoice:/opt/CosyVoice/third_party/Matcha-TTS \
    COSYVOICE_MODEL_DIR=/models/Fun-CosyVoice3-0.5B-2512 \
    COSYVOICE_MODEL_REPO=FunAudioLLM/Fun-CosyVoice3-0.5B-2512 \
    COSYVOICE_MODEL_REVISION=29e01c4e8d000f4bcd70751be16fa94bf3d85a18

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl ffmpeg git git-lfs libsox-dev sox unzip wget && \
    rm -rf /var/lib/apt/lists/* && git lfs install

RUN wget --quiet "https://github.com/conda-forge/miniforge/releases/download/${MINIFORGE_VERSION}/Miniforge3-${MINIFORGE_VERSION}-Linux-x86_64.sh" -O /tmp/miniforge.sh && \
    bash /tmp/miniforge.sh -b -p /opt/conda && rm /tmp/miniforge.sh && \
    conda create -y -n cosyvoice python=3.11 pip && conda clean -afy

RUN git clone --filter=blob:none https://github.com/QwenAudio/CosyVoice.git /opt/CosyVoice && \
    cd /opt/CosyVoice && git checkout "${COSYVOICE_COMMIT}" && git submodule update --init --recursive

WORKDIR /opt/CosyVoice

RUN conda install -y -n cosyvoice -c conda-forge pynini=2.1.5 && conda clean -afy

RUN /opt/conda/envs/cosyvoice/bin/python -m pip install --no-cache-dir \
      setuptools==84.0.0 wheel==0.48.0 numpy==1.26.4

COPY security-requirements.txt /opt/easyopen/security-requirements.txt

RUN /opt/conda/envs/cosyvoice/bin/python -m pip install --no-cache-dir \
      --index-url https://download.pytorch.org/whl/cu124 \
      torch==2.6.0 torchaudio==2.6.0 && \
    /opt/conda/envs/cosyvoice/bin/python -m pip install --no-cache-dir \
      -r /opt/easyopen/security-requirements.txt && \
    /opt/conda/envs/cosyvoice/bin/python -m pip check && \
    /opt/conda/envs/cosyvoice/bin/python -c "import diffusers, fastapi, gradio, lightning, modelscope, onnx, PIL, tiktoken, torch, torchaudio, transformers, whisper" && \
    conda clean -afy

FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONUNBUFFERED=1 \
    PIP_ROOT_USER_ACTION=ignore \
    PATH=/opt/conda/envs/cosyvoice/bin:$PATH \
    PYTHONPATH=/opt/CosyVoice:/opt/CosyVoice/third_party/Matcha-TTS \
    COSYVOICE_MODEL_DIR=/models/Fun-CosyVoice3-0.5B-2512 \
    COSYVOICE_MODEL_REPO=FunAudioLLM/Fun-CosyVoice3-0.5B-2512 \
    COSYVOICE_MODEL_REVISION=29e01c4e8d000f4bcd70751be16fa94bf3d85a18

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
      ca-certificates ffmpeg libsox-dev sox && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/conda/envs/cosyvoice /opt/conda/envs/cosyvoice
COPY --from=builder /opt/CosyVoice /opt/CosyVoice
COPY entrypoint.py /opt/easyopen/entrypoint.py
WORKDIR /opt/CosyVoice
EXPOSE 50000
ENTRYPOINT ["python", "/opt/easyopen/entrypoint.py"]
