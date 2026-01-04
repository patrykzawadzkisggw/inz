"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  PieChart,
  PlayCircleIcon,
  Settings2,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { useUser } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const navMain = [
  {
    title: "Layout",
    url: "/",
    icon: PieChart,
  },
  {
    title: "Modele",
    url: "/models",
    icon: Bot,
  },
  {
    title: "Powiadomienia",
    url: "/notifications",
    icon: BookOpen,
  },
  {
    title: "Funkcje",
    url: "/functions",
    icon: Settings2,
  },
  {
    title: "Konsola",
    url: "/console",
    icon: PlayCircleIcon,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const fullName = React.useMemo(() => {
    if (!user) return "...";
    const parts = [user.firstName, user.lastName].filter(Boolean);
    if (parts.length) return parts.join(" ");
    return user.username || "Użytkownik";
  }, [user]);
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const avatar = user?.imageUrl || "/avatars/shadcn.jpg";

  const dynamicUser = { name: fullName, email, avatar };
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader></SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={dynamicUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
