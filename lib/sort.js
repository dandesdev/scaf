import fs from "fs";
import path from "path";

export function getEntryStats(fullPath) {
  try {
    return fs.statSync(fullPath);
  } catch {
    return null;
  }
}

export function sortEntries(entries, sortBy, dir) {
  return entries.sort((a, b) => {
    // Directories always first
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;

    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }

    if (sortBy === "size") {
      const statA = getEntryStats(path.join(dir, a.name));
      const statB = getEntryStats(path.join(dir, b.name));
      const sizeA = statA ? statA.size : 0;
      const sizeB = statB ? statB.size : 0;
      return sizeB - sizeA; // descending
    }

    if (sortBy === "date") {
      const statA = getEntryStats(path.join(dir, a.name));
      const statB = getEntryStats(path.join(dir, b.name));
      const timeA = statA ? statA.mtimeMs : 0;
      const timeB = statB ? statB.mtimeMs : 0;
      return timeB - timeA; // newest first
    }

    return 0;
  });
}
