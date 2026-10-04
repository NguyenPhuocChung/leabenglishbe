import { Router } from "express";
import {
  deleteUser,
  getMyProgress,
  getUser,
  listUsers,
  removeMyVocabulary,
  saveMyVocabulary,
  updateMyVocabularyStatus,
  updateUserStatus,
} from "../controllers/usersController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";

const router = Router();
router.get("/me/progress", authenticate, asyncHandler(getMyProgress));
router.post("/me/vocabulary", authenticate, asyncHandler(saveMyVocabulary));
router.delete("/me/vocabulary/:word", authenticate, asyncHandler(removeMyVocabulary));
router.patch("/me/vocabulary/:word/status", authenticate, asyncHandler(updateMyVocabularyStatus));
router.use(authenticate, requireAdmin);
router.get("/", asyncHandler(listUsers));
router.get("/:id", asyncHandler(getUser));
router.patch("/:id/status", asyncHandler(updateUserStatus));
router.delete("/:id", asyncHandler(deleteUser));

export default router;