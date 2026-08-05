$ErrorActionPreference = "Stop"

Write-Host "Compiling Python Backend with PyInstaller..."

# Define hidden imports required by FastAPI / Uvicorn / Pydantic
$hiddenImports = @(
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "pydantic.deprecated.decorator"
)

$importArgs = $hiddenImports | ForEach-Object { "--hidden-import=$_" }

$pyinstallerArgs = @(
    "main.py",
    "--name", "backend-x86_64-pc-windows-msvc",
    "--onefile",
    "--noconsole",
    "--add-data", "app;app",
    "--add-data", "data;data",
    "--add-data", ".env;.",
    "--clean"
) + $importArgs

Write-Host "Running PyInstaller..."
& .\venv\Scripts\python.exe -m PyInstaller $pyinstallerArgs

Write-Host "Moving binary to tauri sidecar directory..."
$dest = "..\desktop-client\src-tauri\bin"
If (!(Test-Path $dest)) {
    New-Item -ItemType Directory -Force -Path $dest
}

Copy-Item -Path "dist\backend-x86_64-pc-windows-msvc.exe" -Destination "$dest\backend-x86_64-pc-windows-msvc.exe" -Force

Write-Host "Done!"
