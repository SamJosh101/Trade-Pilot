import rateLimit from "express-rate-limit";

/**
 * Applies only to /api/auth/* — login and register are the endpoints
 * an attacker would brute-force or use for account enumeration/spam.
 * Everything else is already gated by JWT, so it doesn't need this.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});
