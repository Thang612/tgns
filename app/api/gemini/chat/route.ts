import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { history, prompt, systemPrompt } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu cấu hình API Key trên Server" }, { status: 500 });
    }

    const payload: any = {
      contents: history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      })),
      systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    // Thêm tin nhắn hiện tại
    payload.contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Lỗi gọi API Chat từ Gemini: ${response.status}`);
    }

    const resData = await response.json();
    const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      return NextResponse.json({ text });
    }
    throw new Error("Không nhận được câu trả lời từ AI.");
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
