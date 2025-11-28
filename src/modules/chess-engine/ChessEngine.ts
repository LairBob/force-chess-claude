import { Chess } from 'chess.js'
import type {
  ChessEngineInterface,
  Move,
  MoveInput,
  Piece,
  GameState,
  GameStatus,
  Square,
  Color,
} from './types'

export class ChessEngine implements ChessEngineInterface {
  private chess: Chess

  constructor(fen?: string) {
    this.chess = fen ? new Chess(fen) : new Chess()
  }

  makeMove(move: string | MoveInput): Move | null {
    try {
      const result = this.chess.move(move)
      if (result === null) return null

      return {
        from: result.from as Square,
        to: result.to as Square,
        piece: result.piece,
        color: result.color,
        captured: result.captured,
        promotion: result.promotion,
        flags: result.flags,
        san: result.san,
        lan: result.lan,
      }
    } catch {
      return null
    }
  }

  getLegalMoves(square?: Square): Move[] {
    const options = square ? { square, verbose: true as const } : { verbose: true as const }
    const moves = this.chess.moves(options)

    return moves.map((m) => ({
      from: m.from as Square,
      to: m.to as Square,
      piece: m.piece,
      color: m.color,
      captured: m.captured,
      promotion: m.promotion,
      flags: m.flags,
      san: m.san,
      lan: m.lan,
    }))
  }

  isLegalMove(from: Square, to: Square): boolean {
    const moves = this.getLegalMoves(from)
    return moves.some((m) => m.to === to)
  }

  undoMove(): Move | null {
    const result = this.chess.undo()
    if (result === null) return null

    return {
      from: result.from as Square,
      to: result.to as Square,
      piece: result.piece,
      color: result.color,
      captured: result.captured,
      promotion: result.promotion,
      flags: result.flags,
      san: result.san,
      lan: result.lan,
    }
  }

  getFEN(): string {
    return this.chess.fen()
  }

  getPGN(): string {
    return this.chess.pgn()
  }

  getTurn(): Color {
    return this.chess.turn()
  }

  getMoveNumber(): number {
    return this.chess.moveNumber()
  }

  getGameState(): GameState {
    return {
      fen: this.getFEN(),
      turn: this.getTurn(),
      moveNumber: this.getMoveNumber(),
      status: this.getStatus(),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
    }
  }

  private getStatus(): GameStatus {
    if (this.chess.isCheckmate()) return 'checkmate'
    if (this.chess.isStalemate()) return 'stalemate'
    if (this.chess.isThreefoldRepetition()) return 'threefold_repetition'
    if (this.chess.isInsufficientMaterial()) return 'insufficient_material'
    if (this.chess.isDraw()) return 'fifty_move_rule' // If draw but not other reasons
    if (this.chess.isCheck()) return 'check'
    return 'active'
  }

  getHistory(): Move[] {
    const history = this.chess.history({ verbose: true })

    return history.map((m) => ({
      from: m.from as Square,
      to: m.to as Square,
      piece: m.piece,
      color: m.color,
      captured: m.captured,
      promotion: m.promotion,
      flags: m.flags,
      san: m.san,
      lan: m.lan,
    }))
  }

  getPieceAt(square: Square): Piece | null {
    const piece = this.chess.get(square)
    if (!piece) return null

    return {
      type: piece.type,
      color: piece.color,
    }
  }

  getBoard(): (Piece | null)[][] {
    return this.chess.board().map((row) =>
      row.map((cell) => {
        if (!cell) return null
        return {
          type: cell.type,
          color: cell.color,
        }
      })
    )
  }

  loadFEN(fen: string): boolean {
    try {
      this.chess.load(fen)
      return true
    } catch {
      return false
    }
  }

  loadPGN(pgn: string): boolean {
    try {
      this.chess.loadPgn(pgn)
      return true
    } catch {
      return false
    }
  }

  reset(): void {
    this.chess.reset()
  }
}
