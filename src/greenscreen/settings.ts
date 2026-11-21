import { KEY_COLORS } from '@snovakow/greenscreen'
import type { Settings as KeyerSettings } from '@snovakow/greenscreen'

// The key's colour as the panel chooses it: one of the keyer's presets, or a colour of its own
export type KeyType = keyof typeof KEY_COLORS | 'custom'

// What the panel edits: the keyer's settings, in its units and ranges, but for the cut's corners, which the source
// keeps, and with the key chosen from the presets. The key is keyColor only when keyType is custom
export interface Settings extends Omit<KeyerSettings, 'corners'> {
  keyType: KeyType
}

// The picture as it comes: the key off, OBS's defaults for when it's on, OBS's spill rather than the keyer's hue-only
// one, and no mirror, cut or change of colour. They're all given to the keyer, so none of its own defaults, which have
// the key on, comes through
export const DEFAULT_SETTINGS: Readonly<Settings> = {
  key: false,
  flip: false,
  crop: false,
  keyType: 'green',
  keyColor: KEY_COLORS.green,
  similarity: 400,
  smoothness: 80,
  spill: 100,
  hueSpill: false,
  opacity: 1,
  tint: 0xffffff,
  saturation: 1,
  brightness: 0,
  contrast: 0,
  gamma: 0,
}

// The settings as the keyer takes them, with the key's colour the preset chosen, or the colour of its own
export function keyerSettings(settings: Readonly<Settings>): Omit<KeyerSettings, 'corners'> {
  const { keyType, keyColor, ...rest } = settings
  return { ...rest, keyColor: keyType === 'custom' ? keyColor : KEY_COLORS[keyType] }
}
