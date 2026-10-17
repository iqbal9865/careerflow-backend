// task.service.ts
import { TaskStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { pickFields } from "../../utils/pickFields.js";
import type { TaskFilters, TaskInput, TaskOutput, TaskStatsOutput } from "./task.types.js";

// Fields a client may set. id, userId, status, completedAt, reviewedAt and timestamps are server-controlled
export const TASK_WRITABLE_FIELDS = [
    "title",
    "description",
    "deadline"
] as const satisfies readonly (keyof TaskInput)[];

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.PENDING]: [TaskStatus.REVIEW],
    [TaskStatus.REVIEW]: [TaskStatus.DONE, TaskStatus.PENDING],
    [TaskStatus.DONE]: []
};

// Dates arrive as strings; convert so Prisma also accepts date-only values like "2026-10-20"
const toTaskData = (data: Partial<TaskInput>) => {
    const { deadline, ...rest } = pickFields(data, TASK_WRITABLE_FIELDS);
    return deadline === undefined ? rest : { ...rest, deadline: new Date(deadline) };
};

const buildTaskWhere = (userId: string, filters: TaskFilters): Prisma.TaskWhereInput => {
    const where: Prisma.TaskWhereInput = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
        where.deadline = {
            ...(filters.from && { gte: new Date(filters.from) }),
            ...(filters.to && { lte: new Date(filters.to) })
        };
    }
    return where;
};

const findOwnedTask = async (userId: string, taskId: string) => {
    const task = await prisma.task.findUnique({
        where: { id: taskId }
    });

    if (!task) throw new ApiError(404, "Task not found");
    if (task.userId !== userId) throw new ApiError(403, "Forbidden");

    return task;
};

export const createTaskService = async (
    userId: string,
    data: TaskInput
): Promise<TaskOutput> => {
    const task = await prisma.task.create({
        data: {
            ...toTaskData(data),
            // Required fields, guaranteed by validateCreateTaskInput
            title: data.title,
            deadline: new Date(data.deadline),
            userId
        }
    });
    return task;
};

export const getTasksService = async (
    userId: string,
    filters: TaskFilters
): Promise<TaskOutput[]> => {
    const tasks = await prisma.task.findMany({
        where: buildTaskWhere(userId, filters),
        orderBy: { deadline: "asc" }
    });
    return tasks;
};

export const getTaskByIdService = async (
    userId: string,
    taskId: string
): Promise<TaskOutput> => {
    return findOwnedTask(userId, taskId);
};

export const updateTaskService = async (
    userId: string,
    taskId: string,
    data: Partial<TaskInput>
): Promise<TaskOutput> => {
    const task = await findOwnedTask(userId, taskId);

    // A finished task is part of the user's history; editing it would change their stats
    if (task.status === TaskStatus.DONE) {
        throw new ApiError(409, "A task that is DONE cannot be edited");
    }

    const updated = await prisma.task.update({
        where: { id: taskId },
        data: toTaskData(data)
    });
    return updated;
};

export const updateTaskStatusService = async (
    userId: string,
    taskId: string,
    status: TaskStatus
): Promise<TaskOutput> => {
    const task = await findOwnedTask(userId, taskId);

    if (!ALLOWED_TRANSITIONS[task.status].includes(status)) {
        throw new ApiError(409, `Cannot change status from ${task.status} to ${status}`);
    }

    const now = new Date();
    const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
            status,
            ...(status === TaskStatus.REVIEW && { completedAt: now }),
            ...(status === TaskStatus.DONE && { reviewedAt: now }),
            ...(status === TaskStatus.PENDING && { completedAt: null })
        }
    });
    return updated;
};

export const deleteTaskService = async (
    userId: string,
    taskId: string
): Promise<void> => {
    await findOwnedTask(userId, taskId);

    await prisma.task.delete({
        where: { id: taskId }
    });
};

export const getTaskStatsService = async (
    userId: string,
    filters: Omit<TaskFilters, "status">
): Promise<TaskStatsOutput> => {
    const where = buildTaskWhere(userId, filters);
    const finished: Prisma.TaskWhereInput = {
        ...where,
        status: { in: [TaskStatus.REVIEW, TaskStatus.DONE] }
    };

    const [grouped, overdue, completedOnTime, completedLate] = await Promise.all([
        prisma.task.groupBy({ by: ["status"], where, _count: { _all: true } }),
        prisma.task.count({
            where: { ...where, status: TaskStatus.PENDING, deadline: { lt: new Date() } }
        }),
        prisma.task.count({
            where: { ...finished, completedAt: { lte: prisma.task.fields.deadline } }
        }),
        prisma.task.count({
            where: { ...finished, completedAt: { gt: prisma.task.fields.deadline } }
        })
    ]);

    const byStatus: Record<TaskStatus, number> = {
        [TaskStatus.PENDING]: 0,
        [TaskStatus.REVIEW]: 0,
        [TaskStatus.DONE]: 0
    };
    for (const row of grouped) byStatus[row.status] = row._count._all;

    const total = byStatus.PENDING + byStatus.REVIEW + byStatus.DONE;
    const finishedCount = completedOnTime + completedLate;
    const percent = (part: number, whole: number) =>
        whole === 0 ? 0 : Math.round((part / whole) * 100);

    return {
        total,
        byStatus,
        overdue,
        completedOnTime,
        completedLate,
        completionRate: percent(byStatus.DONE, total),
        onTimeRate: percent(completedOnTime, finishedCount)
    };
};
