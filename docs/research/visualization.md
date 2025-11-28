# Threat Visualization Implementation

## Overview
This document covers algorithms and techniques for implementing real-time board control heatmaps and threat visualization in chess applications.

## Square Control Calculation

### Basic Algorithm
For each square on the board, calculate:
1. Number of white pieces attacking the square
2. Number of black pieces attacking the square
3. Differential (white - black)

```typescript
interface SquareControl {
  square: string           // e.g., "e4"
  whiteAttacks: number     // count of white pieces attacking
  blackAttacks: number     // count of black pieces attacking
  differential: number     // whiteAttacks - blackAttacks
  isOccupied: boolean
  occupant?: {
    color: 'w' | 'b'
    piece: string
  }
}

function calculateSquareControl(
  chess: Chess,
  square: string
): SquareControl {
  // Implementation depends on chess.js version
  // May need to iterate all pieces and check if they can reach the square
}
```

### Attack Detection Methods

#### Method 1: Check all pieces
```typescript
function getAttackersOfSquare(chess: Chess, square: string): Piece[] {
  const attackers: Piece[] = []
  const board = chess.board()

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file]
      if (piece && canPieceAttackSquare(piece, { rank, file }, square)) {
        attackers.push(piece)
      }
    }
  }
  return attackers
}
```

#### Method 2: Use chess.js moves with hypothetical piece placement
```typescript
function getSquareAttackers(chess: Chess, square: string): Piece[] {
  // Temporarily place a piece and check what can capture it
  // This is a common trick when the library doesn't expose attack info
}
```

### Piece Attack Patterns

#### Sliding Pieces (Bishop, Rook, Queen)
- Check all squares in their movement directions until blocked

#### Knight
- Fixed L-shaped pattern (8 possible squares)

#### King
- All 8 adjacent squares

#### Pawn
- Diagonal capture squares only (direction depends on color)

## Heatmap Color Mapping

### Color Scheme
```typescript
interface ColorScheme {
  whiteControl: string    // Green tones
  blackControl: string    // Red tones
  contested: string       // Yellow tones
  neutral: string         // Transparent or gray
}

const defaultColors: ColorScheme = {
  whiteControl: 'rgba(0, 255, 0, {opacity})',
  blackControl: 'rgba(255, 0, 0, {opacity})',
  contested: 'rgba(255, 255, 0, {opacity})',
  neutral: 'transparent'
}
```

### Intensity Mapping
```typescript
function getSquareColor(control: SquareControl): string {
  const { differential } = control
  const maxIntensity = 5  // Maximum meaningful control level

  if (differential === 0) {
    // Contested or neutral
    const totalPressure = control.whiteAttacks + control.blackAttacks
    if (totalPressure > 0) {
      const opacity = Math.min(totalPressure / maxIntensity, 1) * 0.5
      return `rgba(255, 255, 0, ${opacity})`
    }
    return 'transparent'
  }

  const intensity = Math.min(Math.abs(differential) / maxIntensity, 1)
  const opacity = 0.2 + (intensity * 0.5)  // Range: 0.2 - 0.7

  if (differential > 0) {
    // White control
    return `rgba(0, 200, 0, ${opacity})`
  } else {
    // Black control
    return `rgba(200, 0, 0, ${opacity})`
  }
}
```

## Overlay Rendering

### CSS Overlay Approach
```typescript
// Create overlay squares positioned over board
function renderOverlay(boardSize: number): JSX.Element {
  const squareSize = boardSize / 8
  const overlays = []

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = `${'abcdefgh'[file]}${8 - rank}`
      const control = getSquareControl(square)

      overlays.push(
        <div
          key={square}
          style={{
            position: 'absolute',
            left: file * squareSize,
            top: rank * squareSize,
            width: squareSize,
            height: squareSize,
            backgroundColor: getSquareColor(control),
            pointerEvents: 'none'  // Allow clicking through
          }}
        />
      )
    }
  }

  return <div className="overlay-container">{overlays}</div>
}
```

### react-chessboard customSquareStyles
```typescript
// Use react-chessboard's built-in square styling
const customSquareStyles: Record<string, CSSProperties> = {}

for (const square of allSquares) {
  const control = getSquareControl(square)
  customSquareStyles[square] = {
    backgroundColor: getSquareColor(control)
  }
}

<Chessboard customSquareStyles={customSquareStyles} />
```

## Enhanced Visualization Modes

### Numeric Overlay
Show +/- numbers on each square:
```typescript
function renderNumericOverlay(control: SquareControl): string {
  if (control.differential === 0) return ''
  const sign = control.differential > 0 ? '+' : ''
  return `${sign}${control.differential}`
}
```

### Piece-Specific Visualization
- Highlight all squares a selected piece attacks
- Show attack vectors (lines from piece to attacked squares)

### "What-If" Preview
- Calculate control changes when hovering over a potential move
- Show difference visualization (green = improved, red = worsened)

## Performance Considerations

### Calculation Caching
```typescript
const controlCache = new Map<string, SquareControl[]>()

function getControlMap(fen: string): SquareControl[] {
  if (controlCache.has(fen)) {
    return controlCache.get(fen)!
  }

  const controlMap = calculateAllSquareControl(fen)
  controlCache.set(fen, controlMap)

  // Limit cache size
  if (controlCache.size > 100) {
    const firstKey = controlCache.keys().next().value
    controlCache.delete(firstKey)
  }

  return controlMap
}
```

### Debounce Recalculation
```typescript
// Don't recalculate on every move during animation
const debouncedCalculation = debounce(calculateControl, 100)
```

## Reference Implementations

### tlee753/chess-visualizer
- Pseudo heatmap with attack/defense values
- Green = white control, Red = black control, Yellow = tension
- Each piece adds +1/-1 to squares it attacks

### qxf2/chess-heatmap
- Python implementation
- Animated GIFs showing control changes per ply
- Per-square control tracking over game duration

## Research Sources
- [Chess Visualizer - tlee753](https://github.com/tlee753/chess-visualizer)
- [Chess Heatmap - qxf2](https://github.com/qxf2/chess-heatmap)
- [Chess Heat Map Analysis (iOS)](https://apps.apple.com/us/app/chess-heat-map-analysis/id6499176613)
