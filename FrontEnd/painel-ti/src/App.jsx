import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

function App() {
  // ==========================================
  // ESTADOS DO SISTEMA E AUTENTICAÇÃO (SESSÃO TEMPORÁRIA)
  // ==========================================
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem('usuario_logado') === 'true')
  const [perfilAtivo, setPerfilAtivo] = useState(() => sessionStorage.getItem('perfil_usuario') || 'usuario')
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState(() => sessionStorage.getItem('nome_usuario') || '')
  
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')

  const [chamados, setChamados] = useState([])
  const [temperaturas, setTemperaturas] = useState([])
  const [abaAtiva, setAbaAtiva] = useState('home')

  // Estados para Gestão de Usuários (Aba Admin)
  const [listaUsuarios, setListaUsuarios] = useState([])
  const [novoUserNome, setNovoUserNome] = useState('')
  const [novoUserSenha, setNovoUserSenha] = useState('')
  const [novoUserPerfil, setNovoUserPerfil] = useState('usuario')

  // Estados para Troca de Senha (Aba Perfil)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [msgPerfil, setMsgPerfil] = useState({ tipo: '', texto: '' })

  // ==========================================
  // FUNÇÕES DE LOGIN VIA BANCO DE DADOS
  // ==========================================
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
        
        // MÁGICA DO CONTROLE DE ACESSO: Trava para Professores
        if (dados.perfil === 'professor') {
          setErroLogin('Acesso negado. Professores devem acessar o Portal do Docente (/professor).');
          return; // Interrompe a função aqui, impedindo o login!
        }

        setAutenticado(true)
        setPerfilAtivo(dados.perfil)
        setNomeUsuarioLogado(dados.username)
        
        sessionStorage.setItem('usuario_logado', 'true')
        sessionStorage.setItem('nome_usuario', dados.username)
        sessionStorage.setItem('perfil_usuario', dados.perfil)
      } else {
        setErroLogin(dados.mensagem || 'Credenciais inválidas.')
      }
    } catch (erro) {
      console.error("Erro na comunicação de login:", erro)
      setErroLogin('Sem conexão com o servidor.')
    }
  }

  const fazerLogout = () => {
    setAutenticado(false)
    sessionStorage.removeItem('usuario_logado')
    sessionStorage.removeItem('nome_usuario')
    sessionStorage.removeItem('perfil_usuario')
    setUsuario('')
    setSenha('')
    setAbaAtiva('home')
  }

  // ==========================================
  // BUSCA DE DADOS (API)
  // ==========================================
  const carregarDados = async () => {
    if (!autenticado) return; 

    try {
      const resChamados = await fetch('http://192.168.1.50:5000/chamados')
      setChamados(await resChamados.json())

      const resTemp = await fetch('http://192.168.1.50:5000/temperaturas')
      setTemperaturas(await resTemp.json())

      if (perfilAtivo === 'admin') {
        const resUsers = await fetch('http://192.168.1.50:5000/usuarios')
        setListaUsuarios(await resUsers.json())
      }
    } catch (erro) {
      console.error("Erro ao conectar no servidor:", erro)
    }
  }

  useEffect(() => {
    carregarDados()
    const intervalo = setInterval(carregarDados, 5000)
    return () => clearInterval(intervalo)
  }, [autenticado, perfilAtivo]) 

  // ==========================================
  // AÇÕES DO SISTEMA E USUÁRIOS
  // ==========================================
  const resolverChamado = async (id) => {
    try {
      const resposta = await fetch(`http://192.168.1.50:5000/chamado/${id}`, { method: 'PUT' });
      if (resposta.ok) carregarDados();
    } catch (erro) {
      console.error("Erro ao atualizar chamado:", erro);
    }
  }

  const cadastrarUsuario = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://192.168.1.50:5000/usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: novoUserNome, password: novoUserSenha, perfil: novoUserPerfil })
      })
      const dados = await res.json()
      
      if (res.ok) {
        alert("Usuário cadastrado com sucesso!");
        setNovoUserNome(''); 
        setNovoUserSenha(''); 
        setNovoUserPerfil('usuario'); // Reseta para o padrão
        carregarDados();
      } else {
        alert("Erro: " + dados.erro);
      }
    } catch (erro) {
      alert("Erro ao criar usuário.");
    }
  }

  const excluirUsuario = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o usuário "${nome}"?`)) {
      return;
    }

    try {
      const res = await fetch(`http://192.168.1.50:5000/usuario/${id}`, {
        method: 'DELETE'
      });
      const dados = await res.json();
      
      if (res.ok) {
        carregarDados(); 
      } else {
        alert("Erro: " + dados.erro);
      }
    } catch (erro) {
      alert("Erro ao excluir usuário.");
    }
  }

  const trocarSenha = async (e) => {
    e.preventDefault()
    setMsgPerfil({ tipo: '', texto: '' })
    
    try {
      const res = await fetch('http://192.168.1.50:5000/usuario/alterar-senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nomeUsuarioLogado, senha_atual: senhaAtual, nova_senha: novaSenha })
      })
      const dados = await res.json()
      
      setMsgPerfil({ tipo: res.ok ? 'sucesso' : 'erro', texto: dados.mensagem })
      if (res.ok) {
        setSenhaAtual('')
        setNovaSenha('')
      }
    } catch (erro) {
      setMsgPerfil({ tipo: 'erro', texto: 'Erro de conexão com o servidor.' })
    }
  }

  // ==========================================
  // LÓGICAS E CÁLCULOS
  // ==========================================
  const chamadosPendentes = chamados.filter(c => c.status === 'Pendente')
  const chamadosResolvidos = chamados.filter(c => c.status === 'Resolvido')
  const historicoChamados = [...chamados].reverse() 

  const temperaturaAtual = temperaturas.length > 0 ? temperaturas[temperaturas.length - 1].graus : '--'
  const dadosGrafico = temperaturas.slice(-15).map(t => ({
    horario: t.data_leitura.split(' ')[1] || '',
    temperatura: t.graus
  }))
  const grausArray = temperaturas.map(t => t.graus)
  const tempMax = grausArray.length > 0 ? Math.max(...grausArray) : '--'
  const tempMin = grausArray.length > 0 ? Math.min(...grausArray) : '--'

  const isAlertaTermico = temperaturaAtual !== '--' && parseFloat(temperaturaAtual) > 26;

  const gerarLogs = () => {
    const logs = []
    logs.push({ id: 1, tipo: 'info', msg: 'Servidor de monitoramento online na porta 5000.' })
    if (temperaturas.length === 0) {
      logs.push({ id: 2, tipo: 'erro', msg: 'CRÍTICO: Sem comunicação com o ESP32_Temperatura.' })
    } else {
      logs.push({ id: 2, tipo: 'sucesso', msg: `Pacote de dados recebido do ESP32 com sucesso. (${temperaturaAtual}°C)` })
      if (temperaturaAtual > 26) {
        logs.push({ id: 3, tipo: 'aviso', msg: 'ALERTA: Temperatura do Rack excedeu 26°C!' })
      }
    }
    return logs
  }

  // ==========================================
  // TELA DE LOGIN 
  // ==========================================
  if (!autenticado) {
    return (
      <div className="login-view">
        <div className="login-card">
          <div className="login-logo">
            <span className="logo-icon-grande">⚡</span>
            <h2>Monitor TI</h2>
            <p>Acesso Restrito</p>
          </div>
          
          <form className="login-form" onSubmit={fazerLogin}>
            {erroLogin && <div className="msg-erro">{erroLogin}</div>}
            
            <div className="form-group">
              <label>Usuário</label>
              <input 
                type="text" 
                placeholder="Digite seu usuário" 
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>Senha</label>
              <input 
                type="password" 
                placeholder="Digite sua senha" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            
            <button type="submit" className="btn-login">Entrar no Sistema</button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // TELA DO SISTEMA 
  // ==========================================
  return (
    <div className="layout-app">
      <header className="topbar">
        <div className="logo-area">
          <span className="logo-icon">⚡</span>
          <h2>Monitor TI</h2>
        </div>
        <nav className="menu-navegacao">
          <button className={abaAtiva === 'home' ? 'ativo' : ''} onClick={() => setAbaAtiva('home')}>Home</button>
          <button className={abaAtiva === 'chamados' ? 'ativo' : ''} onClick={() => setAbaAtiva('chamados')}>Chamados</button>
          <button className={abaAtiva === 'temperatura' ? 'ativo' : ''} onClick={() => setAbaAtiva('temperatura')}>Temperatura Rack</button>
          
          {perfilAtivo === 'admin' && (
            <button className={abaAtiva === 'admin' ? 'ativo' : ''} onClick={() => setAbaAtiva('admin')}>Painel Admin</button>
          )}
          
          <button className={abaAtiva === 'perfil' ? 'ativo' : ''} onClick={() => setAbaAtiva('perfil')}>Meu Perfil</button>
          <button className="btn-sair" onClick={fazerLogout}>Sair 🚪</button>
        </nav>
      </header>

      {isAlertaTermico && (
        <div className="alerta-global-banner">
          <span className="alerta-icone">⚠️</span>
          <div className="alerta-texto">
            <strong>ALERTA CRÍTICO DE TEMPERATURA:</strong> O Rack atingiu {Number(temperaturaAtual).toFixed(1)}°C. Verifique a refrigeração do ambiente imediatamente!
          </div>
        </div>
      )}

      <main className="conteudo-principal">
        
        {abaAtiva === 'home' && (
          <div className="view-home">
            <header className="cabecalho-view">
              <h1>Visão Geral do Sistema</h1>
              <p>Resumo em tempo real da sua infraestrutura</p>
            </header>
            <div className="cards-resumo">
              <div className="card-kpi chamados">
                <div className="kpi-icone">📋</div>
                <div className="kpi-info">
                  <h3>Chamados Pendentes</h3>
                  <span className="kpi-valor">{chamadosPendentes.length}</span>
                </div>
              </div>
              <div className="card-kpi temperatura">
                <div className="kpi-icone">🌡️</div>
                <div className="kpi-info">
                  <h3>Temperatura Atual (Rack)</h3>
                  <span className="kpi-valor">{Number(temperaturaAtual).toFixed(1)}°C</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'chamados' && (
          <div className="view-chamados">
            <header className="cabecalho-view">
              <div className="titulo-com-badge">
                <h1>Painel de Atendimento</h1>
                <span className="badge-total">{chamadosPendentes.length} Pendentes</span>
              </div>
            </header>

            <div className="grid-helpdesk">
              <div className="secao-fila">
                <h2 className="titulo-secao">Fila de Atendimento</h2>
                {chamadosPendentes.length === 0 ? (
                  <div className="estado-vazio">
                    <span>🎉</span><p>Nenhum chamado pendente.</p>
                  </div>
                ) : (
                  <div className="lista-cards-chamados">
                    {chamadosPendentes.map(chamado => (
                      <div key={chamado.id} className="card-ticket">
                        <div className="ticket-header">
                          <span className="ticket-id">#TICKET-00{chamado.id}</span>
                          <span className="badge-status pendente">● {chamado.status}</span>
                        </div>
                        <h3 className="ticket-titulo">{chamado.titulo}</h3>
                        <p className="ticket-desc">{chamado.descricao}</p>
                        <div className="ticket-footer">
                          <span className="ticket-data">🕒 Aberto em: {chamado.data_criacao}</span>
                          <button className="btn-resolver" onClick={() => resolverChamado(chamado.id)}>✓ Marcar como Resolvido</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="secao-historico">
                <h2 className="titulo-secao">Últimos Registros Gerais</h2>
                <div className="feed-historico">
                  {historicoChamados.map(chamado => (
                    <div key={`hist-${chamado.id}`} className="item-historico">
                      <div className={`indicador-status ${chamado.status.toLowerCase()}`}></div>
                      <div className="historico-info">
                        <strong>{chamado.titulo}</strong>
                        <span>{chamado.data_criacao}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="secao-resolvidos">
              <h2 className="titulo-secao">Histórico de Chamados Resolvidos</h2>
              {chamadosResolvidos.length === 0 ? (
                <p className="texto-vazio">Nenhum chamado resolvido ainda.</p>
              ) : (
                <div className="grid-resolvidos">
                  {chamadosResolvidos.map(chamado => (
                    <div key={`res-${chamado.id}`} className="card-ticket resolvido">
                      <div className="ticket-header">
                        <span className="ticket-id">#TICKET-00{chamado.id}</span>
                        <span className="badge-status resolvido">✓ {chamado.status}</span>
                      </div>
                      <h3 className="ticket-titulo">{chamado.titulo}</h3>
                      <p className="ticket-desc">{chamado.descricao}</p>
                      <div className="ticket-footer">
                        <span className="ticket-data">🕒 Resolvido</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'temperatura' && (
          <div className="view-temperatura">
             <div className="titulo-com-badge">
                <h1>Monitoramento do Rack</h1>
                <span className={`badge-status-rede ${temperaturas.length > 0 ? 'online' : 'offline'}`}>
                  {temperaturas.length > 0 ? '● ESP32 Online' : '○ ESP32 Offline'}
                </span>
              </div>
              <div className="layout-vertical-rack">
                <div className="cards-kpi-rack">
                  <div className="kpi-mini"><span>Mínima Diária</span><strong>{tempMin}°C</strong></div>
                  <div className="kpi-mini destaque"><span>Temperatura Atual</span><strong className={temperaturaAtual > 26 ? 'alerta' : ''}>{Number(temperaturaAtual).toFixed(1)}°C</strong></div>
                  <div className="kpi-mini"><span>Máxima Diária</span><strong>{tempMax}°C</strong></div>
                </div>
                <div className="grafico-container">
                  <h2 className="titulo-secao">Tendência Térmica</h2>
                  <div className="area-grafico">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosGrafico} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="horario" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                        <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Line type="monotone" dataKey="temperatura" stroke={temperaturaAtual > 26 ? "#ef4444" : "#3b82f6"} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="secao-logs-rack-full">
                  <h2 className="titulo-secao">Syslog & Eventos</h2>
                  <div className="terminal-log">
                    <div className="terminal-header"><span>root@servidor-ti:~</span></div>
                    <div className="terminal-body-horizontal">
                      {gerarLogs().map((log, index) => (
                        <div key={index} className="log-linha"><span className="log-hora">[{new Date().toLocaleTimeString()}]</span><span className={`log-msg ${log.tipo}`}> {log.msg}</span></div>
                      ))}
                      <span className="cursor-pisca">_</span>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}

        {abaAtiva === 'admin' && perfilAtivo === 'admin' && (
          <div className="view-admin">
            <header className="cabecalho-view">
              <h1>Gerenciamento de Usuários</h1>
              <p>Crie e gerencie os acessos ao sistema de monitoramento.</p>
            </header>

            <div className="grid-admin">
              <form className="card-form-admin" onSubmit={cadastrarUsuario}>
                <h3 className="titulo-secao">Novo Usuário</h3>
                
                <div className="form-group">
                  <label>Nome de Usuário</label>
                  <input type="text" placeholder="Ex: tecnico1 ou prof_matematica" value={novoUserNome} onChange={e => setNovoUserNome(e.target.value)} required />
                </div>
                
                <div className="form-group" style={{marginTop: '10px'}}>
                  <label>Senha Provisória</label>
                  <input type="password" placeholder="Senha segura" value={novoUserSenha} onChange={e => setNovoUserSenha(e.target.value)} required />
                </div>
                
                <div className="form-group" style={{marginTop: '10px'}}>
                  <label>Nível de Acesso (Perfil)</label>
                  <select 
                    style={{padding: '12px 15px', border: '1px solid #cbd5e1', borderRadius: '8px'}} 
                    value={novoUserPerfil} 
                    onChange={e => setNovoUserPerfil(e.target.value)}
                  >
                    <option value="usuario">Técnico (Apenas Monitoramento TI)</option>
                    <option value="professor">Professor (Apenas Portal do Docente)</option>
                    <option value="admin">Administrador (Acesso Total)</option>
                  </select>
                </div>
                
                <button type="submit" className="btn-login" style={{marginTop: '20px'}}>Cadastrar Conta</button>
              </form>

              <div className="lista-usuarios card-form-admin">
                <h3 className="titulo-secao">Usuários Cadastrados ({listaUsuarios.length})</h3>
                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {listaUsuarios.map(u => (
                    <div key={u.id} className="item-user-lista" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                      <div>
                        <strong style={{color: '#334155'}}>{u.username}</strong> 
                        <small style={{
                          background: u.perfil === 'admin' ? '#fee2e2' : u.perfil === 'professor' ? '#fef3c7' : '#e2e8f0', 
                          color: u.perfil === 'admin' ? '#b91c1c' : u.perfil === 'professor' ? '#d97706' : '#475569',
                          marginLeft: '8px'
                        }}>
                          {u.perfil}
                        </small>
                      </div>
                      
                      {u.username !== 'admin' && (
                        <button 
                          onClick={() => excluirUsuario(u.id, u.username)}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444', 
                            fontSize: '1.2rem', cursor: 'pointer', padding: '5px'
                          }}
                          title="Excluir Usuário"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'perfil' && (
          <div className="view-perfil">
            <header className="cabecalho-view">
              <h1>Configurações de Conta</h1>
              <p>Gerencie sua segurança e senha.</p>
            </header>

            <div className="card-perfil card-form-admin" style={{maxWidth: '500px'}}>
              <h3 className="titulo-secao">Alterar Minha Senha</h3>
              <p style={{marginBottom: '20px'}}>Usuário logado: <strong style={{color: '#3b82f6'}}>{nomeUsuarioLogado}</strong></p>
              
              {msgPerfil.texto && (
                <div className={msgPerfil.tipo === 'sucesso' ? 'msg-sucesso' : 'msg-erro'} style={{marginBottom: '15px', padding: '10px', borderRadius: '6px', textAlign: 'center'}}>
                  {msgPerfil.texto}
                </div>
              )}

              <form onSubmit={trocarSenha} className="login-form">
                <div className="form-group">
                  <label>Senha Atual</label>
                  <input type="password" placeholder="Digite a senha atual" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label>Nova Senha</label>
                  <input type="password" placeholder="Digite a nova senha segura" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required />
                </div>
                
                <button type="submit" className="btn-login" style={{backgroundColor: '#10b981', marginTop: '10px'}}>Atualizar Senha Segura</button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App