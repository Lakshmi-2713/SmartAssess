/**
 * Baseline security headers. Dependency-free stand-in for helmet;
 * covers the headers that matter for a JSON API.
 */
export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.removeHeader("X-Powered-By");
  next();
};

export default securityHeaders;
