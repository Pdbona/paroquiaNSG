import React from 'react';
import logo from '../assets/nossa-senhora-guadalupe.png';

/**
 * Marca da Paróquia Nossa Senhora de Guadalupe, reaproveitada em todas as
 * telas. `variante` controla tamanho e posição:
 *  - "cabecalho": ícone pequeno na barra verde das telas internas (admin,
 *    coordenadores).
 *  - "cartao": tamanho médio, dentro do cartão de login/doador.
 *  - "lateral": marca grande, fixada no espaço vazio ao lado do cartão de
 *    login/doador — some em telas estreitas (ver CSS, @media 1100px), onde
 *    esse espaço não existe.
 */
function BrandLogo({ variante = 'cabecalho', className = '' }) {
  return (
    <img
      src={logo}
      alt="Nossa Senhora de Guadalupe"
      className={`logo-guadalupe logo-guadalupe--${variante} ${className}`.trim()}
    />
  );
}

export default BrandLogo;
