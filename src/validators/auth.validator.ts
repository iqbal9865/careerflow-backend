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

  const MIN_PASSWORD_LENGTH = 8;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  if (!passwordRegex.test(password)) {
    throw new ApiError(
      400,
      "Password must include uppercase, lowercase, number, and special character"
    );
  }

};