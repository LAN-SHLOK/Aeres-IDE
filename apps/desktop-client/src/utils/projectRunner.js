/**
 * Smart Project Runner Utility
 * Detects the entry point and correct command to run a project or file.
 */

export async function detectProjectCommand(rootPath) {
  if (!rootPath || !window.electron) return null;
  const e = window.electron;
  
  // Normalize path
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');

  // 1. Node.js / Web
  const hasPackageJson = await e.fs.exists(`${normalizedRoot}/package.json`);
  if (hasPackageJson) {
    try {
      const content = await e.fs.readFile(`${rootPath}/package.json`);
      const pkg = JSON.parse(content);
      const scripts = pkg.scripts || {};
      if (scripts.dev) return 'npm run dev';
      if (scripts.start) return 'npm start';
      if (scripts.run) return 'npm run';
      // If vite is a dependency but dev script is missing
      if (pkg.dependencies?.vite || pkg.devDependencies?.vite) return 'npx vite';
      return 'npm start';
    } catch (err) {
      console.warn('Failed to parse package.json', err);
    }
  }

  // 2. Python
  const pythonEntryPoints = ['main.py', 'app.py', 'server.py', 'run.py', 'manage.py'];
  for (const entry of pythonEntryPoints) {
    if (await e.fs.exists(`${rootPath}/${entry}`)) {
      return `python "${rootPath}/${entry}"`;
    }
  }

  // 3. Go
  if (await e.fs.exists(`${rootPath}/go.mod`) || await e.fs.exists(`${rootPath}/main.go`)) {
    return 'go run .';
  }

  // 4. Rust
  if (await e.fs.exists(`${rootPath}/Cargo.toml`)) {
    return 'cargo run';
  }

  // 5. C++ / C
  if (await e.fs.exists(`${rootPath}/CMakeLists.txt`)) {
    return 'cmake --build build && ./build/main'; // generic guess
  }
  if (await e.fs.exists(`${rootPath}/Makefile`)) {
    return 'make && ./main';
  }

  // 6. Static Web
  if (await e.fs.exists(`${rootPath}/index.html`)) {
    return 'open-browser'; // special signal to open in browser
  }

  return null;
}

export async function detectFileCommand(filePath, content = '') {
  if (!filePath) return null;
  const name = filePath.split(/[/\\]/).pop();
  const ext = name.includes('.') ? '.' + name.split('.').pop().toLowerCase() : '';

  // Extension-based detection
  switch (ext) {
    case '.py': return `python "${filePath}"`;
    case '.js': return `node "${filePath}"`;
    case '.ts': return `ts-node "${filePath}"`;
    case '.go': return `go run "${filePath}"`;
    case '.rs': return `rustc "${filePath}" && ./${name.replace('.rs', '')}`;
    case '.cpp': return `g++ "${filePath}" -o main && ./main`;
    case '.java': return `javac "${filePath}" && java ${name.replace('.java', '')}`;
    case '.html': return 'live-server';
    case '.sh': return `bash "${filePath}"`;
  }

  // Content-based detection for non-standard or missing extensions
  if (content) {
    if (content.startsWith('#!/usr/bin/env python') || content.startsWith('#!/usr/bin/python')) return `python "${filePath}"`;
    if (content.startsWith('#!/usr/bin/env node')) return `node "${filePath}"`;
    if (content.includes('package main') && content.includes('func main()')) return `go run "${filePath}"`;
    if (content.includes('int main(') || content.includes('using namespace std;')) return `g++ "${filePath}" -o main && ./main`;
    if (content.includes('public static void main(String[] args)')) return `javac "${filePath}" && java ${name.replace('.java', '')}`;
  }

  return null;
}
