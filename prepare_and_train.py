"""
Convert Oxford Cat Dataset (.jpg + .cat keypoints) to YOLOv8 format
then merge with existing cat-snake-dog dataset and train.

Usage: python prepare_and_train.py
"""

import os
import shutil
import random
from pathlib import Path
from PIL import Image

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE       = Path(r"C:\Users\asust\Downloads\visionguard\datasets")
CAT_ROOT   = BASE / "cat"
SNAKE_DOG  = BASE / "cat-snake-dog"
OUTPUT     = BASE / "merged_dataset"
WEIGHTS    = Path(r"C:\Users\asust\Downloads\visionguard\yolov8n.pt")

# ── Config ─────────────────────────────────────────────────────────────────────
TRAIN_RATIO = 0.8
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# Class map — we'll merge all datasets under these class IDs
# The cat-snake-dog dataset already has its own data.yaml, we'll read it
# and add cat (class 0) on top
CLASSES = ["cat", "dog", "snake"]   # cat=0, dog=1, snake=2


def parse_cat_file(cat_file: Path):
    """Parse .cat keypoint file → bounding box (x_min, y_min, x_max, y_max) in pixels."""
    text = cat_file.read_text().strip().split()
    n = int(text[0])
    coords = list(map(int, text[1:1 + n * 2]))
    xs = coords[0::2]
    ys = coords[1::2]
    pad = 30  # add padding around face keypoints
    x_min = max(0, min(xs) - pad)
    y_min = max(0, min(ys) - pad)
    x_max = max(xs) + pad
    y_max = max(ys) + pad
    return x_min, y_min, x_max, y_max


def pixels_to_yolo(x_min, y_min, x_max, y_max, img_w, img_h):
    """Convert pixel bbox to YOLO normalized format (cx, cy, w, h)."""
    cx = ((x_min + x_max) / 2) / img_w
    cy = ((y_min + y_max) / 2) / img_h
    w  = (x_max - x_min) / img_w
    h  = (y_max - y_min) / img_h
    return cx, cy, w, h


def collect_cat_images():
    """Walk all CAT_XX and cats folders, return list of (jpg_path, cat_path)."""
    pairs = []
    for folder in CAT_ROOT.iterdir():
        if not folder.is_dir():
            continue
        for jpg in folder.glob("*.jpg"):
            cat_file = jpg.with_suffix(jpg.suffix + ".cat")
            if cat_file.exists():
                pairs.append((jpg, cat_file))
    print(f"Found {len(pairs)} cat images with keypoints")
    return pairs


def write_yolo_label(label_path: Path, class_id: int, cx, cy, w, h):
    label_path.write_text(f"{class_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")


def prepare_cat_split(pairs, train_dir, val_dir):
    """Convert cat dataset and copy into train/val splits."""
    random.shuffle(pairs)
    split = int(len(pairs) * TRAIN_RATIO)
    train_pairs = pairs[:split]
    val_pairs   = pairs[split:]

    errors = 0
    for split_name, split_pairs in [("train", train_pairs), ("val", val_pairs)]:
        img_out = (train_dir if split_name == "train" else val_dir) / "images"
        lbl_out = (train_dir if split_name == "train" else val_dir) / "labels"
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for jpg, cat_file in split_pairs:
            try:
                with Image.open(jpg) as img:
                    img_w, img_h = img.size

                x_min, y_min, x_max, y_max = parse_cat_file(cat_file)
                x_max = min(x_max, img_w)
                y_max = min(y_max, img_h)

                cx, cy, w, h = pixels_to_yolo(x_min, y_min, x_max, y_max, img_w, img_h)

                dst_img = img_out / jpg.name
                dst_lbl = lbl_out / (jpg.stem + ".txt")

                shutil.copy2(jpg, dst_img)
                write_yolo_label(dst_lbl, 0, cx, cy, w, h)  # class 0 = cat

            except Exception as e:
                errors += 1
                print(f"  Skipping {jpg.name}: {e}")

    print(f"Cat images prepared (errors: {errors})")
    return len(train_pairs), len(val_pairs)


def merge_snake_dog(train_dir, val_dir):
    """Copy snake/dog images+labels from cat-snake-dog dataset, remapping class IDs."""
    # Read existing data.yaml to get class names
    yaml_path = SNAKE_DOG / "data.yaml"
    if not yaml_path.exists():
        print("cat-snake-dog data.yaml not found, skipping merge")
        return

    # Parse class names from yaml
    src_classes = []
    for line in yaml_path.read_text().splitlines():
        line = line.strip()
        if line.startswith("- "):
            src_classes.append(line[2:].strip().lower())
    print(f"cat-snake-dog classes: {src_classes}")

    # Build remap: src_class_id → our_class_id
    remap = {}
    for i, name in enumerate(src_classes):
        for j, our_name in enumerate(CLASSES):
            if our_name in name or name in our_name:
                remap[i] = j
                break
    print(f"Class remap: {remap}")

    for split in ["train", "valid", "val"]:
        src_img = SNAKE_DOG / split / "images"
        src_lbl = SNAKE_DOG / split / "labels"
        if not src_img.exists():
            continue

        dst_split = "val" if split in ["valid", "val"] else "train"
        dst_img = (train_dir if dst_split == "train" else val_dir) / "images"
        dst_lbl = (train_dir if dst_split == "train" else val_dir) / "labels"
        dst_img.mkdir(parents=True, exist_ok=True)
        dst_lbl.mkdir(parents=True, exist_ok=True)

        count = 0
        for img_file in src_img.glob("*.*"):
            lbl_file = src_lbl / (img_file.stem + ".txt")
            if not lbl_file.exists():
                continue

            # Remap class IDs in label
            new_lines = []
            for line in lbl_file.read_text().strip().splitlines():
                parts = line.split()
                if not parts:
                    continue
                src_id = int(parts[0])
                if src_id in remap:
                    parts[0] = str(remap[src_id])
                    new_lines.append(" ".join(parts))

            if new_lines:
                dst_name = f"sd_{img_file.name}"
                shutil.copy2(img_file, dst_img / dst_name)
                (dst_lbl / f"sd_{img_file.stem}.txt").write_text("\n".join(new_lines) + "\n")
                count += 1

        print(f"  Copied {count} images from {split} split")


def write_data_yaml(output_dir: Path):
    yaml_content = f"""path: {output_dir}
train: train/images
val: val/images

nc: {len(CLASSES)}
names: {CLASSES}
"""
    (output_dir / "data.yaml").write_text(yaml_content)
    print(f"Written data.yaml to {output_dir / 'data.yaml'}")


def count_images(directory: Path):
    return len(list(directory.glob("**/*.jpg"))) + len(list(directory.glob("**/*.png")))


def main():
    print("=" * 60)
    print("VisionGuard Dataset Preparation")
    print("=" * 60)

    train_dir = OUTPUT / "train"
    val_dir   = OUTPUT / "val"

    # Clean output
    if OUTPUT.exists():
        print(f"Cleaning existing output: {OUTPUT}")
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)

    # Step 1: Convert cat dataset
    print("\n[1/4] Converting cat keypoint dataset...")
    pairs = collect_cat_images()
    n_train, n_val = prepare_cat_split(pairs, train_dir, val_dir)
    print(f"  Cat: {n_train} train, {n_val} val")

    # Step 2: Merge snake/dog dataset
    print("\n[2/4] Merging cat-snake-dog dataset...")
    merge_snake_dog(train_dir, val_dir)

    # Step 3: Write data.yaml
    print("\n[3/4] Writing data.yaml...")
    write_data_yaml(OUTPUT)

    # Step 4: Summary
    total_train = count_images(train_dir / "images")
    total_val   = count_images(val_dir / "images")
    print(f"\n[4/4] Dataset ready!")
    print(f"  Train: {total_train} images")
    print(f"  Val:   {total_val} images")
    print(f"  Classes: {CLASSES}")
    print(f"  Output: {OUTPUT}")

    # Step 5: Train
    print("\n" + "=" * 60)
    print("Starting YOLOv8 Training...")
    print("=" * 60)

    try:
        from ultralytics import YOLO
        import torch

        device = "0" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {device}")
        if device == "cpu":
            print("⚠ No GPU detected — training on CPU (slower)")
            batch = 8
        else:
            print(f"✓ GPU: {torch.cuda.get_device_name(0)}")
            batch = 16

        model = YOLO(str(WEIGHTS) if WEIGHTS.exists() else "yolov8n.pt")

        results = model.train(
            data=str(OUTPUT / "data.yaml"),
            epochs=100,
            imgsz=640,
            batch=batch,
            device=device,
            name="visionguard_v1",
            project=str(Path(r"C:\Users\asust\Downloads\visionguard\runs\train")),
            patience=20,           # early stopping
            save=True,
            plots=True,
            val=True,
            workers=4,
            cache=False,
            exist_ok=True,
        )

        best_weights = Path(r"C:\Users\asust\Downloads\visionguard\runs\train\visionguard_v1\weights\best.pt")
        dest = Path(r"C:\Users\asust\Downloads\visionguard\backend\app\ml\weights\best.pt")

        if best_weights.exists():
            shutil.copy2(best_weights, dest)
            print(f"\n✓ Trained model copied to: {dest}")
            print("Rebuild Docker to deploy: docker compose build --no-cache backend && docker compose up")
        else:
            print(f"\nTraining done. Copy weights manually from: runs/train/visionguard_v1/weights/best.pt")

    except ImportError:
        print("\nultralytics not installed. Run:")
        print("  pip install ultralytics")
    except Exception as e:
        print(f"\nTraining error: {e}")
        raise


if __name__ == "__main__":
    main()