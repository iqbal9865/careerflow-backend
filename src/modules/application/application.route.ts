import { Router } from "express";
import {
    createApplicationController,
    getApplicationsController,
    getApplicationByIdController,
    updateApplicationController,
    deleteApplicationController
} from "./application.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authMiddleware, createApplicationController);
router.get("/", authMiddleware, getApplicationsController);
router.get("/:id", authMiddleware, getApplicationByIdController);
router.put("/:id", authMiddleware, updateApplicationController);
router.delete("/:id", authMiddleware, deleteApplicationController);

export default router;