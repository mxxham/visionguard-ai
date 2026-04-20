"""
Merge cat + dog + snake + human datasets with negative samples,
then retrain VisionGuard v2.

Classes:
  0 = cat
  1 = dog
  2 = snake
  3 = person
"""
import cv2
import shutil
import random
from pathlib import Path
from ultralytics import YOLO
import torch

random.seed(42)

BASE       = Path(r"C:\Users\asust\Downloads\visionguard")
DATASET    = BASE / "datasets" / "merged_dataset"
HUMANS     = BASE / "datasets" / "humans"
VIDEO      = BASE / "videos" / "loop.mp4"
WEIGHTS    = BASE / "yolov8n.pt"

CLASSES    = ["cat", "dog", "snake", "person"]


def remap_and_copy(src_img_dir, src_lbl_dir, dst_img_dir, dst_lbl_dir,
                   src_class_id, dst_class_id, prefix=""):
    dst_img_dir.mkdir(parents=True, exist_ok=True)
    dst_lbl_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for img_file in src_img_dir.glob("*.*"):
        lbl_file = src_lbl_dir / (img_file.stem + ".txt")
        if not lbl_file.exists():
            continue
        new_lines = []
        for line in lbl_file.read_text().strip().splitlines():
            parts = line.strip().split()
            if not parts:
                continue
            if int(parts[0]) == src_class_id:
                parts[0] = str(dst_class_id)
            new_lines.append(" ".join(parts))
        if new_lines:
            dst_name = f"{prefix}{img_file.name}"
            shutil.copy2(img_file, dst_img_dir / dst_name)
            (dst_lbl_dir / f"{prefix}{img_file.stem}.txt").write_text(
                "\n".join(new_lines) + "\n"
            )
            count += 1
    return count


def add_humans():
    print("\n[humans] Merging human dataset (class 0 → 3)...")
    for split in ["train", "val"]:
        src_img = HUMANS / "images" / split
        src_lbl = HUMANS / "labels" / split
        dst_img = DATASET / split / "images"
        dst_lbl = DATASET / split / "labels"
        if not src_img.exists():
            print(f"  Skipping {split} — not found: {src_img}")
            continue
        n = remap_and_copy(src_img, src_lbl, dst_img, dst_lbl,
                           src_class_id=0, dst_class_id=3, prefix="hum_")
        print(f"  {split}: {n} images copied")


def extract_negatives(count=300):
    if not VIDEO.exists():
        print(f"  Video not found: {VIDEO}, skipping")
        return
    train_img = DATASET / "train" / "images"
    train_lbl = DATASET / "train" / "labels"
    val_img   = DATASET / "val"   / "images"
    val_lbl   = DATASET / "val"   / "labels"
    for d in [train_img, train_lbl, val_img, val_lbl]:
        d.mkdir(parents=True, exist_ok=True)

    cap   = cv2.VideoCapture(str(VIDEO))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step  = max(1, total // count)
    n_train = n_val = 0

    for i in range(count):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i * step)
        ret, frame = cap.read()
        if not ret:
            continue
        if i % 5 == 0:
            cv2.imwrite(str(val_img   / f"neg_{i:04d}.jpg"), frame)
            (val_lbl   / f"neg_{i:04d}.txt").write_text("")
            n_val += 1
        else:
            cv2.imwrite(str(train_img / f"neg_{i:04d}.jpg"), frame)
            (train_lbl / f"neg_{i:04d}.txt").write_text("")
            n_train += 1

    cap.release()
    print(f"  {n_train} train + {n_val} val negative frames extracted")


def update_data_yaml():
    yaml_content = f"""path: {DATASET}
train: train/images
val: val/images

nc: {len(CLASSES)}
names: {CLASSES}
"""
    (DATASET / "data.yaml").write_text(yaml_content)
    print(f"  data.yaml updated: {CLASSES}")


def count_images(split):
    d = DATASET / split / "images"
    return len(list(d.glob("*.jpg"))) + len(list(d.glob("*.png")))


def retrain():
    device = "0" if torch.cuda.is_available() else "cpu"
    gpu    = torch.cuda.get_device_name(0) if device == "0" else "CPU"
    print(f"\nDevice: {gpu}")

    model = YOLO(str(WEIGHTS) if WEIGHTS.exists() else "yolov8n.pt")
    model.train(
        data=str(DATASET / "data.yaml"),
        epochs=150,
        imgsz=640,
        batch=16 if device == "0" else 8,
        device=device,
        name="visionguard_v2",
        project=str(BASE / "runs" / "train"),
        patience=25,
        save=True,
        plots=True,
        val=True,
        workers=4,
        cache=False,
        exist_ok=True,
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.1,
        cls=1.0,
        box=7.5,
    )

    best_pt  = BASE / "runs" / "train" / "visionguard_v2" / "weights" / "best.pt"
    dst_pt   = BASE / "backend" / "app" / "ml" / "weights" / "best.pt"
    dst_onnx = BASE / "backend" / "app" / "ml" / "weights" / "best.onnx"

    if not best_pt.exists():
        print("Training failed — best.pt not found")
        return

    shutil.copy2(best_pt, dst_pt)
    print(f"✓ PT saved: {dst_pt}")

    print("Exporting ONNX...")
    m = YOLO(str(best_pt))
    m.export(format='onnx', imgsz=640, simplify=False)
    best_onnx = BASE / "runs" / "train" / "visionguard_v2" / "weights" / "best.onnx"
    if best_onnx.exists():
        shutil.copy2(best_onnx, dst_onnx)
        print(f"✓ ONNX saved: {dst_onnx}")

    print("\n✓ Training complete! Deploy with:")
    print("  docker compose down")
    print("  docker compose build --no-cache backend")
    print("  docker compose up")


if __name__ == "__main__":
    print("=" * 60)
    print("VisionGuard v2 — Cat + Dog + Snake + Person")
    print("=" * 60)

    print("\n[1/4] Merging human dataset...")
    add_humans()

    print("\n[2/4] Extracting negative samples...")
    extract_negatives(count=300)

    print("\n[3/4] Updating data.yaml...")
    update_data_yaml()

    print(f"\n[4/4] Dataset ready:")
    print(f"  Train: {count_images('train')} images")
    print(f"  Val:   {count_images('val')} images")
    print(f"  Classes: {CLASSES}")

    print("\nStarting training...")
    retrain()