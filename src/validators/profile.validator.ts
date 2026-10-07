import { Gender } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { assertPlainObject, assertStringField } from "./common.validator.js";

const validGenders: string[] = Object.values(Gender);

const STRING_FIELDS = [
    "bio",
    "avatarUrl",
    "city",
    "country",
    "portfolioUrl",
    "linkedinUrl",
    "githubUrl",
    "phoneNumber"
];

export const validateUpdateProfileInput = (data: unknown): void => {
    assertPlainObject(data);

    // Every writable field must be a string (or null to clear it), so no object
    // (nested relation write or Prisma operator) can reach the database
    for (const field of STRING_FIELDS) {
        assertStringField(data, field, { nullable: true });
    }

    const { bio, avatarUrl, dateOfBirth, city, country, portfolioUrl, linkedinUrl, githubUrl, phoneNumber, gender } = data;

    if (typeof bio === "string" && bio.trim().length < 10) {
        throw new ApiError(400, "Bio must be at least 10 characters");
    }

    if (typeof avatarUrl === "string" && !avatarUrl.startsWith("https://")) {
        throw new ApiError(400, "Avatar URL must start with https://");
    }

    if (dateOfBirth !== undefined && dateOfBirth !== null) {
        const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : new Date(NaN);
        if (isNaN(dob.getTime())) {
            throw new ApiError(400, "Invalid date of birth");
        }
        if (dob >= new Date()) {
            throw new ApiError(400, "Date of birth must be in the past");
        }
    }

    if (typeof city === "string" && city.trim().length < 2) {
        throw new ApiError(400, "City must be at least 2 characters");
    }

    if (typeof country === "string" && country.trim().length < 2) {
        throw new ApiError(400, "Country must be at least 2 characters");
    }

    if (typeof portfolioUrl === "string" && !portfolioUrl.startsWith("https://")) {
        throw new ApiError(400, "Portfolio URL must start with https://");
    }

    if (typeof linkedinUrl === "string" && !linkedinUrl.startsWith("https://linkedin.com")) {
        throw new ApiError(400, "Invalid LinkedIn URL");
    }

    if (typeof githubUrl === "string" && !githubUrl.startsWith("https://github.com")) {
        throw new ApiError(400, "Invalid GitHub URL");
    }

    if (typeof phoneNumber === "string" && !/^\+?[\d\s\-().]{7,20}$/.test(phoneNumber)) {
        throw new ApiError(400, "Invalid phone number format");
    }

    if (gender !== undefined && gender !== null && (typeof gender !== "string" || !validGenders.includes(gender))) {
        throw new ApiError(400, `Invalid gender. Must be one of: ${validGenders.join(", ")}`);
    }
};