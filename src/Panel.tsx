import { useEffect, useState } from 'react'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { applySettings, DEFAULT_SETTINGS } from './chromaKey.ts'
import type { ChromaKeyUniforms, KeyType } from './chromaKey.ts'

interface PanelProps {
  uniforms: ChromaKeyUniforms
  onFlip: (flip: boolean) => void
}

// The prototype's lil-gui panel, in its order, with the filter's controls in the ranges OBS gives them. Every control
// edits settings, and any change sets the shader's uniforms from them. The settings outlive the panel, so one made
// again by StrictMode or a hot update starts where the last left off. The cleanup destroys the panel, so StrictMode
// leaves one
export function Panel({ uniforms, onFlip }: PanelProps) {
  const [settings] = useState(() => ({ flip: false, ...DEFAULT_SETTINGS }))

  useEffect(() => {
    const gui = new GUI()

    gui.add(settings, 'flip').name('Flip').onChange(onFlip)
    gui.addColor(settings, 'tint').name('Color')
    gui.add(settings, 'opacity', 0, 1, 0.0001).name('Opacity')
    gui.add(settings, 'contrast', -4, 4, 0.01).name('Contrast')
    gui.add(settings, 'brightness', -1, 1, 0.0001).name('Brightness')
    gui.add(settings, 'gamma', -1, 1, 0.01).name('Gamma')

    // As in OBS, the key's own colour shows only when the type is Custom
    const keyType = gui
      .add(settings, 'keyType', { Green: 'green', Blue: 'blue', Magenta: 'magenta', Custom: 'custom' })
      .name('Key color type')
    const keyColor = gui.addColor(settings, 'keyColor').name('Key color')
    keyColor.show(settings.keyType === 'custom')
    keyType.onChange((type: KeyType) => keyColor.show(type === 'custom'))

    gui.add(settings, 'similarity', 1, 1000, 1).name('Similarity')
    gui.add(settings, 'smoothness', 1, 1000, 1).name('Smoothness')
    gui.add(settings, 'spill', 1, 1000, 1).name('Spill')
    gui.add(settings, 'saturation', 0, 2).name('Saturation')

    gui.onChange(() => applySettings(uniforms, settings))

    return () => gui.destroy()
  }, [settings, uniforms, onFlip])

  return null
}
