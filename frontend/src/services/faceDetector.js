/**
 * SmartAssess Vision Engine — face and multi-face detection.
 *
 * Uses the browser's native FaceDetector where available, and falls back to a
 * skin-chroma + connected-component + luminance-variance analyser otherwise.
 */

const SKIN = {
  minR: 60, minG: 40, minB: 30,
  minRG: 15, maxRG: 130, minRB: 15,
  minGray: 45, maxGray: 235,
};

const noFaceResult = (lightingOk = true) => ({
  faces: [],
  faceCount: 0,
  status: "no_face",
  isCentered: false,
  lightingOk,
  message: "No face detected — position yourself inside the camera frame",
});

export class FaceDetectorEngine {
  constructor() {
    this.nativeDetector = null;
    this.hasNative = false;
    this.canvas = null;
    this.ctx = null;
    this.initNativeDetector();
  }

  initNativeDetector() {
    try {
      if (typeof window !== "undefined" && "FaceDetector" in window) {
        this.nativeDetector = new window.FaceDetector({
          maxDetectedFaces: 5,
          fastMode: true,
        });
        this.hasNative = true;
      }
    } catch {
      // Constructor can throw on partial implementations; fall back silently.
      this.hasNative = false;
      this.nativeDetector = null;
    }
  }

  /**
   * Analyse one video frame.
   * @returns {Promise<{faces:Array,faceCount:number,status:string,isCentered:boolean,lightingOk:boolean,message:string}>}
   */
  async detectFaces(videoEl, options = {}) {
    const { simulationMode = "none" } = options;

    if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) {
      return {
        faces: [],
        faceCount: 0,
        status: "no_feed",
        isCentered: false,
        lightingOk: false,
        message: "Camera stream initialising…",
      };
    }

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;

    const simulated = this.#simulate(simulationMode, vw, vh);
    if (simulated) return simulated;

    if (this.hasNative && this.nativeDetector) {
      try {
        const detected = await this.nativeDetector.detect(videoEl);
        if (Array.isArray(detected)) {
          if (detected.length === 0) return noFaceResult();

          const sorted = [...detected].sort(
            (a, b) =>
              b.boundingBox.width * b.boundingBox.height -
              a.boundingBox.width * a.boundingBox.height
          );

          const faces = sorted.map((f, idx) => ({
            x: Math.round(f.boundingBox.x),
            y: Math.round(f.boundingBox.y),
            width: Math.round(f.boundingBox.width),
            height: Math.round(f.boundingBox.height),
            label: idx === 0 ? "Candidate" : `Unauthorised person ${idx + 1}`,
            score: 0.96,
            isMain: idx === 0,
            isViolation: idx > 0,
          }));

          return this.evaluateResult(faces, vw, vh);
        }
      } catch {
        // Detector can fail per-frame; fall through to the CV analyser.
      }
    }

    return this.analyzeFrameCV(videoEl, vw, vh);
  }

  #simulate(mode, vw, vh) {
    if (mode === "no_face") return noFaceResult();

    if (mode === "multi_face") {
      return {
        faces: [
          {
            x: Math.round(vw * 0.12), y: Math.round(vh * 0.18),
            width: Math.round(vw * 0.35), height: Math.round(vh * 0.52),
            label: "Candidate", score: 0.97, isMain: true, isViolation: false,
          },
          {
            x: Math.round(vw * 0.56), y: Math.round(vh * 0.22),
            width: Math.round(vw * 0.32), height: Math.round(vh * 0.48),
            label: "Unauthorised person 2", score: 0.94, isMain: false, isViolation: true,
          },
        ],
        faceCount: 2,
        status: "multi_face",
        isCentered: true,
        lightingOk: true,
        message: "Violation — multiple faces detected in the camera feed",
      };
    }

    if (mode === "look_away") {
      return {
        faces: [
          {
            x: Math.round(vw * 0.04), y: Math.round(vh * 0.1),
            width: Math.round(vw * 0.28), height: Math.round(vh * 0.42),
            label: "Gaze deviation", score: 0.89, isMain: true, isViolation: true,
          },
        ],
        faceCount: 1,
        status: "off_center",
        isCentered: false,
        lightingOk: true,
        message: "Face out of centre — look directly at the screen",
      };
    }

    return null;
  }

  /** Skin-chroma + connected components + luminance variance. */
  analyzeFrameCV(videoEl, vw, vh) {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!this.ctx) return noFaceResult();

    const scale = 0.25;
    const sw = Math.max(1, Math.round(vw * scale));
    const sh = Math.max(1, Math.round(vh * scale));

    if (this.canvas.width !== sw || this.canvas.height !== sh) {
      this.canvas.width = sw;
      this.canvas.height = sh;
    }

    try {
      this.ctx.drawImage(videoEl, 0, 0, sw, sh);
      const { data } = this.ctx.getImageData(0, 0, sw, sh);

      const totalPixels = sw * sh;
      const skinBinary = new Uint8Array(totalPixels);
      const grayscale = new Uint8Array(totalPixels);
      let totalBrightness = 0;
      let skinPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const gray = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
        const px = i >> 2;

        grayscale[px] = gray;
        totalBrightness += gray;

        if (
          r > SKIN.minR && g > SKIN.minG && b > SKIN.minB &&
          r > g && r > b &&
          r - g > SKIN.minRG && r - g < SKIN.maxRG && r - b > SKIN.minRB &&
          gray > SKIN.minGray && gray < SKIN.maxGray
        ) {
          skinBinary[px] = 1;
          skinPixels += 1;
        }
      }

      const avgBrightness = totalBrightness / totalPixels;
      const lightingOk = avgBrightness >= 25 && avgBrightness <= 245;

      if (skinPixels < totalPixels * 0.05) return noFaceResult(lightingOk);

      const components = this.#findComponents(skinBinary, grayscale, sw, sh, totalPixels);
      if (components.length === 0) return noFaceResult(lightingOk);

      const merged = this.#mergeComponents(components, sw, sh);
      merged.sort((a, b) => b.area - a.area);

      const faces = [];
      const primary = merged[0];

      const toBox = (c, minWRatio, minHRatio, label, isMain) => {
        const boxW = Math.max((c.maxX - c.minX) / scale, vw * minWRatio);
        const boxH = Math.max((c.maxY - c.minY) / scale, vh * minHRatio);
        const cx = c.centerX / scale;
        const cy = c.centerY / scale;
        return {
          x: Math.round(Math.max(0, Math.min(vw - boxW, cx - boxW / 2))),
          y: Math.round(Math.max(0, Math.min(vh - boxH, cy - boxH / 2))),
          width: Math.round(boxW),
          height: Math.round(boxH),
          label,
          score: isMain ? 0.96 : 0.92,
          isMain,
          isViolation: !isMain,
        };
      };

      faces.push(toBox(primary, 0.3, 0.44, "Candidate", true));

      if (merged.length > 1) {
        const secondary = merged[1];
        const farEnough = Math.abs(secondary.centerX - primary.centerX) > sw * 0.36;
        const bigEnough =
          secondary.area > primary.area * 0.45 && secondary.area > totalPixels * 0.05;
        if (farEnough && bigEnough) {
          faces.push(toBox(secondary, 0.26, 0.38, "Unauthorised person 2", false));
        }
      }

      return this.evaluateResult(faces, vw, vh, lightingOk);
    } catch {
      // A tainted canvas or a torn-down stream lands here.
      return noFaceResult();
    }
  }

  /** Grid-sampled flood fill over the skin mask. */
  #findComponents(skinBinary, grayscale, sw, sh, totalPixels) {
    const maxHeadY = Math.floor(sh * 0.85);
    const visited = new Uint8Array(sw * sh);
    const components = [];
    const step = 2;
    const limit = sw * maxHeadY;

    for (let y = 0; y < maxHeadY; y += step) {
      for (let x = 0; x < sw; x += step) {
        const idx = y * sw + x;
        if (skinBinary[idx] !== 1 || visited[idx] === 1) continue;

        let minX = x, maxX = x, minY = y, maxY = y, count = 0;
        const stack = [idx];
        visited[idx] = 1;

        while (stack.length > 0) {
          const curr = stack.pop();
          count += 1;

          const cy = (curr / sw) | 0;
          const cx = curr - cy * sw;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Horizontal neighbours are bounds-checked against the ROW, not the
          // flat buffer. Using the flat index alone let a blob at x≈0 wrap
          // around to the far edge of the row above and merge unrelated regions.
          if (cx - step >= 0) this.#visit(curr - step, skinBinary, visited, stack, limit);
          if (cx + step < sw) this.#visit(curr + step, skinBinary, visited, stack, limit);
          this.#visit(curr - step * sw, skinBinary, visited, stack, limit);
          this.#visit(curr + step * sw, skinBinary, visited, stack, limit);
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const area = count * step * step;

        if (area <= totalPixels * 0.045 || width <= sw * 0.14 || height <= sh * 0.16) {
          continue;
        }

        // A real face has high luminance variance (eyes, brows, lips);
        // a flat door or wall does not.
        let sum = 0, sumSq = 0, samples = 0;
        for (let by = minY; by <= maxY; by += 2) {
          for (let bx = minX; bx <= maxX; bx += 2) {
            const bIdx = by * sw + bx;
            if (skinBinary[bIdx] !== 1) continue;
            const lum = grayscale[bIdx];
            sum += lum;
            sumSq += lum * lum;
            samples += 1;
          }
        }

        if (samples <= 20) continue;

        const mean = sum / samples;
        const variance = Math.sqrt(Math.max(0, sumSq / samples - mean * mean));
        if (variance < 9) continue;

        components.push({
          minX, maxX, minY, maxY, area, variance,
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2,
        });
      }
    }

    return components;
  }

  #visit(n, skinBinary, visited, stack, limit) {
    if (n < 0 || n >= limit) return;
    if (skinBinary[n] !== 1 || visited[n] === 1) return;
    visited[n] = 1;
    stack.push(n);
  }

  #mergeComponents(components, sw, sh) {
    const merged = [];
    for (const c of components) {
      let absorbed = false;
      for (const m of merged) {
        if (
          Math.abs(c.centerX - m.centerX) < sw * 0.3 &&
          Math.abs(c.centerY - m.centerY) < sh * 0.3
        ) {
          m.minX = Math.min(m.minX, c.minX);
          m.maxX = Math.max(m.maxX, c.maxX);
          m.minY = Math.min(m.minY, c.minY);
          m.maxY = Math.max(m.maxY, c.maxY);
          m.area += c.area;
          m.centerX = (m.minX + m.maxX) / 2;
          m.centerY = (m.minY + m.maxY) / 2;
          absorbed = true;
          break;
        }
      }
      if (!absorbed) merged.push({ ...c });
    }
    return merged;
  }

  evaluateResult(faces, vw, vh, lightingOk = true) {
    if (!faces || faces.length === 0) return noFaceResult(lightingOk);

    if (faces.length > 1) {
      return {
        faces,
        faceCount: faces.length,
        status: "multi_face",
        isCentered: true,
        lightingOk,
        message: `Violation — ${faces.length} faces detected`,
      };
    }

    const f = faces[0];
    const dx = Math.abs(f.x + f.width / 2 - vw / 2) / vw;
    const dy = Math.abs(f.y + f.height / 2 - vh / 2) / vh;
    const isCentered = dx < 0.32 && dy < 0.32;

    if (!isCentered) {
      return {
        faces,
        faceCount: 1,
        status: "off_center",
        isCentered: false,
        lightingOk,
        message: "Face off-centre — align with the centre guide",
      };
    }

    return {
      faces,
      faceCount: 1,
      status: "ok",
      isCentered: true,
      lightingOk,
      message: "Proctoring secure — 1 face verified",
    };
  }

  /**
   * Draw the heads-up display over the camera feed.
   *
   * The canvas element is mirrored in CSS to match the video, so geometry is
   * drawn as-is but every text run is un-mirrored locally — otherwise all
   * labels render back-to-front.
   */
  drawHUD(canvas, videoEl, detectionResult) {
    if (!canvas || !videoEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;

    // The video is painted with `object-fit: cover`, so it is scaled by the
    // LARGER ratio and cropped on the overflowing axis. Mirroring that here
    // keeps boxes aligned on cameras whose aspect ratio isn't the canvas's
    // (a 16:9 webcam in a 4:3 frame was previously offset on every box).
    const coverScale = Math.max(width / vw, height / vh);
    const offsetX = (width - vw * coverScale) / 2;
    const offsetY = (height - vh * coverScale) / 2;
    const toCanvas = (x, y) => [offsetX + x * coverScale, offsetY + y * coverScale];

    const { faces = [], status = "ok" } = detectionResult || {};

    /** Draw text the right way round despite the mirrored parent. */
    const drawLabel = (text, x, y, color) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1); // cancel the CSS scaleX(-1)
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const w = ctx.measureText(text).width + 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      // roundRect is unavailable on older Safari/Firefox; fall back to a
      // plain rect rather than throwing inside the render loop.
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(-w / 2, -10, w, 20, 5);
      } else {
        ctx.rect(-w / 2, -10, w, 20);
      }
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, 0, 1);
      ctx.restore();
    };

    // Centre alignment oval
    const ovalColor =
      status === "multi_face" ? "rgba(239,68,68,0.5)"
      : status === "ok" ? "rgba(16,185,129,0.38)"
      : "rgba(245,158,11,0.5)";

    ctx.save();
    ctx.strokeStyle = ovalColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.28, height * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (faces.length === 0) {
      drawLabel("POSITION FACE IN CENTRE", width / 2, height / 2, "rgba(245,158,11,0.92)");
      return;
    }

    for (const f of faces) {
      const [bx, by] = toCanvas(f.x, f.y);
      const bw = f.width * coverScale;
      const bh = f.height * coverScale;

      const alert = f.isViolation || status === "multi_face";
      const color = alert ? "#ef4444" : "#10b981";

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = alert ? 3 : 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner brackets
      const len = Math.min(18, bw * 0.22);
      ctx.lineWidth = alert ? 4 : 3;
      const corners = [
        [[bx, by + len], [bx, by], [bx + len, by]],
        [[bx + bw - len, by], [bx + bw, by], [bx + bw, by + len]],
        [[bx, by + bh - len], [bx, by + bh], [bx + len, by + bh]],
        [[bx + bw - len, by + bh], [bx + bw, by + bh], [bx + bw, by + bh - len]],
      ];
      for (const [a, b, c] of corners) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.stroke();
      }
      ctx.restore();

      const tag = alert ? `! ${f.label}` : `✔ ${f.label}`;
      drawLabel(
        tag,
        bx + bw / 2,
        Math.max(12, by - 12),
        alert ? "rgba(239,68,68,0.94)" : "rgba(16,185,129,0.94)"
      );
    }
  }
}

export const faceDetector = new FaceDetectorEngine();
export default faceDetector;
