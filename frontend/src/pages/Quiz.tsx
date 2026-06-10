import { useState, useEffect } from "react";
import { Check, X, CheckCircle2, Loader2, Play, BrainCircuit, Trophy, RefreshCw } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useLocation } from "react-router-dom";
import { quizService, type QuizQuestion } from "../services/quizService";
import { documentService, type DocumentInfo } from "../services/documentService";
import { settingsService } from "../services/settingsService";

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

export function Quiz() {
  const location = useLocation();
  const routeState = location.state as { docId?: string; topic?: string } | null;
  const [topic, setTopic] = useState(routeState?.topic || "");
  const [difficulty, setDifficulty] = useState<'basic' | 'standard' | 'advanced'>("standard");
  const [nQuestions, setNQuestions] = useState(3);
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const [res, savedSettings] = await Promise.all([
          documentService.getDocuments(),
          settingsService.getSettings(),
        ]);
        setDocuments(res.documents);
        setDifficulty(savedSettings.default_quiz_difficulty);
        setNQuestions(savedSettings.default_quiz_count);
      } catch (err) {
        console.error("Lỗi khi tải danh sách tài liệu", err);
      }
    };
    fetchDocs();
  }, []);

  useEffect(() => {
    if (routeState?.docId) {
      setSelectedDocId(routeState.docId);
    }
    if (routeState?.topic) {
      setTopic(routeState.topic);
    }
  }, [routeState?.docId, routeState?.topic]);

  const handleGenerate = async () => {
    if (!topic) return alert("Vui lòng nhập chủ đề!");
    
    setIsLoading(true);
    setHasStarted(false);
    setShowResults(false);
    setSelectedAnswers({});
    
    try {
      const res = await quizService.generateQuiz({
        topic,
        n_questions: nQuestions,
        difficulty,
        doc_id: selectedDocId || undefined
      });
      setQuestions(res.questions);
      setHasStarted(true);
    } catch (error) {
      console.error("Lỗi khi tạo quiz:", error);
      alert("Đã có lỗi xảy ra hoặc không tìm thấy tài liệu liên quan đến chủ đề này.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (qIndex: number, optionKey: string) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: optionKey
    }));
  };

  const handleSubmitQuiz = () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      return alert("Vui lòng trả lời tất cả các câu hỏi trước khi nộp bài.");
    }
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.answer) score++;
    });
    return Math.round((score / questions.length) * 100);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12"
    >
      <header className="space-y-4 text-center">
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E1BFB9]/50 rounded-full text-[#9E2016] text-[10px] font-['JetBrains_Mono',monospace] font-bold uppercase tracking-widest shadow-sm">
          <BrainCircuit size={14} /> AI QUERIES
        </motion.div>
        <motion.h1 variants={itemVariants} className="text-[#261816] font-['Playfair_Display',serif] text-5xl font-bold italic">
          Luyện tập <span className="text-[#9E2016]">Trắc nghiệm</span>
        </motion.h1>
      </header>

      <AnimatePresence mode="wait">
        {!hasStarted ? (
          <motion.div 
            key="generator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel rounded-[2rem] p-8 md:p-12 space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#9E2016]/10 to-transparent blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="text-center space-y-2 relative z-10">
              <h2 className="text-[#261816] text-3xl font-['Playfair_Display',serif] italic font-bold">Quiz Generator</h2>
              <p className="text-[#59413D] opacity-80 font-['DM_Sans',sans-serif]">Tạo bộ câu hỏi chuẩn hóa từ kho dữ liệu học thuật của bạn.</p>
            </div>

            <div className="space-y-6 relative z-10 max-w-xl mx-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#59413D] uppercase tracking-wider ml-1">Chủ đề bài kiểm tra</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="VD: Kinh tế học vĩ mô, Triết học Mác..." 
                    className="w-full bg-white/50 border border-[#E1BFB9]/50 rounded-2xl p-4 pl-5 focus:bg-white focus:border-[#9E2016]/50 focus:outline-none transition-all font-['DM_Sans',sans-serif] shadow-sm text-[#261816] placeholder:text-[#59413D]/40"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#59413D] uppercase tracking-wider ml-1">Độ khó</label>
                  <select 
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="w-full bg-white/50 border border-[#E1BFB9]/50 rounded-2xl p-4 focus:bg-white focus:border-[#9E2016]/50 focus:outline-none transition-all text-[#261816] font-medium appearance-none"
                  >
                    <option value="basic">Mức độ Nhận biết</option>
                    <option value="standard">Mức độ Vận dụng</option>
                    <option value="advanced">Mức độ Chuyên sâu</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#59413D] uppercase tracking-wider ml-1">Số lượng câu</label>
                  <input 
                    type="number" 
                    value={nQuestions}
                    onChange={e => setNQuestions(Number(e.target.value))}
                    min={1} max={10}
                    className="w-full bg-white/50 border border-[#E1BFB9]/50 rounded-2xl p-4 focus:bg-white focus:border-[#9E2016]/50 focus:outline-none transition-all text-[#261816] font-medium"
                  />
                </div>
              </div>

              {/* Document Selector */}
              <div className="space-y-2">
                 <label className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-widest ml-1">Nguồn tài liệu</label>
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

            <div className="pt-4 flex justify-center relative z-10">
              <motion.button 
                whileHover={!isLoading ? { scale: 1.05 } : {}}
                whileTap={!isLoading ? { scale: 0.95 } : {}}
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-gradient-to-br from-[#9E2016] to-[#C94B3E] text-white px-10 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all disabled:opacity-50 min-w-[200px]"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} className="fill-current" />}
                {isLoading ? "Đang xử lý..." : "Khởi tạo bài thi"}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Progress / Score Header */}
            <div className="sticky top-6 z-50 glass-panel rounded-2xl p-4 flex items-center justify-between border-[#E1BFB9]/50 shadow-md">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-[#FFF8F6] rounded-xl flex items-center justify-center text-[#9E2016] font-bold font-['Playfair_Display',serif]">
                   {Object.keys(selectedAnswers).length}/{questions.length}
                 </div>
                 <div className="hidden sm:block">
                   <p className="text-[#261816] font-bold text-sm">Tiến độ làm bài</p>
                   <div className="w-32 h-1.5 bg-[#E1BFB9]/30 rounded-full mt-1 overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${(Object.keys(selectedAnswers).length / questions.length) * 100}%` }}
                       className="h-full bg-[#9E2016] rounded-full"
                     />
                   </div>
                 </div>
               </div>
               
               {showResults && (
                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold font-['JetBrains_Mono',monospace]">
                   <Trophy size={18} /> Điểm số: {calculateScore()}%
                 </motion.div>
               )}

               {!showResults ? (
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={handleSubmitQuiz}
                   className="bg-[#9E2016] text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                 >
                   <CheckCircle2 size={16} /> Nộp bài
                 </motion.button>
               ) : (
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => { setHasStarted(false); setShowResults(false); setTopic(""); }}
                   className="bg-white border border-[#E1BFB9] text-[#59413D] hover:text-[#9E2016] hover:border-[#9E2016]/50 px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-sm transition-all"
                 >
                   <RefreshCw size={16} /> Làm bài khác
                 </motion.button>
               )}
            </div>

            {/* Questions List */}
            <div className="space-y-8">
              {questions.map((q, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={index} 
                  className="bg-white rounded-3xl p-8 border border-[#E1BFB9]/50 shadow-sm relative overflow-hidden"
                >
                  <div className="flex gap-4 mb-8">
                    <span className="text-[#9E2016]/20 font-['Playfair_Display',serif] text-6xl font-bold italic leading-none shrink-0 -mt-2 -ml-2">
                      Q{index + 1}
                    </span>
                    <h3 className="text-[#261816] text-xl font-bold font-['DM_Sans',sans-serif] leading-relaxed relative z-10 pt-2">
                      {q.question}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((optionText, optIndex) => {
                      const isSelected = selectedAnswers[index] === optionText;
                      const isCorrect = optionText === q.answer;
                      
                      let btnClass = `p-4 rounded-2xl text-left border-2 transition-all relative overflow-hidden group `;
                      
                      if (!showResults) {
                        btnClass += isSelected 
                          ? 'border-[#9E2016] bg-[#FFF8F6] shadow-sm' 
                          : 'border-[#E1BFB9]/30 hover:border-[#9E2016]/50 bg-[#FAFAF9] hover:bg-white';
                      } else {
                        if (isCorrect) {
                          btnClass += 'border-green-500 bg-green-50 text-green-900';
                        } else if (isSelected && !isCorrect) {
                          btnClass += 'border-red-400 bg-red-50 text-red-900';
                        } else {
                          btnClass += 'border-[#E1BFB9]/30 bg-[#FAFAF9] opacity-50';
                        }
                      }

                      const letterKeys = ["A", "B", "C", "D"];
                      const letter = letterKeys[optIndex] || String(optIndex + 1);

                      return (
                        <motion.button 
                          whileHover={!showResults ? { scale: 1.01 } : {}}
                          whileTap={!showResults ? { scale: 0.99 } : {}}
                          key={optIndex}
                          onClick={() => handleSelectOption(index, optionText)}
                          className={btnClass}
                          disabled={showResults}
                        >
                          <div className="flex items-start gap-4 relative z-10">
                            {!showResults ? (
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-[#9E2016]' : 'border-[#E1BFB9]'}`}>
                                {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 rounded-full bg-[#9E2016]" />}
                              </div>
                            ) : (
                              <div className="w-6 h-6 shrink-0 flex items-center justify-center mt-0.5">
                                {isCorrect ? <Check size={20} className="text-green-600 font-bold" /> : (isSelected ? <X size={20} className="text-red-500 font-bold" /> : <div className="w-6 h-6 rounded-full border-2 border-[#E1BFB9]/50" />)}
                              </div>
                            )}
                            <div>
                              <span className="font-bold mr-2 opacity-60">{letter}.</span>
                              <span className="text-[15px] font-medium leading-relaxed">{optionText}</span>
                            </div>
                          </div>
                          
                          {/* Accent line on left for selected */}
                          {isSelected && !showResults && (
                            <motion.div layoutId={`select-accent-${index}`} className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#9E2016]" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {showResults && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 bg-[#FAFAF9] border border-[#E1BFB9]/50 rounded-2xl p-6 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-['JetBrains_Mono',monospace] text-[#9E2016] uppercase tracking-[0.2em] font-bold">
                        <BrainCircuit size={16} /> Lời giải chi tiết
                      </div>
                      <p className="text-[#59413D] text-[15px] leading-relaxed font-['DM_Sans',sans-serif]">
                        {q.explanation}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
