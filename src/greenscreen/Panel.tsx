import { RANGES } from '@snovakow/greenscreen'
import type { NumericSetting } from '@snovakow/greenscreen'
import { GUI } from 'lil-gui'
import type { Controller } from 'lil-gui'
import { useEffect, useImperativeHandle, useRef } from 'react'
import type { Ref } from 'react'
import type { Source } from '../sources/source.ts'
import type { Mode } from './Preview.tsx'
import type { KeyType } from './settings.ts'

// The tools' buttons, and what they say while their tool is up
const EDIT_CROP = 'Edit crop'
const EDITING = 'Drag the corners…'
const PICK_KEY = 'Pick key'
const PICKING = 'Click the preview…'

// The controls the panel changes from outside it
interface PanelControls {
  key: Controller
  crop: Controller
  editCrop: Controller
  keyType: Controller
  keyColor: Controller
  pickKey: Controller
}

export interface PanelHandle {
  // Makes hex the key and turns the key on, as choosing Custom and that colour in the panel would
  setKey: (hex: number) => void
  // Turns Crop on or off, as its checkbox would
  setCrop: (on: boolean) => void
}

interface PanelProps {
  ref?: Ref<PanelHandle>
  source: Source
  onCrop: (crop: boolean) => void
  // The tool up on the preview, which Edit crop and Pick key put up and down with onEditCrop and onPickKey
  mode: Mode
  onEditCrop: () => void
  onPickKey: () => void
  // Where the panel ends, down from its container's top, as it opens, closes and shows Key color
  onBottom: (bottom: number) => void
}

// The source's settings: Key first, then the prototype's lil-gui panel in its order, with Crop and Edit crop after
// Flip, Pick key after the key's colour, and each number in the range and step the keyer gives it. Every control but
// the buttons edits the source's settings, and any change passes them to its keyer, which prepares the source. Reset
// puts them all back. A button's press isn't passed on, so Pick key leaves a source as it was until a colour is picked,
// and Reset leaves it as it came. The panel is made again for each source, and the settings are the source's, so a
// source chosen again starts where it left off. The cleanup destroys the panel, so StrictMode leaves one
export function Panel({ ref, source, onCrop, mode, onEditCrop, onPickKey, onBottom }: PanelProps) {
  const container = useRef<HTMLDivElement>(null)
  const controls = useRef<PanelControls | null>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return undefined
    const settings = source.settings
    const gui = new GUI({ container: element, title: source.name })
    const number = (name: NumericSetting, label: string) => {
      const { min, max, step } = RANGES[name]
      return gui.add(settings, name, min, max, step).name(label)
    }

    const key = gui.add(settings, 'key').name('Key')
    gui.add(settings, 'flip').name('Flip')
    const crop = gui.add(settings, 'crop').name('Crop').onChange(onCrop)
    const editCrop = gui.add({ editCrop: onEditCrop }, 'editCrop').name(EDIT_CROP)
    gui.addColor(settings, 'tint').name('Color')
    // These are OBS's filter's, as the key is, so they act only while Key is on, and they're greyed out while it's off
    const filter = [
      number('opacity', 'Opacity'),
      number('contrast', 'Contrast'),
      number('brightness', 'Brightness'),
      number('gamma', 'Gamma'),
    ]
    const enableFilter = () => {
      for (const controller of filter) controller.enable(settings.key)
    }
    key.onChange(enableFilter)
    enableFilter()

    // The key's own colour shows only when the type is Custom. The others are the keyer's presets
    const keyType = gui
      .add(settings, 'keyType', { Green: 'green', Blue: 'blue', Magenta: 'magenta', Custom: 'custom' })
      .name('Key color type')
    const keyColor = gui.addColor(settings, 'keyColor').name('Key color')
    keyColor.show(settings.keyType === 'custom')
    keyType.onChange((type: KeyType) => keyColor.show(type === 'custom'))
    const pickKey = gui.add({ pickKey: onPickKey }, 'pickKey').name(PICK_KEY)

    number('similarity', 'Similarity')
    number('smoothness', 'Smoothness')
    number('spill', 'Spill')
    number('saturation', 'Saturation')

    // Back to the picture as it comes. The controls show the settings put back, and Crop off puts the handles down
    const reset = () => {
      source.reset()
      for (const controller of gui.controllersRecursive()) controller.updateDisplay()
      keyColor.show(settings.keyType === 'custom')
      enableFilter()
      onCrop(false)
    }
    gui.add({ reset }, 'reset').name('Reset')

    // A button's press comes here too, though it changes no setting
    gui.onChange(({ object }) => {
      if (object === settings) source.update()
    })

    // Where the panel ends, for the stylesheet to keep the grown preview below it
    const observer = new ResizeObserver(() => {
      const top = element.parentElement?.getBoundingClientRect().top ?? 0
      onBottom(gui.domElement.getBoundingClientRect().bottom - top)
    })
    observer.observe(gui.domElement)

    controls.current = { key, crop, editCrop, keyType, keyColor, pickKey }
    return () => {
      controls.current = null
      observer.disconnect()
      gui.destroy()
    }
  }, [source, onCrop, onEditCrop, onPickKey, onBottom])

  // Each tool's button says what to do next while its tool is up
  useEffect(() => {
    controls.current?.editCrop.name(mode === 'crop' ? EDITING : EDIT_CROP)
    controls.current?.pickKey.name(mode === 'pick' ? PICKING : PICK_KEY)
  }, [mode])

  // Setting the controls' values runs their handlers, as a change made in the panel does: Key color shows, with the
  // colour picked, Crop tells the inspector, and the settings go to the keyer. A value set to what it is already runs
  // nothing
  useImperativeHandle(
    ref,
    () => ({
      setKey(hex: number) {
        controls.current?.keyType.setValue('custom')
        controls.current?.keyColor.setValue(hex)
        controls.current?.key.setValue(true)
      },
      setCrop(on: boolean) {
        controls.current?.crop.setValue(on)
      },
    }),
    [],
  )

  return <div ref={container} className="controls" />
}
