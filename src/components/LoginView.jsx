import React, { useState } from 'react';
import '../styles/LoginView.css';
import { criarCoordenador, pinConfere, sessaoDoCoordenador } from '../services/auth';
import { mensagemDeErro } from '../services/db';
import { pinValido, rotuloTipo } from '../utils/formato';

function LoginView({ coordenadores, onLogin, onVirarDoador }) {
  const [tipo, setTipo] = useState(null); // admin, coord-geral, coord-equipe
  const [coordenadorId, setCoordenadorId] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [entrando, setEntrando] = useState(false);

  // Primeiro acesso: nenhum coordenador cadastrado ainda.
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [pinAdmin, setPinAdmin] = useState('');
  const [pinAdminConfirma, setPinAdminConfirma] = useState('');

  const ativos = coordenadores.filter((coordenador) => coordenador.ativo !== false);
  const doTipo = ativos.filter((coordenador) => coordenador.tipo === tipo);
  const semCadastro = coordenadores.length === 0;

  const limpar = () => {
    setTipo(null);
    setCoordenadorId('');
    setPin('');
    setErro('');
    setAviso('');
  };

  const handleLogin = async () => {
    setErro('');
    setAviso('');

    if (!coordenadorId) {
      setErro('Selecione seu nome');
      return;
    }
    if (!pin) {
      setErro('Digite o PIN');
      return;
    }

    const coordenador = coordenadores.find((registro) => registro.id === coordenadorId);
    if (!coordenador) {
      setErro('Cadastro não encontrado. Atualize a página e tente de novo.');
      return;
    }
    if (coordenador.ativo === false) {
      setErro('Este acesso está desativado. Fale com o administrador.');
      return;
    }

    try {
      setEntrando(true);
      const confere = await pinConfere(pin, coordenador);
      if (!confere) {
        setErro('PIN incorreto');
        setPin('');
        return;
      }
      onLogin(sessaoDoCoordenador(coordenador));
    } catch (problema) {
      setErro(mensagemDeErro(problema));
    } finally {
      setEntrando(false);
    }
  };

  const handleCriarPrimeiroAdmin = async () => {
    setErro('');

    if (!nomeAdmin.trim()) {
      setErro('Digite o nome do administrador');
      return;
    }
    if (!pinValido(pinAdmin)) {
      setErro('O PIN deve ter de 4 a 6 dígitos');
      return;
    }
    if (pinAdmin !== pinAdminConfirma) {
      setErro('Os PINs não conferem');
      return;
    }

    try {
      setEntrando(true);
      const id = await criarCoordenador({
        nome: nomeAdmin,
        tipo: 'admin',
        pin: pinAdmin,
      });
      onLogin({ id, nome: nomeAdmin.trim(), tipo: 'admin', equipe_id: null });
    } catch (problema) {
      setErro(mensagemDeErro(problema));
    } finally {
      setEntrando(false);
    }
  };

  const cabecalho = (
    <div className="logo-section">
      <h1>Coleta de Doações</h1>
      <p>II Encontro de Jovens com Cristo</p>
      <p className="subtitulo">Paróquia Nossa Senhora de Guadalupe</p>
    </div>
  );

  if (semCadastro) {
    return (
      <div className="login-container">
        <div className="login-card">
          {cabecalho}

          <div className="login-formulario">
            <h2>Primeiro acesso</h2>
            <p className="texto-apoio">
              Ainda não existe nenhum coordenador cadastrado. Crie o acesso do administrador
              para começar.
            </p>

            <div className="formulario-grupo">
              <label>Nome do administrador</label>
              <input
                type="text"
                value={nomeAdmin}
                onChange={(evento) => setNomeAdmin(evento.target.value)}
                placeholder="Ex: Pablo"
              />
            </div>

            <div className="formulario-grupo">
              <label>Criar PIN (4 a 6 dígitos)</label>
              <input
                type="password"
                inputMode="numeric"
                value={pinAdmin}
                onChange={(evento) => setPinAdmin(evento.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="****"
              />
            </div>

            <div className="formulario-grupo">
              <label>Repetir o PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pinAdminConfirma}
                onChange={(evento) =>
                  setPinAdminConfirma(evento.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="****"
                onKeyDown={(evento) => evento.key === 'Enter' && handleCriarPrimeiroAdmin()}
              />
            </div>

            {erro && <div className="alerta alerta-erro">{erro}</div>}

            <button
              className="btn-primary"
              onClick={handleCriarPrimeiroAdmin}
              disabled={entrando}
            >
              {entrando ? 'Criando...' : 'Criar acesso e entrar'}
            </button>

            <button className="btn-secondary" onClick={onVirarDoador}>
              Só quero fazer uma doação
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tipo) {
    return (
      <div className="login-container">
        <div className="login-card">
          {cabecalho}

          <div className="login-formulario">
            <h2>Acesso {rotuloTipo(tipo)}</h2>

            {doTipo.length === 0 ? (
              <>
                <div className="alerta alerta-aviso">
                  Nenhum {rotuloTipo(tipo).toLowerCase()} cadastrado. Peça ao administrador
                  para criar o seu acesso.
                </div>
                <button className="btn-secondary" onClick={limpar}>
                  Voltar
                </button>
              </>
            ) : (
              <>
                <div className="formulario-grupo">
                  <label>Seu Nome</label>
                  <select
                    value={coordenadorId}
                    onChange={(evento) => setCoordenadorId(evento.target.value)}
                  >
                    <option value="">-- Selecione --</option>
                    {doTipo.map((coordenador) => (
                      <option key={coordenador.id} value={coordenador.id}>
                        {coordenador.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="formulario-grupo">
                  <label>PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(evento) => setPin(evento.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Digite o PIN"
                    onKeyDown={(evento) => evento.key === 'Enter' && handleLogin()}
                  />
                </div>

                {erro && <div className="alerta alerta-erro">{erro}</div>}
                {aviso && <div className="alerta alerta-info">{aviso}</div>}

                <button className="btn-primary" onClick={handleLogin} disabled={entrando}>
                  {entrando ? 'Entrando...' : 'Entrar'}
                </button>

                <button
                  className="link-esqueci"
                  onClick={() =>
                    setAviso(
                      'Peça ao administrador para redefinir seu PIN no painel, aba Coordenadores.'
                    )
                  }
                >
                  Esqueci meu PIN
                </button>

                <button className="btn-secondary" onClick={limpar}>
                  Voltar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {cabecalho}

        <div className="opcoes">
          <button className="opcao-card admin" onClick={() => setTipo('admin')}>
            <span className="icone">⚙️</span>
            <span className="titulo">Administrador</span>
            <span className="descricao">Gerenciar equipes e doações</span>
          </button>

          <button className="opcao-card coord-geral" onClick={() => setTipo('coord-geral')}>
            <span className="icone">👥</span>
            <span className="titulo">Coordenador Geral</span>
            <span className="descricao">Visualizar todas as equipes</span>
          </button>

          <button className="opcao-card coord-equipe" onClick={() => setTipo('coord-equipe')}>
            <span className="icone">👤</span>
            <span className="titulo">Coordenador de Equipe</span>
            <span className="descricao">Gerenciar minha equipe</span>
          </button>

          <button className="opcao-card doador" onClick={onVirarDoador}>
            <span className="icone">🎁</span>
            <span className="titulo">Fazer Doação</span>
            <span className="descricao">Sem login necessário</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginView;
