use std::sync::{Arc, Mutex};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri::{AppHandle, Manager, State, Emitter, WebviewWindowBuilder, WebviewUrl};
use serde_json::Value;
use std::collections::HashMap;
use std::process::{Command, Stdio, Child};
use std::io::{BufRead, BufReader, Write, Read};
use std::thread;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use notify::{Watcher, RecursiveMode, RecommendedWatcher};
use std::path::Path;

lazy_static::lazy_static! {
    static ref DEBUG_PROCESSES: Arc<Mutex<HashMap<String, Child>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref WATCHER_STATE: Arc<Mutex<Option<RecommendedWatcher>>> = Arc::new(Mutex::new(None));
}

#[tauri::command]
async fn watch_project(app: AppHandle, path: String) -> Result<(), String> {
    let mut watcher_state = WATCHER_STATE.lock().unwrap();
    
    // Stop existing watcher if any
    *watcher_state = None;

    let app_clone = app.clone();
    
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        match res {
            Ok(event) => {
                // Ignore Access events, they happen on every read
                if !matches!(event.kind, notify::EventKind::Access(_)) {
                    let _ = app_clone.emit("tauri://file-changed", ());
                }
            },
            Err(e) => println!("watch error: {:?}", e),
        }
    }).map_err(|e| e.to_string())?;
    
    watcher.watch(Path::new(&path), RecursiveMode::Recursive).map_err(|e| e.to_string())?;
    
    *watcher_state = Some(watcher);
    Ok(())
}

#[tauri::command]
async fn debug_launch(app: AppHandle, file_path: String, cwd: Option<String>) -> Result<Value, String> {
    let mut cmd = Command::new("node");
    cmd.arg(file_path.clone());
    
    // Check extension
    if file_path.ends_with(".py") {
        cmd = Command::new("python");
        cmd.arg("-u"); // Unbuffered output
        cmd.arg(file_path.clone());
    }

    if let Some(c) = cwd {
        cmd.current_dir(c);
    } else {
        let path = Path::new(&file_path);
        if let Some(parent) = path.parent() {
            cmd.current_dir(parent);
        }
    }
    
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.stdin(Stdio::piped());
    
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return Err(e.to_string()),
    };
    
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let session_id = uuid::Uuid::new_v4().to_string();
    
    DEBUG_PROCESSES.lock().unwrap().insert(session_id.clone(), child);
    
    let app_clone1 = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_clone1.emit("debug:output", format!("{}\n", l));
            }
        }
        let _ = app_clone1.emit("debug:terminated", ());
    });
    
    let app_clone2 = app.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_clone2.emit("debug:output", format!("{}\n", l));
            }
        }
    });
    
    Ok(serde_json::json!({ "session": session_id }))
}

#[tauri::command]
async fn debug_stop(session_id: String) -> Result<(), String> {
    if let Some(mut child) = DEBUG_PROCESSES.lock().unwrap().remove(&session_id) {
        let _ = child.kill();
    }
    Ok(())
}

#[tauri::command]
async fn debug_evaluate(session_id: String, code: String) -> Result<Value, String> {
    if let Some(child) = DEBUG_PROCESSES.lock().unwrap().get_mut(&session_id) {
        if let Some(stdin) = child.stdin.as_mut() {
            let _ = stdin.write_all(format!("{}\n", code).as_bytes());
            let _ = stdin.flush();
        }
    }
    Ok(serde_json::json!({ "result": "sent to stdin" }))
}

#[derive(serde::Serialize)]
struct Diagnostic {
    source: String,
    message: String,
    line: i32,
    severity: String,
    #[serde(rename = "startColumn")]
    start_column: Option<i32>,
    #[serde(rename = "endLine")]
    end_line: Option<i32>,
    #[serde(rename = "endColumn")]
    end_column: Option<i32>,
}

#[tauri::command]
async fn check_diagnostics(file_path: String) -> Result<Value, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Ok(serde_json::json!({ "diagnostics": [] }));
    }
    
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let mut diagnostics: Vec<Diagnostic> = Vec::new();
    
    match ext.as_str() {
        "js" | "jsx" | "ts" | "tsx" => {
            #[cfg(target_os = "windows")]
            let npx_cmd = "npx.cmd";
            #[cfg(not(target_os = "windows"))]
            let npx_cmd = "npx";

            let output = std::process::Command::new(npx_cmd)
                .args(["eslint", "--format", "json", &file_path])
                .output();
                
            if let Ok(output) = output {
                if let Ok(json_str) = String::from_utf8(output.stdout) {
                    if let Ok(parsed) = serde_json::from_str::<Value>(&json_str) {
                        if let Some(arr) = parsed.as_array() {
                            if let Some(first) = arr.first() {
                                if let Some(messages) = first.get("messages").and_then(|m| m.as_array()) {
                                    for msg in messages {
                                        let severity = match msg.get("severity").and_then(|s| s.as_i64()) {
                                            Some(2) => "Error".to_string(),
                                            Some(1) => "Warning".to_string(),
                                            _ => "Info".to_string()
                                        };
                                        diagnostics.push(Diagnostic {
                                            source: "eslint".to_string(),
                                            message: msg.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error").to_string(),
                                            line: msg.get("line").and_then(|l| l.as_i64()).unwrap_or(1) as i32,
                                            severity,
                                            start_column: msg.get("column").and_then(|c| c.as_i64()).map(|c| c as i32),
                                            end_line: msg.get("endLine").and_then(|l| l.as_i64()).map(|l| l as i32),
                                            end_column: msg.get("endColumn").and_then(|c| c.as_i64()).map(|c| c as i32),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            if diagnostics.is_empty() {
                let node_cmd = "node";
                if let Ok(output) = std::process::Command::new(node_cmd).args(["-c", &file_path]).output() {
                    if !output.status.success() {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        if let Some(first_line) = stderr.lines().next() {
                            diagnostics.push(Diagnostic {
                                source: "node-syntax".to_string(),
                                message: first_line.to_string(),
                                line: 1,
                                severity: "Error".to_string(),
                                start_column: None, end_line: None, end_column: None,
                            });
                        }
                    }
                }
            }
        },
        "py" => {
            let python_cmd = "python";
            let output = std::process::Command::new(python_cmd)
                .args(["-m", "ruff", "check", "--output-format", "json", &file_path])
                .output();
                
            if let Ok(output) = output {
                if let Ok(json_str) = String::from_utf8(output.stdout) {
                    if let Ok(parsed) = serde_json::from_str::<Value>(&json_str) {
                        if let Some(messages) = parsed.as_array() {
                            for msg in messages {
                                let message = msg.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error").to_string();
                                let code = msg.get("code").and_then(|c| c.as_str()).unwrap_or("");
                                let severity = if message.contains("error") { "Error".to_string() } else { "Warning".to_string() };
                                
                                diagnostics.push(Diagnostic {
                                    source: format!("ruff({})", code),
                                    message,
                                    line: msg.get("location").and_then(|l| l.get("row")).and_then(|r| r.as_i64()).unwrap_or(1) as i32,
                                    severity,
                                    start_column: msg.get("location").and_then(|l| l.get("column")).and_then(|c| c.as_i64()).map(|c| c as i32),
                                    end_line: msg.get("end_location").and_then(|l| l.get("row")).and_then(|r| r.as_i64()).map(|r| r as i32),
                                    end_column: msg.get("end_location").and_then(|l| l.get("column")).and_then(|c| c.as_i64()).map(|c| c as i32),
                                });
                            }
                        }
                    }
                }
            }
            
            if diagnostics.is_empty() {
                if let Ok(output) = std::process::Command::new(python_cmd).args(["-m", "py_compile", &file_path]).output() {
                    if !output.status.success() {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        if let Some(first_line) = stderr.lines().next() {
                            diagnostics.push(Diagnostic {
                                source: "python-syntax".to_string(),
                                message: first_line.to_string(),
                                line: 1,
                                severity: "Error".to_string(),
                                start_column: None, end_line: None, end_column: None,
                            });
                        }
                    }
                }
            }
        },
        "rs" => {
            let dir = path.parent().unwrap_or(Path::new("."));
            let output = std::process::Command::new("cargo")
                .current_dir(dir)
                .args(["check", "--message-format=json"])
                .output();
                
            if let Ok(output) = output {
                if let Ok(json_str) = String::from_utf8(output.stdout) {
                    for line in json_str.lines() {
                        if let Ok(parsed) = serde_json::from_str::<Value>(line) {
                            if parsed.get("reason").and_then(|r| r.as_str()) == Some("compiler-message") {
                                if let Some(msg) = parsed.get("message") {
                                    let level = msg.get("level").and_then(|l| l.as_str()).unwrap_or("");
                                    let severity = match level {
                                        "error" | "error: internal compiler error" => "Error".to_string(),
                                        "warning" => "Warning".to_string(),
                                        _ => "Info".to_string()
                                    };
                                    
                                    let mut target_span = None;
                                    if let Some(spans) = msg.get("spans").and_then(|s| s.as_array()) {
                                        for span in spans {
                                            if span.get("is_primary").and_then(|p| p.as_bool()) == Some(true) {
                                                target_span = Some(span);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if let Some(span) = target_span {
                                        let file_name = span.get("file_name").and_then(|f| f.as_str()).unwrap_or("");
                                        if file_path.replace("\\", "/").ends_with(&file_name.replace("\\", "/")) {
                                            diagnostics.push(Diagnostic {
                                                source: "cargo".to_string(),
                                                message: msg.get("message").and_then(|m| m.as_str()).unwrap_or("").to_string(),
                                                line: span.get("line_start").and_then(|l| l.as_i64()).unwrap_or(1) as i32,
                                                severity,
                                                start_column: span.get("column_start").and_then(|c| c.as_i64()).map(|c| c as i32),
                                                end_line: span.get("line_end").and_then(|l| l.as_i64()).map(|l| l as i32),
                                                end_column: span.get("column_end").and_then(|c| c.as_i64()).map(|c| c as i32),
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "go" => {
            let dir = path.parent().unwrap_or(Path::new("."));
            if let Ok(output) = std::process::Command::new("go")
                .current_dir(dir)
                .args(["build", "-e"])
                .output() {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    if let Ok(re) = regex::Regex::new(r"^(.*?):(\d+):(\d+):\s*(.*)$") {
                        for line in stderr.lines() {
                            if let Some(caps) = re.captures(line) {
                                let file_match = caps.get(1).map_or("", |m| m.as_str());
                                if file_path.replace("\\", "/").ends_with(&file_match.replace("\\", "/")) {
                                    diagnostics.push(Diagnostic {
                                        source: "go".to_string(),
                                        message: caps.get(4).map_or("Unknown", |m| m.as_str()).to_string(),
                                        line: caps.get(2).and_then(|m| m.as_str().parse::<i32>().ok()).unwrap_or(1),
                                        severity: "Error".to_string(),
                                        start_column: caps.get(3).and_then(|m| m.as_str().parse::<i32>().ok()),
                                        end_line: None, end_column: None,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        },
        "c" | "cpp" | "cxx" | "h" | "hpp" => {
            let compiler = if ext == "c" { "gcc" } else { "g++" };
            if let Ok(output) = std::process::Command::new(compiler)
                .args(["-fsyntax-only", &file_path])
                .output() {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    if let Ok(re) = regex::Regex::new(r"^(.*?):(\d+):(\d+):\s*(error|warning):\s*(.*)$") {
                        for line in stderr.lines() {
                            if let Some(caps) = re.captures(line) {
                                diagnostics.push(Diagnostic {
                                    source: compiler.to_string(),
                                    message: caps.get(5).map_or("Unknown", |m| m.as_str()).to_string(),
                                    line: caps.get(2).and_then(|m| m.as_str().parse::<i32>().ok()).unwrap_or(1),
                                    severity: if caps.get(4).map_or("", |m| m.as_str()) == "error" { "Error".to_string() } else { "Warning".to_string() },
                                    start_column: caps.get(3).and_then(|m| m.as_str().parse::<i32>().ok()),
                                    end_line: None, end_column: None,
                                });
                            }
                        }
                    }
                }
            }
        },
        _ => {}
    }
    
    Ok(serde_json::json!({ "diagnostics": diagnostics }))
}

struct BackendState {
    port: Mutex<Option<u16>>,
}

#[tauri::command]
async fn get_backend_port(state: State<'_, BackendState>) -> Result<u16, String> {
    let port = state.port.lock().unwrap();
    port.ok_or_else(|| "Backend not ready yet".to_string())
}

const SKIP_DIRS: &[&str] = &[
    ".git", "node_modules", "__pycache__", ".next", "target", "dist", ".vscode", ".idea",
];

fn build_tree(path: &std::path::Path) -> Value {
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let path_str = path.to_string_lossy().to_string();

    if path.is_dir() {
        let mut children = Vec::new();
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                let entry_name = entry_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if entry_path.is_dir() && SKIP_DIRS.contains(&entry_name.as_str()) {
                    continue;
                }
                children.push(build_tree(&entry_path));
            }
        }
        // Sort: directories first, then files, alphabetically within each group
        children.sort_by(|a, b| {
            let a_type = a.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let b_type = b.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let a_is_dir = a_type == "dir";
            let b_is_dir = b_type == "dir";
            if a_is_dir != b_is_dir {
                return if a_is_dir { std::cmp::Ordering::Less } else { std::cmp::Ordering::Greater };
            }
            let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            a_name.cmp(&b_name)
        });
        serde_json::json!({
            "name": name,
            "path": path_str,
            "type": "dir",
            "children": children
        })
    } else {
        serde_json::json!({
            "name": name,
            "path": path_str,
            "type": "file"
        })
    }
}

#[tauri::command]
async fn get_tree(path: String) -> Result<Value, String> {
    let root = std::path::Path::new(&path);
    if !root.exists() {
        return Err("Path does not exist".to_string());
    }
    let tree = build_tree(root);
    // Return just the children array for the root directory
    if let Some(children) = tree.get("children") {
        Ok(children.clone())
    } else {
        Ok(serde_json::json!([]))
    }
}

fn search_recursive(path: &std::path::Path, re: &regex::Regex, results: &mut Vec<Value>) {
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            let entry_name = entry_path.file_name().unwrap_or_default().to_string_lossy().to_string();
            
            if entry_path.is_dir() {
                if !SKIP_DIRS.contains(&entry_name.as_str()) {
                    search_recursive(&entry_path, re, results);
                }
            } else {
                if let Ok(file) = std::fs::File::open(&entry_path) {
                    let reader = BufReader::new(file);
                    for (i, line) in reader.lines().enumerate() {
                        if let Ok(l) = line {
                            if re.is_match(&l) {
                                results.push(serde_json::json!({
                                    "file": entry_path.to_string_lossy().to_string(),
                                    "line": i + 1,
                                    "text": l.trim()
                                }));
                            }
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
async fn search_in_project(path: String, query: String, match_case: bool, use_regex: bool) -> Result<Value, String> {
    let regex_pattern = if use_regex {
        query.clone()
    } else {
        regex::escape(&query)
    };
    
    let re = regex::RegexBuilder::new(&regex_pattern)
        .case_insensitive(!match_case)
        .build()
        .map_err(|e| e.to_string())?;

    let results = tauri::async_runtime::spawn_blocking(move || {
        let mut res = Vec::new();
        let root = std::path::PathBuf::from(&path);
        if root.exists() && root.is_dir() {
            search_recursive(&root, &re, &mut res);
        }
        res
    }).await.map_err(|e| e.to_string())?;

    Ok(serde_json::json!(results))
}

#[tauri::command]
async fn new_window(app: AppHandle) -> Result<(), String> {
    let _ = WebviewWindowBuilder::new(
        &app,
        format!("main-{}", uuid::Uuid::new_v4()),
        WebviewUrl::App("index.html".into())
    )
    .title("Aeres IDE")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .decorations(false)
    .transparent(true)
    .shadow(true)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

struct PtyInstance {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

lazy_static::lazy_static! {
    static ref TERMINALS: Arc<Mutex<HashMap<String, PtyInstance>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
async fn create_terminal(app: AppHandle, cwd: Option<String>) -> Result<Value, String> {
    let pty_system = NativePtySystem::default();
    let pair = pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| e.to_string())?;
    
    let mut cmd = CommandBuilder::new(if cfg!(windows) { "powershell.exe" } else { "bash" });
    if cfg!(windows) {
        cmd.args(["-NoProfile"]);
    }
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }
    
    let _child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let term_id = uuid::Uuid::new_v4().to_string();
    
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    
    TERMINALS.lock().unwrap().insert(term_id.clone(), PtyInstance {
        master: pair.master,
        writer,
    });
    
    let app_clone = app.clone();
    let term_id_clone = term_id.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 1024];
        while let Ok(n) = reader.read(&mut buf) {
            if n == 0 { break; }
            let data = String::from_utf8_lossy(&buf[..n]).to_string();
            let _ = app_clone.emit(&format!("terminal:data:{}", term_id_clone), data);
        }
    });
    
    Ok(serde_json::json!({ "id": term_id }))
}

#[tauri::command]
async fn write_terminal(id: String, data: String) -> Result<(), String> {
    if let Some(instance) = TERMINALS.lock().unwrap().get_mut(&id) {
        let _ = instance.writer.write_all(data.as_bytes());
    }
    Ok(())
}

#[tauri::command]
async fn resize_terminal(id: String, rows: u16, cols: u16) -> Result<(), String> {
    if let Some(instance) = TERMINALS.lock().unwrap().get_mut(&id) {
        let _ = instance.master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 });
    }
    Ok(())
}

#[tauri::command]
async fn kill_terminal(id: String) -> Result<(), String> {
    TERMINALS.lock().unwrap().remove(&id);
    Ok(())
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file(path: String, data: String) -> Result<(), String> {
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_folder(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_path(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn path_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            // Manually forward deep links on Windows just in case the deep-link plugin drops them
            for arg in args {
                if arg.starts_with("aeres://") {
                    let _ = app.emit("deep-link-received", arg);
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(BackendState {
            port: Mutex::new(None),
        })
        .setup(|app| {
            let handle = app.handle().clone();
            
            tauri::async_runtime::spawn(async move {
                let port = portpicker::pick_unused_port().unwrap_or(8008);
                println!("Assigned sidecar port: {}", port);
                
                let state: State<BackendState> = handle.state();
                *state.port.lock().unwrap() = Some(port);

                let backend_path = "C:\\Project\\Aether_IDE\\AERES-IDE\\apps\\python-backend\\main.py";
                #[cfg(debug_assertions)]
                let (mut rx, mut _child) = handle
                    .shell()
                    .command("python")
                    .arg(backend_path)
                    .env("BACKEND_PORT", port.to_string())
                    .spawn()
                    .expect("Failed to spawn sidecar");

                #[cfg(not(debug_assertions))]
                let (mut rx, mut _child) = handle
                    .shell()
                    .sidecar("backend")
                    .expect("Failed to setup sidecar")
                    .env("BACKEND_PORT", port.to_string())
                    .spawn()
                    .expect("Failed to spawn sidecar");

                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("sidecar output: {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("sidecar error: {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("sidecar terminated: {:?}", payload.code);
                        }
                        CommandEvent::Error(err) => {
                            eprintln!("sidecar event error: {}", err);
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })

        .invoke_handler(tauri::generate_handler![
            get_backend_port, get_tree, create_terminal, write_terminal, resize_terminal,
            kill_terminal, debug_launch, debug_stop, debug_evaluate, search_in_project, watch_project,
            read_file, write_file, create_folder, delete_path, rename_path, path_exists,
            new_window, check_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
