"use client"

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
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Building2, FileText, Home, ImageIcon, ScrollText, UserRound } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "../ui/themetoggle"
import { TooltipProvider } from "../ui/tooltip"

const mainNav = [
    {
        title: "Trang chủ",
        href: "/",
        icon: Home,
    },
    {
        title: "Chính sách",
        href: "/chinh-sach",
        icon: ScrollText,
    },
]

const toolNav = [
    {
        title: "Tạo ảnh",
        icon: ImageIcon,
        items: [
            {
                title: "Avatar",
                href: "/tao-anh/avatar",
                icon: UserRound,
            },
            {
                title: "Nhà lẻ",
                href: "/tao-anh/nha-le",
                icon: Building2,
            },
        ],
    },
    {
        title: "Kịch bản",
        icon: FileText,
        items: [
            {
                title: "Nhà lẻ",
                href: "/kich-ban/nha-le",
                icon: Building2,
            },
        ],
    },
]

export function AppSidebar() {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === "/") {
            return pathname === href
        }

        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <TooltipProvider>
            <Sidebar>
            <SidebarHeader>
                <Link href="/">
                    <Image src="/logo.webp" alt="Logo" className="mx-auto" width={100} height={100} />
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
                    <SidebarMenu>
                        {mainNav.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive(item.href)}
                                    tooltip={item.title}
                                >
                                    <Link href={item.href}>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Công cụ</SidebarGroupLabel>
                    <SidebarMenu>
                        {toolNav.map((group) => (
                            <SidebarMenuItem key={group.title}>
                                <SidebarMenuButton
                                    isActive={group.items.some((item) => isActive(item.href))}
                                    tooltip={group.title}
                                >
                                    <group.icon />
                                    <span>{group.title}</span>
                                </SidebarMenuButton>
                                <SidebarMenuSub>
                                    {group.items.map((item) => (
                                        <SidebarMenuSubItem key={item.href}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={isActive(item.href)}
                                            >
                                                <Link href={item.href}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter >
                <ThemeToggle />
            </SidebarFooter>
            </Sidebar>
        </TooltipProvider>
    )
}
