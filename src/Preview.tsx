import type { CSSProperties, Ref } from 'react'
import type { Point } from './crop.ts'
import { CropOverlay } from './CropOverlay.tsx'
import type { VideoSize } from './useCamera.ts'

interface PreviewProps {
  videoRef: Ref<HTMLVideoElement>
  size: VideoSize | null
  crop: boolean
  corners: Point[]
  onLoad: () => void
}

// The camera's own picture, small in the corner. In Crop view it grows, and the cutout's handles go over it. The video
// element stays the same element throughout, so the stream playing in it plays on
export function Preview({ videoRef, size, crop, corners, onLoad }: PreviewProps) {
  const editing = crop && size !== null
  // The video's shape, for the stylesheet to keep the grown preview under a height
  const style: CSSProperties & { '--aspect'?: number } = size ? { '--aspect': size.width / size.height } : {}

  return (
    <div className={editing ? 'preview editing' : 'preview'} style={style}>
      <video ref={videoRef} autoPlay muted playsInline />
      {editing && <CropOverlay corners={corners} />}
      <button type="button" className="load" onClick={onLoad}>
        Load
      </button>
    </div>
  )
}
