import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import OCMBottomIndicator from '../ocm-bottom-indicator.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OCMBottomIndicator />
  </StrictMode>
)
