import React, { useState, useMemo } from 'react';
import '../styles/AdminPanel.css';
import BrandLogo from './BrandLogo';
import { adicionar, atualizar, remover, mensagemDeErro } from '../services/db';
import { resumoEquipe, doadoresCompartilhados } from '../utils/agregacoes';
import { formatarDataHora, normalizarNome } from '../utils/formato';

function CoordinatorTeamDashboard({ user, equipes, itens, doacoes, onLogout }) {
  // Coordenador de equipe fica preso à própria equipe; admin/geral que caírem
  // aqui podem escolher.
  const equipeFixa = user.equipe_id || '';
  const [equipeSelecionada, setEquipeSelecionada] = useState(
    equipeFixa || equipes[0]?.id || ''
  );

  const [novoItem, setNovoItem] = useState('');
  const [novaQuantidade, setNovaQuantidade] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [dadosEditados, setDadosEditados] = useState({ nome: '', quantidade: '' });
  const [erroMsg, setErroMsg] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  const equipeAtiva = equipeFixa || equipeSelecionada;
  const equipeAtual = equipes.find((equipe) => equipe.id === equipeAtiva);

  const avisar = (sucesso, erro = '') => {
    setSucessoMsg(sucesso);
    setErroMsg(erro);
  };

  const resumo = useMemo(
    () => (equipeAtual ? resumoEquipe(equipeAtual, itens, doacoes) : null),
    [equipeAtual, itens, doacoes]
  );

  const compartilhados = useMemo(
    () => (equipeAtual ? doadoresCompartilhados(doacoes, equipeAtual.id) : []),
    [doacoes, equipeAtual]
  );

  const doacoesEquipe = useMemo(
    () => doacoes.filter((doacao) => doacao.equipe_id === equipeAtiva),
    [doacoes, equipeAtiva]
  );

  const adicionarItem = async () => {
    const nome = novoItem.trim();
    const quantidade = parseInt(novaQuantidade, 10);

    if (!equipeAtiva) {
      avisar('', 'Selecione uma equipe primeiro');
      return;
    }
    if (!nome) {
      avisar('', 'Digite o nome do item');
      return;
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      avisar('', 'Digite uma quantidade maior que zero');
      return;
    }
    const jaExiste = itens.some(
      (item) =>
        item.equipe_id === equipeAtiva && normalizarNome(item.nome) === normalizarNome(nome)
    );
    if (jaExiste) {
      avisar('', `"${nome}" já está na lista desta equipe. Edite a quantidade.`);
      return;
    }

    try {
      setSalvando(true);
      await adicionar('itens', {
        nome,
        quantidade,
        equipe_id: equipeAtiva,
        ativo: true,
        criado_em: new Date(),
      });
      setNovoItem('');
      setNovaQuantidade('');
      avisar('Item adicionado com sucesso!');
    } catch (problema) {
      avisar('', `Erro ao adicionar item: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const salvarItem = async (item) => {
    const nome = dadosEditados.nome.trim();
    const quantidade = parseInt(dadosEditados.quantidade, 10);

    if (!nome) {
      avisar('', 'O nome do item não pode ficar vazio');
      return;
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      avisar('', 'Digite uma quantidade maior que zero');
      return;
    }

    try {
      setSalvando(true);
      await atualizar('itens', item.id, { nome, quantidade, atualizado_em: new Date() });
      setItemEditando(null);
      avisar('Item atualizado!');
    } catch (problema) {
      avisar('', `Erro ao atualizar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const deletarItem = async (item) => {
    const temDoacao = doacoes.some((doacao) => doacao.item_id === item.id);
    if (temDoacao) {
      avisar('', `"${item.nome}" já tem doações registradas e não pode ser apagado.`);
      return;
    }
    if (!window.confirm(`Apagar o item "${item.nome}"?`)) return;

    try {
      setSalvando(true);
      await remover('itens', item.id);
      avisar('Item apagado.');
    } catch (problema) {
      avisar('', `Erro ao apagar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const marcarEntregue = async (doacao, entregue) => {
    try {
      setSalvando(true);
      await atualizar('doacoes', doacao.id, {
        entregue,
        data_entrega: entregue ? new Date() : null,
      });
      avisar(entregue ? 'Doação marcada como entregue!' : 'Doação voltou para pendente.');
    } catch (problema) {
      avisar('', `Erro ao atualizar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  if (!equipeAtual) {
    return (
      <div className="admin-container">
        <div className="app-header">
          <div className="titulo-cabecalho">
            <BrandLogo variante="cabecalho" />
            <h1>👤 Minha Equipe</h1>
          </div>
          <div className="user-info">
            <span>Bem-vindo, {user.nome}!</span>
            <button onClick={onLogout}>Sair</button>
          </div>
        </div>
        <div className="app-main">
          <div className="alerta alerta-aviso">
            {equipes.length === 0
              ? 'Nenhuma equipe cadastrada ainda. Peça ao administrador para criar a sua.'
              : 'Seu acesso não está ligado a nenhuma equipe. Peça ao administrador para ajustar.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="app-header nao-imprimir">
        <div className="titulo-cabecalho">
          <BrandLogo variante="cabecalho" />
          <h1>👤 Minha Equipe</h1>
        </div>
        <div className="user-info">
          <span>Bem-vindo, {user.nome}!</span>
          <button onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div className="app-main">
        {!equipeFixa && (
          <div className="form-secao nao-imprimir">
            <h3>Selecionar Equipe</h3>
            <select
              value={equipeSelecionada}
              onChange={(evento) => setEquipeSelecionada(evento.target.value)}
              className="select-equipe"
            >
              {equipes.map((equipe) => (
                <option key={equipe.id} value={equipe.id}>
                  {equipe.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="cabecalho-equipe">
          <h2>Equipe: {equipeAtual.nome}</h2>
          <button className="btn-secondary nao-imprimir" onClick={() => window.print()}>
            🖨️ Relatório de faltantes
          </button>
        </div>

        <div className="dashboard-grid">
          <div className="card-info">
            <h3>📦 Itens na Lista</h3>
            <p className="numero">{resumo.totalItens}</p>
          </div>

          <div className="card-info">
            <h3>🎯 Meta (quantidade)</h3>
            <p className="numero">{resumo.necessario}</p>
          </div>

          <div className="card-info">
            <h3>🎁 Já Recebido</h3>
            <p className="numero">{resumo.recebido}</p>
          </div>

          <div className="card-info">
            <h3>✅ Progresso</h3>
            <p className="numero">{resumo.progresso}%</p>
          </div>
        </div>

        {resumo.pendentesEntrega > 0 && (
          <div className="alerta alerta-info nao-imprimir">
            ⏳ {resumo.pendentesEntrega} doação(ões) prometida(s) aguardando retirada/entrega.
          </div>
        )}

        {compartilhados.length > 0 && (
          <div className="alerta alerta-aviso nao-imprimir">
            <strong>🚚 Dá para economizar frete:</strong>
            <ul className="lista-alertas">
              {compartilhados.map((doador, indice) => (
                <li key={`${doador.telefone}-${indice}`}>
                  <strong>{doador.nome}</strong> ({doador.telefone}) também tem doação para{' '}
                  {[
                    ...new Set(
                      doador.outrasEquipes.map((doacao) => {
                        const outra = equipes.find((equipe) => equipe.id === doacao.equipe_id);
                        return outra ? outra.nome : 'outra equipe';
                      })
                    ),
                  ].join(', ')}
                  . Combine uma coleta só.
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-secao nao-imprimir">
          <h3>Adicionar Item</h3>
          <div className="form-linha">
            <input
              type="text"
              value={novoItem}
              onChange={(evento) => setNovoItem(evento.target.value)}
              onKeyDown={(evento) => evento.key === 'Enter' && adicionarItem()}
              placeholder="Nome do item (ex: Arroz kg)"
            />
            <input
              type="number"
              min="1"
              value={novaQuantidade}
              onChange={(evento) => setNovaQuantidade(evento.target.value)}
              onKeyDown={(evento) => evento.key === 'Enter' && adicionarItem()}
              placeholder="Qtd"
              className="input-quantidade"
            />
            <button className="btn-primary" onClick={adicionarItem} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>

        {sucessoMsg && <div className="alerta alerta-sucesso nao-imprimir">{sucessoMsg}</div>}
        {erroMsg && <div className="alerta alerta-erro nao-imprimir">{erroMsg}</div>}

        <h3 className="titulo-secao">Itens Necessários</h3>
        <table className="tabela">
          <thead>
            <tr>
              <th>Item</th>
              <th>Necessário</th>
              <th>Recebido</th>
              <th>Faltam</th>
              <th className="nao-imprimir">Ações</th>
            </tr>
          </thead>
          <tbody>
            {resumo.itens.length === 0 ? (
              <tr>
                <td colSpan="5" className="celula-vazia">
                  Nenhum item cadastrado
                </td>
              </tr>
            ) : (
              resumo.itens.map((item) => {
                const emEdicao = itemEditando === item.id;
                return (
                  <tr key={item.id}>
                    <td>
                      {emEdicao ? (
                        <input
                          type="text"
                          value={dadosEditados.nome}
                          onChange={(evento) =>
                            setDadosEditados({ ...dadosEditados, nome: evento.target.value })
                          }
                          autoFocus
                        />
                      ) : (
                        item.nome
                      )}
                    </td>
                    <td>
                      {emEdicao ? (
                        <input
                          type="number"
                          min="1"
                          value={dadosEditados.quantidade}
                          onChange={(evento) =>
                            setDadosEditados({
                              ...dadosEditados,
                              quantidade: evento.target.value,
                            })
                          }
                          className="input-quantidade"
                        />
                      ) : (
                        item.necessario
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{item.recebido}</span>
                    </td>
                    <td>
                      {item.faltam > 0 ? (
                        <span className="badge badge-danger">{item.faltam}</span>
                      ) : (
                        <span className="badge badge-success">✓ Completo</span>
                      )}
                    </td>
                    <td className="celula-acoes nao-imprimir">
                      {emEdicao ? (
                        <>
                          <button
                            className="btn-success btn-mini"
                            onClick={() => salvarItem(item)}
                            disabled={salvando}
                          >
                            Salvar
                          </button>
                          <button
                            className="btn-secondary btn-mini"
                            onClick={() => setItemEditando(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-secondary btn-mini"
                            onClick={() => {
                              setItemEditando(item.id);
                              setDadosEditados({
                                nome: item.nome,
                                quantidade: String(item.necessario),
                              });
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-danger btn-mini"
                            onClick={() => deletarItem(item)}
                            disabled={salvando}
                          >
                            Apagar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <h3 className="titulo-secao nao-imprimir">Doações Recebidas</h3>
        <table className="tabela nao-imprimir">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd</th>
              <th>Doador</th>
              <th>Telefone</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {doacoesEquipe.length === 0 ? (
              <tr>
                <td colSpan="7" className="celula-vazia">
                  Nenhuma doação recebida ainda
                </td>
              </tr>
            ) : (
              doacoesEquipe.map((doacao) => (
                <tr key={doacao.id}>
                  <td>{doacao.item_nome}</td>
                  <td>{doacao.quantidade}</td>
                  <td>{doacao.doador_nome}</td>
                  <td>{doacao.doador_telefone}</td>
                  <td>{formatarDataHora(doacao.data_criacao)}</td>
                  <td>
                    {doacao.entregue ? (
                      <span className="badge badge-success">✓ Entregue</span>
                    ) : (
                      <span className="badge badge-warning">⏳ Pendente</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={doacao.entregue ? 'btn-secondary btn-mini' : 'btn-success btn-mini'}
                      onClick={() => marcarEntregue(doacao, !doacao.entregue)}
                      disabled={salvando}
                    >
                      {doacao.entregue ? 'Desfazer' : 'Marcar Entregue'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CoordinatorTeamDashboard;
