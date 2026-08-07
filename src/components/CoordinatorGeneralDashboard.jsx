import React, { useMemo, useState } from 'react';
import '../styles/AdminPanel.css';
import { resumoEquipe, somaQuantidades, percentual } from '../utils/agregacoes';
import { formatarDataHora } from '../utils/formato';

function CoordinatorGeneralDashboard({ user, equipes, itens, doacoes, onLogout }) {
  const [filtroEquipe, setFiltroEquipe] = useState('');

  const resumos = useMemo(
    () => equipes.map((equipe) => resumoEquipe(equipe, itens, doacoes)),
    [equipes, itens, doacoes]
  );

  const necessarioTotal = somaQuantidades(itens);
  const recebidoTotal = resumos.reduce((total, resumo) => total + resumo.recebido, 0);

  const doacoesFiltradas = useMemo(() => {
    const lista = filtroEquipe
      ? doacoes.filter((doacao) => doacao.equipe_id === filtroEquipe)
      : doacoes;

    return [...lista].sort((a, b) => {
      const dataA = a.data_criacao?.toDate?.() || new Date(a.data_criacao || 0);
      const dataB = b.data_criacao?.toDate?.() || new Date(b.data_criacao || 0);
      return dataB - dataA;
    });
  }, [doacoes, filtroEquipe]);

  return (
    <div className="admin-container">
      <div className="app-header">
        <h1>👥 Dashboard Coordenador Geral</h1>
        <div className="user-info">
          <span>Bem-vindo, {user.nome}!</span>
          <button onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div className="app-main">
        <div className="dashboard-grid">
          <div className="card-info">
            <h3>🎯 Meta Geral</h3>
            <p className="numero">{necessarioTotal}</p>
          </div>
          <div className="card-info">
            <h3>🎁 Recebido</h3>
            <p className="numero">{recebidoTotal}</p>
          </div>
          <div className="card-info">
            <h3>✅ Progresso</h3>
            <p className="numero">{percentual(recebidoTotal, necessarioTotal)}%</p>
          </div>
        </div>

        <h2 className="titulo-secao">Por Equipe</h2>
        <div className="dashboard-grid">
          {resumos.length === 0 && <p className="texto-vazio">Nenhuma equipe cadastrada.</p>}

          {resumos.map((resumo) => (
            <div key={resumo.equipe.id} className="card-info full-width">
              <h3>{resumo.equipe.nome}</h3>
              <p>
                Meta: <strong>{resumo.necessario}</strong> · Recebido:{' '}
                <strong>{resumo.recebido}</strong> · Itens:{' '}
                <strong>{resumo.totalItens}</strong>
              </p>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${resumo.progresso}%` }}>
                  {resumo.progresso}%
                </div>
              </div>
              {resumo.itensFaltando.length > 0 && (
                <p className="texto-faltantes">
                  Faltam:{' '}
                  {resumo.itensFaltando
                    .map((item) => `${item.nome} (${item.faltam})`)
                    .join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="cabecalho-equipe">
          <h2>📊 Todas as Doações</h2>
          <select
            value={filtroEquipe}
            onChange={(evento) => setFiltroEquipe(evento.target.value)}
            className="select-equipe"
          >
            <option value="">Todas as equipes</option>
            {equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </option>
            ))}
          </select>
        </div>

        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Item</th>
              <th>Qtd</th>
              <th>Equipe</th>
              <th>Doador</th>
              <th>Telefone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {doacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan="7" className="celula-vazia">
                  Nenhuma doação recebida ainda
                </td>
              </tr>
            ) : (
              doacoesFiltradas.map((doacao) => {
                const equipe = equipes.find((item) => item.id === doacao.equipe_id);
                return (
                  <tr key={doacao.id}>
                    <td>{formatarDataHora(doacao.data_criacao)}</td>
                    <td>{doacao.item_nome}</td>
                    <td>{doacao.quantidade}</td>
                    <td>{equipe ? equipe.nome : 'Indefinida'}</td>
                    <td>{doacao.doador_nome}</td>
                    <td>{doacao.doador_telefone}</td>
                    <td>
                      {doacao.entregue ? (
                        <span className="badge badge-success">✓ Entregue</span>
                      ) : (
                        <span className="badge badge-warning">⏳ Pendente</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CoordinatorGeneralDashboard;
