import type { CSSProperties, MouseEvent } from 'react'
import type { Source } from '../sources/source.ts'
import { StreamView } from '../sources/StreamView.tsx'
import { CropOverlay } from './CropOverlay.tsx'
import { sampleKey } from './eyedropper.ts'

// The tool up on the preview, if any: the cutout's handles, or the eyedropper for the key. Raw is neither, and the
// preview is small in the corner
export type Mode = 'raw' | 'crop' | 'pick'

interface PreviewProps {
  source: Source
  mode: Mode
  // Whether the cutout cuts the picture, for its outline to show on the preview
  crop: boolean
  // While picking, a click on the preview reads the source's colour there for onPick
  onPick: (hex: number) => void
  // Done puts the tool down
  onDone: () => void
}

// The source's own picture, small in the corner, with the cutout's outline over it while Crop is on. With a tool up it
// grows: the handles go over it to drag the cutout, or a click on it picks the key. The tools are used here, on the
// source's picture as it comes, while the main picture shows what they come to
export function Preview({ source, mode, crop, onPick, onDone }: PreviewProps) {
  const sized = source.width > 0 && source.height > 0
  // No tool until there's a picture to use it on
  const tool = sized ? mode : 'raw'
  // The picture's shape, for the stylesheet to keep the grown preview under a height
  const style: CSSProperties & { '--aspect'?: number } = sized ? { '--aspect': source.width / source.height } : {}

  let className = 'preview'
  if (tool !== 'raw') className += ' enlarged'
  if (tool === 'pick') className += ' picking'

  // The view's box is the picture, at its own shape and not mirrored by Flip, so where the click is in it is where it
  // is in the frame
  const pick = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const u = (event.clientX - rect.left) / rect.width
    const v = (event.clientY - rect.top) / rect.height
    const hex = sampleKey(source.raw, u, v)
    if (hex !== null) onPick(hex)
  }

  return (
    <div className={className} style={style}>
      <StreamView stream={source.raw} shaped onClick={tool === 'pick' ? pick : undefined} />
      {sized && (crop || tool === 'crop') && (
        <CropOverlay corners={source.uniforms.crop.value} editable={tool === 'crop'} />
      )}
      {tool !== 'raw' && (
        <button type="button" className="done" onClick={onDone}>
          Done
        </button>
      )}
    </div>
  )
}
