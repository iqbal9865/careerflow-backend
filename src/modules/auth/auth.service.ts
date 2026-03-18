import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { Role } from "@prisma/client";
import type { LoginUserInput, RegisterUserInput } from "./auth.types.js";
import { ApiError } from "../../utils/ApiError.js";
import jwt from "jsonwebtoken";
export const registerUser = async (data: RegisterUserInput) => {
  const { fullName, email, password } = data;

  const normalizedEmail = email.toLowerCase().trim();
  const cleanFullName = fullName.trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser) throw new ApiError(400, "User already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: cleanFullName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedEmail === process.env.ADMIN_EMAIL ? Role.ADMIN : Role.USER,
    },
  });

  await prisma.profile.create({
    data: {
      userId: user.id
    },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
    },
  });

  return {
    message: "User registered successfully",
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    },
  };
};

export const loginUser = async (data: LoginUserInput) => {
  const { email, password } = data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new ApiError(400, "Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(400, "Wrong password");

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Save refresh token in DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  return {
    message: "Login successful",
    data: {
      accessToken,
      refreshToken,
    },
  };
};

// Refresh access token using refresh token
export const refreshTokenService = async (refreshToken: string) => {
  if (!refreshToken) throw new ApiError(401, "Refresh token required");

  // Check if refresh token exists in DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken) throw new ApiError(403, "Invalid refresh token");

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { userId: string };

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId);

    return { accessToken: newAccessToken };
  } catch {
    throw new ApiError(403, "Invalid refresh token");
  }
};

// Logout user (invalidate refresh token)
export const logoutService = async (refreshToken: string) => {
  if (!refreshToken) throw new ApiError(400, "Refresh token required");

  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });

  return { message: "Logout successful" };
};