import { Changes } from '../changes.ts'
import { applySettings, createUniforms, DEFAULT_SETTINGS } from '../greenscreen/chromaKey.ts'
import type { ChromaKeyUniforms, Settings } from '../greenscreen/chromaKey.ts'
import type { Stream } from '../stream.ts'

// Where a source's picture comes from. Cameras and screens are live streams; videos and images are files
export type SourceKind = 'camera' | 'screen' | 'video' | 'image'

export type SourceElement = HTMLVideoElement | HTMLImageElement

let count = 0

// The cutout's corners at first: the picture's own, clockwise from the top left
const WHOLE = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const

// One picture in the library, and how it's prepared before it's used: keyed, mirrored, cut, its colour changed. It
// plays in an element of its own that's never put on the page, so it plays on whatever shows it, and everything on
// screen is a copy of it. Untouched, it's the picture as it comes. Once its settings are changed, it's prepared, and
// its surface is the prepared picture, which the Greenscreen component draws into processed. It stays prepared until
// it's reset, so a setting moved back to where it started doesn't take the picture away to start again
export class Source extends Changes implements Stream {
  readonly id: string
  readonly kind: SourceKind
  readonly element: SourceElement
  // The camera's id, so a camera that's open isn't opened again
  readonly deviceId: string | null
  readonly settings: Settings = { ...DEFAULT_SETTINGS }
  readonly uniforms: ChromaKeyUniforms = createUniforms()
  // The prepared picture, as Greenscreen last drew it, and whether it's there to show: false until Greenscreen has
  // drawn a frame, and again once it's gone
  readonly processed: HTMLCanvasElement = document.createElement('canvas')
  live = false
  // Counts the changes to the settings, so Greenscreen can tell when to draw a picture that hasn't changed again
  revision = 0

  // What raw shows: the picture as it comes, for the tools that work on it to read and draw over
  readonly raw: Stream

  #name: string
  #prepared = false
  #flip = false
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

  get surface(): CanvasImageSource | null {
    return this.#prepared && this.live ? this.processed : this.frame
  }

  get prepared() {
    return this.#prepared
  }

  get stream() {
    return this.#stream
  }

  // The settings into the shader, after something has changed them. The first change prepares the source, and Flip
  // tells whatever shows the plane, as it isn't a uniform
  update() {
    applySettings(this.uniforms, this.settings)
    this.revision += 1
    const flip = this.settings.flip
    if (!this.#prepared || flip !== this.#flip) {
      this.#prepared = true
      this.#flip = flip
      this.changed()
    }
  }

  // Back to the picture as it comes, with the cutout's corners back on its own
  reset() {
    Object.assign(this.settings, DEFAULT_SETTINGS)
    this.uniforms.crop.value.forEach((corner, i) => corner.set(WHOLE[i][0], WHOLE[i][1]))
    applySettings(this.uniforms, this.settings)
    this.revision += 1
    this.#flip = false
    this.#prepared = false
    this.live = false
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

  // Stops it for good: a stream's tracks stop, freeing the camera, and a file's object URL goes
  dispose() {
    this.#ended = null
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
    this.live = false
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
