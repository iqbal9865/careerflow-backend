import type { Request, Response, NextFunction } from "express";
import { validateUpdateProfileInput } from "../validators/profile.validator.js";

export const validateUpdateProfileMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateUpdateProfileInput(req.body);
        next();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};