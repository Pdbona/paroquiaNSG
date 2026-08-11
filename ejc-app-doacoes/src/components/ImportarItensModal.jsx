import React, { useState } from 'react';
import { adicionar, mensagemDeErro } from '../services/db';
import { normalizarNome, UNIDADES_ITEM } from '../utils/formato';

/**
 * Importa vários itens de uma vez, colados (copiar/colar de uma planilha) ou
 * de um arquivo .csv/.txt — em vez de cadastrar um por um no formulário.
 *
 * Uma linha por item: "Nome, Quantidade, Unidade" — aceita vírgula OU tab
 * como separador (tab é o que o Excel/Planilhas Google gera ao colar uma
 * coluna copiada), então dá pra colar direto de uma célula sem reformatar.
 * As três colunas são obrigatórias (mesma exigência do cadastro manual de um
 * item só) — sem unidade, o item aparece sem ela na prateleira do doador. Se
 * a unidade digitada não está na lista fixa, entra como texto livre mesmo
 * (igual ao "Outra" do cadastro manual).
 *
 * Props:
 *  - equipes: lista completa de equipes (só usada se equipeFixaId não vier)
 *  - equipeFixaId: quando vem preenchido, trava a importação nessa equipe e
 *    esconde o seletor (uso do Coordenador de Equipe, que só mexe na sua)
 *  - itensExistentes: itens já cadastrados (todas as equipes) — usado pra
 *    avisar duplicata dentro da equipe escolhida
 *  - onFechar: fecha o modal
 */
function ImportarItensModal({ equipes, equipeFixaId, itensExistentes, onFechar }) {
  const [equipeId, setEquipeId] = useState(equipeFixaId || equipes[0]?.id || '');
  const [texto, setTexto] = useState('');
  const [linhas, setLinhas] = useState(null); // null = ainda não analisado
  const [selecionadas, setSelecionadas] = useState({});
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, falhas }
  const [erro, setErro] = useState('');

  const equipeAtual = equipes.find((equipe) => equipe.id === equipeId);

  const dividirLinha = (linha) => {
    if (linha.includes('\t')) return linha.split('\t');
    if (linha.includes(',')) return linha.split(',');
    return linha.split(/ {2,}/); // fallback: 2+ espaços, pra texto colado sem separador
  };

  const resolverUnidade = (bruto) => {
    const limpo = String(bruto || '').trim();
    if (!limpo) return '';
    const conhecida = UNIDADES_ITEM.find(
      (opcao) => opcao.valor !== 'outra' && normalizarNome(opcao.valor) === normalizarNome(limpo)
    );
    return conhecida ? conhecida.valor : limpo;
  };

  const analisar = () => {
    setErro('');
    setResultado(null);

    if (!equipeId) {
      setErro('Selecione uma equipe primeiro.');
      return;
    }

    const brutas = texto
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);

    if (brutas.length === 0) {
      setErro('Cole ou carregue uma lista antes de analisar.');
      return;
    }

    const nomesNaEquipe = new Set(
      itensExistentes
        .filter((item) => item.equipe_id === equipeId)
        .map((item) => normalizarNome(item.nome))
    );
    const nomesNoLote = new Set();

    const processadas = brutas.map((linha, indice) => {
      const partes = dividirLinha(linha).map((parte) => parte.trim());
      const nome = partes[0] || '';
      const quantidade = parseInt(partes[1], 10);
      const unidade = resolverUnidade(partes[2]);
      const chave = normalizarNome(nome);

      let status = 'ok';
      let motivo = '';

      if (!nome) {
        status = 'invalida';
        motivo = 'Sem nome do item';
      } else if (!Number.isFinite(quantidade) || quantidade <= 0) {
        status = 'invalida';
        motivo = 'Quantidade inválida (2ª coluna precisa ser um número maior que zero)';
      } else if (!unidade) {
        // Sem isso, o item some sem unidade na tela do doador ("Precisa de
        // 5" em vez de "Precisa de 5 kg") — mesma exigência do formulário de
        // item único, que já obriga a unidade.
        status = 'invalida';
        motivo = 'Sem unidade (3ª coluna obrigatória, ex: kg, L, unidade)';
      } else if (nomesNaEquipe.has(chave)) {
        status = 'duplicada';
        motivo = 'Já existe um item com esse nome nesta equipe';
      } else if (nomesNoLote.has(chave)) {
        status = 'duplicada';
        motivo = 'Repetido dentro da própria lista colada';
      }

      if (status === 'ok') nomesNoLote.add(chave);

      return { id: indice, linhaOriginal: linha, nome, quantidade, unidade, status, motivo };
    });

    setLinhas(processadas);
    setSelecionadas(
      Object.fromEntries(processadas.map((linha) => [linha.id, linha.status === 'ok']))
    );
  };

  const alternarSelecao = (id) => {
    setSelecionadas((anterior) => ({ ...anterior, [id]: !anterior[id] }));
  };

  const confirmarImportacao = async () => {
    const paraImportar = linhas.filter((linha) => selecionadas[linha.id]);
    if (paraImportar.length === 0) {
      setErro('Marque ao menos um item pra importar.');
      return;
    }

    setImportando(true);
    setErro('');
    let ok = 0;
    const falhas = [];

    for (const linha of paraImportar) {
      try {
        await adicionar('itens', {
          nome: linha.nome,
          quantidade: linha.quantidade,
          unidade: linha.unidade,
          recebido: 0,
          equipe_id: equipeId,
          ativo: true,
          criado_em: new Date(),
        });
        ok += 1;
      } catch (problema) {
        falhas.push(`${linha.nome}: ${mensagemDeErro(problema)}`);
      }
    }

    setImportando(false);
    setResultado({ ok, falhas });
    if (falhas.length === 0) {
      setLinhas(null);
      setTexto('');
    }
  };

  const carregarArquivo = (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => setTexto(String(leitor.result || ''));
    leitor.onerror = () => setErro('Não consegui ler o arquivo. Tente colar o texto direto.');
    leitor.readAsText(arquivo, 'utf-8');
    evento.target.value = ''; // permite carregar o mesmo arquivo de novo depois
  };

  const contagem = linhas
    ? {
        ok: linhas.filter((linha) => linha.status === 'ok').length,
        duplicada: linhas.filter((linha) => linha.status === 'duplicada').length,
        invalida: linhas.filter((linha) => linha.status === 'invalida').length,
      }
    : null;

  const totalSelecionado = linhas
    ? linhas.filter((linha) => selecionadas[linha.id]).length
    : 0;

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-cartao modal-cartao--largo" onClick={(evento) => evento.stopPropagation()}>
        <button className="modal-fechar" onClick={onFechar} aria-label="Fechar">
          ✕
        </button>
        <h3>📋 Importar lista de itens</h3>

        <div>
          {!equipeFixaId && (
            <div className="formulario-grupo">
              <label>Equipe de destino</label>
              <select value={equipeId} onChange={(evento) => setEquipeId(evento.target.value)}>
                {equipes.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          {equipeFixaId && equipeAtual && (
            <p className="texto-apoio">
              Importando para a equipe <strong>{equipeAtual.nome}</strong>.
            </p>
          )}

          <p className="texto-apoio">
            Uma linha por item: <strong>Nome, Quantidade, Unidade</strong> (as três colunas são
            obrigatórias — sem unidade, o item aparece sem ela pro doador, ex: "Precisa de 5" em
            vez de "Precisa de 5 kg"). Pode colar direto de uma coluna do Excel/Planilhas Google,
            ou carregar um arquivo <strong>.csv</strong> ou <strong>.txt</strong>.
            <br />
            Exemplo: <code>Arroz, 50, kg</code>
          </p>

          <input type="file" accept=".csv,.txt" onChange={carregarArquivo} />

          <textarea
            className="textarea-importar"
            rows={8}
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value);
              setLinhas(null);
              setResultado(null);
            }}
            placeholder={'Arroz, 50, kg\nFeijão, 30, kg\nDetergente, 24, unidade'}
          />

          {erro && <div className="alerta alerta-erro">{erro}</div>}

          {!linhas && (
            <button className="btn-primary" onClick={analisar}>
              Analisar lista
            </button>
          )}

          {linhas && (
            <>
              <p className="texto-apoio">
                {contagem.ok} pronto(s) para importar
                {contagem.duplicada > 0 && ` · ${contagem.duplicada} duplicada(s)`}
                {contagem.invalida > 0 && ` · ${contagem.invalida} inválida(s)`}
              </p>

              <table className="tabela tabela-importar">
                <thead>
                  <tr>
                    <th></th>
                    <th>Item</th>
                    <th>Qtd</th>
                    <th>Unidade</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => (
                    <tr key={linha.id} className={linha.status !== 'ok' ? 'linha-desabilitada' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!selecionadas[linha.id]}
                          onChange={() => alternarSelecao(linha.id)}
                          disabled={linha.status === 'invalida'}
                        />
                      </td>
                      <td>{linha.nome || <em>{linha.linhaOriginal}</em>}</td>
                      <td>{Number.isFinite(linha.quantidade) ? linha.quantidade : '-'}</td>
                      <td>{linha.unidade || '-'}</td>
                      <td>
                        {linha.status === 'ok' && <span className="badge badge-success">Ok</span>}
                        {linha.status === 'duplicada' && (
                          <span className="badge badge-warning" title={linha.motivo}>
                            Duplicada
                          </span>
                        )}
                        {linha.status === 'invalida' && (
                          <span className="badge badge-danger" title={linha.motivo}>
                            {linha.motivo}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="modal-acoes">
                <button className="btn-secondary" onClick={() => setLinhas(null)}>
                  Voltar
                </button>
                <button
                  className="btn-primary"
                  onClick={confirmarImportacao}
                  disabled={importando || totalSelecionado === 0}
                >
                  {importando
                    ? 'Importando...'
                    : `Confirmar importação (${totalSelecionado})`}
                </button>
              </div>
            </>
          )}

          {resultado && (
            <div className={resultado.falhas.length ? 'alerta alerta-aviso' : 'alerta alerta-sucesso'}>
              {resultado.ok} item(ns) importado(s) com sucesso.
              {resultado.falhas.length > 0 && (
                <>
                  <br />
                  Falharam: {resultado.falhas.join('; ')}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportarItensModal;
