import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/cms/sliders')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/cms/sliders"!</div>
}
