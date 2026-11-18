import { Changes } from '../changes.ts'
import type { Source } from '../sources/source.ts'
import type { Stream } from '../stream.ts'
import { onTick } from '../ticker.ts'

// The whiteboard's own size, which it's drawn at whatever size it's shown, and which it streams at
export const BOARD_WIDTH = 1024
export const BOARD_HEIGHT = 1024

// How a layer is placed when it's added or Shift+clicked: at its own size, fitted inside the board, filling it, or at
// half that size in half of it, the first half or the second, across its longer side
export const PLACE_MODES = 5

export interface Point {
  x: number
  y: number
}

let count = 0

// A source placed on the whiteboard. It draws the source as the source is now, prepared or not, so changes made to the
// source in the inspector show wherever it's placed. Its position is its centre's, from the board's centre, in the
// board's pixels, and its scale is of the source's own size
export class Layer {
  readonly id: string
  readonly source: Source
  placeMode = 0
  scale = 1
  readonly position: Point = { x: 0, y: 0 }

  constructor(source: Source) {
    count += 1
    this.id = `layer-${count}`
    this.source = source
  }

  get width() {
    return this.source.width * this.scale
  }

  get height() {
    return this.source.height * this.scale
  }

  get left() {
    return this.position.x - this.width / 2 + BOARD_WIDTH / 2
  }

  get top() {
    return this.position.y - this.height / 2 + BOARD_HEIGHT / 2
  }

  draw(context: CanvasRenderingContext2D) {
    const surface = this.source.surface
    if (!surface || !this.width || !this.height) return
    context.drawImage(surface, this.left, this.top, this.width, this.height)
  }

  // Whether the point, in the board's pixels, is over the layer's box
  contains({ x, y }: Point) {
    return x >= this.left && y >= this.top && x <= this.left + this.width && y <= this.top + this.height
  }

  // Back to the centre at the mode's size, and for the halves, a quarter of the board to one side of it
  setPlaceMode(mode: number) {
    this.placeMode = mode
    this.position.x = 0
    this.position.y = 0
    const { width, height } = this.source
    if (mode === 0 || !width || !height) {
      this.scale = 1
      return
    }
    const boardShape = BOARD_WIDTH / BOARD_HEIGHT
    const wide = width / height > boardShape
    if (mode === 1) this.scale = wide ? BOARD_WIDTH / width : BOARD_HEIGHT / height
    else this.scale = wide ? BOARD_HEIGHT / height : BOARD_WIDTH / width
    if (mode === 3 || mode === 4) {
      this.scale *= 0.5
      const side = mode === 3 ? -0.25 : 0.25
      if (wide) this.position.y = BOARD_HEIGHT * side
      else this.position.x = BOARD_WIDTH * side
    }
  }
}

// A line drawn over the board, in the board's pixels: a dark line with a bright one down its middle
export class Stroke {
  readonly points: Point[] = []

  draw(context: CanvasRenderingContext2D) {
    if (this.points.length === 0) return
    context.save()
    context.beginPath()
    const [start] = this.points
    context.moveTo(start.x, start.y)
    for (const point of this.points) context.lineTo(point.x, point.y)
    context.lineCap = 'round'
    context.strokeStyle = 'rgb(63,63,0)'
    context.lineWidth = 7
    context.stroke()
    context.strokeStyle = 'rgb(0,255,0)'
    context.lineWidth = 3
    context.stroke()
    context.restore()
  }
}

// The whiteboard: sources placed over black, with lines drawn over them, drawn every tick into its own canvas,
// which is what it streams. The layers are drawn in order, the first at the bottom, and the lines over all of them
export class Whiteboard extends Changes implements Stream {
  readonly name = 'Whiteboard'
  readonly width = BOARD_WIDTH
  readonly height = BOARD_HEIGHT
  readonly canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D | null
  #items: (Layer | Stroke)[] = []

  constructor() {
    super()
    this.canvas = document.createElement('canvas')
    this.canvas.width = BOARD_WIDTH
    this.canvas.height = BOARD_HEIGHT
    this.#context = this.canvas.getContext('2d')
  }

  get surface() {
    return this.canvas
  }

  // Bottom to top
  get layers(): Layer[] {
    return this.#items.filter((item) => item instanceof Layer)
  }

  // Draws the board every tick, until the returned function is called
  start() {
    return onTick('board', () => this.draw())
  }

  draw() {
    const context = this.#context
    if (!context) return
    context.fillStyle = 'rgb(0,0,0)'
    context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
    for (const item of this.#items) item.draw(context)
  }

  // The source on top of the other layers, under the lines, fitted inside the board
  add(source: Source) {
    const layer = new Layer(source)
    layer.setPlaceMode(1)
    this.#insert(layer)
    this.changed()
    return layer
  }

  // The layer to the top of the layers
  raise(layer: Layer) {
    const index = this.#items.indexOf(layer)
    if (index < 0) return
    this.#items.splice(index, 1)
    this.#insert(layer)
    this.changed()
  }

  remove(layer: Layer) {
    const index = this.#items.indexOf(layer)
    if (index < 0) return
    this.#items.splice(index, 1)
    this.changed()
  }

  // Every layer of the source, as it leaves the library
  removeSource(source: Source) {
    const before = this.#items.length
    this.#items = this.#items.filter((item) => !(item instanceof Layer && item.source === source))
    if (this.#items.length !== before) this.changed()
  }

  // The topmost layer under the point, in the board's pixels
  layerAt(point: Point) {
    for (let i = this.#items.length - 1; i >= 0; i--) {
      const item = this.#items[i]
      if (item instanceof Layer && item.contains(point)) return item
    }
    return null
  }

  // A new line over everything, starting at the point
  beginStroke(point: Point) {
    const stroke = new Stroke()
    stroke.points.push(point)
    this.#items.push(stroke)
    return stroke
  }

  // Under the first line
  #insert(layer: Layer) {
    const index = this.#items.findIndex((item) => item instanceof Stroke)
    this.#items.splice(index < 0 ? this.#items.length : index, 0, layer)
  }
}
