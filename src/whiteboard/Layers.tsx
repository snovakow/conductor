import type { MouseEvent } from 'react'
import { useChanges } from '../changes.ts'
import { StreamView } from '../sources/StreamView.tsx'
import type { Layer, Whiteboard } from './whiteboard.ts'

// What's on the whiteboard, from the bottom layer down to the top. A click brings a layer to the top, and Shift+click
// takes it off the board. The source stays in the library either way
export function Layers({ whiteboard }: { whiteboard: Whiteboard }) {
  useChanges(whiteboard)

  const click = (event: MouseEvent<HTMLDivElement>, layer: Layer) => {
    if (event.shiftKey) {
      whiteboard.remove(layer)
      return
    }
    whiteboard.raise(layer)
    // Once it's been moved to the end of the list
    const row = event.currentTarget
    requestAnimationFrame(() => row.scrollIntoView({ block: 'nearest' }))
  }

  return (
    <div className="layers list">
      {whiteboard.layers.map((layer) => (
        <div
          key={layer.id}
          className="row"
          title="Click to bring to the top, Shift+click to take off the board"
          onClick={(event) => click(event, layer)}
        >
          <StreamView stream={layer.source} />
          <span className="name">{layer.source.name}</span>
        </div>
      ))}
    </div>
  )
}
