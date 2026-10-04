import { Router } from "express";
import { getDashboard } from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(authenticate, requireAdmin);
router.get("/dashboard", asyncHandler(getDashboard));

export default router;