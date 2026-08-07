import React from 'react';
import BrandLogo from './BrandLogo';
import { formatarQuantidadeUnidade } from '../utils/formato';

/**
 * Situação de doações em colunas, uma por equipe — usado no Dashboard do
 * Admin e no do Coordenador Geral. O botão imprime só isto (window.print +
 * CSS de impressão em App.css): cabeçalho com logo aparece apenas no papel,
 * e o resto da tela (abas, doações recentes com dados do doador) some.
 */
function RelatorioPorEquipe({ resumos }) {
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
        <button className="btn-secondary" onClick={() => window.print()}>
          🖨️ Imprimir relatório por equipe
        </button>
      </div>

      {totalItens === 0 ? (
        <p className="texto-vazio">Nenhum item cadastrado ainda.</p>
      ) : (
        <div className="colunas-equipes">
          {resumos.map((resumo) => (
            <div key={resumo.equipe.id} className="coluna-equipe">
              <h4 className="coluna-equipe-titulo">{resumo.equipe.nome}</h4>

              {resumo.itens.length === 0 ? (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RelatorioPorEquipe;
