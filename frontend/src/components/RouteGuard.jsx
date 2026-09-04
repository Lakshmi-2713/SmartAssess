import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUser, isAuthenticated, homePathFor } from "../services/session";

/**
 * Gates a route behind a valid session, and optionally behind a set of roles.
 *
 * Without this every page was reachable by typing its URL — `/admin` rendered
 * the admin console for an anonymous visitor.
 */
export default function RouteGuard({ children, roles }) {
  const location = useLocation();
  const [authed, setAuthed] = useState(() => isAuthenticated());
  const [user, setUser] = useState(() => getUser());

  // Re-evaluate when the session changes (sign-in, sign-out, or a 401 from
  // the API interceptor) and when another tab writes to localStorage.
  useEffect(() => {
    const sync = () => {
      setAuthed(isAuthenticated());
      setUser(getUser());
    };
    window.addEventListener("smartassess:session", sync);
    window.addEventListener("smartassess:unauthorized", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("smartassess:session", sync);
      window.removeEventListener("smartassess:unauthorized", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!authed) {
    // Remember where they were headed so sign-in can send them back.
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to={homePathFor(user?.role)} replace />;
  }

  return children;
}
