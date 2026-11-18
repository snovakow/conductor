import { useSyncExternalStore } from 'react'

// What a model tells the page when its shape changes: what's in it, in what order, what's chosen. What changes every
// frame, the pictures themselves, is read on the ticker instead and never re-renders anything
export class Changes {
  #listeners = new Set<() => void>()
  #version = 0

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  version = () => this.#version

  protected changed() {
    this.#version += 1
    for (const listener of this.#listeners) listener()
  }
}

// Renders again whenever the model changes
export function useChanges(model: Changes) {
  return useSyncExternalStore(model.subscribe, model.version)
}
