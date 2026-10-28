import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import {authenticate} from '../security/service';

/**
 * Runs before any protected controller.
 * - Reads Authorization: Bearer <token>
 * - Verifies signature + expiry
 * - Attaches req.user = { id } so controllers/services can scope
 *   every query to the authenticated user, never a value from the request body.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control','no-store');
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.userId !== "string" || !payload.userId.trim()) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    const sessionId=await authenticate(payload,token);
    req.user = { id: payload.userId,sessionId };
    next();
  } catch (e) {
    if(!(e instanceof jwt.JsonWebTokenError)&&!(e instanceof jwt.TokenExpiredError)&&!(e instanceof jwt.NotBeforeError)&&(e as {statusCode?:number})?.statusCode!==401)return next(e);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
