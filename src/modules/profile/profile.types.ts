export interface ProfileInput {
    bio?: string;
    skills?: string[];
    avatarUrl?: string;
}

export interface ProfileOutput {
    bio: string | null;
    skills: { name: string }[];
    avatarUrl: string | null;
}