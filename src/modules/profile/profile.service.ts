import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { pickFields } from "../../utils/pickFields.js";
import type { ProfileInput } from "./profile.types.js";

// Fields a client may set. id, userId, the user and skills relations and timestamps are server-controlled
export const PROFILE_WRITABLE_FIELDS = [
    "bio",
    "avatarUrl",
    "phoneNumber",
    "dateOfBirth",
    "gender",
    "city",
    "country",
    "portfolioUrl",
    "linkedinUrl",
    "githubUrl"
] as const satisfies readonly (keyof ProfileInput)[];

export const getProfileService = async (userId: string) => {
    const profile = await prisma.profile.findUnique({
        where: { userId },
        // Explicit select so password and other User fields are never returned
        include: {
            user: { select: { fullName: true, email: true } }
        }
    })
    if (!profile) throw new ApiError(404, 'Profile not found');
    return profile;

}

export const updateProfileService = async (
    userId: string,
    data: ProfileInput
) => {
    const profile = await prisma.profile.update({
        where: { userId },
        data: pickFields(data, PROFILE_WRITABLE_FIELDS)
    });
    return profile;
}