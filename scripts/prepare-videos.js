import { Buffer } from "node:buffer";
import { createWriteStream } from "node:fs";
import { access, mkdir, open, rename, rm } from "node:fs/promises";
import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";

const repository = "Sahild12/Green-Thumb-Garden";
const videoDirectory = join(process.cwd(), "public", "videos");
const videos = ["Netural30sec.mp4", "Plant-Cinematic-Video.mp4"];

async function isMp4(filePath) {
  try {
    await access(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }

  const file = await open(filePath, "r");
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    const { size } = await file.stat();
    return bytesRead === header.length && size > 12 && header.toString("ascii", 4, 8) === "ftyp";
  } finally {
    await file.close();
  }
}

async function prepareVideo(filename) {
  const destination = join(videoDirectory, filename);
  if (await isMp4(destination)) {
    console.log(`Using prepared video: ${filename}`);
    return;
  }

  const url = `https://media.githubusercontent.com/media/${repository}/main/src/assets/${filename}`;
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${filename}: ${response.status} ${response.statusText}`);
  }

  const temporaryFile = `${destination}.download`;
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryFile));
    if (!(await isMp4(temporaryFile))) {
      throw new Error(`Downloaded file is not a valid MP4: ${filename}`);
    }
    await rename(temporaryFile, destination);
    console.log(`Downloaded video: ${filename}`);
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }
}

await mkdir(videoDirectory, { recursive: true });
await Promise.all(videos.map(prepareVideo));
