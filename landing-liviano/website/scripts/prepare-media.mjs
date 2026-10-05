// Prepares every media file the site needs from the project assets.
// - bg.mp4: all-keyframe H.264 re-encode of the Higgsfield video, so
//   scroll scrubbing can seek to any frame instantly.
// - poster.jpg: first frame, used before the video loads and on mobile.
// - favicon.png: from the circular brand icon. Source assets are never modified.
//
// Usage: npm run prepare-media [-- path/to/video.mp4]

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = resolve(root, "../assets");
const pub = resolve(root, "public");
const img = resolve(pub, "img");
mkdirSync(img, { recursive: true });

const input = resolve(process.argv[2] ?? resolve(assets, "videos/pecera-scroll-background.mp4"));
if (!existsSync(input)) {
  console.error(`Video not found: ${input}`);
  process.exit(1);
}

const run = (args) => execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

// 1. Background video: every frame is a keyframe (-g 1), no audio,
//    1600px wide to keep the all-intra file a reasonable size.
const bg = resolve(pub, "bg.mp4");
run([
  "-i", input, "-an",
  "-vf", "scale=1600:-2",
  "-c:v", "libx264", "-preset", "slow", "-crf", "22",
  "-g", "1", "-keyint_min", "1", "-sc_threshold", "0",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  bg,
]);
console.log(`bg.mp4 ${(statSync(bg).size / 1e6).toFixed(1)} MB`);

// 2. Posters
run(["-i", input, "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "3", resolve(img, "poster.jpg")]);
run(["-ss", "13.5", "-i", input, "-frames:v", "1", "-vf", "scale=1080:-2", "-q:v", "4", resolve(img, "mobile-poster.jpg")]);

// 3. Favicon from the circular brand icon. The header and footer use the
//    official wordmark from the app (public/brand/wordmark-tinta.png).
run(["-i", resolve(assets, "references/logo-icon-orange-circle.png"), "-vf", "crop=680:680:595:207,scale=128:128", resolve(pub, "favicon.png")]);

console.log("Media ready in website/public");
