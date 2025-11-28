import type { ReactNode } from 'react'

export interface GameLayoutProps {
  children: ReactNode
  header?: ReactNode
  sidebar?: ReactNode
  footer?: ReactNode
}
