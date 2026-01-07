# scaf

A CLI tool that prints the scaffold of a project, I made it for myself because I needed powerful and easier ignore patterns in my windows 10 machine. Its node based, so cross-platform, and It can output to a txt or a json file, see examples bellow.

## Installation
Copy all the contents of this repo to your machine, then use the cli tool to get into the folder and run
```bash
npm install -g scaf
```

### Uninstall

```bash
npm uninstall -g scaf
```

You absolutely can use the package manager of your choice, **it doesn't need to be npm**, but you need node already installed.

## Project Structure

The code is organized into focused modules in the `lib/` folder:

- `parseArgs.js` - Command-line argument parsing
- `help.js` - Help message display
- `ignore.js` - Gitignore/dockerignore file loading
- `filter.js` - File filtering logic
- `sort.js` - Sorting and stat retrieval
- `format.js` - Output formatting for text and JSON
- `stats.js` - Statistics tracking and calculation
- `scan.js` - Directory tree building and streaming

The main entry point (`bin/scaf.js`) orchestrates these modules.

## Usage

```bash
scaf [options]
```

## Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--path` | `-p` | Target directory | Current directory |
| `--maxdepth` | `-md` | Maximum folder depth | Infinite |
| `--output` | `-o` | Save to file (.txt or .json) | Print to console |
| `--ignore` | `-i` | Patterns to ignore | None |
| `--typed-ignore` | `-ti` | Enable typed ignore mode | Disabled |
| `--only` | `-n` | Show only matching patterns | All (filtered) |
| `--dirs-only` | `-d` | Show only directories | Disabled |
| `--size` | - | Show file sizes | Disabled |
| `--show-hidden` | `-a` | Show hidden files (dotfiles) | Disabled |
| `--sort` | - | Sort by: name, size, date | name |
| `--stats` | - | Show stats: console, include, all | None |
| `--stats-only` | - | Show detailed stats: strict, all | None |
| `--gitignore` | - | Load .gitignore patterns (true/false) | true |
| `--dockerignore` | - | Load .dockerignore patterns (true/false) | true |
| `--buffered` | `-b` | Use buffered mode for text output | Disabled |
| `--quiet` | `-q` | Suppress info messages | Disabled |
| `--help` | `-h` | Show help | - |

## Ignore Patterns

### Default Mode (`-i`)

Ignores items by exact name or extension:

```bash
scaf -i node_modules .git .env .log
```

- `node_modules` → ignores file or folder named "node_modules"
- `.log` → ignores all files ending in `.log`

### Typed Mode (`-ti` + `-i`)

Makes patterns **type-aware**. Use trailing `/` for folders:

```bash
scaf -ti -i bin/ config *. .tmp
```

- `bin/` → ignores **only** the folder "bin"
- `config` → ignores files named "config" (any extension: `config.js`, `config.json`)
- `*.` → ignores **all files** (shows only folders)
- `*/` → ignores **all folders** (shows only root-level files)
- `.tmp` → still works as extension match

## Examples

### Basic tree
```bash
scaf
```

### Scan specific directory
```bash
scaf -p ./src
```

### Limit depth
```bash
scaf -md 2
```

### Save to text file
```bash
scaf -o structure.txt
```

### Save to JSON
```bash
scaf -o tree.json
```

### Ignore common folders
```bash
scaf -i node_modules .git dist
```

### Ignore only the `bin` folder
```bash
scaf -ti -i bin/
```

### Ignore all `config` files (any extension)
```bash
scaf -ti -i config
```

### Show only folders
```bash
scaf -ti -i *.
```

### Show only files (ignore all folders)
```bash
scaf -ti -i */
```

### Complex ignore
```bash
scaf -ti -i node_modules/ *.md .env config
```

### Combine options
```bash
scaf -p ./myapp -md 3 -ti -i node_modules/ dist/ *.log -o output.txt
```

### Show only TypeScript files
```bash
scaf -n .ts .tsx
```

### Show file sizes sorted by size
```bash
scaf --size --sort size
```

### Generate statistics
```bash
scaf --stats
scaf --stats all -o report.txt
scaf --stats-only -o stats.json
```

### Include hidden files
```bash
scaf -a
```

### Note!
```bash
scaf -i -ti src/
```
will not ignore the folder "src", you must pass all the arguments of the flag "-i" right after it, the correct way would be:
```bash
scaf -ti -i src/
```

## Output Format

### Text (default)
```txt
└── MyApp/
├── src/
│   ├── components/
│   │   └── Button.tsx
│   └── index.ts
└── package.json
```

### JSON
```json
[
  {
    "name": "MyApp",
    "type": "directory",
    "children": [
      {
        "name": "src",
        "type": "directory",
        "children": [
            {
                "name": "components",
                "type": "directory",
                "children": [
                    {
                        "name": "Button.tsx",
                        "type": "file"
                    }
                ]
            }
        ]
      },
      {
        "name": "package.json",
        "type": "file"
      }
    ]
  }
]

### License

MIT