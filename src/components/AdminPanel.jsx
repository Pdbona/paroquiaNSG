import React, { useState } from 'react';
import '../styles/AdminPanel.css';
import BrandLogo from './BrandLogo';
import { adicionar, atualizar, remover, mensagemDeErro, MODO_MOCK } from '../services/db';
import { criarCoordenador, redefinirPin } from '../services/auth';
import { resumoEquipe } from '../utils/agregacoes';
import {
  formatarDataHora,
  normalizarNome,
  pinValido,
  rotuloTipo,
} from '../utils/formato';

function AdminPanel({ user, equipes, itens, doacoes, coordenadores, onLogout }) {
  const [aba, setAba] = useState('dashboard');
  const [erroMsg, setErroMsg] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

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

    // Um card por item, com a equipe como etiqueta — não por equipe com uma
    // barra só, que escondia a situação de cada item.
    const itensComEquipe = resumos.flatMap((resumo) =>
      resumo.itens.map((item) => ({ ...item, equipeNome: resumo.equipe.nome }))
    );

    return (
      <div>
        <p className="resumo-compacto">
          📦 {itens.length} item(ns) cadastrado(s) em {equipes.length} equipe(s)
        </p>

        {(semNadaRecebido.length > 0 || equipesSemItens.length > 0) && (
          <div className="alerta alerta-aviso">
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

        <h3 className="titulo-secao">Situação por Item</h3>
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

        <h3 className="titulo-secao">Doações Recentes</h3>
        <table className="tabela">
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
                    <td>{doacao.quantidade}</td>
                    <td>{equipe ? equipe.nome : 'Indefinida'}</td>
                    <td>{doacao.doador_nome}</td>
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
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Equipe</th>
            <th>Situação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {coordenadores.length === 0 ? (
            <tr>
              <td colSpan="5" className="celula-vazia">
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
      <div className="app-header">
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
        <div className="abas">
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
          {aba === 'configuracoes' && renderConfiguracoes()}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
