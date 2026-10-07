import type { Request, Response } from "express";
import * as authService from "./auth.service.js";
import type { RefreshTokenInput, UpdateEmailInput, UpdateNameInput } from "./auth.types.js";

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

export const refreshController = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const result = await authService.refreshTokenService(refreshToken);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const logoutController = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const result = await authService.logoutService(refreshToken);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateNameController = async (req: Request, res: Response) => {
  try {
    const { fullName } = req.body as UpdateNameInput;
    const result = await authService.updateNameService(req.userId!, fullName);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateEmailController = async (req: Request, res: Response) => {
  try {
    const { newEmail, currentPassword } = req.body as UpdateEmailInput;
    const result = await authService.updateEmailService(req.userId!, { newEmail, currentPassword });
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};