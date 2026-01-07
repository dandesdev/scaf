import path from "path";
import { printHelp } from "./help.js";

export function parseArgs(args) {
  const options = {
    path: process.cwd(),
    maxDepth: Infinity,
    output: null,
    outputFormat: "text",
    ignore: [],
    typedIgnore: false,
    buffered: false,
    only: [],
    gitignore: true,
    dockerignore: true,
    stats: null,           // null | "console" | "include" | "all"
    statsOnly: null,       // null | "strict" | "all"
    dirsOnly: false,
    showSize: false,
    showHidden: false,     // default: do not show hidden files
    quiet: false,
    sort: "name",          // "name" | "size" | "date"
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
        case "--path":
        case "-p":
            options.path = path.resolve(args[++i] || ".");
            break;

        case "--maxdepth":
        case "-md":
            options.maxDepth = parseInt(args[++i], 10) || Infinity;
            break;

        case "-o":
            options.output = args[++i] || "output.txt";
            if (options.output.endsWith(".json")) {
                options.outputFormat = "json";
            }
            break;

        case "--ignore":
        case "-i":
            while (args[i + 1] && !args[i + 1].startsWith("-")) {
                options.ignore.push(args[++i]);
            }
            break;

        case "--typed-ignore":
        case "-ti":
            options.typedIgnore = true;
            break;

        case "--buffered":
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
            const gitArg = args[i+1];
            if (gitArg && !gitArg.startsWith("-")) {
                const val = args[++i];
                if(["true", "false"].includes(val.toLowerCase())) {
                    options.gitignore = val.toLowerCase() === "true";
                } else {
                    console.error(`Invalid --gitignore value: ${val}. Use: true, false`);
                    process.exit(1);
                }
            } else {
                options.gitignore = true;
            }
            break;

        case "--dockerignore":
            const dockerArg = args[i+1];
            if (dockerArg && !dockerArg.startsWith("-")) {
                const val = args[++i];
                if(["true", "false"].includes(val.toLowerCase())) {
                    options.dockerignore = val.toLowerCase() === "true";
                } else {
                    console.error(`Invalid --dockerignore value: ${val}. Use: true, false`);
                    process.exit(1);
                }
            } else {
                options.dockerignore = true;
            }
            break;

        case "--stats":
        const statsArg = args[i + 1];
        if (statsArg && !statsArg.startsWith("-")) {
            const val = args[++i];
            if (["console", "include", "all"].includes(val)) {
                options.stats = val;
            } else {
                console.error(`Invalid --stats value: ${val}. Use: console, include, all`);
                process.exit(1);
            }
        } else {
            options.stats = "console";
        }
        break;

        case "--stats-only":
        const statsOnlyArg = args[i + 1];
        if (statsOnlyArg && !statsOnlyArg.startsWith("-")) {
          const val = args[++i];
          if (["strict", "all"].includes(val)) {
            options.statsOnly = val;
          } else {
            console.error(`Invalid --stats-only value: ${val}. Use: "strict" or "all"`);
            process.exit(1);
          }
        } else {
          options.statsOnly = "strict";
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
