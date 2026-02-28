# Harmony

[![CI](https://github.com/jvegaf/harmony/actions/workflows/build.yml/badge.svg)](https://github.com/jvegaf/harmony/actions/workflows/build.yml)

## Description

Harmony is a music manager designed specifically for old-school DJs. It allows you to organize and manage your music collection efficiently.

## Features

- 🎵 Easy music management with automated tasks
- 📋 Playlist creation and organization
- ⚡ **High-performance drag & drop** - Instant track reordering (< 10ms)
- 🎨 Custom drag ghost showing track information
- 🔄 Automatic background synchronization
- 🔗 **Track URLs** - Store and access track pages from Beatport, Traxsource, and Bandcamp
- 🎧 Intuitive interface designed for DJs

## Screenshots

<details>
<summary><b>📸 Click to view screenshots</b></summary>

### Main Library View

Manage your entire music collection with powerful search and filtering capabilities.

![Main Library](./img/harmony1.png)

### Track Detail View

Edit track metadata, find tag candidates from Beatport/Traxsource/Bandcamp, replace files, and manage ratings.

![Track Detail](./img/harmony-track-detail.png)

### Duplicate Finder

Identify and manage duplicate tracks in your collection with advanced comparison tools.

![Duplicate Finder](./img/harmony2.png)

### Beatport Recommendations

Get track recommendations from Beatport

![Beatport Recommendations](./img/harmony-track-recommendations.png)

</details>

## Tech Stack

- **Desktop Framework**: Tauri v2 with Rust backend
- **Frontend**: React 18 + Vite + Mantine UI
- **State Management**: Zustand
- **Database**: rusqlite + SQLite
- **Audio**: lofty (metadata), symphonia (analysis)
- **Build Tools**: Tauri CLI, cargo, Vite
- **Package Manager**: pnpm (frontend), cargo (backend)

> **Note**: Migrated from Electron to Tauri v2 in February 2026 for better performance and smaller binaries.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
pnpm install
```

### Development

```bash
pnpm run dev             # Start development mode with hot reload
pnpm run tauri:dev       # Alternative: Start Tauri dev mode directly
pnpm start               # Preview built app
```

### Build

```bash
# For windows
pnpm run build:win       # (Coming soon)

# For macOS
pnpm run build:mac       # (Coming soon)

# For Linux
pnpm run build:linux     # (Coming soon)

# Current platform
pnpm run build           # TypeCheck + build
pnpm run tauri:build     # Build Tauri app

# Production release
pnpm run release
```

### Code Quality

```bash
pnpm run lint            # ESLint with auto-fix
pnpm run format          # Prettier auto-format all files
pnpm run typecheck       # Run both node + web type checks
```

### Testing

```bash
pnpm test                # Run tests in watch mode
pnpm run test:run        # Run all tests once (CI mode)
pnpm run test:ui         # Open Vitest UI
pnpm run test:coverage   # Run tests with coverage report
```

## Documentation

- **[AGENTS.md](AGENTS.md)** - Complete project documentation, code style, architecture, available skills
- **[.agents/skills/](.agents/skills/)** - Specialized AI skills for Electron, React, Mantine, Zustand, code review, and more

## Contributing

If you would like to contribute to Harmony, please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Read [AGENTS.md](AGENTS.md) for code style guidelines, architecture notes, and best practices
4. Make your changes following the project conventions
5. Run `pnpm lint` and `pnpm typecheck` before committing
6. Commit your changes (`git commit -m 'Add new feature'`)
7. Push to the branch (`git push origin feature-branch`)
8. Open a pull request

### Code Style

- **Import organization**: Tauri API imports → External packages → Internal modules → Relative imports
- **Formatting**: Run `pnpm run format` (Prettier with single quotes, 120 line width)
- **TypeScript**: Use interfaces for objects, type aliases for unions, avoid `any`
- **Logging**: Use Tauri logger plugin in frontend, `log` crate macros in Rust backend
- **Error handling**: Always log errors, use try-catch for async operations, return `Result<T, E>` in Rust

See [AGENTS.md](AGENTS.md) for complete guidelines.

# License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
