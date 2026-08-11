import React, { useMemo, useState } from 'react';
import '../styles/AdminPanel.css';
import BrandLogo from './BrandLogo';
import RelatorioPorEquipe from './RelatorioPorEquipe';
import DetalheDoadorModal from './DetalheDoadorModal';
import { resumoEquipe } from '../utils/agregacoes';
import { formatarDataHora, formatarQuantidadeUnidade } from '../utils/formato';

function CoordinatorGeneralDashboard({ user, equipes, itens, doacoes, onLogout }) {
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const [doadorSelecionado, setDoadorSelecionado] = useState(null);

  const resumos = useMemo(
    () => equipes.map((equipe) => resumoEquipe(equipe, itens, doacoes)),
    [equipes, itens, doacoes]
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
      <div className="app-header nao-imprimir">
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
        <p className="resumo-compacto nao-imprimir">
          📦 {itens.length} item(ns) cadastrado(s) em {equipes.length} equipe(s)
        </p>

        <RelatorioPorEquipe resumos={resumos} />

        <div className="cabecalho-equipe nao-imprimir">
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

        <table className="tabela nao-imprimir">
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
                    <td>{formatarQuantidadeUnidade(doacao.quantidade, doacao.item_unidade)}</td>
                    <td>{equipe ? equipe.nome : 'Indefinida'}</td>
                    <td>
                      <button
                        className="link-doador"
                        onClick={() => setDoadorSelecionado(doacao)}
                      >
                        {doacao.doador_nome}
                      </button>
                    </td>
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

      <DetalheDoadorModal
        doacao={doadorSelecionado}
        onFechar={() => setDoadorSelecionado(null)}
      />
    </div>
  );
}

export default CoordinatorGeneralDashboard;
