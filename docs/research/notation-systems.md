# Chess Notation Systems

## Overview
This document covers chess notation formats (SAN, FEN, PGN) and best practices for implementing notation UX in chess applications.

## Standard Algebraic Notation (SAN)

### Basic Format
- Piece letter (uppercase): K (King), Q (Queen), R (Rook), B (Bishop), N (Knight)
- Pawns have no letter prefix
- Destination square follows piece letter
- Examples: `e4`, `Nf3`, `Bb5`, `O-O`, `Qxd7+`

### Special Notations
- `x`: Capture (e.g., `Bxc6`)
- `+`: Check (e.g., `Qd8+`)
- `#`: Checkmate (e.g., `Qf7#`)
- `O-O`: Kingside castling
- `O-O-O`: Queenside castling
- `=Q`: Pawn promotion (e.g., `e8=Q`)

### Disambiguation
When two identical pieces can move to the same square:
- File letter: `Rab1` (Rook from a-file to b1)
- Rank number: `R1a3` (Rook from rank 1 to a3)
- Both: `Qa1a3` (rarely needed)

## Forsyth-Edwards Notation (FEN)

### Format
A FEN string has 6 space-separated fields:
```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

### Fields
1. **Piece placement**: Rank 8 to rank 1, files a-h
   - Lowercase: black pieces (r, n, b, q, k, p)
   - Uppercase: white pieces (R, N, B, Q, K, P)
   - Numbers: empty squares count
   - `/`: Rank separator

2. **Active color**: `w` (White) or `b` (Black)

3. **Castling availability**: `KQkq` or `-`
   - K: White kingside
   - Q: White queenside
   - k: Black kingside
   - q: Black queenside

4. **En passant target square**: e.g., `e3` or `-`

5. **Halfmove clock**: Moves since last pawn move or capture (for 50-move rule)

6. **Fullmove number**: Starts at 1, increments after Black's move

### Starting Position FEN
```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

### Usage in chess.js
```typescript
const chess = new Chess()
const fen = chess.fen()
chess.load(fenString)
```

## Portable Game Notation (PGN)

### Format
```pgn
[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This is the Ruy Lopez opening} 4. Ba4 Nf6
5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O *
```

### Header Tags (Seven Tag Roster)
Required tags:
- `[Event "name"]`
- `[Site "location"]`
- `[Date "YYYY.MM.DD"]`
- `[Round "number"]`
- `[White "name"]`
- `[Black "name"]`
- `[Result "1-0" | "0-1" | "1/2-1/2" | "*"]`

### Movetext Section
- Move numbers followed by moves
- Comments in `{curly braces}`
- Variations in `(parentheses)`
- NAGs (Numeric Annotation Glyphs): `$1` (good move), `$2` (poor move), etc.

### Usage in chess.js
```typescript
const chess = new Chess()
const pgn = chess.pgn()
chess.loadPgn(pgnString)

// Get history with move numbers
const history = chess.history()
```

## Move List UI Patterns

### Display Formats
1. **Two-column format** (most common):
   ```
   1. e4    e5
   2. Nf3   Nc6
   3. Bb5   a6
   ```

2. **Single-column format** (compact):
   ```
   1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
   ```

3. **Expandable format** (with variations):
   ```
   1. e4 e5
     └─ 1... c5 (Sicilian Defense)
   2. Nf3 Nc6
   ```

### Interaction Patterns
- **Click to navigate**: Click any move to jump to that position
- **Keyboard navigation**: Arrow keys to step through moves
- **Current move highlight**: Visual indication of current position
- **Scroll to current**: Auto-scroll move list to current position

### FEN Display
- Show FEN below board (collapsible/expandable)
- One-click copy to clipboard
- Validate FEN on paste/input

## Import/Export Implementation

### FEN Import
```typescript
function importFEN(fen: string): boolean {
  try {
    chess.load(fen)
    return true
  } catch {
    return false
  }
}
```

### PGN Import
```typescript
function importPGN(pgn: string): boolean {
  try {
    chess.loadPgn(pgn)
    return true
  } catch {
    return false
  }
}
```

### PGN Export
```typescript
function exportPGN(): string {
  return chess.pgn({
    maxWidth: 80,
    newline: '\n'
  })
}
```

### File Handling
- Accept `.pgn` file uploads
- Generate downloadable `.pgn` files
- Support multi-game PGN files (Phase 8)

## Research Sources
- [PGN Specification](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)
- [FEN Notation (Wikipedia)](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- [chess.js GitHub](https://github.com/jhlywa/chess.js)
