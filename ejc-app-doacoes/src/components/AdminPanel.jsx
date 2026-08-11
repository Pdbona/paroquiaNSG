import React, { useState } from 'react';
import '../styles/AdminPanel.css';
import BrandLogo from './BrandLogo';
import RelatorioPorEquipe from './RelatorioPorEquipe';
import DetalheDoadorModal from './DetalheDoadorModal';
import ImportarItensModal from './ImportarItensModal';
import { adicionar, atualizar, remover, mensagemDeErro, MODO_MOCK } from '../services/db';
import { criarCoordenador, redefinirPin } from '../services/auth';
import { resumoEquipe } from '../utils/agregacoes';
import {
  formatarDataHora,
  formatarQuantidadeUnidade,
  normalizarNome,
  pinValido,
  rotuloTipo,
  UNIDADES_ITEM,
} from '../utils/formato';

function AdminPanel({ user, equipes, itens, doacoes, coordenadores, onLogout }) {
  const [aba, setAba] = useState('dashboard');
  const [erroMsg, setErroMsg] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [doadorSelecionado, setDoadorSelecionado] = useState(null);
  const [mostrarImportar, setMostrarImportar] = useState(false);

  // Itens
  const [filtroEquipeItens, setFiltroEquipeItens] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [dadosItemEditado, setDadosItemEditado] = useState({
    nome: '',
    quantidade: '',
    unidade: '',
    unidadeOutra: '',
  });

  // Equipes
  const [novaEquipe, setNovaEquipe] = useState('');
  const [equipeEditando, setEquipeEditando] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');

  // Coordenadores
  const [novoCoord, setNovoCoord] = useState({
    nome: '',
    tipo: 'coord-equipe',
    equipe_id: '',
    pin: '',
  });

  const avisar = (sucesso, erro = '') => {
    setSucessoMsg(sucesso);
    setErroMsg(erro);
  };

  const resumos = equipes.map((equipe) => resumoEquipe(equipe, itens, doacoes));

  // ---------------------------------------------------------------- Equipes

  const adicionarEquipe = async () => {
    const nome = novaEquipe.trim();

    if (!nome) {
      avisar('', 'Digite o nome da equipe');
      return;
    }
    if (equipes.some((equipe) => normalizarNome(equipe.nome) === normalizarNome(nome))) {
      avisar('', `Já existe uma equipe chamada "${nome}"`);
      return;
    }

    try {
      setSalvando(true);
      await adicionar('equipes', {
        nome,
        ativa: true,
        criada_em: new Date(),
        coordenador_id: null,
      });
      setNovaEquipe('');
      avisar('Equipe criada com sucesso!');
    } catch (problema) {
      avisar('', `Erro ao criar equipe: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const salvarNomeEquipe = async (equipe) => {
    const nome = nomeEditado.trim();

    if (!nome) {
      avisar('', 'O nome da equipe não pode ficar vazio');
      return;
    }
    const duplicada = equipes.some(
      (outra) => outra.id !== equipe.id && normalizarNome(outra.nome) === normalizarNome(nome)
    );
    if (duplicada) {
      avisar('', `Já existe uma equipe chamada "${nome}"`);
      return;
    }

    try {
      setSalvando(true);
      await atualizar('equipes', equipe.id, { nome, atualizada_em: new Date() });
      setEquipeEditando(null);
      setNomeEditado('');
      avisar('Nome da equipe atualizado!');
    } catch (problema) {
      avisar('', `Erro ao renomear: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const alternarEquipeAtiva = async (equipe) => {
    try {
      setSalvando(true);
      await atualizar('equipes', equipe.id, { ativa: equipe.ativa === false });
      avisar(equipe.ativa === false ? 'Equipe reativada!' : 'Equipe desativada.');
    } catch (problema) {
      avisar('', `Erro ao atualizar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const deletarEquipe = async (equipe) => {
    const itensDaEquipe = itens.filter((item) => item.equipe_id === equipe.id);
    const doacoesDaEquipe = doacoes.filter((doacao) => doacao.equipe_id === equipe.id);

    // Apagar a equipe deixaria itens e doações órfãos, sem como recuperar.
    if (doacoesDaEquipe.length > 0) {
      avisar(
        '',
        `"${equipe.nome}" já tem ${doacoesDaEquipe.length} doação(ões) registrada(s) e não pode ser apagada. Use "Desativar".`
      );
      return;
    }

    const confirmacao = itensDaEquipe.length
      ? `Apagar "${equipe.nome}" e os ${itensDaEquipe.length} itens dela?`
      : `Apagar a equipe "${equipe.nome}"?`;
    if (!window.confirm(confirmacao)) return;

    try {
      setSalvando(true);
      await Promise.all(itensDaEquipe.map((item) => remover('itens', item.id)));
      await remover('equipes', equipe.id);
      avisar('Equipe apagada.');
    } catch (problema) {
      avisar('', `Erro ao apagar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  // --------------------------------------------------------- Coordenadores

  const adicionarCoordenador = async () => {
    const nome = novoCoord.nome.trim();

    if (!nome) {
      avisar('', 'Digite o nome do coordenador');
      return;
    }
    if (!pinValido(novoCoord.pin)) {
      avisar('', 'O PIN deve ter de 4 a 6 dígitos');
      return;
    }
    if (novoCoord.tipo === 'coord-equipe' && !novoCoord.equipe_id) {
      avisar('', 'Selecione a equipe deste coordenador');
      return;
    }
    const duplicado = coordenadores.some(
      (coordenador) =>
        coordenador.tipo === novoCoord.tipo &&
        normalizarNome(coordenador.nome) === normalizarNome(nome)
    );
    if (duplicado) {
      avisar('', `Já existe um ${rotuloTipo(novoCoord.tipo).toLowerCase()} com esse nome`);
      return;
    }

    try {
      setSalvando(true);
      await criarCoordenador({
        nome,
        tipo: novoCoord.tipo,
        pin: novoCoord.pin,
        equipe_id: novoCoord.tipo === 'coord-equipe' ? novoCoord.equipe_id : null,
      });
      setNovoCoord({ nome: '', tipo: 'coord-equipe', equipe_id: '', pin: '' });
      avisar(`${nome} cadastrado(a) com sucesso!`);
    } catch (problema) {
      avisar('', `Erro ao cadastrar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const resetarPin = async (coordenador) => {
    const novoPin = window.prompt(`Novo PIN para ${coordenador.nome} (4 a 6 dígitos):`);
    if (novoPin === null) return;

    if (!pinValido(novoPin)) {
      avisar('', 'O PIN deve ter de 4 a 6 dígitos');
      return;
    }

    try {
      setSalvando(true);
      await redefinirPin(coordenador.id, novoPin);
      avisar(`PIN de ${coordenador.nome} redefinido. Avise a pessoa do novo PIN.`);
    } catch (problema) {
      avisar('', `Erro ao redefinir PIN: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const alternarCoordenadorAtivo = async (coordenador) => {
    if (coordenador.id === user.id && coordenador.ativo !== false) {
      avisar('', 'Você não pode desativar o próprio acesso.');
      return;
    }

    try {
      setSalvando(true);
      await atualizar('coordenadores', coordenador.id, { ativo: coordenador.ativo === false });
      avisar(coordenador.ativo === false ? 'Acesso reativado!' : 'Acesso desativado.');
    } catch (problema) {
      avisar('', `Erro ao atualizar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  const deletarCoordenador = async (coordenador) => {
    if (coordenador.id === user.id) {
      avisar('', 'Você não pode apagar o próprio acesso.');
      return;
    }
    const admins = coordenadores.filter((c) => c.tipo === 'admin');
    if (coordenador.tipo === 'admin' && admins.length <= 1) {
      avisar('', 'Não dá para apagar o último administrador.');
      return;
    }
    if (!window.confirm(`Apagar o acesso de ${coordenador.nome}?`)) return;

    try {
      setSalvando(true);
      await remover('coordenadores', coordenador.id);
      avisar('Acesso apagado.');
    } catch (problema) {
      avisar('', `Erro ao apagar: ${mensagemDeErro(problema)}`);
    } finally {
      setSalvando(false);
    }
  };

  // -------------------------------------------------------------- Telas

  const mensagens = (
    <>
      {sucessoMsg && <div className="alerta alerta-sucesso">{sucessoMsg}</div>}
      {erroMsg && <div className="alerta alerta-erro">{erroMsg}</div>}
    </>
  );

  const renderDashboard = () => {
    const doacoesRecentes = [...doacoes]
      .sort((a, b) => {
        const dataA = a.data_criacao?.toDate?.() || new Date(a.data_criacao || 0);
        const dataB = b.data_criacao?.toDate?.() || new Date(b.data_criacao || 0);
        return dataB - dataA;
      })
      .slice(0, 10);

    const semNadaRecebido = resumos.filter(
      (resumo) => resumo.totalItens > 0 && resumo.recebido === 0
    );
    const equipesSemItens = resumos.filter((resumo) => resumo.totalItens === 0);

    return (
      <div>
        <p className="resumo-compacto nao-imprimir">
          📦 {itens.length} item(ns) cadastrado(s) em {equipes.length} equipe(s)
        </p>

        {(semNadaRecebido.length > 0 || equipesSemItens.length > 0) && (
          <div className="alerta alerta-aviso nao-imprimir">
            <strong>⚠️ Atenção:</strong>
            <ul className="lista-alertas">
              {equipesSemItens.map((resumo) => (
                <li key={resumo.equipe.id}>
                  {resumo.equipe.nome}: nenhum item cadastrado.
                </li>
              ))}
              {semNadaRecebido.map((resumo) => (
                <li key={resumo.equipe.id}>
                  {resumo.equipe.nome}: {resumo.totalItens} item(ns) e nenhuma doação recebida.
                </li>
              ))}
            </ul>
          </div>
        )}

        <RelatorioPorEquipe resumos={resumos} />

        <h3 className="titulo-secao nao-imprimir">Doações Recentes</h3>
        <table className="tabela nao-imprimir">
          <thead>
            <tr>
              <th>Data</th>
              <th>Item</th>
              <th>Qtd</th>
              <th>Equipe</th>
              <th>Doador</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            {doacoesRecentes.length === 0 ? (
              <tr>
                <td colSpan="6" className="celula-vazia">
                  Nenhuma doação recebida ainda
                </td>
              </tr>
            ) : (
              doacoesRecentes.map((doacao) => {
                const equipe = equipes.find((item) => item.id === doacao.equipe_id);
                return (
                  <tr key={doacao.id}>
                    <td>{formatarDataHora(doacao.data_criacao)}</td>
                    <td>{doacao.item_nome}</td>
                    <td>{formatarQuantidadeUnidade(doacao.quantidade, doacao.item_unidade)}</td>
                    <td>{equipe ? equipe.nome : 'Indefinida'}</td>
                    <td>
                      <button className="link-doador" onClick={() => setDoadorSelecionado(doacao)}>
                        {doacao.doador_nome}
                      </button>
                    </td>
                    <td>{doacao.doador_telefone}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEquipes = () => (
    <div>
      <div className="form-secao">
        <h3>Adicionar Nova Equipe</h3>
        <div className="form-linha">
          <input
            type="text"
            value={novaEquipe}
            onChange={(evento) => setNovaEquipe(evento.target.value)}
            onKeyDown={(evento) => evento.key === 'Enter' && adicionarEquipe()}
            placeholder="Nome da equipe (ex: Cozinha, Cafezinho, Limpeza)"
          />
          <button className="btn-primary" onClick={adicionarEquipe} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      {mensagens}

      <h3 className="titulo-secao">Equipes Existentes</h3>
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Itens</th>
            <th>Recebido / Meta</th>
            <th>Situação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {resumos.length === 0 ? (
            <tr>
              <td colSpan="5" className="celula-vazia">
                Nenhuma equipe cadastrada
              </td>
            </tr>
          ) : (
            resumos.map((resumo) => {
              const equipe = resumo.equipe;
              const emEdicao = equipeEditando === equipe.id;

              return (
                <tr key={equipe.id}>
                  <td>
                    {emEdicao ? (
                      <input
                        type="text"
                        value={nomeEditado}
                        onChange={(evento) => setNomeEditado(evento.target.value)}
                        onKeyDown={(evento) =>
                          evento.key === 'Enter' && salvarNomeEquipe(equipe)
                        }
                        autoFocus
                      />
                    ) : (
                      equipe.nome
                    )}
                  </td>
                  <td>{resumo.totalItens}</td>
                  <td>
                    {resumo.recebido} / {resumo.necessario}
                  </td>
                  <td>
                    {equipe.ativa === false ? (
                      <span className="badge badge-warning">Desativada</span>
                    ) : (
                      <span className="badge badge-success">Ativa</span>
                    )}
                  </td>
                  <td className="celula-acoes">
                    {emEdicao ? (
                      <>
                        <button
                          className="btn-success btn-mini"
                          onClick={() => salvarNomeEquipe(equipe)}
                          disabled={salvando}
                        >
                          Salvar
                        </button>
                        <button
                          className="btn-secondary btn-mini"
                          onClick={() => {
                            setEquipeEditando(null);
                            setNomeEditado('');
                          }}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-secondary btn-mini"
                          onClick={() => {
                            setEquipeEditando(equipe.id);
                            setNomeEditado(equipe.nome);
                          }}
                        >
                          Renomear
                        </button>
                        <button
                          className="btn-dourado btn-mini"
                          onClick={() => alternarEquipeAtiva(equipe)}
                          disabled={salvando}
                        >
                          {equipe.ativa === false ? 'Reativar' : 'Desativar'}
                        </button>
                        <button
                          className="btn-danger btn-mini"
                          onClick={() => deletarEquipe(equipe)}
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
    </div>
  );

  const renderCoordenadores = () => (
    <div>
      <div className="form-secao">
        <h3>Cadastrar Coordenador</h3>

        <div className="grade-formulario">
          <div className="formulario-grupo">
            <label>Nome</label>
            <input
              type="text"
              value={novoCoord.nome}
              onChange={(evento) => setNovoCoord({ ...novoCoord, nome: evento.target.value })}
              placeholder="Nome da pessoa"
            />
          </div>

          <div className="formulario-grupo">
            <label>Tipo de acesso</label>
            <select
              value={novoCoord.tipo}
              onChange={(evento) =>
                setNovoCoord({ ...novoCoord, tipo: evento.target.value, equipe_id: '' })
              }
            >
              <option value="coord-equipe">Coordenador de Equipe</option>
              <option value="coord-geral">Coordenador Geral</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {novoCoord.tipo === 'coord-equipe' && (
            <div className="formulario-grupo">
              <label>Equipe</label>
              <select
                value={novoCoord.equipe_id}
                onChange={(evento) =>
                  setNovoCoord({ ...novoCoord, equipe_id: evento.target.value })
                }
              >
                <option value="">-- Selecione --</option>
                {equipes.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="formulario-grupo">
            <label>PIN (4 a 6 dígitos)</label>
            <input
              type="text"
              inputMode="numeric"
              value={novoCoord.pin}
              onChange={(evento) =>
                setNovoCoord({
                  ...novoCoord,
                  pin: evento.target.value.replace(/\D/g, '').slice(0, 6),
                })
              }
              placeholder="Ex: 4821"
            />
          </div>
        </div>

        <button className="btn-primary" onClick={adicionarCoordenador} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Cadastrar'}
        </button>
      </div>

      {mensagens}

      <h3 className="titulo-secao">Coordenadores Cadastrados</h3>
      <p className="texto-apoio">
        O PIN aparece em texto puro pra você (Admin) poder consultar sem precisar redefinir.
        Lembre-se: como a lista de coordenadores é pública (a tela de login precisa dela antes do
        login), qualquer pessoa que souber abrir o console do navegador também consegue ler esses
        PINs — não é uma informação protegida de verdade, só escondida da tela.
      </p>
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Equipe</th>
            <th>PIN</th>
            <th>Situação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {coordenadores.length === 0 ? (
            <tr>
              <td colSpan="6" className="celula-vazia">
                Nenhum coordenador cadastrado
              </td>
            </tr>
          ) : (
            coordenadores.map((coordenador) => {
              const equipe = equipes.find((item) => item.id === coordenador.equipe_id);
              return (
                <tr key={coordenador.id}>
                  <td>
                    {coordenador.nome}
                    {coordenador.id === user.id && <small className="marca-voce"> (você)</small>}
                  </td>
                  <td>{rotuloTipo(coordenador.tipo)}</td>
                  <td>{equipe ? equipe.nome : '-'}</td>
                  <td>
                    <code>{coordenador.pin || '— (redefina p/ ver)'}</code>
                  </td>
                  <td>
                    {coordenador.ativo === false ? (
                      <span className="badge badge-warning">Inativo</span>
                    ) : (
                      <span className="badge badge-success">Ativo</span>
                    )}
                  </td>
                  <td className="celula-acoes">
                    <button
                      className="btn-secondary btn-mini"
                      onClick={() => resetarPin(coordenador)}
                      disabled={salvando}
                    >
                      Redefinir PIN
                    </button>
                    <button
                      className="btn-dourado btn-mini"
                      onClick={() => alternarCoordenadorAtivo(coordenador)}
                      disabled={salvando}
                    >
                      {coordenador.ativo === false ? 'Reativar' : 'Desativar'}
                    </button>
                    <button
                      className="btn-danger btn-mini"
                      onClick={() => deletarCoordenador(coordenador)}
                      disabled={salvando}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // ------------------------------------------------------------------ Itens

  // Resolve o valor final da unidade: o que veio do select, ou o texto
  // livre quando a pessoa escolheu "Outra".
  const resolverUnidadeItem = (selecionada, textoLivre) => {
    if (selecionada === 'outra') return textoLivre.trim();
    return selecionada;
  };

  const iniciarEdicaoItem = (item) => {
    const unidadeConhecida = UNIDADES_ITEM.some((opcao) => opcao.valor === item.unidade);
    setItemEditando(item.id);
    setDadosItemEditado({
      nome: item.nome,
      quantidade: String(item.quantidade),
      unidade: item.unidade ? (unidadeConhecida ? item.unidade : 'outra') : '',
      unidadeOutra: item.unidade && !unidadeConhecida ? item.unidade : '',
    });
  };

  const salvarItemEditado = async (item) => {
    const nome = dadosItemEditado.nome.trim();
    const quantidade = parseInt(dadosItemEditado.quantidade, 10);
    const unidade = resolverUnidadeItem(dadosItemEditado.unidade, dadosItemEditado.unidadeOutra);

    if (!nome) {
      avisar('', 'O nome do item não pode ficar vazio');
      return;
    }
    if (!dadosItemEditado.unidade) {
      avisar('', 'Selecione a unidade do item');
      return;
    }
    if (dadosItemEditado.unidade === 'outra' && !unidade) {
      avisar('', 'Digite a unidade do item');
      return;
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      avisar('', 'Digite uma quantidade maior que zero');
      return;
    }

    try {
      setSalvando(true);
      await atualizar('itens', item.id, { nome, quantidade, unidade, atualizado_em: new Date() });
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

  const renderItens = () => {
    const itensFiltrados = filtroEquipeItens
      ? itens.filter((item) => item.equipe_id === filtroEquipeItens)
      : itens;

    return (
      <div>
        <div className="form-secao-cabecalho">
          <h3>Itens</h3>
          <button className="btn-dourado btn-mini" onClick={() => setMostrarImportar(true)}>
            📋 Importar lista
          </button>
        </div>
        <p className="texto-apoio">
          Cadastro em massa: cole uma lista (ou carregue um .csv/.txt) em vez de criar item por
          item. Escolha a equipe de destino na própria janela de importação.
        </p>

        <div className="formulario-grupo">
          <label>Filtrar por equipe</label>
          <select
            value={filtroEquipeItens}
            onChange={(evento) => setFiltroEquipeItens(evento.target.value)}
          >
            <option value="">Todas as equipes</option>
            {equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </option>
            ))}
          </select>
        </div>

        {mensagens}

        <table className="tabela">
          <thead>
            <tr>
              <th>Item</th>
              <th>Equipe</th>
              <th>Meta</th>
              <th>Recebido</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" className="celula-vazia">
                  {itens.length === 0
                    ? 'Nenhum item cadastrado em nenhuma equipe ainda'
                    : 'Nenhum item cadastrado nesta equipe'}
                </td>
              </tr>
            ) : (
              itensFiltrados.map((item) => {
                const equipe = equipes.find((registro) => registro.id === item.equipe_id);
                const emEdicao = itemEditando === item.id;

                return (
                  <tr key={item.id}>
                    <td>
                      {emEdicao ? (
                        <input
                          type="text"
                          value={dadosItemEditado.nome}
                          onChange={(evento) =>
                            setDadosItemEditado({ ...dadosItemEditado, nome: evento.target.value })
                          }
                          autoFocus
                        />
                      ) : (
                        item.nome
                      )}
                    </td>
                    <td>{equipe ? equipe.nome : '-'}</td>
                    <td>
                      {emEdicao ? (
                        <div className="edicao-quantidade-unidade">
                          <input
                            type="number"
                            min="1"
                            value={dadosItemEditado.quantidade}
                            onChange={(evento) =>
                              setDadosItemEditado({
                                ...dadosItemEditado,
                                quantidade: evento.target.value,
                              })
                            }
                            className="input-quantidade"
                          />
                          <select
                            value={dadosItemEditado.unidade}
                            onChange={(evento) =>
                              setDadosItemEditado({
                                ...dadosItemEditado,
                                unidade: evento.target.value,
                              })
                            }
                            className="select-unidade"
                          >
                            <option value="">Unidade</option>
                            {UNIDADES_ITEM.map((unidade) => (
                              <option key={unidade.valor} value={unidade.valor}>
                                {unidade.rotulo}
                              </option>
                            ))}
                          </select>
                          {dadosItemEditado.unidade === 'outra' && (
                            <input
                              type="text"
                              value={dadosItemEditado.unidadeOutra}
                              onChange={(evento) =>
                                setDadosItemEditado({
                                  ...dadosItemEditado,
                                  unidadeOutra: evento.target.value,
                                })
                              }
                              placeholder="Qual?"
                              className="input-unidade-outra"
                            />
                          )}
                        </div>
                      ) : (
                        formatarQuantidadeUnidade(item.quantidade, item.unidade)
                      )}
                    </td>
                    <td>{formatarQuantidadeUnidade(item.recebido || 0, item.unidade)}</td>
                    <td className="celula-acoes">
                      {emEdicao ? (
                        <>
                          <button
                            className="btn-success btn-mini"
                            onClick={() => salvarItemEditado(item)}
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
                            onClick={() => iniciarEdicaoItem(item)}
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
      </div>
    );
  };

  const renderConfiguracoes = () => (
    <div>
      <div className="secao-configuracoes">
        <h3>Configurações do Sistema</h3>

        <div className="config-item">
          <label>Nome do Evento</label>
          <input type="text" value="II Encontro de Jovens com Cristo" disabled readOnly />
        </div>

        <div className="config-item">
          <label>Paróquia</label>
          <input type="text" value="Nossa Senhora de Guadalupe" disabled readOnly />
        </div>

        <div className="config-item">
          <label>Link público para os doadores</label>
          <input type="text" value={window.location.href.split('?')[0]} disabled readOnly />
          <small>Envie este link no grupo. O doador não precisa de login.</small>
        </div>

        <div className="config-item">
          <label>Origem dos dados</label>
          <input
            type="text"
            value={MODO_MOCK ? 'Modo demonstração (dados fictícios)' : 'Firebase Firestore'}
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="info-importante">
        <h3>ℹ️ Informações Importantes</h3>
        <ul>
          <li>Crie as equipes antes de cadastrar os coordenadores de equipe</li>
          <li>Cada coordenador de equipe só enxerga e edita os itens da própria equipe</li>
          <li>Doadores registram pelo link público, sem login</li>
          <li>Os dados sincronizam em tempo real entre todos os aparelhos</li>
          <li>Equipe com doação registrada não pode ser apagada, só desativada</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="app-header nao-imprimir">
        <div className="titulo-cabecalho">
          <BrandLogo variante="cabecalho" />
          <h1>🔐 Painel Administrativo</h1>
        </div>
        <div className="user-info">
          <span>Bem-vindo, {user.nome}!</span>
          <button onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div className="app-main">
        <div className="abas nao-imprimir">
          <button
            className={`aba ${aba === 'dashboard' ? 'ativa' : ''}`}
            onClick={() => setAba('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`aba ${aba === 'equipes' ? 'ativa' : ''}`}
            onClick={() => setAba('equipes')}
          >
            👥 Equipes
          </button>
          <button
            className={`aba ${aba === 'coordenadores' ? 'ativa' : ''}`}
            onClick={() => setAba('coordenadores')}
          >
            🔑 Coordenadores
          </button>
          <button
            className={`aba ${aba === 'itens' ? 'ativa' : ''}`}
            onClick={() => setAba('itens')}
          >
            📦 Itens
          </button>
          <button
            className={`aba ${aba === 'configuracoes' ? 'ativa' : ''}`}
            onClick={() => setAba('configuracoes')}
          >
            ⚙️ Configurações
          </button>
        </div>

        <div className="aba-conteudo">
          {aba === 'dashboard' && renderDashboard()}
          {aba === 'equipes' && renderEquipes()}
          {aba === 'coordenadores' && renderCoordenadores()}
          {aba === 'itens' && renderItens()}
          {aba === 'configuracoes' && renderConfiguracoes()}
        </div>
      </div>

      <DetalheDoadorModal
        doacao={doadorSelecionado}
        onFechar={() => setDoadorSelecionado(null)}
      />

      {mostrarImportar && (
        <ImportarItensModal
          equipes={equipes}
          itensExistentes={itens}
          onFechar={() => setMostrarImportar(false)}
        />
      )}
    </div>
  );
}

export default AdminPanel;
