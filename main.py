from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image
import numpy as np
import io

app = FastAPI()
model = YOLO("custom_yolo.pt")  # pt 모델 로드
classes = model.names  # 자동으로 클래스 이름 로드됨

def transform_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(image)

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        img = transform_image(image_data)

        results = model(img)
        boxes = results[0].boxes

        if boxes is None or len(boxes) == 0:
            return {"class": "none", "probability": 0.0}

        # 가장 높은 confidence 하나만
        top = boxes.conf.argmax().item()
        cls_id = int(boxes.cls[top].item())
        conf = float(boxes.conf[top].item())
        class_name = classes[cls_id]

        return {"class": class_name, "probability": conf}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})