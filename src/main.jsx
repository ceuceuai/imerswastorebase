import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './app-dialog.css'
import { installAppDialogs } from './lib/appDialog'

installAppDialogs()

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
