import { describe, it, expect } from 'vitest'
import { DEFAULT_BOARD_CONFIG, SQUARE_COLORS, type BoardConfig } from '../../src/components/Board/types'

describe('Board Types and Configuration', () => {
  describe('Default Board Configuration', () => {
    it('should have valid default FEN for starting position', () => {
      expect(DEFAULT_BOARD_CONFIG.position).toBe('start')
    })

    it('should have default orientation as white', () => {
      expect(DEFAULT_BOARD_CONFIG.orientation).toBe('white')
    })

    it('should have drag enabled by default', () => {
      expect(DEFAULT_BOARD_CONFIG.allowDrag).toBe(true)
    })

    it('should have default square colors defined', () => {
      expect(DEFAULT_BOARD_CONFIG.lightSquareColor).toBeDefined()
      expect(DEFAULT_BOARD_CONFIG.darkSquareColor).toBeDefined()
    })

    it('should have animation duration set', () => {
      expect(DEFAULT_BOARD_CONFIG.animationDuration).toBeGreaterThan(0)
    })
  })

  describe('Square Colors', () => {
    it('should have default color scheme', () => {
      expect(SQUARE_COLORS.default).toBeDefined()
      expect(SQUARE_COLORS.default.light).toBeDefined()
      expect(SQUARE_COLORS.default.dark).toBeDefined()
    })

    it('should have green color scheme', () => {
      expect(SQUARE_COLORS.green).toBeDefined()
      expect(SQUARE_COLORS.green.light).toBeDefined()
      expect(SQUARE_COLORS.green.dark).toBeDefined()
    })

    it('should have brown color scheme', () => {
      expect(SQUARE_COLORS.brown).toBeDefined()
      expect(SQUARE_COLORS.brown.light).toBeDefined()
      expect(SQUARE_COLORS.brown.dark).toBeDefined()
    })

    it('should have blue color scheme', () => {
      expect(SQUARE_COLORS.blue).toBeDefined()
      expect(SQUARE_COLORS.blue.light).toBeDefined()
      expect(SQUARE_COLORS.blue.dark).toBeDefined()
    })
  })

  describe('BoardConfig type', () => {
    it('should allow partial configuration', () => {
      const partialConfig: Partial<BoardConfig> = {
        orientation: 'black',
      }
      expect(partialConfig.orientation).toBe('black')
    })

    it('should allow all configuration options', () => {
      const fullConfig: BoardConfig = {
        position: 'start',
        orientation: 'white',
        allowDrag: true,
        lightSquareColor: '#ffffff',
        darkSquareColor: '#000000',
        animationDuration: 200,
        showCoordinates: true,
      }
      expect(fullConfig.position).toBe('start')
      expect(fullConfig.showCoordinates).toBe(true)
    })
  })
})
