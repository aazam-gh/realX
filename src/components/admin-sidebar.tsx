import * as React from "react"
import {
  IconChartBar,
  IconHistory,
  IconLayoutDashboard,
  IconMail,
  IconSettings,
  IconShieldCheck,
  IconTableExport,
  IconUser,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
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
      icon: IconLayoutDashboard,
    },
    {
      title: "Transaction History",
      url: "/admin/transactions",
      icon: IconHistory,
    },
    {
      title: "Vendors",
      url: "/admin/vendors",
      icon: IconHistory,
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: IconChartBar,
    },
    {
      title: "App CMS",
      url: "/admin/cms",
      icon: IconTableExport,
    },
    {
      title: "Users/Students",
      url: "/admin/users",
      icon: IconUser,
    },
    {
      title: "Pins",
      url: "/admin/pins",
      icon: IconShieldCheck,
    },
  ],
  navSecondary: [
    {
      title: "Contact Us",
      url: "/admin/contact-us",
      icon: IconMail,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: IconSettings,
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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <span className="text-2xl font-bold text-[#18521C] ml-1">ReelX</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user || data.user} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
