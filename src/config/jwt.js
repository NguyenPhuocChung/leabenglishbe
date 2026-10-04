import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";

export function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production.");
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("JWT_SECRET or MONGODB_URI must be configured.");
  }

  return createHash("sha256")
    .update(`learbenglish-jwt:${process.env.MONGODB_URI}`)
    .digest("hex");
}

export function createAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    getJwtSecret(),
    { expiresIn: "7d" },
  );
}