import { describe, it, expect } from 'vitest'
import { ALL_SQUARES } from '../../src/modules/threat-analyzer'

describe('ALL_SQUARES', () => {
  it('contains all 64 squares in a8..h1 reading order', () => {
    expect(ALL_SQUARES).toHaveLength(64)
    expect(ALL_SQUARES[0]).toBe('a8')
    expect(ALL_SQUARES[7]).toBe('h8')
    expect(ALL_SQUARES[8]).toBe('a7')
    expect(ALL_SQUARES[63]).toBe('h1')
    expect(new Set(ALL_SQUARES).size).toBe(64) // no duplicates
  })
})
