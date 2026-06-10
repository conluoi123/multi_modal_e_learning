import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, Loader2, Search, BrainCircuit, CheckSquare, Presentation, Trash2, FolderOpen } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { documentService, type DocumentInfo } from "../services/documentService";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await documentService.getDocuments();
      setDocuments(res.documents);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách tài liệu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadClick = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // Simulate fake progress for UX
      const progressInterval = setInterval(() => {
         setUploadProgress(p => p < 90 ? p + Math.random() * 15 : p);
      }, 500);

      await documentService.uploadDocument(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(async () => {
         await fetchDocuments();
         setIsUploading(false);
         setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error("Lỗi tải lên tài liệu:", error);
      alert("Tải lên thất bại. Vui lòng thử lại.");
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const getTopicFromFilename = (filename: string) => {
    return filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  };

  const openChatForDocument = (doc: DocumentInfo) => {
    navigate("/chat", {
      state: {
        docId: doc.doc_id,
      },
    });
  };

  const openQuizForDocument = (doc: DocumentInfo) => {
    navigate("/quiz", {
      state: {
        docId: doc.doc_id,
        topic: getTopicFromFilename(doc.filename),
      },
    });
  };

  const openSlidesForDocument = (doc: DocumentInfo) => {
    navigate("/slides", {
      state: {
        docId: doc.doc_id,
        topic: getTopicFromFilename(doc.filename),
      },
    });
  };

  const deleteDocument = async (doc: DocumentInfo) => {
    const confirmed = window.confirm(`Xoa tai lieu "${doc.filename}" va cac vector da ingest?`);
    if (!confirmed) return;

    try {
      setDeletingDocId(doc.doc_id);
      await documentService.deleteDocument(doc.doc_id);
      await fetchDocuments();
    } catch (error) {
      console.error("Loi khi xoa tai lieu:", error);
      alert("Xoa tai lieu that bai. Vui long thu lai.");
    } finally {
      setDeletingDocId(null);
    }
  };

  const filteredDocs = documents.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 space-y-8 max-w-7xl mx-auto w-full"
    >
      <div className="flex flex-col md:flex-row gap-8">
        <motion.div variants={itemVariants} className="flex-1 space-y-6">
          <h1 className="text-[#261816] font-['Playfair_Display',serif] text-5xl font-bold italic tracking-tight leading-tight">
            Thư viện <br /> <span className="text-[#9E2016]">Tài liệu AI</span>
          </h1>
          <p className="text-[#59413D] text-lg leading-relaxed opacity-80 max-w-md font-['DM_Sans',sans-serif]">
            Tải lên giáo trình, bài nghiên cứu hoặc ghi chú cá nhân để EduMind AI bắt đầu quá trình trích xuất tri thức và phân tích học thuật chuyên sâu.
          </p>
          
          <div className="flex gap-4">
             <div className="flex flex-col bg-white p-4 rounded-2xl border border-[#E1BFB9]/50 shadow-sm w-32">
                <span className="text-3xl font-bold text-[#9E2016] font-['DM_Sans',sans-serif]">{documents.length}</span>
                <span className="text-[10px] text-[#59413D] opacity-60 font-['JetBrains_Mono',monospace] uppercase font-bold mt-1">Tài liệu</span>
             </div>
             <div className="flex flex-col bg-white p-4 rounded-2xl border border-[#E1BFB9]/50 shadow-sm w-32">
                <span className="text-3xl font-bold text-[#261816] font-['DM_Sans',sans-serif]">{documents.reduce((acc, doc) => acc + doc.chunk_count, 0)}</span>
                <span className="text-[10px] text-[#59413D] opacity-60 font-['JetBrains_Mono',monospace] uppercase font-bold mt-1">Chunks</span>
             </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex-1">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.docx"
          />

          <motion.div 
            whileHover={!isUploading ? { scale: 1.02 } : {}}
            whileTap={!isUploading ? { scale: 0.98 } : {}}
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`glass-panel h-full min-h-[300px] flex flex-col items-center justify-center p-8 cursor-pointer rounded-[2rem] transition-all relative overflow-hidden group border-2 ${
               isDragging ? 'border-[#9E2016] bg-[#FCEEEB]/80' : 'border-[#E1BFB9]/50 hover:border-[#9E2016]/50'
            }`}
          >
             <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
             
             <AnimatePresence mode="wait">
               {isUploading ? (
                 <motion.div 
                   key="uploading"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="flex flex-col items-center text-center z-10 w-full px-8"
                 >
                   <div className="w-20 h-20 bg-gradient-to-br from-[#9E2016] to-[#C94B3E] rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg relative overflow-hidden">
                      <motion.div 
                        animate={{ y: ["100%", "-100%"] }} 
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-white/20 blur-md"
                      />
                      <BrainCircuit size={32} className="animate-pulse" />
                   </div>
                   <h3 className="text-[#261816] font-['Playfair_Display',serif] italic text-2xl font-bold mb-2">Đang phân tích & Embedding...</h3>
                   <div className="w-full h-2 bg-[#E1BFB9]/30 rounded-full overflow-hidden mt-4">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${uploadProgress}%` }}
                       className="h-full bg-[#9E2016] rounded-full"
                     />
                   </div>
                   <p className="text-xs font-['JetBrains_Mono',monospace] text-[#59413D] opacity-60 mt-2">{Math.round(uploadProgress)}% Hoàn tất</p>
                 </motion.div>
               ) : (
                 <motion.div 
                   key="idle"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="flex flex-col items-center text-center z-10"
                 >
                   <div className="w-20 h-20 bg-[#FCEEEB] rounded-full flex items-center justify-center text-[#9E2016] mb-6 group-hover:bg-[#9E2016] group-hover:text-white transition-colors duration-500 shadow-sm">
                     <Upload size={32} className="group-hover:-translate-y-1 transition-transform" />
                   </div>
                   <h3 className="text-[#261816] font-['Playfair_Display',serif] italic text-2xl font-bold mb-2">
                     Kéo thả hoặc Click để tải lên
                   </h3>
                   <p className="text-[#59413D] text-sm opacity-60 font-['DM_Sans',sans-serif] max-w-[250px]">Hỗ trợ định dạng PDF, DOCX, TXT. Dung lượng tối đa 50MB.</p>
                 </motion.div>
               )}
             </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] p-8 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
           <h2 className="text-[#261816] font-['Playfair_Display',serif] italic text-2xl font-bold flex items-center gap-3">
              <FolderOpen size={24} className="text-[#9E2016]" /> Danh sách tài liệu
           </h2>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#59413D] opacity-40" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm tài liệu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border border-[#E1BFB9]/50 bg-white/50 focus:bg-white focus:border-[#9E2016]/50 focus:outline-none transition-colors text-sm w-64 font-['DM_Sans',sans-serif]"
              />
           </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
              <Loader2 className="animate-spin text-[#9E2016]" size={40} />
              <p className="text-[#59413D] opacity-60 font-['DM_Sans',sans-serif]">Đang tải thư viện...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 gap-4 bg-white/30 rounded-2xl border border-dashed border-[#E1BFB9]">
              <FileText size={48} className="text-[#59413D] opacity-20" />
              <p className="text-[#59413D] opacity-60 font-['DM_Sans',sans-serif]">Chưa có tài liệu nào phù hợp.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E1BFB9]/50 text-[11px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-wider">
                  <th className="py-4 px-4">Tên tài liệu</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-4">Độ lớn (Chunks)</th>
                  <th className="py-4 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence>
                  {filteredDocs.map((doc, i) => {
                    const ext = doc.filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}
                        key={doc.doc_id || i} 
                        className="group hover:bg-white/60 transition-colors border-b border-[#E1BFB9]/20"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-lg bg-[#FCEEEB] text-[#9E2016] flex items-center justify-center shrink-0">
                               <FileText size={20} />
                             </div>
                             <div>
                               <p className="font-['DM_Sans',sans-serif] font-bold text-[#261816] group-hover:text-[#9E2016] transition-colors">{doc.filename}</p>
                               <p className="text-[10px] text-[#59413D] opacity-60 font-['JetBrains_Mono',monospace] uppercase mt-0.5">{ext} • ID: {doc.doc_id ? doc.doc_id.substring(0, 8) : "N/A"}</p>
                             </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider font-['JetBrains_Mono',monospace]">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> READY
                          </span>
                        </td>
                        <td className="py-4 px-4 text-[#59413D] font-['JetBrains_Mono',monospace] text-xs">
                          {doc.chunk_count}
                        </td>
                        <td className="py-4 px-4 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openChatForDocument(doc)}
                                className="p-2 bg-white rounded-lg border border-[#E1BFB9]/50 text-[#59413D] hover:text-[#9E2016] hover:border-[#9E2016]/50 transition-all shadow-sm tooltip-trigger"
                                title="Hỏi AI"
                              >
                                <BrainCircuit size={16} />
                              </button>
                              <button
                                onClick={() => openQuizForDocument(doc)}
                                className="p-2 bg-white rounded-lg border border-[#E1BFB9]/50 text-[#59413D] hover:text-[#9E2016] hover:border-[#9E2016]/50 transition-all shadow-sm tooltip-trigger"
                                title="Tạo Quiz"
                              >
                                <CheckSquare size={16} />
                              </button>
                              <button
                                onClick={() => openSlidesForDocument(doc)}
                                className="p-2 bg-white rounded-lg border border-[#E1BFB9]/50 text-[#59413D] hover:text-[#9E2016] hover:border-[#9E2016]/50 transition-all shadow-sm tooltip-trigger"
                                title="Tạo Slide"
                              >
                                <Presentation size={16} />
                              </button>
                              <div className="w-px h-6 bg-[#E1BFB9]/50 mx-1" />
                              <button
                                onClick={() => deleteDocument(doc)}
                                disabled={deletingDocId === doc.doc_id}
                                className="p-2 bg-white rounded-lg border border-[#E1BFB9]/50 text-[#59413D] hover:text-red-600 hover:border-red-600/50 transition-all shadow-sm tooltip-trigger disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Xóa"
                              >
                                {deletingDocId === doc.doc_id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                           </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
