import { useEffect, useState } from 'react'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { channelsOf, chromaOf, DEFAULT_COLOR, DEFAULT_KEY } from './chromaKey.ts'
import type { ChromaKeyUniforms } from './chromaKey.ts'

interface PanelProps {
  uniforms: ChromaKeyUniforms
  onFlip: (flip: boolean) => void
}

// The prototype's lil-gui panel, in its order. The sliders edit the shader's uniforms directly; Flip and the two
// colours go through settings, which outlive the panel, so one made again by StrictMode or a hot update starts where
// the last left off. The cleanup destroys the panel, so StrictMode leaves one
export function Panel({ uniforms, onFlip }: PanelProps) {
  const [settings] = useState(() => ({ flip: false, color: DEFAULT_COLOR, key: DEFAULT_KEY }))

  useEffect(() => {
    const gui = new GUI()

    gui.add(settings, 'flip').name('Flip').onChange(onFlip)
    gui.addColor(settings, 'color').name('Color').onChange((hex: number) => {
      uniforms.color.value.set(...channelsOf(hex))
    })
    gui.add(uniforms.contrast, 'value', 0, 2).name('Contrast')
    gui.add(uniforms.brightness, 'value', -1, 1).name('Brightness')
    gui.add(uniforms.gamma, 'value', 1, 2.2).name('Gamma')
    gui.addColor(settings, 'key').name('Key color').onChange((hex: number) => {
      uniforms.chromakey.value.set(...chromaOf(hex))
    })
    gui.add(uniforms.u_similarity, 'value', 0, 1).name('Similarity')
    gui.add(uniforms.u_smoothness, 'value', 0, 1).name('Smoothness')
    gui.add(uniforms.u_spill, 'value', 0, 1).name('Spill')
    gui.add(uniforms.u_saturation, 'value', 0, 2).name('Saturation')

    return () => gui.destroy()
  }, [settings, uniforms, onFlip])

  return null
}
