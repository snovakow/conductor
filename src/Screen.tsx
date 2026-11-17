import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { fragmentShader, vertexShader } from './chromaKey.ts'
import type { ChromaKeyUniforms } from './chromaKey.ts'
import type { VideoSize } from './useCamera.ts'

interface ScreenProps {
  video: HTMLVideoElement
  size: VideoSize
  uniforms: ChromaKeyUniforms
  flip: boolean
}

// The camera's video, keyed by the shader, on a plane as large as fits the window at the video's aspect ratio. Flip
// mirrors it with a negative scale, which three.js still draws the front faces of
export function Screen({ video, size, uniforms, flip }: ScreenProps) {
  const viewport = useThree((state) => state.viewport)

  // The shader's box filter samples around each pixel a texel of the video away, as in OBS
  useEffect(() => {
    uniforms.pixelSize.value.set(1 / size.width, 1 / size.height)
  }, [uniforms, size])

  const fit = Math.min(viewport.width / size.width, viewport.height / size.height)

  return (
    <mesh scale={[(flip ? -1 : 1) * size.width * fit, size.height * fit, 1]}>
      <planeGeometry />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}>
        <videoTexture attach="uniforms-uSampler-value" args={[video]} />
      </shaderMaterial>
    </mesh>
  )
}
