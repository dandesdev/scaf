#!/usr/bin/env node

import fs from "fs";
import path from "path";

function parseArgs(args) {
  const options = {
    path: process.cwd(),
    maxDepth: Infinity,
    output: null,
    outputFormat: "text",
    ignore: [],
    typedIgnore: false,
    buffered: false,
    only: [],
    gitignore: false,
    stats: null,           // null | "console" | "include" | "all"
    dirsOnly: false,
    showSize: false,
    showHidden: false,     // default: do not show hidden files
    quiet: false,
    sort: "name",          // "name" | "size" | "date"
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
        case "-path":
        case "-p":
            options.path = path.resolve(args[++i] || ".");
            break;

        case "-maxdepth":
        case "-md":
            options.maxDepth = parseInt(args[++i], 10) || Infinity;
            break;

        case "-o":
            options.output = args[++i] || "output.txt";
            if (options.output.endsWith(".json")) {
            options.outputFormat = "json";
            }
            break;

        case "-ignore":
        case "-i":
            while (args[i + 1] && !args[i + 1].startsWith("-")) {
            options.ignore.push(args[++i]);
            }
            break;

        case "-typed-ignore":
        case "-ti":
            options.typedIgnore = true;
            break;

        case "-buffered":
        case "-b":
            options.buffered = true;
            break;

	    case "--only":
        case "-n":
            while (args[i + 1] && !args[i + 1].startsWith("-")) {
                options.only.push(args[++i]);
            }
            break;

        case "--gitignore":
            options.gitignore = true;
            break;

        case "--stats":
            const statsArg = args[i + 1];
            if (statsArg && !statsArg.startsWith("-")) {
                options.stats = args[++i];
            } else {
                options.stats = "console";
            }
            break;

        case "-d":
        case "--dirs-only":
            options.dirsOnly = true;
            break;

        case "--size":
            options.showSize = true;
            break;

        case "-a":
        case "--show-hidden":
            options.showHidden = true;
            break;

        case "-q":
        case "--quiet":
            options.quiet = true;
            break;

        case "--sort":
            const sortVal = args[++i];
            if (["name", "size", "date"].includes(sortVal)) {
                options.sort = sortVal;
            }
            break;

      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
scaf - Directory tree CLI tool

Usage: scaf [options]

Options:
  -p,   --path <dir>       Target directory (default: current directory)
  -md,  --maxdepth <n>     Maximum folder depth (default: infinite)
  -o    <file>             Output to file (.txt or .json)
  -i,   --ignore <...>     Patterns to ignore
  -ti,  --typed-ignore     Enable typed ignore mode
  
  -n,   --only <...>       Show only matching patterns
  -d,   --dirs-only        Show only directories
  --gitignore              Respect .gitignore rules
  --stats [mode]           Show stats: console (default), include, all
  --size                   Show file sizes
  -a,   --show-hidden      Show hidden files (default)
  -q,   --quiet            Suppress info messages
  --sort <type>            Sort by: name (default), size, date
  -b,   --buffered         Use buffered mode for text output
  -h,   --help             Show this help message
  
  Typed ignore mode (-ti):
  "name"   → ignores files with that basename (any extension)
  "name/"  → ignores folders with that name
  "*."     → ignores all files
  "*/"     → ignores all folders
  ► Note that scaf -i -ti bin/ will give an error, the arguments of the flag -i must come just after it.

Examples:
  scaf                                 # everything on current directory, with infinite depth
  scaf -p ./src -md 2                  # specific path, max depth 2
  scaf --gitignore                     # respect .gitignore
  scaf -n .ts .tsx                     # only TypeScript files
  scaf -d -md 2                        # folders only, 2 levels
  scaf --size --sort size              # show sizes, sort by size
  scaf --stats                         # print stats to console
  scaf --stats include -o tree.txt     # include stats in file
  scaf --stats all -o tree.txt         # stats in file AND console
  scaf -q -o structure.txt             # quiet mode for piping
`);
}


// ─── Gitignore Parsing ───────────────────────────────────────────────────────
function parseGitignore(rootPath) {
  const gitignorePath = path.join(rootPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return [];

  const content = fs.readFileSync(gitignorePath, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((pattern) => pattern.replace(/\/$/, "")); // normalize trailing slashes
}

// ─── Include Pattern Matching ────────────────────────────────────────────────
function matchesOnly(name, isDirectory, onlyList) {
  if (onlyList.length === 0) return true;
  if (isDirectory) return true; // always traverse directories

  return onlyList.some((pattern) => {
    if (pattern.startsWith(".")) {
      return name.endsWith(pattern);
    }
    return name === pattern;
  });
}

// ─── Hidden File Check ───────────────────────────────────────────────────────
function isHidden(name) {
  return name.startsWith(".");
}

// ─── File Size Formatting ────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Get Entry Stats ─────────────────────────────────────────────────────────
function getEntryStats(fullPath) {
  try {
    return fs.statSync(fullPath);
  } catch {
    return null;
  }
}

// ─── Sorting ─────────────────────────────────────────────────────────────────
function sortEntries(entries, sortBy, dir) {
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

// ─── Stats Tracking ──────────────────────────────────────────────────────────
function createStats() {
  return {
    files: 0,
    directories: 0,
    maxDepthReached: 0,
    totalSize: 0,
  };
}

function formatStats(stats) {
  const totalSizeFormatted = formatSize(stats.totalSize);
  return `\n${stats.directories} directories, ${stats.files} files, total size: ${totalSizeFormatted}, max depth: ${stats.maxDepthReached}`;
}

// ─── Ignoring ────────────────────────────────────────────────────────────────
function shouldIgnore(name, isDirectory, options) {
  const { ignore, typedIgnore, gitignorePatterns = [] } = options;
  const allIgnore = [...ignore, ...gitignorePatterns];

  return allIgnore.some((pattern) => {
    if (pattern === "*.") return !isDirectory;
    if (pattern === "*/") return isDirectory;

    if (typedIgnore) {
      if (pattern.endsWith("/")) {
        const folderName = pattern.slice(0, -1);
        return isDirectory && name === folderName;
      }

      const patternHasExt = pattern.lastIndexOf(".") > 0 && !pattern.startsWith(".");
      if (!patternHasExt) {
        if (isDirectory) return false;
        const baseName = name.lastIndexOf(".") !== -1
          ? name.substring(0, name.lastIndexOf("."))
          : name;
        return baseName === pattern;
      }

      return !isDirectory && name === pattern;
    }

    if (pattern.startsWith(".") && !pattern.includes("/")) {
      return name.endsWith(pattern);
    }
    return name === pattern || name === pattern.replace(/^\//, "");
  });
}

// ─── Streaming mode for infinite scale ───────────────────────────────────────
function streamTree(dir, options, stats, depth = 0, prefix = "") {
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

    if (isDir) {
      stats.directories++;
    } else {
      stats.files++;
      const stat = getEntryStats(fullPath);
      if (stat) {
        stats.totalSize += stat.size;
      }
    }
    stats.maxDepthReached = Math.max(stats.maxDepthReached, depth + 1);

    let name = isDir ? `${entry.name}/` : entry.name;

    if (options.showSize && !isDir) {
      const stat = getEntryStats(fullPath);
      if (stat) {
        name += ` (${formatSize(stat.size)})`;
      }
    }

    const line = `${prefix}${connector}${name}`;
    options.writer(line);

    if (isDir && depth < options.maxDepth - 1) {
      const newPrefix = prefix + (isLastItem ? "    " : "│   ");
      streamTree(fullPath, options, stats, depth + 1, newPrefix);
    }
  });
}

// ─── Buffered mode ───────────────────────────────────────────────────────────
function buildTree(dir, options, stats, depth = 0) {
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
        node.size = stat.size;
        node.sizeFormatted = formatSize(stat.size);
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

function formatTreeMinimal(tree, options, prefix = "") {
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

// ─── Main! ───────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!fs.existsSync(options.path)) {
    console.error(`Error: Path "${options.path}" does not exist.`);
    process.exit(1);
  }

  // Load gitignore patterns
  if (options.gitignore) {
    options.gitignorePatterns = parseGitignore(options.path);
  } else {
    options.gitignorePatterns = [];
  }

  const rootName = path.basename(options.path);
  const stats = createStats();
  stats.directories = 1; // count root

  const log = (msg) => {
    if (!options.quiet) console.log(msg);
  };

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

  options.writer(`${rootName}/`);
  streamTree(options.path, options, stats, 0, "");

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