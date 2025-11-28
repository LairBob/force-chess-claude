# Force Chess

A browser-based chess application focused on visualizing positional strength through threat/control heatmaps.

## Vision

Create an educational and analytical chess application that goes beyond standard chess apps by providing real-time visual feedback on board control, threat assessment, and positional strength for every square.

## Features (Planned)

- **Playable Chess**: Standard chess rules with legal move enforcement
- **Notation System**: Real-time algebraic notation with FEN/PGN support
- **Threat Visualization**: Real-time heatmap showing degree of control per square
- **Multi-Mode Play**: Local 2-player and vs AI (Stockfish)
- **Tutorial/Debug Modes**: Enhanced visualization overlays for learning
- **Game Library**: Load/save games, access historical matches

## Technology Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Chess Logic**: chess.js
- **Board UI**: react-chessboard
- **AI Engine**: stockfish.js (WebAssembly)
- **Testing**: Vitest (unit/integration) + Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/LairBob/force-chess-claude.git
cd force-chess-claude

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
npm run test:unit    # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e     # Run E2E tests with Playwright
npm run test:all     # Run all tests
```

## Project Structure

```
force-chess-claude/
├── docs/
│   ├── charter/         # Project charter (machine-readable)
│   ├── research/        # Research documentation
│   ├── sessions/        # Session tracking
│   └── handoffs/        # Handoff documents
├── src/
│   ├── components/      # React components
│   │   ├── Board/       # Chessboard wrapper
│   │   ├── Controls/    # Game controls
│   │   ├── Notation/    # Move list, FEN/PGN display
│   │   ├── Visualization/ # Threat overlay
│   │   └── Layout/      # App shell
│   ├── modules/         # Core logic modules
│   │   ├── chess-engine/    # chess.js wrapper
│   │   ├── notation/        # FEN/PGN parsing
│   │   ├── threat-analyzer/ # Square control calculation
│   │   ├── ai-opponent/     # Stockfish integration
│   │   └── game-state/      # State management
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
├── PROJECT_PROGRESS.json  # Master progress tracker
└── package.json
```

## Development Roadmap

| Phase | Name | Description | Status |
|-------|------|-------------|--------|
| 0 | Project Foundation | Infrastructure, research, tracking | In Progress |
| 1 | Basic Chess Board | Interactive board with piece rendering | Pending |
| 2 | Legal Moves + Notation | Rules compliance, real-time notation | Pending |
| 3 | Game Controls | Save/load, import/export | Pending |
| 4 | Threat Visualization | Board control heatmap | Pending |
| 5 | Enhanced Visualization | Tutorial/debug modes | Pending |
| 6 | AI Opponent | Stockfish integration | Pending |
| 7 | Polish | Mobile, accessibility, themes | Pending |
| 8 | Game Library | Historical games, external APIs | Pending |

## Session Management

This project uses a structured session management system for development continuity:

- **Session Charter**: Defines goals and success criteria
- **Progress Tracker**: Real-time task tracking
- **Handoff Documents**: Context restoration between sessions

See `docs/sessions/` for session history.

## Testing Strategy

This project follows a test-driven development approach with three levels of testing:

- **Unit Tests** (`tests/unit/`): Test individual functions and modules in isolation
- **Integration Tests** (`tests/integration/`): Test multiple components working together
- **E2E Tests** (`tests/e2e/`): Test complete user journeys in a real browser

Coverage targets: 80% for lines, functions, branches, and statements.

## Contributing

This project is developed with AI assistance using Claude Code. Each development session produces tracking artifacts for context continuity.

## License

[TBD]

## Acknowledgments

- [chess.js](https://github.com/jhlywa/chess.js) - Chess logic library
- [react-chessboard](https://github.com/Clariity/react-chessboard) - React chessboard component
- [stockfish.js](https://github.com/nmrugg/stockfish.js) - Stockfish WebAssembly port
