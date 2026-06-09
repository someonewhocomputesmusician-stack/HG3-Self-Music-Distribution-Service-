import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Compass,
  ArrowLeft,
  Copy,
  Check,
  Disc,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Music,
  ExternalLink,
  Github,
  Play,
  Heart
} from "lucide-react";
import { Release } from "./types";
import StudioDashboard from "./components/StudioDashboard";
import AudioPlayer from "./components/AudioPlayer";

export default function App() {
  const [currentReleaseId, setCurrentReleaseId] = useState<string | null>(null);
  const [activeRelease, setActiveRelease] = useState<Release | null>(null);
  const [isLoadingRelease, setIsLoadingRelease] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  
  const [allReleases, setAllReleases] = useState<Release[]>([]);
  const [copyStatus, setCopyStatus] = useState(false);
  const [viewState, setViewState] = useState<"dashboard" | "release">("dashboard");

  // Load all releases in registry
  const loadReleasesRegistry = async () => {
    try {
      const response = await fetch("/api/releases");
      if (response.ok) {
        const data = await response.json();
        setAllReleases(data.releases || []);
      }
    } catch (error) {
      console.error("Failed to load releases registry:", error);
    }
  };

  // Extract release ID from path on boot
  useEffect(() => {
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/release\/([a-zA-Z0-9_-]+)/);
    
    if (match && match[1]) {
      const relId = match[1];
      setCurrentReleaseId(relId);
      loadReleaseDetails(relId);
    } else {
      loadReleasesRegistry();
    }
  }, []);

  // Fetch individual release from DB
  const loadReleaseDetails = async (id: string) => {
    setIsLoadingRelease(true);
    setReleaseError(null);
    try {
      const response = await fetch(`/api/releases/${id}`);
      if (!response.ok) {
        throw new Error("Release not found. Please audit link registry.");
      }
      const data: Release = await response.json();
      setActiveRelease(data);
      setViewState("release");
    } catch (err: any) {
      console.error(err);
      setReleaseError(err.message || "Failed to load single release profile.");
      setViewState("release");
    } finally {
      setIsLoadingRelease(false);
    }
  };

  // Router dispatcher
  const handleSelectRelease = (releaseId: string) => {
    setCurrentReleaseId(releaseId);
    // Push state to browser history cleanly so address bar updates
    window.history.pushState(null, "", `/release/${releaseId}`);
    loadReleaseDetails(releaseId);
  };

  const handleBackToDashboard = () => {
    setCurrentReleaseId(null);
    setActiveRelease(null);
    setReleaseError(null);
    setViewState("dashboard");
    // Push root path back to address bar
    window.history.pushState(null, "", "/");
    loadReleasesRegistry();
  };

  const copySmartLink = () => {
    if (!activeRelease) return;
    const path = `${window.location.protocol}//${window.location.host}/release/${activeRelease.id}`;
    navigator.clipboard.writeText(path);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090a0b] text-white custom-grid-bg relative flex flex-col justify-between font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* Dynamic light blur effects behind layers */}
      <div className="absolute top-0 left-1/4 w-[40vw] h-[40vh] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[30vw] h-[30vh] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Header */}
      <header className="border-b border-white/5 py-4 px-6 md:px-12 bg-black/40 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            onClick={handleBackToDashboard}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
              <Disc className="w-4 h-4 animate-[spin_5s_linear_infinite]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white font-display">PUBLIC DISTRO</span>
              <span className="text-[10px] text-stone-500 block font-mono">ANONYMOUS NODE PROX</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToDashboard}
              className={`text-xs py-2 px-3.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all cursor-pointer font-medium ${
                viewState === "dashboard" ? "bg-white/5 text-white" : "text-stone-400"
              }`}
            >
              Distribution Studio
            </button>
            <a
              href="https://catbox.moe"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-stone-500 hover:text-stone-300 font-mono hidden sm:flex items-center gap-1 bg-white/5 p-1.5 px-3 rounded-lg border border-white/5"
            >
              Public Source <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </header>

      {/* Content wrapper */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 md:px-12 py-10 relative z-10">
        {isLoadingRelease ? (
          /* LOADING PROGRESS STAGE */
          <div className="flex flex-col items-center justify-center p-24 text-center space-y-4">
            <Disc size={44} className="text-emerald-500 animate-spin" />
            <h3 className="font-bold text-lg font-display text-white">Resolving Anonymous Pathways...</h3>
            <p className="text-stone-500 text-xs font-mono">Locating metadata packet index on public nodes</p>
          </div>
        ) : viewState === "release" ? (
          /* SINGLE RELEASE SMARTLINK SPLASH PAGE */
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Nav Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors cursor-pointer bg-white/5 p-2 px-3.5 border border-white/5 hover:border-white/15 rounded-lg font-semibold"
              >
                <ArrowLeft size={14} /> Back to Distribution Studio
              </button>
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Distributed Anonymously</span>
              </div>
            </div>

            {releaseError ? (
              /* ERROR RESOLVING LINK */
              <div className="text-center p-12 bg-red-500/5 rounded-2xl border border-red-500/10 max-w-md mx-auto space-y-4">
                <ShieldAlert size={44} className="text-red-400 mx-auto" />
                <h3 className="text-lg font-bold text-white font-display">Target Resolution Error</h3>
                <p className="text-stone-400 text-xs leading-relaxed">
                  {releaseError}. The release link ID may be incorrect, or the temporary cloud files have reached their expiration schedules on public servers.
                </p>
                <button
                  onClick={handleBackToDashboard}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Return to Studio
                </button>
              </div>
            ) : (
              /* PRIME LANDING PLAYER DESIGN */
              activeRelease && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Cover & General specs (5 cols) */}
                  <div className="md:col-span-5 flex flex-col space-y-6">
                    <div className="bg-[#141517] p-4 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
                      {/* Interactive glare */}
                      <div className="aspect-square w-full rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
                        <img
                          src={activeRelease.coverUrl}
                          alt={activeRelease.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover select-none"
                        />
                        <div className="absolute top-3.5 right-3.5 font-mono text-[9px] font-bold tracking-widest text-[#38bdf8] bg-black/60 p-1 px-2.2 rounded border border-white/10 uppercase">
                          {activeRelease.genre}
                        </div>
                      </div>
                    </div>

                    {/* Metadata summary profile certificates */}
                    <div className="bg-[#141517] p-5 rounded-2xl border border-white/5 space-y-4">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#38bdf8] font-display">
                          Decentralized Release Audit
                        </h4>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500 font-medium">Tracking ID</span>
                          <span className="font-mono text-stone-300">{activeRelease.id}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500 font-medium">Distributed Date</span>
                          <span className="text-stone-300">
                            {new Date(activeRelease.createdAt).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500 font-medium font-sans">Source Asset Size</span>
                          <span className="font-mono text-stone-300">{activeRelease.audioFileSize}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500 font-medium">Verification Lock</span>
                          <span className="text-emerald-400 font-mono flex items-center gap-1 uppercase text-[10px]">
                            <ShieldCheck size={12} /> SECURED BY PASS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive player & descriptions (7 cols) */}
                  <div className="md:col-span-7 space-y-6">
                    <div className="bg-[#141517] p-6 rounded-2xl border border-white/5 space-y-6 shadow-2xl">
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 font-mono text-[9px] uppercase tracking-wider w-fit">
                          <Sparkles size={10} />
                          <span>Decentralized Single Release</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight leading-none pt-1">
                          {activeRelease.title}
                        </h2>
                        <h3 className="text-md sm:text-lg text-emerald-400 font-medium">
                          By {activeRelease.artist}
                        </h3>
                        <p className="text-stone-400 text-xs sm:text-sm leading-relaxed font-sans pt-2">
                          {activeRelease.description}
                        </p>
                      </div>

                      {/* Customized interactive sound wave player */}
                      <AudioPlayer
                        url={
                          activeRelease.providers.catbox ||
                          activeRelease.providers.tmpfiles ||
                          activeRelease.providers.transfersh ||
                          ""
                        }
                        title={activeRelease.title}
                        artist={activeRelease.artist}
                        coverUrl={activeRelease.coverUrl}
                        size={activeRelease.audioFileSize}
                        providers={Object.entries(activeRelease.providers).map(([key, url]) => ({
                          name: key,
                          url: url as string,
                        }))}
                      />

                      {/* Action Share Center */}
                      <div className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-3 pt-4">
                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                          SmartLink Landing Address
                        </h4>
                        <div className="flex bg-[#141517] p-2.5 rounded-lg border border-white/5 items-center justify-between gap-4">
                          <span className="text-xs font-mono text-stone-300 truncate select-all">
                            {`${window.location.protocol}//${window.location.host}/release/${activeRelease.id}`}
                          </span>
                          <button
                            onClick={copySmartLink}
                            className="flex items-center gap-1.5 text-xs text-white hover:bg-white/10 select-none bg-white/5 p-2 border border-white/10 rounded transition font-semibold flex-shrink-0 cursor-pointer"
                          >
                            {copyStatus ? (
                              <>
                                <Check size={12} className="text-emerald-400" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Share Page
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              )
            )}
          </div>
        ) : (
          /* PRIMARY DASHBOARD HUB */
          <StudioDashboard
            onSelectRelease={handleSelectRelease}
            onRefreshHistory={loadReleasesRegistry}
            allReleases={allReleases}
          />
        )}
      </main>

      {/* Decorative clean footer */}
      <footer className="border-t border-white/5 bg-black/20 py-6 px-12 text-center text-xs text-stone-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono">
            &copy; {new Date().getFullYear()} Anonymous Multi-Node Public Distro • Zero Tracking Logs
          </p>
          <div className="flex gap-4">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#38bdf8] bg-sky-500/5 p-1 px-2.2 border border-sky-500/5 rounded">
              Status • Direct Proxy Gateways Online
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
