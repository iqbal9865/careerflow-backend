import type { Request, Response } from "express";
import * as authService from "./auth.service.js";

export const registerController = async (req: Request, res: Response) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const result = await authService.loginUser(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};