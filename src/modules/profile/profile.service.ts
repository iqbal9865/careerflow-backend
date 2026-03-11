import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { ProfileInput } from "./profile.types.js";

export const getProfileService = async (userId: string) => {
    const profile = await prisma.profile.findUnique({
        where: { userId }
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
        data
    });
    return profile;
}