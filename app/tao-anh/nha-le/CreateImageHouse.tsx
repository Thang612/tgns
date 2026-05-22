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
            const formData = new FormData()
            formData.append("url", url)

            // 1. Gọi Webhook của bạn
            const response = await axios.post(
                "https://n8n-test.thegioinhasang.com/webhook/c1f0ad86-b9c1-44c2-8d2b-c36a09036a3f",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            )

            const imageData = response.data?.[0]?.image || []
            const contentData = response.data?.[1] || null

            if (!contentData || imageData.length === 0) {
                console.error("Không tìm thấy dữ liệu ảnh hoặc nội dung từ Webhook")
                setLoading(false)
                return
            }

            // Tạo chuỗi prompt từ dữ liệu mới nhận về (tránh dùng state chưa cập nhật)
            const prompt = `${contentData.tieude} ${contentData.thongtin} ${contentData.noidung} Dựa vào các hình ảnh và nội dung bên trên Lọc những ý chính và tiêu biểu sắp xếp các hình vào một banner tổng hợp nội dung Kèm theo CTA call 09xxxxxxxxx để khách hàng liên hệ.`
            console.log("Prompt for image generation:", prompt)

            // 2. Xử lý ảnh đầu tiên từ webhook sang dạng File/Blob để gửi cho OpenAI
            // Giả định: imageData[0].data chứa chuỗi Base64 của ảnh hoặc URL ảnh.
            // Dưới đây là cách xử lý nếu đó là một chuỗi Base64 sạch (không kèm data:image/png;base64,):
            const base64Response = await fetch(`data:image/png;base64,${imageData[0].image}`)
            const imageBlob = await base64Response.blob()

            // 3. Khởi tạo FormData bắt buộc cho OpenAI Edits
            const openAiFormData = new FormData()
            openAiFormData.append("model", "gpt-image-2") // Phải là dall-e-2
            openAiFormData.append("image", imageBlob, "input_image.png") // Gửi file ảnh vật lý kèm tên file .png
            openAiFormData.append("prompt", prompt)
            openAiFormData.append("n", "1")
            openAiFormData.append("size", "1024x1024")

            // 4. Gọi OpenAI API bằng multipart/form-data
            const imageResponse = await axios.post(
                'https://api.openai.com/v1/images/edits',
                openAiFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
                        'Content-Type': 'multipart/form-data', // Đổi từ application/json thành multipart/form-data
                    },
                }
            )

            const generatedImageUrl = imageResponse.data?.data?.[0]?.b64_json || null
            setGeneratedImageUrl(generatedImageUrl)

        } catch (error: any) {
            // Log chi tiết lỗi từ OpenAI để dễ debug nếu còn sót lỗi định dạng ảnh
            if (error.response) {
                console.error("OpenAI Error Details:", error.response.data)
            } else {
                console.error("Error creating image:", error)
            }
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