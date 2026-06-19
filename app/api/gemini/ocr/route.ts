import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { base64Content, mimeType } = await request.json();
    // Fallback sang NEXT_PUBLIC nếu người dùng chưa kịp đổi tên env
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu cấu hình API Key trên Server" }, { status: 500 });
    }

    const payload = {
      contents: [{
        parts: [
          { text: "Trích xuất toàn bộ văn bản, thông tin, bảng biểu có trong bức ảnh này thành văn bản thuần túy. Trả về trực tiếp văn bản, không cần giải thích hay thêm bình luận gì cả." },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Content
            }
          }
        ]
      }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Lỗi nhận diện ảnh (OCR) từ Gemini: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      return NextResponse.json({ text });
    }
    throw new Error("Không tìm thấy văn bản nào trong ảnh.");
  } catch (error: any) {
    console.error("OCR API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
