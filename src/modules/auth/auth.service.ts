import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { generateToken } from "../../utils/jwt.js";
import { Role } from "@prisma/client";
import type { LoginUserInput, RegisterUserInput } from "./auth.types.js";
import { ApiError } from "../../utils/ApiError.js";

export const registerUser = async (data: RegisterUserInput) => {
  const { fullName, email, password, role } = data;

  const normalizedEmail = email.toLowerCase().trim();
  const cleanFullName = fullName.trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: cleanFullName,
      email: normalizedEmail,
      password: hashedPassword,
      role: (role as Role) || Role.USER,
    },
  });

  return {
    message: "User registered successfully",
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
};

export const loginUser = async (data: LoginUserInput) => {
  const { email, password } = data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new ApiError(400, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(400, "Wrong password");
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
  });

  return {
    message: "Login successful",
    data: { token }
  };
};