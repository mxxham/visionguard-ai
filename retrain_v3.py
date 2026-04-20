"""
VisionGuard v3 - Full dataset rebuild with balanced classes
Classes: cat=0, dog=1, snake=2, person=3

Balancing strategy:
- Cat:    ~8,000 images (Oxford Cat dataset)
- Dog:    from cat-snake-dog dataset
- Snake:  from cat-snake-dog dataset
- Person: sample 8,000 to match cat count exactly
- Negatives: 300 warehouse frames
"""

import cv2
import shutil
import random
from pathlib import Path
from PIL import Image

random.seed(42)

BASE        = Path(r"C:\Users\asust\Downloads\visionguard")
DATASETS    = BASE / "datasets"
CAT_ROOT    = DATASETS / "cat"
# cat-snake-dog uses ../train/images relative to data.yaml
# so actual image folders are one level UP from the dataset folder
SNAKE_DOG   = DATASETS / "cat-snake-dog"
SNAKE_DOG_IMAGES = DATASETS  # images are at datasets/train, datasets/valid, datasets/test
HUMANS      = DATASETS / "humans"
VIDEO       = BASE / "videos" / "loop.mp4"
OUTPUT      = DATASETS / "merged_v3"
WEIGHTS     = BASE / "yolov8n.pt"

TRAIN_RATIO = 0.8
CLASSES     = ["cat", "dog", "snake", "person"]

TARGET = {
    "cat":    1000,
    "dog":    1000,
    "snake":  1000,
    "person": 1000,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_dirs(path):
    (path / "train" / "images").mkdir(parents=True, exist_ok=True)
    (path / "train" / "labels").mkdir(parents=True, exist_ok=True)
    (path / "val"   / "images").mkdir(parents=True, exist_ok=True)
    (path / "val"   / "labels").mkdir(parents=True, exist_ok=True)


def parse_cat_keypoints(cat_file):
    text = cat_file.read_text().strip().split()
    n = int(text[0])
    coords = list(map(int, text[1:1 + n * 2]))
    xs, ys = coords[0::2], coords[1::2]
    pad = 40
    return max(0, min(xs)-pad), max(0, min(ys)-pad), max(xs)+pad, max(ys)+pad


def pixels_to_yolo(x1, y1, x2, y2, w, h):
    cx = ((x1+x2)/2) / w
    cy = ((y1+y2)/2) / h
    bw = (x2-x1) / w
    bh = (y2-y1) / h
    return f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}"


# ── Step 1: Cat dataset ────────────────────────────────────────────────────────

def add_cats():
    print("\n[CAT] Converting Oxford Cat dataset...")
    pairs = []
    for folder in CAT_ROOT.iterdir():
        if not folder.is_dir():
            continue
        for jpg in folder.glob("*.jpg"):
            cat_f = jpg.with_suffix(jpg.suffix + ".cat")
            if cat_f.exists():
                pairs.append((jpg, cat_f))

    random.shuffle(pairs)
    pairs = pairs[:TARGET["cat"]]
    split = int(len(pairs) * TRAIN_RATIO)

    ok = err = 0
    for i, (jpg, cat_f) in enumerate(pairs):
        dst_split = "train" if i < split else "val"
        img_dst = OUTPUT / dst_split / "images" / jpg.name
        lbl_dst = OUTPUT / dst_split / "labels" / (jpg.stem + ".txt")
        try:
            with Image.open(jpg) as img:
                iw, ih = img.size
            x1, y1, x2, y2 = parse_cat_keypoints(cat_f)
            x2, y2 = min(x2, iw), min(y2, ih)
            label = pixels_to_yolo(x1, y1, x2, y2, iw, ih)
            shutil.copy2(jpg, img_dst)
            lbl_dst.write_text(label + "\n")
            ok += 1
        except Exception as e:
            err += 1

    print(f"  {ok} cat images added ({err} errors)")
    return ok


# ── Step 2: Snake + Dog ────────────────────────────────────────────────────────

def add_snake_dog():
    print("\n[DOG/SNAKE] Merging cat-snake-dog dataset...")

    # data.yaml says ../train/images — so images are at DATASETS/train/images
    # and labels at DATASETS/train/labels
    src_classes = ["cat", "dog", "snake"]  # from data.yaml: nc=3, names=[cat,dog,snake]
    remap = {0: 0, 1: 1, 2: 2}  # cat→0, dog→1, snake→2 (already correct)
    print(f"  Classes: {src_classes}, Remap: {remap}")

    dog_items   = []
    snake_items = []

    # The actual folders are datasets/train, datasets/valid, datasets/test
    for split_name, dst_split in [("train", "train"), ("valid", "val"), ("test", "val")]:
        src_img = SNAKE_DOG / split_name / "images"
        src_lbl = SNAKE_DOG / split_name / "labels"

        if not src_img.exists():
            print(f"  Skipping {split_name} — not found: {src_img}")
            continue

        print(f"  Scanning {src_img}...")
        count = 0
        for img_f in src_img.glob("*.*"):
            lbl_f = src_lbl / (img_f.stem + ".txt")
            if not lbl_f.exists():
                continue
            new_lines = []
            has_dog = has_snake = False
            for line in lbl_f.read_text().strip().splitlines():
                parts = line.strip().split()
                if not parts:
                    continue
                src_id = int(parts[0])
                if src_id in remap:
                    parts[0] = str(remap[src_id])
                    new_lines.append(" ".join(parts))
                    if remap[src_id] == 1:
                        has_dog = True
                    if remap[src_id] == 2:
                        has_snake = True
            if new_lines:
                if has_dog:
                    dog_items.append((img_f, new_lines))
                elif has_snake:
                    snake_items.append((img_f, new_lines))
            count += 1
        print(f"  Scanned {count} images from {split_name}")

    print(f"  Found: {len(dog_items)} dog, {len(snake_items)} snake images")

    for cls_name, items in [("dog", dog_items), ("snake", snake_items)]:
        random.shuffle(items)
        items = items[:TARGET[cls_name]]
        split_idx = int(len(items) * TRAIN_RATIO)
        added = 0
        for i, (img_f, new_lines) in enumerate(items):
            dst_split = "train" if i < split_idx else "val"
            img_dst = OUTPUT / dst_split / "images" / f"sd_{img_f.name}"
            lbl_dst = OUTPUT / dst_split / "labels" / f"sd_{img_f.stem}.txt"
            shutil.copy2(img_f, img_dst)
            lbl_dst.write_text("\n".join(new_lines) + "\n")
            added += 1
        print(f"  {added} {cls_name} images added")


# ── Step 3: Person dataset ─────────────────────────────────────────────────────

def add_persons():
    print(f"\n[PERSON] Merging human dataset — sampling {TARGET['person']} to match cats...")
    all_pairs = []

    for split in ["train", "val"]:
        src_img = HUMANS / "images" / split
        src_lbl = HUMANS / "labels" / split
        if not src_img.exists():
            continue
        for img_f in src_img.glob("*.*"):
            lbl_f = src_lbl / (img_f.stem + ".txt")
            if lbl_f.exists():
                all_pairs.append((img_f, lbl_f))

    random.shuffle(all_pairs)
    all_pairs = all_pairs[:TARGET["person"]]
    split_idx = int(len(all_pairs) * TRAIN_RATIO)

    added = 0
    for i, (img_f, lbl_f) in enumerate(all_pairs):
        dst_split = "train" if i < split_idx else "val"
        new_lines = []
        for line in lbl_f.read_text().strip().splitlines():
            parts = line.strip().split()
            if parts:
                parts[0] = "3"
                new_lines.append(" ".join(parts))
        if new_lines:
            img_dst = OUTPUT / dst_split / "images" / f"hum_{img_f.name}"
            lbl_dst = OUTPUT / dst_split / "labels" / f"hum_{img_f.stem}.txt"
            shutil.copy2(img_f, img_dst)
            lbl_dst.write_text("\n".join(new_lines) + "\n")
            added += 1

    print(f"  {added} person images added")


# ── Step 4: Negative samples ───────────────────────────────────────────────────

def add_negatives(count=300):
    print(f"\n[NEG] Extracting {count} negative frames from video...")
    if not VIDEO.exists():
        print(f"  Video not found: {VIDEO}")
        return

    cap   = cv2.VideoCapture(str(VIDEO))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step  = max(1, total // count)
    n = 0

    for i in range(count):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i * step)
        ret, frame = cap.read()
        if not ret:
            continue
        dst_split = "val" if i % 5 == 0 else "train"
        cv2.imwrite(str(OUTPUT / dst_split / "images" / f"neg_{i:04d}.jpg"), frame)
        (OUTPUT / dst_split / "labels" / f"neg_{i:04d}.txt").write_text("")
        n += 1

    cap.release()
    print(f"  {n} negative frames added")


# ── Step 5: data.yaml ──────────────────────────────────────────────────────────

def write_yaml():
    content = f"""path: {OUTPUT}
train: train/images
val: val/images
nc: {len(CLASSES)}
names: {CLASSES}
"""
    (OUTPUT / "data.yaml").write_text(content)
    print(f"\n  data.yaml written: {CLASSES}")


# ── Step 6: Summary ────────────────────────────────────────────────────────────

def count_by_class(split):
    import collections
    lbl_dir = OUTPUT / split / "labels"
    counts  = collections.Counter()
    for f in lbl_dir.glob("*.txt"):
        for line in f.read_text().strip().splitlines():
            if line.strip():
                counts[int(line.split()[0])] += 1
    return counts


def print_summary():
    print("\n" + "=" * 50)
    print("Dataset Summary")
    print("=" * 50)
    for split in ["train", "val"]:
        counts = count_by_class(split)
        imgs   = len(list((OUTPUT / split / "images").glob("*.*")))
        print(f"\n{split.upper()}: {imgs} images")
        for i, name in enumerate(CLASSES):
            print(f"  {name:10s} (class {i}): {counts.get(i, 0):,} instances")


# ── Step 7: Train ──────────────────────────────────────────────────────────────

def train():
    import os
    os.environ["CUDA_LAUNCH_BLOCKING"] = "1"

    from ultralytics import YOLO
    import torch

    device = "0" if torch.cuda.is_available() else "cpu"
    print(f"\nDevice: {torch.cuda.get_device_name(0) if device == '0' else 'CPU'}")

    model = YOLO(str(WEIGHTS) if WEIGHTS.exists() else "yolov8n.pt")
    model.train(
        data=str(OUTPUT / "data.yaml"),
        epochs=150,
        imgsz=640,
        batch=8,
        device=device,
        name="visionguard_v3",
        project=str(BASE / "runs" / "train"),
        patience=25,
        save=True,
        plots=True,
        val=True,
        workers=0,
        cache=False,
        exist_ok=True,
        mosaic=0.5,
        mixup=0.0,
        cls=1.5,
        box=7.5,
    )

    best_pt  = BASE / "runs" / "train" / "visionguard_v3" / "weights" / "best.pt"
    dst_pt   = BASE / "backend" / "app" / "ml" / "weights" / "best.pt"
    dst_onnx = BASE / "backend" / "app" / "ml" / "weights" / "best.onnx"

    if not best_pt.exists():
        print("Training failed — best.pt not found")
        return

    shutil.copy2(best_pt, dst_pt)
    print(f"✓ PT saved: {dst_pt}")

    print("Exporting ONNX...")
    m = YOLO(str(best_pt))
    m.export(format="onnx", imgsz=640, simplify=False)
    onnx_src = BASE / "runs" / "train" / "visionguard_v3" / "weights" / "best.onnx"
    if onnx_src.exists():
        shutil.copy2(onnx_src, dst_onnx)
        print(f"✓ ONNX saved: {dst_onnx}")

    print("\n✓ Done! Deploy:")
    print("  docker compose down")
    print("  docker compose build --no-cache backend")
    print("  docker compose up")


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("VisionGuard v3 — Perfectly Balanced Dataset")
    print(f"Target per class: {TARGET}")
    print("=" * 60)

    if OUTPUT.exists():
        print(f"\nCleaning: {OUTPUT}")
        shutil.rmtree(OUTPUT)
    make_dirs(OUTPUT)

    add_cats()
    add_snake_dog()
    add_persons()
    add_negatives(300)
    write_yaml()
    print_summary()

    input("\nPress Enter to start training (or Ctrl+C to cancel)...")
    train()