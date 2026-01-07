export const SIZE_BUCKETS = [
  { key: "empty",   max: 0,                    label: "Empty    (0 B)" },
  { key: "tiny",    max: 1024,                 label: "Tiny     (< 1 KB)" },
  { key: "small",   max: 100 * 1024,           label: "Small    (< 100 KB)" },
  { key: "medium",  max: 1024 * 1024,          label: "Medium   (< 1 MB)" },
  { key: "large",   max: 10 * 1024 * 1024,     label: "Large    (< 10 MB)" },
  { key: "xlarge",  max: 100 * 1024 * 1024,    label: "XLarge   (< 100 MB)" },
  { key: "huge",    max: 1024 * 1024 * 1024,   label: "Huge     (< 1 GB)" },
  { key: "massive", max: Infinity,             label: "Massive  (≥ 1 GB)" },
];

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatStats(stats) {
  const totalSizeFormatted = formatSize(stats.totalSize);
  return `\n${stats.directories} directories, ${stats.files} files, total size: ${totalSizeFormatted}, max depth: ${stats.maxDepthReached}`;
}

export function formatTreeMinimal(tree, options, prefix = "") {
  let output = "";

  tree.forEach((node, index) => {
    const isLastItem = index === tree.length - 1;
    const connector = isLastItem ? "└── " : "├── ";

    let name = node.type === "directory" ? `${node.name}/` : node.name;

    if (options.showSize && node.sizeFormatted) {
      name += ` (${node.sizeFormatted})`;
    }

    output += `${prefix}${connector}${name}\n`;

    if (node.children && node.children.length > 0) {
      const newPrefix = prefix + (isLastItem ? "    " : "│   ");
      output += formatTreeMinimal(node.children, options, newPrefix);
    }
  });

  return output;
}

export function formatDetailedStats(stats) {
  const lines = [];

  lines.push("═══════════════════════════════════════════════");
  lines.push("              DIRECTORY STATISTICS             ");
  lines.push("═══════════════════════════════════════════════");
  lines.push("");

  // Basic counts
  const avgSize = stats.files > 0 ? stats.totalSize / stats.files : 0;
  lines.push("─── Overview ───");
  lines.push(`  Files:            ${stats.files.toLocaleString()}`);
  lines.push(`  Directories:      ${stats.directories.toLocaleString()}`);
  lines.push(`  Total size:       ${formatSize(stats.totalSize)}`);
  lines.push(`  Average size:     ${formatSize(avgSize)}`);
  lines.push(`  Max depth:        ${stats.maxDepthReached}`);
  lines.push(`  Empty folders:    ${stats.emptyFolders}`);
  if (stats.symlinks > 0) {
    lines.push(`  Symlinks:         ${stats.symlinks}`);
  }
  if (stats.unreadable > 0) {
    lines.push(`  Unreadable:       ${stats.unreadable}`);
  }
  lines.push("");

  // Size distribution
  lines.push("─── Size Distribution ───");
  const dist = stats.sizeDistribution;
  const total = stats.files || 1;

  const bar = (count) => {
    const pct = (count / total) * 100;
    const filled = Math.round(pct / 5);
    return "█".repeat(filled) + "░".repeat(20 - filled) +
          ` ${count.toLocaleString().padStart(8)} (${pct.toFixed(1)}%)`;
  };

  for (const bucket of SIZE_BUCKETS) {
    const count = dist[bucket.key];
    if (count > 0 || bucket.key === "empty" || bucket.key === "massive") {
      lines.push(`  ${bucket.label}   ${bar(count)}`);
    }
  }
  lines.push("");

  // Biggest file
  if (stats.biggestFile) {
    lines.push("─── Biggest File ───");
    lines.push(`  Name:     ${stats.biggestFile.name}`);
    lines.push(`  Size:     ${formatSize(stats.biggestFile.size)}`);
    lines.push(`  Location: ${stats.biggestFile.path}`);
    lines.push("");
  }

  // Smallest file
  if (stats.smallestFile) {
    lines.push("─── Smallest File (non-empty) ───");
    lines.push(`  Name:     ${stats.smallestFile.name}`);
    lines.push(`  Size:     ${formatSize(stats.smallestFile.size)}`);
    lines.push(`  Location: ${stats.smallestFile.path}`);
    lines.push("");
  }

  // Oldest file
  if (stats.oldestFile) {
    lines.push("─── Oldest File ───");
    lines.push(`  Name:     ${stats.oldestFile.name}`);
    lines.push(`  Date:     ${new Date(stats.oldestFile.mtime).toLocaleString()}`);
    lines.push(`  Location: ${stats.oldestFile.path}`);
    lines.push("");
  }

  // Newest file
  if (stats.newestFile) {
    lines.push("─── Newest File ───");
    lines.push(`  Name:     ${stats.newestFile.name}`);
    lines.push(`  Date:     ${new Date(stats.newestFile.mtime).toLocaleString()}`);
    lines.push(`  Location: ${stats.newestFile.path}`);
    lines.push("");
  }

  // Top extensions
  const extEntries = Object.entries(stats.extensions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (extEntries.length > 0) {
    lines.push("─── Top Extensions ───");
    const maxExtLen = Math.max(...extEntries.map(([ext]) => ext.length));
    for (const [ext, count] of extEntries) {
      const pct = ((count / stats.files) * 100).toFixed(1);
      lines.push(`  ${ext.padEnd(maxExtLen)}  ${count.toLocaleString().padStart(8)}  (${pct}%)`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════");

  return lines.join("\n");
}
