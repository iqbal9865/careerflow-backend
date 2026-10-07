import type { Request, Response, NextFunction } from "express";
import {
  validateRegisterInput,
  validateLoginInput,
  validateRefreshTokenInput,
  validateUpdateNameInput,
  validateUpdateEmailInput,
} from "../validators/auth.validator.js";

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

export const validateLoginMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateLoginInput(req.body);
    next();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const validateRefreshTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateRefreshTokenInput(req.body);
    next();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const validateUpdateNameMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateUpdateNameInput(req.body);
    next();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const validateUpdateEmailMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateUpdateEmailInput(req.body);
    next();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};