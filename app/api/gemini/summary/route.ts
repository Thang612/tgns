import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { docTitle, fullText } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu cấu hình API Key trên Server" }, { status: 500 });
    }

    const systemPrompt = `Bạn là CHUYÊN GIA PHÂN TÍCH TÀI LIỆU CẤP CAO.
Nhiệm vụ của bạn là đọc toàn bộ văn bản và bóc tách nội dung một cách RẤT SÂU SẮC và CHI TIẾT NHẤT CÓ THỂ. TUYỆT ĐỐI KHÔNG làm sơ xài hay lướt qua các ý chính.

Trả về kết quả bằng ĐÚNG định dạng JSON (chỉ JSON thuần, không có block markdown) bao gồm 2 trường chính:
{
  "htmlDocument": "...", 
  "slides": [
    {
      "title": "...", 
      "htmlContent": "..."
    }
  ]
}

Yêu cầu CỰC KỲ KHẮT KHE:
1. htmlDocument (Bản phân tích chuyên sâu):
- Bài phân tích phải thật DÀI, bao quát hết mọi ngóc ngách của văn bản.
- Trình bày bằng HTML và BẮT BUỘC sử dụng trực tiếp các class của TailwindCSS (thuộc tính \`class="..."\`) để làm cho văn bản cực kỳ sinh động, đẹp mắt như một bài blog cao cấp.
- Gợi ý định dạng Tailwind BẮT BUỘC phải áp dụng:
  + <h1>: \`class="text-3xl font-black text-primary mb-6 pb-4 border-b-2 border-primary/20"\`
  + <h2>: \`class="text-2xl font-bold text-foreground mt-10 mb-4 flex items-center gap-2"\` (có thể thêm icon emoji nếu hợp lý)
  + <h3>: \`class="text-xl font-semibold text-primary/80 mt-6 mb-3"\`
  + <p>: \`class="text-base text-foreground leading-relaxed mb-4"\`
  + Highlight/Lưu ý/Trích dẫn: Bọc trong \`<div class="p-4 my-6 bg-primary/10 border-l-4 border-primary rounded-r-xl shadow-sm text-foreground">\`
  + <ul>/<li>: \`class="list-disc pl-6 space-y-2 mb-6 text-foreground"\`, dùng \`<strong class="text-primary">\` để bôi đậm từ khóa.
  + Bảng (nếu có): \`class="w-full text-left border-collapse rounded-lg overflow-hidden shadow-sm my-6"\`, th \`class="bg-primary/10 text-primary p-3 font-bold"\`, td \`class="p-3 border-b border-border"\`.

2. slides (Trình chiếu):
- Trích xuất toàn bộ tinh hoa của bài viết thành một bộ Slides (khoảng 5-10 slides).
- "title": Tiêu đề cực kỳ ngắn gọn, hấp dẫn.
- "htmlContent": KHÔNG ĐƯỢC viết đoạn văn dài thòng. Bạn BẮT BUỘC phải dùng <ul>, <li> để gạch đầu dòng các ý chính. Các ý phải súc tích, in đậm <strong> các keyword để người thuyết trình dễ đọc.`;

    const payload = {
      contents: [{ parts: [{ text: `Tài liệu: ${docTitle}\nNội dung gốc:\n${fullText}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Lỗi gọi API Tóm tắt từ Gemini: ${response.status}`);
    }

    const resData = await response.json();
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Xử lý loại bỏ markdown block nếu có
    let cleanJsonText = rawText;
    const firstBrace = cleanJsonText.indexOf('{');
    const lastBrace = cleanJsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJsonText = cleanJsonText.substring(firstBrace, lastBrace + 1);
    }
    
    const parsedData = JSON.parse(cleanJsonText);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Summary API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
