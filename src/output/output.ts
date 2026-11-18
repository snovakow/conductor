import { Changes } from '../changes.ts'
import type { Stream } from '../stream.ts'
import { contain } from '../stream.ts'
import { onTick } from '../ticker.ts'

// Video encoders want even sizes
const even = (size: number) => Math.ceil(size / 2) * 2

// What goes out: whichever one stream is routed to it, the whiteboard or any single source, drawn every tick over
// black into a canvas of its own at the stream's size. Its media stream is that canvas's, so it's the same stream
// whatever is routed, for whatever takes it. Its size is held while it's recorded, so a recording keeps one size
export class Output extends Changes implements Stream {
  readonly name = 'Output'
  readonly canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D | null
  #route: Stream
  #held = false
  #stream: MediaStream | null = null

  constructor(route: Stream) {
    super()
    this.#route = route
    this.canvas = document.createElement('canvas')
    this.canvas.width = even(route.width || 2)
    this.canvas.height = even(route.height || 2)
    this.#context = this.canvas.getContext('2d')
  }

  get route() {
    return this.#route
  }

  setRoute(route: Stream) {
    if (route === this.#route) return
    this.#route = route
    this.changed()
  }

  get surface() {
    return this.canvas
  }

  get width() {
    return this.canvas.width
  }

  get height() {
    return this.canvas.height
  }

  // The canvas's stream, made the first time it's asked for
  get stream() {
    this.#stream ??= this.canvas.captureStream()
    return this.#stream
  }

  hold(held: boolean) {
    this.#held = held
  }

  // Draws every tick, until the returned function is called
  start() {
    return onTick('output', () => this.draw())
  }

  draw() {
    const context = this.#context
    if (!context) return
    const { surface, width, height } = this.#route
    const canvas = this.canvas
    if (!this.#held && width && height && (canvas.width !== even(width) || canvas.height !== even(height))) {
      canvas.width = even(width)
      canvas.height = even(height)
    }
    context.fillStyle = 'black'
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (!surface || !width || !height) return
    const { x, y, width: w, height: h } = contain(width, height, canvas.width, canvas.height)
    context.drawImage(surface, x, y, w, h)
  }
}
