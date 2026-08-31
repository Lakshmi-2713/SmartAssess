import React from "react";
import {
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaAward,
  FaCommentDots,
  FaDownload,
  FaPrint,
} from "react-icons/fa";
import "../styles/gradeModal.css";

function ScorecardReviewModal({ result, onClose }) {
  if (!result) return null;

  const scoreNum = parseInt(result.score) || 85;
  const passed = scoreNum >= 60;

  const questionsList = [
    { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", myAns: "Stack", correctAns: "Stack", isCorrect: true, maxMarks: 20 },
    { id: 2, text: "What is the worst-case time complexity of Quick Sort?", myAns: "O(n²)", correctAns: "O(n²)", isCorrect: true, maxMarks: 20 },
    { id: 3, text: "Which traversal visits the root node first?", myAns: "Pre-order", correctAns: "Pre-order", isCorrect: true, maxMarks: 20 },
    { id: 4, text: "What does SQL stand for?", myAns: "Simple Question Language", correctAns: "Structured Query Language", isCorrect: false, maxMarks: 20 },
    { id: 5, text: "Which of the following is NOT a JavaScript data type?", myAns: "float", correctAns: "float", isCorrect: true, maxMarks: 20 },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="grade-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="grade-modal-header">
          <div className="grade-header-info">
            <div className="grade-header-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
              <FaAward />
            </div>
            <div>
              <h3>Student Scorecard &amp; Feedback Review</h3>
              <p>Subject: <strong>{result.title || "Operating Systems"}</strong> • Date: <strong>{result.date || "18 May 2025"}</strong></p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="student-eval-summary-bar">
          <div className="eval-meta-item">
            <span>Student Name</span>
            <strong>Rahul Verma</strong>
          </div>
          <div className="eval-meta-item">
            <span>Result Status</span>
            <strong className={passed ? "text-green" : "text-red"}>
              {passed ? "PASS (Certified)" : "FAIL"}
            </strong>
          </div>
          <div className="eval-meta-item">
            <span>Faculty Reviewer</span>
            <strong>Dr. Johnson</strong>
          </div>
          <div className="eval-meta-item score-highlight">
            <span>Final Grade</span>
            <strong style={{ color: passed ? "#34d399" : "#ef4444" }}>{result.score}</strong>
          </div>
        </div>

        {/* Body */}
        <div className="grade-modal-body">
          {/* Faculty Feedback Banner */}
          <div className="faculty-feedback-section mb-4 p-4 rounded-xl" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
            <h4 className="section-title flex items-center gap-2 text-indigo-400">
              <FaCommentDots /> Faculty Feedback &amp; Review Remarks
            </h4>
            <p className="text-sm text-slate-300 mt-2 italic">
              "Great overall understanding of data structure concepts! You performed exceptionally well on stack and tree traversals. Please review time complexity definitions for SQL and sorting algorithms."
            </p>
          </div>

          <h4 className="section-title">Detailed Question Response Sheet</h4>
          <div className="questions-evaluation-list">
            {questionsList.map((q, idx) => (
              <div key={q.id} className={`eval-q-card ${q.isCorrect ? "q-correct" : "q-incorrect"}`}>
                <div className="eval-q-header">
                  <span className="eval-q-num">Q{idx + 1}.</span>
                  <p className="eval-q-text">{q.text}</p>
                  <span className="font-bold text-sm" style={{ color: q.isCorrect ? "#34d399" : "#ef4444" }}>
                    {q.isCorrect ? "+20 / 20" : "0 / 20"}
                  </span>
                </div>

                <div className="eval-answers-grid">
                  <div className="ans-box student-ans">
                    <span className="ans-label">Your Submitted Answer:</span>
                    <strong className={q.isCorrect ? "text-green" : "text-red"}>
                      {q.isCorrect ? <FaCheckCircle className="inline mr-1" /> : <FaTimesCircle className="inline mr-1" />}
                      {q.myAns}
                    </strong>
                  </div>
                  {!q.isCorrect && (
                    <div className="ans-box correct-ans">
                      <span className="ans-label">Correct Solution:</span>
                      <strong className="text-emerald-400">{q.correctAns}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="grade-modal-footer">
          <button className="modal-btn-cancel flex items-center gap-2" onClick={() => window.print()}>
            <FaPrint /> Print Report
          </button>
          <button className="btn-publish-grade flex items-center gap-2" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }} onClick={onClose}>
            <FaDownload /> Download Scorecard PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScorecardReviewModal;
