import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  forgotPassword,
  getCurrentUser,
  login,
  register,
  resetPassword,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
});

router.post("/register", authLimiter, asyncHandler(register));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/forgot-password", authLimiter, asyncHandler(forgotPassword));
router.post("/reset-password", authLimiter, asyncHandler(resetPassword));
router.get("/me", authenticate, asyncHandler(getCurrentUser));

export default router;