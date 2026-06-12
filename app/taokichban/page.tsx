"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  RefreshCw, 
  FileText, 
  Film, 
  ImageIcon, 
  Video, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ScenarioItem {
  tieude?: string;
  status?: string;
  noidung?: string;
  link_kbtongquat?: string;
  link_hauki?: string;
  link_taoanh?: string;
  link_taovideo?: string;
}

export default function TaoKichBanPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Docs Modal states
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docTitle, setDocTitle] = useState("");

  const scriptUrl = "https://script.google.com/macros/s/AKfycbzk4dcCcdJzcCAWk4YfNaF6bpZAa4AUHnAUHJonxlp6abupFPZl4wlpT_fsG5enYat6/exec";

  // 1. SSR & Initialization
  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  // 2. Fetch Data from Apps Script
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data || []);
      } else {
        throw new Error(result.error || "Không thể tải dữ liệu từ server.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi kết nối hệ thống.");
      toast.error("Không thể kết nối đến dữ liệu Google Sheets");
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit New Content
  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newContent.trim();
    if (!content) {
      toast.warning("Vui lòng nhập nội dung kịch bản.");
      return;
    }

    setSubmitting(true);
    setSubmitMsg({ type: "info", text: "⏳ Đang gửi kịch bản lên hệ thống..." });

    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ noidung: content })
      });

      const result = await response.json();
      if (result.success) {
        setSubmitMsg({ type: "success", text: "✅ Đăng kịch bản mới thành công!" });
        toast.success("Đã gửi kịch bản thành công");
        setNewContent("");
        
        // Auto close and reload
        setTimeout(() => {
          setShowAddModal(false);
          setSubmitMsg(null);
          fetchData();
        }, 1200);
      } else {
        throw new Error(result.error || "Gửi thất bại.");
      }
    } catch (err: any) {
      console.error(err);
      setSubmitMsg({ type: "error", text: `❌ Lỗi: ${err.message}` });
      toast.error(`Đăng kịch bản thất bại: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Open Google Doc inside Iframe
  const openDocs = (url: string, title: string) => {
    setDocTitle(title);
    // Convert edit/view link to Google preview mode for clean embedding
    const embedUrl = url.replace(/\/edit.*$/, "/preview").replace(/\/view.*$/, "/preview");
    setDocUrl(embedUrl);
    setShowDocsModal(true);
  };

  // 5. Helper function for styling based on item status
  const getStatusStyles = (status?: string) => {
    const normalized = (status || "").trim().toUpperCase();
    switch (normalized) {
      case "HOÀN THÀNH":
        return {
          badge: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border border-emerald-500/20",
          border: "border-l-4 border-l-emerald-500"
        };
      case "KỊCH BẢN QUAY HOÀN THÀNH":
        return {
          badge: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/15 border border-blue-500/20",
          border: "border-l-4 border-l-blue-500"
        };
      case "KỊCH BẢN EDITOR HOÀN THÀNH":
        return {
          badge: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/15 border border-purple-500/20",
          border: "border-l-4 border-l-purple-500"
        };
      case "PROMPT ẢNH HOÀN THÀNH":
        return {
          badge: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/15 border border-pink-500/20",
          border: "border-l-4 border-l-pink-500"
        };
      case "CHỜ XỬ LÝ":
      default:
        return {
          badge: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border border-amber-500/20",
          border: "border-l-4 border-l-amber-500"
        };
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Đang tải ứng dụng...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 border border-border rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading text-primary">Hệ thống Quản lý Kịch bản</h1>
          <p className="text-muted-foreground text-sm mt-1">Đăng tải, theo dõi trạng thái và xử lý kịch bản tự động qua Google Sheets.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="sm" 
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </Button>
          <Button 
            onClick={() => setShowAddModal(true)} 
            size="sm"
            className="flex items-center gap-2 rounded-2xl w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95"
          >
            <Plus className="w-4 h-4" />
            Đăng kịch bản mới
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Lỗi hệ thống</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton List */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="rounded-3xl border border-border bg-card/50 overflow-hidden animate-pulse p-5 h-24">
              <div className="w-full h-full bg-muted rounded-xl" />
            </Card>
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-border bg-card/20 text-center p-8">
          <CardContent className="space-y-4 max-w-sm">
            <div className="text-5xl opacity-40">📂</div>
            <div>
              <h3 className="font-bold text-lg">Chưa có dữ liệu</h3>
              <p className="text-sm text-muted-foreground mt-1">Hệ thống chưa ghi nhận kịch bản nào. Hãy bấm nút phía trên để đăng kịch bản đầu tiên.</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} size="sm" className="rounded-2xl">
              Tạo kịch bản đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Scenarios List Rows */
        <div className="space-y-3">
          {/* Table Header on Desktop */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 border border-border/50 rounded-2xl mb-1 items-center">
            <div className="md:col-span-2"># & Trạng thái</div>
            <div className="md:col-span-3">Tiêu đề</div>
            <div className="md:col-span-4">Nội dung tóm tắt</div>
            <div className="md:col-span-3 text-right pr-6">Tác vụ kịch bản / tài liệu</div>
          </div>

          {data.map((item, index) => {
            const styles = getStatusStyles(item.status);
            
            return (
              <div 
                key={index} 
                className={`rounded-2xl border bg-card hover:bg-accent/5 transition-all duration-300 shadow-sm flex flex-col md:grid md:grid-cols-12 items-start md:items-center p-4 md:px-6 md:py-3.5 gap-4 md:gap-4 ${styles.border}`}
              >
                {/* Index & Status */}
                <div className="flex items-center gap-2 md:col-span-2 shrink-0 w-full md:w-auto">
                  <span className="text-[11px] font-extrabold text-muted-foreground bg-muted border border-border/80 px-2 py-0.5 rounded-md min-w-[32px] text-center">
                    #{index + 1}
                  </span>
                  <Badge 
                    className={`text-[9px] font-bold rounded-md px-2 py-0.5 whitespace-nowrap tracking-wide ${styles.badge}`}
                  >
                    {item.status || "CHỜ XỬ LÝ"}
                  </Badge>
                </div>

                {/* Title */}
                <div className="w-full md:col-span-3 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors duration-200" title={item.tieude}>
                    {item.tieude || "Chưa có tiêu đề"}
                  </h3>
                </div>

                {/* Content Preview */}
                <div className="w-full md:col-span-4 min-w-0">
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-sans md:pr-4" title={item.noidung}>
                    {item.noidung || "Nội dung trống"}
                  </p>
                </div>

                {/* Action Link Buttons */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 w-full md:col-span-3 md:justify-end shrink-0 justify-start">
                  {item.link_kbtongquat ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDocs(item.link_kbtongquat!, "Kịch bản tổng quát")}
                      className="text-[10px] font-semibold rounded-lg flex items-center gap-1 h-8 px-2 border-border hover:bg-muted/80 text-foreground"
                      title="Kịch bản tổng quát"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="hidden xl:inline">Tổng quát</span>
                      <span className="inline xl:hidden">KB</span>
                    </Button>
                  ) : (
                    <div className="text-[9px] text-muted-foreground italic flex items-center justify-center border border-dashed border-border rounded-lg h-8 px-2 select-none shrink-0" title="Chưa có kịch bản tổng quát">
                      Ko KB
                    </div>
                  )}

                  {item.link_hauki ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDocs(item.link_hauki!, "Hậu kỳ")}
                      className="text-[10px] font-semibold rounded-lg flex items-center gap-1 h-8 px-2 border-border hover:bg-muted/80 text-foreground"
                      title="Hậu kỳ"
                    >
                      <Film className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="hidden xl:inline">Hậu kỳ</span>
                      <span className="inline xl:hidden">HK</span>
                    </Button>
                  ) : (
                    <div className="text-[9px] text-muted-foreground italic flex items-center justify-center border border-dashed border-border rounded-lg h-8 px-2 select-none shrink-0" title="Chưa có hậu kỳ">
                      Ko HK
                    </div>
                  )}

                  {item.link_taoanh ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDocs(item.link_taoanh!, "Tạo ảnh")}
                      className="text-[10px] font-semibold rounded-lg flex items-center gap-1 h-8 px-2 border-border hover:bg-muted/80 text-foreground"
                      title="Tạo ảnh"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="hidden xl:inline">Tạo ảnh</span>
                      <span className="inline xl:hidden">Ảnh</span>
                    </Button>
                  ) : (
                    <div className="text-[9px] text-muted-foreground italic flex items-center justify-center border border-dashed border-border rounded-lg h-8 px-2 select-none shrink-0" title="Chưa có link tạo ảnh">
                      Ko ảnh
                    </div>
                  )}

                  {item.link_taovideo ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDocs(item.link_taovideo!, "Tạo video")}
                      className="text-[10px] font-semibold rounded-lg flex items-center gap-1 h-8 px-2 border-border hover:bg-muted/80 text-foreground"
                      title="Tạo video"
                    >
                      <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="hidden xl:inline">Video</span>
                      <span className="inline xl:hidden">Video</span>
                    </Button>
                  ) : (
                    <div className="text-[9px] text-muted-foreground italic flex items-center justify-center border border-dashed border-border rounded-lg h-8 px-2 select-none shrink-0" title="Chưa có link tạo video">
                      Ko phim
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Write New Script */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-border bg-muted/10">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">Đăng kịch bản mới</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setSubmitMsg(null);
                }} 
                className="text-muted-foreground hover:text-foreground p-1 transition-colors duration-150"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitContent} className="flex flex-col flex-grow overflow-hidden">
              <div className="p-5 space-y-4 flex-grow overflow-y-auto">
                <p className="text-xs text-muted-foreground">
                  Dán nội dung bài viết bán hàng của bạn vào bên dưới. AI sẽ tự động phân tích và tạo tiêu đề, kịch bản, hậu kỳ, cùng các đường dẫn tương ứng lên hệ thống Sheets.
                </p>
                <div className="space-y-2">
                  <label htmlFor="noidung" className="text-xs font-bold text-foreground block">
                    Nội dung bài viết
                  </label>
                  <textarea 
                    id="noidung"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Nhập hoặc dán nội dung vào đây..."
                    className="w-full bg-background border border-input rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 h-72 resize-none leading-relaxed"
                    required
                  />
                </div>

                {submitMsg && (
                  <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
                    submitMsg.type === "success" 
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500" 
                      : submitMsg.type === "error" 
                        ? "bg-destructive/10 border-destructive/25 text-destructive"
                        : "bg-primary/10 border-primary/25 text-primary"
                  }`}>
                    {submitMsg.type === "info" && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                    {submitMsg.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {submitMsg.type === "error" && <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span className="font-medium">{submitMsg.text}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitMsg(null);
                  }}
                  disabled={submitting}
                  className="rounded-xl px-5"
                >
                  Hủy bỏ
                </Button>
                <Button 
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Đăng nội dung
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Google Docs in Iframe */}
      {showDocsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-xl w-full max-w-6xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-1">{docTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  asChild
                  className="h-8 w-8 rounded-lg"
                  title="Mở trong tab mới"
                >
                  <a href={docUrl.replace("/preview", "")} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    setShowDocsModal(false);
                    setDocUrl("");
                  }}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-grow bg-white dark:bg-zinc-950 relative">
              {docUrl ? (
                <iframe 
                  src={docUrl} 
                  className="w-full h-full border-none" 
                  title="Google Document Preview"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  Đang tải tài liệu...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
