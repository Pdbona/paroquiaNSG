import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { agregarPorItem } from '../utils/agregacoes';
import { formatarQuantidadeUnidade } from '../utils/formato';

/**
 * Situação de doações em colunas, uma por equipe — usado no Dashboard do
 * Admin, no do Coordenador Geral e no do Coordenador de Equipe (com uma
 * equipe só). O botão imprime só isto (window.print + CSS de impressão em
 * App.css): cabeçalho com logo aparece apenas no papel, e o resto da tela
 * (abas, botões) some.
 *
 * Três formatos, escolhidos no seletor antes de imprimir:
 *  - tudo: necessário/recebido/faltam por item, com barra de progresso.
 *  - doado: só o que já chegou, total por item (sem doador — quem doou cada
 *    unidade fica na lista "Todas as Doações"/"Doações Recebidas" abaixo).
 *  - falta: só o que ainda falta, sem os itens já completos.
 */
function RelatorioPorEquipe({ resumos }) {
  const [tipo, setTipo] = useState('tudo');
  const totalItens = resumos.reduce((total, resumo) => total + resumo.totalItens, 0);
  // Coordenador de Equipe só vê a própria equipe (um card só na tela). Sem
  // outras equipes ao lado pra preencher a largura, a lista "doado" fica em
  // 3 colunas dentro do próprio card — mesmo aproveitamento de espaço que o
  // Admin/Coordenador Geral têm ao ver várias equipes lado a lado.
  const cardUnico = resumos.length === 1;

  return (
    <div className="relatorio-equipes">
      <div className="cabecalho-impressao">
        <BrandLogo variante="cabecalho" className="logo-impressao" />
        <div>
          <h2>Relatório de Doações — II Encontro de Jovens com Cristo</h2>
          <p>
            Paróquia Nossa Senhora de Guadalupe · Impresso em{' '}
            {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="cabecalho-equipe nao-imprimir">
        <h3 className="titulo-secao" style={{ margin: 0 }}>
          Situação por Equipe
        </h3>
        <div className="relatorio-controles">
          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
            className="select-equipe"
          >
            <option value="tudo">Tudo (necessário, recebido, falta)</option>
            <option value="doado">Só o que foi doado (total por item)</option>
            <option value="falta">Só o que falta</option>
          </select>
          <button className="btn-secondary" onClick={() => window.print()}>
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {totalItens === 0 ? (
        <p className="texto-vazio">Nenhum item cadastrado ainda.</p>
      ) : (
        <div className="colunas-equipes">
          {resumos.map((resumo) => (
            <div key={resumo.equipe.id} className="coluna-equipe">
              <h4 className="coluna-equipe-titulo">{resumo.equipe.nome}</h4>

              {tipo === 'tudo' &&
                (resumo.itens.length === 0 ? (
                  <p className="coluna-equipe-vazia">Nenhum item cadastrado.</p>
                ) : (
                  <div className="grade-itens-equipe">
                    {resumo.itens.map((item) => (
                      <div key={item.id} className="linha-item-coluna">
                        <div className="linha-item-cabecalho">
                          <span className="linha-item-nome">{item.nome}</span>
                          <span className="linha-item-numeros">
                            {formatarQuantidadeUnidade(item.recebido, item.unidade)}/
                            {formatarQuantidadeUnidade(item.necessario, item.unidade)}
                          </span>
                        </div>
                        <div className="progress-bar mini">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${item.progresso}%` }}
                          />
                        </div>
                        <span className={item.faltam > 0 ? 'texto-faltantes' : 'texto-completo'}>
                          {item.faltam > 0
                            ? `Faltam ${formatarQuantidadeUnidade(item.faltam, item.unidade)}`
                            : '✓ Completo'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

              {tipo === 'doado' &&
                (() => {
                  const itensDoados = agregarPorItem(resumo.doacoes);
                  return itensDoados.length === 0 ? (
                    <p className="coluna-equipe-vazia">Nenhuma doação recebida ainda.</p>
                  ) : (
                    // Lista de uma coluna, um item por linha — a grade lado a
                    // lado (usada em "tudo"/"falta") embaralhava a leitura
                    // aqui porque cada item só tem nome+qtd, sem barra de
                    // progresso pra ocupar a largura da coluna.
                    <ul
                      className={
                        cardUnico ? 'lista-itens-doados lista-itens-doados--3col' : 'lista-itens-doados'
                      }
                    >
                      {itensDoados.map((item) => (
                        <li key={item.chave} className="item-doado">
                          <span className="item-doado-nome">{item.nome}</span>
                          <span className="item-doado-linha" aria-hidden="true" />
                          <span className="item-doado-qtd">
                            {formatarQuantidadeUnidade(item.quantidade, item.unidade)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}

              {tipo === 'falta' &&
                (() => {
                  const faltando = resumo.itens.filter((item) => item.faltam > 0);
                  return faltando.length === 0 ? (
                    <p className="coluna-equipe-vazia">🎉 Meta atingida em tudo.</p>
                  ) : (
                    <div className="grade-itens-equipe">
                      {faltando.map((item) => (
                        <div key={item.id} className="linha-item-coluna">
                          <div className="linha-item-cabecalho">
                            <span className="linha-item-nome">{item.nome}</span>
                            <span className="linha-item-numeros texto-faltantes">
                              Faltam {formatarQuantidadeUnidade(item.faltam, item.unidade)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RelatorioPorEquipe;
