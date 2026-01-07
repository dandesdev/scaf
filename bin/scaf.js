#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { parseArgs } from "../lib/parseArgs.js";
import { loadIgnorePatterns } from "../lib/ignore.js";
import { formatSize, formatStats, formatTreeMinimal, formatDetailedStats } from "../lib/format.js";
import { createStats, createDetailedStats, scanForStats } from "../lib/stats.js";
import { streamTree, buildTree } from "../lib/scan.js";


// ─── Main! ───────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!fs.existsSync(options.path)) {
    console.error(`Error: Path "${options.path}" does not exist.`);
    process.exit(1);
  }

  // Load gitignore patterns
  options.ignorePatterns = loadIgnorePatterns(options.path, options);

  const rootName = path.basename(options.path);
  const stats = createStats();
  stats.directories = 1; // count root

  const log = (msg) => {
    if (!options.quiet) console.log(msg);
  };
  
  if (options.statsOnly) {
    const detailedStats = createDetailedStats();
    detailedStats.directories = 1;

    scanForStats(options.path, options, detailedStats);

    const output = formatDetailedStats(detailedStats);

    if (options.output) {
      if (options.outputFormat === "json") {
        const jsonStats = {
          files: detailedStats.files,
          directories: detailedStats.directories,
          totalSize: detailedStats.totalSize,
          totalSizeFormatted: formatSize(detailedStats.totalSize),
          averageSize: detailedStats.files > 0 ? Math.round(detailedStats.totalSize / detailedStats.files) : 0,
          averageSizeFormatted: formatSize(detailedStats.files > 0 ? detailedStats.totalSize / detailedStats.files : 0),
          maxDepthReached: detailedStats.maxDepthReached,
          emptyFolders: detailedStats.emptyFolders,
          symlinks: detailedStats.symlinks,
          unreadable: detailedStats.unreadable,
          sizeDistribution: {
            empty: { label: "0 B", count: detailedStats.sizeDistribution.empty },
            tiny: { label: "1 B - 1 KB", count: detailedStats.sizeDistribution.tiny },
            small: { label: "1 KB - 100 KB", count: detailedStats.sizeDistribution.small },
            medium: { label: "100 KB - 1 MB", count: detailedStats.sizeDistribution.medium },
            large: { label: "1 MB - 10 MB", count: detailedStats.sizeDistribution.large },
            xlarge: { label: "10 MB - 100 MB", count: detailedStats.sizeDistribution.xlarge },
            huge: { label: "100 MB - 1 GB", count: detailedStats.sizeDistribution.huge },
            massive: { label: "1 GB+", count: detailedStats.sizeDistribution.massive },
          },
          biggestFile: detailedStats.biggestFile
            ? { ...detailedStats.biggestFile, sizeFormatted: formatSize(detailedStats.biggestFile.size) }
            : null,
          smallestFile: detailedStats.smallestFile
            ? { ...detailedStats.smallestFile, sizeFormatted: formatSize(detailedStats.smallestFile.size) }
            : null,
          oldestFile: detailedStats.oldestFile
            ? { ...detailedStats.oldestFile, date: new Date(detailedStats.oldestFile.mtime).toISOString() }
            : null,
          newestFile: detailedStats.newestFile
            ? { ...detailedStats.newestFile, date: new Date(detailedStats.newestFile.mtime).toISOString() }
            : null,
          extensions: Object.entries(detailedStats.extensions)
            .sort((a, b) => b[1] - a[1])
            .map(([ext, count]) => ({ ext, count })),
        };
        fs.writeFileSync(options.output, JSON.stringify(jsonStats, null, 2));
        log(`✓ Stats saved to ${options.output}`);
      } else {
        fs.writeFileSync(options.output, output);
        log(`✓ Stats saved to ${options.output}`);
      }
    } else {
      console.log(output);
    }

    return;
  }

  // JSON output needs complete scaffold, so its always buffered
  if (options.outputFormat === "json") {
    const tree = buildTree(options.path, options, stats);

    const fullTree = {
      name: rootName,
      type: "directory",
      children: tree,
    };

    if (options.stats === "include" || options.stats === "all") {
      fullTree.meta = {
        directories: stats.directories,
        files: stats.files,
        maxDepthReached: stats.maxDepthReached,
        totalSize: stats.totalSize
      };
    }

    const jsonOutput = JSON.stringify([fullTree], null, 2);

    if (options.output) {
      fs.writeFileSync(options.output, jsonOutput);
      log(`✓ JSON output saved to ${options.output}`);
    } else {
      console.log(jsonOutput);
    }

    if (options.stats === "console" || options.stats === "all") {
      console.log(formatStats(stats));
    }

    return;
  }

  // Text output on buffered mode
  if (options.buffered) {
    const tree = buildTree(options.path, options, stats);
    const fullTree = [{ name: rootName, type: "directory", children: tree }];
    let textOutput = formatTreeMinimal(fullTree, options);

    if (options.stats === "include" || options.stats === "all") {
      textOutput += formatStats(stats);
    }

    if (options.output) {
      fs.writeFileSync(options.output, textOutput);
      log(`✓ Output saved to ${options.output}`);
    } else {
      console.log(textOutput);
    }

    if (options.stats === "console" || (options.stats === "all" && options.output)) {
      console.log(formatStats(stats));
    }

    return;
  }

  // Text output on streaming (default)
  let writeStream = null;

  if (options.output) {
    writeStream = fs.createWriteStream(options.output);
    options.writer = (line) => writeStream.write(line + "\n");
  } else {
    options.writer = (line) => console.log(line);
  }

  options.writer(`└── ${rootName}/`);
  streamTree(options.path, options, stats, 0, "    ");

  const finalize = () => {
    if (options.stats === "include" || options.stats === "all") {
      options.writer(formatStats(stats));
    }

    if (options.output && (options.stats === "console" || options.stats === "all")) {
      console.log(formatStats(stats));
    }
  };

  if (writeStream) {
    finalize();
    writeStream.end(() => {
      log(`✓ Output saved to ${options.output}`);
    });
  } else {
    if (options.stats === "console" || options.stats === "all") {
      console.log(formatStats(stats));
    }
  }
}

main();