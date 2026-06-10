import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, FileCheck2, Scale } from "lucide-react";

const policyContent = {
  "/ethics": {
    icon: Scale,
    title: "Ethics Policy",
    intro: "Nguyên tắc sử dụng EduMind AI trong môi trường học thuật.",
    items: [
      "AI chỉ là công cụ hỗ trợ học tập, không thay thế việc tự đọc và tự hiểu tài liệu.",
      "Người học cần kiểm chứng câu trả lời bằng citation và tài liệu gốc trước khi sử dụng.",
      "Không dùng hệ thống để tạo nội dung gian lận, giả mạo nguồn, hoặc né tránh quy định học thuật.",
      "Không upload tài liệu nhạy cảm nếu chưa có quyền sử dụng hoặc chia sẻ.",
    ],
  },
  "/citation-guide": {
    icon: FileCheck2,
    title: "Citation Guide",
    intro: "Cách đọc, kiểm chứng và sử dụng nguồn trích dẫn trong câu trả lời RAG.",
    items: [
      "Mỗi câu trả lời nên được đối chiếu với filename và page trong phần citation.",
      "Khi đưa vào báo cáo, hãy trích nguồn tài liệu gốc thay vì trích trực tiếp lời AI.",
      "Nếu citation không đủ rõ, hãy hỏi lại AI yêu cầu chỉ ra đoạn/trang cụ thể hơn.",
      "Các câu trả lời tổng hợp từ nhiều trang cần được kiểm tra theo từng nguồn riêng.",
    ],
  },
  "/institutional-access": {
    icon: Building2,
    title: "Institutional Access",
    intro: "Ghi chú triển khai khi dùng trong nhóm/lớp/trường học.",
    items: [
      "Bản hiện tại là single-user workspace, phù hợp demo hoặc học cá nhân.",
      "Triển khai cho tổ chức cần thêm tài khoản, phân quyền, và tách dữ liệu theo user/class.",
      "Vector store nên lọc theo user_id hoặc workspace_id để tránh lộ tài liệu giữa người dùng.",
      "Cần bổ sung audit log và chính sách lưu/xóa dữ liệu trước khi dùng production.",
    ],
  },
};

export function PolicyPage() {
  const location = useLocation();
  const content = policyContent[location.pathname as keyof typeof policyContent] || policyContent["/ethics"];
  const Icon = content.icon;

  return (
    <div className="min-h-full bg-[#FFF8F6]">
      <section className="p-8 lg:p-24 max-w-5xl space-y-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#59413D] hover:text-[#9E2016] text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>

        <header className="space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FCEEEB] text-[#9E2016] flex items-center justify-center">
            <Icon size={30} />
          </div>
          <div>
            <p className="text-[#9E2016] text-[10px] font-['JetBrains_Mono',monospace] uppercase tracking-[0.5em] font-bold">
              EduMind AI
            </p>
            <h1 className="text-[#261816] font-['Playfair_Display',serif] text-5xl lg:text-6xl font-bold italic mt-4">
              {content.title}
            </h1>
            <p className="text-[#59413D] text-lg leading-relaxed max-w-2xl opacity-80 mt-5">
              {content.intro}
            </p>
          </div>
        </header>

        <div className="bg-white border border-[#E1BFB9]/50 rounded-3xl p-8 shadow-sm">
          <div className="space-y-5">
            {content.items.map((item, index) => (
              <div key={item} className="flex gap-4 border-b border-[#E1BFB9]/30 last:border-b-0 pb-5 last:pb-0">
                <span className="text-[#9E2016] font-['JetBrains_Mono',monospace] text-xs font-bold mt-1">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-[#261816] leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
