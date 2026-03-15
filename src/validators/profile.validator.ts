import type { ProfileInput } from "../modules/profile/profile.types.js";
import { Gender } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

const validGenders = Object.values(Gender);

export const validateUpdateProfileInput = (data: ProfileInput): void => {
    const { bio, avatarUrl, dateOfBirth, city, country, portfolioUrl, linkedinUrl, githubUrl, phoneNumber, gender } = data;

    if (bio !== undefined && bio.trim().length < 10) {
        throw new ApiError(400, "Bio must be at least 10 characters");
    }

    if (avatarUrl !== undefined && !avatarUrl.startsWith("https://")) {
        throw new ApiError(400, "Avatar URL must start with https://");
    }

    if (dateOfBirth !== undefined) {
        const dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) {
            throw new ApiError(400, "Invalid date of birth");
        }
        if (dob >= new Date()) {
            throw new ApiError(400, "Date of birth must be in the past");
        }
    }

    if (city !== undefined && city.trim().length < 2) {
        throw new ApiError(400, "City must be at least 2 characters");
    }

    if (country !== undefined && country.trim().length < 2) {
        throw new ApiError(400, "Country must be at least 2 characters");
    }

    if (portfolioUrl !== undefined && !portfolioUrl.startsWith("https://")) {
        throw new ApiError(400, "Portfolio URL must start with https://");
    }

    if (linkedinUrl !== undefined && !linkedinUrl.startsWith("https://linkedin.com")) {
        throw new ApiError(400, "Invalid LinkedIn URL");
    }

    if (githubUrl !== undefined && !githubUrl.startsWith("https://github.com")) {
        throw new ApiError(400, "Invalid GitHub URL");
    }

    if (phoneNumber !== undefined && !/^\+?[\d\s\-().]{7,20}$/.test(phoneNumber)) {
        throw new ApiError(400, "Invalid phone number format");
    }

    if (gender !== undefined && !validGenders.includes(gender)) {
        throw new ApiError(400, `Invalid gender. Must be one of: ${validGenders.join(", ")}`);
    }
};