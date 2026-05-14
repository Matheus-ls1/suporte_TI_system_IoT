import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PortalProfessor from './PortalProfessor.jsx'

// Se digitar na URL "/professor", abre a tela do professor. Se não, abre o Painel TI.
const urlAtual = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {urlAtual === '/professor' ? <PortalProfessor /> : <App />}
  </React.StrictMode>,
)