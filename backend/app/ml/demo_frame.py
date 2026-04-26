"""
Generate synthetic warehouse camera frames using OpenCV drawing primitives.
Used when no real video source is available (demo / restricted hardware mode).
"""
import math
import random
import time
import numpy as np
import cv2


# Palette (BGR)
_BG        = (18, 15, 10)
_FLOOR     = (30, 25, 18)
_SHELF     = (40, 38, 32)
_SHELF_HL  = (55, 52, 44)
_BOX       = (48, 55, 62)
_BOX_ACC   = (38, 45, 55)
_LIGHT     = (80, 90, 100)
_LIGHTPOOL = (28, 30, 26)
_GRID      = (24, 22, 18)
_ALERT_CLR = (38, 38, 220)    # red in BGR
_GREEN     = (90, 200, 60)

W, H = 640, 360


def _draw_background(img: np.ndarray):
    img[:] = _BG
    # Floor
    img[240:, :] = _FLOOR
    # Subtle horizontal grid lines on floor
    for y in range(250, H, 18):
        cv2.line(img, (0, y), (W, y), _GRID, 1)
    # Vertical grid lines
    for x in range(0, W, 60):
        cv2.line(img, (x, 240), (x, H), _GRID, 1)


def _draw_shelf(img, x, y, w, h, shelves=3):
    """Draw a simple shelf unit."""
    cv2.rectangle(img, (x, y), (x+w, y+h), _SHELF, -1)
    # Shelf planks
    step = h // (shelves + 1)
    for i in range(1, shelves + 1):
        sy = y + i * step
        cv2.rectangle(img, (x, sy - 2), (x+w, sy + 2), _SHELF_HL, -1)
    # Side panels
    cv2.rectangle(img, (x, y), (x+4, y+h), _SHELF_HL, -1)
    cv2.rectangle(img, (x+w-4, y), (x+w, y+h), _SHELF_HL, -1)


def _draw_boxes(img, x, y, w, h, shelves=3, rng=None):
    rng = rng or random.Random()
    step = h // (shelves + 1)
    for i in range(1, shelves + 1):
        shelf_y = y + i * step - 2
        bx = x + 6
        while bx < x + w - 10:
            bw = rng.randint(14, 28)
            bh = rng.randint(16, step - 6)
            col = tuple(max(0, min(255, c + rng.randint(-10, 10))) for c in _BOX)
            cv2.rectangle(img, (bx, shelf_y - bh), (bx + bw, shelf_y), col, -1)
            cv2.rectangle(img, (bx, shelf_y - bh), (bx + bw, shelf_y), _BOX_ACC, 1)
            bx += bw + rng.randint(2, 6)


def _draw_overhead_lights(img, t: float):
    """Animated overhead light pools with subtle flicker."""
    for lx in [120, 320, 520]:
        flicker = 0.85 + 0.15 * math.sin(t * 3.7 + lx)
        intensity = int(255 * 0.12 * flicker)
        overlay = img.copy()
        cv2.ellipse(overlay, (lx, 235), (90, 22), 0, 0, 360, (intensity, intensity+5, intensity+8), -1)
        cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)


def _draw_scanlines(img):
    for y in range(0, H, 4):
        img[y, :] = (img[y, :] * 0.88).astype(np.uint8)


def _draw_hud(img, cam_name: str, zone: str, t: float):
    # Top bar
    cv2.rectangle(img, (0, 0), (W, 22), (0, 0, 0), -1)
    # Blinking REC dot
    if int(t * 2) % 2 == 0:
        cv2.circle(img, (10, 11), 5, (38, 38, 220), -1)
    cv2.putText(img, "LIVE", (20, 16), cv2.FONT_HERSHEY_PLAIN, 1.0, (200, 200, 200), 1)
    # Camera name top right
    cv2.putText(img, cam_name, (W - 180, 16), cv2.FONT_HERSHEY_PLAIN, 1.0, (160, 160, 160), 1)
    # Bottom bar
    cv2.rectangle(img, (0, H-22), (W, H), (0, 0, 0), -1)
    ts = time.strftime("%Y-%m-%d  %H:%M:%S")
    cv2.putText(img, ts, (8, H - 7), cv2.FONT_HERSHEY_PLAIN, 0.9, (120, 120, 120), 1)
    cv2.putText(img, zone, (W - 220, H - 7), cv2.FONT_HERSHEY_PLAIN, 0.9, (100, 100, 100), 1)


def _draw_noise(img):
    noise = np.random.randint(0, 6, img.shape, dtype=np.uint8)
    img = cv2.add(img, noise)
    return img


def generate_demo_frame(cam_name: str, zone: str, detection_bbox=None,
                        detection_label: str = "", seed: int = 0) -> np.ndarray:
    """
    Return a 640×360 BGR frame that looks like a warehouse security camera.
    Pass detection_bbox=[x,y,w,h] to draw an alert bounding box.
    seed is used to vary shelf layout per camera.
    """
    img = np.zeros((H, W, 3), dtype=np.uint8)
    rng = random.Random(seed)
    t = time.monotonic()

    _draw_background(img)
    _draw_overhead_lights(img, t)

    # Shelf layout varies by seed
    shelf_configs = [
        (20,  80, 80, 155, 3),
        (115, 60, 90, 175, 4),
        (220, 70, 70, 165, 3),
        (305, 55, 100, 180, 4),
        (420, 75, 80, 160, 3),
        (515, 65, 85, 170, 4),
    ]
    for sx, sy, sw, sh, sn in shelf_configs:
        _draw_shelf(img, sx, sy, sw, sh, sn)
        _draw_boxes(img, sx, sy, sw, sh, sn, rng)

    _draw_scanlines(img)
    img = _draw_noise(img)

    # Detection bbox overlay
    if detection_bbox:
        x, y, w, h = detection_bbox
        x = max(0, min(x, W - 2))
        y = max(0, min(y, H - 2))
        # Blinking: show on/off at 2Hz
        if int(t * 2) % 2 == 0:
            cv2.rectangle(img, (x, y), (x+w, y+h), _ALERT_CLR, 2)
            # Label background
            label_bg_y = max(0, y - 20)
            cv2.rectangle(img, (x, label_bg_y), (x + len(detection_label)*9 + 8, y), _ALERT_CLR, -1)
            cv2.putText(img, detection_label, (x+4, y - 5),
                        cv2.FONT_HERSHEY_PLAIN, 1.0, (255, 255, 255), 1)

    _draw_hud(img, cam_name, zone, t)
    return img