import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { useChanges } from '../changes.ts'
import type { Source } from '../sources/source.ts'
import { onTick } from '../ticker.ts'
import type { ScreenUniforms } from './chromaKey.ts'
import { Screen } from './Screen.tsx'

// How many ticks a change is rendered for
const SETTLING = 3

// A source's prepared picture: the source keyed, mirrored, cut and coloured by its settings, drawn into the source's
// processed canvas on the ticker, which is what the source shows from then on. It's drawn at the picture's own size,
// whatever shows it, into a canvas that isn't seen, so it goes wherever the source goes: straight to the output, onto
// the whiteboard, or both. The canvas is see-through where the key and the cutout take the picture out
export function Greenscreen({ source }: { source: Source }) {
  // Again as the picture changes size or mirror
  useChanges(source)
  const { width, height } = source
  if (!width || !height) return null

  // A pixel to a pixel, at the size the style gives it at once, drawn only when the ticker says
  return (
    <Canvas
      orthographic
      dpr={1}
      frameloop="never"
      resize={{ offsetSize: true, debounce: 0 }}
      style={{ width, height }}
      gl={{ alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }}
    >
      <Keyer source={source} width={width} height={height} />
    </Canvas>
  )
}

interface KeyerProps {
  source: Source
  width: number
  height: number
}

// Renders the plane and copies what it rendered to the source, in the same task, while the drawing is still there to
// copy. It renders when there's something new to show: a video's next frame, a change to the settings, a corner of the
// cutout moved. A change keeps it rendering for a few ticks, so a change React makes to the plane on its next render,
// as Flip's is, is drawn too. It waits for the picture's first frame to upload, and for the canvas to take a new size,
// so it never copies a frame that's black or the wrong size. Taken down, it tells the source, as R3F takes its canvas's
// context away as it goes
function Keyer({ source, width, height }: KeyerProps) {
  const get = useThree((state) => state.get)
  const [uniforms] = useState<ScreenUniforms>(() => ({ ...source.uniforms, image: { value: null } }))

  useEffect(() => {
    const context = source.processed.getContext('2d')
    if (!context) return undefined
    let version = -1
    let revision = -1
    const corners = new Float64Array(8)
    let ticks = 0
    const stop = onTick('process', (time) => {
      const texture = uniforms.image.value
      const { gl, advance } = get()
      const canvas = gl.domElement
      if (!texture || texture.version === 0 || canvas.width !== source.width || canvas.height !== source.height) return

      let changed = texture.version !== version || source.revision !== revision
      version = texture.version
      revision = source.revision
      source.uniforms.crop.value.forEach(({ x, y }, i) => {
        if (corners[i * 2] === x && corners[i * 2 + 1] === y) return
        corners[i * 2] = x
        corners[i * 2 + 1] = y
        changed = true
      })
      if (changed) ticks = SETTLING
      if (ticks === 0) return
      ticks -= 1
      advance(time, false)

      const processed = source.processed
      if (processed.width !== canvas.width || processed.height !== canvas.height) {
        processed.width = canvas.width
        processed.height = canvas.height
      }
      context.globalCompositeOperation = 'copy'
      context.drawImage(canvas, 0, 0)
      source.live = true
    })
    return () => {
      stop()
      source.live = false
    }
  }, [source, uniforms, get])

  return (
    <Screen element={source.element} width={width} height={height} uniforms={uniforms} flip={source.settings.flip} />
  )
}
