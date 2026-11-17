import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createUniforms } from './chromaKey.ts'
import { Panel } from './Panel.tsx'
import type { PanelHandle } from './Panel.tsx'
import { Preview } from './Preview.tsx'
import { Screen } from './Screen.tsx'
import { useCamera } from './useCamera.ts'

// The canvas renders as the prototype's did: at the display's full pixel ratio, where R3F's default caps it at 2, and
// opaque. The shader's alpha blends the picture over the black background, which shows where the key is
export default function App() {
  const [uniforms] = useState(createUniforms)
  const [flip, setFlip] = useState(false)
  const [crop, setCrop] = useState(false)
  const [picking, setPicking] = useState(false)
  const panel = useRef<PanelHandle>(null)
  const { ref, video, size, load } = useCamera()

  // Pick key turns the eyedropper on, or off again, and a click on the picture sets the key and puts it down
  const togglePicking = useCallback(() => setPicking((on) => !on), [])
  const pick = useCallback((hex: number) => {
    panel.current?.setKey(hex)
    setPicking(false)
  }, [])

  // Escape puts the eyedropper down too. It listens as the key comes down to the page, before the panel, which still
  // has the focus from Pick key and stops keys going any further
  useEffect(() => {
    if (!picking) return undefined
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPicking(false)
    }
    window.addEventListener('keydown', cancel, true)
    return () => window.removeEventListener('keydown', cancel, true)
  }, [picking])

  return (
    <>
      <Canvas orthographic dpr={[0, Infinity]} gl={{ alpha: false }} className={picking ? 'picking' : undefined}>
        <color attach="background" args={['black']} />
        {video && size && (
          <Screen video={video} size={size} uniforms={uniforms} flip={flip} picking={picking} onPick={pick} />
        )}
      </Canvas>
      <Panel
        ref={panel}
        uniforms={uniforms}
        onFlip={setFlip}
        onCrop={setCrop}
        picking={picking}
        onPickKey={togglePicking}
      />
      <Preview videoRef={ref} size={size} crop={crop} corners={uniforms.crop.value} onLoad={load} />
    </>
  )
}
