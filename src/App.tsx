import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createUniforms } from './chromaKey.ts'
import { Panel } from './Panel.tsx'
import type { PanelHandle } from './Panel.tsx'
import { Preview } from './Preview.tsx'
import type { Mode } from './Preview.tsx'
import { Screen } from './Screen.tsx'
import { useCamera } from './useCamera.ts'

// The canvas renders as the prototype's did: at the display's full pixel ratio, where R3F's default caps it at 2, and
// opaque. The shader's alpha blends the picture over the black background, which shows where the key is
export default function App() {
  const [uniforms] = useState(createUniforms)
  const [flip, setFlip] = useState(false)
  const [crop, setCrop] = useState(false)
  // The tool up on the preview, one at a time
  const [mode, setMode] = useState<Mode>('raw')
  const panel = useRef<PanelHandle>(null)
  const { ref, video, size, load } = useCamera()

  // Each tool's button puts its tool up, in place of the other, or down again. Done on the preview puts either down
  const toggleCrop = useCallback(() => setMode((current) => (current === 'crop' ? 'raw' : 'crop')), [])
  const togglePick = useCallback(() => setMode((current) => (current === 'pick' ? 'raw' : 'pick')), [])
  const done = useCallback(() => setMode('raw'), [])

  // A click on the preview sets the key. The eyedropper stays up for another, while the main picture shows how the last
  // one keys, until Pick key again, Done or Escape puts it down
  const pick = useCallback((hex: number) => {
    panel.current?.setKey(hex)
  }, [])

  // Edit crop turns Crop on, so the picture shows the cut as the corners move. Crop turned off puts the handles down,
  // as there's no cut left to show
  useEffect(() => {
    if (mode === 'crop') panel.current?.setCrop(true)
  }, [mode])
  const changeCrop = useCallback((on: boolean) => {
    setCrop(on)
    if (!on) setMode((current) => (current === 'crop' ? 'raw' : current))
  }, [])

  // Escape puts the tool down too. It listens as the key comes down to the page, before the panel, which still has the
  // focus from the tool's button and stops keys going any further
  useEffect(() => {
    if (mode === 'raw') return undefined
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('raw')
    }
    window.addEventListener('keydown', cancel, true)
    return () => window.removeEventListener('keydown', cancel, true)
  }, [mode])

  return (
    <>
      <Canvas orthographic dpr={[0, Infinity]} gl={{ alpha: false }}>
        <color attach="background" args={['black']} />
        {video && size && <Screen video={video} size={size} uniforms={uniforms} flip={flip} />}
      </Canvas>
      <Panel
        ref={panel}
        uniforms={uniforms}
        onFlip={setFlip}
        onCrop={changeCrop}
        mode={mode}
        onEditCrop={toggleCrop}
        onPickKey={togglePick}
      />
      <Preview
        videoRef={ref}
        size={size}
        mode={mode}
        crop={crop}
        corners={uniforms.crop.value}
        onPick={pick}
        onDone={done}
        onLoad={load}
      />
    </>
  )
}
