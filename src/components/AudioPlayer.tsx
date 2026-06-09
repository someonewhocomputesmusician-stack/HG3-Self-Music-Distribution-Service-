import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Music, Clock, FileAudio, ExternalLink, HardDrive } from "lucide-react";

interface AudioPlayerProps {
  url: string;
  title: string;
  artist: string;
  coverUrl: string;
  size?: string;
  providers?: { name: string; url: string }[];
}

export default function AudioPlayer({
  url,
  title,
  artist,
  coverUrl,
  size,
  providers = [],
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(new Array(18).fill(8));

  // Handle Play/Pause toggle
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.log("Audio play deferred:", err));
    }
  };

  // Sync internal volume on change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Load new audio when URL shifts
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [url]);

  // Audio state change listeners
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setFrequencyBars(new Array(18).fill(8));
  };

  // Handle progress seeking
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCurrentTime(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (value > 0) setIsMuted(false);
  };

  // Safe simulated visualizer loop that reacts beautifully to play state
  useEffect(() => {
    let lastTime = 0;
    const updateVisualizer = (timestamp: number) => {
      if (!isPlaying) {
        // Slowly settle elements back to idle heights
        setFrequencyBars(prev => prev.map(bar => Math.max(8, bar - 0.5)));
        animationRef.current = requestAnimationFrame(updateVisualizer);
        return;
      }

      // Refresh every ~50ms
      if (timestamp - lastTime > 60) {
        setFrequencyBars(() => {
          return new Array(18).fill(0).map((_, idx) => {
            // Generative curves overlayed by random frequency jitter
            const baseMultiplier = Math.sin(idx * 0.4 + timestamp * 0.003) * 0.5 + 0.5;
            const variance = Math.random() * 25;
            return Math.floor(baseMultiplier * 36 + variance + 10);
          });
        });
        lastTime = timestamp;
      }

      animationRef.current = requestAnimationFrame(updateVisualizer);
    };

    animationRef.current = requestAnimationFrame(updateVisualizer);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Formats seconds into MM:SS format
  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return "0:00";
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex flex-col bg-gradient-to-b from-[#18191c]/80 to-[#101113]/90 border border-white/5 rounded-2xl overflow-hidden p-6 shadow-2xl">
      {/* Hidden Web Audio Node */}
      <audio
        ref={audioRef}
        src={url}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Main player display */}
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        {/* Cover with rotation */}
        <div className="relative group">
          <div
            className={`w-36 h-36 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl transition-transform duration-10000 linear ${
              isPlaying ? "rotate-360 animate-[spin_12s_linear_infinite]" : ""
            }`}
          >
            <img
              src={coverUrl}
              alt="Cover Art"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover select-none"
            />
          </div>
          {/* Inner turntable pinhole */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0c0d0e] border border-white/20 flex items-center justify-center shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex-1 flex flex-col justify-center text-center sm:text-left min-w-0">
          <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider mb-1 px-2.5 py-0.5 rounded-full bg-emerald-600/10 self-center sm:self-start border border-emerald-500/10">
            Streaming Directly
          </span>
          <h3 className="text-xl font-bold font-display text-white truncate max-w-full drop-shadow-md">
            {title || "Default Track"}
          </h3>
          <p className="text-stone-400 text-sm font-medium mt-0.5 truncate max-w-full">
            {artist || "Anonymous Record"}
          </p>

          <div className="mt-3 flex items-center justify-center sm:justify-start gap-4">
            <span className="flex items-center gap-1.5 text-xs text-stone-500">
              <Clock size={13} />
              <span className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </span>
            {size && (
              <span className="flex items-center gap-1.5 text-xs text-stone-500 border-l border-white/5 pl-4">
                <FileAudio size={13} />
                <span className="font-mono">{size}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reactive Visualizer Graphic */}
      <div className="my-6 h-12 flex items-end justify-between px-2 bg-black/40 rounded-xl border border-white/5 p-2 shadow-inner overflow-hidden">
        {frequencyBars.map((barHeight, idx) => (
          <div
            key={idx}
            className="flex-1 mx-[1.5px] rounded-t-sm transition-all duration-75 bg-gradient-to-t from-emerald-600/50 via-emerald-400/80 to-teal-300"
            style={{
              height: `${barHeight}%`,
              opacity: isPlaying ? 0.9 : 0.25,
            }}
          />
        ))}
      </div>

      {/* Progress slider bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeekChange}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Play Controls & Volume panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-white/5 pt-4">
        {/* Play and skip icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95 ${
              isPlaying ? "bg-stone-100 text-[#0c0d0e]" : "bg-emerald-500 text-white"
            }`}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
          </button>
          <span className="text-xs text-stone-400">
            {isPlaying ? "Now Playing" : "Paused"}
          </span>
        </div>

        {/* Volume controller */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto bg-black/20 p-2 px-3 rounded-lg border border-white/5">
          <button
            onClick={handleMuteToggle}
            className="text-stone-400 hover:text-stone-100 transition-colors"
          >
            {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-stone-300"
          />
        </div>
      </div>

      {/* Distributed targets list */}
      {providers.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#38bdf8] mb-2 px-1">
            Anonymous Distribution Nodes
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {providers.map((p, idx) => (
              <a
                key={idx}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 text-stone-300 hover:text-white transition-all text-xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold capitalize font-display">{p.name}</span>
                </div>
                <ExternalLink size={12} className="text-stone-500 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
