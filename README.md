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

### Complex ignore
```bash
scaf -ti -i node_modules/ *.md .env config
```

### Combine options
```bash
scaf -p ./myapp -md 3 -ti -i node_modules/ dist/ *.log -o output.txt
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