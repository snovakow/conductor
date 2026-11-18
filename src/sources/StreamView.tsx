import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { Stream } from '../stream.ts'
import { drawContained } from '../stream.ts'
import { onTick } from '../ticker.ts'

interface StreamViewProps {
  stream: Stream
  className?: string
  // Whether the view takes the stream's shape, so the picture fills it, for the tools that work on the picture by where
  // they are in its box. Otherwise the picture is fitted into whatever box the stylesheet gives the view
  shaped?: boolean
  onClick?: (event: MouseEvent<HTMLCanvasElement>) => void
}

// A stream on screen: a canvas with as many pixels as the screen has under it, which copies the stream every tick. It
// draws nothing while it has no size, as it has while hidden. It measures itself with its own window's observer, as it
// may be in the pop-out's
export function StreamView({ stream, className, shaped = false, onClick }: StreamViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return undefined
    const view = element.ownerDocument.defaultView ?? window

    let width = 0
    let height = 0
    const observer = new view.ResizeObserver(([entry]) => {
      const box = entry.devicePixelContentBoxSize?.[0]
      if (box) {
        width = box.inlineSize
        height = box.blockSize
      } else {
        width = Math.round(entry.contentRect.width * view.devicePixelRatio)
        height = Math.round(entry.contentRect.height * view.devicePixelRatio)
      }
    })
    try {
      observer.observe(element, { box: 'device-pixel-content-box' })
    } catch {
      observer.observe(element)
    }

    let aspect = 0
    const stop = onTick('view', () => {
      if (shaped) {
        const shape = stream.width && stream.height ? stream.width / stream.height : 0
        if (shape !== aspect) {
          aspect = shape
          element.style.aspectRatio = shape ? String(shape) : ''
        }
      }
      if (!width || !height) return
      if (element.width !== width || element.height !== height) {
        element.width = width
        element.height = height
      }
      drawContained(context, stream)
    })
    return () => {
      stop()
      observer.disconnect()
    }
  }, [stream, shaped])

  return <canvas ref={canvas} className={className} onClick={onClick} />
}
