export interface ProfileInput {
    bio?: string;
    skills?: string[];
}

export interface ProfileOutput {
    bio: string | null;
    skills: { name: string }[];
}