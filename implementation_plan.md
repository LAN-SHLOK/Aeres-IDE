# Final Production Readiness & Feature Polish Plan

We have successfully stabilized all the core features (Git Paths, Contract Snapshots, Mutation Testing, AI Bridge, Live Server). At this stage, the remaining "not working" elements primarily relate to **edge cases, production packaging, and deep integration**.

Here is the detailed analysis and plan to fix the final remaining blockers one by one.

## Phase 1: Git Authentication Edge Cases
**Analysis**: Currently, if you run `git push` or `git pull` on a repository that requires a username/password (and you don't have a system credential manager or SSH key set up), it simply fails with an "Authentication failed" error banner. There is no way to input credentials in the IDE.
**Implementation Plan**:
- Update `GitPanel.jsx` to detect authentication errors.
- If an authentication error occurs, prompt the user for a Username and Personal Access Token (PAT).
- Temporarily modify the Git remote URL to inject the credentials (e.g., `https://user:token@github.com/...`) for that specific push/pull operation.

## Phase 2: Backend Telemetry HUD (Digital Pulse)
**Analysis**: The Python backend starts in the background via `sidecar.cjs`. If it fails (e.g., due to port conflicts or missing dependencies), the user is left guessing why features like AI or Modernize are failing.
**Implementation Plan**:
- Build a real-time Telemetry HUD (Digital Pulse) in the bottom status bar.
- Use `useStore` to track the connection status of the Python backend (Polling `/api/health`).
- Display an indicator: 🟢 Connected | 🟡 Starting | 🔴 Backend Offline.

## Phase 3: Production Packaging (`package:all`)
**Analysis**: The user cannot distribute this IDE as a `.exe` yet because the Python backend must be compiled into a standalone binary for Electron to package it properly.
**Implementation Plan**:
- Verify the `build_sidecar.py` script executes correctly using PyInstaller.
- Verify `npm run dist` in the `desktop-client` correctly bundles the `backend.exe` sidecar.
- Add error boundaries in `sidecar.cjs` to handle missing sidecar binaries gracefully.

## Phase 4: Multi-Terminal Isolation
**Analysis**: Currently, running an HTML Live Server or a standard file execution uses the `store.activeTerminalId`. If you try to run multiple things, they overwrite each other in the same terminal.
**Implementation Plan**:
- Update `CodeCanvas.jsx` to dynamically spawn a *new* terminal tab for long-running processes (like Live Server or web apps) rather than taking over the active terminal.

---

### User Review Required
Do you approve of this final roadmap? If there is **any other specific feature** you noticed failing that I missed in this list, please let me know and I will add it to the plan! Otherwise, I will start executing Phase 1 and Phase 2.
