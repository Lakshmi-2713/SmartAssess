import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "react-icons/fa";
import {
  getStoredTests,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredResults,
  saveStoredResults,
} from "../services/storage";
import { faceDetector } from "../services/faceDetector";
import { audioAlerts } from "../services/audioAlerts";
import "../styles/takeTest.css";

/* ─── Subject-Specific Question Banks ─── */
const QUESTION_BANKS = {
  Java: [
    { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: 1 },
    { id: 2, text: "Which keyword is used to inherit a class in Java?", options: ["implements", "inherits", "extends", "import"], correct: 2 },
    { id: 3, text: "What is the size of int data type in Java?", options: ["8 bit", "16 bit", "32 bit", "64 bit"], correct: 2 },
    { id: 4, text: "Which of these is NOT a Java access modifier?", options: ["public", "protected", "friend", "private"], correct: 2 },
    { id: 5, text: "Which collection allows duplicate elements?", options: ["Set", "List", "Map", "TreeSet"], correct: 1 },
  ],
  DSA: [
    { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: 1 },
    { id: 2, text: "What is the worst-case time complexity of Quick Sort?", options: ["O(n log n)", "O(n²)", "O(n)", "O(log n)"], correct: 1 },
    { id: 3, text: "Which traversal visits the root node first?", options: ["In-order", "Post-order", "Pre-order", "Level-order"], correct: 2 },
    { id: 4, text: "What is the time complexity of searching in a balanced BST?", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], correct: 2 },
    { id: 5, text: "Which algorithm is used to find shortest paths from a single source in weighted graphs?", options: ["Kruskal", "Prim", "Dijkstra", "Floyd-Warshall"], correct: 2 },
  ],
  "Web Dev": [
    { id: 1, text: "Which HTML tag is used for internal CSS styles?", options: ["<css>", "<script>", "<style>", "<link>"], correct: 2 },
    { id: 2, text: "What does CSS stand for?", options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style System", "Colorful Style Sheet"], correct: 1 },
    { id: 3, text: "Which hook manages local component state in React?", options: ["useEffect", "useMemo", "useState", "useRef"], correct: 2 },
    { id: 4, text: "What HTTP status code means 'Resource Not Found'?", options: ["200", "401", "404", "500"], correct: 2 },
    { id: 5, text: "Which of the following is NOT a JavaScript data type?", options: ["undefined", "boolean", "float", "symbol"], correct: 2 },
  ],
  DBMS: [
    { id: 1, text: "What does SQL stand for?", options: ["Structured Query Language", "Simple Question Language", "Sequential Query Logic", "Standard Query Language"], correct: 0 },
    { id: 2, text: "Which SQL clause is used to filter grouped data?", options: ["WHERE", "ORDER BY", "HAVING", "GROUP BY"], correct: 2 },
    { id: 3, text: "What does ACID stand for in DBMS?", options: ["Atomicity, Consistency, Isolation, Durability", "Automated, Compact, Isolated, Durable", "All, Clear, Indexed, Data", "Accuracy, Control, Integrity, Definition"], correct: 0 },
    { id: 4, text: "Which normal form eliminates transitive dependency?", options: ["1NF", "2NF", "3NF", "BCNF"], correct: 2 },
    { id: 5, text: "Which command permanently removes all records without row-by-row logging?", options: ["DELETE", "DROP", "TRUNCATE", "REMOVE"], correct: 2 },
  ],
  OS: [
    { id: 1, text: "Which scheduling algorithm gives minimum average waiting time?", options: ["FCFS", "Round Robin", "SJF (Shortest Job First)", "Priority"], correct: 2 },
    { id: 2, text: "What is a deadlock condition where each process holds a resource and waits for another?", options: ["Mutual Exclusion", "Hold and Wait", "No Preemption", "Circular Wait"], correct: 1 },
    { id: 3, text: "What is the main purpose of virtual memory?", options: ["Speed up CPU", "Simulate larger memory space", "Prevent viruses", "Cache GPU instructions"], correct: 1 },
    { id: 4, text: "Which memory management technique divides physical memory into fixed-size blocks?", options: ["Segmentation", "Paging", "Fragmentation", "Swapping"], correct: 1 },
    { id: 5, text: "Which system call creates a new child process in UNIX/Linux?", options: ["fork()", "exec()", "spawn()", "create()"], correct: 0 },
  ],
};

const MAX_STRIKES = 5;

export default function TakeTest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const testIdParam = searchParams.get("testId");
  const storedTests = getStoredTests();
  const activeTestObj = (() => {
    if (testIdParam) {
      const found = storedTests.find((t) => String(t.id) === String(testIdParam));
      if (found) return found;
    }
    try {
      const raw = localStorage.getItem("smartassess_active_test");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return (
      storedTests[0] || {
        id: 1,
        title: "Java Programming Fundamentals",
        subject: "Java",
        duration: 60,
        marks: 100,
      }
    );
  })();

  const questions = QUESTION_BANKS[activeTestObj.subject] || QUESTION_BANKS.DSA;
  const testMeta = {
    id: activeTestObj.id,
    title: activeTestObj.title,
    code: `${(activeTestObj.subject || "CS").toUpperCase()}-EXAM`,
    duration: activeTestObj.duration || 60,
    totalMarks: activeTestObj.marks || 100,
  };

  /* ── Exam Phase ── */
  const [phase, setPhase] = useState("instructions"); // instructions | test | submitted
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(testMeta.duration * 60);

  /* ── Strict Proctoring States ── */
  const [camStatus, setCamStatus] = useState("uninitialized"); // uninitialized | granted | active | denied | error | stream_lost
  const [camErrorMsg, setCamErrorMsg] = useState("");
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState(false);

  // Fullscreen states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenLockout, setFullscreenLockout] = useState(false);
  const [lockoutReason, setLockoutReason] = useState("");

  // Face Detection states
  const [detectionResult, setDetectionResult] = useState({
    faces: [],
    faceCount: 0,
    status: "initializing",
    isCentered: true,
    lightingOk: true,
    message: "Initializing proctoring engine...",
  });
  const [simulationMode, setSimulationMode] = useState("none"); // none | multi_face | no_face | look_away

  // Violation Audit & Trust Score
  const [violations, setViolations] = useState([]);
  const [strikes, setStrikes] = useState(0);
  const [trustScore, setTrustScore] = useState(100);
  const [floatingToasts, setFloatingToasts] = useState([]);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [camExpanded, setCamExpanded] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastAlertTimeRef = useRef(0);
  const noFaceCounterRef = useRef(0);
  const multiFaceCounterRef = useRef(0);

  /* ── Helper: Add Violation Log & Sound ── */
  const recordViolation = useCallback((title, details, severity = "warn") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
    const newViolation = {
      id: `${Date.now()}-${Math.random()}`,
      time: timeStr,
      title,
      details,
      severity,
    };

    setViolations((prev) => [newViolation, ...prev]);

    // Update strikes and trust score
    setStrikes((prevStrikes) => {
      const nextStrikes = prevStrikes + 1;
      return nextStrikes;
    });

    setTrustScore((prev) => Math.max(10, prev - (severity === "critical" ? 20 : 12)));

    // Toast alert
    setFloatingToasts((prev) => [
      { id: Date.now(), msg: `${title}: ${details}`, type: severity },
      ...prev.slice(0, 3),
    ]);

    // Audio alert
    if (severity === "critical" || title.includes("Multiple")) {
      audioAlerts.playMultiFaceAlert();
    } else {
      audioAlerts.playFullscreenViolationAlert();
    }
  }, []);

  /* ── 1. Strict Camera Access Handler ── */
  const requestCameraAccess = useCallback(async () => {
    setCamStatus("requesting");
    setCamErrorMsg("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support WebRTC camera access. Please use modern Chrome, Edge, or Firefox.");
      }

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: "user",
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      }).catch(async (audioErr) => {
        // Fallback to video-only if microphone is absent or blocked
        console.warn("Audio track failed, requesting video only:", audioErr);
        setIsMicAvailable(false);
        return await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            facingMode: "user",
          },
          audio: false,
        });
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsMicAvailable(mediaStream.getAudioTracks().length > 0);

      // Track listeners for stream interruption
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setCamStatus("stream_lost");
          if (phase === "test") {
            recordViolation("Camera Stream Terminated", "Camera connection was lost or disconnected.", "critical");
          }
        };
        videoTrack.onmute = () => {
          setCamStatus("stream_lost");
        };
        videoTrack.onunmute = () => {
          setCamStatus("active");
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }

      setCamStatus("active");
      audioAlerts.playSuccessChime();
    } catch (err) {
      console.error("Camera access error:", err);
      setCamStatus("denied");
      setCamErrorMsg(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera access in your browser address bar settings to proceed."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
          ? "No webcam device found on this system. Please connect a working camera."
          : `Camera error: ${err.message || "Failed to initialize webcam"}`
      );
    }
  }, [phase, recordViolation]);

  /* Re-bind video element when phase changes or stream updates */
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase, stream]);

  /* ── 2. Real-time Face & Multi-Face Detection Loop ── */
  useEffect(() => {
    let active = true;
    let frameInterval = null;

    const runDetection = async () => {
      if (!active) return;
      if (videoRef.current && camStatus === "active") {
        try {
          const res = await faceDetector.detectFaces(videoRef.current, { simulationMode });
          if (active) {
            setDetectionResult(res);

            // Draw HUD on Canvas
            if (canvasRef.current && videoRef.current) {
              faceDetector.drawHUD(canvasRef.current, videoRef.current, res);
            }

            // Continuous Strict Multi-Frame Consistency Rules Engine during Exam
            if (phase === "test") {
              const now = Date.now();

              // Rule 1: Multiple Faces Detected (>1 face)
              // Avoid false detections by requiring 4 consecutive positive checks (~800ms)
              if (res.status === "multi_face" || res.faceCount > 1) {
                multiFaceCounterRef.current++;
                noFaceCounterRef.current = 0; // reset opposite counter

                if (multiFaceCounterRef.current >= 4 && now - lastAlertTimeRef.current > 6000) {
                  lastAlertTimeRef.current = now;
                  recordViolation(
                    "Multiple faces detected.",
                    `Detected ${res.faceCount} persons in camera frame. Exactly one face must be present.`,
                    "critical"
                  );
                }
              }
              // Rule 2: Candidate not detected (0 faces for specified duration ~2.5-3 seconds = 12 checks)
              else if (res.status === "no_face" || res.faceCount === 0) {
                noFaceCounterRef.current++;
                multiFaceCounterRef.current = 0; // reset opposite counter

                if (noFaceCounterRef.current >= 12 && now - lastAlertTimeRef.current > 7000) {
                  lastAlertTimeRef.current = now;
                  recordViolation(
                    "Candidate not detected.",
                    "No face detected in camera frame for specified duration. Return to camera view immediately.",
                    "warn"
                  );
                }
              }
              // Rule 3: Exactly One Face Present (Optimal)
              else {
                // Reset violation counters when exactly one face is confirmed
                multiFaceCounterRef.current = 0;
                noFaceCounterRef.current = 0;
              }
            }
          }
        } catch (e) {
          // ignore detection error on frame drop
        }
      }
    };

    // Run frame analysis every 200ms (5 FPS is optimal for real-time vision without CPU stress)
    frameInterval = setInterval(runDetection, 200);

    return () => {
      active = false;
      if (frameInterval) clearInterval(frameInterval);
    };
  }, [camStatus, phase, simulationMode, recordViolation]);

  /* ── 3. Strict Fullscreen Enforcement ── */
  const enterFullscreenAndStart = async () => {
    if (camStatus !== "active") {
      alert("Strict camera access is mandatory. Please enable your camera first.");
      return;
    }

    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setFullscreenLockout(false);
      setPhase("test");
      audioAlerts.playSuccessChime();
    } catch (err) {
      console.warn("Fullscreen request error, proceeding with window lock:", err);
      setIsFullscreen(true);
      setPhase("test");
    }
  };

  const resumeFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
      setFullscreenLockout(false);
      setIsFullscreen(true);
      audioAlerts.playSuccessChime();
    } catch (e) {
      setFullscreenLockout(false);
    }
  };

  /* Fullscreen & Tab Switch Watchers during Exam */
  useEffect(() => {
    if (phase !== "test") return;

    const handleFullscreenChange = () => {
      const isInFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isInFs);

      if (!isInFs) {
        setLockoutReason("Full Screen Mode Exited. Fullscreen is strictly mandatory during examination.");
        setFullscreenLockout(true);
        recordViolation("Fullscreen Exited", "Candidate left fullscreen mode (ESC or window resize).", "critical");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setLockoutReason("Tab Switch / Window Minimized Detected. You must stay on the examination tab.");
        setFullscreenLockout(true);
        recordViolation("Tab Switch Detected", "Candidate navigated away from examination window.", "critical");
      }
    };

    const handleWindowBlur = () => {
      // Window lost focus
      if (phase === "test" && !document.hidden) {
        recordViolation("Window Focus Lost", "Candidate interacted with external application.", "warn");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [phase, recordViolation]);

  /* Stop stream on complete unmount */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* ── Auto-submit if strikes exceeded ── */
  useEffect(() => {
    if (phase === "test" && strikes >= MAX_STRIKES) {
      alert("CRITICAL PROCTORING LIMIT EXCEEDED: 5 security strikes recorded. Test is being automatically submitted for disciplinary review.");
      handleFinalSubmit();
    }
  }, [strikes, phase]);

  /* ── Exam Countdown Timer ── */
  useEffect(() => {
    if (phase !== "test") return;
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  /* Remove floating toasts after timeout */
  useEffect(() => {
    if (floatingToasts.length === 0) return;
    const timer = setTimeout(() => {
      setFloatingToasts((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [floatingToasts]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const answeredCount = Object.keys(answers).length;
  const marksPerQuestion = testMeta.totalMarks / questions.length;
  const score = questions.reduce(
    (acc, qItem) => (answers[qItem.id] === qItem.correct ? acc + marksPerQuestion : acc),
    0
  );

  const handleFinalSubmit = () => {
    // Release fullscreen
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    const storedUser = JSON.parse(localStorage.getItem("user")) || {
      name: "Rahul Verma",
      email: "rahul.verma@student.com",
    };
    const calculatedScore = Math.round(score);

    const questionResults = questions.map((qItem) => {
      const isCorrect = answers[qItem.id] === qItem.correct;
      return {
        id: qItem.id,
        text: qItem.text,
        studentAns: answers[qItem.id] !== undefined ? qItem.options[answers[qItem.id]] : "Unanswered",
        correctAns: qItem.options[qItem.correct],
        isCorrect,
        maxMarks: marksPerQuestion,
        scoreGiven: isCorrect ? marksPerQuestion : 0,
      };
    });

    const newSub = {
      id: Date.now(),
      studentName: storedUser.name || "Rahul Verma",
      studentEmail: storedUser.email || "rahul.verma@student.com",
      testId: testMeta.id,
      testTitle: testMeta.title,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      score: `${calculatedScore} / ${testMeta.totalMarks}`,
      totalScore: calculatedScore,
      status: "Graded & Published",
      feedback:
        calculatedScore >= 60
          ? "Well done! Solid demonstration of key concepts."
          : "Need revision on fundamentals and practical scenarios.",
      questions: questionResults,
      proctoring: {
        trustScore,
        totalStrikes: strikes,
        violationsList: violations,
        cameraVerified: true,
      },
    };

    const subs = getStoredSubmissions();
    saveStoredSubmissions([newSub, ...subs]);

    const newResult = {
      id: Date.now(),
      title: testMeta.title,
      test: testMeta.title,
      subject: activeTestObj.subject || "Computer Science",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      score: `${calculatedScore}%`,
      student: storedUser.name || "Rahul Verma",
      reviewer: "AI Proctor & Dr. Johnson",
    };
    const results = getStoredResults();
    saveStoredResults([newResult, ...results]);

    setPhase("submitted");
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
      setIsMuted((prev) => !prev);
    }
  };

  /* ──────────────────────────────────────────────────────────
     SCREEN 1: INSTRUCTION & STRICT PRE-EXAM SYSTEM VERIFICATION
  ────────────────────────────────────────────────────────── */
  if (phase === "instructions") {
    const isReadyToStart = camStatus === "active" && detectionResult.status !== "no_feed";

    return (
      <div className="tt-instruction-screen">
        <div className="tt-instr-card">
          <div className="tt-instr-header">
            <div className="tt-shield-badge">
              <FaShieldAlt className="tt-instr-shield" />
            </div>
            <h1>{testMeta.title}</h1>
            <div className="tt-header-tags">
              <span className="tt-instr-code">{testMeta.code}</span>
              <span className="tt-instr-badge strict">STRICT PROCTORING ENABLED</span>
            </div>
          </div>

          {/* Test Meta info */}
          <div className="tt-instr-grid">
            <div className="tt-instr-item">
              <strong>Duration</strong>
              <span>{testMeta.duration} mins</span>
            </div>
            <div className="tt-instr-item">
              <strong>Questions</strong>
              <span>{questions.length}</span>
            </div>
            <div className="tt-instr-item">
              <strong>Total Marks</strong>
              <span>{testMeta.totalMarks}</span>
            </div>
            <div className="tt-instr-item">
              <strong>Security Level</strong>
              <span style={{ color: "#10b981", fontSize: "16px" }}>Strict (AI Live)</span>
            </div>
          </div>

          {/* System Check & Camera Diagnostic View */}
          <div className="tt-syscheck-container">
            <h3 className="tt-section-title">
              <FaVideo /> Pre-Exam Hardware &amp; Security Validation
            </h3>
            <p className="tt-section-subtitle">
              Strict camera verification and fullscreen authorization are mandatory before starting this assessment.
            </p>

            <div className="tt-syscheck-layout">
              {/* Left: Camera Preview Viewport with HUD Canvas */}
              <div className="tt-cam-preview-box">
                <div className="tt-preview-viewport">
                  <video
                    ref={videoRef}
                    className="tt-preview-video"
                    muted
                    playsInline
                    autoPlay
                  />
                  <canvas ref={canvasRef} className="tt-hud-canvas" width={400} height={300} />

                  {camStatus === "active" && (
                    <div className="tt-live-indicator-pill">
                      <span className="tt-live-dot" /> LIVE AI TRACKING
                    </div>
                  )}

                  {camStatus !== "active" && (
                    <div className="tt-cam-prompt-overlay">
                      <FaVideo className="tt-cam-large-icon" />
                      <h4>Camera Access Required</h4>
                      <p>Click below to grant camera access and activate facial recognition.</p>
                      <button
                        className="btn-primary tt-grant-btn"
                        onClick={requestCameraAccess}
                      >
                        <FaVideo /> Enable Webcam
                      </button>
                    </div>
                  )}
                </div>

                {camStatus === "denied" && (
                  <div className="tt-cam-error-box">
                    <FaExclamationTriangle />
                    <div>
                      <strong>Camera Permission Blocked</strong>
                      <p>{camErrorMsg}</p>
                    </div>
                    <button className="btn-secondary btn-sm" onClick={requestCameraAccess}>
                      <FaRedoAlt /> Retry Access
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Validation Checklist */}
              <div className="tt-checklist-pane">
                <div className={`tt-check-card ${camStatus === "active" ? "pass" : "fail"}`}>
                  <div className="tt-check-icon">
                    {camStatus === "active" ? <FaCheckCircle /> : <FaTimes />}
                  </div>
                  <div className="tt-check-text">
                    <strong>1. Strict Camera Access</strong>
                    <span>
                      {camStatus === "active"
                        ? "Webcam authorized and active"
                        : "Mandatory: Webcam permission required"}
                    </span>
                  </div>
                </div>

                <div
                  className={`tt-check-card ${
                    camStatus === "active" && detectionResult.faceCount === 1 ? "pass" : "pending"
                  }`}
                >
                  <div className="tt-check-icon">
                    {detectionResult.faceCount === 1 ? <FaCheckCircle /> : <FaEye />}
                  </div>
                  <div className="tt-check-text">
                    <strong>2. Single Face Verification</strong>
                    <span>
                      {detectionResult.faceCount === 1
                        ? "Candidate Face Identified (Optimal)"
                        : detectionResult.faceCount > 1
                        ? "Multiple Faces in View — Ensure only 1 person is visible"
                        : "Align your face with the center target oval"}
                    </span>
                  </div>
                </div>

                <div className={`tt-check-card ${isMicAvailable ? "pass" : "pending"}`}>
                  <div className="tt-check-icon">
                    {isMicAvailable ? <FaCheckCircle /> : <FaMicrophoneSlash />}
                  </div>
                  <div className="tt-check-text">
                    <strong>3. Audio Proctoring Stream</strong>
                    <span>
                      {isMicAvailable ? "Microphone input detected & active" : "Microphone inactive or muted"}
                    </span>
                  </div>
                </div>

                <div className="tt-check-card info">
                  <div className="tt-check-icon">
                    <FaLock />
                  </div>
                  <div className="tt-check-text">
                    <strong>4. Full Screen Lockdown</strong>
                    <span>Exam runs in locked fullscreen. Exiting or switching tabs logs violations.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rules list */}
          <ul className="tt-rules">
            <li>
              <FaCheckCircle className="rule-icon ok" /> Keep your face centered inside the frame throughout the examination.
            </li>
            <li>
              <FaExclamationTriangle className="rule-icon warn" /> Detection of multiple people or absence from camera will trigger immediate security strikes.
            </li>
            <li>
              <FaExclamationTriangle className="rule-icon warn" /> Max 5 security strikes allowed before auto-disqualification.
            </li>
          </ul>

          {/* Action Button */}
          <div className="tt-action-footer">
            <button
              className={`tt-start-btn ${!isReadyToStart ? "btn-disabled" : ""}`}
              disabled={!isReadyToStart}
              onClick={enterFullscreenAndStart}
            >
              <FaExpand /> Authorize Fullscreen &amp; Begin Assessment <FaChevronRight />
            </button>
            {!isReadyToStart && (
              <p className="tt-gating-note">
                ⚠ You must enable your camera and align your face to unlock the assessment.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────
     SCREEN 2: SUBMITTED RESULTS SCREEN
  ────────────────────────────────────────────────────────── */
  if (phase === "submitted") {
    const pct = Math.round((score / testMeta.totalMarks) * 100);
    const passed = pct >= 60;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="tt-submitted-screen">
        <div className="tt-result-card">
          <div className={`tt-result-icon ${passed ? "result-pass" : "result-fail"}`}>
            {passed ? <FaCheckCircle /> : <FaTimes />}
          </div>
          <h2>{passed ? "Assessment Submitted Successfully!" : "Assessment Completed"}</h2>
          <p className="tt-result-sub">
            Your answers and strict proctoring logs have been recorded and sent to the faculty.
          </p>

          <div className="tt-score-display">
            <span className="tt-score-num" style={{ color: passed ? "#10b981" : "#ef4444" }}>
              {Math.round(score)}
            </span>
            <span className="tt-score-denom">/ {testMeta.totalMarks}</span>
          </div>
          <div className="tt-score-pct" style={{ color: passed ? "#10b981" : "#ef4444" }}>
            {pct}% Score
          </div>

          <div className="tt-mini-bar-track">
            <div
              className="tt-mini-bar-fill"
              style={{ width: `${pct}%`, background: passed ? "#10b981" : "#ef4444" }}
            />
          </div>

          {/* Proctoring Trust Report */}
          <div className="tt-proctor-summary-card">
            <div className="tt-proctor-metric">
              <span className="metric-label">Proctoring Trust Score</span>
              <strong
                className="metric-val"
                style={{ color: trustScore >= 80 ? "#10b981" : trustScore >= 50 ? "#f59e0b" : "#ef4444" }}
              >
                {trustScore}%
              </strong>
            </div>
            <div className="tt-proctor-metric">
              <span className="metric-label">Security Strikes</span>
              <strong className="metric-val" style={{ color: strikes === 0 ? "#10b981" : "#ef4444" }}>
                {strikes} / {MAX_STRIKES}
              </strong>
            </div>
            <div className="tt-proctor-metric">
              <span className="metric-label">Logged Violations</span>
              <strong className="metric-val">{violations.length}</strong>
            </div>
          </div>

          <div className="tt-stat-row">
            <div className="tt-stat">
              <span>Answered</span>
              <strong>
                {answeredCount}/{questions.length}
              </strong>
            </div>
            <div className="tt-stat">
              <span>Correct</span>
              <strong>
                {questions.filter((qItem) => answers[qItem.id] === qItem.correct).length}
              </strong>
            </div>
            <div className="tt-stat">
              <span>Fullscreen Status</span>
              <strong style={{ color: "#10b981" }}>Validated</strong>
            </div>
          </div>

          <div className="tt-result-buttons">
            <button className="tt-start-btn" onClick={() => navigate("/student")}>
              <FaHome /> Student Dashboard
            </button>
            <button className="btn-secondary" onClick={() => navigate("/results")}>
              View Analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────
     SCREEN 3: ACTIVE TEST WITH STRICT LOCKDOWN & REAL-TIME PROCTORING
  ────────────────────────────────────────────────────────── */
  const q = questions[current] || questions[0];
  const isMultiFace = detectionResult.status === "multi_face" || detectionResult.faceCount > 1;
  const isNoFace = detectionResult.status === "no_face" || detectionResult.faceCount === 0;

  return (
    <div className={`tt-test-screen ${isMultiFace ? "border-critical-alert" : ""}`}>
      {/* ── Strict Fullscreen Lockdown Overlay Modal ── */}
      {fullscreenLockout && (
        <div className="tt-fullscreen-lockout-overlay">
          <div className="tt-lockout-modal">
            <div className="tt-lockout-pulse-icon">
              <FaLock />
            </div>
            <h2>STRICT SECURITY LOCKDOWN</h2>
            <p className="tt-lockout-msg">{lockoutReason || "Fullscreen mode was exited."}</p>

            <div className="tt-lockout-strike-bar">
              <span>Security Strike Incurred!</span>
              <strong>
                Strike {strikes} of {MAX_STRIKES}
              </strong>
            </div>

            <div className="tt-lockout-warning-note">
              ⚠ SmartAssess requires full screen lockdown throughout the test. Tab switching or exiting full
              screen is strictly recorded for disciplinary audit.
            </div>

            <button className="btn-primary tt-resume-fs-btn" onClick={resumeFullscreen}>
              <FaExpand /> Re-Enter Fullscreen &amp; Resume Test
            </button>
          </div>
        </div>
      )}

      {/* ── Stream Interruption / Lost Camera Modal ── */}
      {camStatus === "stream_lost" && (
        <div className="tt-fullscreen-lockout-overlay">
          <div className="tt-lockout-modal">
            <div className="tt-lockout-pulse-icon" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
              <FaVideoSlash />
            </div>
            <h2>CAMERA FEED INTERRUPTED</h2>
            <p className="tt-lockout-msg">
              Continuous live camera access is strictly required to proctor this exam.
            </p>
            <button className="btn-primary tt-resume-fs-btn" onClick={requestCameraAccess}>
              <FaRedoAlt /> Reconnect Webcam
            </button>
          </div>
        </div>
      )}

      {/* ── Top Header Navigation Bar ── */}
      <header className="tt-header">
        <div className="tt-header-left">
          <FaShieldAlt className="tt-header-shield" />
          <div className="tt-title-group">
            <div className="tt-header-title">{testMeta.title}</div>
            <div className="tt-header-code">{testMeta.code}</div>
          </div>
        </div>

        <div className="tt-header-center">
          <div className={`tt-timer ${timeLeft < 300 ? "timer-urgent" : ""}`}>
            <FaClock /> {fmt(timeLeft)}
          </div>
        </div>

        <div className="tt-header-right">
          {/* Proctoring Trust Pill */}
          <div
            className={`tt-trust-badge ${
              trustScore >= 80 ? "trust-good" : trustScore >= 50 ? "trust-warn" : "trust-danger"
            }`}
            title="Integrity & Trust Score"
          >
            <FaShieldAlt /> {trustScore}% Trust
          </div>

          {/* Strikes Badge */}
          <div className={`tt-strikes-badge ${strikes > 0 ? "strikes-alert" : ""}`}>
            Strikes: {strikes}/{MAX_STRIKES}
          </div>

          <span className="tt-progress-text">
            {answeredCount}/{questions.length} answered
          </span>

          <button className="tt-submit-btn" onClick={handleFinalSubmit}>
            Submit Test
          </button>
        </div>
      </header>

      {/* ── Floating Notification Toasts ── */}
      <div className="tt-warnings-stack">
        {floatingToasts.map((toast) => (
          <div
            key={toast.id}
            className={`tt-warn-toast ${
              toast.type === "critical" ? "toast-urgent" : "toast-warn"
            }`}
          >
            <FaExclamationTriangle /> {toast.msg}
          </div>
        ))}
      </div>

      {/* ── Main Examination Layout ── */}
      <div className="tt-layout">
        {/* Left: Question Pane */}
        <main className="tt-question-pane">
          {/* Progress bar */}
          <div className="tt-progress-bar">
            <div
              className="tt-progress-fill"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="tt-question-card">
            <div className="tt-q-meta">
              <span className="tt-q-num">
                Question {current + 1} of {questions.length}
              </span>
              <button
                className={`tt-flag-btn ${flagged.has(current) ? "flagged" : ""}`}
                onClick={() =>
                  setFlagged((prev) => {
                    const n = new Set(prev);
                    n.has(current) ? n.delete(current) : n.add(current);
                    return n;
                  })
                }
                title="Flag for review"
              >
                <FaFlag /> {flagged.has(current) ? "Flagged" : "Flag"}
              </button>
            </div>

            <h2 className="tt-question-text">{q.text}</h2>

            <div className="tt-options">
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className={`tt-option ${answers[q.id] === i ? "selected" : ""}`}
                >
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

          {/* Navigation Controls */}
          <div className="tt-nav-row">
            <button
              className="btn-secondary"
              disabled={current === 0}
              onClick={() => setCurrent((p) => p - 1)}
            >
              <FaChevronLeft /> Previous
            </button>

            <div className="tt-q-dots">
              {questions.map((sq, i) => (
                <button
                  key={i}
                  className={`q-dot ${i === current ? "dot-current" : ""} ${
                    answers[sq.id] !== undefined ? "dot-answered" : ""
                  } ${flagged.has(i) ? "dot-flagged" : ""}`}
                  onClick={() => setCurrent(i)}
                  title={`Question ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {current < questions.length - 1 ? (
              <button className="btn-primary" onClick={() => setCurrent((p) => p + 1)}>
                Next <FaChevronRight />
              </button>
            ) : (
              <button className="btn-primary" onClick={handleFinalSubmit}>
                Finish &amp; Submit
              </button>
            )}
          </div>
        </main>

        {/* Right: Proctoring Camera HUD + Palette + Violation Log */}
        <aside className="tt-side-pane">
          {/* Real-time Proctoring Camera Widget */}
          <div className={`proctor-cam-widget ${camExpanded ? "cam-expanded" : ""}`}>
            <div className="cam-titlebar">
              <span className="cam-title">
                <FaShieldAlt className="cam-shield-icon" /> AI Proctoring HUD
              </span>
              <div className="cam-controls">
                <button
                  className={`cam-ctrl-btn ${isMuted ? "cam-ctrl-red" : ""}`}
                  onClick={toggleMute}
                  title={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                </button>
                <button
                  className="cam-ctrl-btn"
                  onClick={() => setCamExpanded((p) => !p)}
                  title={camExpanded ? "Collapse" : "Expand"}
                >
                  {camExpanded ? <FaCompress /> : <FaExpand />}
                </button>
              </div>
            </div>

            <div className="cam-viewport">
              <video
                ref={videoRef}
                className="cam-video"
                muted
                playsInline
                autoPlay
              />
              <canvas ref={canvasRef} className="cam-hud-canvas" width={320} height={240} />

              {/* Dynamic Status Badges matching exact proctoring requirements */}
              {isMultiFace ? (
                <div className="cam-status-pill multi-face-alert">
                  <FaUserFriends /> ⚠ Multiple faces detected.
                </div>
              ) : isNoFace ? (
                <div className="cam-status-pill no-face-alert">
                  <FaEye /> ⚠ Candidate not detected.
                </div>
              ) : (
                <div className="cam-status-pill single-face-ok">
                  <FaCheckCircle /> ✔ Candidate Verified (1 Face)
                </div>
              )}

              <span className="cam-live-badge">● LIVE PROCTOR</span>
            </div>

            <div className="cam-footer">
              <span className={`cam-status-dot ${isMultiFace ? "dot-critical" : "dot-ok"}`} />
              <span className="cam-footer-text">
                {detectionResult.message || "Proctoring stream verified"}
              </span>
            </div>
          </div>

          {/* Interactive Simulation & Test Suite Toolbar (Developer / Tester feature) */}
          <div className="tt-sim-toolbar">
            <button
              className="tt-sim-toggle-btn"
              onClick={() => setShowSimPanel((p) => !p)}
              title="Test multi-face and security alerts"
            >
              <FaBug /> Proctoring Test Suite {showSimPanel ? "▲" : "▼"}
            </button>

            {showSimPanel && (
              <div className="tt-sim-drawer">
                <span className="tt-sim-label">Simulate Security Events:</span>
                <div className="tt-sim-btn-grid">
                  <button
                    className={`sim-btn ${simulationMode === "multi_face" ? "active-sim" : ""}`}
                    onClick={() => {
                      setSimulationMode(simulationMode === "multi_face" ? "none" : "multi_face");
                    }}
                  >
                    👥 2nd Person Enters
                  </button>
                  <button
                    className={`sim-btn ${simulationMode === "no_face" ? "active-sim" : ""}`}
                    onClick={() => {
                      setSimulationMode(simulationMode === "no_face" ? "none" : "no_face");
                    }}
                  >
                    👤 Candidate Leaves
                  </button>
                  <button
                    className={`sim-btn ${simulationMode === "look_away" ? "active-sim" : ""}`}
                    onClick={() => {
                      setSimulationMode(simulationMode === "look_away" ? "none" : "look_away");
                    }}
                  >
                    👀 Looking Away
                  </button>
                  <button
                    className="sim-btn sim-btn-danger"
                    onClick={() => {
                      setLockoutReason("Simulated Tab Switch / Fullscreen Exit violation");
                      setFullscreenLockout(true);
                      recordViolation("Tab Switch (Simulated)", "Candidate simulated switching away.", "critical");
                    }}
                  >
                    🪟 Exit Fullscreen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Question Palette Card */}
          <div className="tt-palette-card">
            <h4>Question Palette</h4>
            <div className="tt-palette-grid">
              {questions.map((sq, i) => (
                <button
                  key={i}
                  className={`palette-btn ${i === current ? "pal-current" : ""} ${
                    answers[sq.id] !== undefined ? "pal-answered" : ""
                  } ${flagged.has(i) ? "pal-flagged" : ""}`}
                  onClick={() => setCurrent(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="tt-palette-legend">
              <span>
                <span className="legend-dot pal-answered" />
                Answered
              </span>
              <span>
                <span className="legend-dot pal-flagged" />
                Flagged
              </span>
              <span>
                <span className="legend-dot" />
                Unanswered
              </span>
            </div>
          </div>

          {/* Real-time Security & Violation Audit Log */}
          <div className="tt-audit-log-card">
            <div className="audit-header">
              <FaShieldAlt />
              <h4>Security Audit Log ({violations.length})</h4>
            </div>
            <div className="audit-timeline">
              {violations.length === 0 ? (
                <div className="audit-empty">
                  <FaCheckCircle className="audit-clean-icon" />
                  <span>No security infractions recorded. Proctoring clean.</span>
                </div>
              ) : (
                violations.slice(0, 5).map((v) => (
                  <div key={v.id} className={`audit-entry ${v.severity}`}>
                    <span className="audit-time">{v.time}</span>
                    <div className="audit-info">
                      <strong>{v.title}</strong>
                      <p>{v.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
