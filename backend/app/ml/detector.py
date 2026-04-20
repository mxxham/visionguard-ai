import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

CLASS_MAP = {
    "cat":       ("Stray Cat",  "moderate"),
    "dog":       ("Stray Dog",  "moderate"),
    "snake":     ("Snake",      "critical"),
    "cobra":     ("King Cobra", "critical"),
    "python":    ("Python",     "critical"),
    "rat":       ("Rat",        "moderate"),
    "mouse":     ("Mouse",      "moderate"),
    "cockroach": ("Cockroach",  "moderate"),
    "mosquito":  ("Mosquito",   "moderate"),
    "pest":      ("Pest",       "moderate"),
    "gecko":     ("Gecko",      "low"),
    "lizard":    ("Lizard",     "low"),
    "bird":      ("Bird",       "low"),
    "person":    ("Person",     "low"),
    "other":     ("Unknown",    "low"),
}

LABEL_GROUP = {
    "snake": "SNAKE", "cobra": "SNAKE", "python": "SNAKE",
    "cat": "CAT", "dog": "DOG",
    "rat": "RAT", "mouse": "RAT",
    "cockroach": "PEST", "mosquito": "PEST", "pest": "PEST",
    "gecko": "GECKO", "lizard": "GECKO",
    "bird": "OTHER", "person": "OTHER",
}


class VisionGuardDetector:
    def __init__(self, model_path: str, confidence_threshold: float = 0.45):
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.model_path = model_path
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            pt_path   = Path(self.model_path)
            onnx_path = pt_path.with_suffix('.onnx')

            if onnx_path.exists():
                self.model = YOLO(str(onnx_path), task='detect')
                logger.info(f"Model loaded from ONNX: {onnx_path}")
            elif pt_path.exists():
                self.model = YOLO(str(pt_path), task='detect')
                logger.info(f"Model loaded from PT: {pt_path}")
            else:
                logger.warning("No weights found, using base yolov8n.pt")
                self.model = YOLO("yolov8n.pt", task='detect')
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None

    def predict(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        if self.model is None:
            return []
        try:
            results = self.model.predict(
                source=frame,
                conf=self.confidence_threshold,
                verbose=False,
                stream=False,
                task='detect',
            )
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return []

        detections = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id    = int(box.cls[0])
                conf      = float(box.conf[0])
                raw_label = result.names[cls_id].lower()
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                bbox = [int(x1), int(y1), int(x2 - x1), int(y2 - y1)]
                species, severity = CLASS_MAP.get(raw_label, CLASS_MAP["other"])
                label_group = LABEL_GROUP.get(raw_label, "OTHER")
                detections.append({
                    "species":     species,
                    "label":       f"{label_group} {conf:.2f}",
                    "label_group": label_group,
                    "raw_class":   raw_label,
                    "confidence":  round(conf, 4),
                    "severity":    severity,
                    "bbox":        bbox,
                })
        return detections

    @property
    def is_loaded(self):
        return self.model is not None


_detector = None


def get_detector(model_path: str = "app/ml/weights/best.pt",
                 confidence_threshold: float = 0.45) -> VisionGuardDetector:
    global _detector
    if _detector is None:
        _detector = VisionGuardDetector(model_path, confidence_threshold)
    return _detector