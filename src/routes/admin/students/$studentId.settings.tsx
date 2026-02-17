import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/students/$studentId/settings')({
    component: StudentSettings,
})

function StudentSettings() {
    const { studentId } = Route.useParams()

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold">Student Settings</h1>
            <p className="mt-4 text-muted-foreground">
                Managing settings for student ID: {studentId}
            </p>
        </div>
    )
}
