<div align="center">
  <img src="https://raw.githubusercontent.com/LAN-SHLOK/Aeres-IDE/main/apps/desktop-client/src-tauri/icons/128x128.png" width="128" />
  
  <h1>Aeres IDE</h1>
  <p><b>The Agentic Developer Workspace</b></p>
  <p>A lightning-fast, fully-local Tauri IDE powered by autonomous AI agents, Causal Maps, and Temporal Lens profiling.</p>
  
  <p>
    <img src="https://img.shields.io/badge/Tauri-24C6DC?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  </p>
</div>

---

## What is Aeres IDE?

Aeres is not just a text editor—it is an **agentic developer workspace**. By deeply integrating autonomous LLM agents (powered by Groq) with an ultra-fast local architecture (Rust + Tauri), Aeres allows you to automatically refactor, modernize, trace, and debug massive codebases at the speed of thought.

### Core Features

<img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/stopwatch.svg" width="16" height="16" alt="Icon" /> **Temporal Lens**
A blazing-fast, language-agnostic AST engine that automatically profiles execution latency, parses outbound calls, and maps inbound workspace references for every function you write.

<img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/diagram-project.svg" width="16" height="16" alt="Icon" /> **Causal Maps**
Visually trace dependency trees and logic flows across your entire project using beautiful node-based graphs. 

<img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/robot.svg" width="16" height="16" alt="Icon" /> **Autonomous Mutations**
Streaming AI agents that can read your codebase, plan architectural changes, and autonomously write/refactor code directly into your files using high-speed unified diffs.

<img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/code.svg" width="16" height="16" alt="Icon" /> **Native LSP Integration**
Rich autocomplete, hover docs, and instant syntax diagnostics for JavaScript, Python, Rust, Go, C++, and more.

## Architecture Workflow

Aeres IDE utilizes a hybrid architecture designed for raw speed, local filesystem access, and heavy AI inference capabilities.

```mermaid
graph TD
    Dev([Developer]) -->|Edits Code| UI[Tauri Frontend<br/>React + Monaco]
    
    subgraph Aeres Local App
        UI <-->|Tauri IPC / Websockets| Backend[Python FastAPI Backend]
        
        Backend --> AST[Tree-Sitter<br/>AST Parsers]
        Backend --> Agents[Groq AI Agents]
        Backend --> Perf[Temporal Profiler]
        Backend --> Git[Local Git Hooks]
    end
    
    UI -.->|OAuth Request| Portal[Aeres Web Portal]
    Portal -.->|Secure Token via aeres://| UI
```

1. **Frontend (`apps/desktop-client`)**: A fluid, highly responsive React (Vite) interface bundled inside a lightweight Rust/Tauri wrapper. Features integrated Monaco editor panes, xterm.js terminals, and interactive D3 graphs.
2. **AI Engine (`apps/python-backend`)**: A standalone Python FastAPI backend containing the core AI agents, RAG engines, Tree-Sitter AST parsers, and performance profilers.
3. **Web Portal (`apps/web-frontend`)**: The hosted authentication and team-management web portal.

## Getting Started

### Prerequisites
* Node.js (v18+)
* Python 3.10+
* Tauri CLI

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/LAN-SHLOK/Aeres-IDE.git
   cd Aeres-IDE
   ```

2. **Start the AI Backend**
   ```bash
   cd apps/python-backend
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   pip install -r requirements.txt
   
   # Add your API Keys
   echo "GROQ_API_KEY=your_key_here" > .env
   
   # Start the backend server
   uvicorn app.server:app --reload --port 8008
   ```

3. **Start the Tauri Frontend**
   ```bash
   # Open a new terminal
   cd apps/desktop-client
   npm install
   npm run dev
   ```

## Building for Production (Standalone Executable)

You can compile the entire IDE (including the Python AI engine) into a single standalone `.exe` using the automated build script.

```powershell
# In the root of the repository
.\build_aeres.ps1
```
This script will use PyInstaller to compile the backend into a Tauri sidecar and automatically run the Tauri release pipeline to generate your `.msi` and `.exe` installers.

## Contributing
Contributions, issues, and feature requests are welcome!

---
<div align="center">
  Built by LAN-SHLOK
</div>
