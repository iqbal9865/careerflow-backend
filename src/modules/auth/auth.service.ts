import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { Prisma, Role } from "@prisma/client";
import type { LoginUserInput, RegisterUserInput, UpdateEmailInput } from "./auth.types.js";
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
export const refreshTokenService = async (refreshToken: unknown) => {
  // Defence in depth: a non-string would be interpreted by Prisma as a filter
  if (typeof refreshToken !== "string" || !refreshToken) {
    throw new ApiError(400, "Refresh token must be a non-empty string");
  }

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

    const newAccessToken = generateAccessToken(decoded.userId);

    return { accessToken: newAccessToken };
  } catch {
    throw new ApiError(403, "Invalid refresh token");
  }
};

export const logoutService = async (refreshToken: unknown) => {
  // Defence in depth: a non-string such as { "not": "" } would match every row in deleteMany
  if (typeof refreshToken !== "string" || !refreshToken) {
    throw new ApiError(400, "Refresh token must be a non-empty string");
  }

  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });

  return { message: "Logout successful" };
};

// Only these User fields are ever returned from account endpoints (never password)
const accountSelect = { id: true, fullName: true, email: true } as const;

export const updateNameService = async (userId: string, fullName: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { fullName: fullName.trim() },
    select: accountSelect,
  });

  return { message: "Name updated successfully", data: user };
};

// Email is the login identity, so changing it requires the current password
export const updateEmailService = async (userId: string, data: UpdateEmailInput) => {
  const { newEmail, currentPassword } = data;
  const normalizedEmail = newEmail.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError(400, "Current password is incorrect");

  if (normalizedEmail === user.email) {
    throw new ApiError(400, "New email must be different from the current email");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) throw new ApiError(409, "Email is already in use");

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email: normalizedEmail },
      select: accountSelect,
    });

    return { message: "Email updated successfully", data: updated };
  } catch (error) {
    // Another account took the email between the check above and this update
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "Email is already in use");
    }
    throw error;
  }
};