import { randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

function getSecret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function getExpiresIn(envKey: string, fallback: string): string {
  return process.env[envKey] ?? fallback;
}

const accessTokenSecret = () => getSecret("ACCESS_TOKEN_SECRET");
const refreshTokenSecret = () => getSecret("REFRESH_TOKEN_SECRET");
const accessTokenExpires = getExpiresIn("ACCESS_TOKEN_EXPIRES_IN", "15m");
const refreshTokenExpires = getExpiresIn("REFRESH_TOKEN_EXPIRES_IN", "30d");

// Generate short-lived access token
export const generateAccessToken = (userId: string) => {
  return jwt.sign(
    { userId },
    accessTokenSecret(),
    { expiresIn: accessTokenExpires } as SignOptions
  );
};

// Generate long-lived refresh token.
// A random jwtid keeps tokens unique: iat has 1-second resolution, so two logins
// in the same second would otherwise produce identical tokens and break the unique column.
export const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    { userId },
    refreshTokenSecret(),
    { expiresIn: refreshTokenExpires, jwtid: randomUUID() } as SignOptions
  );
};