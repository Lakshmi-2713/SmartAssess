/* eslint-disable no-unused-vars */

/** 404 handler for unmatched routes. */
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Central error handler. Translates Mongoose/JWT/body-parser failures into
 * meaningful status codes instead of a blanket 500, and never leaks stack
 * traces or driver internals to the client in production.
 */
export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details;

  // Mongoose schema validation
  if (err.name === "ValidationError" && err.errors) {
    status = 400;
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    message = "Validation failed";
  }

  // Bad ObjectId / bad number in a query or update
  else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for '${err.path}'`;
  }

  // Duplicate key on a unique index
  else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `A record with that ${field} already exists`;
  }

  // Malformed JSON from body-parser
  else if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    status = 400;
    message = "Malformed JSON body";
  }

  else if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid authentication token";
  }

  if (status >= 500) {
    console.error("[error]", err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(process.env.NODE_ENV !== "production" && status >= 500
      ? { stack: err.stack }
      : {}),
  });
};

export default errorHandler;
