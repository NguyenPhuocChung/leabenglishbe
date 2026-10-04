import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/jwt.js";
import User from "../models/User.js";

export function optionalAuthenticate(request, response, next) {
  if (!request.get("authorization")) return next();
  return authenticate(request, response, next);
}

export async function authenticate(request, response, next) {
  const [scheme, token] = (request.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ success: false, message: "Authentication required." });
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return response.status(401).json({ success: false, message: "Invalid or expired session." });
  }

  try {
    const user = await User.findById(payload.sub).select("name email role status tokenVersion");
    if (!user || user.status !== "active" || user.tokenVersion !== payload.tokenVersion) {
      return response.status(401).json({ success: false, message: "This session is no longer active." });
    }

    request.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(request, response, next) {
  if (request.authUser?.role !== "admin") {
    return response.status(403).json({ success: false, message: "Administrator access required." });
  }
  next();
}