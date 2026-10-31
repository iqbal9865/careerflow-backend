import { Router } from "express";
import {
    createTaskController,
    getTasksController,
    getTaskStatsController,
    getTaskByIdController,
    updateTaskController,
    updateTaskStatusController,
    deleteTaskController
} from "./task.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
    validateCreateTaskMiddleware,
    validateUpdateTaskMiddleware,
    validateUpdateTaskStatusMiddleware,
    validateListTasksMiddleware
} from "../../middlewares/task.middleware.js";

const router = Router();

router.post("/", authMiddleware, validateCreateTaskMiddleware, createTaskController);
router.get("/", authMiddleware, validateListTasksMiddleware, getTasksController);
// Must be registered before /:id so "stats" isn't treated as an id
router.get("/stats", authMiddleware, validateListTasksMiddleware, getTaskStatsController);
router.get("/:id", authMiddleware, getTaskByIdController);
router.put("/:id", authMiddleware, validateUpdateTaskMiddleware, updateTaskController);
router.put("/:id/status", authMiddleware, validateUpdateTaskStatusMiddleware, updateTaskStatusController);
router.delete("/:id", authMiddleware, deleteTaskController);

export default router;
