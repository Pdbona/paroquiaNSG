import React from 'react';
import { formatarDataHora, formatarQuantidadeUnidade } from '../utils/formato';

/**
 * Detalhes completos do doador de uma linha de doação clicada — endereço,
 * e-mail, ponto de referência. Esses campos já vêm salvos em cada doação
 * (services/db.js registrarDoacaoRateada copia os dados do doador em cada
 * alocação), então não precisa buscar em outro lugar.
 */
function DetalheDoadorModal({ doacao, onFechar }) {
  if (!doacao) return null;

  const enderecoLinha1 = [doacao.doador_endereco, doacao.doador_numero]
    .filter(Boolean)
    .join(', ');
  const enderecoLinha2 = [doacao.doador_bairro, doacao.doador_cidade, doacao.doador_estado]
    .filter(Boolean)
    .join(' - ');

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-cartao" onClick={(evento) => evento.stopPropagation()}>
        <button className="modal-fechar" onClick={onFechar} aria-label="Fechar">
          ✕
        </button>

        <h3>{doacao.doador_nome}</h3>

        <div className="modal-secao">
          <div className="modal-linha">
            <span className="modal-rotulo">Telefone</span>
            <span>{doacao.doador_telefone || '-'}</span>
          </div>
          <div className="modal-linha">
            <span className="modal-rotulo">E-mail</span>
            <span>{doacao.doador_email || '-'}</span>
          </div>
        </div>

        <div className="modal-secao">
          <div className="modal-linha">
            <span className="modal-rotulo">CEP</span>
            <span>{doacao.doador_cep || '-'}</span>
          </div>
          <div className="modal-linha">
            <span className="modal-rotulo">Endereço</span>
            <span>{enderecoLinha1 || '-'}</span>
          </div>
          {enderecoLinha2 && (
            <div className="modal-linha">
              <span className="modal-rotulo">Bairro/Cidade</span>
              <span>{enderecoLinha2}</span>
            </div>
          )}
          {doacao.doador_referencia && (
            <div className="modal-linha">
              <span className="modal-rotulo">Referência</span>
              <span>{doacao.doador_referencia}</span>
            </div>
          )}
        </div>

        <div className="modal-secao">
          <div className="modal-linha">
            <span className="modal-rotulo">Doou</span>
            <span>
              {doacao.item_nome} —{' '}
              {formatarQuantidadeUnidade(doacao.quantidade, doacao.item_unidade)}
            </span>
          </div>
          <div className="modal-linha">
            <span className="modal-rotulo">Data</span>
            <span>{formatarDataHora(doacao.data_criacao)}</span>
          </div>
          <div className="modal-linha">
            <span className="modal-rotulo">Status</span>
            <span>
              {doacao.entregue ? (
                <span className="badge badge-success">✓ Entregue</span>
              ) : (
                <span className="badge badge-warning">⏳ Pendente</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetalheDoadorModal;
