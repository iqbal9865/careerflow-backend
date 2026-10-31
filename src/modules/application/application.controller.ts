import type { Request, Response } from "express";
import {
    createApplicationService,
    getApplicationsService,
    getApplicationByIdService,
    updateApplicationService,
    deleteApplicationService
} from "./application.service.js";

export const createApplicationController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const application = await createApplicationService(userId, req.body);
        res.status(201).json({ success: true, data: application });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getApplicationsController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const applications = await getApplicationsService(userId);
        res.status(200).json({ success: true, data: applications });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getApplicationByIdController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        if (!id) {
            res.status(400).json({ success: false, message: "Application ID is required" });
            return;
        }
        const application = await getApplicationByIdService(userId, id);
        res.status(200).json({ success: true, data: application });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const updateApplicationController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        if (!id) {
            res.status(400).json({ success: false, message: "Application ID is required" });
            return;
        }
        const application = await updateApplicationService(userId, id, req.body);
        res.status(200).json({ success: true, data: application });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const deleteApplicationController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params as { id: string };
        if (!id) {
            res.status(400).json({ success: false, message: "Application ID is required" });
            return;
        }
        await deleteApplicationService(userId, id);
        res.status(200).json({ success: true, message: "Application deleted successfully" });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};