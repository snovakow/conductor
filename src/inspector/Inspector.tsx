import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useChanges } from '../changes.ts'
import { Panel } from '../greenscreen/Panel.tsx'
import type { PanelHandle } from '../greenscreen/Panel.tsx'
import { Preview } from '../greenscreen/Preview.tsx'
import type { Mode } from '../greenscreen/Preview.tsx'
import type { Source } from '../sources/source.ts'
import { StreamView } from '../sources/StreamView.tsx'

// Where a source is prepared before it's used: its picture as it will be used, large, over black, with its settings
// over it and its own picture in the corner to work the tools on. Each source chosen starts with no tool up
export function Inspector({ source }: { source: Source | null }) {
  if (!source) {
    return (
      <div className="inspector">
        <p className="empty">Choose a source in Media Assets to prepare it.</p>
      </div>
    )
  }
  return <SourceInspector key={source.id} source={source} />
}

function SourceInspector({ source }: { source: Source }) {
  // Again as the picture changes size, for the preview's shape
  useChanges(source)
  const [crop, setCrop] = useState(source.settings.crop)
  // The tool up on the preview, one at a time
  const [mode, setMode] = useState<Mode>('raw')
  const [panelBottom, setPanelBottom] = useState(0)
  const panel = useRef<PanelHandle>(null)

  // Each tool's button puts its tool up, in place of the other, or down again. Done on the preview puts either down
  const toggleCrop = useCallback(() => setMode((current) => (current === 'crop' ? 'raw' : 'crop')), [])
  const togglePick = useCallback(() => setMode((current) => (current === 'pick' ? 'raw' : 'pick')), [])
  const done = useCallback(() => setMode('raw'), [])

  // A click on the preview sets the key and turns it on. The eyedropper stays up for another, while the main picture
  // shows how the last one keys, until Pick key again, Done or Escape puts it down
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

  const style: CSSProperties & { '--panel-bottom': string } = { '--panel-bottom': `${panelBottom}px` }

  return (
    <div className="inspector" style={style}>
      <StreamView stream={source} className="picture" />
      <Panel
        ref={panel}
        source={source}
        onCrop={changeCrop}
        mode={mode}
        onEditCrop={toggleCrop}
        onPickKey={togglePick}
        onBottom={setPanelBottom}
      />
      <Preview source={source} mode={mode} crop={crop} onPick={pick} onDone={done} />
    </div>
  )
}
