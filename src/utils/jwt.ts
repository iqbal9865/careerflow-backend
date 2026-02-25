import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";

export const generateToken = (payload: object): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};