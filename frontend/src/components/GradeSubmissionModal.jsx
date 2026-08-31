import React, { useState } from "react";
import {
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaAward,
  FaCommentDots,
  FaPaperPlane,
} from "react-icons/fa";
import "../styles/gradeModal.css";

function GradeSubmissionModal({ submission, onClose, onSaveGrade }) {
  if (!submission) return null;

  const [marks, setMarks] = useState(
    submission.questions ? submission.questions.map((q) => q.scoreGiven || q.maxMarks) : [20, 20, 20, 15, 10]
  );
  const [feedback, setFeedback] = useState(
    submission.feedback || "Good conceptual clarity. Work on time complexity edge cases."
  );
  const [isSaved, setIsSaved] = useState(false);

  const totalPossible = submission.questions
    ? submission.questions.reduce((acc, q) => acc + (q.maxMarks || 20), 0)
    : 100;

  const calculatedTotal = marks.reduce((acc, m) => acc + Number(m || 0), 0);

  const handleMarkChange = (index, value) => {
    const val = Math.max(0, Math.min(20, Number(value)));
    const updated = [...marks];
    updated[index] = val;
    setMarks(updated);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    if (onSaveGrade) {
      onSaveGrade({
        ...submission,
        totalScore: calculatedTotal,
        feedback,
        status: "Graded & Published",
      });
    }
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const questionsList = submission.questions || [
    { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", studentAns: "Stack", correctAns: "Stack", isCorrect: true, maxMarks: 20 },
    { id: 2, text: "What is the worst-case time complexity of Quick Sort?", studentAns: "O(n²)", correctAns: "O(n²)", isCorrect: true, maxMarks: 20 },
    { id: 3, text: "Which traversal visits the root node first?", studentAns: "Pre-order", correctAns: "Pre-order", isCorrect: true, maxMarks: 20 },
    { id: 4, text: "What does SQL stand for?", studentAns: "Simple Question Language", correctAns: "Structured Query Language", isCorrect: false, maxMarks: 20 },
    { id: 5, text: "Which of the following is NOT a JavaScript data type?", studentAns: "float", correctAns: "float", isCorrect: true, maxMarks: 20 },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="grade-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="grade-modal-header">
          <div className="grade-header-info">
            <div className="grade-header-icon">
              <FaAward />
            </div>
            <div>
              <h3>Test Evaluation &amp; Correction</h3>
              <p>Student: <strong>{submission.studentName || "Rahul Verma"}</strong> • Test: <strong>{submission.testTitle || "Data Structures Midterm"}</strong></p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Saved Alert Banner */}
        {isSaved && (
          <div className="grade-success-alert">
            <FaCheckCircle /> Grade &amp; Feedback Published Successfully!
          </div>
        )}

        {/* Student Meta Summary Bar */}
        <div className="student-eval-summary-bar">
          <div className="eval-meta-item">
            <span>Student Email</span>
            <strong>{submission.studentEmail || "rahul.verma@student.com"}</strong>
          </div>
          <div className="eval-meta-item">
            <span>Submitted At</span>
            <strong>{submission.date || "19 May 2025, 11:30 AM"}</strong>
          </div>
          <div className="eval-meta-item">
            <span>Proctoring Status</span>
            <strong className="status-ok"><FaShieldAlt /> No Violations Detected</strong>
          </div>
          <div className="eval-meta-item score-highlight">
            <span>Calculated Marks</span>
            <strong className="text-emerald-400">{calculatedTotal} / {totalPossible}</strong>
          </div>
        </div>

        {/* Questions Correction Feed */}
        <div className="grade-modal-body">
          <h4 className="section-title">Question Breakdown &amp; Manual Grading</h4>
          <div className="questions-evaluation-list">
            {questionsList.map((q, idx) => (
              <div key={q.id} className={`eval-q-card ${q.isCorrect ? "q-correct" : "q-incorrect"}`}>
                <div className="eval-q-header">
                  <span className="eval-q-num">Q{idx + 1}.</span>
                  <p className="eval-q-text">{q.text}</p>
                  <div className="eval-q-score-input-wrap">
                    <label>Marks:</label>
                    <input
                      type="number"
                      min="0"
                      max={q.maxMarks}
                      value={marks[idx]}
                      onChange={(e) => handleMarkChange(idx, e.target.value)}
                      className="score-num-input"
                    />
                    <span>/ {q.maxMarks}</span>
                  </div>
                </div>

                <div className="eval-answers-grid">
                  <div className="ans-box student-ans">
                    <span className="ans-label">Student Answer:</span>
                    <strong className={q.isCorrect ? "text-green" : "text-red"}>
                      {q.isCorrect ? <FaCheckCircle className="inline mr-1" /> : <FaTimesCircle className="inline mr-1" />}
                      {q.studentAns}
                    </strong>
                  </div>
                  {!q.isCorrect && (
                    <div className="ans-box correct-ans">
                      <span className="ans-label">Correct Answer:</span>
                      <strong className="text-emerald-400">{q.correctAns}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Faculty Feedback Section */}
          <div className="faculty-feedback-section mt-4">
            <h4 className="section-title flex items-center gap-2">
              <FaCommentDots /> Faculty Evaluation Feedback &amp; Comments
            </h4>
            <textarea
              rows="3"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter feedback for the student..."
              className="faculty-feedback-input"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="grade-modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-publish-grade" onClick={handleSave}>
            <FaPaperPlane /> Publish Score &amp; Feedback
          </button>
        </div>
      </div>
    </div>
  );
}

export default GradeSubmissionModal;
