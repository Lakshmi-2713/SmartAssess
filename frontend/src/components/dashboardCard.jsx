import "../styles/Dashboard.css";

function DashboardCard({ title, count }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <h1>{count}</h1>
    </div>
  );
}

export default DashboardCard;