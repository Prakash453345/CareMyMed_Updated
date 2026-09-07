import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_DIR = "C:/Users/punee/.gemini/antigravity-ide/brain/67c13ff2-1496-4acc-b9d2-d44c3e703d97/.user_uploaded";
const OUT_RAW_DIR = "c:/dev/CareCoUsers/users-mobile/out/raw/pixel-10-pro";

// All 5 CareMyMed scenes from user screenshots
const SCENES = [
  {
    id: "01-dashboard",
    sourceFile: "media_1788752208775.png", // Main Dashboard & Health Score
    headerBg: "#F0F7FF",
  },
  {
    id: "02-medication-plan",
    sourceFile: "media_1788752197392.png", // Today's Plan & Vitals
    headerBg: "#F0F7FF",
  },
  {
    id: "03-mood-coaching",
    sourceFile: "media_1788752202927.png", // Mood & Live Coach
    headerBg: "#F0F7FF",
  },
  {
    id: "04-profile-security",
    sourceFile: "media_1788752123035.png", // Care Record / My Profile
    headerBg: "#FFFFFF",
  },
  {
    id: "05-secure-access",
    sourceFile: "media_1788752337484.png", // Sign In Screen
    headerBg: "#F8FAFC",
  },
];

// Target native resolution for Android captures (1080 x 2400, 20:9)
const TARGET_W = 1080;
const TARGET_H = 2400;

async function processAllScreenshots() {
  await fs.mkdir(OUT_RAW_DIR, { recursive: true });

  const manifestScreenshots = [];

  for (const scene of SCENES) {
    const srcPath = path.join(SOURCE_DIR, scene.sourceFile);
    console.log(`Processing ${scene.id} from ${scene.sourceFile}...`);

    const img = await loadImage(srcPath);
    const canvas = createCanvas(TARGET_W, TARGET_H);
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 1. Draw upscaled capture onto target canvas
    ctx.drawImage(img, 0, 0, TARGET_W, TARGET_H);

    // 2. Clean status bar (top 135px covers the OnePlus punch-hole notch / island cleanly)
    const barHeight = 135;
    ctx.fillStyle = scene.headerBg;
    ctx.fillRect(0, 0, TARGET_W, barHeight);

    // Clean standard clock
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 38px sans-serif";
    ctx.fillText("09:41", 75, 82);

    // Status icons: Wi-Fi, 5G, Battery
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#1E293B";
    ctx.beginPath();
    ctx.arc(875, 74, 20, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(875, 74, 13, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(875, 74, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#1E293B";
    ctx.fill();

    ctx.font = "bold 30px sans-serif";
    ctx.fillText("5G", 915, 80);

    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 3.5;
    ctx.strokeRect(975, 58, 48, 24);
    ctx.fillRect(1023, 64, 4, 12);
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(979, 62, 40, 16);

    // 3. Clean gesture bar at bottom
    const gestureY = TARGET_H - 24;
    ctx.fillStyle = "#94A3B8";
    ctx.beginPath();
    ctx.roundRect(TARGET_W / 2 - 90, gestureY, 180, 10, 5);
    ctx.fill();

    // 4. Save raw capture
    const outFile = path.join(OUT_RAW_DIR, `${scene.id}.png`);
    await fs.writeFile(outFile, canvas.toBuffer("image/png"));
    console.log(`  Saved clean raw capture to ${outFile}`);

    manifestScreenshots.push({
      sceneId: scene.id,
      file: outFile,
    });
  }

  // 5. Write manifest.json
  const manifest = {
    device: "pixel-10-pro",
    udid: "oneplus-nord-ce6",
    capturedAt: new Date().toISOString(),
    screenshots: manifestScreenshots,
    preview: null,
  };

  const manifestPath = path.join(OUT_RAW_DIR, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Created manifest with ${manifestScreenshots.length} scenes at ${manifestPath}`);
}

processAllScreenshots().catch(console.error);
