"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Send, FileText, Sparkles, Trash2, Upload,
  HelpCircle, ChevronRight, CheckCircle, AlertCircle, Loader2,
  BookOpen, Database, Paperclip, X, FileCheck, ArrowRight, CornerDownRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import SummaryModal from './components/SummaryModal';

const appId = 'gemini-rag-assistant';

export default function App() {
  // Trạng thái giao diện
  const [showDocSidebar, setShowDocSidebar] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfjsLibState, setPdfjsLibState] = useState<any>(null);

  // Trạng thái tài liệu & Vector Database
  const [documents, setDocuments] = useState<any[]>([]);
  const [vectorStore, setVectorStore] = useState<any[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [rawTextTitle, setRawTextTitle] = useState('');
  const [rawTextContent, setRawTextContent] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Trạng thái Modal Tóm tắt
  const [summaryModalState, setSummaryModalState] = useState({
    isOpen: false,
    isLoading: false,
    data: null as any,
    docTitle: '',
    docId: ''
  });

  // Trạng thái Hội thoại
  const [sessions, setSessions] = useState([
    { id: 'session-1', title: 'Hỏi đáp tài liệu #1', messages: [] as any[] }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState('session-1');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isLoading]);

  useEffect(() => {
    // Tải pdfjs-dist cục bộ thay vì CDN để tránh lỗi mạng và tăng tốc
    import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      setPdfjsLibState(pdfjs);
    });
  }, []);

  const extractTextFromImage = async (base64Data: string, mimeType: string) => {
    try {
      console.log("Bắt đầu gửi ảnh lên Backend API (OCR)...");
      const base64Content = base64Data.split(',')[1];
      const response = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Content, mimeType })
      });

      if (!response.ok) {
        throw new Error(`Lỗi nhận diện ảnh (OCR) từ Server: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.text) {
        console.log("Đã trích xuất thành công văn bản từ ảnh.");
        return resData.text;
      }
      throw new Error(resData.error || "Không tìm thấy văn bản nào trong ảnh.");
    } catch (err) {
      console.error("Lỗi extract text từ ảnh:", err);
      return "";
    }
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer) => {
    if (!pdfjsLibState) throw new Error("Chưa tải xong thư viện PDF");
    console.log("Bắt đầu khởi động PDF.js để phân tích tài liệu...");

    const typedArray = new Uint8Array(arrayBuffer);

    // Sử dụng data: typedArray để khắc phục lỗi getDocument
    const loadingTask = pdfjsLibState.getDocument({
      data: typedArray,
      disableFontFace: false,
      stopAtErrors: false
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    console.log(`Đã nạp file PDF thành công. Phát hiện: ${numPages} trang. Tiến hành xử lý song song...`);

    const pagePromises = Array.from({ length: numPages }, (_, index) => {
      const pageNumber = index + 1;
      return pdf.getPage(pageNumber).then(async (page: any) => {
        try {
          const viewport = page.getViewport({ scale: 1.0 });
          const pageHeight = viewport.height;
          const textContent = await page.getTextContent();

          let pageText = "";
          let lastItem: any = null;

          // Margin loại bỏ Header/Footer (khoảng 8% chiều cao trang ở 2 đầu)
          const margin = pageHeight * 0.08;

          for (const item of textContent.items) {
            const y = item.transform[5];

            // Bỏ qua các text nằm quá sát lề trên (Header) hoặc lề dưới (Footer/Số trang)
            if (y < margin || y > pageHeight - margin) {
              continue;
            }

            if (lastItem) {
              const dy = item.transform[5] - lastItem.transform[5];
              // Nếu lệch trục Y quá 5 unit thì coi như xuống dòng
              if (Math.abs(dy) > 5) {
                pageText += "\n";
              } else {
                // Nếu cùng dòng, tính khoảng cách trục X để xem có phải thêm dấu cách không
                const width = lastItem.width || (lastItem.str.length * 5);
                const dx = item.transform[4] - (lastItem.transform[4] + width);
                if (dx > 2) {
                  pageText += " ";
                }
              }
            }
            pageText += item.str;
            lastItem = item;
          }

          // Dọn dẹp thêm bằng Regex: Loại bỏ các dòng chỉ chứa mỗi số hoặc "Trang X" còn sót lại
          const cleanText = pageText.split('\n')
            .filter(line => {
              const trimmed = line.trim();
              if (trimmed.length === 0) return false;
              if (/^(trang|page|-)?\s*\d+\s*(-)?$/i.test(trimmed)) return false;
              return true;
            })
            .join('\n');

          return cleanText.trim();
        } catch (err) {
          console.error(`Lỗi đọc nội dung tại trang ${pageNumber}:`, err);
          return "";
        }
      });
    });

    const pagesTexts = await Promise.all(pagePromises);
    const fullText = pagesTexts.filter(t => t.trim().length > 0).join("\n");
    console.log(`Đã hoàn tất xử lý song song. Trích xuất tổng cộng: ${fullText.length} ký tự.`);
    return fullText;
  };

  const createDocumentVectors = (text: string, docTitle: string, docId: string) => {
    const chunkSize = 400;
    const overlap = 100;
    const chunks = [];

    let i = 0;
    while (i < text.length) {
      const chunk = text.substring(i, i + chunkSize);
      chunks.push(chunk);
      i += (chunkSize - overlap);
    }

    const cleanWord = (word: string) => word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();

    const processedChunks = chunks.map((chunkText, index) => {
      const words = chunkText.split(/\s+/).map(cleanWord).filter(w => w.length > 1);
      const wordCounts: Record<string, number> = {};
      words.forEach(w => {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      });

      return {
        id: `${docId}-chunk-${index}`,
        docId: docId,
        docTitle: docTitle,
        text: chunkText,
        wordCounts: wordCounts,
        totalWords: words.length || 1
      };
    });

    return processedChunks;
  };

  const retrieveRelevantContext = (query: string, store: any[], topK = 4) => {
    if (store.length === 0) return [];

    const cleanWord = (word: string) => word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
    const queryWords = query.split(/\s+/).map(cleanWord).filter(w => w.length > 1);

    const queryCounts: Record<string, number> = {};
    queryWords.forEach(w => {
      queryCounts[w] = (queryCounts[w] || 0) + 1;
    });

    const scoredChunks = store.map(chunk => {
      let dotProduct = 0;
      let queryNormSq = 0;
      let chunkNormSq = 0;

      const allWords = new Set([...Object.keys(queryCounts), ...Object.keys(chunk.wordCounts)]);

      allWords.forEach(word => {
        const qVal = (queryCounts[word] || 0) / (queryWords.length || 1);
        const cVal = (chunk.wordCounts[word] || 0) / (chunk.totalWords || 1);

        dotProduct += qVal * cVal;
        queryNormSq += qVal * qVal;
        chunkNormSq += cVal * cVal;
      });

      const queryNorm = Math.sqrt(queryNormSq);
      const chunkNorm = Math.sqrt(chunkNormSq);

      const similarity = (queryNorm && chunkNorm) ? (dotProduct / (queryNorm * chunkNorm)) : 0;

      let titleBonus = 0;
      const titleLower = chunk.docTitle.toLowerCase();
      queryWords.forEach(word => {
        if (word.length > 2 && titleLower.includes(word)) {
          titleBonus += 0.15;
        }
      });

      return {
        ...chunk,
        score: similarity + titleBonus
      };
    });

    return scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  };

  const processUploadedFile = async (file: File) => {
    if (!file) return;

    setIsProcessingFile(true);
    const fileNameLower = file.name.toLowerCase();
    const isPdf = fileNameLower.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    reader.onload = async (event: any) => {
      try {
        let text = "";

        if (isPdf) {
          text = await extractTextFromPdf(event.target.result);
        } else if (isImage) {
          text = await extractTextFromImage(event.target.result, file.type);
        } else {
          text = event.target.result;
        }

        if (!text || text.trim().length === 0) {
          throw new Error("Không thể trích xuất văn bản từ tệp tin này.");
        }

        const docId = `doc-${Date.now()}`;
        const newDoc = {
          id: docId,
          title: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          contentLength: text.length,
          uploadedAt: new Date().toLocaleTimeString(),
          type: isPdf ? 'PDF' : isImage ? 'ẢNH' : file.name.split('.').pop()?.toUpperCase()
        };

        const newChunks = createDocumentVectors(text, file.name, docId);

        setDocuments(prev => [newDoc, ...prev]);
        setVectorStore(prev => [...prev, ...newChunks]);

        addSystemNotification(`Hệ thống RAG đã học xong tài liệu "${file.name}" (${newChunks.length} chunks) với tốc độ cao! Bạn có thể bắt đầu đặt câu hỏi.`);

      } catch (error: any) {
        console.error("Lỗi xử lý tài liệu:", error);
        alert(`Không thể đọc tài liệu: ${error.message}`);
      } finally {
        setIsProcessingFile(false);
        setFileInputKey(Date.now());
      }
    };

    reader.onerror = () => {
      setIsProcessingFile(false);
      alert("Đã xảy ra lỗi khi đọc tệp tin này từ thiết bị.");
    };

    if (isPdf) {
      reader.readAsArrayBuffer(file);
    } else if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    processUploadedFile(file);
  };

  const addSystemNotification = (content: string) => {
    const sysMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: content,
      timestamp: new Date().toLocaleTimeString()
    };
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, sysMessage] };
      }
      return s;
    }));
  };

  const handleDragOver = (e: any) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: any) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: any) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processUploadedFile(file);
  };

  const handleAddRawText = (e: any) => {
    e.preventDefault();
    if (!rawTextTitle.trim() || !rawTextContent.trim()) return;

    const docId = `doc-${Date.now()}`;
    const newDoc = {
      id: docId,
      title: rawTextTitle.trim(),
      size: `${(rawTextContent.length / 1024).toFixed(1)} KB`,
      contentLength: rawTextContent.length,
      uploadedAt: new Date().toLocaleTimeString(),
      type: 'VĂN BẢN'
    };

    const newChunks = createDocumentVectors(rawTextContent, rawTextTitle, docId);

    setDocuments(prev => [newDoc, ...prev]);
    setVectorStore(prev => [...prev, ...newChunks]);

    setRawTextTitle('');
    setRawTextContent('');
    setShowManualInput(false);

    addSystemNotification(`Đã ghi nhớ thành công văn bản thủ công "${newDoc.title}".`);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    setVectorStore(prev => prev.filter(chunk => chunk.docId !== docId));
  };

  const handleClearBrain = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ tri thức hiện tại trong bộ não AI?")) {
      setDocuments([]);
      setVectorStore([]);
    }
  };

  const handleGenerateSummary = async (doc: any, forceRegenerate: boolean = false) => {
    if (!forceRegenerate && doc.summaryData) {
      setSummaryModalState({
        isOpen: true,
        isLoading: false,
        data: doc.summaryData,
        docTitle: doc.title,
        docId: doc.id
      });
      return;
    }

    setSummaryModalState({ isOpen: true, isLoading: true, data: null, docTitle: doc.title, docId: doc.id });

    try {
      // Tái tạo lại văn bản gốc từ vectorStore
      const docChunks = vectorStore.filter(c => c.docId === doc.id);
      const fullText = docChunks.map(c => c.text).join("\n");

      if (!fullText) throw new Error("Không tìm thấy nội dung văn bản của tài liệu này.");

      const response = await fetch('/api/gemini/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docTitle: doc.title, fullText })
      });

      if (!response.ok) {
        throw new Error(`Lỗi khi gọi API Tóm tắt từ Server: ${response.status}`);
      }

      const parsedData = await response.json();

      // Lưu lại bản tóm tắt vào trong document
      setDocuments(prev => prev.map(d =>
        d.id === doc.id ? { ...d, summaryData: parsedData } : d
      ));

      setSummaryModalState(prev => ({
        ...prev,
        isLoading: false,
        data: parsedData
      }));

    } catch (error: any) {
      console.error(error);
      alert("Đã xảy ra lỗi trong quá trình tạo tóm tắt/slide: " + error.message);
      setSummaryModalState(prev => ({ ...prev, isOpen: false, isLoading: false }));
    }
  };

  const callGeminiAPI = async (promptText: string, history: any[] = [], retries = 3, delay = 1000): Promise<string> => {
    const systemPrompt = `Bạn là "Trợ lý AI hỗ trợ phân tích tài liệu và hiểu tài liệu nhanh chóng" thông minh, phân tích sâu và cực kỳ thân thiện.
Nhiệm vụ của bạn là giải thích, phân tích và trả lời câu hỏi dựa vào phần "Ngữ cảnh được cung cấp từ tài liệu".
- Hãy trả lời một cách tự nhiên, trực quan, chuyên sâu, đi thẳng vào câu hỏi.
- Trích dẫn cụ thể các nội dung có trong tài liệu để tăng tính thuyết phục.
- Nếu thông tin không có sẵn trong tài liệu, hãy thành thật báo lại cho người dùng biết, sau đó bạn có thể phân tích bổ sung dựa trên tri thức học máy của bạn một cách khách quan nhất.`;

    // Lọc lịch sử tin nhắn sạch để gửi kèm cho AI có trí nhớ (bỏ lỗi, bỏ tin hệ thống)
    const cleanHistory = history.filter(m => !m.isError && m.role !== 'system').slice(-6);

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: cleanHistory, prompt: promptText, systemPrompt })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.text) return data.text;
        throw new Error(data.error || "Không thể trích xuất nội dung phản hồi từ Server.");
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
    return "";
  };

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessageText = inputValue.trim();
    setInputValue('');

    const userMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString()
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, userMessage] };
      }
      return s;
    }));

    setIsLoading(true);

    try {
      const relevantChunks = retrieveRelevantContext(userMessageText, vectorStore, 4);

      let contextText = "";
      let sourceReferences: any[] = [];

      if (relevantChunks.length > 0) {
        contextText = relevantChunks.map((chunk, index) => {
          sourceReferences.push({
            title: chunk.docTitle,
            chunkId: chunk.id,
            score: (chunk.score * 100).toFixed(0)
          });
          return `[Tài liệu nguồn: ${chunk.docTitle}]\nNội dung đoạn trích:\n${chunk.text}`;
        }).join("\n\n---\n\n");
      }

      let finalPrompt = "";
      if (contextText) {
        finalPrompt = `Ngữ cảnh được trích xuất từ tài liệu đã nạp:\n${contextText}\n\nCâu hỏi của người dùng: ${userMessageText}\n\nHãy phân tích sâu sắc dữ liệu trên và trả lời câu hỏi một cách thuyết phục nhất. Đừng quên trích dẫn cụ thể tên tài liệu nguồn.`;
      } else {
        finalPrompt = `Câu hỏi của người dùng: ${userMessageText}\n\n(Lưu ý từ hệ thống: Hiện tại bộ não tri thức RAG của bạn đang trống hoặc không có thông tin khớp tốt với câu hỏi này. Hãy trả lời thân thiện dựa trên hiểu biết chung của bạn và khuyên người dùng nên kéo thả tài liệu vào khung chat để phân tích chính xác nhất).`;
      }

      // Đã cập nhật để truyền lịch sử vào API (Giúp AI nhớ câu hỏi cũ)
      const botResponseText = await callGeminiAPI(finalPrompt, currentSession.messages);

      const botMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'model',
        content: botResponseText,
        timestamp: new Date().toLocaleTimeString(),
        sources: sourceReferences.length > 0 ? sourceReferences : null
      };

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, botMessage] };
        }
        return s;
      }));

    } catch (error: any) {
      console.error(error);
      const errorMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        content: `❌ Không thể kết nối với máy chủ AI. Vui lòng kiểm tra lại cấu hình hoặc thử lại.\n\nChi tiết lỗi: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: `Hỏi đáp tài liệu #${sessions.length + 1}`,
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length === 1) {
      setSessions([{ id: 'session-1', title: 'Hỏi đáp tài liệu #1', messages: [] }]);
      setCurrentSessionId('session-1');
      return;
    }
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) {
      setCurrentSessionId(filtered[0].id);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200 bg-[#f0f4f9] text-[#1f1f1f] dark:bg-[#131314] dark:text-[#e3e3e3]">

      <SummaryModal
        isOpen={summaryModalState.isOpen}
        isLoading={summaryModalState.isLoading}
        data={summaryModalState.data}
        documentTitle={summaryModalState.docTitle}
        onClose={() => setSummaryModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* THANH ĐIỀU HƯỚNG */}
      <header className="h-16 px-4 sm:px-6 border-b flex items-center justify-between shrink-0 transition-colors bg-[#ffffff] border-[#e0e0e0] shadow-sm dark:bg-[#1e1f20] dark:border-[#303132]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary text-primary-foreground rounded-lg shadow-sm">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs sm:text-sm tracking-wide text-primary">
              Gemini RAG Pro
            </span>
            <span className="text-[9px] text-muted-foreground hidden sm:inline">
              Trợ lý AI hỗ trợ phân tích tài liệu
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <select
              value={currentSessionId}
              onChange={(e) => setCurrentSessionId(e.target.value)}
              className="text-xs p-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary max-w-35 truncate bg-[#f0f4f9] border-gray-300 text-gray-800 dark:bg-[#131314] dark:border-gray-700 dark:text-white"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>

            {sessions.length > 1 && (
              <button
                onClick={() => handleDeleteSession(currentSessionId)}
                className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                title="Xóa phiên chat hiện tại"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <button
            onClick={handleNewSession}
            className="flex items-center gap-1 py-1.5 px-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-[11px] shadow-sm transition-all"
            title="Tạo hội thoại mới"
          >
            <Plus size={12} />
            <span className="hidden xs:inline">Hội thoại mới</span>
          </button>

          <button
            onClick={() => setShowDocSidebar(!showDocSidebar)}
            className={`text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${showDocSidebar
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-[#ffffff] border-gray-300 hover:bg-[#f1f5f9] dark:bg-[#1e1f20] dark:border-gray-700 dark:hover:bg-[#2d2e30]'
              }`}
          >
            <Database size={12} />
            <span className="hidden md:inline">Tài liệu</span> ({documents.length})
          </button>
        </div>
      </header>

      {/* KHU VỰC CHAT CHÍNH VÀ NGĂN KÉO TÀI LIỆU */}
      <main
        className="flex-1 flex overflow-hidden relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >

        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary z-50 flex flex-col items-center justify-center pointer-events-none transition-all duration-150">
            <div className="bg-background p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-primary/30">
              <Upload className="text-primary animate-bounce" size={48} />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">Thả tài liệu của bạn vào đây</p>
                <p className="text-xs text-muted-foreground mt-1">Trợ lý AI sẽ lập tức giải mã đa luồng và học nội dung này!</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden w-full">

          <div className="flex-1 flex flex-col justify-between h-full relative min-w-0">

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {currentSession.messages.length === 0 ? (

                <div className="max-w-2xl mx-auto pt-10 text-center space-y-8">
                  <div className="inline-block p-4 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/10">
                    <Sparkles size={36} className="animate-spin-slow" />
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary">
                      Trợ lý AI hỗ trợ phân tích tài liệu
                    </h1>
                    <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed px-4">
                      Tôi có thể đọc, hiểu sâu sắc nhiều tài liệu cùng một lúc, bao gồm cả bóc tách thông tin từ hình ảnh.
                      Hãy kéo và thả tài liệu vào đây hoặc sử dụng biểu tượng kẹp giấy để bắt đầu!
                    </p>
                  </div>

                  <div className="max-w-md mx-auto p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/20 hover:bg-primary/5 transition-all relative flex flex-col items-center justify-center gap-3 group">
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".txt,.md,.json,.html,.csv,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    {isProcessingFile ? (
                      <div className="space-y-2">
                        <Loader2 size={32} className="animate-spin text-primary mx-auto" />
                        <p className="text-xs text-primary">Đang giải mã nội dung...</p>
                      </div>
                    ) : (
                      <>
                        <Upload size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="text-center">
                          <p className="text-xs font-semibold text-foreground">Kéo & Thả hoặc Click để tải tài liệu lên</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Hỗ trợ PDF, ẢNH, TXT, MD, JSON, CSV tối đa 10MB</p>
                        </div>
                      </>
                    )}
                  </div>

                </div>

              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  {currentSession.messages.map((msg) => {
                    if (msg.role === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="flex items-center gap-2 py-2 px-4 rounded-xl border text-xs max-w-xl bg-primary/10 border-primary/20 text-primary">
                            <FileCheck size={14} className="shrink-0 text-primary" />
                            <span>{msg.content}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role !== 'user' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 shadow animate-fade-in">
                            AI
                          </div>
                        )}

                        <div className={`max-w-[85%] rounded-2xl p-4 space-y-3 ${msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-background border border-border shadow-sm'
                          }`}>
                          <div className={`text-xs sm:text-sm leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap' : 'prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-foreground prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-strong:text-primary prose-ul:my-2 prose-li:my-0'}`}>
                            {msg.role === 'user' ? (
                              msg.content
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            )}
                          </div>

                          {/* HIỂN THỊ ẢNH NẾU CÓ */}
                          {(msg as any).image && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-border bg-muted/30 shadow-inner">
                              <img src={(msg as any).image} alt="Minh họa tài liệu" className="w-full h-auto object-cover max-h-87.5" loading="lazy" />
                            </div>
                          )}

                          {msg.role !== 'user' && msg.sources && (
                            <div className="mt-3 pt-3 border-t text-xs border-border">
                              <span className="font-semibold text-primary flex items-center gap-1.5 mb-1.5 text-[10px]">
                                <Database size={10} /> Trích dẫn từ ({msg.sources.length} tài liệu liên quan):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.sources.map((src: any, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-primary/10 text-primary"
                                    title={`Độ tin cậy: ${src.score}%`}
                                  >
                                    <BookOpen size={8} />
                                    {src.title}
                                    <span className="opacity-60">({src.score}%)</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className={`text-[9px] text-right ${msg.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {msg.timestamp}
                          </div>
                        </div>

                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold shrink-0 shadow border border-border">
                            U
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex gap-4 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 animate-pulse">
                        AI
                      </div>
                      <div className="max-w-[85%] rounded-2xl p-4 flex items-center gap-2.5 bg-background border border-border shadow-sm">
                        <Loader2 className="animate-spin text-primary" size={14} />
                        <span className="text-xs text-muted-foreground">Đang phân tích & xử lý ngôn ngữ...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/30 border-border">
              <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">

                  <div className="relative shrink-0">
                    <input
                      key={fileInputKey + '-form'}
                      type="file"
                      accept=".txt,.md,.json,.html,.csv,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                    />
                    <button
                      type="button"
                      disabled={isProcessingFile}
                      className={`p-3 rounded-full border transition-all flex items-center justify-center ${isProcessingFile
                          ? 'bg-primary/20 border-primary/30 text-primary'
                          : 'bg-background border-border text-muted-foreground hover:bg-accent'
                        }`}
                      title="Nạp thêm tệp tin vào bộ não"
                    >
                      {isProcessingFile ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={vectorStore.length > 0 ? `Hỏi về tài liệu đã học (${documents.length} files)...` : "Gửi tin nhắn hoặc kéo thả tài liệu, ảnh vào đây..."}
                      className="w-full py-3.5 pl-4 pr-12 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs sm:text-sm transition-all bg-background text-foreground border border-border placeholder-muted-foreground shadow-sm"
                    />

                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white transition-all ${inputValue.trim() && !isLoading
                          ? 'bg-primary hover:bg-primary/90 cursor-pointer shadow-md'
                          : 'bg-muted-foreground opacity-40 cursor-not-allowed'
                        }`}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>

                <p className="text-center text-[9px] text-muted-foreground mt-2">
                  Kéo thả file .pdf, .txt, .png, .jpg trực tiếp vào màn hình này để AI tự phân tích và học nội dung tốc độ cao.
                </p>
              </div>
            </div>

          </div>

          {showDocSidebar && (
            <div className="w-80 border-l shrink-0 flex flex-col transition-colors bg-muted/10 border-border">

              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-primary" />
                  <span className="font-bold text-xs uppercase tracking-wider text-foreground">Bộ nhớ tài liệu ({documents.length})</span>
                </div>
                <button
                  onClick={() => setShowDocSidebar(false)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                <div className="space-y-2">
                  <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="w-full py-2 px-3 border border-dashed border-border rounded-lg text-left text-xs text-primary hover:bg-primary/5 transition-all flex items-center justify-between"
                  >
                    <span>{showManualInput ? 'Đóng mục viết tay' : '+ Dán văn bản bằng tay'}</span>
                    <ArrowRight size={12} className={`transition-transform ${showManualInput ? 'rotate-90' : ''}`} />
                  </button>

                  {showManualInput && (
                    <form onSubmit={handleAddRawText} className="p-3 rounded-xl border space-y-2.5 bg-background border-border">
                      <div>
                        <input
                          type="text"
                          required
                          value={rawTextTitle}
                          onChange={(e) => setRawTextTitle(e.target.value)}
                          placeholder="Tiêu đề văn bản..."
                          className="w-full px-2.5 py-1.5 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-primary bg-muted/50 border-border text-foreground"
                        />
                      </div>
                      <div>
                        <textarea
                          required
                          rows={3}
                          value={rawTextContent}
                          onChange={(e) => setRawTextContent(e.target.value)}
                          placeholder="Nội dung tri thức..."
                          className="w-full px-2.5 py-1.5 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-primary resize-none bg-muted/50 border-border text-foreground"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold rounded"
                      >
                        Huấn luyện ngay
                      </button>
                    </form>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Tài liệu đã học</span>
                    {documents.length > 0 && (
                      <button
                        onClick={handleClearBrain}
                        className="text-destructive hover:underline flex items-center gap-1 normal-case text-[9px]"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-[11px]">
                      Hệ thống chưa học tài liệu nào. Hãy kéo thả file (PDF, ẢNH, TXT) vào cửa sổ Chat để bắt đầu!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all bg-background border-border group"
                        >
                          <div className="overflow-hidden mr-2 flex-1">
                            <p className="font-semibold truncate text-foreground" title={doc.title}>{doc.title}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
                              <span className="bg-primary/10 text-primary px-1 rounded font-mono font-bold text-[8px]">{doc.type}</span>
                              <span>•</span>
                              <span>{doc.size}</span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <button
                              onClick={() => handleGenerateSummary(doc)}
                              className={`p-1 rounded shrink-0 mr-1 flex items-center gap-1 transition-colors ${doc.summaryData
                                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                                  : 'text-primary hover:text-primary/80 hover:bg-primary/10'
                                }`}
                              title={doc.summaryData ? "Xem Bảng Tóm tắt" : "Tạo Bảng Tóm tắt & Slide"}
                            >
                              <Sparkles size={12} />
                              <span className="text-[10px] font-bold hidden xl:inline">
                                {doc.summaryData ? 'Đã tóm tắt' : 'Tóm tắt'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded shrink-0"
                              title="Xóa tài liệu"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {vectorStore.length > 0 && (
                  <div className="p-3 rounded-xl border space-y-1.5 text-[10px] text-muted-foreground bg-background border-border">
                    <div className="font-bold uppercase text-primary text-[9px] flex items-center gap-1">
                      <CornerDownRight size={10} /> Chi tiết cơ sở dữ liệu Vector:
                    </div>
                    <div>• Tổng số phân đoạn (Chunks): <span className="font-semibold text-foreground">{vectorStore.length}</span></div>
                    <div>• Độ rộng trung bình: 400 ký tự / đoạn</div>
                    <div>• Thuật toán tìm kiếm: Cosine Similarity</div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
