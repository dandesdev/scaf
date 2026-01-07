import fs from "fs";
import path from "path";

export function parseIgnoreFile(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((pattern) => pattern.replace(/\/$/, ""));
}

export function loadIgnorePatterns(rootPath, options) {
  const patterns = [];

  const ignoreFiles = [
    { file: ".scafignore", flag: true },                    // always load if exists
    { file: ".gitignore", flag: options.gitignore },
    { file: ".dockerignore", flag: options.dockerignore },
  ];

  for (const { file, flag } of ignoreFiles) {
    if (flag) {
      const filePath = path.join(rootPath, file);
      const filePatterns = parseIgnoreFile(filePath);
      patterns.push(...filePatterns);
    }
  }

  return patterns;
}
