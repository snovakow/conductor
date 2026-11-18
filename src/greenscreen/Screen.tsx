import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ClampToEdgeWrapping, LinearFilter, RGBAFormat, UnsignedByteType, UVMapping } from 'three'
import type { SourceElement } from '../sources/source.ts'
import { fragmentShader, vertexShader } from './chromaKey.ts'
import type { ScreenUniforms } from './chromaKey.ts'

interface ScreenProps {
  element: SourceElement
  width: number
  height: number
  uniforms: ScreenUniforms
  flip: boolean
}

// The source's picture, keyed by the shader, on a plane as large as fits the canvas at the picture's aspect ratio. Flip
// mirrors it with a negative scale, which three.js still draws the front faces of. A video's texture takes each frame
// as it's decoded. An image's is uploaded once, without mipmaps, as it's drawn at its own size, and like a video's with
// no colour space, so the shader gets its sRGB values either way
export function Screen({ element, width, height, uniforms, flip }: ScreenProps) {
  const viewport = useThree((state) => state.viewport)

  // The shader's box filter samples around each pixel a texel of the picture away, as in OBS
  useEffect(() => {
    uniforms.pixel_size.value.set(1 / width, 1 / height)
  }, [uniforms, width, height])

  // The material is built with the uniforms, so it keeps them and sees the panel change them. Given them as a prop
  // instead, R3F copies each into the material's own, and only changes made inside a vector or colour would get through
  const parameters = useMemo(() => ({ uniforms, vertexShader, fragmentShader }), [uniforms])

  const fit = Math.min(viewport.width / width, viewport.height / height)

  return (
    <mesh scale={[(flip ? -1 : 1) * width * fit, height * fit, 1]}>
      <planeGeometry />
      {/* The shader returns its colour multiplied by its alpha, and it blends as that's blended */}
      <shaderMaterial args={[parameters]} transparent premultipliedAlpha>
        {element instanceof HTMLVideoElement ? (
          <videoTexture attach="uniforms-image-value" args={[element]} />
        ) : (
          // R3F types a texture's arguments by the old constructor, which takes all of them. These are the defaults,
          // but for the minifying filter, which samples the image itself rather than a mipmap
          <texture
            attach="uniforms-image-value"
            args={[
              element,
              UVMapping,
              ClampToEdgeWrapping,
              ClampToEdgeWrapping,
              LinearFilter,
              LinearFilter,
              RGBAFormat,
              UnsignedByteType,
              1,
            ]}
            generateMipmaps={false}
            needsUpdate
          />
        )}
      </shaderMaterial>
    </mesh>
  )
}
