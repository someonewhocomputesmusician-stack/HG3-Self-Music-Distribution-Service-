export interface Providers {
  catbox?: string;
  tmpfiles?: string;
  transfersh?: string;
}

export interface Release {
  id: string;
  createdAt: string;
  title: string;
  artist: string;
  genre: string;
  description: string;
  coverUrl: string;
  audioFileName: string;
  audioFileSize: string;
  providers: Providers;
}

export type UploadState = "idle" | "reading" | "uploading" | "success" | "error";

export interface ProviderStatus {
  name: string;
  key: keyof Providers;
  logo: string;
  description: string;
  state: UploadState;
  url?: string;
  error?: string;
  speed?: string;
}

export interface CoverTheme {
  name: string;
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
  bgPattern: "none" | "grids" | "circles" | "waveform" | "monolithic";
}
