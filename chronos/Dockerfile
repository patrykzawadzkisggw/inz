FROM python:3.11

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt ./

ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefer-binary --extra-index-url ${TORCH_INDEX} -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]
