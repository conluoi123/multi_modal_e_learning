import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Save, Settings as SettingsIcon, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { settingsService, type UserSettings } from "../services/settingsService";

const defaultSettings: UserSettings = {
  display_name: "Hoc Vien",
  avatar_seed: "Felix",
  role_label: "Student",
  api_base_url: "/api/v1",
  default_document_scope: "all",
  default_slide_theme: "academic",
  default_quiz_difficulty: "standard",
  default_quiz_count: 5,
  save_chat_history: true,
  auto_select_latest_document: false,
};

export function Settings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    settingsService.getSettings()
      .then(setSettings)
      .catch((error) => {
        console.error("Failed to load settings", error);
        setSaveStatus("error");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveStatus("idle");
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const saved = await settingsService.updateSettings(settings);
      setSettings(saved);
      setSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save settings", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setSaveStatus("idle");
  };

  if (isLoading) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <div className="h-96 rounded-3xl bg-[#E1BFB9]/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex w-fit items-center gap-2 px-3 py-1 bg-white border border-[#E1BFB9]/50 rounded-full text-[#9E2016] text-[10px] font-['JetBrains_Mono',monospace] font-bold uppercase tracking-widest shadow-sm"
        >
          <SettingsIcon size={14} /> Workspace Settings
        </motion.div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-[#261816] font-['Playfair_Display',serif] text-5xl font-bold italic">
              Cài đặt hệ thống
            </h1>
            <p className="text-[#59413D] opacity-80 mt-3 max-w-2xl font-['DM_Sans',sans-serif]">
              Các thay đổi sẽ được lưu vào hệ thống và tự động áp dụng làm thiết lập mặc định cho workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === "saved" && (
              <span className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-bold">
                <CheckCircle2 size={14} /> Đã lưu
              </span>
            )}
            {saveStatus === "error" && (
              <span className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold">
                Lỗi lưu cấu hình
              </span>
            )}
            <button
              type="button"
              onClick={resetSettings}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-[#E1BFB9]/50 rounded-xl text-xs font-bold text-[#59413D] hover:text-[#9E2016] hover:border-[#9E2016]/50 transition-colors"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#9E2016] text-white rounded-xl text-xs font-bold hover:bg-[#851b13] disabled:opacity-60 transition-colors"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Lưu cấu hình
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-3xl p-8 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(settings.avatar_seed)}`}
              alt="User avatar"
              className="w-24 h-24 rounded-full bg-[#FCEEEB] border border-[#E1BFB9]/50 mb-5"
            />
            <h2 className="text-[#261816] font-bold text-xl">{settings.display_name}</h2>
            <p className="text-[#9E2016] text-sm font-bold mt-1">{settings.role_label}</p>
          </div>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Tên hiển thị</span>
              <input
                value={settings.display_name}
                onChange={(event) => updateSetting("display_name", event.target.value)}
                className="mt-2 w-full bg-white border border-[#E1BFB9]/50 rounded-2xl p-3 text-[#261816] focus:outline-none focus:border-[#9E2016]/50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Vai trò</span>
              <input
                value={settings.role_label}
                onChange={(event) => updateSetting("role_label", event.target.value)}
                className="mt-2 w-full bg-white border border-[#E1BFB9]/50 rounded-2xl p-3 text-[#261816] focus:outline-none focus:border-[#9E2016]/50"
              />
            </label>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCEEEB] text-[#9E2016] flex items-center justify-center">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="text-[#261816] font-bold text-xl">Mặc định học tập</h2>
              <p className="text-[#59413D] text-sm opacity-70">Các giá trị này dùng làm preset cho quiz, slide và nguồn tài liệu.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="block">
              <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Nguồn tài liệu mặc định</span>
              <select
                value={settings.default_document_scope}
                onChange={(event) => updateSetting("default_document_scope", event.target.value as UserSettings["default_document_scope"])}
                className="mt-2 w-full bg-white border border-[#E1BFB9]/50 rounded-2xl p-3 text-[#261816] focus:outline-none focus:border-[#9E2016]/50"
              >
                <option value="all">Tất cả tài liệu</option>
                <option value="latest">Tài liệu mới nhất</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Theme slide mặc định</span>
              <select
                value={settings.default_slide_theme}
                onChange={(event) => updateSetting("default_slide_theme", event.target.value as UserSettings["default_slide_theme"])}
                className="mt-2 w-full bg-white border border-[#E1BFB9]/50 rounded-2xl p-3 text-[#261816] focus:outline-none focus:border-[#9E2016]/50"
              >
                <option value="academic">Academic</option>
                <option value="corporate">Corporate</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Độ khó quiz mặc định</span>
              <select
                value={settings.default_quiz_difficulty}
                onChange={(event) => updateSetting("default_quiz_difficulty", event.target.value as UserSettings["default_quiz_difficulty"])}
                className="mt-2 w-full bg-white border border-[#E1BFB9]/50 rounded-2xl p-3 text-[#261816] focus:outline-none focus:border-[#9E2016]/50"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#59413D] uppercase tracking-wider">Số câu quiz mặc định</span>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.default_quiz_count}
                onChange={(event) => updateSetting("default_quiz_count", Number(event.target.value))}
                className="mt-2 w-full bg-white border border-[#E1BFB9]/50 rounded-2xl p-3 text-[#261816] focus:outline-none focus:border-[#9E2016]/50"
              />
            </label>
          </div>

          <div className="border-t border-[#E1BFB9]/40 pt-6 space-y-4">
            <h3 className="text-[#261816] font-bold">Quyền riêng tư và tự động hóa</h3>
            <label className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#E1BFB9]/40">
              <div>
                <span className="block text-sm font-bold text-[#261816]">Lưu lịch sử chat</span>
                <span className="text-xs text-[#59413D] opacity-70">Cho phép backend ghi hội thoại vào data/chat_history.json.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.save_chat_history}
                onChange={(event) => updateSetting("save_chat_history", event.target.checked)}
                className="h-5 w-5 accent-[#9E2016]"
              />
            </label>
            <label className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#E1BFB9]/40">
              <div>
                <span className="block text-sm font-bold text-[#261816]">Tự chọn tài liệu mới nhất</span>
                <span className="text-xs text-[#59413D] opacity-70">Dùng tài liệu vừa upload làm nguồn mặc định cho chat/quiz/slide.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_select_latest_document}
                onChange={(event) => updateSetting("auto_select_latest_document", event.target.checked)}
                className="h-5 w-5 accent-[#9E2016]"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
