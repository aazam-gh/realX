import * as React from "react"
import {
  IconCircleCheck,
  IconHome,
  IconInfoCircle,
  IconReceipt,
  IconReportAnalytics,
  IconShield,
  IconStar,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: IconHome,
    },
    {
      title: "Transactions",
      url: "/admin/transactions",
      icon: IconReceipt,
    },
    {
      title: "Vendors",
      url: "/admin/vendors",
      icon: IconShield,
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: IconReportAnalytics,
    },
    {
      title: "Users/Students",
      url: "/admin/users",
      icon: IconUsers,
    },
    {
      title: "App CMS",
      url: "/admin/cms",
      icon: IconInfoCircle,
    },
    {
      title: "Student Requests",
      url: "/admin/requests",
      icon: IconCircleCheck,
    },
    {
      title: "PINS",
      url: "/admin/pins",
      icon: IconStar,
    },
  ],
}

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    avatar: string
  }
  onLogout?: () => void
}

export function AdminSidebar({
  user,
  onLogout,
  ...props
}: AdminSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" className="border-none" {...props}>
      <SidebarHeader className="pt-6 px-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-transparent"
            >
              <a href="/">
                <span className="text-3xl font-black text-[#18521C] tracking-tighter">ReelX</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 mt-4">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="p-4 mb-4">
        <NavUser user={user || data.user} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
