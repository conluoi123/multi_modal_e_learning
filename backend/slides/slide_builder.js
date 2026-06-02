/**
 * slide_builder.js — v2 (Enhanced Visual Design)
 *
 * API không đổi: node slide_builder.js input.json output.pptx [theme]
 * Theme: "academic" | "corporate" | "minimal"
 */

const pptxgen = require("pptxgenjs");
const fs = require("fs");

const W = 10;
const H = 5.625;

// ─────────────────────────────────────────────
// THEMES
// ─────────────────────────────────────────────
const THEMES = {
  academic: {
    // Màu nền & chữ chính
    bg:           "0D1B4B",   // navy đậm
    bgAlt:        "132261",   // navy nhạt hơn (layer gradient giả)
    titleColor:   "FFFFFF",
    bodyBg:       "F0F4FF",   // xanh rất nhạt
    bodyColor:    "1A2C6B",
    // Accent & trang trí
    accent:       "4F8EF7",   // xanh sáng
    accentDark:   "1A56C4",
    accentLight:  "D6E4FF",
    cardBg:       "FFFFFF",
    cardLine:     "C5D8FF",
    // Deco shapes
    circleColor:  "FFFFFF",   // vòng tròn mờ trên title
    // Chữ phụ
    subtitleColor:"A8C4FF",
    metaColor:    "7BA7F5",
    slideNumColor:"5B7CC4",
    // Font
    titleFont:    "Georgia",
    bodyFont:     "Calibri",
  },
  corporate: {
    bg:           "1B3A6B",
    bgAlt:        "245091",
    titleColor:   "FFFFFF",
    bodyBg:       "F4F6FA",
    bodyColor:    "1B2D4F",
    accent:       "F0A500",   // ấm — vàng gold
    accentDark:   "C47F00",
    accentLight:  "FFF3CC",
    cardBg:       "FFFFFF",
    cardLine:     "FFE08A",
    circleColor:  "FFFFFF",
    subtitleColor:"FFD97A",
    metaColor:    "FFE9A3",
    slideNumColor:"A89060",
    titleFont:    "Calibri",
    bodyFont:     "Calibri",
  },
  minimal: {
    bg:           "1A1A2E",
    bgAlt:        "16213E",
    titleColor:   "E8E8F0",
    bodyBg:       "F9F9FB",
    bodyColor:    "2D2D40",
    accent:       "00D4AA",   // teal mint
    accentDark:   "009E7A",
    accentLight:  "D0FFF4",
    cardBg:       "FFFFFF",
    cardLine:     "B0EFE0",
    circleColor:  "FFFFFF",
    subtitleColor:"85E8D8",
    metaColor:    "A0D8CE",
    slideNumColor:"6BB8A8",
    titleFont:    "Arial",
    bodyFont:     "Arial",
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
/** Tạo fresh shadow object — tránh pptxgenjs mutate shared object */
const mkShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.18 });

// ─────────────────────────────────────────────
// TITLE SLIDE
// ─────────────────────────────────────────────
function addTitleSlide(prs, theme, data) {
  const slide = prs.addSlide();

  // ── Background: 2 layer solid giả gradient ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: theme.bg }, line: { color: theme.bg },
  });
  // Layer trên (nhạt hơn) phủ nửa trên — tạo hiệu ứng gradient top→bottom
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: H * 0.55,
    fill: { color: theme.bgAlt, transparency: 40 }, line: { color: theme.bgAlt },
  });

  // ── Deco: vòng tròn lớn mờ (góc trên phải) ──
  slide.addShape(prs.shapes.OVAL, {
    x: 6.8, y: -1.2, w: 4.2, h: 4.2,
    fill: { color: theme.circleColor, transparency: 88 },
    line: { color: theme.circleColor, transparency: 80, width: 1.5 },
  });
  // Vòng tròn nhỏ hơn — lồng bên trong
  slide.addShape(prs.shapes.OVAL, {
    x: 7.6, y: -0.5, w: 2.6, h: 2.6,
    fill: { color: theme.circleColor, transparency: 93 },
    line: { color: theme.circleColor, transparency: 85, width: 1 },
  });

  // ── Deco: vòng tròn góc dưới trái ──
  slide.addShape(prs.shapes.OVAL, {
    x: -1.4, y: 3.8, w: 3.2, h: 3.2,
    fill: { color: theme.accent, transparency: 82 },
    line: { color: theme.accent, transparency: 75, width: 1 },
  });

  // ── Deco: chấm nhỏ rải rác ──
  const dots = [
    { x: 1.2, y: 0.5 }, { x: 2.8, y: 0.3 }, { x: 0.6, y: 1.4 },
    { x: 8.5, y: 4.2 }, { x: 9.1, y: 3.5 }, { x: 7.8, y: 4.8 },
  ];
  dots.forEach(d => {
    slide.addShape(prs.shapes.OVAL, {
      x: d.x, y: d.y, w: 0.1, h: 0.1,
      fill: { color: theme.accent, transparency: 50 },
      line: { color: theme.accent },
    });
  });

  // ── Deco: đường chéo góc dưới phải ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 7.5, y: H - 0.06, w: 2.5, h: 0.06,
    fill: { color: theme.accent, transparency: 30 },
    line: { color: theme.accent },
  });
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 8.2, y: H - 0.18, w: 1.8, h: 0.06,
    fill: { color: theme.accent, transparency: 55 },
    line: { color: theme.accent },
  });

  // ── Tiêu đề chính ──
  slide.addText(data.title || "Bài Thuyết Trình", {
    x: 0.8, y: 1.35, w: W - 1.6, h: 1.5,
    fontSize: 40, bold: true, color: theme.titleColor,
    fontFace: theme.titleFont, align: "center", valign: "middle",
    shadow: mkShadow(),
  });

  // ── Accent line dưới tiêu đề ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 3.2, y: 2.98, w: 3.6, h: 0.055,
    fill: { color: theme.accent }, line: { color: theme.accent },
  });

  // ── Subtitle ──
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.8, y: 3.15, w: W - 1.6, h: 0.65,
      fontSize: 19, color: theme.subtitleColor,
      fontFace: theme.bodyFont, align: "center", italic: true,
    });
  }

  // ── Meta: author · date ──
  const meta = [data.author, data.date].filter(Boolean).join("   ·   ");
  if (meta) {
    // Pill background
    slide.addShape(prs.shapes.ROUNDED_RECTANGLE, {
      x: 2.8, y: H - 1.05, w: 4.4, h: 0.45,
      fill: { color: theme.circleColor, transparency: 88 },
      line: { color: theme.accent, transparency: 50, width: 0.75 },
      rectRadius: 0.12,
    });
    slide.addText(meta, {
      x: 2.8, y: H - 1.05, w: 4.4, h: 0.45,
      fontSize: 12.5, color: theme.metaColor,
      fontFace: theme.bodyFont, align: "center", valign: "middle",
    });
  }
}

// ─────────────────────────────────────────────
// CONTENT SLIDE
// ─────────────────────────────────────────────
function addContentSlide(prs, theme, slideData, slideIdx, total) {
  const slide = prs.addSlide();

  // ── Background ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: theme.bodyBg }, line: { color: theme.bodyBg },
  });

  // ── Header bar ──
  const HEADER_H = 1.15;
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: HEADER_H,
    fill: { color: theme.bg }, line: { color: theme.bg },
  });

  // Header — layer nhạt phủ phần trên tạo chiều sâu
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: HEADER_H * 0.45,
    fill: { color: theme.bgAlt, transparency: 55 },
    line: { color: theme.bgAlt },
  });

  // Header — hình thang góc dưới phải (shape chéo bằng 2 rect chồng tạo bậc)
  slide.addShape(prs.shapes.RECTANGLE, {
    x: W - 1.4, y: HEADER_H - 0.32, w: 1.4, h: 0.32,
    fill: { color: theme.accent, transparency: 30 },
    line: { color: theme.accent },
  });
  slide.addShape(prs.shapes.RECTANGLE, {
    x: W - 0.8, y: HEADER_H - 0.55, w: 0.8, h: 0.55,
    fill: { color: theme.accent, transparency: 55 },
    line: { color: theme.accent },
  });

  // ── Accent stripe trái (full height) ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.07, h: H,
    fill: { color: theme.accent }, line: { color: theme.accent },
  });

  // ── Tiêu đề slide ──
  slide.addText(slideData.title || "", {
    x: 0.28, y: 0.08, w: W - 1.5, h: HEADER_H - 0.12,
    fontSize: 26, bold: true, color: theme.titleColor,
    fontFace: theme.titleFont, valign: "middle", margin: 0,
  });

  // ── Card nền body content ──
  const BODY_TOP = HEADER_H + 0.18;
  const BODY_H = H - BODY_TOP - 0.42;
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0.28, y: BODY_TOP, w: W - 0.56, h: BODY_H,
    fill: { color: theme.cardBg },
    line: { color: theme.cardLine, width: 0.75 },
    shadow: mkShadow(),
  });

  // Đường kẻ dọc accent trái card
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0.28, y: BODY_TOP, w: 0.055, h: BODY_H,
    fill: { color: theme.accentDark }, line: { color: theme.accentDark },
  });

  // ── Bullet points với icon hình vuông nhỏ ──
  const bullets = slideData.bullet_points || [];
  const lineH   = 0.62;                         // chiều cao mỗi dòng
  const startY  = BODY_TOP + 0.22;
  const textX   = 0.72;                         // bắt đầu text (sau icon)
  const iconX   = 0.42;                         // vị trí icon
  const maxLines = Math.floor(BODY_H / lineH);

  bullets.slice(0, maxLines).forEach((b, i) => {
    const y = startY + i * lineH;

    // Icon: hình vuông nhỏ màu accent
    slide.addShape(prs.shapes.RECTANGLE, {
      x: iconX, y: y + 0.18, w: 0.13, h: 0.13,
      fill: { color: theme.accent }, line: { color: theme.accentDark, width: 0.5 },
    });

    // Text bullet
    slide.addText(b, {
      x: textX, y: y, w: W - textX - 0.45, h: lineH,
      fontSize: 17, color: theme.bodyColor,
      fontFace: theme.bodyFont, valign: "middle", margin: 0,
    });
  });

  // ── Số slide — góc dưới phải ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: W - 1.1, y: H - 0.38, w: 0.8, h: 0.3,
    fill: { color: theme.bg }, line: { color: theme.bg },
    rectRadius: 0.04,
  });
  slide.addText(`${slideIdx} / ${total}`, {
    x: W - 1.1, y: H - 0.38, w: 0.8, h: 0.3,
    fontSize: 11, color: theme.accentLight,
    fontFace: theme.bodyFont, align: "center", valign: "middle", margin: 0,
  });

  // ── Speaker notes ──
  if (slideData.speaker_notes) {
    slide.addNotes(slideData.speaker_notes);
  }
}

// ─────────────────────────────────────────────
// END SLIDE
// ─────────────────────────────────────────────
function addEndSlide(prs, theme) {
  const slide = prs.addSlide();

  // ── Background ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: theme.bg }, line: { color: theme.bg },
  });
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: H * 0.5,
    fill: { color: theme.bgAlt, transparency: 45 },
    line: { color: theme.bgAlt },
  });

  // ── Deco: vòng tròn lớn mờ góc trên trái ──
  slide.addShape(prs.shapes.OVAL, {
    x: -1.5, y: -1.0, w: 4.5, h: 4.5,
    fill: { color: theme.circleColor, transparency: 90 },
    line: { color: theme.accent, transparency: 75, width: 1.5 },
  });

  // ── Deco: vòng tròn góc dưới phải ──
  slide.addShape(prs.shapes.OVAL, {
    x: 7.8, y: 3.2, w: 3.5, h: 3.5,
    fill: { color: theme.accent, transparency: 85 },
    line: { color: theme.accent, transparency: 70, width: 1 },
  });

  // ── Deco: accent lines ngang ──
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 1.5, y: 1.65, w: 7.0, h: 0.05,
    fill: { color: theme.accent, transparency: 40 },
    line: { color: theme.accent },
  });
  slide.addShape(prs.shapes.RECTANGLE, {
    x: 3.0, y: 3.8, w: 4.0, h: 0.05,
    fill: { color: theme.accent, transparency: 60 },
    line: { color: theme.accent },
  });

  // ── Chữ "Cảm ơn" ──
  slide.addText("Cảm ơn đã lắng nghe!", {
    x: 0.8, y: 1.75, w: W - 1.6, h: 1.3,
    fontSize: 38, bold: true, color: theme.titleColor,
    fontFace: theme.titleFont, align: "center", valign: "middle",
    charSpacing: 1,
    shadow: mkShadow(),
  });

  // ── Q&A badge ──
  slide.addShape(prs.shapes.ROUNDED_RECTANGLE, {
    x: 3.5, y: 3.3, w: 3.0, h: 0.62,
    fill: { color: theme.accent, transparency: 15 },
    line: { color: theme.accent, width: 1.5 },
    rectRadius: 0.18,
    shadow: mkShadow(),
  });
  slide.addText("Q & A", {
    x: 3.5, y: 3.3, w: 3.0, h: 0.62,
    fontSize: 22, bold: true, color: theme.titleColor,
    fontFace: theme.titleFont, align: "center", valign: "middle",
  });

  // ── Dòng chú thích nhỏ ──
  slide.addText("Đặt câu hỏi hoặc liên hệ với diễn giả", {
    x: 1.5, y: 4.15, w: W - 3.0, h: 0.45,
    fontSize: 13, color: theme.subtitleColor, italic: true,
    fontFace: theme.bodyFont, align: "center",
  });
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function buildPresentation(data, outputPath, themeName = "academic") {
  const theme = THEMES[themeName] || THEMES.academic;
  const prs = new pptxgen();
  prs.layout = "LAYOUT_16x9";
  prs.title = data.title || "Bài thuyết trình";

  addTitleSlide(prs, theme, data);
  data.slides.forEach((s, i) => addContentSlide(prs, theme, s, i + 1, data.slides.length));
  addEndSlide(prs, theme);

  await prs.writeFile({ fileName: outputPath });
  console.log(`✅ Đã xuất: ${outputPath}`);
}

// ─────────────────────────────────────────────
// ENTRY POINT (CLI)
// ─────────────────────────────────────────────
const [,, inputJson, outputPptx, theme] = process.argv;
if (!inputJson || !outputPptx) {
  console.error("Dùng: node slide_builder.js <input.json> <output.pptx> [theme]");
  console.error("Theme: academic | corporate | minimal");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputJson, "utf8"));
buildPresentation(data, outputPptx, theme || "academic")
  .then(() => process.exit(0))
  .catch(err => { console.error("Lỗi:", err.message); process.exit(1); });