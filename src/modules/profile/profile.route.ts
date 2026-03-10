import { Router } from "express";
import { getProfileController, updateProfileController } from "./profile.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, getProfileController);
router.put("/", authMiddleware, updateProfileController);

export default router;