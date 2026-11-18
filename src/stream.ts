// A picture that changes over time, which anything can show without knowing where it comes from: a camera, a file, a
// keyed source, the whiteboard, the output. Whatever shows one draws its surface each tick, at the size it chooses
export interface Stream {
  readonly name: string
  // What to draw now: something with a frame in it and a size. Null while there's nothing to draw yet
  readonly surface: CanvasImageSource | null
  // The picture's own size in pixels, 0 until it has one
  readonly width: number
  readonly height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// The largest rectangle of the picture's shape that fits the box, centred in it
export function contain(width: number, height: number, boxWidth: number, boxHeight: number): Rect {
  const scale = Math.min(boxWidth / width, boxHeight / height)
  const w = width * scale
  const h = height * scale
  return { x: (boxWidth - w) / 2, y: (boxHeight - h) / 2, width: w, height: h }
}

// The stream fitted into the whole of the context's canvas, which is cleared first. Nothing is drawn while the stream
// has nothing to draw. Returns whether it drew
export function drawContained(context: CanvasRenderingContext2D, stream: Stream) {
  const { canvas } = context
  context.clearRect(0, 0, canvas.width, canvas.height)
  const { surface, width, height } = stream
  if (!surface || !width || !height || !canvas.width || !canvas.height) return false
  const { x, y, width: w, height: h } = contain(width, height, canvas.width, canvas.height)
  context.drawImage(surface, x, y, w, h)
  return true
}
