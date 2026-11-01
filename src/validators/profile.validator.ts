import { Gender } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { assertPlainObject, assertStringField } from "./common.validator.js";

const validGenders: string[] = Object.values(Gender);

// True when value is an https URL on host or one of its subdomains (e.g. www.linkedin.com).
// Parsing the URL rejects lookalikes such as https://linkedin.com.evil.site.
// Keep in sync with isHttpsUrlOnHost in careerflow-frontend/lib/form.ts
const isHttpsUrlOnHost = (value: string, host: string): boolean => {
    try {
        const { protocol, hostname } = new URL(value);
        return protocol === "https:" && (hostname === host || hostname.endsWith(`.${host}`));
    } catch {
        return false;
    }
};

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

    if (typeof linkedinUrl === "string" && !isHttpsUrlOnHost(linkedinUrl, "linkedin.com")) {
        throw new ApiError(400, "Invalid LinkedIn URL");
    }

    if (typeof githubUrl === "string" && !isHttpsUrlOnHost(githubUrl, "github.com")) {
        throw new ApiError(400, "Invalid GitHub URL");
    }

    if (typeof phoneNumber === "string" && !/^\+?[\d\s\-().]{7,20}$/.test(phoneNumber)) {
        throw new ApiError(400, "Invalid phone number format");
    }

    if (gender !== undefined && gender !== null && (typeof gender !== "string" || !validGenders.includes(gender))) {
        throw new ApiError(400, `Invalid gender. Must be one of: ${validGenders.join(", ")}`);
    }
};