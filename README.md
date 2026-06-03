# Tether

Tether is a modern, lightweight desktop application built with [Wails](https://wails.io/), Go, and TypeScript. It acts as a dedicated assistant to quickly connect to your home server for screen sharing and file access.

## Features

- **Quick Connection Setup**: Easily configure your connection by entering your server's IPv4 address (e.g., `192.168.1.100`) or a `.local` hostname (e.g., `myserver.local`).
- **Automatic Host Validation**: Tether automatically pings the provided IP or hostname to ensure the server is reachable before attempting to connect.
- **Screen Sharing (VNC)**: One-click access to open a VNC screen-sharing session with your home server.
- **File Browser (SMB)**: One-click access to mount and open your server's file system via SMB.
- **Credential Management**: Securely store your username. You have the option to save your password for seamless, one-click connections, or omit it to have macOS prompt you securely each time (recommended for shared computers).
- **Modern UI/UX**: 
  - Beautiful glassmorphism design with animated background orbs.
  - Built-in Dark and Light mode toggle.
  - Smooth micro-animations and transitions for a premium feel.

## Prerequisites

- macOS (Tether utilizes the macOS `open` command for `vnc://` and `smb://` protocols).
- [Go](https://golang.org/doc/install) (1.18+)
- [Node.js](https://nodejs.org/en/download/) & npm
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

## Setup and Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/tether.git
   cd tether
   ```

2. **Run in Development Mode:**
   To start the application in development mode with hot-reloading for the frontend:
   ```bash
   wails dev
   ```

3. **Build for Production:**
   To compile the application into a standalone macOS `.app` bundle:
   ```bash
   wails build
   ```
   The compiled binary will be available in the `build/bin/` directory.

## Security Note

If you choose to save your password in Tether, the application passes it directly in the connection URL (`smb://user:password@ip`). While convenient, this means the password may be briefly visible in system process listings (like `ps aux`) while the connection is being established. If you share your computer with other users, it is highly recommended to **disable** the "Save password" toggle. macOS will then prompt you natively and securely when connecting.
