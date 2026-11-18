import { useChanges } from '../changes.ts'
import type { Library } from '../sources/library.ts'
import type { Whiteboard } from '../whiteboard/whiteboard.ts'
import type { Output } from './output.ts'

interface OutputSwitchProps {
  output: Output
  whiteboard: Whiteboard
  library: Library
}

const WHITEBOARD = 'whiteboard'

// Which one stream goes out: the whiteboard, or any one source straight from the library, as it's been prepared
export function OutputSwitch({ output, whiteboard, library }: OutputSwitchProps) {
  useChanges(output)
  useChanges(library)
  const value = library.sources.find((source) => source === output.route)?.id ?? WHITEBOARD

  return (
    <label>
      Output{' '}
      <select
        value={value}
        onChange={(event) => {
          const id = event.currentTarget.value
          output.setRoute(library.sources.find((source) => source.id === id) ?? whiteboard)
        }}
      >
        <option value={WHITEBOARD}>Whiteboard</option>
        {library.sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
    </label>
  )
}
