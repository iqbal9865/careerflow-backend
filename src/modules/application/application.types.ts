import { ApplicationStatus } from "@prisma/client";

export interface ApplicationInput {
    companyName: string
    position: string
    location?: string
    salaryRange?: string
    jobUrl?: string
    source?: string
    notes?: string
    appliedAt?: Date
    followUpAt?: Date
    status?: ApplicationStatus
}

export interface ApplicationOutput {
    id: string
    companyName: string
    position: string
    location: string | null
    salaryRange: string | null
    jobUrl: string | null
    source: string | null
    notes: string | null
    appliedAt: Date
    followUpAt: Date | null
    status: ApplicationStatus
    createdAt: Date
    updatedAt: Date
}