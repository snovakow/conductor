import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { fragmentShader, vertexShader } from './chromaKey.ts'
import type { ChromaKeyUniforms } from './chromaKey.ts'
import { sampleKey } from './eyedropper.ts'
import type { VideoSize } from './useCamera.ts'

interface ScreenProps {
  video: HTMLVideoElement
  size: VideoSize
  uniforms: ChromaKeyUniforms
  flip: boolean
  // While picking, a click on the picture reads the camera's colour there for onPick
  picking: boolean
  onPick: (hex: number) => void
}

// The camera's video, keyed by the shader, on a plane as large as fits the window at the video's aspect ratio. Flip
// mirrors it with a negative scale, which three.js still draws the front faces of
export function Screen({ video, size, uniforms, flip, picking, onPick }: ScreenProps) {
  const viewport = useThree((state) => state.viewport)

  // The shader's box filter samples around each pixel a texel of the video away, as in OBS
  useEffect(() => {
    uniforms.pixel_size.value.set(1 / size.width, 1 / size.height)
  }, [uniforms, size])

  // The material is built with the uniforms, so it keeps them and sees the panel change them. Given them as a prop
  // instead, R3F copies each into the material's own, and only changes made inside a vector or colour would get through
  const parameters = useMemo(() => ({ uniforms, vertexShader, fragmentShader }), [uniforms])

  const fit = Math.min(viewport.width / size.width, viewport.height / size.height)

  // Where the click hit the plane is where it is in the video: the plane's uv is the video's, mirrored along with it by
  // Flip, with v up the picture where the frame's rows go down it. A click on the bars beside the picture misses the
  // plane, and leaves the eyedropper up
  const pick = (event: ThreeEvent<MouseEvent>) => {
    if (!event.uv) return
    const hex = sampleKey(video, event.uv.x, 1 - event.uv.y)
    if (hex !== null) onPick(hex)
  }

  return (
    <mesh scale={[(flip ? -1 : 1) * size.width * fit, size.height * fit, 1]} onClick={picking ? pick : undefined}>
      <planeGeometry />
      {/* The shader returns its colour multiplied by its alpha, as OBS's does, and it blends as OBS blends it */}
      <shaderMaterial args={[parameters]} transparent premultipliedAlpha>
        <videoTexture attach="uniforms-image-value" args={[video]} />
      </shaderMaterial>
    </mesh>
  )
}
