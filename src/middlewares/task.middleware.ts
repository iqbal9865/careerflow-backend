import type { Request, Response, NextFunction } from "express";
import {
    validateCreateTaskInput,
    validateUpdateTaskInput,
    validateUpdateTaskStatusInput,
    validateListTasksQuery
} from "../validators/task.validator.js";

export const validateCreateTaskMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateCreateTaskInput(req.body);
        next();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

export const validateUpdateTaskMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateUpdateTaskInput(req.body);
        next();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

export const validateUpdateTaskStatusMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateUpdateTaskStatusInput(req.body);
        next();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

export const validateListTasksMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateListTasksQuery(req.query);
        next();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
