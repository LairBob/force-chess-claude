import { useState, useRef, useCallback, useMemo } from 'react'
import { ChessEngine, type Move, type GameState, type Square } from '../modules/chess-engine'

interface UseChessGameOptions {
  initialFEN?: string
}

interface UseChessGameReturn {
  // State
  fen: string
  gameState: GameState
  history: Move[]
  displayedMove: { from: Square; to: Square } | null
  selectedSquare: Square | null
  legalMoves: Square[]
  displayedPly: number
  canGoBack: boolean
  canGoForward: boolean

  // Actions
  makeMove: (from: Square, to: Square, promotion?: string) => boolean
  selectSquare: (square: Square | null) => void
  undoMove: () => boolean
  reset: () => void
  loadFEN: (fen: string) => boolean
  loadPGN: (pgn: string) => boolean
  goPrev: () => void
  goNext: () => void
  goFirst: () => void
  goLast: () => void
  goToPly: (ply: number) => void

  // Board interaction helpers
  onPieceDrop: (source: Square, target: Square, piece: string) => boolean
  onSquareClick: (square: Square) => void
  onPieceDragBegin: (piece: string, sourceSquare: Square) => void
  onPieceDragEnd: () => void
}

export function useChessGame(options: UseChessGameOptions = {}): UseChessGameReturn {
  const [engine] = useState(() => new ChessEngine(options.initialFEN))
  const [fen, setFEN] = useState(() => engine.getFEN())
  const [gameState, setGameState] = useState<GameState>(() => engine.getGameState())
  const [history, setHistory] = useState<Move[]>([])
  const [displayedMove, setDisplayedMove] = useState<{ from: Square; to: Square } | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [redoStack, setRedoStack] = useState<Move[]>([])
  // redoStackRef mirrors redoStack so that goNext can read the latest value
  // synchronously even when called in the same React batch as goPrev.
  const redoStackRef = useRef<Move[]>([])

  // `fen` is intentionally in the deps: legal moves depend on the engine's
  // mutable state, and `fen` changes whenever that state advances.
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return []
    return engine.getLegalMoves(selectedSquare).map((m) => m.to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquare, fen, engine])

  const syncState = useCallback(() => {
    setFEN(engine.getFEN())
    setGameState(engine.getGameState())
    setHistory(engine.getHistory())
  }, [engine])

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      const move = engine.makeMove({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' })
      if (move) {
        setDisplayedMove({ from, to })
        setSelectedSquare(null)
        syncState()
        return true
      }
      return false
    },
    [engine, syncState]
  )

  const selectSquare = useCallback((square: Square | null) => {
    setSelectedSquare(square)
  }, [])

  const undoMove = useCallback((): boolean => {
    const undone = engine.undoMove()
    if (undone) {
      // Also reset the displayed move to the previous one
      const newHistory = engine.getHistory()
      if (newHistory.length > 0) {
        const prevMove = newHistory[newHistory.length - 1]
        setDisplayedMove({ from: prevMove.from, to: prevMove.to })
      } else {
        setDisplayedMove(null)
      }
      setSelectedSquare(null)
      syncState()
      return true
    }
    return false
  }, [engine, syncState])

  // NOTE: Never call engine.* or setX() inside a setState updater function —
  // React 19 StrictMode can invoke updaters twice, which would double-apply
  // moves to the engine. Always do the engine mutation first (synchronously),
  // then call the setters with plain values or pure functional updates.
  const goPrev = useCallback(() => {
    const undone = engine.undoMove()
    if (!undone) return
    const nextStack = [...redoStackRef.current, undone]
    redoStackRef.current = nextStack
    setRedoStack(nextStack)
    const newHistory = engine.getHistory()
    setDisplayedMove(
      newHistory.length > 0
        ? { from: newHistory[newHistory.length - 1].from, to: newHistory[newHistory.length - 1].to }
        : null
    )
    setSelectedSquare(null)
    syncState()
  }, [engine, syncState])

  const goNext = useCallback(() => {
    const current = redoStackRef.current
    if (current.length === 0) return
    const next = current[current.length - 1]
    const move = engine.makeMove({
      from: next.from,
      to: next.to,
      promotion: next.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
    })
    if (!move) return
    const nextStack = current.slice(0, -1)
    redoStackRef.current = nextStack
    setRedoStack(nextStack)
    setDisplayedMove({ from: move.from, to: move.to })
    setSelectedSquare(null)
    syncState()
  }, [engine, syncState])

  const goFirst = useCallback(() => {
    if (engine.getHistory().length === 0) return
    const newlyUndone: Move[] = []
    let undone = engine.undoMove()
    while (undone) {
      newlyUndone.push(undone)
      undone = engine.undoMove()
    }
    // Mirror-ref must be updated synchronously alongside React state.
    const nextStack = [...redoStackRef.current, ...newlyUndone]
    redoStackRef.current = nextStack
    setRedoStack(nextStack)
    setDisplayedMove(null)
    setSelectedSquare(null)
    syncState()
  }, [engine, syncState])

  const goLast = useCallback(() => {
    const current = redoStackRef.current
    if (current.length === 0) return
    // Apply engine mutations synchronously, BEFORE any setState call.
    const reversed = [...current].reverse()
    let lastMove: Move | null = null
    for (const m of reversed) {
      const made = engine.makeMove({
        from: m.from,
        to: m.to,
        promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      })
      if (made) lastMove = made
    }
    redoStackRef.current = []
    setRedoStack([])
    if (lastMove) setDisplayedMove({ from: lastMove.from, to: lastMove.to })
    setSelectedSquare(null)
    syncState()
  }, [engine, syncState])

  const goToPly = useCallback(
    (targetPly: number) => {
      const currentPly = engine.getHistory().length
      const totalPly = currentPly + redoStackRef.current.length
      if (targetPly < 0 || targetPly > totalPly || targetPly === currentPly) return

      if (targetPly < currentPly) {
        // Walk back: pop moves from engine and push onto redoStack.
        const stepsBack = currentPly - targetPly
        const popped: Move[] = []
        for (let i = 0; i < stepsBack; i++) {
          const undone = engine.undoMove()
          if (undone) popped.push(undone)
        }
        const newHistory = engine.getHistory()
        const nextStack = [...redoStackRef.current, ...popped]
        redoStackRef.current = nextStack
        setRedoStack(nextStack)
        setDisplayedMove(
          newHistory.length > 0
            ? {
                from: newHistory[newHistory.length - 1].from,
                to: newHistory[newHistory.length - 1].to,
              }
            : null
        )
      } else {
        // Walk forward: pop from redoStack and apply to engine — synchronously,
        // BEFORE the setState calls.
        const stepsForward = targetPly - currentPly
        const remaining = [...redoStackRef.current]
        let lastMove: Move | null = null
        for (let i = 0; i < stepsForward && remaining.length > 0; i++) {
          const m = remaining.pop()!
          const made = engine.makeMove({
            from: m.from,
            to: m.to,
            promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
          })
          if (made) lastMove = made
        }
        redoStackRef.current = remaining
        setRedoStack(remaining)
        if (lastMove) setDisplayedMove({ from: lastMove.from, to: lastMove.to })
      }
      setSelectedSquare(null)
      syncState()
    },
    [engine, syncState]
  )

  const reset = useCallback(() => {
    engine.reset()
    setDisplayedMove(null)
    setSelectedSquare(null)
    syncState()
  }, [engine, syncState])

  const loadFEN = useCallback(
    (newFEN: string): boolean => {
      const success = engine.loadFEN(newFEN)
      if (success) {
        setDisplayedMove(null)
        setSelectedSquare(null)
        syncState()
      }
      return success
    },
    [engine, syncState]
  )

  const loadPGN = useCallback(
    (pgn: string): boolean => {
      const success = engine.loadPGN(pgn)
      if (success) {
        const newHistory = engine.getHistory()
        if (newHistory.length > 0) {
          const lastMoveInHistory = newHistory[newHistory.length - 1]
          setDisplayedMove({ from: lastMoveInHistory.from, to: lastMoveInHistory.to })
        } else {
          setDisplayedMove(null)
        }
        setSelectedSquare(null)
        syncState()
      }
      return success
    },
    [engine, syncState]
  )

  // Board interaction handlers
  const onPieceDrop = useCallback(
    (source: Square, target: Square, piece: string): boolean => {
      // Check for pawn promotion
      const isPawnPromotion =
        piece.toLowerCase().includes('p') &&
        ((piece[0] === 'w' && target[1] === '8') || (piece[0] === 'b' && target[1] === '1'))

      // For now, auto-promote to queen
      const promotion = isPawnPromotion ? 'q' : undefined

      return makeMove(source, target, promotion)
    },
    [makeMove]
  )

  const onSquareClick = useCallback(
    (square: Square) => {
      // If we already have a selected square, try to move there
      if (selectedSquare) {
        if (selectedSquare === square) {
          // Clicking the same square deselects
          setSelectedSquare(null)
          return
        }

        // Try to make the move
        const piece = engine.getPieceAt(selectedSquare)
        if (piece) {
          // Check for pawn promotion
          const isPawnPromotion =
            piece.type === 'p' &&
            ((piece.color === 'w' && square[1] === '8') ||
              (piece.color === 'b' && square[1] === '1'))

          const promotion = isPawnPromotion ? 'q' : undefined
          const success = makeMove(selectedSquare, square, promotion)

          if (success) {
            return
          }
        }
      }

      // Select the square if it has a piece of the current turn
      const piece = engine.getPieceAt(square)
      if (piece && piece.color === engine.getTurn()) {
        setSelectedSquare(square)
      } else {
        setSelectedSquare(null)
      }
    },
    [selectedSquare, makeMove, engine]
  )

  const onPieceDragBegin = useCallback((_piece: string, sourceSquare: Square) => {
    setSelectedSquare(sourceSquare)
  }, [])

  const onPieceDragEnd = useCallback(() => {
    // Don't clear selection on drag end - let onPieceDrop handle it
  }, [])

  const displayedPly = history.length
  const canGoBack = history.length > 0
  const canGoForward = redoStack.length > 0

  return {
    fen,
    gameState,
    history,
    displayedMove,
    selectedSquare,
    legalMoves,
    displayedPly,
    canGoBack,
    canGoForward,
    makeMove,
    selectSquare,
    undoMove,
    reset,
    loadFEN,
    loadPGN,
    goPrev,
    goNext,
    goFirst,
    goLast,
    goToPly,
    onPieceDrop,
    onSquareClick,
    onPieceDragBegin,
    onPieceDragEnd,
  }
}
