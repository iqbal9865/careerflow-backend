import type { Request, Response } from "express";
import type { TaskStatus } from "@prisma/client";
import {
    createTaskService,
    getTasksService,
    getTaskByIdService,
    updateTaskService,
    updateTaskStatusService,
    deleteTaskService,
    getTaskStatsService
} from "./task.service.js";
import type { TaskFilters } from "./task.types.js";

// Query values are type-checked by validateListTasksMiddleware
const readTaskFilters = (req: Request): TaskFilters => {
    const { status, from, to } = req.query as { status?: TaskStatus; from?: string; to?: string };
    return {
        ...(status && { status }),
        ...(from && { from }),
        ...(to && { to })
    };
};

export const createTaskController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const task = await createTaskService(userId, req.body);
        res.status(201).json({ success: true, data: task });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getTasksController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const tasks = await getTasksService(userId, readTaskFilters(req));
        res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getTaskStatsController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { status, ...filters } = readTaskFilters(req);
        const stats = await getTaskStatsService(userId, filters);
        res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getTaskByIdController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        const task = await getTaskByIdService(userId, id);
        res.status(200).json({ success: true, data: task });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const updateTaskController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        const task = await updateTaskService(userId, id, req.body);
        res.status(200).json({ success: true, data: task });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const updateTaskStatusController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        const task = await updateTaskStatusService(userId, id, req.body.status);
        res.status(200).json({ success: true, data: task });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const deleteTaskController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        await deleteTaskService(userId, id);
        res.status(200).json({ success: true, message: "Task deleted successfully" });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
