/**
 * Proctoring audio cues via the Web Audio API — no sound files required.
 */

class AudioAlertService {
  constructor() {
    this.ctx = null;
    this.unavailable = false;
  }

  /**
   * Lazily create the AudioContext. Browsers block it until a user gesture,
   * so `resume()` is attempted on every call rather than only at construction.
   */
  #ensureContext() {
    if (this.unavailable) return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        this.unavailable = true;
        return null;
      }
      try {
        this.ctx = new AudioCtx();
      } catch {
        this.unavailable = true;
        return null;
      }
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Play a short envelope; every node is disposed when it finishes. */
  #tone({ type, steps, peak, duration }) {
    const ctx = this.#ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      for (const [freq, at] of steps) {
        osc.frequency.setValueAtTime(freq, now + at);
      }

      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);

      // Without this the nodes stay referenced by the graph for the life of
      // the context — an exam fires hundreds of these.
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          /* already torn down */
        }
      };
    } catch (err) {
      console.warn("Audio alert failed:", err?.name || err);
    }
  }

  /** Urgent dual beep — multiple faces or a critical violation. */
  playMultiFaceAlert() {
    this.#tone({
      type: "sawtooth",
      steps: [[880, 0], [440, 0.1], [880, 0.2]],
      peak: 0.3,
      duration: 0.35,
    });
  }

  /** Descending buzz — fullscreen or focus violation. */
  playFullscreenViolationAlert() {
    this.#tone({
      type: "square",
      steps: [[520, 0], [300, 0.2], [220, 0.35]],
      peak: 0.28,
      duration: 0.45,
    });
  }

  /** Rising chime — success. */
  playSuccessChime() {
    this.#tone({
      type: "sine",
      steps: [[523.25, 0], [659.25, 0.1], [783.99, 0.2]],
      peak: 0.18,
      duration: 0.4,
    });
  }

  /** Release the context, e.g. when leaving the exam. */
  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const audioAlerts = new AudioAlertService();
export default audioAlerts;
