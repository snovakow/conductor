import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import { createUniforms } from './chromaKey.ts'
import { Panel } from './Panel.tsx'
import { Screen } from './Screen.tsx'
import { useCamera } from './useCamera.ts'

// The canvas renders as the prototype's did: at the display's full pixel ratio, where R3F's default caps it at 2, and
// opaque. The shader's alpha blends the picture over the black background, which shows where the key is
export default function App() {
  const [uniforms] = useState(createUniforms)
  const [flip, setFlip] = useState(false)
  const { ref, video, size, load } = useCamera()

  return (
    <>
      <Canvas orthographic dpr={[0, Infinity]} gl={{ alpha: false }}>
        <color attach="background" args={['black']} />
        {video && size && <Screen video={video} size={size} uniforms={uniforms} flip={flip} />}
      </Canvas>
      <Panel uniforms={uniforms} onFlip={setFlip} />
      <video ref={ref} className="preview" autoPlay muted playsInline />
      <button type="button" className="load" onClick={load}>
        Load
      </button>
    </>
  )
}
