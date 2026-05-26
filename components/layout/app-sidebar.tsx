import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "../ui/themetoggle"

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarHeader>
                <Link href="/">
                    <Image src="/logo.webp" alt="Logo" className="mx-auto" width={100} height={100} />
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Main</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton>Dashboard</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>Settings</SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup />
            </SidebarContent>
            <SidebarFooter >
                <ThemeToggle />
            </SidebarFooter>
        </Sidebar>
    )
}