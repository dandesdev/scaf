import fs from "fs";
import path from "path";
import { formatSize } from "./format.js";
import { sortEntries, getEntryStats } from "./sort.js";
import { isHidden, shouldIgnore, matchesOnly } from "./filter.js";

export function streamTree(dir, options, stats, depth = 0, prefix = "") {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  // Filter entries
  entries = entries.filter((entry) => {
    const isDir = entry.isDirectory();

    if (!options.showHidden && isHidden(entry.name)) return false;

    if (shouldIgnore(entry.name, isDir, options)) return false;

    if (!matchesOnly(entry.name, isDir, options.only)) return false;

    if (options.dirsOnly && !isDir) return false;

    return true;
  });

  entries = sortEntries(entries, options.sort, dir);

  entries.forEach((entry, index) => {
    const isDir = entry.isDirectory();
    const isLastItem = index === entries.length - 1;
    const connector = isLastItem ? "└── " : "├── ";
    const fullPath = path.join(dir, entry.name);

    let name = isDir ? `${entry.name}/` : entry.name;

    if (isDir) {
    stats.directories++;
    } else {
    stats.files++;
    const stat = getEntryStats(fullPath);
    if (stat) {
        stats.totalSize += stat.size;
        if (options.showSize) {
        name += ` (${formatSize(stat.size)})`;
        }
    }
    }
    stats.maxDepthReached = Math.max(stats.maxDepthReached, depth + 1);

    const line = `${prefix}${connector}${name}`;
    options.writer(line);

    if (isDir && depth < options.maxDepth - 1) {
      const newPrefix = prefix + (isLastItem ? "    " : "│   ");
      streamTree(fullPath, options, stats, depth + 1, newPrefix);
    }
  });
}

export function buildTree(dir, options, stats, depth = 0) {
  const results = [];

  if (depth >= options.maxDepth) return results;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  // Filter
  entries = entries.filter((entry) => {
    const isDir = entry.isDirectory();
    if (!options.showHidden && isHidden(entry.name)) return false;
    if (shouldIgnore(entry.name, isDir, options)) return false;
    if (!matchesOnly(entry.name, isDir, options.only)) return false;
    if (options.dirsOnly && !isDir) return false;
    return true;
  });

  entries = sortEntries(entries, options.sort, dir);

  for (const entry of entries) {
    const isDir = entry.isDirectory();
    const fullPath = path.join(dir, entry.name);

    const node = {
      name: entry.name,
      type: isDir ? "directory" : "file",
    };
    
    if (isDir) {
      stats.directories++;
    } else {
      stats.files++;
      const stat = getEntryStats(fullPath);
      if (stat) {
      stats.totalSize += stat.size;
      if (options.showSize) {
        node.size = stat.size;
        node.sizeFormatted = formatSize(stat.size);
      }
    }
    }
    
    stats.maxDepthReached = Math.max(stats.maxDepthReached, depth + 1);

    if (isDir) {
      node.children = buildTree(fullPath, options, stats, depth + 1);
    }

    results.push(node);
  }

  return results;
}
