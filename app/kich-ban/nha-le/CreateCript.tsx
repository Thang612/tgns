"use client"

import React, { useEffect, useState } from "react"

import {
    Sparkles,
    Link2,
    Clock,
    Play,
    Copy,
    Check,
    AlertCircle,
    Loader2,
    Tv,
    ChevronRight,
    Volume2,
    List,
    History,
    RotateCcw,
    Sun,
    Moon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

/* =========================
   TYPES
========================= */

type TongQuan = {
    usp_chinh: string
    doi_tuong_khach_hang: string
    cam_xuc_chinh: string
}

type Scene = {
    id: number
    thoigian: string
    hinhanh_video: string
    goc_may: string
    chuyen_dong_camera: string
    amthanh: string
    noidung_noi: string
    text_man_hinh: string
    hieu_ung_goi_y: string
}

type Scenario = {
    ten: string
    thoiluong: string
    tone: string
    format: string
    hook: string
    cta: string
    tong_quan?: TongQuan
    canh: Scene[]
}

type HistoryItem = {
    timestamp: string
    url: string
    data: Scenario
}

/* =========================
   COMPONENT
========================= */

const CreateCript = () => {
    const [url, setUrl] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const [error, setError] = useState<string | null>(null)

    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [history, setHistory] = useState<HistoryItem[]>([])

    const [selectedScenarioIdx, setSelectedScenarioIdx] =
        useState(0)

    const [copiedIndex, setCopiedIndex] = useState<number | null>(
        null
    )

    const [teleprompterMode, setTeleprompterMode] =
        useState(false)

    const [activePlayScene, setActivePlayScene] =
        useState<number | null>(null)

    /* =========================
       LOAD HISTORY
    ========================= */

    useEffect(() => {
        const saved = localStorage.getItem(
            "script_creator_history"
        )

        if (saved) {
            try {
                const parsed: HistoryItem[] = JSON.parse(saved)

                setHistory(parsed)

                if (parsed.length > 0) {
                    setScenarios([parsed[0].data])
                }
            } catch (err) {
                console.error(err)
            }
        }
    }, [])



    /* =========================
       API
    ========================= */

    const handleGenerateScript = async (
        e?: React.FormEvent
    ) => {
        e?.preventDefault()

        if (!url.trim()) {
            setError("Vui lòng nhập URL")
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append("url", url)

            const response = await fetch(
                "https://n8n-test.thegioinhasang.com/webhook/tao-kich-ban",
                {
                    method: "POST",
                    body: formData,
                }
            )

            if (!response.ok) {
                throw new Error("API Error")
            }

            const data = await response.json()

            const parsed: Scenario[] = Array.isArray(data)
                ? data
                : [data]

            setScenarios(parsed)
            setSelectedScenarioIdx(0)

            const newHistory: HistoryItem = {
                timestamp: new Date().toLocaleTimeString("vi-VN"),
                url,
                data: parsed[0],
            }

            const updated = [newHistory, ...history.slice(0, 9)]

            setHistory(updated)

            localStorage.setItem(
                "script_creator_history",
                JSON.stringify(updated)
            )
        } catch (err) {
            console.error(err)

            setError(
                "Không kết nối được API. Hiển thị dữ liệu demo."
            )

            showFallbackData()
        } finally {
            setIsLoading(false)
        }
    }

    /* =========================
       DEMO
    ========================= */

    const showFallbackData = () => {
        const demo: Scenario[] = [
            {
                ten: "Nhà phố Phan Xích Long",
                thoiluong: "30s",
                tone: "Cinematic",
                format: "TikTok Reel",
                hook:
                    "Ai bảo dưới 5 tỷ không mua được nhà VIP?",
                cta: "Liên hệ ngay hôm nay!",
                canh: [
                    {
                        id: 1,
                        thoigian: "0s-5s",
                        hinhanh_video:
                            "POV chạy vào hẻm Phan Xích Long",
                        goc_may: "Wide",
                        chuyen_dong_camera: "Tracking",
                        amthanh: "Beat cinematic",
                        noidung_noi:
                            "Ai bảo dưới 5 tỷ không mua được nhà VIP?",
                        text_man_hinh:
                            "NHÀ PHÚ NHUẬN\n4.85 TỶ",
                        hieu_ung_goi_y: "Speed ramp",
                    },
                ],
            },
        ]

        setScenarios(demo)
    }

    /* =========================
       COPY
    ========================= */

    const copyScene = async (
        text: string,
        index: number
    ) => {
        await navigator.clipboard.writeText(text)

        setCopiedIndex(index)

        setTimeout(() => {
            setCopiedIndex(null)
        }, 1500)
    }

    /* =========================
       PLAY
    ========================= */

    const playScene = (id: number) => {
        setActivePlayScene(id)

        setTimeout(() => {
            setActivePlayScene(null)
        }, 4000)
    }

    const activeScenario =
        scenarios[selectedScenarioIdx]

    /* =========================
       UI
    ========================= */

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground">
                {/* MAIN */}

                <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-12">
                    {/* LEFT */}

                    <div className="space-y-6 sticky top-4 lg:col-span-4">
                        <Card className="rounded-3xl">
                            <CardContent className="p-6">
                                <div className="mb-5 flex items-center gap-2">
                                    <Link2 className="h-5 w-5 text-primary" />

                                    <h2 className="font-bold">
                                        Tạo kịch bản
                                    </h2>
                                </div>

                                <form
                                    onSubmit={handleGenerateScript}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            URL bài viết
                                        </label>

                                        <Input
                                            value={url}
                                            onChange={(e) =>
                                                setUrl(e.target.value)
                                            }
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Tạo kịch bản
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* ERROR */}

                        {error && (
                            <Card className="border-red-500/30 bg-red-500/10">
                                <CardContent className="flex items-start gap-3 p-4 text-sm text-red-400">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                                    <p>{error}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* HISTORY */}

                        {history.length > 0 && (
                            <Card className="rounded-3xl">
                                <CardContent className="p-5">
                                    <div className="mb-4 flex items-center gap-2">
                                        <History className="h-4 w-4 text-primary" />

                                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            Lịch sử
                                        </h3>
                                    </div>

                                    <ScrollArea className="h-62.5 pr-3">
                                        <div className="space-y-2">
                                            {history.map((item, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        setScenarios([item.data])
                                                        setUrl(item.url)
                                                    }}
                                                    className="flex w-full items-center justify-between rounded-2xl border bg-background p-3 text-left transition-colors hover:bg-muted"
                                                >
                                                    <div className="truncate">
                                                        <p className="truncate text-xs font-bold">
                                                            {item.data.ten}
                                                        </p>

                                                        <p className="truncate text-[10px] text-muted-foreground">
                                                            {item.url}
                                                        </p>
                                                    </div>

                                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT */}

                    <div className="lg:col-span-8">
                        {activeScenario ? (
                            <div className="space-y-6">
                                {/* SCENARIO HEADER */}

                                <Card className="rounded-3xl">
                                    <CardContent className="space-y-5 p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <h2 className="text-2xl font-bold">
                                                    {activeScenario.ten}
                                                </h2>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Badge variant="secondary">
                                                        {activeScenario.thoiluong}
                                                    </Badge>

                                                    <Badge variant="secondary">
                                                        {activeScenario.format}
                                                    </Badge>

                                                    <Badge>
                                                        {activeScenario.tone}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <Button
                                                variant={
                                                    teleprompterMode
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="icon"
                                                onClick={() =>
                                                    setTeleprompterMode(
                                                        !teleprompterMode
                                                    )
                                                }
                                            >
                                                <Volume2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <Separator />

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Card className="bg-muted/40">
                                                <CardContent className="p-4">
                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                                                        Hook
                                                    </p>

                                                    <p className="italic">
                                                        "{activeScenario.hook}"
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-muted/40">
                                                <CardContent className="p-4">
                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-cyan-500">
                                                        CTA
                                                    </p>

                                                    <p className="italic">
                                                        "{activeScenario.cta}"
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* TELEPROMPTER */}

                                {teleprompterMode && (
                                    <Card className="border-primary">
                                        <CardContent className="p-8 text-center">
                                            {activePlayScene ? (
                                                <div className="space-y-4">
                                                    <Badge>
                                                        Đang đọc cảnh{" "}
                                                        {activePlayScene}
                                                    </Badge>

                                                    <p className="text-3xl font-bold leading-relaxed">
                                                        "
                                                        {
                                                            activeScenario.canh.find(
                                                                (c) =>
                                                                    c.id ===
                                                                    activePlayScene
                                                            )?.noidung_noi
                                                        }
                                                        "
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="py-10 text-muted-foreground">
                                                    Nhấn Play để bắt đầu
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* SCENES */}

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <List className="h-4 w-4 text-primary" />

                                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            Danh sách phân cảnh
                                        </h3>
                                    </div>

                                    {activeScenario.canh.map(
                                        (scene, index) => {
                                            const isPlaying =
                                                activePlayScene === scene.id

                                            return (
                                                <Card
                                                    key={scene.id}
                                                    className={`rounded-3xl transition-all ${isPlaying
                                                        ? "border-primary ring-1 ring-primary"
                                                        : ""
                                                        }`}
                                                >
                                                    <CardContent className="p-6">
                                                        {/* TOP */}

                                                        <div className="mb-5 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted text-sm font-bold">
                                                                    {scene.id}
                                                                </div>

                                                                <Badge
                                                                    variant="outline"
                                                                    className="gap-1"
                                                                >
                                                                    <Clock className="h-3 w-3" />

                                                                    {scene.thoigian}
                                                                </Badge>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        playScene(scene.id)
                                                                    }
                                                                >
                                                                    <Play
                                                                        className={`h-4 w-4 ${isPlaying
                                                                            ? "fill-current"
                                                                            : ""
                                                                            }`}
                                                                    />
                                                                </Button>

                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        copyScene(
                                                                            scene.noidung_noi,
                                                                            index
                                                                        )
                                                                    }
                                                                >
                                                                    {copiedIndex ===
                                                                        index ? (
                                                                        <Check className="h-4 w-4 text-emerald-500" />
                                                                    ) : (
                                                                        <Copy className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* CONTENT */}

                                                        <div className="grid gap-5 md:grid-cols-2">
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                        Visual
                                                                    </p>

                                                                    <p className="text-sm leading-relaxed">
                                                                        {
                                                                            scene.hinhanh_video
                                                                        }
                                                                    </p>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <Card>
                                                                        <CardContent className="p-3">
                                                                            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                                                Góc máy
                                                                            </p>

                                                                            <p className="text-xs font-semibold">
                                                                                {scene.goc_may}
                                                                            </p>
                                                                        </CardContent>
                                                                    </Card>

                                                                    <Card>
                                                                        <CardContent className="p-3">
                                                                            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                                                Camera
                                                                            </p>

                                                                            <p className="text-xs font-semibold">
                                                                                {
                                                                                    scene.chuyen_dong_camera
                                                                                }
                                                                            </p>
                                                                        </CardContent>
                                                                    </Card>
                                                                </div>
                                                            </div>

                                                            {/* VOICE */}

                                                            <Card className="bg-muted/30">
                                                                <CardContent className="space-y-4 p-4">
                                                                    <div>
                                                                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                            Voiceover
                                                                        </p>

                                                                        <p className="text-sm font-bold italic leading-relaxed">
                                                                            "
                                                                            {
                                                                                scene.noidung_noi
                                                                            }
                                                                            "
                                                                        </p>
                                                                    </div>

                                                                    <div>
                                                                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                            Overlay Text
                                                                        </p>

                                                                        <div className="whitespace-pre-line rounded-xl border bg-background p-3 text-sm font-bold text-emerald-500">
                                                                            {
                                                                                scene.text_man_hinh
                                                                            }
                                                                        </div>
                                                                    </div>

                                                                    <Separator />

                                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                                        <div>
                                                                            <p className="mb-1 text-muted-foreground">
                                                                                Âm thanh
                                                                            </p>

                                                                            <p>
                                                                                {scene.amthanh}
                                                                            </p>
                                                                        </div>

                                                                        <div>
                                                                            <p className="mb-1 text-muted-foreground">
                                                                                Hiệu ứng
                                                                            </p>

                                                                            <p className="font-medium text-primary">
                                                                                {
                                                                                    scene.hieu_ung_goi_y
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        }
                                    )}
                                </div>
                            </div>
                        ) : (
                            <Card className="flex min-h-150 items-center justify-center rounded-3xl">
                                <CardContent className="space-y-5 text-center">
                                    <Tv className="mx-auto h-16 w-16 text-muted-foreground" />

                                    <div>
                                        <h3 className="text-xl font-bold">
                                            Chưa có dữ liệu
                                        </h3>

                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Nhập URL để AI tạo kịch bản
                                            video bất động sản.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={() => {
                                            setUrl(
                                                "https://batdongsan.com.vn/demo"
                                            )

                                            showFallbackData()
                                        }}
                                    >
                                        Chạy Demo
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </main>
            </div>
        </TooltipProvider>
    )
}

export default CreateCript