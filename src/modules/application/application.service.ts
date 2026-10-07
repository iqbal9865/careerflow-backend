// application.service.ts
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { pickFields } from "../../utils/pickFields.js";
import type { ApplicationInput, ApplicationOutput } from "./application.types.js";

// Fields a client may set. id, userId, the user relation and timestamps are server-controlled
export const APPLICATION_WRITABLE_FIELDS = [
    "companyName",
    "position",
    "location",
    "salaryRange",
    "jobUrl",
    "source",
    "notes",
    "appliedAt",
    "followUpAt",
    "status"
] as const satisfies readonly (keyof ApplicationInput)[];

export const createApplicationService = async (
    userId: string,
    data: ApplicationInput
): Promise<ApplicationOutput> => {
    const application = await prisma.application.create({
        data: {
            ...pickFields(data, APPLICATION_WRITABLE_FIELDS),
            // Required fields, guaranteed by validateCreateApplicationInput
            companyName: data.companyName,
            position: data.position,
            userId
        }
    });
    return application;
};

export const getApplicationsService = async (
    userId: string
): Promise<ApplicationOutput[]> => {
    const applications = await prisma.application.findMany({
        where: { userId },
        orderBy: { appliedAt: "desc" }
    });
    return applications;
};

export const getApplicationByIdService = async (
    userId: string,
    applicationId: string
): Promise<ApplicationOutput> => {
    const application = await prisma.application.findUnique({
        where: { id: applicationId }
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (application.userId !== userId) throw new ApiError(403, "Forbidden");

    return application;
};

export const updateApplicationService = async (
    userId: string,
    applicationId: string,
    data: Partial<ApplicationInput>
): Promise<ApplicationOutput> => {
    const application = await prisma.application.findUnique({
        where: { id: applicationId }
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (application.userId !== userId) throw new ApiError(403, "Forbidden");

    const updated = await prisma.application.update({
        where: { id: applicationId },
        data: pickFields(data, APPLICATION_WRITABLE_FIELDS)
    });
    return updated;
};

export const deleteApplicationService = async (
    userId: string,
    applicationId: string
): Promise<void> => {
    const application = await prisma.application.findUnique({
        where: { id: applicationId }
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (application.userId !== userId) throw new ApiError(403, "Forbidden");

    await prisma.application.delete({
        where: { id: applicationId }
    });
};