import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyPaletteToCss } from './theme/colors.js'
import './index.css'
import App from './App.jsx'

applyPaletteToCss()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

