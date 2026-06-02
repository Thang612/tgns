'use client'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import axios from "axios"

const CreateImageHouse = () => {
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)

    const handleCreateImage = async () => {
        if (!url) return

        setLoading(true)

        try {
            const response = await axios.post(
                "https://n8n-test.thegioinhasang.com/webhook/56d4bb69-10e4-4c4a-bc51-4ee7ac1bafec",
                {
                    url,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            )

            console.log("Webhook response:", response.data)

            // Tuỳ cấu trúc dữ liệu webhook trả về
            const imageBase64 = response.data.data

            setGeneratedImageUrl(imageBase64)
        } catch (error: any) {
            console.error(
                "Webhook error:",
                error?.response?.data || error
            )
        } finally {
            setLoading(false)
        }
    }
    const handleDownload = () => {
        if (!generatedImageUrl) return

        // Tạo một thẻ <a> ẩn trong bộ nhớ
        const link = document.createElement("a")

        // Gán dữ liệu Base64 đầy đủ kèm tiền tố định dạng PNG
        link.href = `data:image/png;base64,${generatedImageUrl}`

        // Đặt tên mặc định cho file khi tải về máy (sử dụng timestamp để tránh trùng tên)
        link.download = `banner-nha-sang-${Date.now()}.png`

        // Thêm vào DOM, kích hoạt click tự động và xóa đi ngay lập tức
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="p-4">

            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Nhập URL bài viết..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />

                <Button
                    onClick={handleCreateImage}
                    disabled={loading}
                >
                    {loading ? "Đang xử lý..." : "Tạo dữ liệu"}
                </Button>


            </div>
            <div>
                {
                    generatedImageUrl && (
                        <div className="mt-4">
                            <h2 className="text-lg font-medium mb-2">Ảnh đã tạo:</h2>
                            <div className="relative group">
                                <img
                                    src={`data:image/png;base64,${generatedImageUrl}`}
                                    alt="Generated Image"
                                    className="w-full h-auto rounded"
                                />
                                <Button
                                    onClick={handleDownload}
                                    variant="secondary"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white p-2 rounded-md"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5 text-gray-700"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                        />
                                    </svg>
                                    {/* Bạn có thể thêm text Tải xuống vào đây nếu muốn */}
                                </Button>
                            </div>
                        </div>
                    )
                }
            </div>

        </div>
    )
}

export default CreateImageHouse