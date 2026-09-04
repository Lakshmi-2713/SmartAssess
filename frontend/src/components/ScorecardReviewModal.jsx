import { useMemo } from "react";
import {
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaAward,
  FaCommentDots,
  FaPrint,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../styles/gradeModal.css";

/**
 * Read-only scorecard for a student.
 *
 * Renders the *actual* submission when one is supplied. The previous version
 * showed a hardcoded five-question DSA breakdown and the name "Rahul Verma"
 * for every result, regardless of which test was opened.
 */
export default function ScorecardReviewModal({ result, submission, onClose }) {
  const questions = useMemo(() => submission?.questions ?? [], [submission]);

  const { earned, possible, percent } = useMemo(() => {
    if (questions.length > 0) {
      const p = questions.reduce((a, q) => a + (q.maxMarks ?? 20), 0);
      const e = questions.reduce((a, q) => a + (q.scoreGiven ?? 0), 0);
      return { earned: e, possible: p, percent: p > 0 ? Math.round((e / p) * 100) : 0 };
    }

    // Fall back to the result row. `Number.parseFloat` on "0%" yields 0, which
    // must stay 0 — the old `|| 85` turned a genuine zero into a pass.
    const parsed = Number.parseFloat(String(result?.score ?? ""));
    const pct = Number.isFinite(parsed) ? parsed : null;
    return { earned: null, possible: null, percent: pct };
  }, [questions, result]);

  if (!result) return null;

  const hasPercent = Number.isFinite(percent);
  const passed = hasPercent && percent >= 60;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scorecard-title"
      >
        <div className="modal-head">
          <div className="modal-head-left">
            <span className="modal-head-icon"><FaAward /></span>
            <div>
              <h3 className="modal-title" id="scorecard-title">
                {result.title || result.test || "Scorecard"}
              </h3>
              <p className="modal-sub">
                {result.date || "—"}
                {result.reviewer ? ` · Reviewed by ${result.reviewer}` : ""}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="scorecard-hero">
          <div className={`scorecard-ring ${passed ? "is-pass" : "is-fail"}`}>
            <span className="scorecard-pct">
              {hasPercent ? `${percent}%` : "—"}
            </span>
            <span className="scorecard-ring-label">
              {hasPercent ? (passed ? "Pass" : "Below pass") : "Not scored"}
            </span>
          </div>

          <dl className="scorecard-meta">
            <div>
              <dt>Student</dt>
              <dd>{submission?.studentName || result.student || "—"}</dd>
            </div>
            <div>
              <dt>Marks</dt>
              <dd className="tabular">
                {earned !== null ? `${earned} / ${possible}` : result.score || "—"}
              </dd>
            </div>
            <div>
              <dt>Subject</dt>
              <dd>{result.subject || submission?.testTitle || "—"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`badge ${passed ? "badge-success" : "badge-warning"}`}>
                  {submission?.status || (passed ? "Passed" : "Needs improvement")}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="modal-body">
          {questions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><FaExclamationTriangle /></span>
              <p className="empty-title">No question breakdown available</p>
              <p className="empty-text">
                This result was recorded without a per-question record, so only
                the overall score can be shown.
              </p>
            </div>
          ) : (
            <>
              <h4 className="card-title scorecard-section">Question breakdown</h4>
              <div className="grade-q-list">
                {questions.map((q, idx) => (
                  <div
                    key={q.id ?? idx}
                    className={`grade-q ${q.isCorrect ? "is-correct" : "is-incorrect"}`}
                  >
                    <div className="grade-q-head">
                      <span className="grade-q-num">Q{idx + 1}</span>
                      <p className="grade-q-text">{q.text}</p>
                      <span className="scorecard-q-score tabular">
                        {q.scoreGiven ?? 0} / {q.maxMarks ?? 20}
                      </span>
                    </div>
                    <div className="grade-q-answers">
                      <div className="grade-ans">
                        <span className="grade-ans-label">Your answer</span>
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
                ))}
              </div>
            </>
          )}

          {submission?.feedback && (
            <div className="scorecard-feedback">
              <h4 className="card-title">
                <FaCommentDots /> Faculty feedback
              </h4>
              <p>{submission.feedback}</p>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <FaPrint /> Print
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
