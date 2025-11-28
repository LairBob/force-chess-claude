# AI Integration (Stockfish)

## Overview
This document covers integrating the Stockfish chess engine into a browser-based application using WebAssembly.

## Available Libraries

### stockfish.js (nmrugg) - Recommended
- **Repository**: https://github.com/nmrugg/stockfish.js
- **Used by**: Chess.com
- **Version**: Stockfish 17.1
- **Sizes**:
  - Large (NNUE): ~75MB (strongest, requires CORS headers)
  - Large (no CORS): ~75MB (no multi-threading)
  - Lite: ~7MB (weaker but much smaller)

### stockfish.wasm (lichess-org)
- **Repository**: https://github.com/lichess-org/stockfish.wasm
- **Used by**: Lichess
- **Features**: Multi-threaded WebAssembly
- **Requires**: CORS headers for SharedArrayBuffer

## Installation

```bash
npm install stockfish
```

## Basic Setup

### Using Web Worker
Running Stockfish in a Web Worker prevents UI blocking:

```typescript
// stockfishWorker.ts
import { STOCKFISH } from 'stockfish'

const engine = STOCKFISH()

engine.onmessage = (event: MessageEvent) => {
  // Handle engine output
  const line = event.data
  postMessage(line)
}

onmessage = (event: MessageEvent) => {
  // Send commands to engine
  engine.postMessage(event.data)
}
```

### Main Thread Integration
```typescript
// aiOpponent.ts
class StockfishEngine {
  private worker: Worker
  private handlers: Map<string, (line: string) => void>

  constructor() {
    this.worker = new Worker(
      new URL('./stockfishWorker.ts', import.meta.url),
      { type: 'module' }
    )
    this.handlers = new Map()

    this.worker.onmessage = (event) => {
      this.handleMessage(event.data)
    }
  }

  private handleMessage(line: string) {
    // Parse UCI output
    if (line.startsWith('bestmove')) {
      this.handlers.get('bestmove')?.(line)
    } else if (line.startsWith('info')) {
      this.handlers.get('info')?.(line)
    }
  }

  send(command: string) {
    this.worker.postMessage(command)
  }

  onBestMove(handler: (line: string) => void) {
    this.handlers.set('bestmove', handler)
  }
}
```

## UCI Protocol

Universal Chess Interface (UCI) is the standard protocol for chess engine communication.

### Basic Commands

```typescript
// Initialize engine
engine.send('uci')
// Response: id name Stockfish ..., uciok

// Set position
engine.send('position startpos')
engine.send('position startpos moves e2e4 e7e5')
engine.send('position fen <fen_string>')
engine.send('position fen <fen_string> moves e2e4')

// Start analysis
engine.send('go depth 20')
engine.send('go movetime 1000')  // 1 second
engine.send('go infinite')

// Stop analysis
engine.send('stop')

// Get best move
// Response: bestmove e2e4 ponder e7e5
```

### Difficulty Levels

Control difficulty by limiting search:

```typescript
interface DifficultySettings {
  depth: number
  movetime?: number
}

const difficulties: Record<string, DifficultySettings> = {
  beginner: { depth: 1, movetime: 100 },
  easy: { depth: 5, movetime: 500 },
  medium: { depth: 10, movetime: 1000 },
  hard: { depth: 15, movetime: 2000 },
  expert: { depth: 20, movetime: 5000 }
}

function getBestMove(fen: string, difficulty: string): Promise<string> {
  return new Promise((resolve) => {
    const settings = difficulties[difficulty]

    engine.onBestMove((line) => {
      const match = line.match(/bestmove (\w+)/)
      if (match) {
        resolve(match[1])
      }
    })

    engine.send(`position fen ${fen}`)
    engine.send(`go depth ${settings.depth} movetime ${settings.movetime}`)
  })
}
```

### Parsing Engine Output

```typescript
interface EngineInfo {
  depth?: number
  score?: { cp?: number; mate?: number }
  pv?: string[]
  nodes?: number
  nps?: number
  time?: number
}

function parseInfoLine(line: string): EngineInfo {
  const info: EngineInfo = {}

  const depthMatch = line.match(/depth (\d+)/)
  if (depthMatch) info.depth = parseInt(depthMatch[1])

  const cpMatch = line.match(/score cp (-?\d+)/)
  if (cpMatch) info.score = { cp: parseInt(cpMatch[1]) }

  const mateMatch = line.match(/score mate (-?\d+)/)
  if (mateMatch) info.score = { mate: parseInt(mateMatch[1]) }

  const pvMatch = line.match(/pv (.+)/)
  if (pvMatch) info.pv = pvMatch[1].split(' ')

  return info
}
```

## Module Architecture

```typescript
// src/modules/ai-opponent/index.ts
export interface AIOpponent {
  // Lifecycle
  initialize(): Promise<void>
  terminate(): void

  // Analysis
  getBestMove(fen: string, options?: MoveOptions): Promise<string>
  analyzePosition(fen: string): Promise<Analysis>
  stopAnalysis(): void

  // Settings
  setDifficulty(level: DifficultyLevel): void
  setThinkingTime(ms: number): void
}

export type DifficultyLevel =
  | 'beginner'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'

export interface Analysis {
  bestMove: string
  evaluation: number  // Centipawns
  depth: number
  principalVariation: string[]
}
```

## Browser Compatibility

### CORS Headers Required (for multi-threading)
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### Browser Support
- Chrome/Edge 79+: Full support
- Firefox 79+: Full support
- Safari 15+: Limited support (no multi-threading)

### Fallback Strategy
```typescript
async function initializeEngine(): Promise<StockfishEngine> {
  try {
    // Try multi-threaded version first
    return await initializeMultiThreaded()
  } catch {
    // Fall back to single-threaded
    console.warn('Multi-threaded Stockfish not available, using single-threaded')
    return await initializeSingleThreaded()
  }
}
```

## UX Considerations

### Thinking Indicator
- Show "AI is thinking..." during analysis
- Display search depth or time remaining

### Move Delay
- Add slight delay before AI move for natural feel
- Allow move to be shown even if calculated instantly

### Strength Calibration
- Consider ELO-based difficulty settings
- Provide visual indication of AI strength

## Research Sources
- [stockfish.js - nmrugg](https://github.com/nmrugg/stockfish.js)
- [lichess-org/stockfish.wasm](https://github.com/lichess-org/stockfish.wasm)
- [UCI Protocol](http://wbec-ridderkerk.nl/html/UCIProtocol.html)
- [Stack Overflow - Stockfish Integration](https://stackoverflow.com/questions/77194959/how-to-integrate-stockfish-in-html-with-chess-js-and-chessboard-js)
