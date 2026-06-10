import React, { useState, useRef, useEffect } from "react";
import { Send, Book, Sparkles, Paperclip, Mic, X, Loader2, Copy, ThumbsUp, BrainCircuit, FileText, Menu, MessageSquare, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { chatService, type ChatMessage, type ConversationInfo } from "../services/chatService";
import { documentService, type DocumentInfo } from "../services/documentService";

const SUGGESTED_PROMPTS = [
  { icon: Book, title: "Tóm tắt tài liệu", text: "Hãy tóm tắt các ý chính trong chương 1" },
  { icon: Sparkles, title: "Giải thích khái niệm", text: "Giải thích khái niệm này một cách dễ hiểu" },
  { icon: BrainCircuit, title: "Tạo bài tập", text: "Tạo 5 câu hỏi trắc nghiệm từ nội dung này" }
];

export function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { conversationId?: string; docId?: string } | null;
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [likedMessages, setLikedMessages] = useState<Record<number, boolean>>({});

  useEffect(() => {
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

  useEffect(() => {
    if (routeState?.docId) {
      setSelectedDocId(routeState.docId);
    }
  }, [routeState?.docId]);

  useEffect(() => {
    if (!routeState?.conversationId) return;

    setIsLoading(true);
    chatService.getHistory(routeState.conversationId)
      .then(res => {
        setConversationId(res.conversation_id);
        setMessages(res.history);
        localStorage.setItem("chat_conversation_id", res.conversation_id);
      })
      .catch(err => console.error("Failed to load routed conversation", err))
      .finally(() => setIsLoading(false));
  }, [routeState?.conversationId]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load history on mount
  useEffect(() => {
    const savedConvId = localStorage.getItem("chat_conversation_id");
    if (savedConvId) {
      setIsLoading(true);
      chatService.getHistory(savedConvId)
        .then(res => {
          if (res.history && res.history.length > 0) {
            setConversationId(res.conversation_id);
            setMessages(res.history);
          } else {
            localStorage.removeItem("chat_conversation_id");
          }
        })
        .catch(err => {
          console.error("Failed to load history", err);
          localStorage.removeItem("chat_conversation_id");
        })
        .finally(() => setIsLoading(false));
    }
  }, []);

  const loadConversations = async () => {
    try {
      const res = await chatService.getConversations();
      setConversations(res);
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  const openDrawer = () => {
    loadConversations();
    setIsDrawerOpen(true);
  };

  const selectConversation = (id: string) => {
    setIsLoading(true);
    chatService.getHistory(id)
      .then(res => {
        setConversationId(res.conversation_id);
        setMessages(res.history);
        localStorage.setItem("chat_conversation_id", res.conversation_id);
        setIsDrawerOpen(false);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    localStorage.removeItem("chat_conversation_id");
    setIsDrawerOpen(false);
  };

  const getSelectedDocument = () => {
    return documents.find(doc => doc.doc_id === selectedDocId);
  };

  const getSuggestedTopic = (messageContent?: string) => {
    const selectedDocument = getSelectedDocument();
    if (selectedDocument) {
      return selectedDocument.filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
    }

    const lastUserMessage = [...messages].reverse().find(message => message.role === "user");
    return (lastUserMessage?.content || messageContent || "Noi dung chat").slice(0, 120);
  };

  const handleDocumentUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsUploadingDocument(true);
      const uploaded = await documentService.uploadDocument(file);
      const refreshed = await documentService.getDocuments();
      setDocuments(refreshed.documents);
      setSelectedDocId(uploaded.doc_id);
      setInput(`Hay tom tat tai lieu ${uploaded.filename}`);
    } catch (error) {
      console.error("Failed to upload document from chat", error);
      alert("Tai lieu upload that bai. Backend hien uu tien file PDF.");
    } finally {
      setIsUploadingDocument(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }
    }
  };

  const handleDocumentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleDocumentUpload(file);
    }
  };

  const copyMessage = async (content: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(messageIndex);
      window.setTimeout(() => setCopiedMessageIndex(null), 1500);
    } catch (error) {
      console.error("Failed to copy message", error);
      alert("Khong copy duoc noi dung.");
    }
  };

  const toggleLikeMessage = (messageIndex: number) => {
    setLikedMessages(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex],
    }));
  };

  const openQuizFromMessage = (messageContent: string) => {
    navigate("/quiz", {
      state: {
        docId: selectedDocId || undefined,
        topic: getSuggestedTopic(messageContent),
      },
    });
  };

  const openSlidesFromMessage = (messageContent: string) => {
    navigate("/slides", {
      state: {
        docId: selectedDocId || undefined,
        topic: getSuggestedTopic(messageContent),
      },
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
        
        setIsVoiceMode(false);
        setIsLoading(true);

        try {
          const res = await chatService.sendVoice(file, conversationId || undefined, selectedDocId || undefined);
          setConversationId(res.conversation_id);
          localStorage.setItem("chat_conversation_id", res.conversation_id);
          setMessages(prev => [
            ...prev, 
            { role: "user", content: res.transcribed_text },
            { role: "assistant", content: res.answer, citations: res.citations }
          ]);
        } catch (error) {
          console.error(error);
          alert("Lỗi nhận diện giọng nói.");
        } finally {
          setIsLoading(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Không có quyền truy cập Micro.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => isRecording ? stopRecording() : startRecording();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => scrollToBottom(), [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);

    // Thêm một tin nhắn rỗng của AI vào list để append dần
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    await chatService.streamMessage(
      {
        question: text,
        conversation_id: conversationId,
        doc_id: selectedDocId || undefined,
      },
      (chunk) => {
        setIsLoading(false); // Ẩn trạng thái "Đang suy nghĩ" ngay khi nhận được chunk đầu tiên
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant') {
            lastMsg.content += chunk;
          }
          return newMessages;
        });
      },
      (citations, newConvId) => {
        setConversationId(newConvId);
        localStorage.setItem("chat_conversation_id", newConvId);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant') {
            lastMsg.citations = citations;
          }
          return newMessages;
        });
      },
      (err) => {
        console.error("Lỗi stream:", err);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant' && !lastMsg.content) {
             lastMsg.content = "Đã có lỗi xảy ra. Xin thử lại.";
          }
          return newMessages;
        });
        setIsLoading(false);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9] relative">
      {/* Header Controls */}
      <div className="absolute top-4 right-8 z-30 flex gap-2">
        <button 
          onClick={openDrawer}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E1BFB9]/50 rounded-xl text-xs font-bold text-[#59413D] shadow-sm hover:shadow hover:text-[#9E2016] transition-all"
        >
          <Menu size={14} />
          Lịch sử Chat
        </button>
        {messages.length > 0 && (
          <button 
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 bg-[#9E2016] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#851b13] transition-all"
          >
            <Plus size={14} />
            Tạo mới
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto w-full flex flex-col items-center">
        {messages.length === 0 ? (
           <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
             className="flex flex-col items-center justify-center h-full w-full max-w-3xl px-8"
           >
              <div className="w-20 h-20 bg-gradient-to-br from-[#9E2016] to-[#C94B3E] rounded-3xl shadow-xl flex items-center justify-center text-white mb-8">
                 <BrainCircuit size={40} />
              </div>
              <h1 className="text-4xl font-['Playfair_Display',serif] italic font-bold text-[#261816] mb-4 text-center">
                Xin chào, tôi là trợ lý AI của bạn
              </h1>
              <p className="text-[#59413D] opacity-70 text-center mb-12 max-w-xl leading-relaxed">
                Tôi đã đọc và phân tích toàn bộ tài liệu trong thư viện của bạn. Bạn muốn bắt đầu với chủ đề nào hôm nay?
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ y: -4, scale: 1.02 }}
                    onClick={() => handleSend(prompt.text)}
                    className="glass-panel p-6 rounded-2xl text-left flex flex-col gap-4 border-[#E1BFB9]/40 hover:border-[#9E2016]/50 transition-colors group"
                  >
                     <div className="w-10 h-10 rounded-xl bg-[#FFF8F6] text-[#9E2016] flex items-center justify-center group-hover:bg-[#9E2016] group-hover:text-white transition-colors">
                       <prompt.icon size={20} />
                     </div>
                     <div>
                       <h3 className="font-bold text-[#261816] mb-1">{prompt.title}</h3>
                       <p className="text-xs text-[#59413D] opacity-70">{prompt.text}</p>
                     </div>
                  </motion.button>
                ))}
              </div>
           </motion.div>
        ) : (
          <div className="w-full max-w-4xl px-8 py-12 space-y-8 pb-48">
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9E2016] to-[#C94B3E] flex items-center justify-center text-white shrink-0 mt-2 shadow-md">
                    <BrainCircuit size={20} />
                  </div>
                )}
                
                <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                  <div className={`p-5 text-[15px] leading-relaxed rounded-3xl ${
                    msg.role === 'user' 
                    ? 'bg-[#261816] text-white rounded-tr-sm shadow-md' 
                    : 'glass-panel text-[#261816] rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-[#9E2016] prose-a:text-blue-600 prose-pre:bg-gray-100 prose-pre:p-2 prose-pre:rounded-lg prose-code:text-[#9E2016] prose-code:bg-[#FCEEEB] prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                  
                  {msg.role === 'assistant' && (
                    <div className="w-full space-y-4 mt-2">
                       {/* Citations */}
                       {msg.citations && msg.citations.length > 0 && (
                         <div className="flex gap-2 flex-wrap">
                           {msg.citations.map((cite, i) => {
                             const text = [cite.source, cite.page ? `Trang ${cite.page}` : ""].filter(Boolean).join(" - ");
                             return (
                               <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E1BFB9] rounded-lg text-xs font-['JetBrains_Mono',monospace] text-[#9E2016] hover:bg-[#FCEEEB] cursor-pointer transition-colors shadow-sm">
                                 <FileText size={12} />
                                 <span className="truncate max-w-[200px]">{text}</span>
                               </div>
                             );
                           })}
                         </div>
                       )}

                       {/* Action buttons */}
                       <div className="flex gap-2">
                         <button
                           onClick={() => copyMessage(msg.content, idx)}
                           className="p-2 hover:bg-[#E1BFB9]/20 rounded-lg text-[#59413D] opacity-60 hover:opacity-100 transition-all"
                           title="Copy"
                         >
                           <Copy size={16} />
                         </button>
                         {copiedMessageIndex === idx && (
                           <span className="px-2 py-1.5 text-[10px] font-bold text-green-700 bg-green-100 rounded-lg">
                             Copied
                           </span>
                         )}
                         <button
                           onClick={() => toggleLikeMessage(idx)}
                           className={`p-2 hover:bg-[#E1BFB9]/20 rounded-lg transition-all ${
                             likedMessages[idx]
                               ? "text-[#9E2016] opacity-100 bg-[#FCEEEB]"
                               : "text-[#59413D] opacity-60 hover:opacity-100"
                           }`}
                           title="Danh dau cau tra loi huu ich"
                         >
                           <ThumbsUp size={16} className={likedMessages[idx] ? "fill-[#9E2016]/20" : ""} />
                         </button>
                         <div className="h-6 w-px bg-[#E1BFB9]/50 mx-1 my-auto"></div>
                         <button onClick={() => openQuizFromMessage(msg.content)} className="px-3 py-1.5 hover:bg-[#E1BFB9]/20 rounded-lg text-xs font-bold text-[#59413D] hover:text-[#9E2016] transition-all">
                           Tạo Quiz
                         </button>
                         <button onClick={() => openSlidesFromMessage(msg.content)} className="px-3 py-1.5 hover:bg-[#E1BFB9]/20 rounded-lg text-xs font-bold text-[#59413D] hover:text-[#9E2016] transition-all">
                           Tạo Slide
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9E2016] to-[#C94B3E] flex items-center justify-center text-white shrink-0 mt-2 shadow-md">
                  <BrainCircuit size={20} className="animate-pulse" />
                </div>
                <div className="glass-panel p-5 rounded-3xl rounded-tl-sm text-[#59413D] flex items-center gap-3">
                  <span className="text-sm font-bold">Đang suy nghĩ</span>
                  <div className="flex gap-1">
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-[#9E2016] rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#9E2016] rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#9E2016] rounded-full" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#FAFAF9] via-[#FAFAF9] to-transparent pt-20 pb-8 px-4 z-20">
         <div className="max-w-4xl mx-auto">
            <div className="glass-panel rounded-[2rem] p-2 flex items-end gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border-[#E1BFB9]/50 focus-within:border-[#9E2016]/30 focus-within:shadow-[0_10px_40px_rgba(158,32,22,0.1)] transition-all bg-white/90">
               <input
                 ref={documentInputRef}
                 type="file"
                 accept=".pdf"
                 className="hidden"
                 onChange={handleDocumentInputChange}
               />
               <button
                 onClick={() => documentInputRef.current?.click()}
                 disabled={isUploadingDocument || isLoading}
                 className="p-4 text-[#59413D] opacity-50 hover:opacity-100 hover:text-[#9E2016] transition-colors rounded-full hover:bg-[#FCEEEB] disabled:cursor-not-allowed disabled:opacity-40"
                 title="Upload PDF"
               >
                 {isUploadingDocument ? (
                   <Loader2 size={20} className="animate-spin" />
                 ) : (
                   <Paperclip size={20} />
                 )}
               </button>
               <div className="flex-1 flex flex-col">
                 {/* Document Selector */}
                 <div className="px-4 pt-2 pb-1 border-b border-[#E1BFB9]/30 flex items-center gap-2">
                    <Book size={14} className="text-[#59413D] opacity-60" />
                    <select 
                      value={selectedDocId} 
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="bg-transparent text-xs font-['DM_Sans',sans-serif] text-[#59413D] focus:outline-none focus:text-[#9E2016] cursor-pointer appearance-none flex-1 truncate"
                    >
                      <option value="">Tất cả tài liệu (Tìm kiếm tổng hợp)</option>
                      {documents.map(doc => (
                        <option key={doc.doc_id} value={doc.doc_id}>{doc.filename}</option>
                      ))}
                    </select>
                 </div>
                 
                 <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedDocId ? "Hỏi về tài liệu đã chọn..." : "Hỏi AI về toàn bộ tài liệu của bạn..."}
                    className="w-full max-h-32 min-h-[56px] px-4 py-3 bg-transparent border-none focus:outline-none resize-none text-[#261816] font-medium placeholder:text-[#59413D]/40"
                 />
               </div>
               <div className="flex items-center gap-2 p-2">
                  <button 
                    onClick={() => setIsVoiceMode(true)}
                    className="p-3 text-[#59413D] hover:text-[#9E2016] hover:bg-[#FCEEEB] rounded-full transition-colors"
                  >
                    <Mic size={20} />
                  </button>
                  <button 
                    onClick={() => handleSend(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-[#9E2016] text-white p-3 rounded-full hover:bg-[#851b13] disabled:opacity-50 disabled:hover:bg-[#9E2016] transition-all hover:scale-105"
                  >
                     {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
                  </button>
               </div>
            </div>
            <div className="text-center mt-3">
               <span className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] opacity-40 uppercase tracking-widest">
                 EduMind AI có thể đưa ra thông tin không chính xác. Hãy luôn kiểm chứng.
               </span>
            </div>
         </div>
      </div>

      {/* History Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col border-r border-[#E1BFB9]/30"
            >
               <div className="p-6 border-b border-[#E1BFB9]/30 flex justify-between items-center bg-[#FAFAF9]">
                 <h2 className="font-['Playfair_Display',serif] font-bold text-xl italic text-[#261816]">Lịch sử chat</h2>
                 <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-[#E1BFB9]/20 rounded-full text-[#59413D]">
                   <X size={20} />
                 </button>
               </div>
               
               <div className="p-4">
                 <button 
                   onClick={handleNewChat}
                   className="w-full flex items-center justify-center gap-2 py-3 bg-[#FCEEEB] text-[#9E2016] rounded-xl font-bold text-sm hover:bg-[#E1BFB9]/30 transition-colors"
                 >
                   <Plus size={16} /> Bắt đầu cuộc trò chuyện mới
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {conversations.length === 0 ? (
                   <div className="text-center text-[#59413D] opacity-60 mt-10 text-sm">Chưa có cuộc trò chuyện nào</div>
                 ) : (
                   conversations.map(conv => (
                     <button 
                       key={conv.conversation_id}
                       onClick={() => selectConversation(conv.conversation_id)}
                       className={`w-full text-left p-4 rounded-2xl flex flex-col gap-1 transition-all ${
                         conv.conversation_id === conversationId 
                         ? 'bg-[#9E2016] text-white shadow-md' 
                         : 'hover:bg-[#FAFAF9] border border-transparent hover:border-[#E1BFB9]/30 text-[#261816]'
                       }`}
                     >
                       <div className="flex items-center gap-2">
                         <MessageSquare size={14} className={conv.conversation_id === conversationId ? "text-white/70" : "text-[#59413D]/50"} />
                         <span className="font-bold text-sm truncate flex-1">{conv.title}</span>
                       </div>
                       <span className={`text-[10px] ml-6 ${conv.conversation_id === conversationId ? "text-white/60" : "text-[#59413D]/40"}`}>
                         {new Date(conv.updated_at).toLocaleString('vi-VN')}
                       </span>
                     </button>
                   ))
                 )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voice Overlay */}
      <AnimatePresence>
        {isVoiceMode && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 bg-[#FFF8F6]/80 z-[100] flex flex-col items-center justify-center"
          >
            <button 
              onClick={() => setIsVoiceMode(false)}
              className="absolute top-8 right-8 p-4 text-[#59413D] hover:text-[#9E2016] bg-white rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center space-y-12">
               <motion.div 
                 animate={isRecording ? { scale: [1, 1.2, 1] } : {}} 
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="relative"
               >
                 <div className="absolute inset-0 bg-[#9E2016]/20 rounded-full blur-3xl" />
                 <button 
                   onClick={toggleRecording}
                   className={`w-40 h-40 rounded-full flex items-center justify-center transition-all relative z-10 border-4 ${
                     isRecording 
                     ? 'bg-[#9E2016] text-white border-white shadow-[0_0_80px_rgba(158,32,22,0.5)]' 
                     : 'bg-white text-[#9E2016] border-[#FCEEEB] shadow-2xl hover:scale-105'
                   }`}
                 >
                   <Mic size={48} className={isRecording ? 'animate-pulse' : ''} />
                 </button>
               </motion.div>
               <h2 className="text-[#261816] font-['Playfair_Display',serif] italic text-4xl text-center px-4">
                 {isRecording ? "Đang lắng nghe..." : "Nhấn để bắt đầu nói"}
               </h2>
               {isRecording && (
                 <div className="flex gap-2">
                   {[1,2,3,4,5].map(i => (
                     <motion.div 
                      key={i} animate={{ height: [16, 48, 16] }} 
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-2 bg-[#9E2016] rounded-full"
                     />
                   ))}
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
