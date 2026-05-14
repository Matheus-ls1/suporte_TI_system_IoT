import { useState } from 'react'
import './PortalProfessor.css'
import './App.css' // Importa o CSS base para reaproveitar o visual de Login e Topbar

function PortalProfessor() {
  // Autenticação da Sessão do Professor
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem('prof_logado') === 'true')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')

  // Campos do Formulário de Chamado
  const [bloco, setBloco] = useState('')
  const [sala, setSala] = useState('')
  const [problema, setProblema] = useState('')
  
  // Controle de Interface
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const limiteCaracteres = 100

  const fazerLogin = async (e) => {
    e.preventDefault() 
    setErroLogin('')

    try {
      const resposta = await fetch('http://192.168.1.50:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usuario, password: senha })
      })

      const dados = await resposta.json()

      if (resposta.ok) {
        setAutenticado(true)
        sessionStorage.setItem('prof_logado', 'true')
        sessionStorage.setItem('nome_prof', dados.username)
      } else {
        setErroLogin(dados.mensagem || 'Credenciais inválidas.')
      }
    } catch (erro) {
      setErroLogin('Sem conexão com o servidor.')
    }
  }

  const sair = () => {
    sessionStorage.removeItem('prof_logado')
    sessionStorage.removeItem('nome_prof')
    setAutenticado(false)
  }

  const enviarChamado = async (e) => {
    e.preventDefault()
    if (problema.length > limiteCaracteres) return;
    
    setEnviando(true)
    
    // MÁGICA: Juntamos os dados para encaixar no banco de dados existente!
    const tituloFormatado = `Bloco ${bloco.toUpperCase()} - Sala ${sala}`
    
    try {
      const resposta = await fetch('http://192.168.1.50:5000/chamado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          titulo: tituloFormatado, 
          descricao: problema 
        })
      })

      if (resposta.ok) {
        setSucesso(true)
        setBloco('')
        setSala('')
        setProblema('')
        // Tira a mensagem de sucesso da tela após 4 segundos
        setTimeout(() => setSucesso(false), 4000)
      } else {
        alert("Erro ao enviar chamado. Tente novamente.")
      }
    } catch (erro) {
      alert("Sem conexão com o servidor.")
    } finally {
      setEnviando(false)
    }
  }

  // TELA DE LOGIN DO PROFESSOR
  if (!autenticado) {
    return (
      <div className="login-view">
        <div className="login-card">
          <div className="login-logo">
            <span className="logo-icon-grande">👨‍🏫</span>
            <h2>Portal do Docente</h2>
            <p>Acesso ao Suporte de TI</p>
          </div>
          
          <form className="login-form" onSubmit={fazerLogin}>
            {erroLogin && <div className="msg-erro">{erroLogin}</div>}
            
            <div className="form-group">
              <label>Usuário</label>
              <input type="text" placeholder="Usuário fornecido pela TI" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus required />
            </div>
            
            <div className="form-group">
              <label>Senha</label>
              <input type="password" placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            
            <button type="submit" className="btn-login" style={{backgroundColor: '#3b82f6'}}>Entrar no Portal</button>
          </form>
        </div>
      </div>
    )
  }

  // TELA DO FORMULÁRIO (Logado)
  const caracteresUsados = problema.length
  let corContador = 'ok'
  if (caracteresUsados >= 80) corContador = 'alerta'
  if (caracteresUsados > limiteCaracteres) corContador = 'limite'

  return (
    <div className="layout-app">
      <header className="topbar">
        <div className="logo-area">
          <span className="logo-icon">👨‍🏫</span>
          <h2>Portal do Docente</h2>
        </div>
        <div className="menu-navegacao">
          <span style={{fontWeight: 600, color: '#64748b', marginRight: '15px'}}>Olá, {sessionStorage.getItem('nome_prof')}</span>
          <button className="btn-sair" onClick={sair}>Sair 🚪</button>
        </div>
      </header>

      <main className="view-professor">
        <div className="cabecalho-professor">
          <h1>Solicitar Suporte Técnico</h1>
          <p>Preencha os dados abaixo de forma curta e direta.</p>
        </div>

        {sucesso && (
          <div className="msg-sucesso" style={{width: '100%'}}>
            ✅ Chamado enviado com sucesso! A equipe de TI já foi notificada.
          </div>
        )}

        <form className="card-form-chamado" onSubmit={enviarChamado}>
          <div className="linha-dupla">
            <div className="form-group-prof">
              <label>Número/Letra do Bloco</label>
              <input type="text" placeholder="Ex: A" value={bloco} onChange={e => setBloco(e.target.value)} required maxLength={10} />
            </div>
            
            <div className="form-group-prof">
              <label>Número da Sala</label>
              <input type="text" placeholder="Ex: 101" value={sala} onChange={e => setSala(e.target.value)} required maxLength={10} />
            </div>
          </div>

          <div className="form-group-prof">
            <label>Descrição do Problema (Seja direto)</label>
            <textarea 
              placeholder="Ex: O projetor não liga. / Ex: Computador do professor sem internet." 
              value={problema} 
              onChange={e => setProblema(e.target.value)} 
              required 
            />
          </div>
          
          <div className={`contador-caracteres ${corContador}`}>
            {caracteresUsados} / {limiteCaracteres} caracteres
          </div>

          <button 
            type="submit" 
            className="btn-enviar-chamado" 
            disabled={enviando || caracteresUsados > limiteCaracteres}
          >
            {enviando ? 'Enviando...' : '🚀 Enviar Solicitação à TI'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default PortalProfessor