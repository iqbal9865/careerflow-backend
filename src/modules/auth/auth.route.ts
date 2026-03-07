import { Router } from "express";
import { registerController, loginController, refreshController, logoutController } from "./auth.controller.js";
import { validateRegisterMiddleware, validateLoginMiddleware } from "../../middlewares/validate.middleware.js";

const router = Router();

router.post("/register", validateRegisterMiddleware, registerController);
router.post("/login", validateLoginMiddleware, loginController);
router.post("/refresh", refreshController);
router.post("/logout", logoutController);

export default router;