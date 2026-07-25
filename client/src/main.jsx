import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
window.process = window.process || { env: { NODE_ENV: 'development' } };
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
