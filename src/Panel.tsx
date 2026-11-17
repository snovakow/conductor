import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import type { ColorController, FunctionController, OptionController } from 'three/addons/libs/lil-gui.module.min.js'
import { applySettings, DEFAULT_SETTINGS } from './chromaKey.ts'
import type { ChromaKeyUniforms, KeyType, Settings } from './chromaKey.ts'

const PICK_KEY = 'Pick key'
const PICKING = 'Click the picture…'

type PanelSettings = Settings & { flip: boolean; crop: boolean }

// The controls the panel changes from outside it
interface PanelControls {
  keyType: OptionController<PanelSettings, 'keyType'>
  keyColor: ColorController<PanelSettings, 'keyColor'>
  pickKey: FunctionController<{ pickKey: () => void }, 'pickKey'>
}

export interface PanelHandle {
  // Makes hex the key, as choosing Custom and that colour in the panel would
  setKey: (hex: number) => void
}

interface PanelProps {
  ref?: Ref<PanelHandle>
  uniforms: ChromaKeyUniforms
  onFlip: (flip: boolean) => void
  onCrop: (crop: boolean) => void
  // Whether the next click on the picture picks the key, which the Pick key button turns on and off with onPickKey
  picking: boolean
  onPickKey: () => void
}

// The prototype's lil-gui panel, in its order, with Crop view after Flip, Pick key after the key's colour, and the
// filter's controls in the ranges OBS gives them. Every control edits settings, and any change sets the shader's
// uniforms from them. The settings outlive the panel, so one made again by StrictMode or a hot update starts where the
// last left off. The cleanup destroys the panel, so StrictMode leaves one
export function Panel({ ref, uniforms, onFlip, onCrop, picking, onPickKey }: PanelProps) {
  const [settings] = useState<PanelSettings>(() => ({ flip: false, crop: false, ...DEFAULT_SETTINGS }))
  const controls = useRef<PanelControls | null>(null)

  useEffect(() => {
    const gui = new GUI()

    gui.add(settings, 'flip').name('Flip').onChange(onFlip)
    gui.add(settings, 'crop').name('Crop view').onChange(onCrop)
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
    const pickKey = gui.add({ pickKey: onPickKey }, 'pickKey').name(PICK_KEY)

    gui.add(settings, 'similarity', 1, 1000, 1).name('Similarity')
    gui.add(settings, 'smoothness', 1, 1000, 1).name('Smoothness')
    gui.add(settings, 'spill', 1, 1000, 1).name('Spill')
    gui.add(settings, 'saturation', 0, 2).name('Saturation')

    gui.onChange(() => applySettings(uniforms, settings))

    // Where the panel ends, as it opens, closes and shows Key color, for the stylesheet to keep the grown preview
    // below it
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--panel-bottom', `${gui.domElement.getBoundingClientRect().bottom}px`)
    })
    observer.observe(gui.domElement)

    controls.current = { keyType, keyColor, pickKey }
    return () => {
      controls.current = null
      observer.disconnect()
      root.style.removeProperty('--panel-bottom')
      gui.destroy()
    }
  }, [settings, uniforms, onFlip, onCrop, onPickKey])

  // The button says what to do next while it's waiting for the click
  useEffect(() => {
    controls.current?.pickKey.name(picking ? PICKING : PICK_KEY)
  }, [picking])

  // Setting the controls' values runs their handlers, as a change made in the panel does: Key color shows, with the
  // colour picked, and the uniforms are set from the settings
  useImperativeHandle(
    ref,
    () => ({
      setKey(hex: number) {
        controls.current?.keyType.setValue('custom')
        controls.current?.keyColor.setValue(hex)
      },
    }),
    [],
  )

  return null
}
