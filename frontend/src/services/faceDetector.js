/**
 * SmartAssess proctoring vision engine.
 *
 * Uses MediaPipe's BlazeFace short-range detector — a real ML model that works
 * across skin tones, lighting and camera quality.
 *
 * This replaces an earlier hand-rolled skin-chroma heuristic that, in practice,
 * detected almost nothing: it required 5% of the frame to match a narrow RGB
 * range, then a blob passing several size and variance thresholds. It also
 * depended on the `FaceDetector` browser API, which is unavailable in Chrome
 * and Edge on Windows unless an experimental flag is set — so on most machines
 * nothing was ever detected and the exam could never be started.
 *
 * The model and WASM runtime are served from our own origin (`public/`), not a
 * CDN: school networks routinely block third-party CDNs.
 */
/* MediaPipe is imported dynamically inside init(): it is ~150 KB of JS on top
   of the WASM runtime, and only the exam screen ever needs it. Keeping it out
   of the main bundle means login and the dashboards stay light. */

const WASM_PATH = `${import.meta.env.BASE_URL || "/"}mediapipe-wasm`.replace(/\/{2,}/g, "/");
const MODEL_PATH = `${import.meta.env.BASE_URL || "/"}models/blaze_face_short_range.tflite`.replace(
  /\/{2,}/g,
  "/"
);

/** Engine lifecycle: nothing → loading → ready | unavailable */
export const ENGINE = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  UNAVAILABLE: "unavailable",
};

const CENTER_TOLERANCE = 0.34; // fraction of frame width/height from centre
const MIN_CONFIDENCE = 0.4;

const result = (over = {}) => ({
  faces: [],
  faceCount: 0,
  status: "no_face",
  isCentered: false,
  lightingOk: true,
  engine: ENGINE.READY,
  message: "No face detected — move into the camera frame",
  ...over,
});

export class FaceDetectorEngine {
  constructor() {
    this.detector = null;
    this.state = ENGINE.IDLE;
    this.error = null;
    this.loadPromise = null;
    this.lastTimestamp = -1;
    this.brightnessCanvas = null;
    this.brightnessCtx = null;
  }

  /**
   * Load the model. Safe to call repeatedly — the first call owns the work and
   * everyone else awaits the same promise.
   */
  async init() {
    if (this.state === ENGINE.READY) return true;
    if (this.loadPromise) return this.loadPromise;

    this.state = ENGINE.LOADING;
    this.loadPromise = (async () => {
      try {
        const { FilesetResolver, FaceDetector: MpFaceDetector } = await import(
          "@mediapipe/tasks-vision"
        );

        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

        const build = (delegate) =>
          MpFaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_PATH, delegate },
            runningMode: "VIDEO",
            minDetectionConfidence: MIN_CONFIDENCE,
            minSuppressionThreshold: 0.3,
          });

        try {
          // GPU is materially faster; some Windows drivers refuse it, so fall
          // back to CPU rather than failing outright.
          this.detector = await build("GPU");
        } catch (gpuErr) {
          console.warn("[proctoring] GPU delegate unavailable, using CPU:", gpuErr?.message);
          this.detector = await build("CPU");
        }

        this.state = ENGINE.READY;
        return true;
      } catch (err) {
        console.error("[proctoring] Face detection engine failed to load:", err);
        this.error = err?.message || String(err);
        this.state = ENGINE.UNAVAILABLE;
        return false;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  get isReady() {
    return this.state === ENGINE.READY && Boolean(this.detector);
  }

  /** Rough frame brightness, sampled small — used only for a lighting hint. */
  #brightness(videoEl) {
    try {
      if (!this.brightnessCanvas) {
        this.brightnessCanvas = document.createElement("canvas");
        this.brightnessCanvas.width = 32;
        this.brightnessCanvas.height = 24;
        this.brightnessCtx = this.brightnessCanvas.getContext("2d", {
          willReadFrequently: true,
        });
      }
      if (!this.brightnessCtx) return 128;
      this.brightnessCtx.drawImage(videoEl, 0, 0, 32, 24);
      const { data } = this.brightnessCtx.getImageData(0, 0, 32, 24);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return sum / (data.length / 4);
    } catch {
      return 128;
    }
  }

  /**
   * Analyse one video frame.
   * Always resolves — a detection failure must never break the exam loop.
   */
  async detectFaces(videoEl, options = {}) {
    const { simulationMode = "none" } = options;

    if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) {
      return result({
        status: "no_feed",
        lightingOk: false,
        engine: this.state,
        message: "Camera stream initialising…",
      });
    }

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;

    const simulated = this.#simulate(simulationMode, vw, vh);
    if (simulated) return simulated;

    if (this.state === ENGINE.IDLE) {
      this.init(); // fire and forget; reported as "loading" until it resolves
    }

    if (this.state === ENGINE.LOADING) {
      return result({
        status: "loading",
        engine: ENGINE.LOADING,
        message: "Loading face-detection model…",
      });
    }

    if (!this.isReady) {
      // Degraded, but explicit. The UI must not silently claim verification.
      return result({
        status: "engine_unavailable",
        engine: ENGINE.UNAVAILABLE,
        faceCount: null,
        message: "Face detection unavailable — camera recording only",
      });
    }

    try {
      // detectForVideo requires strictly increasing timestamps.
      let ts = Math.round(performance.now());
      if (ts <= this.lastTimestamp) ts = this.lastTimestamp + 1;
      this.lastTimestamp = ts;

      const output = this.detector.detectForVideo(videoEl, ts);
      const detections = output?.detections || [];

      const avgBrightness = this.#brightness(videoEl);
      const lightingOk = avgBrightness >= 22 && avgBrightness <= 248;

      if (detections.length === 0) {
        return result({
          lightingOk,
          message: lightingOk
            ? "No face detected — move into the camera frame"
            : "No face detected — the room may be too dark",
        });
      }

      // Largest box first: that is the candidate, anyone else is a violation.
      const faces = detections
        .map((d) => {
          const b = d.boundingBox;
          return {
            x: Math.max(0, Math.round(b.originX)),
            y: Math.max(0, Math.round(b.originY)),
            width: Math.round(b.width),
            height: Math.round(b.height),
            score: d.categories?.[0]?.score ?? 0,
          };
        })
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .map((f, idx) => ({
          ...f,
          label: idx === 0 ? "Candidate" : `Unauthorised person ${idx + 1}`,
          isMain: idx === 0,
          isViolation: idx > 0,
        }));

      return this.evaluateResult(faces, vw, vh, lightingOk);
    } catch (err) {
      // A dropped frame must not kill the detection loop.
      console.warn("[proctoring] frame skipped:", err?.message);
      return result({
        status: "no_feed",
        engine: this.state,
        message: "Analysing camera feed…",
      });
    }
  }

  evaluateResult(faces, vw, vh, lightingOk = true) {
    if (!faces || faces.length === 0) return result({ lightingOk });

    if (faces.length > 1) {
      return {
        faces,
        faceCount: faces.length,
        status: "multi_face",
        isCentered: true,
        lightingOk,
        engine: this.state,
        message: `Violation — ${faces.length} people detected in frame`,
      };
    }

    const f = faces[0];
    const dx = Math.abs(f.x + f.width / 2 - vw / 2) / vw;
    const dy = Math.abs(f.y + f.height / 2 - vh / 2) / vh;
    const isCentered = dx < CENTER_TOLERANCE && dy < CENTER_TOLERANCE;

    if (!isCentered) {
      return {
        faces,
        faceCount: 1,
        status: "off_center",
        isCentered: false,
        lightingOk,
        engine: this.state,
        message: "Face off-centre — align with the centre guide",
      };
    }

    if (!lightingOk) {
      return {
        faces,
        faceCount: 1,
        status: "poor_lighting",
        isCentered: true,
        lightingOk: false,
        engine: this.state,
        message: "Face detected, but the lighting is poor",
      };
    }

    return {
      faces,
      faceCount: 1,
      status: "ok",
      isCentered: true,
      lightingOk: true,
      engine: this.state,
      message: "Verified — 1 face in frame",
    };
  }

  /* ── Simulation hooks (development only) ───────────────────────────── */

  #simulate(mode, vw, vh) {
    if (mode === "no_face") return result();

    if (mode === "multi_face") {
      return {
        faces: [
          { x: Math.round(vw * 0.12), y: Math.round(vh * 0.18), width: Math.round(vw * 0.3), height: Math.round(vh * 0.4), label: "Candidate", score: 0.97, isMain: true, isViolation: false },
          { x: Math.round(vw * 0.58), y: Math.round(vh * 0.22), width: Math.round(vw * 0.27), height: Math.round(vh * 0.36), label: "Unauthorised person 2", score: 0.94, isMain: false, isViolation: true },
        ],
        faceCount: 2,
        status: "multi_face",
        isCentered: true,
        lightingOk: true,
        engine: this.state,
        message: "Violation — 2 people detected in frame",
      };
    }

    if (mode === "look_away") {
      return {
        faces: [
          { x: Math.round(vw * 0.04), y: Math.round(vh * 0.1), width: Math.round(vw * 0.24), height: Math.round(vh * 0.34), label: "Gaze deviation", score: 0.89, isMain: true, isViolation: true },
        ],
        faceCount: 1,
        status: "off_center",
        isCentered: false,
        lightingOk: true,
        engine: this.state,
        message: "Face off-centre — look directly at the screen",
      };
    }

    return null;
  }

  /* ── HUD ───────────────────────────────────────────────────────────── */

  /**
   * Draw the overlay. The canvas is mirrored in CSS to match the video, so
   * geometry is drawn as-is and every text run is un-mirrored locally.
   */
  drawHUD(canvas, videoEl, detectionResult) {
    if (!canvas || !videoEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;

    // The video is painted with `object-fit: cover` — scaled by the LARGER
    // ratio and cropped on the overflowing axis. Mirroring that here keeps the
    // boxes aligned on cameras whose aspect ratio is not the canvas's.
    const scale = Math.max(width / vw, height / vh);
    const offsetX = (width - vw * scale) / 2;
    const offsetY = (height - vh * scale) / 2;

    const { faces = [], status = "ok" } = detectionResult || {};

    const drawLabel = (text, x, y, color) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1); // cancel the CSS scaleX(-1)
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const w = ctx.measureText(text).width + 14;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(-w / 2, -10, w, 20, 5);
      else ctx.rect(-w / 2, -10, w, 20);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, 0, 1);
      ctx.restore();
    };

    // Centre alignment guide
    const guide =
      status === "multi_face" ? "rgba(239,68,68,0.5)"
      : status === "ok" ? "rgba(16,185,129,0.38)"
      : "rgba(245,158,11,0.5)";

    ctx.save();
    ctx.strokeStyle = guide;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.27, height * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (faces.length === 0) {
      const text =
        status === "loading" ? "LOADING DETECTOR…"
        : status === "engine_unavailable" ? "DETECTION UNAVAILABLE"
        : "POSITION FACE IN CENTRE";
      const tone =
        status === "engine_unavailable" ? "rgba(100,116,139,0.92)" : "rgba(245,158,11,0.92)";
      drawLabel(text, width / 2, height / 2, tone);
      return;
    }

    for (const f of faces) {
      const bx = offsetX + f.x * scale;
      const by = offsetY + f.y * scale;
      const bw = f.width * scale;
      const bh = f.height * scale;

      const alert = f.isViolation || status === "multi_face";
      const color = alert ? "#ef4444" : "#10b981";

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = alert ? 3 : 2;
      ctx.strokeRect(bx, by, bw, bh);

      const len = Math.min(18, bw * 0.22);
      ctx.lineWidth = alert ? 4 : 3;
      for (const [a, b, cc] of [
        [[bx, by + len], [bx, by], [bx + len, by]],
        [[bx + bw - len, by], [bx + bw, by], [bx + bw, by + len]],
        [[bx, by + bh - len], [bx, by + bh], [bx + len, by + bh]],
        [[bx + bw - len, by + bh], [bx + bw, by + bh], [bx + bw, by + bh - len]],
      ]) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(cc[0], cc[1]);
        ctx.stroke();
      }
      ctx.restore();

      drawLabel(
        alert ? `! ${f.label}` : `✔ ${f.label}`,
        bx + bw / 2,
        Math.max(12, by - 12),
        alert ? "rgba(239,68,68,0.94)" : "rgba(16,185,129,0.94)"
      );
    }
  }

  /** Release the model. Call when leaving the exam. */
  close() {
    try {
      this.detector?.close?.();
    } catch {
      /* already torn down */
    }
    this.detector = null;
    this.state = ENGINE.IDLE;
    this.lastTimestamp = -1;
  }
}

export const faceDetector = new FaceDetectorEngine();
export default faceDetector;
