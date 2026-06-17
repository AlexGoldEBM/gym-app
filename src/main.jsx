import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './store/AuthContext'
import { DataProvider } from './store/DataContext'
import { WorkoutProvider } from './store/WorkoutContext'
import { applyScale } from './lib/textScale'

applyScale() // restore saved text scale before first paint

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <WorkoutProvider>
            <App />
          </WorkoutProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
