import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/cms/categories')({
    component: () => <div>Categories & Sorting</div>,
})
