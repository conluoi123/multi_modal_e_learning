import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, FileText, CheckSquare, Presentation, LayoutDashboard, BrainCircuit, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { settingsService, type UserSettings } from '../services/settingsService';

export function Sidebar() {
  const location = useLocation();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    settingsService.getSettings()
      .then(setSettings)
      .catch((error) => console.error("Failed to load sidebar settings", error));
  }, []);
  
  if (location.pathname === '/') return null;

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/chat', icon: MessageSquare, label: 'Chat & RAG' },
    { to: '/documents', icon: FileText, label: 'Tài liệu' },
    { to: '/quiz', icon: CheckSquare, label: 'Luyện tập' },
    { to: '/slides', icon: Presentation, label: 'Tạo Slide' },
    { to: '/settings', icon: Settings, label: 'Cài đặt' },
  ];

  return (
    <aside className="w-72 bg-[#FFF8F6]/50 backdrop-blur-xl border-r border-[#E1BFB9]/50 flex flex-col h-full shrink-0 shadow-[4px_0_24px_rgba(158,32,22,0.02)] z-50">
      <div className="p-8 pb-4">
        <Link to="/" className="flex items-center gap-3 text-[#9E2016] group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9E2016] to-[#C94B3E] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
            <BrainCircuit size={20} />
          </div>
          <div>
            <span className="font-['Playfair_Display',serif] font-bold text-2xl italic tracking-tight block leading-none">EduMind</span>
            <span className="text-[10px] font-['JetBrains_Mono',monospace] font-bold uppercase tracking-widest text-[#59413D] opacity-60">AI Workspace</span>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`relative flex items-center gap-3 px-4 py-3 text-[15px] font-medium font-['DM_Sans',sans-serif] transition-colors rounded-xl group ${
                isActive ? 'text-[#9E2016]' : 'text-[#59413D] hover:text-[#9E2016]'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white border border-[#E1BFB9]/50 shadow-sm rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <motion.div
                whileHover={{ scale: 1.1, rotate: isActive ? 0 : 5 }}
                className="relative z-10"
              >
                <link.icon size={20} className={isActive ? "fill-[#9E2016]/10" : ""} />
              </motion.div>
              <span className="relative z-10">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & AI Status */}
      <div className="p-6 border-t border-[#E1BFB9]/30 bg-gradient-to-b from-transparent to-white/40">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-['JetBrains_Mono',monospace] text-[#59413D] font-bold uppercase tracking-wider">AI Online</span>
          </div>
        </div>
        <Link
          to="/settings"
          className={`flex items-center gap-3 p-3 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
            location.pathname === "/settings"
              ? "border-[#9E2016]/50 ring-2 ring-[#9E2016]/10"
              : "border-[#E1BFB9]/50"
          }`}
          aria-label="Mở trang cài đặt người dùng"
        >
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(settings?.avatar_seed || "Felix")}`}
            alt="User"
            className="w-10 h-10 rounded-full bg-[#FCEEEB]"
          />
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-bold text-[#261816] truncate font-['DM_Sans',sans-serif]">{settings?.display_name || "Hoc Vien"}</h4>
            <p className="text-xs text-[#59413D] opacity-70 truncate font-['DM_Sans',sans-serif]">{settings?.role_label || "Student"}</p>
          </div>
          <Settings size={16} className="text-[#59413D] opacity-40 group-hover:opacity-100 transition-opacity group-hover:rotate-90 duration-300" />
        </Link>
      </div>
    </aside>
  );
}
