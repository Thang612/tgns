'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner, CloudArrowUp, Image as ImageIcon, DownloadSimple, ArrowCounterClockwise } from '@phosphor-icons/react'

const CreateAvatar = () => {
    const [prompt, setPrompt] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')
    const [generatedImage, setGeneratedImage] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleGenerateImage = async () => {
        if (!imageFile || !prompt.trim()) {
            setError('Vui lòng chọn hình ảnh và nhập mô tả.')
            return
        }

        setLoading(true)
        setError('')
        setGeneratedImage('')

        try {
            const formData = new FormData()
            formData.append('image', imageFile)
            formData.append('prompt', prompt)

            const response = await fetch(
                'https://n8n-test.thegioinhasang.com/webhook/avatar',
                {
                    method: 'POST',
                    body: formData,
                }
            )

            if (!response.ok) {
                throw new Error('Không thể kết nối đến máy chủ tạo ảnh')
            }

            const data = await response.json()

            if (data.image_url) {
                setGeneratedImage(data.image_url)
            } else if (data.url) {
                setGeneratedImage(data.url)
            } else {
                setError('Không tìm thấy đường dẫn ảnh trong phản hồi từ API')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi ngoài ý muốn')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = () => {
        if (!generatedImage) return
        const a = document.createElement('a')
        a.href = generatedImage
        a.download = `avatar-${Date.now()}.png`
        a.click()
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-5xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
                        Tạo Avatar AI
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                        Biến đổi hình ảnh cá nhân thành các tác phẩm nghệ thuật độc đáo thông qua AI chỉ trong vài giây.
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                    {/* Input Section */}
                    <Card className="bg-slate-900 border-slate-800 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-slate-100">Cấu hình Input</CardTitle>
                            <CardDescription className="text-slate-400">Tải lên chân dung gốc và nhập prompt mong muốn.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Image Upload Area */}
                            <div className="space-y-2">
                                <Label htmlFor="image-input" className="text-slate-300 text-sm font-medium">
                                    Hình ảnh gốc
                                </Label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        id="image-input"
                                        disabled={loading}
                                    />
                                    <label
                                        htmlFor="image-input"
                                        className={`flex flex-col items-center justify-center w-full min-h-[180px] px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 
                                            ${imagePreview
                                                ? 'border-slate-700 bg-slate-950/50 hover:bg-slate-950 hover:border-slate-600'
                                                : 'border-slate-800 bg-slate-900 hover:bg-slate-950/40 hover:border-slate-700'
                                            } group`}
                                    >
                                        {imagePreview ? (
                                            <div className="text-center space-y-3">
                                                <div className="relative mx-auto w-24 h-24 rounded-full overflow-hidden border border-slate-700 shadow-md group-hover:scale-105 transition-transform">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 group-hover:text-slate-200">
                                                    <ArrowCounterClockwise size={14} />
                                                    <span>Thay đổi hình ảnh khác</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-3">
                                                <div className="p-3 bg-slate-950 rounded-lg inline-block text-slate-400 group-hover:text-blue-400 transition-colors">
                                                    <CloudArrowUp size={24} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-slate-300">Nhấp để chọn tệp</p>
                                                    <p className="text-xs text-slate-500">Hỗ trợ các định dạng PNG, JPG hoặc WEBP</p>
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Prompt Input */}
                            <div className="space-y-2">
                                <Label htmlFor="prompt" className="text-slate-300 text-sm font-medium">
                                    Ý tưởng thiết kế (Prompt)
                                </Label>
                                <Input
                                    id="prompt"
                                    type="text"
                                    placeholder="Ví dụ: Phong cách cyberpunk, phi hành gia vũ trụ..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="h-11 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-slate-700 focus-visible:ring-offset-0"
                                    disabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !loading) {
                                            handleGenerateImage()
                                        }
                                    }}
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-medium animate-in fade-in-50 duration-200">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                onClick={handleGenerateImage}
                                disabled={loading}
                                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition shadow-lg shadow-blue-600/10 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner className="w-4 h-4 animate-spin" weight="bold" />
                                        <span>Đang xử lý hình ảnh...</span>
                                    </div>
                                ) : (
                                    'Khởi tạo Avatar'
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Result Section */}
                    <Card className="bg-slate-900 border-slate-800 shadow-xl min-h-[385px] flex flex-col justify-between overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-slate-100">Tác phẩm của bạn</CardTitle>
                            <CardDescription className="text-slate-400">Kết quả được render từ các mô hình AI tiên tiến nhất.</CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col justify-center items-center p-6 pt-0">
                            {loading ? (
                                <div className="w-full space-y-4 animate-pulse">
                                    <Skeleton className="w-full aspect-square max-w-[260px] rounded-2xl bg-slate-950 mx-auto" />
                                    <div className="space-y-2 max-w-[260px] mx-auto w-full">
                                        <Skeleton className="h-4 w-full bg-slate-950" />
                                        <Skeleton className="h-3 w-2/3 bg-slate-950" />
                                    </div>
                                </div>
                            ) : generatedImage ? (
                                <div className="w-full max-w-[280px] mx-auto space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group">
                                        <img
                                            src={generatedImage}
                                            alt="Generated Avatar"
                                            className="w-full aspect-square object-cover transition duration-300"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleDownload}
                                        className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center justify-center gap-2 rounded-lg transition"
                                    >
                                        <DownloadSimple size={16} weight="bold" />
                                        <span>Lưu về máy</span>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-3">
                                    <div className="p-4 bg-slate-950 rounded-full inline-block text-slate-600">
                                        <ImageIcon size={32} />
                                    </div>
                                    <p className="text-sm text-slate-500 max-w-[220px] mx-auto">
                                        Chưa có hình ảnh nào được tạo. Hãy hoàn thiện config bên trái.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}

export default CreateAvatar