"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
    const [dark, setDark] = useState(false)

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme")

        if (
            savedTheme === "dark" ||
            (!savedTheme &&
                window.matchMedia("(prefers-color-scheme: dark)").matches)
        ) {
            document.documentElement.classList.add("dark")
            setDark(true)
        }
    }, [])

    const toggleTheme = () => {
        const html = document.documentElement

        if (html.classList.contains("dark")) {
            html.classList.remove("dark")
            localStorage.setItem("theme", "light")
            setDark(false)
        } else {
            html.classList.add("dark")
            localStorage.setItem("theme", "dark")
            setDark(true)
        }
    }

    return (
        <button
            onClick={toggleTheme}
            className="w-10 h-10
        inline-flex items-center justify-center
        rounded-xl border border-border
        bg-card p-2
        text-foreground
        shadow-sm transition-all
        hover:bg-accent
      "
        >
            {dark ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </button>
    )
}