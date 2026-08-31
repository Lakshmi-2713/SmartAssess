/**
 * SmartAssess Vision Engine - Face & Multi-Face Detector
 * Supports native FaceDetector API + High performance Connected-Component & Gradient Variance Analyzer + Simulation hooks.
 */

export class FaceDetectorEngine {
  constructor() {
    this.nativeDetector = null;
    this.hasNative = false;
    this.initNativeDetector();
  }

  async initNativeDetector() {
    try {
      if (typeof window !== "undefined" && "FaceDetector" in window) {
        // @ts-ignore
        this.nativeDetector = new window.FaceDetector({
          maxDetectedFaces: 5,
          fastMode: true,
        });
        this.hasNative = true;
      }
    } catch (e) {
      this.hasNative = false;
    }
  }

  /**
   * Analyze a video frame to detect faces, count, alignment, and lighting
   */
  async detectFaces(videoEl, options = {}) {
    const {
      simulationMode = "none", // 'none' | 'multi_face' | 'no_face' | 'look_away'
    } = options;

    if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
      return {
        faces: [],
        faceCount: 0,
        status: "no_feed",
        isCentered: false,
        lightingOk: false,
        message: "Camera stream initializing...",
      };
    }

    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;

    // Simulation hooks for verification & testing
    if (simulationMode === "no_face") {
      return {
        faces: [],
        faceCount: 0,
        status: "no_face",
        isCentered: false,
        lightingOk: true,
        message: "NO FACE DETECTED: Position yourself inside camera frame",
      };
    }

    if (simulationMode === "multi_face") {
      const face1 = {
        x: Math.round(vw * 0.12),
        y: Math.round(vh * 0.18),
        width: Math.round(vw * 0.35),
        height: Math.round(vh * 0.52),
        label: "Candidate (Authorized)",
        score: 0.97,
        isMain: true,
        isViolation: false,
      };
      const face2 = {
        x: Math.round(vw * 0.56),
        y: Math.round(vh * 0.22),
        width: Math.round(vw * 0.32),
        height: Math.round(vh * 0.48),
        label: "UNAUTHORIZED PERSON #2",
        score: 0.94,
        isMain: false,
        isViolation: true,
      };
      return {
        faces: [face1, face2],
        faceCount: 2,
        status: "multi_face",
        isCentered: true,
        lightingOk: true,
        message: "STRICT VIOLATION: Multiple faces detected in camera feed!",
      };
    }

    if (simulationMode === "look_away") {
      const face = {
        x: Math.round(vw * 0.04),
        y: Math.round(vh * 0.1),
        width: Math.round(vw * 0.28),
        height: Math.round(vh * 0.42),
        label: "Gaze Deviation (Warning)",
        score: 0.89,
        isMain: true,
        isViolation: true,
      };
      return {
        faces: [face],
        faceCount: 1,
        status: "off_center",
        isCentered: false,
        lightingOk: true,
        message: "GAZE WARNING: Face out of center - look directly at screen",
      };
    }

    // ── 1. Native Browser FaceDetector (Hardware Accelerated) ──
    if (this.hasNative && this.nativeDetector) {
      try {
        const detected = await this.nativeDetector.detect(videoEl);
        if (Array.isArray(detected)) {
          // If native detector detects 0 faces, user has definitely left the frame!
          if (detected.length === 0) {
            return {
              faces: [],
              faceCount: 0,
              status: "no_face",
              isCentered: false,
              lightingOk: true,
              message: "NO FACE DETECTED: Position yourself inside camera frame",
            };
          }

          // Sort by bounding box area descending
          const sorted = [...detected].sort(
            (a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height
          );

          const faces = sorted.map((f, idx) => {
            const bb = f.boundingBox;
            const isMain = idx === 0;
            return {
              x: Math.round(bb.x),
              y: Math.round(bb.y),
              width: Math.round(bb.width),
              height: Math.round(bb.height),
              label: isMain ? "Candidate" : `UNAUTHORIZED PERSON #${idx + 1}`,
              score: 0.96,
              isMain,
              isViolation: idx > 0,
            };
          });

          return this.evaluateResult(faces, vw, vh);
        }
      } catch (e) {
        // Fallback to CV frame analyzer
      }
    }

    // ── 2. Computer Vision Feature & Contrast Variance Analyzer ──
    return this.analyzeFrameCV(videoEl, vw, vh);
  }

  /**
   * Robust Computer Vision frame analyzer: Skin-chroma + Eye/Brow Gradient Variance
   */
  analyzeFrameCV(videoEl, vw, vh) {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }

    const scale = 0.25;
    const sw = Math.round(vw * scale);
    const sh = Math.round(vh * scale);

    if (this.canvas.width !== sw || this.canvas.height !== sh) {
      this.canvas.width = sw;
      this.canvas.height = sh;
    }

    try {
      this.ctx.drawImage(videoEl, 0, 0, sw, sh);
      const imgData = this.ctx.getImageData(0, 0, sw, sh);
      const data = imgData.data;

      let totalBrightness = 0;
      let skinPixels = 0;
      const skinBinary = new Uint8Array(sw * sh);
      const grayscale = new Uint8Array(sw * sh);

      // Adaptive skin chroma & luminance extraction
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const pixelIndex = i / 4;
        grayscale[pixelIndex] = gray;
        totalBrightness += gray;

        // Strict human skin chroma criteria (eliminates flat white/yellow/blue walls)
        const isSkin =
          r > 60 &&
          g > 40 &&
          b > 30 &&
          r > g &&
          r > b &&
          r - g > 15 &&
          r - g < 130 &&
          r - b > 15 &&
          gray > 45 &&
          gray < 235;

        if (isSkin) {
          skinBinary[pixelIndex] = 1;
          skinPixels++;
        }
      }

      const avgBrightness = totalBrightness / (sw * sh);
      const lightingOk = avgBrightness >= 25 && avgBrightness <= 245;

      const totalPixels = sw * sh;
      // Minimum skin pixels needed to constitute a human face in frame
      const minFacePixels = Math.round(totalPixels * 0.05); // At least 5% of viewport

      if (skinPixels < minFacePixels) {
        return {
          faces: [],
          faceCount: 0,
          status: "no_face",
          isCentered: false,
          lightingOk,
          message: "NO FACE DETECTED: Position yourself inside camera frame",
        };
      }

      // ── Connected Component Analysis ──
      const maxHeadY = Math.floor(sh * 0.85);
      const visited = new Uint8Array(sw * sh);
      const components = [];

      const step = 2;
      for (let y = 0; y < maxHeadY; y += step) {
        for (let x = 0; x < sw; x += step) {
          const idx = y * sw + x;
          if (skinBinary[idx] === 1 && visited[idx] === 0) {
            let minX = x, maxX = x, minY = y, maxY = y;
            let count = 0;
            const queue = [idx];
            visited[idx] = 1;

            while (queue.length > 0) {
              const curr = queue.pop();
              count++;
              const cy = Math.floor(curr / sw);
              const cx = curr % sw;

              if (cx < minX) minX = cx;
              if (cx > maxX) maxX = cx;
              if (cy < minY) minY = cy;
              if (cy > maxY) maxY = cy;

              const neighbors = [
                curr - step,
                curr + step,
                curr - step * sw,
                curr + step * sw,
              ];

              for (const n of neighbors) {
                if (n >= 0 && n < sw * maxHeadY && skinBinary[n] === 1 && visited[n] === 0) {
                  visited[n] = 1;
                  queue.push(n);
                }
              }
            }

            const compWidth = maxX - minX + 1;
            const compHeight = maxY - minY + 1;
            const compArea = count * (step * step);

            // Check if blob has human head dimensions
            if (compArea > totalPixels * 0.045 && compWidth > sw * 0.14 && compHeight > sh * 0.16) {
              // ── Facial Feature / Gradient Variance Check ──
              // A real face has high luminance variance (eyes, brows, nose, lips).
              // A background door, wooden cabinet, or wall has flat near-zero variance.
              let lumSum = 0;
              let lumSqSum = 0;
              let sampleCount = 0;

              for (let by = minY; by <= maxY; by += 2) {
                for (let bx = minX; bx <= maxX; bx += 2) {
                  const bIdx = by * sw + bx;
                  if (skinBinary[bIdx] === 1) {
                    const lum = grayscale[bIdx];
                    lumSum += lum;
                    lumSqSum += lum * lum;
                    sampleCount++;
                  }
                }
              }

              if (sampleCount > 20) {
                const mean = lumSum / sampleCount;
                const variance = Math.sqrt(Math.max(0, lumSqSum / sampleCount - mean * mean));

                // If variance is too flat (< 8), it is a flat background wall/door/furniture
                if (variance >= 9) {
                  components.push({
                    minX, maxX, minY, maxY,
                    compWidth, compHeight,
                    compArea,
                    variance,
                    centerX: (minX + maxX) / 2,
                    centerY: (minY + maxY) / 2,
                  });
                }
              }
            }
          }
        }
      }

      // If no valid component passed variance test, person has left the frame!
      if (components.length === 0) {
        return {
          faces: [],
          faceCount: 0,
          status: "no_face",
          isCentered: false,
          lightingOk,
          message: "NO FACE DETECTED: Position yourself inside camera frame",
        };
      }

      // Merge overlapping components
      const merged = [];
      for (const c of components) {
        let mergedWithExisting = false;
        for (const m of merged) {
          const dx = Math.abs(c.centerX - m.centerX);
          const dy = Math.abs(c.centerY - m.centerY);
          if (dx < sw * 0.3 && dy < sh * 0.3) {
            m.minX = Math.min(m.minX, c.minX);
            m.maxX = Math.max(m.maxX, c.maxX);
            m.minY = Math.min(m.minY, c.minY);
            m.maxY = Math.max(m.maxY, c.maxY);
            m.compArea += c.compArea;
            m.centerX = (m.minX + m.maxX) / 2;
            m.centerY = (m.minY + m.maxY) / 2;
            mergedWithExisting = true;
            break;
          }
        }
        if (!mergedWithExisting) {
          merged.push({ ...c });
        }
      }

      merged.sort((a, b) => b.compArea - a.compArea);

      const validFaces = [];
      if (merged.length > 0) {
        const primary = merged[0];
        const pBoxW = Math.max((primary.maxX - primary.minX) / scale, vw * 0.3);
        const pBoxH = Math.max((primary.maxY - primary.minY) / scale, vh * 0.44);
        const pCenterX = primary.centerX / scale;
        const pCenterY = primary.centerY / scale;

        const pX = Math.max(0, Math.min(vw - pBoxW, pCenterX - pBoxW / 2));
        const pY = Math.max(0, Math.min(vh - pBoxH, pCenterY - pBoxH / 2));

        validFaces.push({
          x: Math.round(pX),
          y: Math.round(pY),
          width: Math.round(pBoxW),
          height: Math.round(pBoxH),
          label: "Candidate (Authorized)",
          score: 0.96,
          isMain: true,
          isViolation: false,
        });

        // Check for genuine second person
        if (merged.length > 1) {
          const secondary = merged[1];
          const dist = Math.abs(secondary.centerX - primary.centerX);
          const isFarEnough = dist > sw * 0.36;
          const isLargeEnough = secondary.compArea > primary.compArea * 0.45 && secondary.compArea > totalPixels * 0.05;

          if (isFarEnough && isLargeEnough) {
            const sBoxW = Math.max((secondary.maxX - secondary.minX) / scale, vw * 0.26);
            const sBoxH = Math.max((secondary.maxY - secondary.minY) / scale, vh * 0.38);
            const sCenterX = secondary.centerX / scale;
            const sCenterY = secondary.centerY / scale;

            validFaces.push({
              x: Math.round(Math.max(0, Math.min(vw - sBoxW, sCenterX - sBoxW / 2))),
              y: Math.round(Math.max(0, Math.min(vh - sBoxH, sCenterY - sBoxH / 2))),
              width: Math.round(sBoxW),
              height: Math.round(sBoxH),
              label: "UNAUTHORIZED PERSON #2",
              score: 0.92,
              isMain: false,
              isViolation: true,
            });
          }
        }
      }

      return this.evaluateResult(validFaces, vw, vh, lightingOk);
    } catch (e) {
      return {
        faces: [],
        faceCount: 0,
        status: "no_face",
        isCentered: false,
        lightingOk: true,
        message: "NO FACE DETECTED: Position yourself inside camera frame",
      };
    }
  }

  evaluateResult(faces, vw, vh, lightingOk = true) {
    if (!faces || faces.length === 0) {
      return {
        faces: [],
        faceCount: 0,
        status: "no_face",
        isCentered: false,
        lightingOk,
        message: "NO FACE DETECTED: Position yourself inside camera frame",
      };
    }

    if (faces.length > 1) {
      return {
        faces,
        faceCount: faces.length,
        status: "multi_face",
        isCentered: true,
        lightingOk,
        message: `STRICT VIOLATION: Multiple faces (${faces.length}) detected!`,
      };
    }

    // Check centering of primary face
    const f = faces[0];
    const faceCenterX = f.x + f.width / 2;
    const faceCenterY = f.y + f.height / 2;
    const frameCenterX = vw / 2;
    const frameCenterY = vh / 2;

    const dx = Math.abs(faceCenterX - frameCenterX) / vw;
    const dy = Math.abs(faceCenterY - frameCenterY) / vh;
    const isCentered = dx < 0.32 && dy < 0.32;

    if (!isCentered) {
      return {
        faces,
        faceCount: 1,
        status: "off_center",
        isCentered: false,
        lightingOk,
        message: "Face off-center: Please align with center guide",
      };
    }

    return {
      faces,
      faceCount: 1,
      status: "ok",
      isCentered: true,
      lightingOk,
      message: "Proctoring Secure: 1 Face Verified",
    };
  }

  /**
   * Draw high-tech HUD overlay on camera canvas
   */
  drawHUD(canvas, videoEl, detectionResult) {
    if (!canvas || !videoEl) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;
    const scaleX = width / vw;
    const scaleY = height / vh;

    const { faces = [], status = "ok" } = detectionResult || {};

    // 1. Draw Center Alignment Target Oval
    ctx.save();
    ctx.strokeStyle =
      status === "multi_face"
        ? "rgba(239, 68, 68, 0.45)"
        : status === "ok"
        ? "rgba(16, 185, 129, 0.35)"
        : status === "no_face"
        ? "rgba(245, 158, 11, 0.45)"
        : "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.28, height * 0.38, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // If no face, draw subtle search guide
    if (faces.length === 0) {
      ctx.save();
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillStyle = "rgba(245, 158, 11, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText("POSITION FACE IN CENTER", width / 2, height / 2 + 6);
      ctx.restore();
      return;
    }

    // 2. Draw Bounding Boxes with sci-fi corner brackets
    faces.forEach((f) => {
      const bx = f.x * scaleX;
      const by = f.y * scaleY;
      const bw = f.width * scaleX;
      const bh = f.height * scaleY;

      const isAlert = f.isViolation || status === "multi_face";
      const color = isAlert ? "#ef4444" : "#10b981";
      const bgTag = isAlert ? "rgba(239, 68, 68, 0.9)" : "rgba(16, 185, 129, 0.9)";

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = isAlert ? 3 : 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner accent brackets
      const cornerLen = Math.min(18, bw * 0.22);
      ctx.lineWidth = isAlert ? 4 : 3;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - cornerLen);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + cornerLen, by + bh);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - cornerLen);
      ctx.stroke();

      // Label Tag Badge
      const tagText = isAlert ? `⚠ ${f.label.toUpperCase()}` : `✔ ${f.label.toUpperCase()}`;
      ctx.font = "bold 11px Inter, sans-serif";
      const textMetrics = ctx.measureText(tagText);
      const pad = 6;
      const tagWidth = textMetrics.width + pad * 2;
      const tagHeight = 20;

      ctx.fillStyle = bgTag;
      ctx.fillRect(bx, Math.max(0, by - tagHeight), tagWidth, tagHeight);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(tagText, bx + pad, Math.max(14, by - 6));

      ctx.restore();
    });
  }
}

export const faceDetector = new FaceDetectorEngine();
