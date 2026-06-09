import React, { useState, useEffect } from "react";
import {
  Upload,
  Music,
  Globe,
  Database,
  Layers,
  Shield,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Disc,
  Play,
  Heart,
  PlusCircle,
  Clock,
  ArrowRight,
  Info
} from "lucide-react";
import CoverDesigner from "./CoverDesigner";
import { Providers, ProviderStatus, Release, UploadState } from "../types";

interface StudioDashboardProps {
  onSelectRelease: (releaseId: string) => void;
  onRefreshHistory: () => void;
  allReleases: Release[];
}

export default function StudioDashboard({
  onSelectRelease,
  onRefreshHistory,
  allReleases,
}: StudioDashboardProps) {
  // Main form states
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("Synthwave");
  const [description, setDescription] = useState("");
  
  // Cover State
  const [coverDataUrl, setCoverDataUrl] = useState("");
  
  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState("");
  const [audioDetails, setAudioDetails] = useState({ name: "", size: "" });

  // Distribution Providers selections
  const [selectedProviders, setSelectedProviders] = useState({
    catbox: true,
    tmpfiles: true,
    transfersh: true,
  });

  // Upload progress tracking
  const [isDistributing, setIsDistributing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"ready" | "processing" | "saving" | "completed">("ready");
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [finalRelease, setFinalRelease] = useState<Release | null>(null);
  const [copyStatus, setCopyStatus] = useState(false);

  // Filter state for search/feed
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenreFilter, setSelectedGenreFilter] = useState("All");

  const GENRES = ["Synthwave", "Lofi Beats", "Electronic", "Ambient", "Industrial", "Cyberpunk", "Hip Hop", "Cinematic"];

  // Handle audio file selection and conversion to base64
  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 45 * 1024 * 1024) {
      alert("Audio file exceeds maximum allowed size (45MB) for keyless APIs.");
      return;
    }

    setAudioFile(file);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    setAudioDetails({ name: file.name, size: sizeInMB });

    // Read file as Base64 to send to backend proxy
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      // b64 is standard Data URL: data:audio/mpeg;base64,xxxx...
      // We extract raw base64 context in backend, but keep full data url on client if needed
      setAudioBase64(b64.split("base64,")[1] || "");
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop listeners
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      if (file.size > 45 * 1024 * 1024) {
        alert("Audio file exceeds maximum allowed size (45MB).");
        return;
      }
      setAudioFile(file);
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      setAudioDetails({ name: file.name, size: sizeInMB });

      const reader = new FileReader();
      reader.onload = (event) => {
        const b64 = event.target?.result as string;
        setAudioBase64(b64.split("base64,")[1] || "");
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid audio file.");
    }
  };

  // Core distribution orchestrator
  const startDistribution = async () => {
    if (!title.trim() || !artist.trim()) {
      alert("Please enter a Song Title and Artist Name.");
      return;
    }
    if (!audioFile || !audioBase64) {
      alert("Please select or drop an audio track file to distribute.");
      return;
    }

    // Initialize list of providers being distributed to
    const activeProviders: ProviderStatus[] = [];
    if (selectedProviders.catbox) {
      activeProviders.push({
        name: "Catbox.moe",
        key: "catbox",
        logo: "🐱",
        description: "Permanent anonymous file host. Best for perpetual sharing.",
        state: "idle",
      });
    }
    if (selectedProviders.tmpfiles) {
      activeProviders.push({
        name: "tmpfiles.org",
        key: "tmpfiles",
        logo: "⏱️",
        description: "High-speed temporary hub. Generates instant streaming direct-links.",
        state: "idle",
      });
    }
    if (selectedProviders.transfersh) {
      activeProviders.push({
        name: "transfer.sh",
        key: "transfersh",
        logo: "📦",
        description: "Clean server console host. Secure and active for 14 days.",
        state: "idle",
      });
    }

    if (activeProviders.length === 0) {
      alert("Please select at least one public upload node.");
      return;
    }

    setIsDistributing(true);
    setCurrentStep("processing");
    setProviderStatuses(activeProviders);

    const uploadedUrls: Providers = {};

    // Sequential uploads via server proxy to prevent client timeouts
    for (let i = 0; i < activeProviders.length; i++) {
      const provider = activeProviders[i];
      
      // Update state to Uploading
      setProviderStatuses(prev =>
        prev.map((p, idx) => (idx === i ? { ...p, state: "uploading" } : p))
      );

      try {
        const payload = {
          fileData: audioBase64,
          fileName: audioFile.name,
        };

        const response = await fetch(`/api/distribute/${provider.key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Failed proxy target: ${provider.name}`);
        }

        const data = await response.json();
        uploadedUrls[provider.key] = data.url;

        // Update state to Success
        setProviderStatuses(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, state: "success" as UploadState, url: data.url } : p
          )
        );
      } catch (err: any) {
        console.error(`Upload error on ${provider.name}:`, err);
        setProviderStatuses(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, state: "error" as UploadState, error: err.message || "Upload Failed" } : p
          )
        );
      }
    }

    // Now send finalize metadata call to Express server database
    setCurrentStep("saving");
    try {
      const finalizeResponse = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artist,
          genre,
          description,
          coverData: coverDataUrl, // Generative Cover Base64
          audioFileName: audioFile.name,
          audioFileSize: audioDetails.size,
          providers: uploadedUrls,
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error("Failed to finalize and record metadata on server.");
      }

      const finalizeResult = await finalizeResponse.json();
      setFinalRelease(finalizeResult.release);
      setCurrentStep("completed");
      
      // Refresh general history in root App
      onRefreshHistory();
    } catch (err: any) {
      alert("Error finalizing the distribution: " + err.message);
      setIsDistributing(false);
      setCurrentStep("ready");
    }
  };

  const getSmartLinkUrl = (relId: string) => {
    // Generate full URL
    return `${window.location.protocol}//${window.location.host}/release/${relId}`;
  };

  const copySmartLink = (relId: string) => {
    navigator.clipboard.writeText(getSmartLinkUrl(relId));
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  // Reset the form values for a new single release
  const resetForm = () => {
    setTitle("");
    setArtist("");
    setDescription("");
    setAudioFile(null);
    setAudioBase64("");
    setAudioDetails({ name: "", size: "" });
    setIsDistributing(false);
    setCurrentStep("ready");
    setFinalRelease(null);
  };

  // Filter system
  const filteredHistory = allReleases.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenreFilter === "All" || item.genre === selectedGenreFilter;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="space-y-12">
      {/* Visual Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-stone-900 via-[#101114] to-zinc-900 border border-white/5 p-8 overflow-hidden">
        {/* Generative background accents */}
        <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-10 select-none pointer-events-none hidden lg:block">
          <Disc size={260} className="text-white animate-[spin_20s_linear_infinite]" />
        </div>
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 font-mono text-[10px] uppercase tracking-wider mb-3">
            <Shield size={12} />
            <span>Zero Keys • Zero Tracking • 100% Secure</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight leading-tight">
            Keyless Music Distribution
          </h1>
          <p className="text-stone-400 mt-2 text-sm sm:text-base leading-relaxed">
            Upload your audio files anonymously to secure public cloud hosts. Easily generate dynamic release profiles, track-based visual SmartLinks, and distribute cover arts instantly!
          </p>
        </div>
      </div>

      {/* Primary Workspace: Create Single on Left, Feed/Catalog on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form / active upload (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {currentStep === "processing" || currentStep === "saving" || currentStep === "completed" ? (
            /* ACTIVE DISTRIBUTION PROGRESS PANEL */
            <div className="bg-[#141517] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-500/5 blur-3xl" />
              
              <div className="text-center max-w-md mx-auto mb-8">
                {currentStep === "completed" ? (
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
                    <Award size={32} />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#38bdf8] animate-pulse">
                    <Disc size={32} className="animate-spin" />
                  </div>
                )}
                <h3 className="text-xl font-bold font-display text-white">
                  {currentStep === "processing" && "Anonymizing Multi-Node Upload"}
                  {currentStep === "saving" && "Finalizing Distribution Page"}
                  {currentStep === "completed" && "Distribution Complete!"}
                </h3>
                <p className="text-stone-400 text-xs mt-1">
                  {currentStep === "processing" && "Uploading audio payloads to public servers without keys..."}
                  {currentStep === "saving" && "Recording distributed pathways secure link indexes..."}
                  {currentStep === "completed" && "Your single has been successfully distributed anonymously!"}
                </p>
              </div>

              {/* Progress Rows per platform */}
              <div className="space-y-4 mb-8">
                {providerStatuses.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.logo}</span>
                      <div>
                        <h4 className="font-semibold text-sm text-stone-200">{p.name}</h4>
                        <p className="text-[10px] text-stone-500 mt-0.5">{p.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {p.state === "idle" && (
                        <span className="text-xs text-stone-600 flex items-center gap-1.5 bg-stone-900/50 p-2 rounded-lg font-mono">
                          <Clock size={12} /> Queued
                        </span>
                      )}
                      {p.state === "uploading" && (
                        <span className="text-xs text-[#38bdf8] flex items-center gap-1.5 bg-sky-500/10 p-2 border border-sky-500/10 rounded-lg font-mono">
                          <Disc size={12} className="animate-spin" /> Uploading Payload...
                        </span>
                      )}
                      {p.state === "success" && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 p-1 px-2 border border-emerald-500/10 rounded-lg font-mono">
                            <CheckCircle2 size={12} /> Live Link Generated
                          </span>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-stone-500 hover:text-stone-300 underline font-mono flex items-center gap-1"
                          >
                            Verify raw link <ArrowRight size={8} />
                          </a>
                        </div>
                      )}
                      {p.state === "error" && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-red-400 flex items-center gap-1.5 bg-red-500/10 p-1 px-2 border border-red-500/10 rounded-lg">
                            <XCircle size={12} /> Failed
                          </span>
                          <span className="text-[9px] text-red-500 font-mono text-right max-w-[150px] truncate" title={p.error}>
                            {p.error}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Saved release profile */}
              {currentStep === "completed" && finalRelease && (
                <div className="p-4 bg-[#18191c] rounded-xl border border-white/10 space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={coverDataUrl}
                      alt="Release art"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded shadow-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">{finalRelease.genre}</span>
                      <h4 className="text-md font-bold text-white truncate">{finalRelease.title}</h4>
                      <p className="text-xs text-stone-400 truncate">{finalRelease.artist}</p>
                    </div>
                  </div>

                  {/* Share link input panel */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[#38bdf8]">
                      Official SmartLink Launch Landing Page:
                    </label>
                    <div className="flex bg-black/60 p-2 rounded-lg border border-white/10 items-center justify-between">
                      <span className="text-xs font-mono text-stone-300 truncate select-all pr-2">
                        {getSmartLinkUrl(finalRelease.id)}
                      </span>
                      <button
                        onClick={() => copySmartLink(finalRelease.id)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer bg-emerald-500/5 p-1.5 px-2.5 rounded hover:bg-emerald-500/10 border border-emerald-500/10 font-medium transition"
                      >
                        {copyStatus ? (
                          <>
                            <Check size={12} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-relaxed font-sans pt-1">
                      Share this SmartLink! Fans can stream the track directly through our custom landing player, view details, and download copy packets under anonymous protection.
                    </p>
                  </div>
                </div>
              )}

              {/* Modal footer controls */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                {currentStep === "completed" && finalRelease && (
                  <button
                    onClick={() => onSelectRelease(finalRelease.id)}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-emerald-400 transition"
                  >
                    View active SmartPage
                  </button>
                )}
                {currentStep === "completed" && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-white/5 text-stone-300 rounded-lg text-xs font-medium cursor-pointer hover:bg-white/15 transition"
                  >
                    Release another Track
                  </button>
                )}
                {currentStep !== "completed" && (
                  <span className="text-xs text-stone-500 animate-pulse flex items-center gap-1 bg-white/5 p-2 px-3 rounded-lg border border-white/5 font-mono">
                    <Database size={12} /> Securing records... Please keep browser active
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* CREATE SINGLE CONSOLE */
            <div className="bg-[#141517] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-bold font-display text-white">Create Anonymous Single Release</h2>
                <p className="text-xs text-stone-400 mt-1">
                  Anonymously bundle audio with high-end style settings.
                </p>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">Song Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Infinite Waves"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">Artist Display Name *</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g., RetroVibe"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">Primary Genre</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-stone-200 outline-none focus:border-emerald-500"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">Release Description (Optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Warm synth landscapes generated in isolation."
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Generative Cover art control panel */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-400">Generate Album Artwork</label>
                <CoverDesigner
                  title={title}
                  artist={artist}
                  genre={genre}
                  onChangeCoverUrl={setCoverDataUrl}
                />
              </div>

              {/* Audio Uploader Section */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-400">Audio Track Payload (MP3, WAV, FLAC, M4A) *</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/5"
                      : audioFile
                      ? "border-emerald-500/40 bg-zinc-900/40"
                      : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioSelect}
                    className="hidden"
                    id="audio-uploader-input"
                  />
                  <label htmlFor="audio-uploader-input" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                      audioFile ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-stone-400"
                    }`}>
                      <Music size={18} />
                    </div>
                    {audioFile ? (
                      <div className="max-w-[400px]">
                        <p className="text-sm font-semibold text-white truncate">{audioDetails.name}</p>
                        <p className="text-[10px] text-emerald-400 font-mono mt-1 uppercase tracking-wider bg-emerald-500/5 inline-block p-1 px-2 border border-emerald-500/10 rounded">
                          Ready • {audioDetails.size}
                        </p>
                        <p className="text-[10px] text-stone-500 mt-2">Click to replace file</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-stone-300">Drag & Drop your audio file here</p>
                        <p className="text-[10px] text-stone-500 mt-1 font-mono">or click to browse local files (Max 45MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Multi Node Selector checkboxes */}
              <div className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold text-stone-300 flex items-center gap-1.5 uppercase font-display">
                    <Globe size={13} className="text-[#38bdf8]" />
                    Select Anonymous Cloud Target Nodes
                  </h4>
                  <span className="text-[9px] font-mono text-stone-500 uppercase">Keyless API Distribution</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-start gap-2.5 p-2 bg-white/5 border border-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                    <input
                      type="checkbox"
                      checked={selectedProviders.catbox}
                      onChange={(e) =>
                        setSelectedProviders((prev) => ({ ...prev, catbox: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-stone-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Catbox.moe</span>
                      <span className="text-[9px] text-stone-400 block mt-0.5">Permanent audio storage node</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 p-2 bg-white/5 border border-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                    <input
                      type="checkbox"
                      checked={selectedProviders.tmpfiles}
                      onChange={(e) =>
                        setSelectedProviders((prev) => ({ ...prev, tmpfiles: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-stone-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block font-display">tmpfiles.org</span>
                      <span className="text-[9px] text-stone-400 block mt-0.5">Instant streaming audio endpoint</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 p-2 bg-white/5 border border-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                    <input
                      type="checkbox"
                      checked={selectedProviders.transfersh}
                      onChange={(e) =>
                        setSelectedProviders((prev) => ({ ...prev, transfersh: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-stone-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">transfer.sh</span>
                      <span className="text-[9px] text-stone-400 block mt-0.5">Console-friendly node (14 days)</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Distribute Button */}
              <button
                type="button"
                onClick={startDistribution}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl text-center shadow-lg cursor-pointer hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <PlusCircle size={16} />
                Distribute Single Track Anonymously
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Feed of past releases (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#141517] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Catalog Feed</span>
              <h2 className="text-lg font-bold font-display text-white">Live Distributed Registry</h2>
              <p className="text-xs text-stone-400 leading-normal">
                Browse tracks distributed by artists across the decentralized workspace nodes.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search songs or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 px-3 text-xs text-white outline-none focus:border-emerald-500"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedGenreFilter("All")}
                  className={`text-[10px] font-medium p-1 px-2.5 rounded-full border transition cursor-pointer ${
                    selectedGenreFilter === "All"
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-transparent border-white/5 text-stone-400 hover:text-white"
                  }`}
                >
                  All Genres
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGenreFilter(g)}
                    className={`text-[10px] font-medium p-1 px-2.5 rounded-full border transition cursor-pointer ${
                      selectedGenreFilter === g
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-transparent border-white/5 text-stone-400 hover:text-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Music Feed list */}
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredHistory.length === 0 ? (
                <div className="text-center p-12 bg-black/20 rounded-xl border border-white/5">
                  <Disc size={28} className="text-stone-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-stone-400">Registry Feed Empty</p>
                  <p className="text-[10px] text-stone-500 mt-1">Be the first to distribute a track to the nodes anonymously!</p>
                </div>
              ) : (
                filteredHistory.map((release) => (
                  <div
                    key={release.id}
                    className="p-3 bg-black/30 hover:bg-[#18191c] rounded-xl border border-white/5 hover:border-white/10 transition-all flex gap-3.5 items-center group relative cursor-pointer"
                    onClick={() => onSelectRelease(release.id)}
                  >
                    {/* Cover art with visual play button hover */}
                    <div className="w-12 h-12 rounded relative overflow-hidden bg-zinc-800 flex-shrink-0 shadow">
                      <img
                        src={release.coverUrl}
                        alt={release.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Play size={14} className="text-white fill-white" />
                      </div>
                    </div>

                    {/* Meta descriptions */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-emerald-400 font-mono tracking-wider bg-emerald-500/5 px-1 py-0.2 rounded">
                          {release.genre}
                        </span>
                        <span className="text-[9px] text-stone-500 font-mono">
                          {new Date(release.createdAt).toLocaleDateString(undefined, {month: "short", day: "numeric"})}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate mt-0.5 group-hover:text-emerald-400 transition-colors">
                        {release.title}
                      </h4>
                      <p className="text-[10px] text-stone-400 truncate mt-0.5">
                        By {release.artist}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[9px] text-stone-500 font-mono block">
                        {release.audioFileSize}
                      </span>
                      <span className="text-[8px] text-emerald-500/70 font-mono block uppercase mt-1">
                        Active Node
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Info and disclaimer */}
            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex gap-2.5 items-start">
              <Info size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-stone-400 leading-relaxed">
                Tracks uploaded are routed through servers globally without accounts. For stability, the system hosts a proxy resolving CORS and registers anonymous smart links. Keep files under 45MB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
