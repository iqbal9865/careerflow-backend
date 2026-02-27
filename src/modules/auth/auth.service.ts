import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { generateToken } from "../../utils/jwt.js";
import { Role } from "@prisma/client";
import type { LoginUserInput, RegisterUserInput } from "./auth.types.js";


export const registerUser = async (data: RegisterUserInput) => {
  const { fullName, email, password, role } = data;

  if (!fullName || !email || !password) {
    throw {
      statusCode: 400,
      message: "Missing required fields",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw {
      statusCode: 400,
      message: "User already exists",
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      password: hashedPassword,
      role: (role as Role) || Role.USER,
    },
  });

  return {
    message: "User registered successfully",
    user: {

      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
};

export const loginUser = async (data: LoginUserInput) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw {
      statusCode: 400,
      message: "Invalid credentials",
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw {
      statusCode: 400,
      message: "Invalid credentials",
    };
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
  });

  return {
    message: "Login successful",
    token,
  };
};