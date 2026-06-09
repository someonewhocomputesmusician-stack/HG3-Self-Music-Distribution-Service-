import React, { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, Palette, Image as ImageIcon, Sliders, Type } from "lucide-react";
import { CoverTheme } from "../types";

interface CoverDesignerProps {
  title: string;
  artist: string;
  genre: string;
  onChangeCoverUrl: (dataUrl: string) => void;
}

const PALETTES: CoverTheme[] = [
  {
    name: "Cyber Neon",
    gradientStart: "#0a0a14",
    gradientEnd: "#1e112a",
    textColor: "#38bdf8", // Sky
    bgPattern: "grids",
  },
  {
    name: "Toxic Emerald",
    gradientStart: "#040d0a",
    gradientEnd: "#0b201a",
    textColor: "#10b981", // Emerald
    bgPattern: "waveform",
  },
  {
    name: "Acid Sunrise",
    gradientStart: "#1a0808",
    gradientEnd: "#2e2107",
    textColor: "#f59e0b", // Amber
    bgPattern: "circles",
  },
  {
    name: "Velvet Night",
    gradientStart: "#0e081c",
    gradientEnd: "#230630",
    textColor: "#d946ef", // Fuchsia
    bgPattern: "monolithic",
  },
  {
    name: "Monochrome Minimal",
    gradientStart: "#070708",
    gradientEnd: "#1a1a1c",
    textColor: "#ffffff", // White
    bgPattern: "none",
  },
];

export default function CoverDesigner({
  title,
  artist,
  genre,
  onChangeCoverUrl,
}: CoverDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTheme, setSelectedTheme] = useState<CoverTheme>(PALETTES[0]);
  const [customStartColor, setCustomStartColor] = useState(PALETTES[0].gradientStart);
  const [customEndColor, setCustomEndColor] = useState(PALETTES[0].gradientEnd);
  const [customTextColor, setCustomTextColor] = useState(PALETTES[0].textColor);
  const [patternType, setPatternType] = useState<CoverTheme["bgPattern"]>("grids");
  const [textStyle, setTextStyle] = useState<"modern" | "cyber" | "brutalist">("modern");
  const [blurIntensity, setBlurIntensity] = useState(0);

  // Sync custom colors when theme changes
  useEffect(() => {
    setCustomStartColor(selectedTheme.gradientStart);
    setCustomEndColor(selectedTheme.gradientEnd);
    setCustomTextColor(selectedTheme.textColor);
    setPatternType(selectedTheme.bgPattern);
  }, [selectedTheme]);

  // Handle rendering of canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 500;
    const height = 500;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, customStartColor);
    grad.addColorStop(1, customEndColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Apply optional blur/fuzz to backgrounds (via visual filters)
    if (blurIntensity > 0) {
      ctx.filter = `blur(${blurIntensity}px)`;
      ctx.fillRect(0, 0, width, height);
      ctx.filter = "none";
    }

    // 2. Draw Vector Pattern overlays
    ctx.lineWidth = 1;
    ctx.strokeStyle = `${customTextColor}15`; // transparency

    if (patternType === "grids") {
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Add small tech crosshairs
      ctx.strokeStyle = `${customTextColor}40`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 15, height / 2);
      ctx.lineTo(width / 2 + 15, height / 2);
      ctx.moveTo(width / 2, height / 2 - 15);
      ctx.lineTo(width / 2, height / 2 + 15);
      ctx.stroke();
    } else if (patternType === "circles") {
      ctx.lineWidth = 1.5;
      for (let r = 40; r < width; r += 45) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Draw dynamic intersecting angle line
      ctx.strokeStyle = `${customTextColor}25`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height);
      ctx.moveTo(0, height);
      ctx.lineTo(width, 0);
      ctx.stroke();
    } else if (patternType === "waveform") {
      ctx.strokeStyle = `${customTextColor}20`;
      ctx.lineWidth = 2;
      const count = 30;
      const centerY = height / 2;
      const step = width / count;

      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = i * step + step / 2;
        // Seeded random height based on index or title lengths
        const seedValue = Math.sin((i + 1) * 0.4) * Math.cos((i + 3) * 0.9);
        const waveHeight = Math.abs(seedValue) * 160 + 20;

        ctx.moveTo(x, centerY - waveHeight / 2);
        ctx.lineTo(x, centerY + waveHeight / 2);
      }
      ctx.stroke();
    } else if (patternType === "monolithic") {
      // Draw massive minimalist circle in center
      ctx.fillStyle = `${customTextColor}0c`;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `${customTextColor}30`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 + 10, 130, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(width / 2 - 90, height / 2 - 90, 180, 180);
      ctx.stroke();
    }

    // 3. Draw Text Metadata
    const displayTitle = (title || "Untitled Sg").toUpperCase();
    const displayArtist = (artist || "Anonymous Creator").toUpperCase();
    const displayGenre = (genre || "Audio Track").toUpperCase();

    // Font family pairings
    if (textStyle === "cyber") {
      // Technical monospace tag
      ctx.fillStyle = `${customTextColor}aa`;
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.letterSpacing = "4px";
      ctx.fillText(`DISTRIBUTION CODENAME // ${displayGenre}`, 40, 80);

      // Title
      ctx.fillStyle = customTextColor;
      ctx.font = "bold 38px 'Space Grotesk', sans-serif";
      ctx.letterSpacing = "1px";
      ctx.fillText(displayTitle, 40, 230);

      // Artist
      ctx.fillStyle = "#ffffff";
      ctx.font = "500 16px 'JetBrains Mono', monospace";
      ctx.letterSpacing = "6px";
      ctx.fillText(displayArtist, 41, 265);

      // Detail lines
      ctx.strokeStyle = `${customTextColor}50`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 290);
      ctx.lineTo(160, 290);
      ctx.stroke();

      ctx.fillStyle = "#ffffff60";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.letterSpacing = "2px";
      ctx.fillText(`ANON NODE: #${Math.floor(1000 + Math.random() * 9000)}`, 40, 440);
      ctx.fillText("STATUS: VERIFIED SECURE RELEASE", 40, 460);
    } else if (textStyle === "brutalist") {
      // Solid massive fonts
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 48px 'Space Grotesk', sans-serif";
      ctx.letterSpacing = "-1px";
      ctx.fillText(displayTitle, 35, 120);

      ctx.fillStyle = customTextColor;
      ctx.font = "900 18px 'Space Grotesk', sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText(displayArtist, 38, 155);

      // Simple box accent
      ctx.strokeStyle = `${customTextColor}cc`;
      ctx.lineWidth = 5;
      ctx.strokeRect(35, 180, 80, 8);

      // bottom tag
      ctx.fillStyle = `${customTextColor}bb`;
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.letterSpacing = "3px";
      ctx.fillText(`[ ${displayGenre} SYSTEM ]`, 38, 450);
    } else {
      // Modern Clean
      ctx.fillStyle = `${customTextColor}bb`;
      ctx.font = "500 12px 'Space Grotesk', sans-serif";
      ctx.letterSpacing = "5px";
      ctx.fillText(displayGenre, 45, 100);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 36px 'Inter', sans-serif";
      ctx.letterSpacing = "-0.5px";
      ctx.fillText(displayTitle, 45, 240);

      ctx.fillStyle = `${customTextColor}`;
      ctx.font = "400 15px 'Inter', sans-serif";
      ctx.letterSpacing = "3px";
      ctx.fillText(displayArtist, 45, 275);

      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(45, 305);
      ctx.lineTo(455, 305);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.letterSpacing = "1px";
      ctx.fillText("DISTRIBUTED VIA SECURE KEYLESS ENDPOINT", 45, 435);
    }

    // Export DataURL
    onChangeCoverUrl(canvas.toDataURL("image/png"));
  };

  // Re-draw whenever parameters change
  useEffect(() => {
    drawCanvas();
  }, [
    title,
    artist,
    genre,
    customStartColor,
    customEndColor,
    customTextColor,
    patternType,
    textStyle,
    blurIntensity,
  ]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 bg-[#141517] rounded-xl border border-white/5">
      {/* Visual Canvas Display */}
      <div className="flex flex-col items-center justify-center p-3 bg-black/40 rounded-xl border border-white/5 shadow-inner">
        <canvas
          id="music-cover-canvas"
          ref={canvasRef}
          className="w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-lg shadow-xl border border-white/10"
        />
        <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
          <ImageIcon size={13} className="text-emerald-500" />
          <span>Generative High-Res 500x500 Cover art</span>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 uppercase tracking-widest mb-3">
            <Palette size={14} className="text-[#38bdf8]" />
            Dynamic Style Presets
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-2 gap-2">
            {PALETTES.map((theme) => (
              <button
                key={theme.name}
                type="button"
                onClick={() => setSelectedTheme(theme)}
                className={`py-2 px-3 text-left rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border ${
                  selectedTheme.name === theme.name
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-white/5 text-stone-400 border-transparent hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})`,
                    }}
                  />
                  <span className="truncate">{theme.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed customisation settings */}
        <div className="space-y-3.5 border-t border-white/5 pt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-stone-300 uppercase tracking-widest mb-3">
            <Sliders size={14} className="text-emerald-500" />
            Fine Tune Design Elements
          </h4>

          {/* Color pickers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-stone-500 font-mono uppercase mb-1">Grad Start</label>
              <div className="flex gap-1.5 items-center bg-white/5 p-1 px-1.5 rounded-lg border border-white/5">
                <input
                  type="color"
                  value={customStartColor}
                  onChange={(e) => setCustomStartColor(e.target.value)}
                  className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer p-0"
                />
                <span className="text-[9px] font-mono select-all hidden sm:inline">{customStartColor.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-stone-500 font-mono uppercase mb-1">Grad End</label>
              <div className="flex gap-1.5 items-center bg-white/5 p-1 px-1.5 rounded-lg border border-white/5">
                <input
                  type="color"
                  value={customEndColor}
                  onChange={(e) => setCustomEndColor(e.target.value)}
                  className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer p-0"
                />
                <span className="text-[9px] font-mono select-all hidden sm:inline">{customEndColor.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-stone-500 font-mono uppercase mb-1">Accent Text</label>
              <div className="flex gap-1.5 items-center bg-white/5 p-1 px-1.5 rounded-lg border border-white/5">
                <input
                  type="color"
                  value={customTextColor}
                  onChange={(e) => setCustomTextColor(e.target.value)}
                  className="w-5 h-5 bg-transparent border-0 rounded cursor-pointer p-0"
                />
                <span className="text-[9px] font-mono select-all hidden sm:inline">{customTextColor.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Pattern Overlay Selector */}
            <div>
              <label className="block text-[10px] text-stone-400 font-medium tracking-wider mb-1.5">Pattern Background</label>
              <select
                value={patternType}
                onChange={(e) => setPatternType(e.target.value as CoverTheme["bgPattern"])}
                className="w-full bg-white/5 border border-white/10 rounded-lg text-xs p-2 text-stone-200 outline-none focus:border-emerald-500"
              >
                <option value="none">Solid Clean</option>
                <option value="grids">Techno-Grid (Retro)</option>
                <option value="circles">Orbitals (Acid/Minimal)</option>
                <option value="waveform">Audio Waves (Ambient)</option>
                <option value="monolithic">Brutalist Rings</option>
              </select>
            </div>

            {/* Font Pair Layout */}
            <div>
              <label className="block text-[10px] text-stone-400 font-medium tracking-wider mb-1.5">Typography Style</label>
              <select
                value={textStyle}
                onChange={(e) => setTextStyle(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-lg text-xs p-2 text-stone-200 outline-none focus:border-emerald-500"
              >
                <option value="modern">Swiss Modern (Inter)</option>
                <option value="cyber">Technical Terminal (Mono)</option>
                <option value="brutalist">Industrial Poster (Heavy)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3.5">
          <span className="text-[10px] text-stone-500 flex items-center gap-1">
            <Type size={11} /> Live metadata syncs instantly
          </span>
          <button
            type="button"
            onClick={drawCanvas}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer transition-colors"
          >
            <RefreshCw size={12} /> Regenerate Noise
          </button>
        </div>
      </div>
    </div>
  );
}
