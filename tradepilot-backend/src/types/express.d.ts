// Augments Express's Request type so req.user is known everywhere,
// without needing `as any` casts in controllers.
// Populated by authMiddleware after verifying the JWT.

declare namespace Express {
  export interface Request {
    user?: {
      id: string;
    };
  }
}
