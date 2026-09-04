import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaChevronRight,
  FaChevronLeft,
  FaShieldAlt,
  FaTimes,
  FaExpand,
  FaCompress,
  FaFlag,
  FaHome,
  FaUserFriends,
  FaEye,
  FaLock,
  FaRedoAlt,
  FaBug,
  FaChartBar,
} from "react-icons/fa";
import {
  getStoredTests,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredResults,
  saveStoredResults,
  nextId,
} from "../services/storage";
import { faceDetector, ENGINE } from "../services/faceDetector";
import { audioAlerts } from "../services/audioAlerts";
import { getUser, safeGet } from "../services/session";
import { QUESTION_BANKS } from "../data/questionBanks";
import "../styles/takeTest.css";

const MAX_STRIKES = 5;
const DETECT_INTERVAL_MS = 200;
const MULTI_FACE_FRAMES = 4;   // ~800 ms of sustained detection
const NO_FACE_FRAMES = 12;     // ~2.4 s
const MULTI_FACE_COOLDOWN = 6000;
const NO_FACE_COOLDOWN = 7000;

export default function TakeTest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ── Which test? ─────────────────────────────────────────── */
  const activeTest = useMemo(() => {
    const testIdParam = searchParams.get("testId");
    const storedTests = getStoredTests();

    if (testIdParam) {
      const found = storedTests.find((t) => String(t.id) === String(testIdParam));
      if (found) return found;
    }

    // safeGet never throws on a corrupt value — a bad JSON blob here used to
    // take the whole exam screen down.
    const active = safeGet("smartassess_active_test");
    if (active && typeof active === "object") return active;

    return storedTests[0] || {
      id: 1, title: "Java Programming Fundamentals", subject: "Java",
      duration: 60, marks: 100,
    };
  }, [searchParams]);

  const questions = useMemo(
    () => QUESTION_BANKS[activeTest.subject] || QUESTION_BANKS.DSA,
    [activeTest.subject]
  );

  const testMeta = useMemo(
    () => ({
      id: activeTest.id,
      title: activeTest.title,
      subject: activeTest.subject,
      code: `${String(activeTest.subject || "CS").toUpperCase().replace(/\s+/g, "")}-EXAM`,
      duration: Number(activeTest.duration) || 60,
      totalMarks: Number(activeTest.marks) || 100,
    }),
    [activeTest]
  );

  /* ── Exam state ──────────────────────────────────────────── */
  const [phase, setPhase] = useState("instructions");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(() => new Set());
  const [timeLeft, setTimeLeft] = useState(testMeta.duration * 60);

  /* ── Proctoring state ────────────────────────────────────── */
  const [camStatus, setCamStatus] = useState("uninitialized");
  const [camErrorMsg, setCamErrorMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState(false);
  const [streamVersion, setStreamVersion] = useState(0);

  const [fullscreenLockout, setFullscreenLockout] = useState(false);
  const [lockoutReason, setLockoutReason] = useState("");

  const [detection, setDetection] = useState({
    faces: [], faceCount: 0, status: "initializing",
    isCentered: true, lightingOk: true,
    message: "Loading face-detection model…",
  });
  const [simulationMode, setSimulationMode] = useState("none");
  const [engineState, setEngineState] = useState(ENGINE.LOADING);

  const [violations, setViolations] = useState([]);
  const [strikes, setStrikes] = useState(0);
  const [trustScore, setTrustScore] = useState(100);
  const [toasts, setToasts] = useState([]);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [camExpanded, setCamExpanded] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastAlertRef = useRef(0);
  const noFaceCount = useRef(0);
  const multiFaceCount = useRef(0);
  const deadlineRef = useRef(null);
  const submittedRef = useRef(false);

  /**
   * `phase` mirrored into a ref. Event handlers registered once (media-track
   * listeners in particular) close over the value at registration time; the
   * camera was always requested while phase === "instructions", so a
   * `phase === "test"` check inside those handlers could never be true and
   * mid-exam camera loss was never recorded.
   */
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* ── Violations ──────────────────────────────────────────── */
  const recordViolation = useCallback((title, details, severity = "warn") => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      title, details, severity,
    };

    setViolations((prev) => [entry, ...prev]);
    setStrikes((prev) => prev + 1);
    setTrustScore((prev) => Math.max(10, prev - (severity === "critical" ? 20 : 12)));
    setToasts((prev) => [{ id: entry.id, msg: `${title}: ${details}`, type: severity }, ...prev.slice(0, 2)]);

    if (severity === "critical") audioAlerts.playMultiFaceAlert();
    else audioAlerts.playFullscreenViolationAlert();
  }, []);

  /* ── Camera ──────────────────────────────────────────────── */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const requestCameraAccess = useCallback(async () => {
    setCamStatus("requesting");
    setCamErrorMsg("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "This browser does not support camera access. Use a recent Chrome, Edge, Firefox or Safari."
        );
      }

      stopStream();

      const videoConstraints = {
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 },
        facingMode: "user",
        frameRate: { ideal: 30, max: 30 },
      };

      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: true,
        });
      } catch (err) {
        // Only retry without audio when the CAMERA itself is fine. A denied
        // camera must surface as a denial rather than a second failing prompt.
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") throw err;
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      setIsMicAvailable(mediaStream.getAudioTracks().length > 0);

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setCamStatus("stream_lost");
          if (phaseRef.current === "test") {
            recordViolation(
              "Camera stream terminated",
              "The camera connection was lost or the device was disconnected.",
              "critical"
            );
          }
        };
        videoTrack.onmute = () => setCamStatus("stream_lost");
        videoTrack.onunmute = () => setCamStatus("active");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }

      setStreamVersion((v) => v + 1);
      setCamStatus("active");
      audioAlerts.playSuccessChime();
    } catch (err) {
      console.error("Camera access error:", err);
      setCamStatus("denied");
      setCamErrorMsg(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Allow camera access from your browser's address bar, then retry."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
          ? "No webcam was found. Connect a camera and retry."
          : err.name === "NotReadableError"
          ? "The camera is in use by another application. Close it and retry."
          : err.message || "Could not start the webcam."
      );
    }
  }, [recordViolation, stopStream]);

  /* Re-attach the stream whenever the <video> element is remounted. */
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [phase, streamVersion, camExpanded]);

  /* Always release the camera on unmount. */
  useEffect(() => stopStream, [stopStream]);

  /* Start loading the detection model immediately — it is ~230 KB of weights
     plus a WASM runtime, so kicking it off at mount means it is usually ready
     by the time the candidate has granted camera access. */
  useEffect(() => {
    let cancelled = false;
    faceDetector.init().then((ok) => {
      if (cancelled) return;
      setEngineState(ok ? ENGINE.READY : ENGINE.UNAVAILABLE);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Free the model when leaving the exam. */
  useEffect(() => () => faceDetector.close(), []);

  /* ── Submission ──────────────────────────────────────────── */
  const score = useMemo(() => {
    const perQuestion = testMeta.totalMarks / questions.length;
    return questions.reduce(
      (acc, q) => (answers[q.id] === q.correct ? acc + perQuestion : acc),
      0
    );
  }, [questions, answers, testMeta.totalMarks]);

  const handleFinalSubmit = useCallback(() => {
    // Guards against a double submit — the timer expiring at the same moment
    // the strike limit trips would otherwise write two submissions.
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    // Proctoring is over: release the camera immediately rather than leaving
    // the webcam light on through the results screen.
    stopStream();

    const user = getUser() || {};
    const perQuestion = testMeta.totalMarks / questions.length;
    const calculated = Math.round(score);

    const questionResults = questions.map((q) => {
      const isCorrect = answers[q.id] === q.correct;
      return {
        id: q.id,
        text: q.text,
        studentAns: answers[q.id] !== undefined ? q.options[answers[q.id]] : "Unanswered",
        correctAns: q.options[q.correct],
        isCorrect,
        maxMarks: Math.round(perQuestion),
        scoreGiven: isCorrect ? Math.round(perQuestion) : 0,
      };
    });

    const now = new Date();
    const submission = {
      id: nextId(),
      studentName: user.name || "Student",
      studentEmail: user.email || "",
      testId: testMeta.id,
      testTitle: testMeta.title,
      subject: testMeta.subject,
      date: now.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }),
      score: `${calculated} / ${testMeta.totalMarks}`,
      totalScore: calculated,
      maxScore: testMeta.totalMarks,
      status: "Graded & Published",
      feedback:
        calculated >= testMeta.totalMarks * 0.6
          ? "Solid demonstration of the key concepts."
          : "Revise the fundamentals and practise applied scenarios.",
      questions: questionResults,
      proctoring: {
        trustScore,
        totalStrikes: strikes,
        violationsList: violations,
        cameraVerified: camStatus === "active",
        // Whether automatic identity checks were actually running. A degraded
        // attempt must be visible to whoever reviews the paper.
        faceDetection: engineState === ENGINE.READY ? "active" : "unavailable",
      },
    };

    saveStoredSubmissions([submission, ...getStoredSubmissions()]);

    const percent =
      testMeta.totalMarks > 0 ? Math.round((calculated / testMeta.totalMarks) * 100) : 0;

    const result = {
      id: nextId(),
      testId: testMeta.id,
      title: testMeta.title,
      test: testMeta.title,
      subject: testMeta.subject || "Computer Science",
      date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      score: `${percent}%`,
      percent,
      student: user.name || "Student",
      studentEmail: user.email || "",
      reviewer: "AI Proctor",
    };

    saveStoredResults([result, ...getStoredResults()]);
    setPhase("submitted");
  }, [
    answers, questions, score, testMeta, trustScore, strikes,
    violations, camStatus, stopStream, engineState,
  ]);

  /* Auto-submit once the strike limit is reached. */
  useEffect(() => {
    if (phase === "test" && strikes >= MAX_STRIKES && !submittedRef.current) {
      handleFinalSubmit();
    }
  }, [strikes, phase, handleFinalSubmit]);

  /* ── Timer ───────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "test") return undefined;

    // Anchored to a wall-clock deadline. A per-tick decrement drifts whenever
    // the tab is throttled, silently handing back extra exam time.
    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + timeLeft * 1000;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((deadlineRef.current - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) handleFinalSubmit();
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, handleFinalSubmit]);

  /* ── Detection loop ──────────────────────────────────────── */
  useEffect(() => {
    if (camStatus !== "active" || phase === "submitted") return undefined;

    let cancelled = false;
    let timer = null;
    let running = false;

    const run = async () => {
      // Skips rather than stacking when a frame takes longer than the
      // interval; overlapping runs double-counted violation frames.
      if (cancelled || running || !videoRef.current) return;
      running = true;

      try {
        const res = await faceDetector.detectFaces(videoRef.current, { simulationMode });
        if (cancelled) return;

        setDetection(res);

        const canvas = canvasRef.current;
        if (canvas && videoRef.current) {
          // Match the backing store to the element's real box so the HUD is
          // never stretched by CSS.
          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = Math.round(rect.width * dpr);
          const h = Math.round(rect.height * dpr);
          if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
          }
          faceDetector.drawHUD(canvas, videoRef.current, res);
        }

        if (phaseRef.current !== "test") return;

        const now = Date.now();

        if (res.status === "multi_face" || res.faceCount > 1) {
          multiFaceCount.current += 1;
          noFaceCount.current = 0;
          if (
            multiFaceCount.current >= MULTI_FACE_FRAMES &&
            now - lastAlertRef.current > MULTI_FACE_COOLDOWN
          ) {
            lastAlertRef.current = now;
            recordViolation(
              "Multiple faces detected",
              `${res.faceCount} people are visible. Exactly one face must be in frame.`,
              "critical"
            );
          }
        } else if (
          res.status === "loading" ||
          res.status === "engine_unavailable" ||
          res.status === "no_feed"
        ) {
          // No detector, no judgement — never strike a candidate for a
          // condition they cannot influence.
          multiFaceCount.current = 0;
          noFaceCount.current = 0;
        } else if (res.status === "no_face" || res.faceCount === 0) {
          noFaceCount.current += 1;
          multiFaceCount.current = 0;
          if (
            noFaceCount.current >= NO_FACE_FRAMES &&
            now - lastAlertRef.current > NO_FACE_COOLDOWN
          ) {
            lastAlertRef.current = now;
            recordViolation(
              "Candidate not detected",
              "No face was visible for several seconds. Return to the camera view.",
              "warn"
            );
          }
        } else {
          multiFaceCount.current = 0;
          noFaceCount.current = 0;
        }
      } catch {
        // A dropped frame must not kill the loop.
      } finally {
        running = false;
      }
    };

    timer = setInterval(run, DETECT_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [camStatus, phase, simulationMode, recordViolation]);

  /* ── Fullscreen & focus enforcement ──────────────────────── */
  const enterFullscreenAndStart = async () => {
    if (camStatus !== "active") return;

    try {
      const el = document.documentElement;
      const request =
        el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (request) await request.call(el);
    } catch (err) {
      console.warn("Fullscreen request failed; continuing in windowed mode:", err);
    } finally {
      deadlineRef.current = null; // start the clock now, not at mount
      setPhase("test");
      audioAlerts.playSuccessChime();
    }
  };

  const resumeFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        const request = el.requestFullscreen || el.webkitRequestFullscreen;
        if (request) await request.call(el);
      }
      audioAlerts.playSuccessChime();
    } catch {
      // Some browsers refuse without a fresh gesture; unlock either way.
    } finally {
      setFullscreenLockout(false);
    }
  };

  useEffect(() => {
    if (phase !== "test") return undefined;

    const onFullscreenChange = () => {
      const inFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      if (!inFs && !submittedRef.current) {
        setLockoutReason("Fullscreen mode was exited. Fullscreen is mandatory during the exam.");
        setFullscreenLockout(true);
        recordViolation(
          "Fullscreen exited",
          "The candidate left fullscreen mode.",
          "critical"
        );
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden && !submittedRef.current) {
        setLockoutReason("Tab switch or window minimise detected. Stay on the exam tab.");
        setFullscreenLockout(true);
        recordViolation(
          "Tab switch detected",
          "The candidate navigated away from the exam window.",
          "critical"
        );
      }
    };

    // `blur` also fires when the tab is hidden, which double-counted a single
    // tab switch as two violations. visibilitychange owns that case.
    const onBlur = () => {
      if (!document.hidden && !submittedRef.current) {
        recordViolation(
          "Window focus lost",
          "The candidate interacted with another application.",
          "warn"
        );
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase, recordViolation]);

  /* Warn before an accidental reload/close mid-exam. */
  useEffect(() => {
    if (phase !== "test") return undefined;
    const onBeforeUnload = (e) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  /* Toast expiry — one timer per toast. */
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const id = setTimeout(() => setToasts((prev) => prev.slice(0, -1)), 4500);
    return () => clearTimeout(id);
  }, [toasts]);

  const toggleMute = () => {
    const tracks = streamRef.current?.getAudioTracks() || [];
    if (tracks.length === 0) return; // don't flip the icon with no mic
    const nextMuted = !isMuted;
    tracks.forEach((t) => { t.enabled = !nextMuted; });
    setIsMuted(nextMuted);
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const answeredCount = Object.keys(answers).length;
  const isMultiFace = detection.status === "multi_face" || detection.faceCount > 1;
  const isNoFace = detection.status === "no_face" || detection.faceCount === 0;

  /* ══════════════════════════════════════════════════════════
     SCREEN 1 — Instructions & system check
     ══════════════════════════════════════════════════════════ */
  if (phase === "instructions") {
    const engineUnavailable = engineState === ENGINE.UNAVAILABLE;
    const engineLoading = engineState === ENGINE.LOADING;
    const faceVerified = detection.faceCount === 1;

    // If the detector genuinely cannot load, fall back to camera-only
    // verification rather than locking the candidate out of their exam.
    // The degradation is shown on screen and recorded on the submission.
    const ready =
      camStatus === "active" && (faceVerified || engineUnavailable);

    return (
      <div className="tt-screen tt-instructions">
        <div className="tt-instr-card">
          <header className="tt-instr-head">
            <span className="tt-shield"><FaShieldAlt /></span>
            <h1>{testMeta.title}</h1>
            <div className="tt-instr-tags">
              <span className="badge badge-neutral">{testMeta.code}</span>
              <span className="badge badge-danger"><FaLock /> Strict proctoring</span>
            </div>
          </header>

          <div className="tt-instr-facts">
            <Fact label="Duration" value={`${testMeta.duration} min`} />
            <Fact label="Questions" value={questions.length} />
            <Fact label="Total marks" value={testMeta.totalMarks} />
            <Fact label="Strike limit" value={MAX_STRIKES} />
          </div>

          <section className="tt-syscheck">
            <h2 className="tt-section-title"><FaVideo /> Hardware &amp; security check</h2>
            <p className="tt-section-sub">
              Camera verification and fullscreen authorisation are required before you can begin.
            </p>

            <div className="tt-syscheck-grid">
              <div className="tt-cam-preview">
                <div className="tt-viewport">
                  <video ref={videoRef} className="tt-video" muted playsInline autoPlay />
                  <canvas ref={canvasRef} className="tt-hud" />

                  {camStatus === "active" ? (
                    <span className="tt-live-pill">
                      <span className="dot dot-pulse" /> Live AI tracking
                    </span>
                  ) : (
                    <div className="tt-cam-prompt">
                      <FaVideo className="tt-cam-prompt-icon" />
                      <h3>Camera access required</h3>
                      <p>Grant access to activate facial verification.</p>
                      <button
                        className="btn btn-primary"
                        onClick={requestCameraAccess}
                        disabled={camStatus === "requesting"}
                      >
                        {camStatus === "requesting" ? <span className="spinner" /> : <FaVideo />}
                        Enable webcam
                      </button>
                    </div>
                  )}
                </div>

                {camStatus === "denied" && (
                  <div className="alert alert-error">
                    <FaExclamationTriangle />
                    <div className="alert-body">
                      <div className="alert-title">Camera blocked</div>
                      <div>{camErrorMsg}</div>
                    </div>
                    <button className="btn btn-sm btn-danger-soft" onClick={requestCameraAccess}>
                      <FaRedoAlt /> Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="tt-checklist">
                <Check
                  ok={camStatus === "active"}
                  title="Camera access"
                  text={camStatus === "active" ? "Webcam authorised and active" : "Webcam permission required"}
                />
                <Check
                  ok={faceVerified}
                  optional={engineUnavailable}
                  title="Single face verification"
                  text={
                    engineLoading
                      ? "Loading the detection model…"
                      : engineUnavailable
                      ? "Detector unavailable — proceeding with camera recording only"
                      : faceVerified
                      ? "Candidate identified"
                      : detection.faceCount > 1
                      ? "Multiple faces — only one person may be visible"
                      : "Align your face with the centre guide"
                  }
                />
                <Check
                  ok={isMicAvailable}
                  optional
                  title="Audio stream"
                  text={isMicAvailable ? "Microphone detected" : "No microphone — video-only proctoring"}
                />
                <Check
                  ok
                  info
                  title="Fullscreen lockdown"
                  text="Exiting fullscreen or switching tabs is recorded as a violation."
                />
              </div>
            </div>
          </section>

          <ul className="tt-rules">
            <li><FaCheckCircle className="is-ok" /> Keep your face centred in frame for the whole exam.</li>
            <li><FaExclamationTriangle className="is-warn" /> Extra people in frame, or leaving frame, trigger strikes.</li>
            <li><FaExclamationTriangle className="is-warn" /> {MAX_STRIKES} strikes auto-submits your paper for review.</li>
          </ul>

          <footer className="tt-instr-foot">
            <button
              className="btn btn-primary btn-lg"
              disabled={!ready}
              onClick={enterFullscreenAndStart}
            >
              <FaExpand /> Authorise fullscreen &amp; begin <FaChevronRight />
            </button>
            {!ready && (
              <p className="tt-gate-note">
                <FaExclamationTriangle />{" "}
                {camStatus !== "active"
                  ? "Enable your camera to unlock the exam."
                  : engineLoading
                  ? "Loading the face-detection model — this takes a few seconds on first run."
                  : detection.faceCount > 1
                  ? "More than one person is visible. Only the candidate may be in frame."
                  : "Align your face with the centre guide to unlock the exam."}
              </p>
            )}

            {engineUnavailable && camStatus === "active" && (
              <div className="alert alert-warning tt-engine-warning">
                <FaExclamationTriangle />
                <div className="alert-body">
                  <div className="alert-title">Face detection could not start</div>
                  <div>
                    Your camera is recording and fullscreen rules still apply, but
                    automatic identity checks are off for this attempt. This is
                    noted on your submission for the invigilator.
                  </div>
                </div>
              </div>
            )}
          </footer>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     SCREEN 2 — Results
     ══════════════════════════════════════════════════════════ */
  if (phase === "submitted") {
    const pct = testMeta.totalMarks > 0
      ? Math.round((score / testMeta.totalMarks) * 100)
      : 0;
    const passed = pct >= 60;

    return (
      <div className="tt-screen tt-submitted">
        <div className="tt-result-card">
          <span className={`tt-result-icon ${passed ? "is-pass" : "is-fail"}`}>
            {passed ? <FaCheckCircle /> : <FaTimes />}
          </span>

          <h1>{passed ? "Assessment submitted" : "Assessment completed"}</h1>
          <p className="tt-result-sub">
            Your answers and proctoring log have been recorded and sent to the faculty.
          </p>

          <div className="tt-score">
            <span className={`tt-score-num ${passed ? "is-pass" : "is-fail"}`}>
              {Math.round(score)}
            </span>
            <span className="tt-score-den">/ {testMeta.totalMarks}</span>
          </div>
          <div className={`tt-score-pct ${passed ? "is-pass" : "is-fail"}`}>{pct}%</div>

          <div className="progress-track tt-score-bar">
            <div
              className={`progress-fill ${passed ? "is-success" : "is-danger"}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="tt-result-stats">
            <ResultStat label="Answered" value={`${answeredCount}/${questions.length}`} />
            <ResultStat
              label="Correct"
              value={questions.filter((q) => answers[q.id] === q.correct).length}
            />
            <ResultStat label="Trust score" value={`${trustScore}%`} />
            <ResultStat label="Strikes" value={`${strikes}/${MAX_STRIKES}`} />
          </div>

          {violations.length > 0 && (
            <div className="alert alert-warning tt-result-alert">
              <FaShieldAlt />
              <div className="alert-body">
                <div className="alert-title">
                  {violations.length} proctoring event{violations.length === 1 ? "" : "s"} logged
                </div>
                <div>These have been attached to your submission for faculty review.</div>
              </div>
            </div>
          )}

          <div className="tt-result-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/student")}>
              <FaHome /> Back to dashboard
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate("/results")}>
              <FaChartBar /> View analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     SCREEN 3 — Live exam
     ══════════════════════════════════════════════════════════ */
  const q = questions[current] || questions[0];
  const progressPct = ((current + 1) / questions.length) * 100;

  return (
    <div className={`tt-screen tt-exam ${isMultiFace ? "is-alert" : ""}`}>
      {/* Lockout overlays */}
      {fullscreenLockout && (
        <div className="tt-lockout">
          <div className="tt-lockout-card">
            <span className="tt-lockout-icon"><FaLock /></span>
            <h2>Security lockdown</h2>
            <p>{lockoutReason}</p>
            <div className="tt-lockout-strike">
              <span>Strike recorded</span>
              <strong>{strikes} of {MAX_STRIKES}</strong>
            </div>
            <p className="tt-lockout-note">
              SmartAssess requires fullscreen throughout. Tab switching and fullscreen
              exits are logged for review.
            </p>
            <button className="btn btn-primary btn-lg" onClick={resumeFullscreen}>
              <FaExpand /> Re-enter fullscreen &amp; resume
            </button>
          </div>
        </div>
      )}

      {camStatus === "stream_lost" && (
        <div className="tt-lockout">
          <div className="tt-lockout-card">
            <span className="tt-lockout-icon is-danger"><FaVideoSlash /></span>
            <h2>Camera feed interrupted</h2>
            <p>Continuous camera access is required to proctor this exam.</p>
            <button className="btn btn-primary btn-lg" onClick={requestCameraAccess}>
              <FaRedoAlt /> Reconnect webcam
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="tt-header">
        <div className="tt-header-left">
          <FaShieldAlt className="tt-header-shield" />
          <div className="tt-header-titles">
            <span className="tt-header-title">{testMeta.title}</span>
            <span className="tt-header-code">{testMeta.code}</span>
          </div>
        </div>

        <div className={`tt-timer ${timeLeft < 300 ? "is-urgent" : ""}`}>
          <FaClock /> <span className="tabular">{fmt(timeLeft)}</span>
        </div>

        <div className="tt-header-right">
          <span
            className={`badge badge-lg ${
              trustScore >= 80 ? "badge-success" : trustScore >= 50 ? "badge-warning" : "badge-danger"
            }`}
            title="Integrity score"
          >
            <FaShieldAlt /> {trustScore}%
          </span>
          <span className={`badge badge-lg ${strikes > 0 ? "badge-danger" : "badge-neutral"}`}>
            Strikes {strikes}/{MAX_STRIKES}
          </span>
          <span className="tt-progress-text">
            {answeredCount}/{questions.length}
          </span>
          <button className="btn btn-primary btn-sm" onClick={handleFinalSubmit}>
            Submit test
          </button>
        </div>
      </header>

      {/* Toasts */}
      <div className="tt-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`tt-toast ${t.type === "critical" ? "is-critical" : "is-warn"}`}>
            <FaExclamationTriangle /> {t.msg}
          </div>
        ))}
      </div>

      <div className="tt-layout">
        {/* Question pane */}
        <main className="tt-question-pane">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="tt-question-card">
            <div className="tt-q-meta">
              <span className="tt-q-num">Question {current + 1} of {questions.length}</span>
              <button
                className={`btn btn-sm ${flagged.has(current) ? "btn-primary" : "btn-secondary"}`}
                onClick={() =>
                  setFlagged((prev) => {
                    const next = new Set(prev);
                    if (next.has(current)) next.delete(current);
                    else next.add(current);
                    return next;
                  })
                }
              >
                <FaFlag /> {flagged.has(current) ? "Flagged" : "Flag"}
              </button>
            </div>

            <h2 className="tt-q-text">{q.text}</h2>

            <div className="tt-options" role="radiogroup" aria-label="Answer options">
              {q.options.map((opt, i) => (
                <label key={i} className={`tt-option ${answers[q.id] === i ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                  />
                  <span className="tt-option-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="tt-option-text">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="tt-nav">
            <button
              className="btn btn-secondary"
              disabled={current === 0}
              onClick={() => setCurrent((p) => Math.max(0, p - 1))}
            >
              <FaChevronLeft /> Previous
            </button>

            <div className="tt-dots">
              {questions.map((sq, i) => (
                <button
                  key={sq.id}
                  className={`tt-dot ${i === current ? "is-current" : ""} ${
                    answers[sq.id] !== undefined ? "is-answered" : ""
                  } ${flagged.has(i) ? "is-flagged" : ""}`}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to question ${i + 1}`}
                  aria-current={i === current}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {current < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrent((p) => p + 1)}>
                Next <FaChevronRight />
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleFinalSubmit}>
                Finish &amp; submit
              </button>
            )}
          </div>
        </main>

        {/* Proctoring pane */}
        <aside className="tt-side">
          <div className={`tt-cam-widget ${camExpanded ? "is-expanded" : ""}`}>
            <div className="tt-cam-bar">
              <span className="tt-cam-title"><FaShieldAlt /> AI proctoring</span>
              <div className="tt-cam-controls">
                <button
                  className={`btn btn-icon ${isMuted ? "is-muted" : ""}`}
                  onClick={toggleMute}
                  disabled={!isMicAvailable}
                  title={!isMicAvailable ? "No microphone" : isMuted ? "Unmute" : "Mute"}
                  aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                </button>
                <button
                  className="btn btn-icon"
                  onClick={() => setCamExpanded((p) => !p)}
                  aria-label={camExpanded ? "Collapse camera" : "Expand camera"}
                >
                  {camExpanded ? <FaCompress /> : <FaExpand />}
                </button>
              </div>
            </div>

            <div className="tt-viewport">
              <video ref={videoRef} className="tt-video" muted playsInline autoPlay />
              <canvas ref={canvasRef} className="tt-hud" />

              <span
                className={`tt-cam-status ${
                  isMultiFace ? "is-critical" : isNoFace ? "is-warn" : "is-ok"
                }`}
              >
                {isMultiFace ? <><FaUserFriends /> Multiple faces</>
                  : isNoFace ? <><FaEye /> Not detected</>
                  : <><FaCheckCircle /> Verified</>}
              </span>

              <span className="tt-cam-live"><span className="dot dot-pulse" /> Live</span>
            </div>

            <div className="tt-cam-foot">
              <span className={`dot ${isMultiFace ? "is-critical" : "is-ok"}`} />
              <span>{detection.message}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-head-left">
                <FaShieldAlt className="card-head-icon" />
                <h3 className="card-title">Audit log ({violations.length})</h3>
              </div>
            </div>
            <div className="card-body-flush tt-audit">
              {violations.length === 0 ? (
                <div className="tt-audit-clean">
                  <FaCheckCircle />
                  <span>No infractions recorded.</span>
                </div>
              ) : (
                violations.slice(0, 6).map((v) => (
                  <div key={v.id} className={`tt-audit-row is-${v.severity}`}>
                    <span className="tt-audit-time tabular">{v.time}</span>
                    <div>
                      <strong>{v.title}</strong>
                      <p>{v.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className="card tt-sim">
              <button className="tt-sim-toggle" onClick={() => setShowSimPanel((p) => !p)}>
                <FaBug /> Proctoring test suite {showSimPanel ? "▲" : "▼"}
              </button>
              {showSimPanel && (
                <div className="tt-sim-body">
                  <p className="field-hint">Simulate security events (development only).</p>
                  <div className="tt-sim-grid">
                    {[
                      { key: "multi_face", label: "2nd person" },
                      { key: "no_face", label: "Candidate leaves" },
                      { key: "look_away", label: "Looking away" },
                    ].map((s) => (
                      <button
                        key={s.key}
                        className={`btn btn-sm ${simulationMode === s.key ? "btn-primary" : "btn-secondary"}`}
                        onClick={() =>
                          setSimulationMode((m) => (m === s.key ? "none" : s.key))
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      className="btn btn-sm btn-danger-soft"
                      onClick={() => {
                        setLockoutReason("Simulated fullscreen exit.");
                        setFullscreenLockout(true);
                        recordViolation("Tab switch (simulated)", "Simulated navigation away.", "critical");
                      }}
                    >
                      Exit fullscreen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ── Local presentational helpers ───────────────────────────── */

function Fact({ label, value }) {
  return (
    <div className="tt-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Check({ ok, optional, info, title, text }) {
  const state = info ? "is-info" : ok ? "is-ok" : optional ? "is-pending" : "is-fail";
  return (
    <div className={`tt-check ${state}`}>
      <span className="tt-check-icon">
        {info ? <FaLock /> : ok ? <FaCheckCircle /> : optional ? <FaMicrophoneSlash /> : <FaTimes />}
      </span>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function ResultStat({ label, value }) {
  return (
    <div className="tt-result-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
