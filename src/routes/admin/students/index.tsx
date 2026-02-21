import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const studentsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
})

export const Route = createFileRoute('/admin/students/')({
    validateSearch: (search) => studentsSearchSchema.parse(search),
})
