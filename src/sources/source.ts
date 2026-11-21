import { Greenscreen } from '@snovakow/greenscreen'
import type { Point } from '@snovakow/greenscreen'
import { Changes } from '../changes.ts'
import { DEFAULT_SETTINGS, keyerSettings } from '../greenscreen/settings.ts'
import type { Settings } from '../greenscreen/settings.ts'
import type { Stream } from '../stream.ts'

// Where a source's picture comes from. Cameras and screens are live streams; videos and images are files
export type SourceKind = 'camera' | 'screen' | 'video' | 'image'

export type SourceElement = HTMLVideoElement | HTMLImageElement

let count = 0

// The cut's corners at first: the picture's own, clockwise from the top left
const WHOLE: readonly Readonly<Point>[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

// One picture in the library, and how it's prepared before it's used: keyed, mirrored, cut, its colour changed. It
// plays in an element of its own that's never put on the page, so it plays on whatever shows it, and everything on
// screen is a copy of it. Untouched, it's the picture as it comes. Once its settings are changed, it's prepared: it has
// a greenscreen of its own, a keyer that draws the prepared picture into its canvas on the ticker, and its surface is
// that canvas once there's a picture in it. It stays prepared until it's reset, so a setting moved back to where it
// started doesn't take the picture away to start again
export class Source extends Changes implements Stream {
  readonly id: string
  readonly kind: SourceKind
  readonly element: SourceElement
  // The camera's id, so a camera that's open isn't opened again
  readonly deviceId: string | null
  // What the panel edits, kept here, so a source opened again is as it was left
  readonly settings: Settings = { ...DEFAULT_SETTINGS }
  // The cut's corners, in the picture's coordinates with y down, which the preview's handles move in place. The keyer
  // keeps a copy of its own, which moveCorners brings up to date
  readonly corners: Point[] = WHOLE.map((corner) => ({ ...corner }))

  // What raw shows: the picture as it comes, for the tools that work on it to read and draw over
  readonly raw: Stream

  #name: string
  #keyer: Greenscreen | null = null
  #stream: MediaStream | null
  #url: string | null
  #ended: (() => void) | null = null

  constructor(kind: SourceKind, name: string, element: SourceElement, options: SourceOptions = {}) {
    super()
    count += 1
    this.id = `source-${count}`
    this.kind = kind
    this.#name = name
    this.element = element
    this.deviceId = options.deviceId ?? null
    this.#stream = options.stream ?? null
    this.#url = options.url ?? null
    this.raw = new RawPicture(this)
  }

  get name() {
    return this.#name
  }

  get width() {
    const element = this.element
    return element instanceof HTMLVideoElement ? element.videoWidth : element.naturalWidth
  }

  get height() {
    const element = this.element
    return element instanceof HTMLVideoElement ? element.videoHeight : element.naturalHeight
  }

  // The element, once it has a frame to draw
  get frame(): SourceElement | null {
    const element = this.element
    if (element instanceof HTMLVideoElement) {
      return element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && element.videoWidth ? element : null
    }
    return element.complete && element.naturalWidth ? element : null
  }

  // The prepared picture once the keyer has drawn one, and until then, while its context is lost, or while it can't key
  // the picture, the picture as it comes
  get surface(): CanvasImageSource | null {
    const keyer = this.#keyer
    return keyer?.ready ? keyer.canvas : this.frame
  }

  get prepared() {
    return this.#keyer !== null
  }

  get stream() {
    return this.#stream
  }

  // The settings to the keyer, after something has changed them. The first change prepares the source, with a keyer
  // made for it from the settings and the corners as they are. A picture it can't key, such as one larger than the
  // GPU's textures, is an error, as the app's others are
  update() {
    const settings = keyerSettings(this.settings)
    if (this.#keyer) {
      this.#keyer.set(settings)
      return
    }
    this.#keyer = new Greenscreen(this.element, {
      settings: { ...settings, corners: this.corners },
      onError: (error) => console.error(error),
    })
    this.changed()
  }

  // The corners to the keyer, after the handles have moved them. It copies them, so a move it hasn't been told of
  // changes nothing
  moveCorners() {
    this.#keyer?.set({ corners: this.corners })
  }

  // Draws the prepared picture, when there's something new to draw: a frame, a setting, a corner. It's called first in
  // every tick, so whatever draws from the source that tick draws its newest picture
  render() {
    this.#keyer?.render()
  }

  // Back to the picture as it comes, with the cut's corners back on its own, and the keyer gone
  reset() {
    Object.assign(this.settings, DEFAULT_SETTINGS)
    this.corners.forEach((corner, i) => Object.assign(corner, WHOLE[i]))
    this.#keyer?.dispose()
    this.#keyer = null
    this.changed()
  }

  // Called when the stream it plays ends, as a screen does when its sharing is stopped
  onEnded(ended: () => void) {
    this.#ended = ended
  }

  // Plays the element, and resolves once it has a size. A camera tells its new size when it changes it
  async start() {
    const element = this.element
    if (element instanceof HTMLImageElement) {
      await element.decode()
      return
    }
    element.addEventListener('resize', () => this.changed())
    for (const track of this.#stream?.getTracks() ?? []) track.addEventListener('ended', () => this.#ended?.())
    if (element.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve, reject) => {
        element.addEventListener('loadedmetadata', () => resolve(), { once: true })
        element.addEventListener('error', () => reject(element.error ?? new Error(`${this.name} can't be played`)), {
          once: true,
        })
      })
    }
    await element.play()
  }

  // Stops it for good: its keyer frees what it holds on the GPU, a stream's tracks stop, freeing the camera, and a
  // file's object URL goes
  dispose() {
    this.#ended = null
    this.#keyer?.dispose()
    this.#keyer = null
    for (const track of this.#stream?.getTracks() ?? []) track.stop()
    const element = this.element
    if (element instanceof HTMLVideoElement) {
      element.pause()
      element.srcObject = null
      element.removeAttribute('src')
      element.load()
    }
    if (this.#url) URL.revokeObjectURL(this.#url)
    this.#url = null
  }
}

// A source's picture as it comes, whatever its settings
class RawPicture implements Stream {
  #source: Source

  constructor(source: Source) {
    this.#source = source
  }

  get name() {
    return this.#source.name
  }

  get surface() {
    return this.#source.frame
  }

  get width() {
    return this.#source.width
  }

  get height() {
    return this.#source.height
  }
}

interface SourceOptions {
  deviceId?: string
  stream?: MediaStream
  url?: string
}

// A video element to play a source in, muted, and looping if it's a file
export function createVideo(options: { stream?: MediaStream; url?: string }) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  if (options.stream) video.srcObject = options.stream
  if (options.url) {
    video.loop = true
    video.src = options.url
  }
  return video
}
