"use client";

import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Presentation, ChevronLeft, ChevronRight, Loader2, FileDown, RefreshCw } from 'lucide-react';

interface SummaryData {
  htmlDocument: string;
  slides: {
    title: string;
    htmlContent: string;
  }[];
}

interface SummaryModalProps {
  isOpen: boolean;
  isLoading: boolean;
  documentTitle: string;
  data: SummaryData | null;
  onClose: () => void;
  onRegenerate?: () => void;
}

export default function SummaryModal({ isOpen, isLoading, documentTitle, data, onClose, onRegenerate }: SummaryModalProps) {
  const [activeTab, setActiveTab] = useState<'document' | 'slide'>('document');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset tab when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setActiveTab('document');
      setCurrentSlide(0);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const downloadDocx = () => {
    if (!data?.htmlDocument) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Summary</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + data.htmlDocument + footer;

    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tom-Tat-${documentTitle || 'Tai-Lieu'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!data?.htmlDocument) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Sao chép toàn bộ style và CSS từ thẻ head của trang web hiện tại sang cửa sổ in
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Tóm tắt - ${documentTitle}</title>
            ${styles}
            <style>
              /* Bắt buộc trình duyệt phải in nền và màu sắc chính xác như trên web */
              @media print {
                body { 
                  padding: 20px; 
                  -webkit-print-color-adjust: exact !important; 
                  print-color-adjust: exact !important; 
                  color-adjust: exact !important;
                }
              }
              body {
                background-color: white !important; /* Tránh in nền đen nếu đang bật Dark Mode */
                color: black !important;
              }
            </style>
          </head>
          <body class="p-8 font-sans">
            <h1 class="text-3xl font-bold text-center border-b-2 pb-4 mb-6">Bản Tóm Tắt Phân Tích</h1>
            <p class="mb-8 text-gray-600"><strong>Tài liệu gốc:</strong> ${documentTitle}</p>
            <div class="max-w-4xl mx-auto">
               ${data.htmlDocument}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();

      // Delay để các file CSS ngoài (Tailwind) kịp tải và áp dụng
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4 sm:p-6">
      <div className="bg-background w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-border relative flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">

        {/* HEADER */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <SparklesIcon className="text-primary" size={20} />
              Bảng Tóm Tắt Tự Động
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
              Tài liệu: {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <Loader2 className="animate-spin text-primary" size={48} />
              <div className="space-y-1">
                <p className="text-lg font-bold text-foreground">AI đang phân tích tài liệu...</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Quá trình này có thể mất vài chục giây để đọc toàn bộ ngữ cảnh và xây dựng văn bản tóm tắt chuẩn xác.
                </p>
              </div>
            </div>
          ) : !data ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Không có dữ liệu tóm tắt.
            </div>
          ) : (
            <>
              {/* TABS */}
              <div className="flex px-6 pt-4 gap-4 border-b">
                <button
                  onClick={() => setActiveTab('document')}
                  className={`pb-3 px-2 flex items-center gap-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'document'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                >
                  <FileText size={16} /> Văn bản (HTML)
                </button>
                <button
                  onClick={() => setActiveTab('slide')}
                  className={`pb-3 px-2 flex items-center gap-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'slide'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                >
                  <Presentation size={16} /> Trình chiếu (Slide)
                </button>
              </div>

              {/* TOOLBAR */}
              <div className="px-6 py-3 bg-muted/10 border-b flex items-center justify-between shrink-0">
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  {activeTab === 'slide' ? `Slide ${currentSlide + 1} / ${data.slides.length}` : 'Định dạng HTML thuần túy'}


                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors font-medium text-[11px]"
                    title="Tạo lại bản tóm tắt mới"
                  >
                    <RefreshCw size={12} /> Tạo lại
                  </button>

                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
                  >
                    <Download size={14} /> Xuất PDF
                  </button>
                  <button
                    onClick={downloadDocx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 transition-colors text-xs font-semibold"
                  >
                    <FileDown size={14} /> Xuất Word (.doc)
                  </button>
                </div>
              </div>

              {/* TAB CONTENT */}
              <div className="flex-1 overflow-auto bg-muted/5 relative">

                {/* DOCUMENT TAB */}
                {activeTab === 'document' && (
                  <div className="max-w-4xl mx-auto p-6 sm:p-12 bg-background min-h-full border-x border-b border-border/50">
                    <div
                      className="w-full"
                      dangerouslySetInnerHTML={{ __html: data.htmlDocument }}
                    />
                  </div>
                )}

                {/* SLIDE TAB */}
                {activeTab === 'slide' && data.slides.length > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 bg-muted/20">

                    <div className="w-full max-w-5xl aspect-[16/9] bg-gradient-to-br from-background via-background to-primary/5 border border-primary/20 rounded-2xl shadow-2xl p-8 sm:p-14 flex flex-col relative transition-all overflow-hidden ring-1 ring-primary/10">

                      {/* BĂNG TRANG TRÍ GÓC */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-tr-full -ml-10 -mb-10 blur-2xl pointer-events-none"></div>

                      <div className="text-center mb-8 pb-6 border-b border-primary/10 relative z-10">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 leading-tight">
                          {data.slides[currentSlide].title}
                        </h2>
                      </div>

                      <div
                        className="flex-1 overflow-auto prose prose-lg sm:prose-xl dark:prose-invert max-w-none text-foreground flex flex-col justify-center relative z-10
                          prose-headings:text-primary prose-a:text-blue-600
                          prose-li:marker:text-primary prose-li:font-medium prose-li:mb-3
                          prose-strong:text-primary prose-strong:font-extrabold"
                        dangerouslySetInnerHTML={{ __html: data.slides[currentSlide].htmlContent }}
                      />

                      {/* SLIDE CONTROLS */}
                      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-8 sm:px-14 z-20">
                        <button
                          disabled={currentSlide === 0}
                          onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                          className="p-3 rounded-full bg-background border border-border shadow-md text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronLeft size={24} />
                        </button>

                        <div className="flex gap-2">
                          {data.slides.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentSlide(i)}
                              className={`h-2.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-gradient-to-r from-primary to-blue-500 shadow-sm' : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                              aria-label={`Go to slide ${i + 1}`}
                            />
                          ))}
                        </div>

                        <button
                          disabled={currentSlide === data.slides.length - 1}
                          onClick={() => setCurrentSlide(prev => Math.min(data.slides.length - 1, prev + 1))}
                          className="p-3 rounded-full bg-background border border-border shadow-md text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// Sparkles icon local
function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
