import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { formatarDataHora, formatarQuantidadeUnidade } from '../utils/formato';

/**
 * Situação de doações em colunas, uma por equipe — usado no Dashboard do
 * Admin, no do Coordenador Geral e no do Coordenador de Equipe (com uma
 * equipe só). O botão imprime só isto (window.print + CSS de impressão em
 * App.css): cabeçalho com logo aparece apenas no papel, e o resto da tela
 * (abas, botões) some.
 *
 * Três formatos, escolhidos no seletor antes de imprimir:
 *  - tudo: necessário/recebido/faltam por item, com barra de progresso.
 *  - doado: só o que já chegou, item por item, com o nome de quem doou.
 *  - falta: só o que ainda falta, sem os itens já completos.
 */
function RelatorioPorEquipe({ resumos }) {
  const [tipo, setTipo] = useState('tudo');
  const totalItens = resumos.reduce((total, resumo) => total + resumo.totalItens, 0);

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
            <option value="doado">Só o que foi doado e por quem</option>
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
                  resumo.itens.map((item) => (
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
                  ))
                ))}

              {tipo === 'doado' &&
                (resumo.doacoes.length === 0 ? (
                  <p className="coluna-equipe-vazia">Nenhuma doação recebida ainda.</p>
                ) : (
                  resumo.doacoes.map((doacao) => (
                    <div key={doacao.id} className="linha-item-coluna">
                      <div className="linha-item-cabecalho">
                        <span className="linha-item-nome">{doacao.item_nome}</span>
                        <span className="linha-item-numeros">
                          {formatarQuantidadeUnidade(doacao.quantidade, doacao.item_unidade)}
                        </span>
                      </div>
                      <span className="linha-doador">
                        {doacao.doador_nome}
                        {doacao.doador_telefone ? ` · ${doacao.doador_telefone}` : ''}
                        {' · '}
                        {formatarDataHora(doacao.data_criacao)}
                      </span>
                    </div>
                  ))
                ))}

              {tipo === 'falta' &&
                (() => {
                  const faltando = resumo.itens.filter((item) => item.faltam > 0);
                  return faltando.length === 0 ? (
                    <p className="coluna-equipe-vazia">🎉 Meta atingida em tudo.</p>
                  ) : (
                    faltando.map((item) => (
                      <div key={item.id} className="linha-item-coluna">
                        <div className="linha-item-cabecalho">
                          <span className="linha-item-nome">{item.nome}</span>
                          <span className="linha-item-numeros texto-faltantes">
                            Faltam {formatarQuantidadeUnidade(item.faltam, item.unidade)}
                          </span>
                        </div>
                      </div>
                    ))
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
