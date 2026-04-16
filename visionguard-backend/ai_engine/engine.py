import cv2
import time
from ultralytics import YOLO
from sqlmodel import Session
from app.core.db import engine
from app.services.alert_service import should_trigger_alert
from app.models.pest import PestSighting, DetectionLog

# Load the model (Ensure you have yolov8n.pt in the same folder or it will download automatically)
model = YOLO("yolov8n.pt") 

# Configuration
VIDEO_SOURCE = "warehouse_loop.mp4"  # Path to your test video
CONF_THRESHOLD = 0.65
TARGET_CLASSES = ['snake', 'cat', 'gecko'] # Ensure your model classes match these

def run_inference():
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    
    if not cap.isOpened():
        print("Error: Could not open video source.")
        return

    print("VisionGuard AI Engine Started...")

    while True:
        ret, frame = cap.read()
        
        # Looping logic: If video ends, reset to frame 0
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        # Run YOLOv8 tracking
        results = model.track(frame, persist=True, conf=CONF_THRESHOLD, verbose=False)

        if results[0].boxes:
            for box in results[0].boxes:
                # Get class name and confidence
                class_id = int(box.cls[0])
                label = model.names[class_id]
                conf = float(box.conf[0])

                # Process only if it's one of our targets
                if label in TARGET_CLASSES:
                    with Session(engine) as session:
                        # 1. Always log the raw detection for the audit trail
                        log = DetectionLog(species=label, confidence=conf)
                        session.add(log)
                        
                        # 2. Check Deduplication Logic (30-second window)
                        if should_trigger_alert(session, label):
                            print(f"ALARM: {label} detected with {conf:.2f} confidence!")
                            
                            # Save snapshot for evidence
                            timestamp = int(time.time())
                            img_name = f"alert_{label}_{timestamp}.jpg"
                            cv2.imwrite(f"app/static/alerts/{img_name}", frame)

                            # Save to Database
                            new_sighting = PestSighting(
                                species=label,
                                confidence=conf,
                                image_path=img_name
                            )
                            session.add(new_sighting)
                        
                        session.commit()

        # Optional: Show the video feed on your laptop screen
        annotated_frame = results[0].plot()
        cv2.imshow("VisionGuard AI - Warehouse Monitor", annotated_frame)

        # Press 'q' to stop the simulation
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_inference()