import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
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
// mirrors it with a negative scale, which three.js still draws the front faces of. It is always the keyed picture: the
// key is picked and the cutout dragged on the camera's preview, and this shows what they come to
export function Screen({ video, size, uniforms, flip }: ScreenProps) {
  const viewport = useThree((state) => state.viewport)

  // The shader's box filter samples around each pixel a texel of the video away, as in OBS
  useEffect(() => {
    uniforms.pixel_size.value.set(1 / size.width, 1 / size.height)
  }, [uniforms, size])

  // The material is built with the uniforms, so it keeps them and sees the panel change them. Given them as a prop
  // instead, R3F copies each into the material's own, and only changes made inside a vector or colour would get through
  const parameters = useMemo(() => ({ uniforms, vertexShader, fragmentShader }), [uniforms])

  const fit = Math.min(viewport.width / size.width, viewport.height / size.height)

  return (
    <mesh scale={[(flip ? -1 : 1) * size.width * fit, size.height * fit, 1]}>
      <planeGeometry />
      {/* The shader returns its colour multiplied by its alpha, as OBS's does, and it blends as OBS blends it */}
      <shaderMaterial args={[parameters]} transparent premultipliedAlpha>
        <videoTexture attach="uniforms-image-value" args={[video]} />
      </shaderMaterial>
    </mesh>
  )
}
