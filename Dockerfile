FROM python:3.10-slim

WORKDIR /app

# 시스템 패키지 설치: libgl1-mesa-glx, libglib2.0-0, git 추가
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 나머지 파일 복사
COPY . .

# 모델 파일 복사
COPY custom_yolo.pt /app/

# FastAPI 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]