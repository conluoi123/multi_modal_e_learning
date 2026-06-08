import React, { useState } from "react";
import { Sparkles, Download, CheckCircle, ChevronDown, Presentation, Layout as LayoutIcon, FileText, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { slideService } from "../services/slideService";
import { documentService, type DocumentInfo } from "../services/documentService";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function CreateLecture() {
  const [topic, setTopic] = useState("");
  const [nSlides, setNSlides] = useState(7);
  const [theme, setTheme] = useState("academic");
  
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSlide, setGeneratedSlide] = useState<{
    filename: string;
    downloadUrl: string;
    slideCount: number;
    citations: any[];
  } | null>(null);

  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");

  React.useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await documentService.getDocuments();
        setDocuments(res.documents);
      } catch (err) {
        console.error("Lỗi khi tải danh sách tài liệu", err);
      }
    };
    fetchDocs();
  }, []);

  const themes = [
    { name: "academic", label: "The Professor", desc: "Cổ điển & Tinh giản", img: "" },
    { name: "corporate", label: "Dark Scholarly", desc: "Chuyên nghiệp & Hiện đại", img: "https://images.unsplash.com/photo-1502485019198-a625bd53ceb7" },
    { name: "minimal", label: "Journal", desc: "Tạp chí & Nghệ thuật", img: "https://images.unsplash.com/photo-1622993361017-180360aea82c" },
  ];

  const handleGenerate = async () => {
    if (!topic) return alert("Vui lòng nhập chủ đề bài giảng!");
    
    setIsLoading(true);
    setGeneratedSlide(null);
    
    try {
      const res = await slideService.generateSlides({
        topic,
        n_slides: nSlides,
        template_name: theme,
        language: "vi",
        doc_id: selectedDocId || undefined
      });
      
      setGeneratedSlide({
        filename: res.filename,
        downloadUrl: slideService.getDownloadUrl(res.filename),
        slideCount: res.slide_count,
        citations: res.citations,
      });
    } catch (error) {
      console.error("Lỗi khi tạo slide:", error);
      alert("Đã có lỗi xảy ra hoặc không tìm thấy tài liệu phù hợp để tạo bài giảng.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col lg:flex-row h-full min-h-screen bg-[#FAFAF9]"
    >
      {/* Configuration Sidebar / Form */}
      <div className="flex-1 p-8 lg:p-12 space-y-12">
        <header className="space-y-4">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E1BFB9]/50 rounded-full text-[#9E2016] text-[10px] font-['JetBrains_Mono',monospace] font-bold uppercase tracking-widest shadow-sm">
             <Presentation size={14} /> AI LECTURE STUDIO
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-[#261816] font-['Playfair_Display',serif] text-5xl font-bold italic">
            Soạn Bài Giảng <span className="text-[#9E2016]">Thông Minh</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-[#59413D] opacity-80 max-w-xl font-['DM_Sans',sans-serif]">
            Hệ thống AI sẽ tự động trích xuất thông tin từ tài liệu của bạn, tổ chức lại cấu trúc và tạo ra các slide bài giảng chuyên nghiệp chỉ trong vài giây.
          </motion.p>
        </header>

        <motion.div variants={itemVariants} className="space-y-10 max-w-2xl relative z-10">
          {/* Topic */}
          <div className="glass-panel p-8 rounded-3xl space-y-6">
            <label className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#9E2016]"></span>
              Chủ đề bài giảng
            </label>
            <input 
              type="text" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="VD: Nhập môn Trí tuệ nhân tạo..." 
              className="w-full bg-transparent border-b border-[#E1BFB9] pb-4 text-3xl font-['Playfair_Display',serif] italic focus:outline-none focus:border-[#9E2016] placeholder:text-[#E1BFB9] transition-colors text-[#261816]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Number of slides */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
               <label className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#59413D]"></span>
                  Số lượng Slide
               </label>
               <div className="flex items-center gap-4 bg-white/50 border border-[#E1BFB9]/50 rounded-2xl p-4">
                  <input 
                    type="number" 
                    value={nSlides}
                    onChange={e => setNSlides(Number(e.target.value))}
                    className="w-16 bg-transparent text-2xl font-bold font-['DM_Sans',sans-serif] focus:outline-none text-center text-[#9E2016]" 
                    min={3} max={20}
                  />
                  <div className="h-8 w-px bg-[#E1BFB9]/50" />
                  <span className="text-sm text-[#59413D] opacity-80 font-medium">Trang trình bày</span>
               </div>
            </div>

            {/* Content Type */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
               <label className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#59413D]"></span>
                  Loại nội dung
               </label>
               <div className="flex gap-2">
                  <button className="flex-1 py-3 bg-gradient-to-br from-[#9E2016] to-[#C94B3E] text-white text-xs font-bold rounded-xl shadow-md">
                    Học Thuật
                  </button>
                  <button className="flex-1 py-3 bg-white text-[#59413D] text-xs font-bold rounded-xl border border-[#E1BFB9]/50 hover:border-[#9E2016]/50 transition-colors">
                    Tóm Tắt
                  </button>
               </div>
            </div>
            
            {/* Document Source */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 md:col-span-2">
               <label className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#59413D]"></span>
                  Nguồn tài liệu
               </label>
               <div className="flex items-center gap-4 bg-white/50 border border-[#E1BFB9]/50 rounded-2xl p-4">
                  <select 
                    value={selectedDocId} 
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full bg-transparent text-sm font-['DM_Sans',sans-serif] text-[#59413D] focus:outline-none focus:text-[#9E2016] cursor-pointer appearance-none truncate"
                  >
                    <option value="">Tất cả tài liệu</option>
                    {documents.map(doc => (
                      <option key={doc.doc_id} value={doc.doc_id}>{doc.filename}</option>
                    ))}
                  </select>
               </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-6">
            <label className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#9E2016]"></span>
              Chủ đề thiết kế
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {themes.map(t => (
                <motion.button 
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={t.name} 
                  onClick={() => setTheme(t.name)}
                  className={`relative aspect-[4/3] rounded-3xl transition-all overflow-hidden group text-left ${t.name === theme ? 'ring-2 ring-[#9E2016] ring-offset-4 ring-offset-[#FAFAF9] shadow-xl' : 'border border-[#E1BFB9]/50 hover:border-[#9E2016]/50 shadow-sm'}`}
                >
                   {t.img ? (
                     <>
                       <ImageWithFallback src={t.img} alt={t.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                     </>
                   ) : (
                     <div className="w-full h-full bg-white flex flex-col items-center justify-center p-4">
                        <div className="w-full h-full border border-dashed border-[#E1BFB9] rounded-2xl flex flex-col items-center justify-center">
                           <LayoutIcon size={24} className="text-[#9E2016] mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                     </div>
                   )}
                   <div className={`absolute bottom-0 left-0 right-0 p-4 ${t.img ? 'text-white' : 'text-[#261816]'}`}>
                     <h4 className="font-['Playfair_Display',serif] italic text-lg font-bold">{t.label}</h4>
                     <p className={`text-xs mt-1 ${t.img ? 'opacity-80' : 'text-[#59413D] opacity-60'}`}>{t.desc}</p>
                   </div>
                   
                   {t.name === theme && (
                     <div className="absolute top-3 right-3 w-6 h-6 bg-[#9E2016] rounded-full flex items-center justify-center text-white shadow-lg">
                       <CheckCircle size={12} />
                     </div>
                   )}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button 
            whileHover={!isLoading ? { scale: 1.02 } : {}}
            whileTap={!isLoading ? { scale: 0.98 } : {}}
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#9E2016] to-[#C94B3E] text-white py-6 rounded-3xl flex items-center justify-center gap-3 font-bold uppercase tracking-wider shadow-[0_10px_40px_rgba(158,32,22,0.3)] hover:shadow-[0_10px_40px_rgba(158,32,22,0.5)] transition-all disabled:opacity-70 disabled:shadow-none relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-white/20 blur-md translate-x-[-100%] animate-[shimmer_2s_infinite]" />
             {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
             {isLoading ? "Đang phân tích & Tổng hợp slide..." : "Bắt đầu tạo bài giảng"}
          </motion.button>
        </motion.div>
      </div>

      {/* Preview / Status Column */}
      <div className="w-full lg:w-[450px] p-8 lg:p-12 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 glass-panel border-l border-[#E1BFB9]/30 rounded-none z-0" />
        
        <div className="relative z-10 h-full flex flex-col">
           <h3 className="text-[#261816] font-bold font-['DM_Sans',sans-serif] text-xl mb-8 flex items-center gap-2">
             <LayoutIcon className="text-[#9E2016]" /> Xem trước kết quả
           </h3>

           <div className="flex-1 flex flex-col justify-center">
             <AnimatePresence mode="wait">
               {isLoading ? (
                 <motion.div 
                   key="loading"
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   className="flex flex-col items-center justify-center text-center space-y-6"
                 >
                   <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-[#9E2016] to-[#C94B3E] rounded-3xl shadow-xl flex items-center justify-center text-white relative z-10">
                        <Loader2 size={40} className="animate-spin" />
                      </div>
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} 
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-[#9E2016]/30 rounded-3xl blur-xl"
                      />
                   </div>
                   <div>
                     <h3 className="text-[#261816] font-['Playfair_Display',serif] italic text-2xl font-bold mb-2">Đang xử lý</h3>
                     <p className="text-[#59413D] opacity-60 text-sm">AI đang tổng hợp nội dung và cấu trúc slide cho bạn...</p>
                   </div>
                 </motion.div>
               ) : generatedSlide ? (
                 <motion.div 
                   key="result"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-white rounded-[2rem] p-8 shadow-xl border border-[#E1BFB9]/50 relative"
                 >
                    <div className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-full shadow-lg">
                      <CheckCircle size={24} />
                    </div>

                    <div className="w-16 h-16 bg-[#FCEEEB] text-[#9E2016] flex items-center justify-center rounded-2xl mb-6">
                      <Presentation size={32} />
                    </div>

                    <h2 className="text-2xl font-['Playfair_Display',serif] font-bold leading-tight text-[#261816] mb-6">
                      {topic}
                    </h2>

                    <div className="space-y-4 mb-8">
                       <div className="flex items-center justify-between p-4 bg-[#FAFAF9] rounded-xl border border-[#E1BFB9]/30">
                          <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Số Slide</span>
                          <span className="text-lg font-bold text-[#9E2016] font-['DM_Sans',sans-serif]">{generatedSlide.slideCount}</span>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-[#FAFAF9] rounded-xl border border-[#E1BFB9]/30">
                          <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Theme</span>
                          <span className="text-sm font-bold text-[#261816] font-['DM_Sans',sans-serif] capitalize">{theme}</span>
                       </div>
                    </div>

                    <a 
                       href={generatedSlide.downloadUrl}
                       target="_blank"
                       rel="noreferrer"
                       download
                       className="w-full bg-[#9E2016] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#851b13] transition-colors shadow-md group"
                    >
                       <Download size={16} />
                       TẢI XUỐNG BÀI GIẢNG
                       <ArrowRight size={16} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </a>
                 </motion.div>
               ) : (
                 <motion.div 
                   key="empty"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="flex flex-col items-center justify-center text-center opacity-40"
                 >
                   <Presentation size={64} className="mb-6 text-[#59413D]" />
                   <p className="text-[#59413D] font-['Playfair_Display',serif] italic text-xl">
                     Kết quả bài giảng sẽ hiển thị tại đây
                   </p>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
