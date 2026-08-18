import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export type AuthenticatedRequest = Request & { userId: string };

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId && process.env.NODE_ENV === "production") {
    res.status(401).json({ error: "دەسەڵات پێویستە" });
    return;
  }

  (req as AuthenticatedRequest).userId = userId ?? "demo-user";
  next();
}

export function currentUserId(req: Request): string {
  return (req as AuthenticatedRequest).userId ?? "demo-user";
}