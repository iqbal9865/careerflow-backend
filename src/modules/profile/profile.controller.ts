import type { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError.js";
import { getProfileService, updateProfileService } from "./profile.service.js";

interface AuthenticatedRequest extends Request {
    userId?: string
}

export const getProfileController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Unauthorized Access" });
        }
        const profile = await getProfileService(req.userId)
        res.json({ profile })
    } catch (err: any) {
        res.status(err.statusCode || 500).json({
            message: err.message || "Internal Server Error"
        })
    }
}

export const updateProfileController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Unauthorized Access" });
        }
        const profile = await updateProfileService(req.userId, req.body);
        res.json({ profile })
    } catch (err: any) {
        res.status(err.statusCode || 500).json({
            message: err.message || "Internal Server Error"
        })
    }
}