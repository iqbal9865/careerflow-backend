import type { Request, Response, NextFunction } from "express";
import {
    validateCreateApplicationInput,
    validateUpdateApplicationInput
} from "../validators/application.validator.js";

export const validateCreateApplicationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateCreateApplicationInput(req.body);
        next();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

export const validateUpdateApplicationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateUpdateApplicationInput(req.body);
        next();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};