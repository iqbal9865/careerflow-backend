import type { TaskStatus } from "@prisma/client";

export interface TaskInput {
    title: string
    description?: string | null
    deadline: string
}

export interface TaskStatusInput {
    status: TaskStatus
}

export interface TaskFilters {
    status?: TaskStatus
    from?: string
    to?: string
}

export interface TaskOutput {
    id: string
    title: string
    description: string | null
    deadline: Date
    status: TaskStatus
    completedAt: Date | null
    reviewedAt: Date | null
    userId: string
    createdAt: Date
    updatedAt: Date
}

export interface TaskStatsOutput {
    total: number
    byStatus: Record<TaskStatus, number>
    // PENDING tasks whose deadline has passed
    overdue: number
    // Tasks finished (REVIEW or DONE) by their deadline vs after it
    completedOnTime: number
    completedLate: number
    // Share of all tasks that are DONE, 0-100
    completionRate: number
    // Share of finished tasks that met their deadline, 0-100
    onTimeRate: number
}
