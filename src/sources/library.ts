import { Changes } from '../changes.ts'
import { onTick } from '../ticker.ts'
import { createVideo, Source } from './source.ts'
import type { SourceKind } from './source.ts'

// The library's three lists, which Media Assets shows one at a time
export type Category = 'cameras' | 'files' | 'screens'

export const CATEGORIES: { category: Category; label: string }[] = [
  { category: 'cameras', label: 'Video Sources' },
  { category: 'files', label: 'Files' },
  { category: 'screens', label: 'Screens' },
]

export function categoryOf(kind: SourceKind): Category {
  if (kind === 'camera') return 'cameras'
  if (kind === 'screen') return 'screens'
  return 'files'
}

// Every source there is to use: each camera, opened at the start so its row plays live, the files loaded, and the
// screens shared. A source stays until it's removed, or its stream ends, which takes it off everything using it. While
// it's started, the prepared sources are keyed on the ticker
export class Library extends Changes {
  #sources: Source[] = []
  #removed = new Set<(source: Source) => void>()
  // Bumped by stop, so cameras still opening when the library stops are stopped as they arrive
  #generation = 0
  #stopKeying: (() => void) | null = null

  get sources(): readonly Source[] {
    return this.#sources
  }

  in(category: Category) {
    return this.#sources.filter((source) => categoryOf(source.kind) === category)
  }

  // Calls removed with each source as it goes
  onRemove(removed: (source: Source) => void) {
    this.#removed.add(removed)
    return () => {
      this.#removed.delete(removed)
    }
  }

  // Each prepared source keyed in the tick's first phase, so the whiteboard, the output and the views all draw the
  // picture keyed in the same tick, whichever clock is driving it
  start() {
    this.#stopKeying ??= onTick('process', () => {
      for (const source of this.#sources) source.render()
    })
    void this.openCameras()
  }

  stop() {
    this.#stopKeying?.()
    this.#stopKeying = null
    this.#generation += 1
    const sources = this.#sources
    this.#sources = []
    for (const source of sources) source.dispose()
    this.changed()
  }

  // Asks for the camera, which asks for permission the first time, then opens every camera there is that isn't open
  // already, each in its own stream. Resolves with the cameras it opened
  async openCameras() {
    const generation = this.#generation
    const current = () => generation === this.#generation
    const opened: Source[] = []

    let first: MediaStream
    try {
      first = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
    } catch (error) {
      console.error(error)
      return opened
    }
    if (!current()) {
      stopStream(first)
      return opened
    }
    const firstId = first.getVideoTracks()[0]?.getSettings().deviceId ?? ''

    const devices = await navigator.mediaDevices.enumerateDevices().catch((error: unknown) => {
      console.error(error)
      return []
    })
    const cameras = devices
      .filter((device) => device.kind === 'videoinput' && device.deviceId !== 'default')
      .map(({ deviceId, label }) => ({ deviceId, label }))
    // The camera given first is used even if it isn't listed
    if (!cameras.some((device) => device.deviceId === firstId)) cameras.unshift({ deviceId: firstId, label: '' })

    let firstUsed = false
    for (const [index, device] of cameras.entries()) {
      if (!current()) break
      if (this.#sources.some((source) => source.deviceId === device.deviceId)) continue
      let stream: MediaStream
      if (device.deviceId === firstId) {
        stream = first
        firstUsed = true
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: device.deviceId } },
          })
        } catch (error) {
          console.error(error)
          continue
        }
      }
      const name = device.label || `Camera ${index + 1}`
      const source = new Source('camera', name, createVideo({ stream }), { stream, deviceId: device.deviceId })
      if (await this.#add(source, current)) opened.push(source)
    }
    if (!firstUsed) stopStream(first)
    return opened
  }

  // Each image and video file as a source, in the order given. Resolves with those that loaded
  async addFiles(files: Iterable<File>) {
    const generation = this.#generation
    const current = () => generation === this.#generation
    const added: Source[] = []
    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      if (!isImage && !file.type.startsWith('video/')) continue
      const url = URL.createObjectURL(file)
      let element
      if (isImage) {
        element = new Image()
        element.src = url
      } else {
        element = createVideo({ url })
      }
      const source = new Source(isImage ? 'image' : 'video', file.name, element, { url })
      if (await this.#add(source, current)) added.push(source)
    }
    return added
  }

  // A screen, window or tab, as the browser offers them to share. Null if none is chosen
  async addScreen() {
    const generation = this.#generation
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ audio: false, video: true })
    } catch (error) {
      console.error(error)
      return null
    }
    const source = new Source('screen', 'Screen', createVideo({ stream }), { stream })
    return (await this.#add(source, () => generation === this.#generation)) ? source : null
  }

  remove(source: Source) {
    const index = this.#sources.indexOf(source)
    if (index < 0) return
    this.#sources.splice(index, 1)
    source.dispose()
    for (const removed of this.#removed) removed(source)
    this.changed()
  }

  // Into the library once it has a size, the cameras in order of name, and everything else after what's there. The
  // library's own changes include each source's, so whatever shows a source's shape follows it
  async #add(source: Source, current: () => boolean) {
    try {
      await source.start()
    } catch (error) {
      console.error(error)
      source.dispose()
      return false
    }
    if (!current()) {
      source.dispose()
      return false
    }
    source.onEnded(() => this.remove(source))
    source.subscribe(() => this.changed())

    let index = this.#sources.length
    if (source.kind === 'camera') {
      index = this.#sources.findIndex(
        (other) =>
          other.kind === 'camera' && source.name.localeCompare(other.name, undefined, { sensitivity: 'base' }) <= 0,
      )
      if (index < 0) index = this.#sources.length
    }
    this.#sources.splice(index, 0, source)
    this.changed()
    return true
  }
}

function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop()
}
