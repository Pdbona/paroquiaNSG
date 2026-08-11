import React, { useState, useEffect } from 'react';
import './App.css';
import { assinarColecao, MODO_MOCK, CONFIG_AUSENTE, mensagemDeErro } from './services/db';
import { garantirSessaoAnonima } from './services/auth';

// Componentes
import LoginView from './components/LoginView';
import AdminPanel from './components/AdminPanel';
import CoordinatorGeneralDashboard from './components/CoordinatorGeneralDashboard';
import CoordinatorTeamDashboard from './components/CoordinatorTeamDashboard';
import DonorForm from './components/DonorForm';

function ordenarPorNome(registros) {
  return [...registros].sort((a, b) =>
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  );
}

function App() {
  const [view, setView] = useState('login'); // login, admin, coord-geral, coord-equipe, doador
  const [user, setUser] = useState(null);
  const [equipes, setEquipes] = useState([]);
  const [itens, setItens] = useState([]);
  const [doacoes, setDoacoes] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Dados públicos (catálogo e lista de coordenadores para a tela de login).
  // onSnapshot mantém tudo sincronizado em tempo real entre os aparelhos.
  useEffect(() => {
    if (CONFIG_AUSENTE) {
      setLoading(false);
      return undefined;
    }

    const carregadas = new Set();
    const marcarCarregada = (nome) => {
      carregadas.add(nome);
      if (carregadas.size === 3) setLoading(false);
    };
    const aoFalhar = (problema) => {
      setErro(mensagemDeErro(problema));
      setLoading(false);
    };

    let ativo = true;
    let cancelamentos = [];

    // A sessão anônima precisa existir ANTES das leituras, senão as regras
    // que exigem autenticação recusam a primeira consulta.
    garantirSessaoAnonima().then(() => {
      if (!ativo) return;

      cancelamentos = [
        assinarColecao('equipes', (dados) => {
          setEquipes(ordenarPorNome(dados));
          marcarCarregada('equipes');
        }, aoFalhar),

        assinarColecao('itens', (dados) => {
          setItens(ordenarPorNome(dados));
          marcarCarregada('itens');
        }, aoFalhar),

        assinarColecao('coordenadores', (dados) => {
          setCoordenadores(ordenarPorNome(dados));
          marcarCarregada('coordenadores');
        }, aoFalhar),
      ];
    });

    return () => {
      ativo = false;
      cancelamentos.forEach((cancelar) => cancelar());
    };
  }, []);

  // As doações têm nome, telefone e endereço dos doadores. Só são baixadas
  // depois do login — a tela pública do doador não precisa delas.
  useEffect(() => {
    if (!user || CONFIG_AUSENTE) {
      setDoacoes([]);
      return undefined;
    }

    return assinarColecao(
      'doacoes',
      (dados) => setDoacoes(dados),
      (problema) => setErro(mensagemDeErro(problema))
    );
  }, [user]);

  const handleLogin = (usuario) => {
    setUser(usuario);
    setErro(null);

    if (usuario.tipo === 'admin') {
      setView('admin');
    } else if (usuario.tipo === 'coord-geral') {
      setView('coord-geral');
    } else if (usuario.tipo === 'coord-equipe') {
      setView('coord-equipe');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  const handleVirarDoador = () => {
    setUser(null);
    setView('doador');
  };

  if (CONFIG_AUSENTE) {
    return (
      <div className="container-erro">
        <h2>⚠️ Firebase não configurado</h2>
        <p>
          As variáveis <code>REACT_APP_FIREBASE_*</code> não chegaram na build.
        </p>
        <p className="detalhe-erro">
          Em desenvolvimento: copie <code>.env.example</code> para <code>.env.local</code> e
          preencha as chaves do projeto ParoquiaNSG.
          <br />
          Em produção: confira os secrets do repositório usados pelo GitHub Actions.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-carregamento">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="container-erro">
        <h2>⚠️ Erro</h2>
        <p>{erro}</p>
        <button onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    );
  }

  const conteudo = () => {
    switch (view) {
      case 'doador':
        return (
          <DonorForm
            equipes={equipes}
            itens={itens}
            onVoltar={() => setView('login')}
          />
        );

      case 'admin':
        return (
          <AdminPanel
            user={user}
            equipes={equipes}
            itens={itens}
            doacoes={doacoes}
            coordenadores={coordenadores}
            onLogout={handleLogout}
          />
        );

      case 'coord-geral':
        return (
          <CoordinatorGeneralDashboard
            user={user}
            equipes={equipes}
            itens={itens}
            doacoes={doacoes}
            onLogout={handleLogout}
          />
        );

      case 'coord-equipe':
        return (
          <CoordinatorTeamDashboard
            user={user}
            equipes={equipes}
            itens={itens}
            doacoes={doacoes}
            onLogout={handleLogout}
          />
        );

      case 'login':
      default:
        return (
          <LoginView
            coordenadores={coordenadores}
            onLogin={handleLogin}
            onVirarDoador={handleVirarDoador}
          />
        );
    }
  };

  return (
    <>
      {MODO_MOCK && (
        <div className="faixa-mock">
          MODO DEMONSTRAÇÃO — sem .env.local, os dados são fictícios e somem ao recarregar
        </div>
      )}
      {conteudo()}
    </>
  );
}

export default App;
