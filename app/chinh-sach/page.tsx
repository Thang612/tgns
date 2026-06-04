"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Settings,
  ArrowLeft,
  ArrowRight,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  HelpCircle,
  Copy,
  FileText,
  FileCode
} from "lucide-react";

// Structure of policies returned by LLM
interface Highlight {
  icon: string;
  title: string;
  value: string;
}

interface TimelineStep {
  milestone: string;
  pct: string;
  desc: string;
}

interface CalcInput {
  name: string;
  label: string;
  type: "number" | "select" | "date";
  defaultValue: string | number;
  help?: string;
  options?: string[];
}

interface PolicyData {
  title: string;
  summary: string;
  highlights: Highlight[];
  timeline: TimelineStep[];
  calculatorInputs: CalcInput[];
}

// Structure of calculation results returned by LLM
interface CalculationResult {
  totalPayable: string;
  totalSavings: string;
  savingsPercent: string;
  benefitsApplied: string[];
  schedule: Array<{
    term: string;
    timing: string;
    percent: string;
    amount: string;
    desc: string;
  }>;
}

export default function ChinhSachBanHangPage() {
  // SSR Hydration safety
  const [mounted, setMounted] = useState(false);

  // App States
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeTab, setActiveTab] = useState<"step1" | "step2">("step1");
  const [apiKey, setApiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Core Processing States
  const [pdfText, setPdfText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [currentPolicy, setCurrentPolicy] = useState<PolicyData | null>(null);

  // Calculator Form State
  const [calcInputs, setCalcInputs] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);

  // File Inputs Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // 1. SSR Check & Initialization
  useEffect(() => {
    setMounted(true);

    // Load Theme
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "dark";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");

    // Load API Keys and settings
    const savedGeminiKey = localStorage.getItem("gemini_api_key") || "";
    const savedOpenaiKey = localStorage.getItem("openai_api_key") || "";
    const savedProvider = localStorage.getItem("ai_provider") as "openai" | "gemini" || "openai";
    const savedModel = localStorage.getItem("ai_model") || "";

    setApiKey(savedGeminiKey);
    setOpenaiKey(savedOpenaiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || "");
    setProvider(savedProvider);
    setSelectedModel(savedModel || (savedProvider === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash"));

    // Dynamically load PDF.js client-side
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.async = true;
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script tag if needed
      try {
        document.body.removeChild(script);
      } catch (e) { }
    };
  }, []);

  // 2. Settings saving
  const handleSaveSettings = (newProvider: "openai" | "gemini", customGeminiKey: string, customOpenaiKey: string, model: string) => {
    localStorage.setItem("ai_provider", newProvider);
    localStorage.setItem("gemini_api_key", customGeminiKey);
    localStorage.setItem("openai_api_key", customOpenaiKey);
    localStorage.setItem("ai_model", model);

    setProvider(newProvider);
    setApiKey(customGeminiKey);
    setOpenaiKey(customOpenaiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || "");
    setSelectedModel(model);
    setShowSettings(false);
  };

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  // Copy, Word and HTML export logic
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    if (!currentPolicy) return;
    navigator.clipboard.writeText(currentPolicy.summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadWord = () => {
    if (!currentPolicy) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${currentPolicy.title}</title>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; }
          h2 { color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          h3 { color: #2563eb; margin-top: 20px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 5px; }
          strong { color: #111827; }
        </style>
      </head>
      <body>
        <h2>${currentPolicy.title}</h2>
        <br/>
        <div>
          ${currentPolicy.summary
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/^\s*[\*\-]\s+(.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
        .replace(/<\/ul>\s*<ul>/gim, '')
        .split('\n').join('<br/>')
      }
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tom-Tat-Chinh-Sach-${currentPolicy.title.replace(/\s+/g, "-")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportHTML = () => {
    if (!currentPolicy || !calcResult) return;

    const inputsRows = Object.entries(calcInputs).map(([key, val]) => {
      const fieldObj = currentPolicy.calculatorInputs.find(i => i.name === key);
      const label = fieldObj ? fieldObj.label : key;
      let displayVal = val;
      if (fieldObj?.type === 'select') {
        const option = fieldObj.options?.find(o => o.startsWith(val + ':'));
        if (option) {
          displayVal = option.split(':').slice(1).join(':');
        }
      } else if (fieldObj?.type === 'number') {
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 100000) {
          displayVal = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parsed).replace(/\s/g, '');
        }
      }
      return `<tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; font-weight:bold; width:40%; color:#475569;">${label}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0; color:#0f172a;">${displayVal}</td></tr>`;
    }).join('');

    const scheduleRows = calcResult.schedule.map(row => `
      <tr style="background:#ffffff;">
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#0f172a;">${row.term}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; color:#475569;">${row.timing}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#2563eb; text-align:center;">${row.percent}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-weight:extrabold; color:#0f172a; text-align:right;">${row.amount}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; color:#64748b; font-size:13px;">${row.desc}</td>
      </tr>
    `).join('');

    const benefitsList = calcResult.benefitsApplied.map(b => `
      <li style="margin-bottom:6px; color:#475569; font-size:14px; list-style-type:none; padding-left:20px; position:relative;">
        <span style="color:#10b981; position:absolute; left:0; font-weight:bold;">✓</span>${b}
      </li>
    `).join('');

    const htmlReport = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bảng Tính Minh Họa - ${currentPolicy.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 30px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0 0; opacity: 0.85; font-size: 14px; }
          .content { padding: 24px; }
          .section-title { font-size: 16px; font-weight: 700; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 0; margin-bottom: 16px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .card { padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .card-primary { background-color: rgba(37,99,235,0.04); border-color: rgba(37,99,235,0.15); }
          .card-success { background-color: rgba(16,185,129,0.04); border-color: rgba(16,185,129,0.15); }
          .label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px; }
          .value { font-size: 20px; font-weight: 800; }
          .val-primary { color: #2563eb; }
          .val-success { color: #10b981; }
          .table-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 10px; }
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 600; padding: 12px; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>BÁO GIÁ & DÒNG TIỀN CHI TIẾT</h1>
            <p>${currentPolicy.title}</p>
          </div>
          
          <div class="content">
            <h3 class="section-title">1. Thông số tính toán</h3>
            <table style="width: 100%; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius:8px; border-collapse:collapse;">
              <tbody>
                ${inputsRows}
              </tbody>
            </table>

            <h3 class="section-title">2. Kết quả tổng hợp</h3>
            <div class="grid">
              <div class="card card-primary">
                <span class="label">Tổng thực tế cần thanh toán</span>
                <span class="value val-primary">${calcResult.totalPayable}</span>
              </div>
              <div class="card card-success">
                <span class="label">Tổng ưu đãi & Tiết kiệm</span>
                <span class="value val-success">${calcResult.totalSavings}</span>
                <span style="font-size: 11px; color:#10b981; font-weight:bold; display:block; margin-top:4px;">${calcResult.savingsPercent}</span>
              </div>
            </div>

            <h3 class="section-title">3. Quyền lợi được áp dụng</h3>
            <ul style="padding:0; margin: 0 0 24px 0;">
              ${benefitsList}
            </ul>

            <h3 class="section-title">4. Tiến độ thanh toán chi tiết</h3>
            <div class="table-container">
              <table style="border-collapse:collapse; width:100%;">
                <thead>
                  <tr>
                    <th style="padding:12px;">Đợt</th>
                    <th style="padding:12px;">Thời điểm đóng</th>
                    <th style="padding:12px; text-align:center;">Tỷ lệ</th>
                    <th style="padding:12px; text-align:right;">Số tiền</th>
                    <th style="padding:12px;">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${scheduleRows}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="footer">
            <p>Báo cáo này được tự động xuất ra bởi ứng dụng vào lúc ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}.</p>
          </div>
         </div>
       </body>
       </html>
     `;

    const blob = new Blob([htmlReport], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bao-Gia-${currentPolicy.title.replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 3. Client-side PDF processing
  const handlePdfFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Vui lòng chỉ tải lên tệp tin định dạng PDF.");
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setProcessingStage("Đang đọc nội dung file PDF...");

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const pdfjs = (window as any).pdfjsLib;

        if (!pdfjs) {
          throw new Error("Thư viện PDF.js chưa được tải đầy đủ. Vui lòng thử lại sau vài giây.");
        }

        const pdf = await pdfjs.getDocument(typedarray).promise;
        const maxPages = pdf.numPages;
        const pagePromises = [];

        for (let i = 1; i <= maxPages; i++) {
          const pagePromise = pdf.getPage(i).then((page: any) => {
            return page.getTextContent().then((textContent: any) => {
              return textContent.items.map((item: any) => item.str).join(" ");
            });
          });
          pagePromises.push(pagePromise);
        }

        const pagesTexts = await Promise.all(pagePromises);
        const extractedText = pagesTexts.join("\n\n");
        setPdfText(extractedText);

        if (extractedText.trim().length < 50) {
          throw new Error("Không trích xuất được đủ văn bản. PDF có thể chỉ chứa trang quét hình ảnh.");
        }

        // Trigger AI analysis
        await analyzeSalesPolicy(extractedText);
      } catch (err: any) {
        alert(`Lỗi phân tích PDF: ${err.message}`);
        setIsProcessing(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  // 4. API Calls for Analysis (Step 1)
  const analyzeSalesPolicy = async (text: string) => {
    setProcessingStage("Đang gọi AI phân tích & tóm tắt chính sách bán hàng...");

    const activeApiKey = provider === "openai" ? openaiKey : apiKey;
    if (!activeApiKey) {
      setIsProcessing(false);
      alert(`Vui lòng cấu hình API Key cho ${provider === "openai" ? "OpenAI" : "Gemini"} bằng cách bấm vào biểu tượng bánh răng ở góc trên bên phải.`);
      setShowSettings(true);
      return;
    }

    const prompt = `
Bạn là một chuyên gia cao cấp về bán hàng, chính sách thương mại và tài chính.
Hãy phân tích tài liệu chính sách bán hàng sau đây và trả về một chuỗi JSON hợp lệ cấu trúc thông tin để dựng giao diện.

Nội dung tài liệu bán hàng:
"""
${text.substring(0, 25000)} 
"""

Yêu cầu xuất ra định dạng JSON nguyên bản, không nằm trong khối markdown (không có dấu \`\`\`json ở đầu và cuối), chứa các trường dữ liệu sau:
{
  "title": "Tên chương trình / chính sách bán hàng ngắn gọn",
  "summary": "Tóm tắt chính sách chi tiết bằng tiếng Việt, định dạng markdown tối giản (sử dụng dấu * cho danh sách, ### cho đề mục), phân thành 3 mục rõ ràng: 🌟 Điểm nổi bật & Khuyến mãi; 🤝 Chính sách Hỗ trợ Tài chính (nếu có); 📅 Lịch thanh toán chi tiết & điều kiện.",
  "highlights": [
     { "icon": "emoji đại diện (ví dụ: 🎁, 💸, 🛡️, 📈)", "title": "Nhãn cực ngắn (dưới 4 từ)", "value": "Giá trị ưu đãi nổi bật (ví dụ: Giảm 5%, Vay 80%, Lãi 0%)" }
  ],
  "timeline": [
     { "milestone": "Tên mốc thanh toán ngắn", "pct": "Tỷ lệ phần trăm hoặc số tiền (ví dụ: 10% hoặc 50tr)", "desc": "Mô tả điều kiện mốc thanh toán" }
  ],
  "calculatorInputs": [
     {
       "name": "tên biến viết liền không dấu, tiếng Anh (ví dụ: basePrice, customerGroup, paymentMethod)",
       "label": "Nhãn mô tả trường bằng tiếng Việt",
       "type": "loại trường: 'number' hoặc 'select' hoặc 'date'",
       "defaultValue": "giá trị mặc định thích hợp",
       "help": "Dòng hướng dẫn nhỏ bên dưới trường nhập liệu (nếu cần)",
       "options": [
         "Mảng chuỗi nếu là select. Định dạng mỗi chuỗi là: 'value:Mô tả trực quan bằng tiếng Việt' (ví dụ: 'standard:Thanh toán tiến độ chuẩn', 'early:Thanh toán nhanh nhận giảm giá')"
       ]
     }
  ]
}

Chú ý: Mảng highlights tối đa có 4 phần tử. Mảng timeline đại diện cho lịch thanh toán các đợt lớn. Mảng calculatorInputs là danh sách các trường đầu vào cần thiết nhất để người dùng điền thông tin chạy thử ví dụ tính toán minh họa (Bước 2) dựa trên chính sách này (luôn cần có giá trị hoặc quy mô mua hàng, phương thức thanh toán, đối tượng/vùng...).
`;

    try {
      let result: PolicyData;

      if (provider === "openai") {
        result = await callOpenAI(prompt, activeApiKey, selectedModel);
      } else {
        result = await callGemini(prompt, activeApiKey, selectedModel);
      }

      setCurrentPolicy(result);

      // Seed default input values for Step 2
      const defaults: Record<string, string> = {};
      result.calculatorInputs.forEach(input => {
        defaults[input.name] = String(input.defaultValue);
      });
      setCalcInputs(defaults);
      setCalcResult(null); // Reset prev calculation
      setActiveTab("step1");

    } catch (err: any) {
      alert(`Lỗi AI phân tích: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Dynamic Calculations (Step 2)
  const calculateResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPolicy) return;

    setIsCalculating(true);
    const activeApiKey = provider === "openai" ? openaiKey : apiKey;

    const prompt = `
Bạn là một công cụ tính toán tài chính chuyên nghiệp. Hãy tính toán ví dụ minh họa cụ thể dựa trên chính sách bán hàng và các tham số đầu vào của người dùng.

Nội dung chính sách bán hàng:
"""
${pdfText.substring(0, 25000)}
"""

Đầu vào giao dịch cụ thể của người dùng:
${JSON.stringify(calcInputs, null, 2)}

Hãy phân tích và tự tính toán chính xác dòng tiền, lịch thanh toán chi tiết. Kết quả trả về phải là một chuỗi JSON hợp lệ cấu trúc thông tin (không nằm trong khối markdown \`\`\`json):
{
  "totalPayable": "Tổng số tiền khách hàng thực tế cần phải trả (bao gồm các chi phí phụ, thuế nếu có, định dạng VNĐ ví dụ: 3.250.000.000 VNĐ)",
  "totalSavings": "Tổng số tiền tiết kiệm được từ chiết khấu, voucher, hỗ trợ trước bạ, trị giá quà tặng (định dạng VNĐ)",
  "savingsPercent": "Phần trăm tiết kiệm so với tổng giá trị ban đầu (ví dụ: Giảm 7.5% hoặc Tiết kiệm ~12%)",
  "benefitsApplied": [
    "Mô tả chi tiết quyền lợi 1 được áp dụng (ví dụ: Áp dụng chiết khấu thanh toán nhanh 8%)",
    "Mô tả chi tiết quyền lợi 2..."
  ],
  "schedule": [
    {
      "term": "Đợt/mốc (ví dụ: Đặt cọc, Đợt 1, Nhận bàn giao...)",
      "timing": "Thời điểm đóng tiền cụ thể (ví dụ: 15/06/2026 hoặc Ngay khi ký hợp đồng)",
      "percent": "Tỷ lệ đóng hoặc Nhãn (ví dụ: 10% hoặc Phí bảo trì)",
      "amount": "Số tiền cần đóng tương ứng đợt này (định dạng VNĐ ví dụ: 350.000.000 VNĐ)",
      "desc": "Mô tả chi tiết điều kiện hoặc lưu ý đợt này"
    }
  ]
}
`;

    try {
      let result: CalculationResult;

      if (provider === "openai") {
        result = await callOpenAI(prompt, activeApiKey, selectedModel);
      } else {
        result = await callGemini(prompt, activeApiKey, selectedModel);
      }

      setCalcResult(result);
    } catch (err: any) {
      alert(`Lỗi tính toán dòng tiền: ${err.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  // Helper APIs Fetch
  const callOpenAI = async (prompt: string, key: string, model: string) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI Error: Status ${res.status} - ${txt}`);
    }
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  };

  const callGemini = async (prompt: string, key: string, model: string) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Gemini Error: Status ${res.status} - ${txt}`);
    }
    const data = await res.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  };

  // Drag Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePdfFile(e.target.files[0]);
    }
  };

  const resetApp = () => {
    setPdfText("");
    setFileName("");
    setCurrentPolicy(null);
    setCalcInputs({});
    setCalcResult(null);
    setActiveTab("step1");
  };

  // Render HTML from markdown simplified
  const renderMarkdown = (md: string) => {
    if (!md) return "";
    let html = md;
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-md font-bold mt-4 mb-2 text-foreground flex items-center gap-2">✨ $1</h3>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-foreground">$1</strong>');
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="ml-4 list-disc mb-1 text-sm text-muted-foreground">$1</li>');
    html = html.replace(/(<li class="ml-4 list-disc mb-1 text-sm text-muted-foreground">.*<\/li>)/gim, '<ul class="mb-3">$1</ul>');
    html = html.replace(/<\/ul>\s*<ul class="mb-3">/gim, "");
    html = html.split("\n").join("<br />");
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Đang tải ứng dụng...
      </div>
    );
  }

  // Active Key Check
  const hasConfiguredKey = provider === "openai" ? !!openaiKey : !!apiKey;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden font-sans">
      {/* Background radial effects */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 p-2 border border-border rounded-full hover:bg-muted/80 text-foreground transition-all duration-200"
        title="Cấu hình API Key"
      >
        <Settings className="w-5 h-5" />
      </button>
      <div className="max-w-6xl mx-auto p-4 md:p-6 flex flex-col min-h-screen">
        {/* Main Content */}
        <main className="flex-grow">
          {/* Step Progress Indicators */}
          <div className="flex items-center justify-center max-w-lg mx-auto mb-8 relative">
            <div className="flex flex-col items-center flex-1 cursor-pointer z-10" onClick={() => currentPolicy && setActiveTab("step1")}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all duration-300 ${activeTab === "step1" ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgba(99,102,241,0.4)]" : currentPolicy ? "border-green-500 bg-green-500/10 text-green-500" : "border-border bg-background text-muted-foreground"}`}>
                1
              </div>
              <span className={`text-xs font-semibold mt-2 ${activeTab === "step1" ? "text-foreground" : "text-muted-foreground"}`}>
                Tải lên & Tóm tắt
              </span>
            </div>

            <div className={`absolute top-4 left-[25%] w-[50%] h-[2px] -z-0 transition-all duration-300 ${activeTab === "step2" ? "bg-primary" : "bg-border"}`} />

            <div className="flex flex-col items-center flex-1 cursor-pointer z-10" onClick={() => currentPolicy && setActiveTab("step2")}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all duration-300 ${activeTab === "step2" ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgba(99,102,241,0.4)]" : "border-border bg-background text-muted-foreground"}`}>
                2
              </div>
              <span className={`text-xs font-semibold mt-2 ${activeTab === "step2" ? "text-foreground" : "text-muted-foreground"}`}>
                Ví dụ minh họa
              </span>
            </div>
          </div>

          {/* Setup view (No file uploaded) */}
          {!currentPolicy && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight">Phân tích Chính sách Bán hàng</h1>
                <p className="text-muted-foreground text-sm">Hệ thống AI tự động tóm tắt điều khoản hỗ trợ, lịch thanh toán và thiết lập bảng tính minh họa tức thì.</p>
              </div>

              {/* API Key Warning */}
              {!hasConfiguredKey && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/25 rounded-lg text-yellow-600 dark:text-yellow-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-grow">
                    <span>Bạn chưa thiết lập API Key để phân tích tài liệu. </span>
                    <button onClick={() => setShowSettings(true)} className="underline font-bold hover:text-yellow-700">Cấu hình ngay</button>
                    {process.env.NEXT_PUBLIC_OPENAI_API_KEY && (
                      <span className="block text-xs mt-1 opacity-80">(Hoặc có thể lưu cài đặt mặc định OpenAI để chạy tự động)</span>
                    )}
                  </div>
                </div>
              )}

              {/* File Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 bg-card/40 ${dragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-card/75"}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf"
                  className="hidden"
                />

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{processingStage}</p>
                      <p className="text-xs text-muted-foreground">Vui lòng chờ trong giây lát...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 bg-primary/10 rounded-full text-primary transition-all duration-200">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg">Kéo thả file PDF chính sách bán hàng vào đây</h3>
                      <p className="text-sm text-muted-foreground">hoặc bấm để chọn file từ máy tính</p>
                    </div>
                    <span className="text-xs text-muted-foreground opacity-80">Định dạng hỗ trợ: PDF (tối đa 15MB)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Work Views */}
          {currentPolicy && (
            <div className="space-y-6">
              {/* Reset Control */}
              <div className="flex justify-between items-center bg-card/40 p-4 border border-border rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đang phân tích tài liệu</span>
                  <h2 className="font-bold text-md text-foreground line-clamp-1">{fileName}</h2>
                </div>
                <button
                  onClick={resetApp}
                  className="px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-muted text-foreground transition-all duration-200"
                >
                  Tải lên tệp khác
                </button>
              </div>

              {/* VIEW 1: Summary Output (Step 1) */}
              {activeTab === "step1" && (
                <div className="space-y-6">
                  {/* Grid split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Panel: Markdown Content Summary */}
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col h-[550px]">
                      <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          <h3 className="font-bold text-base">Tóm tắt Chính sách Bán hàng</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyText}
                            className="p-1 px-2 border border-border rounded hover:bg-muted text-xs font-semibold flex items-center gap-1 transition-all duration-200"
                            title="Copy văn bản tóm tắt"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copied ? "Đã copy!" : "Copy"}</span>
                          </button>
                          <button
                            onClick={handleDownloadWord}
                            className="p-1 px-2 border border-border rounded hover:bg-muted text-xs font-semibold flex items-center gap-1 transition-all duration-200"
                            title="Tải tệp Word (.doc)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Tải Word</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex-grow overflow-y-auto pr-2 space-y-3 scrollbar-thin text-muted-foreground">
                        <h2 className="text-lg font-bold text-foreground mb-4">{currentPolicy.title}</h2>
                        {renderMarkdown(currentPolicy.summary)}
                      </div>
                    </div>

                    {/* Right Panel: Blank Infographic Placeholder (As requested) */}
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col h-[550px]">
                      <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                        <Database className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-base">Infographic Tóm tắt Trực quan</h3>
                      </div>

                      <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20 text-center p-6">
                        <div className="text-4xl mb-3 opacity-60">🎨</div>
                        <h5 className="font-bold text-sm mb-1 text-muted-foreground">Khu vực hiển thị Infographic</h5>
                        <p className="text-xs text-muted-foreground/80 max-w-[280px] leading-relaxed">
                          Giao diện đã được thiết lập sẵn. Sẵn sàng để tích hợp với service vẽ sơ đồ tự động của bạn.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Trigger Choice Area */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-md text-center space-y-4 max-w-xl mx-auto">
                    <div className="space-y-1">
                      <h4 className="font-bold text-base">Bước 2: Lựa chọn hành động tiếp theo</h4>
                      <p className="text-xs text-muted-foreground">Chuyển sang chạy thử ví dụ cụ thể hoặc quay lại trang chủ.</p>
                    </div>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={resetApp}
                        className="px-5 py-2.5 border border-border text-sm font-semibold rounded-lg hover:bg-muted text-foreground transition-all duration-200 flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        a/ Nhập lại tài liệu khác
                      </button>
                      <button
                        onClick={() => setActiveTab("step2")}
                        className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 shadow-sm transition-all duration-200 flex items-center gap-2"
                      >
                        b/ Ví dụ minh họa
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: Dynamic Calculator Form & Calculation (Step 2) */}
              {activeTab === "step2" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Bước 2: Ví dụ minh họa & Tính toán dòng tiền</h3>
                    <button
                      onClick={() => setActiveTab("step1")}
                      className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-muted text-foreground flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Quay lại tóm tắt
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left: Input Form Panel */}
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
                      <h4 className="font-bold text-sm border-b border-border pb-2 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-primary" />
                        Tham số Giao dịch
                      </h4>

                      <form onSubmit={calculateResult} className="space-y-4">
                        {currentPolicy.calculatorInputs.map((input) => (
                          <div key={input.name} className="space-y-2">
                            <label className="text-xs font-bold text-foreground block">
                              {input.label}
                            </label>

                            {input.type === "select" ? (
                              <select
                                value={calcInputs[input.name] || ""}
                                onChange={(e) => setCalcInputs({ ...calcInputs, [input.name]: e.target.value })}
                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                              >
                                {input.options?.map((optStr) => {
                                  const [val, ...descParts] = optStr.split(":");
                                  const desc = descParts.join(":");
                                  return (
                                    <option key={val} value={val}>
                                      {desc}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <input
                                type={input.type === "number" ? "number" : "date"}
                                value={calcInputs[input.name] || ""}
                                onChange={(e) => setCalcInputs({ ...calcInputs, [input.name]: e.target.value })}
                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                              />
                            )}

                            {input.help && (
                              <span className="text-[10px] text-muted-foreground block leading-normal">{input.help}</span>
                            )}
                          </div>
                        ))}

                        <button
                          type="submit"
                          disabled={isCalculating}
                          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/95 shadow-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                          {isCalculating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Đang tính toán dòng tiền...
                            </>
                          ) : (
                            <>
                              <Calculator className="w-4 h-4" />
                              Tính toán số liệu chi tiết
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Right: Calculations Outputs */}
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-3 flex flex-col min-h-[400px]">
                      <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <h4 className="font-bold text-sm">Kết quả dòng tiền chi tiết</h4>
                        </div>
                        {calcResult && (
                          <button
                            onClick={handleExportHTML}
                            className="p-1 px-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded flex items-center gap-1 transition-all duration-200"
                            title="Xuất bảng tính dạng HTML"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>Xuất HTML</span>
                          </button>
                        )}
                      </div>

                      {!calcResult ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                          <Calculator className="w-12 h-12 mb-3 opacity-40 text-primary" />
                          <h5 className="font-bold text-sm text-foreground">Chưa có kết quả tính toán</h5>
                          <p className="text-xs text-muted-foreground/80 max-w-[280px] mt-1 leading-normal">
                            Điền các thông số giao dịch bên trái và bấm nút "Tính toán" để AI xuất dòng tiền chi tiết.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-5 flex-grow">
                          {/* Financial Metric summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase block">Khách hàng cần trả</span>
                              <span className="text-xl font-extrabold text-primary block mt-1">{calcResult.totalPayable}</span>
                            </div>
                            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase block">Tổng tiết kiệm / ưu đãi</span>
                              <span className="text-xl font-extrabold text-green-500 block mt-1">{calcResult.totalSavings}</span>
                              <span className="text-[10px] font-bold text-green-500/80 block mt-0.5">{calcResult.savingsPercent}</span>
                            </div>
                          </div>

                          {/* Applied conditions list */}
                          <div className="p-4 rounded-lg border border-border bg-muted/10 space-y-2">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quyền lợi đã áp dụng:</h5>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {calcResult.benefitsApplied.map((b, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-500 font-bold">✓</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Schedule breakdown table */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Chi tiết các đợt thanh toán:
                            </h5>
                            <div className="border border-border rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                      <th className="p-3 font-semibold text-foreground">Đợt</th>
                                      <th className="p-3 font-semibold text-foreground">Thời điểm</th>
                                      <th className="p-3 font-semibold text-foreground">% Đóng</th>
                                      <th className="p-3 font-semibold text-foreground">Số tiền</th>
                                      <th className="p-3 font-semibold text-foreground">Nội dung</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {calcResult.schedule.map((row, idx) => (
                                      <tr key={idx} className="hover:bg-muted/10">
                                        <td className="p-3 font-medium">{row.term}</td>
                                        <td className="p-3 text-muted-foreground">{row.timing}</td>
                                        <td className="p-3 font-bold text-primary">{row.percent}</td>
                                        <td className="p-3 font-extrabold text-foreground">{row.amount}</td>
                                        <td className="p-3 text-muted-foreground max-w-[150px] truncate" title={row.desc}>
                                          {row.desc}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/10">
              <h3 className="font-bold text-md">Cấu hình kết nối AI Engine</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground text-xl font-semibold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Provider choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  AI Provider lựa chọn
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setProvider("openai");
                      setSelectedModel("gpt-4o-mini");
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all duration-200 ${provider === "openai" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted text-muted-foreground"}`}
                  >
                    OpenAI Engine
                  </button>
                  <button
                    onClick={() => {
                      setProvider("gemini");
                      setSelectedModel("gemini-2.5-flash");
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all duration-200 ${provider === "gemini" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted text-muted-foreground"}`}
                  >
                    Gemini AI
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {provider === "openai" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-foreground flex justify-between">
                      <span>OpenAI API Key</span>
                      {process.env.NEXT_PUBLIC_OPENAI_API_KEY && !openaiKey && (
                        <span className="text-[10px] text-green-500 font-normal">(Đã nhận key tự động từ hệ thống .env)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="Nhập khóa OpenAI sk-..."
                        className="w-full bg-background border border-input rounded-md pl-3 pr-12 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">Mẫu Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                    >
                      <option value="gpt-4o-mini">gpt-4o-mini (Nhanh & Tối ưu cước phí)</option>
                      <option value="gpt-4o">gpt-4o (Thuyết phục & Tính toán tối ưu)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-foreground block">Gemini API Key</label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Nhập khóa Gemini AIzaSy..."
                        className="w-full bg-background border border-input rounded-md pl-3 pr-12 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">Mẫu Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Phản hồi tốc độ)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Tư duy chuyên sâu)</option>
                    </select>
                  </div>
                  <span className="block text-[10px] text-muted-foreground">
                    Cách lấy khóa: Nhận miễn phí tại cổng <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>.
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-border text-xs font-semibold rounded-lg hover:bg-muted text-foreground transition-all duration-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleSaveSettings(provider, apiKey, openaiKey, selectedModel)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-sm transition-all duration-200"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
