export function matchesOnly(name, isDirectory, onlyList) {
  if (onlyList.length === 0) return true;
  if (isDirectory) return true; // always traverse directories

  return onlyList.some((pattern) => {
    if (pattern.startsWith(".")) {
      return name.endsWith(pattern);
    }
    return name === pattern;
  });
}

export function isHidden(name) {
  return name.startsWith(".");
}

export function shouldIgnore(name, isDirectory, options) {
  const { ignore, typedIgnore, ignorePatterns = [] } = options;
  const allIgnore = [...ignore, ...ignorePatterns];

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
