import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Polyfill __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Reusable folder paths
const DATA_DIR = path.join(process.cwd(), "src", "data");
const COVERS_DIR = path.join(process.cwd(), "src", "data", "covers");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Ensure data and cover directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

// Ensure database file is initialized
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ releases: [] }, null, 2));
}

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve custom cover images
app.get("/covers/:id.png", (req, res) => {
  const coverPath = path.join(COVERS_DIR, `${req.params.id}.png`);
  if (fs.existsSync(coverPath)) {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(coverPath);
  } else {
    // Return a default high-quality background if cover not found
    res.redirect("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80");
  }
});

// API: Get all distributed releases
app.get("/api/releases", (req, res) => {
  try {
    const dbContent = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    // Return active releases reversed so latest is first
    res.json({ releases: [...dbContent.releases].reverse() });
  } catch (error) {
    console.error("Error reading database:", error);
    res.status(500).json({ error: "Failed to load database releases" });
  }
});

// API: Get individual release metadata
app.get("/api/releases/:id", (req, res) => {
  try {
    const dbContent = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const release = dbContent.releases.find((r: any) => r.id === req.params.id);
    if (!release) {
      return res.status(404).json({ error: "Release not found" });
    }
    res.json(release);
  } catch (error) {
    console.error("Error fetching release:", error);
    res.status(500).json({ error: "Failed to fetch release" });
  }
});

// API Proxy uploads
// Proxy 1: Catbox
app.post("/api/distribute/catbox", async (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ error: "Missing file data or file name." });
    }

    const fileBuffer = Buffer.from(fileData, "base64");
    
    // Build FormData
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    const blob = new Blob([fileBuffer]);
    formData.append("fileToUpload", blob, fileName);

    console.log(`[PROXY] Uploading ${fileName} to Catbox.moe...`);
    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Catbox replied with status ${response.status}`);
    }

    const fileUrl = await response.text();
    const cleanUrl = fileUrl.trim();
    
    console.log(`[PROXY] Catbox response: ${cleanUrl}`);
    res.json({ url: cleanUrl });
  } catch (error: any) {
    console.error("Catbox Proxy upload failed:", error);
    res.status(500).json({ error: error.message || "Failed to upload to Catbox" });
  }
});

// Proxy 2: tmpfiles.org
app.post("/api/distribute/tmpfiles", async (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ error: "Missing file data or file name." });
    }

    const fileBuffer = Buffer.from(fileData, "base64");
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append("file", blob, fileName);

    console.log(`[PROXY] Uploading ${fileName} to tmpfiles.org...`);
    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`tmpfiles.org replied with status ${response.status}`);
    }

    const json: any = await response.json();
    if (json && json.status === "success" && json.data && json.data.url) {
      const viewUrl = json.data.url;
      // Convert view url e.g., https://tmpfiles.org/12345/filename to direct url: https://tmpfiles.org/dl/12345/filename
      const directUrl = viewUrl.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
      console.log(`[PROXY] tmpfiles response view: ${viewUrl}, direct: ${directUrl}`);
      res.json({ url: directUrl, viewUrl });
    } else {
      throw new Error("Invalid structure returned from tmpfiles.org");
    }
  } catch (error: any) {
    console.error("tmpfiles.org Proxy upload failed:", error);
    res.status(500).json({ error: error.message || "Failed to upload to tmpfiles" });
  }
});

// Proxy 3: transfer.sh
app.post("/api/distribute/transfersh", async (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ error: "Missing file data or file name." });
    }

    const fileBuffer = Buffer.from(fileData, "base64");
    const safeName = encodeURIComponent(fileName.replace(/\s+/g, "_"));

    console.log(`[PROXY] Uploading ${fileName} to transfer.sh...`);
    const response = await fetch(`https://transfer.sh/${safeName}`, {
      method: "PUT",
      body: fileBuffer,
    });

    if (!response.ok) {
      throw new Error(`transfer.sh replied with status ${response.status}`);
    }

    const fileUrl = await response.text();
    const cleanUrl = fileUrl.trim();
    console.log(`[PROXY] transfer.sh response: ${cleanUrl}`);
    res.json({ url: cleanUrl });
  } catch (error: any) {
    console.error("transfer.sh Proxy upload failed:", error);
    res.status(500).json({ error: error.message || "Failed to upload to transfer.sh" });
  }
});

// API: Save release details to database
app.post("/api/releases", async (req, res) => {
  try {
    const { title, artist, genre, description, coverData, audioFileName, audioFileSize, providers } = req.body;

    if (!title || !artist || !genre) {
      return res.status(400).json({ error: "Missing required fields: title, artist, and genre are required." });
    }

    const releaseId = `rel_${Math.random().toString(36).substring(2, 8)}`;
    
    // Save cover file if details are provided
    let coverUrl = `/covers/${releaseId}.png`;
    if (coverData && coverData.includes("base64,")) {
      const base64Data = coverData.split("base64,")[1];
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(path.join(COVERS_DIR, `${releaseId}.png`), buffer);
    } else {
      // Use fallback default
      coverUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80";
    }

    const newRelease = {
      id: releaseId,
      createdAt: new Date().toISOString(),
      title,
      artist,
      genre,
      description: description || "No release description provided.",
      coverUrl,
      audioFileName: audioFileName || "track.mp3",
      audioFileSize: audioFileSize || "Unknown size",
      providers: providers || {},
    };

    // Save to database
    const dbContent = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    dbContent.releases.push(newRelease);
    fs.writeFileSync(DB_FILE, JSON.stringify(dbContent, null, 2));

    console.log(`[DATABASE] Added new release: ${releaseId} - "${title}" by ${artist}`);
    res.json({ success: true, release: newRelease });
  } catch (error: any) {
    console.error("Error creating release:", error);
    res.status(500).json({ error: error.message || "Failed to finalize and save release" });
  }
});

// Serve frontend assets and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production statics
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Keyless music distribution server running on port ${PORT}`);
  });
}

startServer();
