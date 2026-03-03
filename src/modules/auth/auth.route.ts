import { Router } from "express";
import { registerController, loginController } from "./auth.controller.js";
import { validateRegisterMiddleware, validateLoginMiddleware } from "../../middlewares/validate.middleware.js";

const router = Router();

router.post("/register", validateRegisterMiddleware, registerController);
router.post("/login", validateLoginMiddleware, loginController);

export default router;