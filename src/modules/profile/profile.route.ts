import { Router } from "express";
import { getProfileController, updateProfileController } from "./profile.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateUpdateProfileMiddleware } from "../../middlewares/profile.middleware.js";

const router = Router();

router.get("/", authMiddleware, getProfileController);
router.put("/", authMiddleware, validateUpdateProfileMiddleware, updateProfileController);

export default router;