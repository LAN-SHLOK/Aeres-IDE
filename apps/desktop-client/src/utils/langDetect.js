export const EXT_LANG = {
  // Web
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.css': 'css', '.scss': 'scss', '.sass': 'scss', '.less': 'less',
  '.html': 'html', '.htm': 'html', '.vue': 'html', '.svelte': 'html',
  '.json': 'json', '.jsonc': 'json',
  // Systems
  '.py': 'python', '.pyw': 'python', '.pyi': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp', '.hxx': 'cpp',
  '.java': 'java', '.kt': 'kotlin', '.kts': 'kotlin',
  '.swift': 'swift',
  '.dart': 'dart',
  '.cs': 'csharp',
  // Scripting
  '.rb': 'ruby', '.php': 'php',
  '.lua': 'lua', '.r': 'r', '.R': 'r',
  '.pl': 'perl', '.pm': 'perl',
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell', '.fish': 'shell',
  '.ps1': 'powershell', '.psm1': 'powershell',
  // Data / Config
  '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
  '.md': 'markdown', '.mdx': 'markdown',
  '.yml': 'yaml', '.yaml': 'yaml',
  '.toml': 'toml', '.ini': 'ini',
  '.xml': 'xml', '.svg': 'xml',
  '.env': 'plaintext', '.gitignore': 'plaintext',
  // Other
  '.dockerfile': 'dockerfile',
  '.proto': 'protobuf',
  '.tf': 'hcl', '.hcl': 'hcl',
  '.zig': 'zig', '.nim': 'nim',
  '.ex': 'elixir', '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'fsharp', '.fs': 'fsharp', '.fsx': 'fsharp',
  '.clj': 'clojure', '.cljs': 'clojure',
  '.scala': 'scala',
  '.v': 'verilog', '.vhd': 'vhdl',
  '.asm': 'asm', '.s': 'asm',
}

export function detectLanguage(name) {
  if (!name) return 'plaintext'
  const lastDot = name.lastIndexOf('.')
  if (lastDot === -1) return 'plaintext'
  const ext = name.substring(lastDot).toLowerCase()
  return EXT_LANG[ext] || 'plaintext'
}
