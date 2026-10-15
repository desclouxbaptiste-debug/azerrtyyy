FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV CLIPZO_HOST=0.0.0.0 \
    CLIPZO_PORT=8000 \
    CLIPZO_DATA_DIR=/data \
    PYTHONUNBUFFERED=1

# /data keeps the generated shorts, the Hugging Face cache keeps the Whisper model between restarts
VOLUME ["/data", "/root/.cache/huggingface"]
EXPOSE 8000
CMD ["python", "-m", "server"]
