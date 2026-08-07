import React, { useMemo, useState } from 'react';
import '../styles/AdminPanel.css';
import BrandLogo from './BrandLogo';
import { resumoEquipe } from '../utils/agregacoes';
import { formatarDataHora } from '../utils/formato';

function CoordinatorGeneralDashboard({ user, equipes, itens, doacoes, onLogout }) {
  const [filtroEquipe, setFiltroEquipe] = useState('');

  const resumos = useMemo(
    () => equipes.map((equipe) => resumoEquipe(equipe, itens, doacoes)),
    [equipes, itens, doacoes]
  );

  // Um card por item, com a equipe como etiqueta — mais fácil de escanear
  // do que uma barra de progresso por equipe inteira.
  const itensComEquipe = useMemo(
    () =>
      resumos.flatMap((resumo) =>
        resumo.itens.map((item) => ({ ...item, equipeNome: resumo.equipe.nome }))
      ),
    [resumos]
  );

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
        <div className="titulo-cabecalho">
          <BrandLogo variante="cabecalho" />
          <h1>👥 Dashboard Coordenador Geral</h1>
        </div>
        <div className="user-info">
          <span>Bem-vindo, {user.nome}!</span>
          <button onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div className="app-main">
        <p className="resumo-compacto">
          📦 {itens.length} item(ns) cadastrado(s) em {equipes.length} equipe(s)
        </p>

        <h2 className="titulo-secao">Situação por Item</h2>
        {itensComEquipe.length === 0 ? (
          <p className="texto-vazio">Nenhum item cadastrado ainda.</p>
        ) : (
          <div className="grade-itens-dash">
            {itensComEquipe.map((item) => (
              <div key={item.id} className="item-dash-card">
                <span className="item-dash-equipe">{item.equipeNome}</span>
                <h4>{item.nome}</h4>
                <div className="item-dash-numeros">
                  <span>
                    Necessário <strong>{item.necessario}</strong>
                  </span>
                  <span>
                    Recebido <strong>{item.recebido}</strong>
                  </span>
                </div>
                <div className="progress-bar mini">
                  <div className="progress-bar-fill" style={{ width: `${item.progresso}%` }} />
                </div>
                <span className={item.faltam > 0 ? 'texto-faltantes' : 'texto-completo'}>
                  {item.faltam > 0 ? `Faltam ${item.faltam}` : '✓ Meta atingida'}
                </span>
              </div>
            ))}
          </div>
        )}

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
