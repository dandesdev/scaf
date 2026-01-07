import fs from "fs";
import path from "path";
import { formatSize } from "./format.js";
import { SIZE_BUCKETS } from "./format.js";
import { getEntryStats } from "./sort.js";
import { isHidden, shouldIgnore, matchesOnly } from "./filter.js";

export function createStats() {
  return {
    files: 0,
    directories: 0,
    maxDepthReached: 0,
    totalSize: 0,
  };
}

export function classifySize(size) {
  for (const bucket of SIZE_BUCKETS) {
    if (size <= bucket.max) return bucket.key;
  }
  return "massive";
}

export function createSizeDistribution() {
  const dist = {};
  for (const bucket of SIZE_BUCKETS) {
    dist[bucket.key] = 0;
  }
  return dist;
}

export function createDetailedStats() {
  return {
    files: 0,
    directories: 0,
    totalSize: 0,
    maxDepthReached: 0,
    emptyFolders: 0,
    unreadable: 0,
    symlinks: 0,
    extensions: {},
    biggestFile: null,
    smallestFile: null,
    oldestFile: null,
    newestFile: null,
    sizeDistribution: createSizeDistribution(),
  };
}

export function scanForStats(dir, options, stats, depth = 0) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    stats.unreadable++;
    return;
  }

  if (options.statsOnly === "strict") {
    entries = entries.filter((entry) => {
      const isDir = entry.isDirectory();
      if (!options.showHidden && isHidden(entry.name)) return false;
      if (shouldIgnore(entry.name, isDir, options)) return false;
      if (!matchesOnly(entry.name, isDir, options.only)) return false;
      if (options.dirsOnly && !isDir) return false;
      return true;
    });
  } else {
    if (!options.showHidden) {
      entries = entries.filter((entry) => !isHidden(entry.name));
    }
  }

  let hasVisibleChildren = false;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const isDir = entry.isDirectory();
    const isSymlink = entry.isSymbolicLink();

    if (isSymlink) {
      stats.symlinks++;
      hasVisibleChildren = true;
      continue;
    }

    if (isDir) {
      stats.directories++;
      const prevFiles = stats.files;
      const prevDirs = stats.directories;

      scanForStats(fullPath, options, stats, depth + 1);

      const addedFiles = stats.files - prevFiles;
      const addedDirs = stats.directories - prevDirs;
      if (addedFiles === 0 && addedDirs === 0) {
        stats.emptyFolders++;
      }

      hasVisibleChildren = true;
    } else {
      stats.files++;
      hasVisibleChildren = true;

      const stat = getEntryStats(fullPath);
      if (!stat) {
        stats.unreadable++;
        continue;
      }

      const size = stat.size;
      const mtime = stat.mtimeMs;

      stats.totalSize += size;

      // Size distribution
      stats.sizeDistribution[classifySize(size)]++;

      // Biggest file
      if (!stats.biggestFile || size > stats.biggestFile.size) {
        stats.biggestFile = { name: entry.name, path: fullPath, size };
      }

      // Smallest file (non-empty)
      if (size > 0 && (!stats.smallestFile || size < stats.smallestFile.size)) {
        stats.smallestFile = { name: entry.name, path: fullPath, size };
      }

      // Oldest file
      if (!stats.oldestFile || mtime < stats.oldestFile.mtime) {
        stats.oldestFile = { name: entry.name, path: fullPath, mtime };
      }

      // Newest file
      if (!stats.newestFile || mtime > stats.newestFile.mtime) {
        stats.newestFile = { name: entry.name, path: fullPath, mtime };
      }

      // Extensions
      const ext = path.extname(entry.name).toLowerCase() || "(no extension)";
      stats.extensions[ext] = (stats.extensions[ext] || 0) + 1;
    }

    stats.maxDepthReached = Math.max(stats.maxDepthReached, depth + 1);
  }
}
