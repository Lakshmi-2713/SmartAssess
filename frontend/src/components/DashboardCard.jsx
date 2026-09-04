import "../styles/dashboard.css";

export default function DashboardCard({ title, count }) {
  return (
    <div className="dash-card">
      <h3>{title}</h3>
      <strong>{count}</strong>
    </div>
  );
}
