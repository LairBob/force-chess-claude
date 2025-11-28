# Game Libraries and External Data Sources

## Overview
This document covers external APIs and data sources for accessing historical games, famous matches, and user game libraries.

## Lichess API

### Overview
- **Base URL**: https://lichess.org/api
- **Authentication**: Optional (rate limits apply)
- **Rate Limits**:
  - Anonymous: 20 requests/second
  - Authenticated: Higher limits

### Useful Endpoints

#### Get User Games
```typescript
// GET /api/games/user/{username}
// Returns PGN of user's games

async function getUserGames(username: string, options?: {
  max?: number
  since?: number
  until?: number
  perfType?: string
}): Promise<string> {
  const params = new URLSearchParams()
  if (options?.max) params.set('max', options.max.toString())
  if (options?.since) params.set('since', options.since.toString())

  const response = await fetch(
    `https://lichess.org/api/games/user/${username}?${params}`,
    {
      headers: {
        'Accept': 'application/x-chess-pgn'
      }
    }
  )
  return response.text()
}
```

#### Get Specific Game
```typescript
// GET /game/export/{gameId}
async function getGame(gameId: string): Promise<string> {
  const response = await fetch(
    `https://lichess.org/game/export/${gameId}`,
    {
      headers: {
        'Accept': 'application/x-chess-pgn'
      }
    }
  )
  return response.text()
}
```

#### Opening Explorer
```typescript
// GET /api/opening-explorer/masters
// GET /api/opening-explorer/lichess
async function getOpeningData(fen: string): Promise<OpeningData> {
  const response = await fetch(
    `https://lichess.org/api/opening-explorer/masters?fen=${encodeURIComponent(fen)}`
  )
  return response.json()
}

interface OpeningData {
  opening?: {
    eco: string
    name: string
  }
  moves: Array<{
    uci: string
    san: string
    white: number
    black: number
    draws: number
  }>
}
```

### Cloud Analysis
```typescript
// GET /api/cloud-eval
// Get cached engine analysis for a position
async function getCloudEval(fen: string): Promise<CloudEval | null> {
  const response = await fetch(
    `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`
  )
  if (response.status === 404) return null
  return response.json()
}
```

## Chess.com API

### Overview
- **Base URL**: https://api.chess.com/pub
- **Authentication**: Not required for public data
- **Documentation**: https://www.chess.com/news/view/published-data-api

### Useful Endpoints

#### Get Player's Games
```typescript
// GET /pub/player/{username}/games/{YYYY}/{MM}
async function getMonthlyGames(
  username: string,
  year: number,
  month: number
): Promise<ChessComGames> {
  const monthStr = month.toString().padStart(2, '0')
  const response = await fetch(
    `https://api.chess.com/pub/player/${username}/games/${year}/${monthStr}`
  )
  return response.json()
}

interface ChessComGames {
  games: Array<{
    url: string
    pgn: string
    time_control: string
    end_time: number
    rated: boolean
    fen: string
    time_class: string
    rules: string
    white: { username: string; rating: number }
    black: { username: string; rating: number }
  }>
}
```

#### Get Available Archives
```typescript
// GET /pub/player/{username}/games/archives
async function getGameArchives(username: string): Promise<string[]> {
  const response = await fetch(
    `https://api.chess.com/pub/player/${username}/games/archives`
  )
  const data = await response.json()
  return data.archives
}
```

## Famous Games Collections

### Bundled Collection
Consider including a curated collection of famous games:

```typescript
const famousGames: GameMetadata[] = [
  {
    id: 'immortal-game',
    name: 'The Immortal Game',
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    year: 1851,
    result: '1-0',
    opening: "King's Gambit",
    significance: 'Famous attacking masterpiece',
    pgn: '1. e4 e5 2. f4 exf4 3. Bc4 ...'
  },
  {
    id: 'evergreen-game',
    name: 'The Evergreen Game',
    white: 'Adolf Anderssen',
    black: 'Jean Dufresne',
    year: 1852,
    result: '1-0',
    opening: 'Evans Gambit',
    significance: 'Brilliant sacrificial attack',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 ...'
  },
  // More famous games...
]
```

### Categories
- World Championship Games
- Immortal Games (famous brilliancies)
- Opening Demonstrations
- Endgame Studies
- Modern Classics

## Opening Database (ECO Codes)

### Structure
```typescript
interface Opening {
  eco: string      // e.g., "B20"
  name: string     // e.g., "Sicilian Defense"
  moves: string    // e.g., "1. e4 c5"
  fen: string      // Position after opening moves
}

// ECO ranges:
// A: Flank openings, Réti, English, etc.
// B: Semi-open games (1.e4 without 1...e5)
// C: Open games (1.e4 e5)
// D: Closed/Semi-closed games (1.d4 d5)
// E: Indian defenses (1.d4 Nf6)
```

### Implementation
```typescript
async function identifyOpening(fen: string): Promise<Opening | null> {
  // Use Lichess opening explorer
  const data = await getOpeningData(fen)
  if (data.opening) {
    return {
      eco: data.opening.eco,
      name: data.opening.name,
      moves: '', // Would need to track from start
      fen
    }
  }
  return null
}
```

## Local Game Library

### Storage Schema
```typescript
interface StoredGame {
  id: string
  createdAt: string
  updatedAt: string

  // Game metadata
  white: string
  black: string
  date: string
  event?: string
  site?: string
  result: '1-0' | '0-1' | '1/2-1/2' | '*'

  // Opening info
  eco?: string
  opening?: string

  // Game data
  pgn: string
  finalFen: string

  // User additions
  notes?: string
  tags?: string[]
  favorite?: boolean
}
```

### IndexedDB Storage
```typescript
// Use IndexedDB for larger storage capacity
import { openDB, IDBPDatabase } from 'idb'

const dbPromise = openDB('force-chess-games', 1, {
  upgrade(db) {
    const store = db.createObjectStore('games', {
      keyPath: 'id'
    })
    store.createIndex('date', 'date')
    store.createIndex('tags', 'tags', { multiEntry: true })
  }
})

async function saveGame(game: StoredGame): Promise<void> {
  const db = await dbPromise
  await db.put('games', game)
}

async function getGames(options?: {
  limit?: number
  offset?: number
  tag?: string
}): Promise<StoredGame[]> {
  const db = await dbPromise
  const tx = db.transaction('games', 'readonly')
  // Implementation details...
}
```

## Multi-Game PGN Files

### Parsing
```typescript
function splitPgnGames(pgnText: string): string[] {
  // Split by empty lines followed by [Event tag
  return pgnText
    .split(/\n\n(?=\[Event)/g)
    .filter(game => game.trim().length > 0)
}

async function importPgnFile(file: File): Promise<number> {
  const text = await file.text()
  const games = splitPgnGames(text)

  for (const pgn of games) {
    const game = parsePgnToStoredGame(pgn)
    await saveGame(game)
  }

  return games.length
}
```

### Navigation
```typescript
interface MultiGameNavigator {
  games: string[]
  currentIndex: number

  next(): string | null
  previous(): string | null
  goTo(index: number): string | null
  total(): number
}
```

## Research Sources
- [Lichess API](https://lichess.org/api)
- [Chess.com Published Data API](https://www.chess.com/news/view/published-data-api)
- [ECO Codes (Wikipedia)](https://en.wikipedia.org/wiki/Encyclopaedia_of_Chess_Openings)
- [idb - IndexedDB wrapper](https://github.com/jakearchibald/idb)
