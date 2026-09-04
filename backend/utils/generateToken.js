import jwt from "jsonwebtoken";

const DEFAULT_EXPIRY = "7d";

/**
 * Sign a JWT for an authenticated user.
 * The payload deliberately carries only non-sensitive identifiers.
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured. Refusing to sign a token.");
  }

  return jwt.sign(
    { id: String(user._id), role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRY }
  );
};

export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured. Refusing to verify a token.");
  }

  return jwt.verify(token, secret);
};

export default generateToken;
