FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libspatialindex-dev \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip \
  && pip install \
    BabelDOC==0.5.22 \
    fastapi \
    uvicorn[standard] \
    python-multipart

WORKDIR /app
COPY server.py /app/server.py
COPY result_files.py /app/result_files.py
ENV PORT=7860
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
