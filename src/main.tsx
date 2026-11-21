import { warmUp } from '@snovakow/greenscreen'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// The keyers' backend chosen, and for WebGPU the device made, while the page starts, so a source prepared later is
// keyed from its first frame rather than shown as it comes until then
warmUp().catch((error: unknown) => console.error(error))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
