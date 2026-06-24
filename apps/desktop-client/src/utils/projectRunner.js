/**
 * Project Runner Utilities
 * Detects the correct shell command to run or test a file or project.
 * Supports 30+ languages and all major frameworks.
 */

import { useStore } from '../store.js'

/**
 * Detects the run command for a single file based on its extension/language.
 * Returns a command string, 'open-browser' for HTML files, or null if unknown.
 *
 * @param {string} filePath
 * @param {string} [content]
 * @returns {Promise<string|null>}
 */
export async function detectFileCommand(filePath, content) {
  const lower = filePath.toLowerCase()

  // Python
  if (lower.endsWith('.py')) {
    try {
      const store = useStore.getState()
      const rootPath = store.rootPath
      if (rootPath && window.electron) {
        const sep = rootPath.includes('\\') ? '\\' : '/'
        const aeresDir = `${rootPath}${sep}.aeres`
        await window.electron.fs.createFolder(aeresDir)
        const runnerPath = `${aeresDir}${sep}temporal_runner.py`
        const runnerCode = `
import sys, cProfile, pstats, json, os
def main():
    if len(sys.argv) < 2: sys.exit(1)
    script_path = sys.argv[1]
    sys.argv = sys.argv[1:]
    sys.path.insert(0, os.path.dirname(os.path.abspath(script_path)))
    profiler = cProfile.Profile()
    try:
        with open(script_path, 'rb') as f: code = compile(f.read(), script_path, 'exec')
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    globals_dict = {'__name__': '__main__', '__file__': script_path, '__builtins__': __builtins__}
    profiler.enable()
    try: exec(code, globals_dict)
    except BaseException: pass
    finally: profiler.disable()
    stats = pstats.Stats(profiler)
    new_data = {}
    for func, (cc, nc, tt, ct, callers) in stats.stats.items():
        filename, line, name = func
        if not filename or filename.startswith('<') or 'site-packages' in filename: continue
        abs_filename = os.path.abspath(filename)
        duration_ms = (ct / nc) * 1000 if nc > 0 else 0
        if abs_filename not in new_data: new_data[abs_filename] = []
        new_data[abs_filename].append({'line': line, 'name': name, 'durationMs': duration_ms, 'calls': nc})
    
    aeres_dir = os.path.join(os.getcwd(), '.aeres')
    os.makedirs(aeres_dir, exist_ok=True)
    out_file = os.path.join(aeres_dir, 'temporal_lens.json')
    history_data = {}
    if os.path.exists(out_file):
        try:
            with open(out_file, 'r') as f: history_data = json.load(f)
        except: pass
    for filename, functions in new_data.items():
        if filename not in history_data: history_data[filename] = []
        existing_funcs = {f"{f['line']}_{f['name']}": f for f in history_data[filename]}
        for new_f in functions:
            key = f"{new_f['line']}_{new_f['name']}"
            if key in existing_funcs:
                hist = existing_funcs[key].get('history', [])
                hist.insert(0, new_f['durationMs'])
                hist = hist[:20]
                existing_funcs[key]['durationMs'] = sum(hist) / len(hist)
                existing_funcs[key]['calls'] = new_f['calls']
                existing_funcs[key]['history'] = hist
            else:
                new_f['history'] = [new_f['durationMs']]
                existing_funcs[key] = new_f
        history_data[filename] = list(existing_funcs.values())
    with open(out_file, 'w') as f: json.dump(history_data, f)
if __name__ == '__main__': main()
`.trim()
        await window.electron.fs.writeFile(runnerPath, runnerCode)
        return `python "${runnerPath}" "${filePath}"`
      }
    } catch (e) {}
    return `python "${filePath}"`
  }
  // JavaScript & TypeScript
  const isJs = (lower.endsWith('.js') && !lower.endsWith('.jsx')) || lower.endsWith('.mjs') || lower.endsWith('.cjs')
  const isTs = lower.endsWith('.ts') && !lower.endsWith('.tsx')
  
  if (isJs || isTs) {
    try {
      const store = useStore.getState()
      const rootPath = store.rootPath
      if (rootPath && window.electron) {
        const sep = rootPath.includes('\\') ? '\\' : '/'
        const aeresDir = `${rootPath}${sep}.aeres`
        await window.electron.fs.createFolder(aeresDir)
        const runnerPath = `${aeresDir}${sep}temporal_runner.js`
        const runnerCode = `
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const target = process.argv[2];
const isTsx = target.endsWith('.ts') || target.endsWith('.tsx');
const aeresDir = path.join(process.cwd(), '.aeres');
if (!fs.existsSync(aeresDir)) fs.mkdirSync(aeresDir);
const profPath = path.join(aeresDir, 'temp.cpuprofile');
if (fs.existsSync(profPath)) fs.unlinkSync(profPath);
let cmd = 'node';
let args = ['--cpu-prof', '--cpu-prof-interval=10', '--cpu-prof-dir=' + aeresDir, '--cpu-prof-name=temp.cpuprofile', target];
if (isTsx) {
    cmd = 'npx';
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --cpu-prof --cpu-prof-interval=10 --cpu-prof-dir="' + aeresDir + '" --cpu-prof-name=temp.cpuprofile';
    args = ['tsx', target];
}
spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
if (fs.existsSync(profPath)) {
    try {
        const profile = JSON.parse(fs.readFileSync(profPath, 'utf8'));
        const nodes = profile.nodes;
        const newData = {};
        for (const node of nodes) {
            const callFrame = node.callFrame;
            if (!callFrame || !callFrame.url) continue;
            let filePath = callFrame.url;
            if (filePath.startsWith('file://')) {
                filePath = filePath.replace('file://', '');
                if (process.platform === 'win32' && filePath.startsWith('/')) filePath = filePath.slice(1);
            }
            // Node.js cpu profiles often use raw absolute paths, not file://
            if (!path.isAbsolute(filePath)) continue;
            filePath = path.resolve(filePath);
            if (filePath.includes('node_modules') || filePath.includes('node:')) continue;
            const line = callFrame.lineNumber + 1;
            const name = callFrame.functionName || '(anonymous)';
            const hitCount = node.hitCount || 0;
            const durationMs = hitCount * 1; 
            if (!newData[filePath]) newData[filePath] = [];
            newData[filePath].push({ line, name, durationMs, calls: 1 });
        }
        const outFile = path.join(aeresDir, 'temporal_lens.json');
        let historyData = {};
        if (fs.existsSync(outFile)) {
            try { historyData = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch(e){}
        }
        for (const [filename, functions] of Object.entries(newData)) {
            if (!historyData[filename]) historyData[filename] = [];
            const existingFuncs = {};
            for (const f of historyData[filename]) existingFuncs[f.line + '_' + f.name] = f;
            for (const new_f of functions) {
                const key = new_f.line + '_' + new_f.name;
                if (existingFuncs[key]) {
                    const hist = existingFuncs[key].history || [];
                    hist.unshift(new_f.durationMs);
                    if (hist.length > 20) hist.length = 20;
                    existingFuncs[key].durationMs = hist.reduce((a,b)=>a+b,0)/hist.length;
                    existingFuncs[key].calls = (existingFuncs[key].calls || 0) + 1;
                    existingFuncs[key].history = hist;
                } else {
                    new_f.history = [new_f.durationMs];
                    existingFuncs[key] = new_f;
                }
            }
            historyData[filename] = Object.values(existingFuncs);
        }
        fs.writeFileSync(outFile, JSON.stringify(historyData));
    } catch(e) {}
}
`.trim()
        await window.electron.fs.writeFile(runnerPath, runnerCode)
        return `node "${runnerPath}" "${filePath}"`
      }
    } catch (e) {}
    if (isTs) return `npx tsx "${filePath}"`
    return `node "${filePath}"`
  }
  // Go
  if (lower.endsWith('.go')) return `go run "${filePath}"`
  // Rust
  if (lower.endsWith('.rs')) return `cargo run`
  // Ruby
  if (lower.endsWith('.rb')) return `ruby "${filePath}"`
  // PHP
  if (lower.endsWith('.php')) return `php "${filePath}"`
  // Java
  if (lower.endsWith('.java')) {
    const className = filePath.split(/[/\\]/).pop().replace('.java', '')
    return `javac "${filePath}" && java ${className}`
  }
  // Kotlin
  if (lower.endsWith('.kt') || lower.endsWith('.kts')) {
    if (lower.endsWith('.kts')) return `kotlinc -script "${filePath}"`
    const className = filePath.split(/[/\\]/).pop().replace('.kt', 'Kt')
    return `kotlinc "${filePath}" -include-runtime -d output.jar && java -jar output.jar`
  }
  // C#
  if (lower.endsWith('.cs')) return `dotnet run`
  // C
  if (lower.endsWith('.c')) {
    const outputName = 'output.exe'
    return `gcc "${filePath}" -o ${outputName} && ./${outputName}`
  }
  // C++
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx')) {
    const outputName = 'output.exe'
    return `g++ "${filePath}" -o ${outputName} && ./${outputName}`
  }
  // Dart
  if (lower.endsWith('.dart')) return `dart run "${filePath}"`
  // Swift
  if (lower.endsWith('.swift')) return `swift "${filePath}"`
  // Lua
  if (lower.endsWith('.lua')) return `lua "${filePath}"`
  // Perl
  if (lower.endsWith('.pl') || lower.endsWith('.pm')) return `perl "${filePath}"`
  // R
  if (lower.endsWith('.r') || lower.endsWith('.rscript')) return `Rscript "${filePath}"`
  // Elixir
  if (lower.endsWith('.exs') || lower.endsWith('.ex')) return `elixir "${filePath}"`
  // Haskell
  if (lower.endsWith('.hs')) return `runghc "${filePath}"`
  // Scala
  if (lower.endsWith('.scala')) return `scala "${filePath}"`
  // Shell
  if (lower.endsWith('.sh')) return `bash "${filePath}"`
  if (lower.endsWith('.zsh')) return `zsh "${filePath}"`
  if (lower.endsWith('.fish')) return `fish "${filePath}"`
  // PowerShell
  if (lower.endsWith('.ps1')) return `pwsh -File "${filePath}"`
  // Batch
  if (lower.endsWith('.bat') || lower.endsWith('.cmd')) return `"${filePath}"`
  // Nim
  if (lower.endsWith('.nim')) return `nim compile --run "${filePath}"`
  // Zig
  if (lower.endsWith('.zig')) return `zig run "${filePath}"`
  // F# script
  if (lower.endsWith('.fsx')) return `dotnet fsi "${filePath}"`
  // F# compiled
  if (lower.endsWith('.fs')) return `dotnet run`
  // Clojure
  if (lower.endsWith('.clj') || lower.endsWith('.cljs')) return `clojure -M "${filePath}"`
  // Erlang
  if (lower.endsWith('.erl')) return `escript "${filePath}"`
  // HTML
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    try {
      const store = useStore.getState()
      const rootPath = store.rootPath
      if (rootPath) {
        const projCmd = await detectProjectCommand(rootPath)
        if (projCmd) return projCmd
      }
    } catch {}
    return 'open-browser'
  }
  // React / Next.js / Framework components — detect project dev server
  if (lower.endsWith('.jsx') || lower.endsWith('.tsx')) {
    try {
      const store = useStore.getState()
      const rootPath = store.rootPath
      if (rootPath) {
        const projCmd = await detectProjectCommand(rootPath)
        if (projCmd) return projCmd
      }
    } catch {}
    return null
  }

  return null
}

/**
 * Detects the test run command for a single file based on language and framework.
 * Returns a command string to run the tests, or null if unknown.
 *
 * @param {string} filePath
 * @param {string|null} rootPath
 * @returns {Promise<string|null>}
 */
export async function detectTestCommand(filePath, rootPath) {
  const lower = filePath.toLowerCase()

  // Python — pytest preferred
  if (lower.endsWith('.py')) {
    try {
      const store = useStore.getState();
      const rPath = store.rootPath;
      if (rPath && window.electron) {
        const sep = rPath.includes('\\') ? '\\' : '/';
        const aeresDir = `${rPath}${sep}.aeres`;
        await window.electron.fs.createFolder(aeresDir);
        const runnerPath = `${aeresDir}${sep}pytest_runner.py`;
        const runnerCode = `
import sys, cProfile, pstats, json, os, pytest
def main():
    if len(sys.argv) < 2: sys.exit(1)
    pytest_args = sys.argv[1:]
    profiler = cProfile.Profile()
    profiler.enable()
    try: pytest.main(pytest_args)
    except SystemExit: pass
    finally: profiler.disable()
    stats = pstats.Stats(profiler)
    new_data = {}
    for func, (cc, nc, tt, ct, callers) in stats.stats.items():
        filename, line, name = func
        if not filename or filename.startswith('<') or 'site-packages' in filename: continue
        abs_filename = os.path.abspath(filename)
        duration_ms = (ct / nc) * 1000 if nc > 0 else 0
        if abs_filename not in new_data: new_data[abs_filename] = []
        new_data[abs_filename].append({'line': line, 'name': name, 'durationMs': duration_ms, 'calls': nc})
    
    aeres_dir = os.path.join(os.getcwd(), '.aeres')
    os.makedirs(aeres_dir, exist_ok=True)
    out_file = os.path.join(aeres_dir, 'temporal_lens.json')
    history_data = {}
    if os.path.exists(out_file):
        try:
            with open(out_file, 'r') as f: history_data = json.load(f)
        except: pass
    for filename, functions in new_data.items():
        if filename not in history_data: history_data[filename] = []
        existing_funcs = {f"{f['line']}_{f['name']}": f for f in history_data[filename]}
        for new_f in functions:
            key = f"{new_f['line']}_{new_f['name']}"
            if key in existing_funcs:
                hist = existing_funcs[key].get('history', [])
                hist.insert(0, new_f['durationMs'])
                hist = hist[:20]
                existing_funcs[key]['durationMs'] = sum(hist) / len(hist)
                existing_funcs[key]['calls'] = new_f['calls']
                existing_funcs[key]['history'] = hist
            else:
                new_f['history'] = [new_f['durationMs']]
                existing_funcs[key] = new_f
        history_data[filename] = list(existing_funcs.values())
    with open(out_file, 'w') as f: json.dump(history_data, f)
if __name__ == '__main__': main()
`.trim();
        await window.electron.fs.writeFile(runnerPath, runnerCode);
        
        let testPath = filePath;
        const isTest = lower.includes('test_') || lower.includes('_test');
        if (!isTest) {
          const sepPath = filePath.includes('\\') ? '\\' : '/';
          const parts = filePath.split(sepPath);
          const filename = parts.pop();
          testPath = [...parts, `test_${filename}`].join(sepPath);
        }
        return `python -m pip install -q pytest; python "${runnerPath}" "${testPath}" -v`;
      }
    } catch(e) {}

    const isTest = lower.includes('test_') || lower.includes('_test');
    if (!isTest) {
      const sep = filePath.includes('\\') ? '\\' : '/';
      const parts = filePath.split(sep);
      const filename = parts.pop();
      const testFilename = `test_${filename}`;
      const testPath = [...parts, testFilename].join(sep);
      return `python -m pip install -q pytest; python -m pytest "${testPath}" -v`;
    }
    return `python -m pip install -q pytest; python -m pytest "${filePath}" -v`;
  }

  // --- AI-POWERED DETECTION ENGINE ---
  if (window.electron?.rag?.query) {
    try {
      let configContent = '';
      if (window.electron?.fs?.readFile && rootPath) {
        const sep = filePath.includes('\\') ? '\\' : '/';
        let currentDir = filePath.substring(0, filePath.lastIndexOf(sep));
        while (currentDir && currentDir.length > 0) {
          try { configContent = await window.electron.fs.readFile(`${currentDir}${sep}package.json`); break; } catch {}
          try { configContent = await window.electron.fs.readFile(`${currentDir}${sep}Cargo.toml`); break; } catch {}
          try { configContent = await window.electron.fs.readFile(`${currentDir}${sep}go.mod`); break; } catch {}
          try { configContent = await window.electron.fs.readFile(`${currentDir}${sep}pytest.ini`); break; } catch {}
          try { configContent = await window.electron.fs.readFile(`${currentDir}${sep}pom.xml`); break; } catch {}
          
          const lastSlash = currentDir.lastIndexOf(sep);
          if (lastSlash <= 0) break;
          const nextDir = currentDir.substring(0, lastSlash);
          if (nextDir === currentDir) break;
          currentDir = nextDir;
          if (rootPath && !currentDir.startsWith(rootPath) && currentDir !== rootPath) break;
        }
      }

      const isTestFile = filePath.toLowerCase().includes('test') || filePath.toLowerCase().includes('spec');
      let fileContext = `I need to run tests for this specific file: ${filePath}.`;
      if (!isTestFile) {
        fileContext = `I need to run the test suite that covers this source file: ${filePath}. If your test framework supports running related tests (like vitest related), use that. For Python/pytest, guess the specific test file (e.g., if source is 'main.py', the test file is likely 'test_main.py', so you should output 'pytest test_main.py'). DO NOT just pass the source file directly to pytest, as it will fail if it contains no tests.`;
      }

      const prompt = `You are an automated test runner engine. ${fileContext}
Here is the project configuration file content (if found):
${configContent.slice(0, 1500)}

Respond with ONLY the exact, raw terminal command needed to run the tests for this file. 
DO NOT wrap the response in markdown code blocks. DO NOT provide any explanation or conversational text. JUST the raw command string. IMPORTANT: Pay attention to the file extension of ${filePath}. If it's a Python file (.py), DO NOT use Node.js tools like vitest/jest; use pytest. To ensure a seamless experience, automatically install pytest in the command like this: 'python -m pip install -q pytest; python -m pytest ...'. If the project uses Node.js tools, ALWAYS prepend the command with 'npx ' so it resolves the local binary.`;
      
      const res = await window.electron.rag.query(prompt, "");
      if (res && res.answer) {
        let cmd = res.answer.trim();
        // Fallback cleanup if the AI ignores instructions
        if (cmd.startsWith('```')) {
           const lines = cmd.split('\n');
           cmd = lines.slice(1, lines.length - (lines[lines.length-1].startsWith('```') ? 1 : 0)).join('\n').trim();
           if (cmd.endsWith('```')) cmd = cmd.replace(/```$/, '').trim();
        }
        cmd = cmd.replace(/^`|`$/g, '').trim();
        
        if (cmd && !cmd.includes('\n')) {
          console.log("[AI Test Runner] Detected command:", cmd);
          return cmd;
        }
      }
    } catch (e) {
      console.error("[AI Test Runner] Failed, falling back to static detection:", e);
    }
  }
  // --- END AI DETECTION ---

  // JavaScript / TypeScript
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.ts') || lower.endsWith('.tsx')) {
    const isTest = lower.endsWith('.test.js') || lower.endsWith('.spec.js') ||
                   lower.endsWith('.test.ts') || lower.endsWith('.spec.ts') ||
                   lower.endsWith('.test.jsx') || lower.endsWith('.spec.jsx') ||
                   lower.endsWith('.test.tsx') || lower.endsWith('.spec.tsx')

    const framework = await _detectJsTestFramework(rootPath, filePath)
    
    if (isTest) {
      if (framework === 'vitest') return `npx vitest run "${filePath}"`
      if (framework === 'mocha') return `npx mocha "${filePath}"`
      return `npx jest "${filePath}" --no-coverage --passWithNoTests`
    } else {
      // For source files, run related tests (tests that import this file)
      if (framework === 'vitest') return `npx vitest related "${filePath}" --run`
      if (framework === 'mocha') return `npx mocha "${filePath}"`
      return `npx jest --findRelatedTests "${filePath}" --no-coverage --passWithNoTests`
    }
  }

  // Go
  if (lower.endsWith('_test.go')) return `go test -v -run . ./...`
  if (lower.endsWith('.go')) return `go test -v -run . ./...`

  // Rust
  if (lower.endsWith('.rs')) return `cargo test`

  // Ruby (rspec or minitest)
  if (lower.endsWith('_spec.rb')) return `rspec "${filePath}"`
  if (lower.endsWith('_test.rb')) return `ruby -Itest "${filePath}"`
  if (lower.endsWith('.rb')) return `rspec "${filePath}"`

  // Java
  if (lower.endsWith('test.java') || lower.endsWith('tests.java')) return `mvn test`
  if (lower.endsWith('.java')) return `mvn test`

  // Kotlin
  if (lower.endsWith('test.kt')) return `gradle test`
  if (lower.endsWith('.kt')) return `gradle test`

  // C#
  if (lower.endsWith('tests.cs') || lower.endsWith('test.cs')) return `dotnet test`
  if (lower.endsWith('.cs')) return `dotnet test`

  // C++
  if (lower.endsWith('.cpp') || lower.endsWith('.cc')) return `ctest --output-on-failure`

  // PHP
  if (lower.endsWith('test.php') || lower.endsWith('tests.php')) return `phpunit "${filePath}"`
  if (lower.endsWith('.php')) return `phpunit "${filePath}"`

  // Dart / Flutter
  if (lower.endsWith('_test.dart')) return `dart test "${filePath}"`
  if (lower.endsWith('.dart')) return `dart test "${filePath}"`

  // Swift
  if (lower.endsWith('tests.swift')) return `swift test`
  if (lower.endsWith('.swift')) return `swift test`

  // Lua (busted)
  if (lower.endsWith('.lua')) return `busted "${filePath}"`

  // Elixir
  if (lower.endsWith('_test.exs')) return `mix test "${filePath}"`
  if (lower.endsWith('.exs') || lower.endsWith('.ex')) return `mix test`

  // Haskell
  if (lower.endsWith('spec.hs') || lower.endsWith('_spec.hs')) return `runghc "${filePath}"`
  if (lower.endsWith('.hs')) return `stack test`

  // Scala
  if (lower.endsWith('spec.scala') || lower.endsWith('test.scala')) return `sbt test`
  if (lower.endsWith('.scala')) return `sbt test`

  // R
  if (lower.endsWith('.r') || lower.endsWith('.R')) return `Rscript -e "testthat::test_file('${filePath}')"`

  // Perl
  if (lower.endsWith('.pl') || lower.endsWith('.pm')) return `perl -Ilib "${filePath}"`

  // Shell (bats)
  if (lower.endsWith('.bats')) return `bats "${filePath}"`
  if (lower.endsWith('.sh')) return `bash "${filePath}"`

  // PowerShell (Pester)
  if (lower.endsWith('.tests.ps1') || lower.endsWith('.test.ps1')) return `pwsh -Command "Invoke-Pester '${filePath}' -Output Detailed"`
  if (lower.endsWith('.ps1')) return `pwsh -Command "Invoke-Pester '${filePath}' -Output Detailed"`

  // Nim
  if (lower.endsWith('.nim')) return `nim c -r "${filePath}"`

  // Zig
  if (lower.endsWith('.zig')) return `zig test "${filePath}"`

  // F#
  if (lower.endsWith('.fs') || lower.endsWith('.fsx')) return `dotnet test`

  // Clojure
  if (lower.endsWith('.clj') || lower.endsWith('.cljs')) return `clojure -M:test`

  // Erlang
  if (lower.endsWith('_test.erl') || lower.endsWith('.erl')) return `rebar3 eunit`

  return null
}

/**
 * Detects the project-level run command by inspecting package.json or other config files.
 * Returns the dev/start command string, or null if not detected.
 *
 * @param {string|null} rootPath
 * @returns {Promise<string|null>}
 */
export async function detectProjectCommand(rootPath) {
  if (!rootPath || !window.electron?.fs) return null

  const sep = rootPath.includes('\\') ? '\\' : '/'

  // Helper to check file existence
  const exists = async (p) => {
    try { return await window.electron.fs.exists(p) } catch { return false }
  }

  // 1. Node.js / JavaScript ecosystem
  try {
    const pkgPath = `${rootPath}${sep}package.json`
    if (await exists(pkgPath)) {
      const raw = await window.electron.fs.readFile(pkgPath)
      const pkg = JSON.parse(raw)
      const scripts = pkg.scripts || {}
      if (scripts.dev) return 'npm run dev'
      if (scripts.start) return 'npm start'
      if (scripts.serve) return 'npm run serve'
      if (scripts.build) return 'npm run build'
    }
  } catch { /* package.json missing or malformed */ }

  // 2. Python ecosystem
  try {
    for (const entry of ['main.py', 'app.py', 'manage.py']) {
      const pyPath = `${rootPath}${sep}${entry}`
      if (await exists(pyPath)) {
        if (entry === 'manage.py') return `python "${pyPath}" runserver`
        return `python "${pyPath}"`
      }
    }
  } catch { /* ignore */ }

  // 3. Rust (Cargo)
  if (await exists(`${rootPath}${sep}Cargo.toml`)) return 'cargo run'

  // 4. Go
  if (await exists(`${rootPath}${sep}go.mod`)) return 'go run .'

  // 5. Java Maven / Gradle
  if (await exists(`${rootPath}${sep}pom.xml`)) return 'mvn spring-boot:run'
  if (await exists(`${rootPath}${sep}build.gradle`)) return 'gradle bootRun'
  if (await exists(`${rootPath}${sep}build.gradle.kts`)) return 'gradle bootRun'

  // 6. .NET / C# / F# — look for known project file extensions
  try {
    const dotnetExtensions = ['.csproj', '.fsproj', '.sln']
    // Try to read tree and look for .NET project files (getTree is the real preload API)
    if (window.electron?.fs?.getTree) {
      const tree = await window.electron.fs.getTree(rootPath)
      if (tree && tree.children) {
        const hasDotnet = tree.children.some(n => dotnetExtensions.some(ext => n.name?.endsWith(ext)))
        if (hasDotnet) return 'dotnet run'
      }
    }
  } catch { /* ignore */ }

  // 7. Flutter / Dart
  if (await exists(`${rootPath}${sep}pubspec.yaml`)) return 'flutter run'

  // 8. Elixir / Phoenix
  if (await exists(`${rootPath}${sep}mix.exs`)) {
    try {
      const mixRaw = await window.electron.fs.readFile(`${rootPath}${sep}mix.exs`)
      if (mixRaw.includes('phoenix')) return 'mix phx.server'
    } catch { /* ignore */ }
    return 'mix run'
  }

  // 9. Haskell — Stack or Cabal
  if (await exists(`${rootPath}${sep}stack.yaml`)) return 'stack run'
  try {
    if (window.electron?.fs?.getTree) {
      const tree = await window.electron.fs.getTree(rootPath)
      if (tree && tree.children) {
        const hasCabal = tree.children.some(n => n.name?.endsWith('.cabal'))
        if (hasCabal) return 'cabal run'
      }
    }
  } catch { /* ignore */ }

  // 10. Scala / SBT
  if (await exists(`${rootPath}${sep}build.sbt`)) return 'sbt run'

  // 11. Clojure — Leiningen or deps.edn
  if (await exists(`${rootPath}${sep}project.clj`)) return 'lein run'
  if (await exists(`${rootPath}${sep}deps.edn`)) return 'clojure -M:run'

  // 12. Erlang / Rebar3
  if (await exists(`${rootPath}${sep}rebar.config`)) return 'rebar3 shell'

  // 13. Nim / Nimble — look for .nimble file
  try {
    if (window.electron?.fs?.getTree) {
      const tree = await window.electron.fs.getTree(rootPath)
      if (tree && tree.children) {
        const hasNimble = tree.children.some(n => n.name?.endsWith('.nimble'))
        if (hasNimble) return 'nimble run'
      }
    }
  } catch { /* ignore */ }
  if (await exists(`${rootPath}${sep}nim.cfg`)) return 'nim compile --run src/main.nim'

  // 14. Zig
  if (await exists(`${rootPath}${sep}build.zig`)) return 'zig build run'

  // 15. Ruby — Rack / Rails / Sinatra
  if (await exists(`${rootPath}${sep}Gemfile`)) {
    try {
      const gemRaw = await window.electron.fs.readFile(`${rootPath}${sep}Gemfile`)
      if (gemRaw.includes('rails')) return 'bundle exec rails server'
      if (gemRaw.includes('sinatra')) return 'bundle exec ruby app.rb'
    } catch { /* ignore */ }
    return 'bundle exec ruby main.rb'
  }

  // 16. PHP — Composer / Laravel / Symfony
  if (await exists(`${rootPath}${sep}composer.json`)) {
    try {
      const compRaw = await window.electron.fs.readFile(`${rootPath}${sep}composer.json`)
      const comp = JSON.parse(compRaw)
      if (comp.require?.['laravel/framework']) return 'php artisan serve'
    } catch { /* ignore */ }
    return 'php -S localhost:8000'
  }

  // 17. R — devtools project
  if (await exists(`${rootPath}${sep}DESCRIPTION`)) return `Rscript -e "devtools::load_all(); message('Package loaded')"`

  return null
}

/**
 * Detects the project-level test command.
 *
 * @param {string|null} rootPath
 * @returns {Promise<string|null>}
 */
export async function detectProjectTestCommand(rootPath) {
  if (!rootPath || !window.electron?.fs) return null

  const sep = rootPath.includes('\\') ? '\\' : '/'
  const exists = async (p) => {
    try { return await window.electron.fs.exists(p) } catch { return false }
  }

  // JS/TS — detect from package.json
  try {
    const pkgPath = `${rootPath}${sep}package.json`
    if (await exists(pkgPath)) {
      const raw = await window.electron.fs.readFile(pkgPath)
      const pkg = JSON.parse(raw)
      const scripts = pkg.scripts || {}
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
      if (scripts.test) return 'npm test'
      if (deps.vitest) return 'npx vitest run'
      if (deps.jest) return 'npx jest'
      if (deps.mocha) return 'npx mocha'
    }
  } catch { /* ignore */ }

  if (await exists(`${rootPath}${sep}pytest.ini`) || await exists(`${rootPath}${sep}pyproject.toml`)) return 'python -m pip install -q pytest; python -m pytest -v'
  if (await exists(`${rootPath}${sep}Cargo.toml`)) return 'cargo test'
  if (await exists(`${rootPath}${sep}go.mod`)) return 'go test ./...'
  if (await exists(`${rootPath}${sep}pom.xml`)) return 'mvn test'
  if (await exists(`${rootPath}${sep}build.gradle`)) return 'gradle test'
  if (await exists(`${rootPath}${sep}mix.exs`)) return 'mix test'
  if (await exists(`${rootPath}${sep}stack.yaml`)) return 'stack test'
  if (await exists(`${rootPath}${sep}build.sbt`)) return 'sbt test'
  if (await exists(`${rootPath}${sep}project.clj`)) return 'lein test'
  if (await exists(`${rootPath}${sep}deps.edn`)) return 'clojure -M:test'
  if (await exists(`${rootPath}${sep}rebar.config`)) return 'rebar3 eunit'
  if (await exists(`${rootPath}${sep}build.zig`)) return 'zig build test'
  if (await exists(`${rootPath}${sep}pubspec.yaml`)) return 'flutter test'

  try {
    const dotnetExtensions = ['.csproj', '.fsproj']
    if (window.electron?.fs?.getTree) {
      const tree = await window.electron.fs.getTree(rootPath)
      if (tree && tree.children) {
        const hasDotnet = tree.children.some(n => dotnetExtensions.some(ext => n.name?.endsWith(ext)))
        if (hasDotnet) return 'dotnet test'
        const hasNimble = tree.children.some(n => n.name?.endsWith('.nimble'))
        if (hasNimble) return 'nimble test'
        const hasCabal = tree.children.some(n => n.name?.endsWith('.cabal'))
        if (hasCabal) return 'cabal test'
        const hasGemfile = tree.children.some(n => n.name === 'Gemfile')
        if (hasGemfile) return 'bundle exec rspec'
        const hasComposer = tree.children.some(n => n.name === 'composer.json')
        if (hasComposer) return 'phpunit'
      }
    }
  } catch { /* ignore */ }

  return null
}

/**
 * Detect JS/TS test framework from package.json devDependencies by traversing up from filePath.
 * @param {string|null} rootPath
 * @param {string} filePath
 * @returns {Promise<'jest'|'vitest'|'mocha'|'jasmine'>}
 */
async function _detectJsTestFramework(rootPath, filePath) {
  if (!window.electron?.fs || !filePath) return 'jest'
  
  const sep = filePath.includes('\\') ? '\\' : '/'
  let currentDir = filePath.substring(0, filePath.lastIndexOf(sep))
  
  while (currentDir && currentDir.length > 0) {
    try {
      const raw = await window.electron.fs.readFile(`${currentDir}${sep}package.json`)
      const pkg = JSON.parse(raw)
      const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
      if (all.vitest) return 'vitest'
      if (all.mocha) return 'mocha'
      if (all.jasmine) return 'jasmine'
      if (all.jest) return 'jest'
      
      // If we found a package.json but no test framework, break to avoid crawling up forever
      if (pkg.name) break
    } catch { /* ignore and continue up */ }
    
    const lastSlash = currentDir.lastIndexOf(sep)
    if (lastSlash <= 0) break
    const nextDir = currentDir.substring(0, lastSlash)
    if (nextDir === currentDir) break
    currentDir = nextDir
    
    // Stop if we went past the rootPath
    if (rootPath && !currentDir.startsWith(rootPath) && currentDir !== rootPath) break
  }
  
  return 'jest'
}

/**
 * Returns the correct test file name for a given source file and language.
 * @param {string} fileName  e.g. "utils.py"
 * @param {string} language  e.g. "python"
 * @param {string} [content] file content for React detection
 * @returns {string}
 */
export function getTestFileName(fileName, language, content = '') {
  const base = fileName.replace(/\.[^/.]+$/, '')
  const isReact = content.includes('React') || content.includes('export default') ||
                  fileName.endsWith('x') || fileName.includes('page') || fileName.includes('layout')

  const lower = fileName.toLowerCase()
  const alreadyTest = lower.includes('test') || lower.includes('spec')

  switch (language) {
    case 'python':      return alreadyTest ? fileName : `test_${base}.py`
    case 'go':          return alreadyTest ? fileName : `${base}_test.go`
    case 'rust':        return alreadyTest ? fileName : `${base}_test.rs`
    case 'java':        return alreadyTest ? fileName : `${base}Test.java`
    case 'kotlin':      return alreadyTest ? fileName : `${base}Test.kt`
    case 'csharp':      return alreadyTest ? fileName : `${base}Tests.cs`
    case 'cpp':
    case 'c':           return alreadyTest ? fileName : `test_${base}.cpp`
    case 'ruby':        return alreadyTest ? fileName : `${base}_spec.rb`
    case 'php':         return alreadyTest ? fileName : `${base}Test.php`
    case 'dart':        return alreadyTest ? fileName : `${base}_test.dart`
    case 'swift':       return alreadyTest ? fileName : `${base}Tests.swift`
    case 'lua':         return alreadyTest ? fileName : `${base}_spec.lua`
    case 'elixir':      return alreadyTest ? fileName : `${base}_test.exs`
    case 'haskell':     return alreadyTest ? fileName : `${base}Spec.hs`
    case 'scala':       return alreadyTest ? fileName : `${base}Spec.scala`
    case 'r':           return alreadyTest ? fileName : `test_${base}.R`
    case 'perl':        return alreadyTest ? fileName : `${base}.t`
    case 'shell':       return alreadyTest ? fileName : `${base}.bats`
    case 'powershell':  return alreadyTest ? fileName : `${base}.Tests.ps1`
    case 'nim':         return alreadyTest ? fileName : `test_${base}.nim`
    case 'zig':         return alreadyTest ? fileName : `${base}_test.zig`
    case 'fsharp':      return alreadyTest ? fileName : `${base}Tests.fs`
    case 'clojure':     return alreadyTest ? fileName : `${base.replace(/_/g, '-')}-test.clj`
    case 'erlang':      return alreadyTest ? fileName : `${base}_test.erl`
    case 'typescript':
      if (alreadyTest) return fileName
      return isReact ? `${base}.test.tsx` : `${base}.test.ts`
    case 'javascript':
    default:
      if (alreadyTest) return fileName
      return isReact ? `${base}.test.jsx` : `${base}.test.js`
  }
}

/**
 * Returns a human-readable test framework name for a given language.
 * @param {string} language
 * @returns {string}
 */
export function getTestFrameworkName(language) {
  const frameworks = {
    python: 'pytest',
    javascript: 'Jest',
    typescript: 'Jest',
    go: 'go test',
    rust: 'cargo test',
    java: 'JUnit 5',
    kotlin: 'JUnit 5',
    csharp: 'xUnit',
    cpp: 'Google Test',
    c: 'Unity',
    ruby: 'RSpec',
    php: 'PHPUnit',
    dart: 'dart:test',
    swift: 'XCTest',
    lua: 'busted',
    elixir: 'ExUnit',
    haskell: 'HSpec',
    scala: 'ScalaTest',
    r: 'testthat',
    perl: 'Test::More',
    shell: 'bats-core',
    powershell: 'Pester',
    nim: 'unittest',
    zig: 'std.testing',
    fsharp: 'xUnit',
    clojure: 'clojure.test',
    erlang: 'EUnit',
  }
  return frameworks[language] || 'Test Runner'
}

/**
 * Detects the correct terminal debugger command for a given file.
 * Returns the debug command string, or null if unsupported.
 * @param {string} filePath
 * @param {string|null} rootPath
 * @returns {Promise<string|null>}
 */
export async function detectDebugCommand(filePath, rootPath) {
  const lower = filePath.toLowerCase()
  
  if (lower.endsWith('.py')) return `python -m pdb "${filePath}"`
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return `node inspect "${filePath}"`
  if (lower.endsWith('.ts') && !lower.endsWith('.tsx')) return `node --inspect -r tsx "${filePath}"`
  // JSX/TSX — launch dev server in debug/inspect mode
  if (lower.endsWith('.jsx') || lower.endsWith('.tsx')) {
    if (rootPath) {
      const projCmd = await detectProjectCommand(rootPath)
      if (projCmd) {
        // Next.js inspect mode
        if (projCmd.includes('next') || projCmd === 'npm run dev') {
          return `NODE_OPTIONS='--inspect' ${projCmd}`
        }
        return projCmd
      }
    }
    return null
  }
  if (lower.endsWith('.go')) return `dlv debug`
  if (lower.endsWith('.rs')) return `cargo run`
  if (lower.endsWith('.rb')) return `rdbg "${filePath}"`
  if (lower.endsWith('.php')) return `phpdbg -qrr "${filePath}"`
  if (lower.endsWith('.c') || lower.endsWith('.cpp')) return `gdb --args output.exe`
  if (lower.endsWith('.cs')) return `dotnet run --configuration Debug`
  if (lower.endsWith('.java')) return `java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005`
  if (lower.endsWith('.kt')) return `gradle run --debug-jvm`
  if (lower.endsWith('.dart')) return `dart run --observe "${filePath}"`
  if (lower.endsWith('.swift')) return `swift run`
  
  return null
}
