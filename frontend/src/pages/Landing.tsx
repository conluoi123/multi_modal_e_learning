import { Link } from "react-router-dom";
import { Star, BookOpen, Cpu, MessageSquare } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Landing() {
  return (
    <div className="bg-[#FFF8F6] min-h-full">
      {/* Hero Section */}
      <section className="p-12 lg:p-24 space-y-12 max-w-6xl">
        <div className="space-y-6">
          <p className="text-[#9E2016] text-[10px] font-['JetBrains_Mono',monospace] uppercase tracking-[0.5em] font-bold">THE FUTURE OF VIETNAMESE ACADEMIA</p>
          <h1 className="text-[#261816] font-['Playfair_Display',serif] text-7xl lg:text-8xl font-bold leading-[1.1]">
            Khai phóng tri thức <br /> với <br /> <span className="italic">Trí tuệ Nhân tạo</span>
          </h1>
          <p className="text-[#59413D] text-xl leading-relaxed max-w-2xl opacity-80 font-['DM_Sans',sans-serif]">
            Hệ thống RAG (Retrieval-Augmented Generation) tối ưu dành riêng cho cộng đồng sinh viên đại học Việt Nam. Nghiên cứu sâu hơn, hiểu nhanh hơn.
          </p>
        </div>

        <div className="flex items-center gap-8">
          <Link 
            to="/dashboard" 
            className="bg-[#9E2016] text-white px-10 py-5 text-sm font-['JetBrains_Mono',monospace] uppercase tracking-widest hover:bg-[#851b13] transition-all hover:translate-x-2 shadow-2xl"
          >
            Bắt đầu hành trình
          </Link>
          <div className="space-y-1">
             <div className="flex text-[#9E2016]">
               {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor" />)}
             </div>
             <p className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] opacity-40 uppercase tracking-widest">ACADEMIC RATING</p>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-[#FCEEEB] py-6 px-12 lg:px-24 flex flex-wrap items-center gap-x-16 gap-y-4 border-y border-[#E1BFB9]">
        <span className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] opacity-60 uppercase tracking-widest">ĐƯỢC TIN DÙNG BỞI:</span>
        {["Hanoi University", "UEH", "Bach Khoa", "Foreign Trade Uni"].map(uni => (
          <span key={uni} className="text-[#59413D] font-['Playfair_Display',serif] italic text-sm opacity-60 grayscale hover:grayscale-0 transition-all cursor-default">
            {uni}
          </span>
        ))}
      </section>

      {/* Features */}
      <section className="p-12 lg:p-24 grid grid-cols-1 md:grid-cols-3 gap-12">
        {[
          { 
            step: "01", 
            cat: "RESEARCH", 
            title: "Truy vấn học thuật", 
            desc: "Hệ thống RAG tiên tiến cho phép bạn \"đối thoại\" trực tiếp với kho tàng tài liệu khổng lồ. Trích dẫn chính xác nguồn dữ liệu từ các tạp chí uy tín.",
            icon: BookOpen
          },
          { 
            step: "02", 
            cat: "AUTOMATION", 
            title: "Tự động hóa bài giảng", 
            desc: "Chuyển đổi các tệp PDF học thuật phức tạp thành slide thuyết trình chuyên nghiệp chỉ trong tích tắc. Giữ vững cấu trúc và luận điểm then chốt.",
            icon: Cpu
          },
          { 
            step: "03", 
            cat: "INTERACTIVE", 
            title: "Trải nghiệm Đa phương thức", 
            desc: "Luyện tập phản biện và thuyết trình với trí tuệ nhân tạo thông qua cả văn bản và giọng nói trong cùng một giao diện chat mượt mà.",
            icon: MessageSquare
          },
        ].map((feature, i) => (
          <div key={i} className="space-y-8 group">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-[#9E2016] text-xs font-['JetBrains_Mono',monospace] font-bold">{feature.step} / {feature.cat}</span>
              </div>
              <h3 className="text-[#261816] font-['Playfair_Display',serif] text-3xl font-bold">{feature.title}</h3>
              <p className="text-[#59413D] text-sm leading-relaxed opacity-80">{feature.desc}</p>
            </div>
            <div className="aspect-video bg-white border border-[#E1BFB9] p-8 flex items-center justify-center relative overflow-hidden group-hover:shadow-xl transition-all duration-500">
               <feature.icon size={48} className="text-[#9E2016] opacity-10 group-hover:opacity-40 transition-opacity" />
               <div className="absolute bottom-4 left-4 text-[8px] font-['JetBrains_Mono',monospace] text-[#59413D] opacity-40 uppercase tracking-widest border border-[#E1BFB9] px-2 py-1">
                 FIG. {feature.step}: {feature.cat} LOGIC
               </div>
            </div>
          </div>
        ))}
      </section>

      {/* Quote & Image */}
      <section className="p-12 lg:p-24 border-t border-[#E1BFB9] bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
           <div className="space-y-12">
              <div className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] opacity-40 uppercase tracking-[0.5em]">VOL. 24 / ISSUE 01</div>
              <blockquote className="space-y-8">
                <p className="text-[#261816] font-['Playfair_Display',serif] text-4xl lg:text-5xl font-bold italic leading-tight">
                  "Tri thức không chỉ là dữ liệu, mà là khả năng kết nối dữ liệu đó một cách có ý nghĩa."
                </p>
                <footer className="flex items-center gap-4">
                   <div className="w-12 h-px bg-[#E1BFB9]"></div>
                   <cite className="text-[#59413D] text-xs font-['JetBrains_Mono',monospace] uppercase tracking-widest not-italic">EDITORIAL BOARD, EDUMIND</cite>
                </footer>
              </blockquote>
           </div>
           <div className="relative group">
              <div className="absolute inset-0 border border-[#E1BFB9] translate-x-6 translate-y-6 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-500"></div>
              <div className="relative overflow-hidden aspect-[4/3] border border-[#E1BFB9] shadow-2xl">
                 <ImageWithFallback 
                   src="https://images.unsplash.com/photo-1579097380689-4351e0a200ed" 
                   alt="Academic Library" 
                   className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" 
                 />
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-12 lg:p-24 border-t border-[#E1BFB9] bg-[#FFF8F6]">
         <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-4">
               <h2 className="text-[#9E2016] font-['Playfair_Display',serif] text-2xl">EduMind AI</h2>
               <p className="text-[#59413D] text-[10px] font-['JetBrains_Mono',monospace] uppercase opacity-40">© 2024 EduMind AI. An Academic Journal Publication.</p>
            </div>
            <div className="flex flex-wrap gap-8 text-[10px] font-['JetBrains_Mono',monospace] uppercase tracking-widest text-[#59413D]">
               <Link to="/ethics" className="hover:text-[#9E2016] transition-colors">Ethics Policy</Link>
               <Link to="/citation-guide" className="hover:text-[#9E2016] transition-colors">Citation Guide</Link>
               <Link to="/institutional-access" className="hover:text-[#9E2016] transition-colors">Institutional Access</Link>
            </div>
         </div>
      </footer>
    </div>
  );
}
