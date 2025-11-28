import type { Square, Color, PieceSymbol } from 'chess.js'

export type { Square, Color, PieceSymbol }

export interface Piece {
  type: PieceSymbol
  color: Color
}

export interface Move {
  from: Square
  to: Square
  piece: PieceSymbol
  color: Color
  captured?: PieceSymbol
  promotion?: PieceSymbol
  flags: string
  san: string
  lan: string
}

export interface MoveInput {
  from: Square
  to: Square
  promotion?: PieceSymbol
}

export type GameStatus =
  | 'active'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'threefold_repetition'
  | 'insufficient_material'
  | 'fifty_move_rule'

export interface GameState {
  fen: string
  turn: Color
  moveNumber: number
  status: GameStatus
  isCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean
  isGameOver: boolean
}

export interface ChessEngineInterface {
  // Core move operations
  makeMove(move: string | MoveInput): Move | null
  getLegalMoves(square?: Square): Move[]
  isLegalMove(from: Square, to: Square): boolean
  undoMove(): Move | null

  // State queries
  getFEN(): string
  getPGN(): string
  getTurn(): Color
  getMoveNumber(): number
  getGameState(): GameState
  getHistory(): Move[]

  // Board queries
  getPieceAt(square: Square): Piece | null
  getBoard(): (Piece | null)[][]

  // Load/reset
  loadFEN(fen: string): boolean
  loadPGN(pgn: string): boolean
  reset(): void
}
