import { Changes } from '../changes.ts'
import type { Output } from './output.ts'

// The formats tried, best first
const TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
// Enough for the whiteboard's 1024 pixels square to stay sharp
const BITRATE = 8_000_000

// Records the output, and saves it as a WebM file when it stops. It lives in this window, not the pop-out it's worked
// from, so it can still finish and save as the pop-out closes
export class Recorder extends Changes {
  #output: Output
  #recorder: MediaRecorder | null = null

  constructor(output: Output) {
    super()
    this.#output = output
  }

  get recording() {
    return this.#recorder !== null
  }

  start() {
    if (this.#recorder) return
    const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = new MediaRecorder(this.#output.stream, { mimeType, videoBitsPerSecond: BITRATE })
    const chunks: Blob[] = []
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) chunks.push(event.data)
    })
    recorder.addEventListener('stop', () => {
      this.#output.hold(false)
      save(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }))
    })
    this.#output.hold(true)
    recorder.start(1000)
    this.#recorder = recorder
    this.changed()
  }

  stop() {
    const recorder = this.#recorder
    if (!recorder) return
    this.#recorder = null
    if (recorder.state !== 'inactive') recorder.stop()
    this.changed()
  }
}

// Downloads the recording, named for when it was saved
function save(blob: Blob) {
  if (!blob.size) return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ').replaceAll(':', '.')
  link.download = `Conductor ${stamp}.webm`
  link.click()
  // Once the download has had time to take it
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
