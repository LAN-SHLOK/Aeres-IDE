import os
import subprocess
import sys
import shutil

def build():
    print("Starting Aeres Backend Sidecar Build...")
    
    # Path to the main script
    main_script = "main.py"
    if not os.path.exists(main_script):
        print(f"Error: {main_script} not found!")
        return

    # PyInstaller command
    # -onefile: Bundle everything into a single executable
    # --name: Name of the output executable
    # --add-data: Include the 'app' directory
    # --hidden-import: Ensure all sub-modules are collected
    
    cmd = [
        "pyinstaller",
        "--noconfirm",
        "--onefile",
        "--console",
        "--name", "backend",
        "--add-data", f"app{os.pathsep}app",
        "--add-data", f".env{os.pathsep}.",
        "--exclude-module", "PyQt5",
        "--exclude-module", "PyQt6",
        "--exclude-module", "PySide6",
        "--exclude-module", "matplotlib",
        "--hidden-import", "tree_sitter",
        "--hidden-import", "tree_sitter_python",
        "--hidden-import", "tree_sitter_javascript",
        "--hidden-import", "pydantic",
        "--hidden-import", "pydantic_settings",
        "--hidden-import", "fastapi",
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        main_script
    ]

    print(f"Running command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True)
        print("Build successful! Executable is in the 'dist' folder.")
    except subprocess.CalledProcessError as e:
        print(f"Build failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Ensure dependencies are installed
    # subprocess.run(["pip", "install", "pyinstaller"], check=True)
    build()
