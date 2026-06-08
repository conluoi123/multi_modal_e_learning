import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, MessageSquare, Clock, MoreVertical, Star, TrendingUp, BookOpen, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { documentService, type DocumentInfo } from "../services/documentService";
import { chatService, type ConversationInfo } from "../services/chatService";

const chartData = [
  { day: "MON", current: 30, last: 20 },
  { day: "TUE", current: 45, last: 35 },
  { day: "WED", current: 35, last: 50 },
  { day: "THU", current: 60, last: 40 },
  { day: "FRI", current: 80, last: 55 },
  { day: "SAT", current: 70, last: 45 },
  { day: "SUN", current: 50, last: 30 },
];

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

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [recentDocs, setRecentDocs] = useState<DocumentInfo[]>([]);
  const [recentChats, setRecentChats] = useState<ConversationInfo[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, chatsRes] = await Promise.all([
          documentService.getDocuments(),
          chatService.getConversations()
        ]);
        setRecentDocs(docsRes.documents || []);
        setRecentChats(chatsRes || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => <div key={i} className="h-32 bg-[#E1BFB9]/20 animate-pulse rounded-3xl" />)}
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 h-96 bg-[#E1BFB9]/20 animate-pulse rounded-3xl" />
           <div className="lg:col-span-4 h-96 bg-[#E1BFB9]/20 animate-pulse rounded-3xl" />
         </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 space-y-8 max-w-7xl mx-auto w-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <motion.h1 variants={itemVariants} className="text-[#261816] font-['Playfair_Display',serif] text-4xl font-bold italic tracking-tight">Chào buổi sáng, Học Viên!</motion.h1>
          <motion.p variants={itemVariants} className="text-[#59413D] opacity-80 mt-1 font-['DM_Sans',sans-serif]">Hôm nay là một ngày tuyệt vời để khám phá tri thức mới.</motion.p>
        </div>
        <motion.div variants={itemVariants} className="px-4 py-2 bg-white rounded-full border border-[#E1BFB9]/50 shadow-sm flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-xs font-bold text-[#59413D]">Hệ thống RAG sẵn sàng</span>
        </motion.div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "SỐ GIỜ HỌC", value: "12.5h", trend: "+1.2h", icon: Clock },
          { label: "TÀI LIỆU ĐÃ PHÂN TÍCH", value: recentDocs.length.toString(), trend: "+ Mới", icon: BookOpen, highlight: true },
          { label: "CUỘC TRÒ CHUYỆN AI", value: recentChats.length.toString(), trend: "Tích cực", icon: BrainCircuit },
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants} className="glass-panel-accent rounded-3xl p-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <stat.icon size={80} />
             </div>
             <div className="flex justify-between items-start mb-4 relative z-10">
               <span className="text-[#59413D] text-[11px] font-bold font-['JetBrains_Mono',monospace] uppercase tracking-wider">
                 {stat.label}
               </span>
               <div className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md">
                 <TrendingUp size={12} /> {stat.trend}
               </div>
             </div>
             <div className="relative z-10">
               <span className={`text-5xl font-['DM_Sans',sans-serif] font-bold tracking-tight ${stat.highlight ? 'text-gradient' : 'text-[#261816]'}`}>
                 {stat.value}
               </span>
             </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Progress Chart */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-8">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-[#261816] font-['Playfair_Display',serif] italic text-2xl font-bold">Tiến độ học tập</h2>
                  <p className="text-sm text-[#59413D] opacity-70 mt-1">Số giờ tương tác với AI trong 7 ngày qua</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 text-xs font-['DM_Sans',sans-serif] font-bold">
                     <div className="w-3 h-3 rounded bg-[#9E2016]"></div> Tuần này
                   </div>
                   <div className="flex items-center gap-2 text-xs font-['DM_Sans',sans-serif] font-bold opacity-50">
                     <div className="w-3 h-3 rounded bg-[#E1BFB9]"></div> Tuần trước
                   </div>
                </div>
             </div>
             <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9E2016" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#9E2016" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1BFB9" opacity={0.4} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#59413D', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#59413D' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                      cursor={{ stroke: '#E1BFB9', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="current" stroke="#9E2016" strokeWidth={3} fillOpacity={1} fill="url(#colorCurrent)" />
                    <Area type="monotone" dataKey="last" stroke="#D1AFA9" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#261816] font-['Playfair_Display',serif] italic text-2xl font-bold">Hoạt động gần đây</h2>
              <button className="text-[#9E2016] text-sm font-bold hover:underline">Xem tất cả</button>
            </div>
            <div className="space-y-4">
              {recentChats.length === 0 ? (
                 <div className="text-center text-[#59413D] opacity-60 mt-10 text-sm">Chưa có hoạt động nào</div>
              ) : recentChats.slice(0, 4).map((chat, i) => (
                <Link to="/chat" key={chat.conversation_id}>
                  <motion.div whileHover={{ scale: 1.01 }} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-[#E1BFB9]/30 hover:border-[#E1BFB9] transition-all cursor-pointer mb-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#FFF8F6] flex items-center justify-center text-[#9E2016]">
                        <BrainCircuit size={18} />
                      </div>
                      <div>
                        <h3 className="text-[#261816] font-bold text-sm max-w-xs truncate">{chat.title}</h3>
                        <p className="text-[#59413D] text-xs opacity-70 mt-0.5">{new Date(chat.updated_at).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider bg-green-100 text-green-700">
                      Hoàn thành
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Right Section */}
        <div className="lg:col-span-4 space-y-8">
           {/* Quick Actions */}
           <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Link to="/documents">
                 <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-[#9E2016] to-[#C94B3E] rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <FileText size={24} className="mb-4 opacity-90" />
                    <h3 className="font-['Playfair_Display',serif] italic text-xl font-bold mb-1">Upload Tài Liệu</h3>
                    <p className="text-xs opacity-80 font-['DM_Sans',sans-serif] leading-relaxed">Đưa tài liệu cho AI phân tích ngay.</p>
                 </motion.div>
              </Link>
              <Link to="/chat">
                 <motion.div whileHover={{ y: -4 }} className="glass-panel rounded-3xl p-6 text-[#261816] hover:border-[#9E2016]/50 transition-all">
                    <MessageSquare size={24} className="mb-4 text-[#9E2016]" />
                    <h3 className="font-['Playfair_Display',serif] italic text-xl font-bold mb-1">Chat với AI</h3>
                    <p className="text-xs text-[#59413D] opacity-80 font-['DM_Sans',sans-serif] leading-relaxed">Hỏi đáp đa phương thức RAG.</p>
                 </motion.div>
              </Link>
           </motion.div>

           {/* Library */}
           <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-[#261816] font-['Playfair_Display',serif] italic text-xl font-bold">Thư viện của tôi</h2>
                 <Link to="/documents" className="text-[#9E2016] text-[10px] font-['JetBrains_Mono',monospace] hover:underline uppercase font-bold">Xem tất cả</Link>
              </div>
              <div className="space-y-4">
                 {recentDocs.length === 0 ? (
                   <div className="text-center text-[#59413D] opacity-60 mt-10 text-sm">Chưa tải tài liệu nào</div>
                 ) : recentDocs.slice(0, 3).map((doc, i) => (
                   <div key={doc.doc_id} className="flex gap-4 group cursor-pointer p-2 rounded-2xl hover:bg-white/60 transition-colors">
                      <div className="w-16 h-20 rounded-lg overflow-hidden relative shadow-sm shrink-0 bg-[#FCEEEB] flex items-center justify-center">
                         <FileText size={24} className="text-[#9E2016] opacity-50" />
                         <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-2">
                         <div>
                            <h4 className="text-[#261816] font-bold text-sm group-hover:text-[#9E2016] transition-colors line-clamp-1 truncate pr-2" title={doc.filename}>{doc.filename}</h4>
                            <p className="text-[10px] text-[#59413D] opacity-60 font-['JetBrains_Mono',monospace] mt-1 uppercase">
                              {(doc.size / 1024 / 1024).toFixed(2)} MB • PDF
                            </p>
                         </div>
                         <div className="w-full h-1.5 bg-[#E1BFB9]/30 rounded-full overflow-hidden">
                           <div className="h-full bg-gradient-to-r from-[#9E2016] to-[#C94B3E] rounded-full" style={{ width: '100%' }}></div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
