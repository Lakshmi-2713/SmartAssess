import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/generateToken.js";

/**
 * Require a valid bearer token. Attaches the live user document to req.user
 * so a deactivated or deleted account cannot keep using an old token.
 */
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Authentication required. Provide a bearer token.");
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw ApiError.unauthorized("Authentication required. Provide a bearer token.");
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Session expired. Please sign in again.");
    }
    throw ApiError.unauthorized("Invalid authentication token.");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized("Account no longer exists.");
  }

  req.user = user;
  next();
});

/**
 * Restrict a route to specific roles. Must run after `protect`.
 */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized("Authentication required."));
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(`Requires one of these roles: ${roles.join(", ")}.`)
    );
  }
  next();
};

export default protect;
