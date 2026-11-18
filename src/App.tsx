import { useEffect, useRef, useState } from 'react'
import { useChanges } from './changes.ts'
import { Greenscreen } from './greenscreen/Greenscreen.tsx'
import { Inspector } from './inspector/Inspector.tsx'
import { Output } from './output/output.ts'
import { OutputSwitch } from './output/OutputSwitch.tsx'
import { PopOut } from './output/PopOut.tsx'
import { Recorder } from './output/recorder.ts'
import { Library } from './sources/library.ts'
import { MediaAssets } from './sources/MediaAssets.tsx'
import type { Source } from './sources/source.ts'
import { Whiteboard } from './whiteboard/whiteboard.ts'
import { WhiteboardTab } from './whiteboard/WhiteboardTab.tsx'

type Tab = 'inspector' | 'whiteboard'

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'inspector', label: 'Inspector' },
  { tab: 'whiteboard', label: 'Whiteboard' },
]

// The library of sources down the left, shared by the two tabs: the inspector, where a source clicked is opened to be
// prepared, and the whiteboard, where a source clicked is placed. Every prepared source is keyed out of sight, so it's
// ready wherever it's used. The output, chosen at the top right, is the whiteboard or any one source, and the pop-out
// shows and records it
export default function App() {
  const [library] = useState(() => new Library())
  const [whiteboard] = useState(() => new Whiteboard())
  const [output] = useState(() => new Output(whiteboard))
  const [recorder] = useState(() => new Recorder(output))
  const [tab, setTab] = useState<Tab>('inspector')
  const [chosen, setChosen] = useState<string | null>(null)
  useChanges(library)

  useEffect(() => {
    library.start()
    return () => library.stop()
  }, [library])
  useEffect(() => whiteboard.start(), [whiteboard])
  useEffect(() => output.start(), [output])

  // A source leaving the library leaves the board, and the output if it's going out
  useEffect(
    () =>
      library.onRemove((source) => {
        whiteboard.removeSource(source)
        if (output.route === source) output.setRoute(whiteboard)
      }),
    [library, whiteboard, output],
  )

  // The source chosen, or the first while none is, or the one chosen has gone
  const selected = library.sources.find((source) => source.id === chosen) ?? library.sources[0] ?? null

  // A click on a source opens it in the inspector, or places it on the whiteboard. Sources added go the same way, as
  // the tab is when they arrive
  const choose = (source: Source) => {
    if (tab === 'inspector') setChosen(source.id)
    else whiteboard.add(source)
  }
  const current = useRef(tab)
  useEffect(() => {
    current.current = tab
  }, [tab])
  const added = useRef((sources: Source[]) => {
    if (current.current === 'whiteboard') for (const source of sources) whiteboard.add(source)
    else if (sources.length) setChosen(sources[sources.length - 1].id)
  })

  // Files dropped anywhere on the page are added, rather than opened in place of it
  useEffect(() => {
    const over = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
    }
    const drop = (event: DragEvent) => {
      const files = [...(event.dataTransfer?.files ?? [])]
      if (!files.length) return
      event.preventDefault()
      void library.addFiles(files).then((sources) => added.current(sources))
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [library])

  return (
    <div className="app">
      <header>
        <div className="tabs" role="tablist">
          {TABS.map(({ tab: value, label }) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="output">
          <OutputSwitch output={output} whiteboard={whiteboard} library={library} />
          <PopOut output={output} recorder={recorder} />
        </div>
      </header>
      <MediaAssets
        library={library}
        selected={tab === 'inspector' ? selected : null}
        onChoose={choose}
        onAdded={(sources) => added.current(sources)}
      />
      <main className="tab">
        {tab === 'inspector' ? <Inspector source={selected} /> : <WhiteboardTab whiteboard={whiteboard} />}
      </main>
      <div className="processors" aria-hidden="true">
        {library.sources
          .filter((source) => source.prepared)
          .map((source) => (
            <Greenscreen key={source.id} source={source} />
          ))}
      </div>
    </div>
  )
}
