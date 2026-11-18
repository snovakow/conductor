import { useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import { useChanges } from '../changes.ts'
import { CATEGORIES, categoryOf } from './library.ts'
import type { Category, Library } from './library.ts'
import type { Source } from './source.ts'
import { StreamView } from './StreamView.tsx'

interface MediaAssetsProps {
  library: Library
  // The source the inspector has open, which its row shows
  selected: Source | null
  // A row clicked
  onChoose: (source: Source) => void
  // Sources loaded or shared from here, to go where a click on them would
  onAdded: (sources: Source[]) => void
}

// The library, a list at a time: the cameras, the files, or the screens. File loads images and videos, Screen shares
// one, and Camera asks for the cameras again and opens any that aren't open. Choosing Files or Screens while there are
// none asks for one. Whatever is added here shows its list
export function MediaAssets({ library, selected, onChoose, onAdded }: MediaAssetsProps) {
  useChanges(library)
  const [category, setCategory] = useState<Category>('cameras')
  const fileInput = useRef<HTMLInputElement>(null)

  const added = (sources: Source[]) => {
    const last = sources.at(-1)
    if (!last) return
    setCategory(categoryOf(last.kind))
    onAdded(sources)
  }
  const addScreen = async () => {
    const source = await library.addScreen()
    if (source) added([source])
  }
  const addCameras = async () => {
    setCategory('cameras')
    await library.openCameras()
  }
  const loadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const files = [...(input.files ?? [])]
    // So the same file can be chosen again
    input.value = ''
    added(await library.addFiles(files))
  }

  const choose = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value
    const next = CATEGORIES.find(({ category: each }) => each === value)?.category
    if (!next) return
    setCategory(next)
    if (library.in(next).length > 0) return
    if (next === 'files') fileInput.current?.click()
    if (next === 'screens') void addScreen()
  }

  const remove = (event: MouseEvent, source: Source) => {
    event.stopPropagation()
    library.remove(source)
  }

  return (
    <aside className="assets">
      <h2>Media Assets</h2>
      <select value={category} onChange={choose} aria-label="Media">
        <optgroup label="MEDIA">
          {CATEGORIES.map(({ category: value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </optgroup>
      </select>
      <div className="add">
        <button type="button" onClick={() => fileInput.current?.click()}>
          File
        </button>
        <button type="button" onClick={() => void addScreen()}>
          Screen
        </button>
        <button type="button" onClick={() => void addCameras()}>
          Camera
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(event) => void loadFiles(event)}
      />
      <div className="list">
        {library.in(category).map((source) => (
          <div
            key={source.id}
            className={source === selected ? 'row selected' : 'row'}
            onClick={() => onChoose(source)}
          >
            <StreamView stream={source} />
            <span className="name">{source.name}</span>
            <button type="button" className="remove" title="Remove" onClick={(event) => remove(event, source)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
