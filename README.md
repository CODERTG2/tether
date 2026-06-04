# Tether

Tether is a modern, lightweight desktop application built with [Wails](https://wails.io/), Go, and TypeScript. It acts as a dedicated assistant to quickly connect to your home server for screen sharing and file access.

## Features

- **Quick Connection Setup**: Easily configure your connection by entering your server's IPv4 address (e.g., `192.168.1.100`) or a `.local` hostname (e.g., `myserver.local`).
- **Automatic Host Validation**: Tether automatically pings the provided IP or hostname to ensure the server is reachable before attempting to connect.
- **Persistent Configuration**: Your server address and username are saved to a local config file (`~/Library/Application Support/tether`) and automatically loaded on subsequent launches — no need to re-enter them every time.
- **Screen Sharing (VNC)**: One-click access to open a VNC screen-sharing session with your home server.
- **File Browser (SMB)**: One-click access to mount and open your server's file system via SMB.
- **Advanced Port Scanner**: Built-in network scanner that checks all 65,535 ports on your server.
  - Automatically identifies services using TCP Banner Grabbing, HTTP `<title>` scraping, and a fallback dictionary of well-known ports.
  - Fetches and displays favicons for web services.
  - Allows inline editing of discovered service names and deleting ports.
  - Caches results locally (`~/Library/Application Support/ports.json`) for instant loading on subsequent views.
- **Secure Credential Storage**: Passwords are stored in the **macOS Keychain** rather than in plain text. You have the option to save your password for seamless, one-click connections, or omit it to have macOS prompt you securely each time (recommended for shared computers).
- **Modern UI/UX**: 
  - Beautiful glassmorphism design with animated background orbs and radar loading animations.
  - Built-in Dark and Light mode toggle (persisted across sessions).
  - Smooth micro-animations and transitions for a premium feel.

## Prerequisites

- macOS (Tether utilizes the macOS `open` command for `vnc://` and `smb://` protocols, and the macOS Keychain for password storage).
- [Go](https://golang.org/doc/install) (1.18+)
- [Node.js](https://nodejs.org/en/download/) & npm
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

## Setup and Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/tether.git
   cd tether
   ```

2. **Install Go dependencies:**
   ```bash
   go mod tidy
   ```

3. **Run in Development Mode:**
   To start the application in development mode with hot-reloading for the frontend:
   ```bash
   wails dev
   ```

4. **Build for Production:**
   To compile the application into a standalone macOS `.app` bundle:
   ```bash
   wails build
   ```
   The compiled binary will be available in the `build/bin/` directory.

## Project Structure

```
tether/
├── app.go           # Main App struct, startup lifecycle, OpenX connection handler
├── config.go        # Config persistence (read/write JSON to ~/Library/Application Support/tether.json)
├── ip.go            # IP address validation, ping verification, .local hostname resolution
├── username.go      # Username validation
├── password.go      # Password storage via macOS Keychain (go-keyring)
├── portscan.go      # Fast concurrent TCP scanner, banner grabbing, HTTP title scraping
├── main.go          # Wails application entry point
├── frontend/
│   ├── src/
│   │   ├── main.ts    # Frontend application logic (setup, dashboard, settings views)
│   │   └── style.css  # Design system (dark/light mode, glassmorphism, animations)
│   └── index.html     # HTML entry point
└── build/             # Build output and app icons
```

## Security Note

If you choose to save your password in Tether, it is stored securely in the **macOS Keychain** — not in a plain text file. However, when a connection is initiated, the password is passed in the connection URL (`smb://user:password@ip`), which means it may be briefly visible in system process listings (like `ps aux`) while the connection is being established. If you share your computer with other users, it is recommended to **disable** the "Save password" toggle. macOS will then prompt you natively and securely when connecting.
