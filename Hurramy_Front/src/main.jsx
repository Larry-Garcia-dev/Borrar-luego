import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'; // Importar
import App from './App.jsx'
import './index.css'

// Reemplaza con tu CLIENT ID real de Google Cloud
const GOOGLE_CLIENT_ID = "359527640943-dbu8gouo3t0sn8afk4r0b78ag0qg0472.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)