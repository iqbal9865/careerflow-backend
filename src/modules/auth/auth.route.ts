import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  updateNameController,
  updateEmailController,
} from "./auth.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  validateRegisterMiddleware,
  validateLoginMiddleware,
  validateRefreshTokenMiddleware,
  validateUpdateNameMiddleware,
  validateUpdateEmailMiddleware,
} from "../../middlewares/validate.middleware.js";

const router = Router();

router.post("/register", validateRegisterMiddleware, registerController);
router.post("/login", validateLoginMiddleware, loginController);
router.post("/refresh", validateRefreshTokenMiddleware, refreshController);
router.post("/logout", validateRefreshTokenMiddleware, logoutController);
router.put("/name", authMiddleware, validateUpdateNameMiddleware, updateNameController);
router.put("/email", authMiddleware, validateUpdateEmailMiddleware, updateEmailController);

export default router;