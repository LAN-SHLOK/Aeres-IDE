Write-Host "========================================="
Write-Host " Building Aeres IDE Standalone Executable"
Write-Host "========================================="

$rootDir = Get-Location

Write-Host "`n[1/4] Activating Python Virtual Environment..."
cd apps\python-backend
if (-Not (Test-Path "venv")) {
    Write-Host "Creating new virtual environment..."
    python -m venv venv
}
.\venv\Scripts\Activate.ps1

Write-Host "`n[2/4] Installing dependencies & Building Python Sidecar..."
pip install -r requirements.txt
pip install pyinstaller
python -m PyInstaller --onefile --name backend-x86_64-pc-windows-msvc --hidden-import uvicorn --hidden-import fastapi --hidden-import tree_sitter --hidden-import tree_sitter_python --hidden-import tree_sitter_javascript --hidden-import pydantic --hidden-import pydantic_settings main.py

Write-Host "`n[3/4] Moving sidecar to Tauri binaries folder..."
cd $rootDir
if (-Not (Test-Path "apps\desktop-client\src-tauri\binaries")) {
    New-Item -ItemType Directory -Force -Path "apps\desktop-client\src-tauri\binaries" | Out-Null
}
Move-Item -Force -Path "apps\python-backend\dist\backend-x86_64-pc-windows-msvc.exe" -Destination "apps\desktop-client\src-tauri\binaries\backend-x86_64-pc-windows-msvc.exe"

Write-Host "`n[4/4] Building final Tauri MSI & EXE Installers..."
cd apps\desktop-client
npm run build

Write-Host "`n========================================="
Write-Host " BUILD COMPLETE! 🎉"
Write-Host " Your setup files are located in:"
Write-Host " C:\Project\Aether_IDE\AERES-IDE\apps\desktop-client\src-tauri\target\release\bundle\nsis\"
Write-Host "========================================="
