// The one clock everything draws on, so each tick runs in an order that holds: the sources are keyed, then the
// whiteboard is drawn from them, then the output from what's routed to it, and last everything on screen
const PHASES = ['process', 'board', 'output', 'view'] as const

export type Phase = (typeof PHASES)[number]

type Step = (time: number) => void

const steps: Record<Phase, Set<Step>> = { process: new Set(), board: new Set(), output: new Set(), view: new Set() }

// The browser stops animation frames for a page it isn't showing, which it does when the pop-out covers this window
// as well as when the tab is in the background. A worker's timer keeps ticking then, at about 30 a second, and takes
// over once the frames have stopped for longer than a few would take
const FALLBACK_INTERVAL = 1000 / 30
const STALLED = 100

let started = false
let lastFrame = 0

function tick(time: number) {
  for (const phase of PHASES) {
    for (const step of steps[phase]) step(time)
  }
}

function frame(time: number) {
  // Asked for first, so an error in a step can't stop the clock
  requestAnimationFrame(frame)
  lastFrame = performance.now()
  tick(time)
}

function start() {
  started = true
  lastFrame = performance.now()
  requestAnimationFrame(frame)
  try {
    const source = `setInterval(() => postMessage(0), ${FALLBACK_INTERVAL})`
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
    const worker = new Worker(url)
    URL.revokeObjectURL(url)
    worker.onmessage = () => {
      const now = performance.now()
      if (now - lastFrame > STALLED) tick(now)
    }
  } catch (error) {
    // Without a worker the clock stops along with the animation frames
    console.error(error)
  }
}

// Runs step on every tick in its phase, from the next tick on, until the returned function is called
export function onTick(phase: Phase, step: Step) {
  if (!started) start()
  steps[phase].add(step)
  return () => {
    steps[phase].delete(step)
  }
}
