import express from "express";
import { register, login, me } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { rateLimit, credentialKey } from "../middleware/rateLimit.js";

const router = express.Router();

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const WINDOW_MS = num(process.env.AUTH_RATE_WINDOW_MS, 15 * 60_000);

/**
 * Two layers, because either one alone gets it wrong:
 *
 *  - Per (IP + email): tight, so guessing one account's password is slow.
 *    Successful sign-ins are refunded, so a legitimate user who mistypes once
 *    and then succeeds is never penalised.
 *  - Per IP: a much looser ceiling that still stops one host spraying
 *    thousands of different addresses, without locking out an entire campus
 *    sharing a single NAT gateway.
 */
const perCredential = rateLimit({
  windowMs: WINDOW_MS,
  max: num(process.env.AUTH_RATE_MAX_PER_CREDENTIAL, 10),
  keyGenerator: credentialKey,
  skipSuccessfulRequests: true,
  message: "Too many failed attempts for this account. Try again in a few minutes.",
});

const perIp = rateLimit({
  windowMs: WINDOW_MS,
  max: num(process.env.AUTH_RATE_MAX_PER_IP, 200),
  keyGenerator: (req) => `ip:${req.ip}:${req.path}`,
  skipSuccessfulRequests: true,
  message: "Too many authentication requests from this network. Try again later.",
});

router.post("/register", perIp, perCredential, register);
router.post("/login", perIp, perCredential, login);
router.get("/me", protect, me);

export default router;
