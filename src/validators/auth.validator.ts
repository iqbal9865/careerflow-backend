import type { RegisterUserInput } from "../modules/auth/auth.types.js";
import { ApiError } from "../utils/ApiError.js";


export const validateRegisterInput = (data: RegisterUserInput): void => {
  const { fullName, email, password } = data;

  if (!fullName || !email || !password) {
    throw new ApiError(400, "Missing required fields");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }
};