import { Gender } from "@prisma/client";
export interface ProfileInput {
    bio?: string
    avatarUrl?: string
    dateOfBirth?: Date
    city?: string
    country?: string
    portfolioUrl?: string
    linkedinUrl?: string
    githubUrl?: string
    phoneNumber?: string
    gender?: Gender
}

export interface ProfileOutput {
    bio: string | null;
    avatarUrl: string | null;
    dateOfBirth: Date | null;
    city: string | null;
    country: string | null;
    portfolioUrl: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    phoneNumber: string | null;
    gender: Gender | null;
}
