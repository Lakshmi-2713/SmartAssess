import { Link } from "react-router-dom";
import { FaCompass, FaArrowLeft } from "react-icons/fa";
import { getUser, homePathFor } from "../services/session";
import "../styles/notfound.css";

export default function NotFound() {
  const user = getUser();
  const home = user ? homePathFor(user.role) : "/";

  return (
    <div className="notfound-screen">
      <div className="notfound-card">
        <div className="notfound-icon">
          <FaCompass />
        </div>
        <p className="notfound-code">404</p>
        <h1>We couldn&apos;t find that page</h1>
        <p className="notfound-text">
          The link may be out of date, or the page may have moved.
        </p>
        <Link to={home} className="btn btn-primary btn-lg">
          <FaArrowLeft /> {user ? "Back to your dashboard" : "Back to sign in"}
        </Link>
      </div>
    </div>
  );
}
