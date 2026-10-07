import type { RegisterUserInput, LoginUserInput } from "../modules/auth/auth.types.js";
import { ApiError } from "../utils/ApiError.js";
import { assertPlainObject } from "./common.validator.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegisterInput = (data: RegisterUserInput): void => {
  const { fullName, email, password } = data;

  if (!fullName || !email || !password) {
    throw new ApiError(400, "Missing required fields");
  }

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

export const validateLoginInput = (data: LoginUserInput): void => {
  const { email, password } = data;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }
}

// Used by /auth/refresh and /auth/logout. refreshToken is used as a Prisma filter,
// so anything other than a non-empty string (e.g. { "not": "" }) must be rejected
export const validateRefreshTokenInput = (data: unknown): void => {
  assertPlainObject(data);
  const { refreshToken } = data;

  if (refreshToken === undefined || refreshToken === null || refreshToken === "") {
    throw new ApiError(400, "Refresh token required");
  }

  if (typeof refreshToken !== "string") {
    throw new ApiError(400, "Refresh token must be a string");
  }
};

export const validateUpdateNameInput = (data: unknown): void => {
  assertPlainObject(data);
  const { fullName } = data;

  if (typeof fullName !== "string" || !fullName.trim()) {
    throw new ApiError(400, "Full name is required");
  }

  if (fullName.trim().length < 2) {
    throw new ApiError(400, "Full name must be at least 2 characters");
  }
};

export const validateUpdateEmailInput = (data: unknown): void => {
  assertPlainObject(data);
  const { newEmail, currentPassword } = data;

  if (typeof newEmail !== "string" || typeof currentPassword !== "string" || !newEmail || !currentPassword) {
    throw new ApiError(400, "New email and current password are required");
  }

  if (!emailRegex.test(newEmail.trim())) {
    throw new ApiError(400, "Invalid email format");
  }
};