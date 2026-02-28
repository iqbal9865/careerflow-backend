import type { Request, Response, NextFunction } from "express";
import { validateRegisterInput } from "../validators/auth.validator.js";

export const validateRegisterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateRegisterInput(req.body);
    next();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};