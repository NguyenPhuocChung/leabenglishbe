import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { createAuthToken } from "../config/jwt.js";

const GENERIC_RESET_MESSAGE = "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.";
const passwordResetLifetime = 30 * 60 * 1000;

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getMailTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

export async function register(request, response) {
  const name = String(request.body.name ?? "").trim();
  const email = String(request.body.email ?? "").trim().toLowerCase();
  const password = String(request.body.password ?? "");

  if (!name || !isValidEmail(email) || password.length < 8 || password.length > 128) {
    return response.status(400).json({
      success: false,
      message: "Nhập họ tên, email hợp lệ và mật khẩu từ 8 đến 128 ký tự.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  response.status(201).json({
    success: true,
    data: { token: createAuthToken(user), user: publicUser(user) },
  });
}

export async function login(request, response) {
  const email = String(request.body.email ?? "").trim().toLowerCase();
  const password = String(request.body.password ?? "");
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return response.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng." });
  }
  if (user.status !== "active") {
    return response.status(403).json({ success: false, message: "Tài khoản đang bị khóa." });
  }

  response.json({
    success: true,
    data: { token: createAuthToken(user), user: publicUser(user) },
  });
}

export async function getCurrentUser(request, response) {
  response.json({ success: true, data: { user: publicUser(request.authUser) } });
}

export async function forgotPassword(request, response) {
  const email = String(request.body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return response.status(400).json({ success: false, message: "Vui lòng nhập email hợp lệ." });
  }

  const user = await User.findOne({ email });
  if (!user) return response.json({ success: true, message: GENERIC_RESET_MESSAGE });

  const token = randomBytes(32).toString("hex");
  user.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
  user.passwordResetExpiresAt = new Date(Date.now() + passwordResetLifetime);
  await user.save();

  const requestOrigin = String(request.body.origin ?? "");
  const localFrontendOrigin = /^http:\/\/localhost:\d+$/.test(requestOrigin)
    ? requestOrigin
    : "http://localhost:5173";
  const frontendUrl = process.env.FRONTEND_URL || localFrontendOrigin;
  const resetUrl = new URL("/reset-password", frontendUrl);
  resetUrl.searchParams.set("token", token);
  const transport = getMailTransport();

  if (transport) {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Đặt lại mật khẩu LearnEnglish",
      text: `Mở liên kết sau để đặt lại mật khẩu (có hiệu lực trong 30 phút): ${resetUrl}`,
      html: `<p>Yêu cầu đặt lại mật khẩu LearnEnglish.</p><p><a href="${resetUrl}">Đặt lại mật khẩu</a></p><p>Liên kết có hiệu lực trong 30 phút.</p>`,
    });
    return response.json({ success: true, message: GENERIC_RESET_MESSAGE });
  }

  if (process.env.NODE_ENV === "production") {
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    console.error("Password reset requested but SMTP is not configured.");
    return response.json({ success: true, message: GENERIC_RESET_MESSAGE });
  }

  response.json({
    success: true,
    message: GENERIC_RESET_MESSAGE,
    data: { resetUrl: resetUrl.toString() },
  });
}

export async function resetPassword(request, response) {
  const token = String(request.body.token ?? "");
  const password = String(request.body.password ?? "");
  if (!token || password.length < 8 || password.length > 128) {
    return response.status(400).json({
      success: false,
      message: "Liên kết không hợp lệ hoặc mật khẩu chưa đủ 8 ký tự.",
    });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordHash +passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) {
    return response.status(400).json({ success: false, message: "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ." });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.tokenVersion += 1;
  await user.save();

  response.json({ success: true, message: "Mật khẩu đã được đặt lại. Hãy đăng nhập lại." });
}