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
    strictIgnore: false,
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

      case "-strict":
      case "-s":
        options.strictIgnore = true;
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
  -h, --help            Show this help message

Examples:
  scaf
  scaf -path ./src -md 2
  scaf -g node_modules .git .env -o structure.txt
  scaf -o tree.json
`);
}

function shouldIgnore(name, ignoreList) {
  return ignoreList.some((pattern) => {
    if (pattern.startsWith(".") && !pattern.includes("/")) {
      return name.endsWith(pattern);
    }
    return name === pattern || name === pattern.replace(/^\//, "");
  });
}

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
    if (shouldIgnore(entry.name, options.ignore)) continue;

    const fullPath = path.join(dir, entry.name);
    const isDir = entry.isDirectory();

    const node = {
      name: entry.name,
      type: isDir ? "directory" : "file",
      children: [],
    };

    if (isDir) {
      node.children = buildTree(fullPath, options, depth + 1);
    }

    results.push(node);
  }

  return results;
}

function formatTreeText(tree, prefix = "", isLast = true, isRoot = true) {
  let output = "";

  tree.forEach((node, index) => {
    const isLastItem = index === tree.length - 1;
    const connector = isRoot ? "" : isLastItem ? "└── " : "├── ";
    //const icon = node.type === "directory" ? "📁 " : "📄 ";
    const name =
      node.type === "directory" ? `${node.name}/` : node.name;

    output += `${prefix}${connector}${name}\n`;

    if (node.children && node.children.length > 0) {
      const newPrefix = isRoot ? "" : prefix + (isLastItem ? "    " : "│   ");
      output += formatTreeText(node.children, newPrefix, isLastItem, false);
    }
  });

  return output;
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
  const tree = buildTree(options.path, options);

  const fullTree = [
    {
      name: rootName,
      type: "directory",
      children: tree,
    },
  ];

  if (options.outputFormat === "json") {
    const jsonOutput = JSON.stringify(fullTree, null, 2);
    if (options.output) {
      fs.writeFileSync(options.output, jsonOutput);
      console.log(`✓ JSON output saved to ${options.output}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    const textOutput = formatTreeMinimal(fullTree);
    if (options.output) {
      fs.writeFileSync(options.output, textOutput);
      console.log(`✓ Output saved to ${options.output}`);
    } else {
      console.log(textOutput);
    }
  }
}

main();