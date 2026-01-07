export function printHelp() {
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
  --stats [mode]           Show stats: console (default), include, all
  --stats-only [mode]      Show detailed stats only: strict (default), all
                          'strict' honors filters, 'all' scans everything
  --size                   Show file sizes
  -a,   --show-hidden      Show hidden files (dotfiles)
  -q,   --quiet            Suppress info messages
  --sort <type>            Sort by: name (default), size, date
  -b,   --buffered         Use buffered mode for text output
  -h,   --help             Show this help message
  
Ignore Files:
  .scafignore              Optionally create your own, its always loaded if 
                            present in the root directory
  .gitignore               Loaded with --gitignore flag
  .dockerignore            Loaded with --dockerignore flag

Typed ignore mode (-ti):
  "name"   → ignores files with that basename (any extension)
  "name/"  → ignores folders with that name
  "*."     → ignores all files
  "*/"     → ignores all folders
  ► Note that scaf -i -ti bin/ will give an error, the arguments of the flag -i must come just after it.

Examples:
  scaf                                 # everything on current directory, with infinite depth
  scaf -p ./src -md 2                  # specific path, max depth 2
  scaf --gitignore --dockerignore      # respect both ignore files
  scaf -n .ts .tsx                     # only TypeScript files
  scaf -d -md 2                        # folders only, 2 levels
  scaf --size --sort size              # show sizes, sort by size
  scaf --stats                         # print stats to console
  scaf --stats include -o tree.txt     # include stats in file
  scaf --stats all -o tree.txt         # stats in file AND console
  scaf -q -o structure.txt             # quiet mode for piping
  scaf --stats-only                    # detailed stats (respects filters)
  scaf --stats-only all                # stats for entire directory
  scaf --stats-only -o report.json     # export stats as JSON
`);
}
