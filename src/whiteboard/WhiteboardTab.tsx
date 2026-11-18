import { useEffect, useRef } from 'react'
import { Layers } from './Layers.tsx'
import { BOARD_HEIGHT, BOARD_WIDTH, PLACE_MODES } from './whiteboard.ts'
import type { Layer, Point, Stroke, Whiteboard } from './whiteboard.ts'

// How much a drag with Ctrl held grows or shrinks a layer, per screen pixel it moves
const SCALING = 0.003

// The whiteboard's own canvas, shown as large as fits up to its own size, and the layers on it down the right. On the
// board, a drag moves the layer under the pointer, and with Ctrl held, scales it about its centre: up as the pointer
// goes right or up, down as it goes left or down. Shift+click fits the layer the next of the five ways. A drag with the
// right button draws a line. The canvas is the whiteboard's, so it's drawn whether this is open or not
export function WhiteboardTab({ whiteboard }: { whiteboard: Whiteboard }) {
  const board = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = board.current
    if (!host) return undefined
    const canvas = whiteboard.canvas
    host.append(canvas)

    // Where the pointer is, in the board's pixels, and how many of them a screen pixel is
    const locate = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((event.clientX - rect.left) * BOARD_WIDTH) / rect.width,
        y: ((event.clientY - rect.top) * BOARD_HEIGHT) / rect.height,
      }
    }

    let drag: { pointer: number; layer: Layer; x: number; y: number } | null = null
    let line: { pointer: number; stroke: Stroke } | null = null

    const press = (event: PointerEvent) => {
      if (drag || line) return
      if (event.button === 2) {
        line = { pointer: event.pointerId, stroke: whiteboard.beginStroke(locate(event)) }
      } else if (event.button === 0) {
        const layer = whiteboard.layerAt(locate(event))
        if (!layer) return
        if (event.shiftKey) {
          layer.setPlaceMode((layer.placeMode + 1) % PLACE_MODES)
          return
        }
        drag = { pointer: event.pointerId, layer, x: event.clientX, y: event.clientY }
      } else {
        return
      }
      canvas.setPointerCapture(event.pointerId)
    }

    const move = (event: PointerEvent) => {
      if (line?.pointer === event.pointerId) line.stroke.points.push(locate(event))
      if (drag?.pointer !== event.pointerId) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      drag.x = event.clientX
      drag.y = event.clientY
      const { layer } = drag
      if (event.ctrlKey) {
        const factor = 1 + Math.hypot(dx, dy) * SCALING
        layer.scale = dx - dy > 0 ? layer.scale * factor : layer.scale / factor
      } else {
        const rect = canvas.getBoundingClientRect()
        layer.position.x += (dx * BOARD_WIDTH) / rect.width
        layer.position.y += (dy * BOARD_HEIGHT) / rect.height
      }
    }

    const release = (event: PointerEvent) => {
      if (drag?.pointer === event.pointerId) drag = null
      if (line?.pointer === event.pointerId) line = null
    }

    // The right button draws, so it doesn't open the menu
    const menu = (event: Event) => event.preventDefault()

    canvas.addEventListener('pointerdown', press)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', release)
    canvas.addEventListener('pointercancel', release)
    canvas.addEventListener('lostpointercapture', release)
    canvas.addEventListener('contextmenu', menu)
    return () => {
      canvas.removeEventListener('pointerdown', press)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', release)
      canvas.removeEventListener('pointercancel', release)
      canvas.removeEventListener('lostpointercapture', release)
      canvas.removeEventListener('contextmenu', menu)
      canvas.remove()
    }
  }, [whiteboard])

  return (
    <div className="whiteboard">
      <div ref={board} className="board" />
      <Layers whiteboard={whiteboard} />
    </div>
  )
}
