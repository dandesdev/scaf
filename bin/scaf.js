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
  -path, -p <dir>       Target directory (default: current directory)
  -maxdepth, -md <n>    Maximum depth to traverse (default: infinite)
  -o <file>             Output to file (.txt or .json)
  -ignore, -i <...>     Patterns to ignore (folders, files, extensions)
  -typed-ignore, -ti           Typed ignore mode (see below)
  -h, --help            Show this help message

Typed ignore mode (-ti):
  - "name"   → ignores files with that basename (any extension)
  - "name/"  → ignores folders with that name
  - "*."     → ignores all files (show only folders)
  - "*/"     → ignores all folders (show only files)

Examples:
  scaf                                 # show entire scaffold of current directory
  scaf -p src -md 2                    # show scaffold of src folder up to depth 2
  scaf -o tree.json                    # save entire scaffold of current directory as JSON file called tree.json
  scaf -i node_modules .git .env       # ignore node_modules, .git folder, and .env files
  scaf -ti -i bin/                     # ignore bin folder only
  scaf -ti -i config                   # ignore config.js, config.json, etc.
  scaf -ti -i *.                       # show only folders
  Note that scaf -i -ti bin/ will give an error, the arguments of the flag -i must come just after it.
`);
}

function shouldIgnore(name, isDirectory, ignoreList, typedMode) {
  return ignoreList.some((pattern) => {
    if (pattern === "*.") {
      return !isDirectory;
    }

    if (pattern === "*/") {
      return isDirectory;
    }

    if (typedMode) {
      // Typed mode: trailing / means folder
      if (pattern.endsWith("/")) {
        const folderName = pattern.slice(0, -1);
        return isDirectory && name === folderName;
      }

      // Typed mode: no extension = match file basename (without ext)
      const patternHasExt = pattern.lastIndexOf(".") > 0 && !pattern.startsWith(".");
      if (!patternHasExt) {
        if (isDirectory) return false;
        const baseName = name.includes(".")
          ? name.substring(0, name.lastIndexOf("."))
          : name;
        return baseName === pattern;
      }

      // Has extension: exact match for files only
      return !isDirectory && name === pattern;
    }

    if (pattern.startsWith(".") && !pattern.includes("/")) {
      return name.endsWith(pattern);
    }
    return name === pattern || name === pattern.replace(/^\//, "");
  });
}

// Streaming mode for infinite scale
function streamTree(dir, options, depth = 0, prefix = "") {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  entries = entries.filter((entry) => {
    const isDir = entry.isDirectory();
    return !shouldIgnore(entry.name, isDir, options.ignore, options.typedIgnore);
  });

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  entries.forEach((entry, index) => {
    const isDir = entry.isDirectory();
    const isLastItem = index === entries.length - 1;
    const connector = isLastItem ? "└── " : "├── ";
    const name = isDir ? `${entry.name}/` : entry.name;

    const line = `${prefix}${connector}${name}`;
    options.writer(line);

    if (isDir && depth < options.maxDepth - 1) {
      const newPrefix = prefix + (isLastItem ? "    " : "│   ");
      streamTree(path.join(dir, entry.name), options, depth + 1, newPrefix, isLastItem);
    }
  });
}

// Old buffered mode
function buildTree(dir, options, depth = 0) {
  const results = [];

  if (depth >= options.maxDepth) return results;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
      
    const isDir = entry.isDirectory();
    
    if (shouldIgnore(entry.name, isDir, options.ignore, options.typedIgnore)) continue;
    
    const fullPath = path.join(dir, entry.name);

    const node = {
      name: entry.name,
      type: isDir ? "directory" : "file",
    };

    if (isDir && depth + 1 < options.maxDepth) {
      node.children = buildTree(fullPath, options, depth + 1);
    }

    results.push(node);
  }

  return results;
}


function formatTreeMinimal(tree, prefix = "") {
  let output = "";

  tree.forEach((node, index) => {
    const isLastItem = index === tree.length - 1;
    const connector = isLastItem ? "└── " : "├── ";
    const name =
      node.type === "directory" ? `${node.name}/` : node.name;

    output += `${prefix}${connector}${name}\n`;

    if (node.children && node.children.length > 0) {
      const newPrefix = prefix + (isLastItem ? "    " : "│   ");
      output += formatTreeMinimal(node.children, newPrefix);
    }
  });

  return output;
}

function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!fs.existsSync(options.path)) {
    console.error(`Error: Path "${options.path}" does not exist.`);
    process.exit(1);
  }

  const rootName = path.basename(options.path);

  // JSON needs complete scafold, so output is always buffered
  if (options.outputFormat === "json") {
    const tree = buildTree(options.path, options);
    const fullTree = [{ name: rootName, type: "directory", children: tree }];
    const jsonOutput = JSON.stringify(fullTree, null, 2);

    if (options.output) {
      fs.writeFileSync(options.output, jsonOutput);
      console.log(`✓ JSON output saved to ${options.output}`);
    } else {
      console.log(jsonOutput);
    }
    return;
  }

  // Text output on buffered mode
  if (options.buffered) {
    const tree = buildTree(options.path, options);
    const fullTree = [{ name: rootName, type: "directory", children: tree }];
    const textOutput = formatTreeMinimal(fullTree);

    if (options.output) {
      fs.writeFileSync(options.output, textOutput);
      console.log(`✓ Output saved to ${options.output}`);
    } else {
      console.log(textOutput);
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
  streamTree(options.path, options, 0, "    ");

  if (writeStream) {
    writeStream.end(() => {
      console.log(`✓ Output saved to ${options.output}`);
    });
  }
}

main();