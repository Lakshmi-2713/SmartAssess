import { useState, useMemo } from "react";
import {
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaAward,
  FaCommentDots,
  FaPaperPlane,
  FaExclamationTriangle,
  FaUndo,
} from "react-icons/fa";
import "../styles/gradeModal.css";

const FALLBACK_MAX = 20;

/**
 * Faculty grading sheet for one submission.
 *
 * NOTE: every hook runs before any early return — the previous version bailed
 * out on a null `submission` *above* its useState calls, which is a hooks-order
 * violation waiting to fire the moment a caller drops its render guard.
 */
export default function GradeSubmissionModal({ submission, onClose, onSaveGrade }) {
  const questions = useMemo(() => submission?.questions ?? [], [submission]);

  const [marks, setMarks] = useState(() =>
    questions.map((q) =>
      // `??` not `||`: a legitimate score of 0 is falsy and used to be
      // silently replaced with full marks.
      String(q.scoreGiven ?? (q.isCorrect ? q.maxMarks ?? FALLBACK_MAX : 0))
    )
  );
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [saving, setSaving] = useState(false);

  const totalPossible = useMemo(
    () => questions.reduce((acc, q) => acc + (q.maxMarks ?? FALLBACK_MAX), 0),
    [questions]
  );

  const parsedMarks = useMemo(
    () => marks.map((m) => (m === "" ? 0 : Number(m))),
    [marks]
  );

  const hasInvalid = parsedMarks.some((n) => !Number.isFinite(n));
  const calculatedTotal = hasInvalid
    ? 0
    : parsedMarks.reduce((acc, n) => acc + n, 0);

  const percent = totalPossible > 0 ? Math.round((calculatedTotal / totalPossible) * 100) : 0;

  if (!submission) return null;

  const handleMarkChange = (index, raw) => {
    // Clamp against THIS question's max, not a hardcoded 20.
    const max = questions[index]?.maxMarks ?? FALLBACK_MAX;
    if (raw === "") {
      setMarks((prev) => prev.map((m, i) => (i === index ? "" : m)));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return; // reject "e", "+", etc. from number inputs
    const clamped = Math.max(0, Math.min(max, n));
    setMarks((prev) => prev.map((m, i) => (i === index ? String(clamped) : m)));
  };

  const resetToAuto = () => {
    setMarks(
      questions.map((q) => String(q.isCorrect ? q.maxMarks ?? FALLBACK_MAX : 0))
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (hasInvalid || saving) return;

    setSaving(true);

    // Per-question edits are written back into `questions`. They used to be
    // discarded — only the total was saved, so the breakdown silently reverted.
    const gradedQuestions = questions.map((q, i) => ({
      ...q,
      scoreGiven: parsedMarks[i],
      maxMarks: q.maxMarks ?? FALLBACK_MAX,
    }));

    onSaveGrade?.({
      ...submission,
      questions: gradedQuestions,
      totalScore: calculatedTotal,
      maxScore: totalPossible,
      feedback,
      status: "Graded & Published",
    });

    onClose?.();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-title"
      >
        <form onSubmit={handleSave} className="grade-form">
          <div className="modal-head">
            <div className="modal-head-left">
              <span className="modal-head-icon"><FaAward /></span>
              <div>
                <h3 className="modal-title" id="grade-title">Evaluate submission</h3>
                <p className="modal-sub">
                  {submission.studentName} · {submission.testTitle}
                </p>
              </div>
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              <FaTimes />
            </button>
          </div>

          {/* Summary strip */}
          <div className="grade-summary">
            <div className="grade-summary-item">
              <span>Student</span>
              <strong className="truncate">{submission.studentEmail || "—"}</strong>
            </div>
            <div className="grade-summary-item">
              <span>Submitted</span>
              <strong>{submission.date || "—"}</strong>
            </div>
            <div className="grade-summary-item">
              <span>Proctoring</span>
              <strong className={submission.proctoring?.totalStrikes ? "is-warn" : "is-ok"}>
                <FaShieldAlt />
                {submission.proctoring?.totalStrikes
                  ? `${submission.proctoring.totalStrikes} strike${
                      submission.proctoring.totalStrikes === 1 ? "" : "s"
                    }`
                  : "No violations"}
              </strong>
            </div>
            <div className="grade-summary-item is-score">
              <span>Awarded</span>
              <strong>
                {hasInvalid ? "—" : calculatedTotal} <em>/ {totalPossible}</em>
                {!hasInvalid && <span className="grade-pct">{percent}%</span>}
              </strong>
            </div>
          </div>

          <div className="modal-body">
            {questions.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><FaExclamationTriangle /></span>
                <p className="empty-title">No question breakdown</p>
                <p className="empty-text">
                  This submission has no per-question data to grade.
                </p>
              </div>
            ) : (
              <>
                <div className="row-between grade-section-head">
                  <h4 className="card-title">Question breakdown</h4>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={resetToAuto}>
                    <FaUndo /> Reset to auto-score
                  </button>
                </div>

                <div className="grade-q-list">
                  {questions.map((q, idx) => {
                    const max = q.maxMarks ?? FALLBACK_MAX;
                    return (
                      <div
                        key={q.id ?? idx}
                        className={`grade-q ${q.isCorrect ? "is-correct" : "is-incorrect"}`}
                      >
                        <div className="grade-q-head">
                          <span className="grade-q-num">Q{idx + 1}</span>
                          <p className="grade-q-text">{q.text}</p>
                          <div className="grade-q-marks">
                            <input
                              type="number"
                              className="input"
                              min="0"
                              max={max}
                              step="1"
                              value={marks[idx] ?? ""}
                              onChange={(e) => handleMarkChange(idx, e.target.value)}
                              aria-label={`Marks for question ${idx + 1}, out of ${max}`}
                            />
                            <span className="grade-q-max">/ {max}</span>
                          </div>
                        </div>

                        <div className="grade-q-answers">
                          <div className="grade-ans">
                            <span className="grade-ans-label">Student answered</span>
                            <strong className={q.isCorrect ? "is-ok" : "is-bad"}>
                              {q.isCorrect ? <FaCheckCircle /> : <FaTimesCircle />}
                              {q.studentAns || "Unanswered"}
                            </strong>
                          </div>
                          {!q.isCorrect && (
                            <div className="grade-ans">
                              <span className="grade-ans-label">Correct answer</span>
                              <strong className="is-ok">{q.correctAns}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="field grade-feedback">
              <label className="field-label" htmlFor="grade-feedback">
                <FaCommentDots /> Feedback for the student
              </label>
              <textarea
                id="grade-feedback"
                className="textarea"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What did they do well, and what should they work on?"
              />
            </div>
          </div>

          <div className="modal-foot">
            {hasInvalid && (
              <span className="field-error grow">
                One or more marks are not valid numbers.
              </span>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={hasInvalid || saving}>
              <FaPaperPlane /> Publish score &amp; feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
