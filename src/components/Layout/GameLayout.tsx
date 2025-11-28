import type { GameLayoutProps } from './types'

export function GameLayout({ children, header, sidebar, footer }: GameLayoutProps) {
  return (
    <div
      data-testid="game-layout"
      className="flex flex-col min-h-screen bg-gray-900 text-white"
    >
      {header && (
        <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
          {header}
        </header>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        <main
          data-testid="main-content"
          className="flex-1 flex items-center justify-center p-4"
        >
          {children}
        </main>

        {sidebar && (
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 bg-gray-800 p-4 lg:border-l border-gray-700">
            {sidebar}
          </aside>
        )}
      </div>

      {footer && (
        <footer className="flex-shrink-0 bg-gray-800 border-t border-gray-700">
          {footer}
        </footer>
      )}
    </div>
  )
}
