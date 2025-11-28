# Chess Logic Implementation

## Overview
This document covers the implementation of chess game logic, focusing on the chess.js library and move validation patterns.

## chess.js Library

### Installation
```bash
npm install chess.js
```

### Core Features
- Move generation and validation
- Piece placement and movement
- Check/checkmate/stalemate detection
- FEN and PGN support
- Game state management

### Basic Usage
```typescript
import { Chess } from 'chess.js'

const chess = new Chess()

// Get legal moves
const moves = chess.moves()  // ['a3', 'a4', 'b3', ...]
const verboseMoves = chess.moves({ verbose: true })

// Make a move
chess.move('e4')
chess.move({ from: 'e7', to: 'e5' })

// Check game state
chess.isCheck()
chess.isCheckmate()
chess.isStalemate()
chess.isDraw()
chess.isGameOver()

// Get current FEN
const fen = chess.fen()

// Get PGN
const pgn = chess.pgn()

// Load position
chess.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')

// Undo move
chess.undo()
```

## Move Validation

### Two-Stage Validation
Chess move validation typically uses a two-stage approach:

1. **Pseudo-legal move generation**: Generate all moves that follow piece movement rules
2. **Legality check**: Verify the move doesn't leave own king in check

```typescript
// chess.js handles this internally
// moves() returns only legal moves
const legalMoves = chess.moves()

// Check if specific move is legal
const moveResult = chess.move('e4')
if (moveResult === null) {
  // Move was illegal
}
```

### Move Types
```typescript
interface Move {
  color: 'w' | 'b'
  from: string       // e.g., 'e2'
  to: string         // e.g., 'e4'
  piece: string      // 'p', 'n', 'b', 'r', 'q', 'k'
  captured?: string  // Piece captured, if any
  promotion?: string // Promotion piece, if pawn promotion
  flags: string      // Move flags
  san: string        // Standard algebraic notation
  lan: string        // Long algebraic notation
}
```

### Move Flags
- `n`: Non-capture
- `b`: Pawn push of two squares
- `e`: En passant capture
- `c`: Standard capture
- `p`: Promotion
- `k`: Kingside castling
- `q`: Queenside castling

## Special Moves

### Castling
```typescript
// Kingside castling
chess.move('O-O')
chess.move({ from: 'e1', to: 'g1' })

// Queenside castling
chess.move('O-O-O')
chess.move({ from: 'e1', to: 'c1' })
```

### En Passant
En passant is automatically detected when a pawn captures the square a pawn passed through during a two-square advance.

### Pawn Promotion
```typescript
chess.move('e8=Q')  // Promote to queen
chess.move({ from: 'e7', to: 'e8', promotion: 'q' })
```

## Board Representation

### Getting Board State
```typescript
// Get piece at square
const piece = chess.get('e4')  // { type: 'p', color: 'w' } or null

// Get entire board
const board = chess.board()  // 8x8 array of pieces

// ASCII representation
console.log(chess.ascii())
```

### Square Helpers
```typescript
// Get all squares
const squares = ['a8', 'b8', ... 'h1']

// Get squares a piece attacks
// Note: chess.js doesn't have direct attack detection
// You need to check if square is in possible moves
```

## Game State Management

### History
```typescript
// Get move history
const history = chess.history()  // ['e4', 'e5', 'Nf3', ...]
const verboseHistory = chess.history({ verbose: true })

// Get game turn
const turn = chess.turn()  // 'w' or 'b'

// Get move number
const moveNumber = chess.moveNumber()
```

### Three-fold Repetition & 50-Move Rule
```typescript
chess.isThreefoldRepetition()
chess.isDraw()  // Includes 50-move rule and insufficient material
```

## Wrapper Module Structure

For Force Chess, create a wrapper module that extends chess.js:

```typescript
// src/modules/chess-engine/index.ts
import { Chess } from 'chess.js'

export interface ChessEngine {
  // Core methods
  makeMove(move: string | MoveInput): MoveResult | null
  getLegalMoves(square?: string): Move[]
  undoMove(): Move | null

  // State queries
  getFEN(): string
  getPGN(): string
  getTurn(): 'w' | 'b'
  isGameOver(): boolean
  getGameStatus(): GameStatus

  // Board queries
  getPieceAt(square: string): Piece | null
  getBoard(): (Piece | null)[][]

  // Load/reset
  loadFEN(fen: string): boolean
  loadPGN(pgn: string): boolean
  reset(): void
}
```

## Research Sources
- [chess.js GitHub](https://github.com/jhlywa/chess.js)
- [chess.js README](https://github.com/jhlywa/chess.js/blob/master/README.md)
- [Stack Overflow - Chess piece legal moves](https://stackoverflow.com/questions/54641485/chess-piece-legal-moves)
