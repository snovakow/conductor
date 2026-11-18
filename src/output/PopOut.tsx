import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useChanges } from '../changes.ts'
import { StreamView } from '../sources/StreamView.tsx'
import type { Output } from './output.ts'
import type { Recorder } from './recorder.ts'

// The pop-out's page, with a doctype so it lays out as this one does, and its own styles, as this page's don't reach it
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Conductor output</title>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background-color: black; }
      .picture { display: block; width: 100%; height: 100%; }
      .record { position: fixed; top: 8px; left: 8px; font: 13px system-ui, sans-serif; }
      .record.on { color: #d00; font-weight: bold; }
    </style>
  </head>
  <body></body>
</html>`

interface PopOutProps {
  output: Output
  recorder: Recorder
}

// Opens the output in a window of its own, as large as it's made, with Record to save it. It's drawn from here, so it
// shows what goes out while this window works on it. Pop out again brings the window forward. Closing it, or leaving
// this page, which closes it too, puts it away, and stops and saves a recording it was making
export function PopOut({ output, recorder }: PopOutProps) {
  const [popup, setPopup] = useState<Window | null>(null)

  // Opened from the click itself, as a browser opens windows only for one
  const open = () => {
    if (popup && !popup.closed) {
      popup.focus()
      return
    }
    const opened = window.open('', 'conductor-output', 'popup,width=960,height=600')
    if (!opened) return
    opened.document.open()
    opened.document.write(PAGE)
    opened.document.close()
    setPopup(opened)
  }

  useEffect(() => {
    if (!popup) return undefined
    const closed = () => {
      recorder.stop()
      setPopup(null)
    }
    const leave = () => popup.close()
    popup.addEventListener('pagehide', closed)
    window.addEventListener('pagehide', leave)
    return () => {
      popup.removeEventListener('pagehide', closed)
      window.removeEventListener('pagehide', leave)
    }
  }, [popup, recorder])

  return (
    <>
      <button type="button" onClick={open}>
        Pop out
      </button>
      {popup && createPortal(<OutputWindow output={output} recorder={recorder} />, popup.document.body)}
    </>
  )
}

// What's in the pop-out: the output, and the button that records it
function OutputWindow({ output, recorder }: PopOutProps) {
  useChanges(recorder)
  const { recording } = recorder
  return (
    <>
      <StreamView stream={output} className="picture" />
      <button
        type="button"
        className={recording ? 'record on' : 'record'}
        onClick={() => (recording ? recorder.stop() : recorder.start())}
      >
        {recording ? 'Stop' : 'Record'}
      </button>
    </>
  )
}
