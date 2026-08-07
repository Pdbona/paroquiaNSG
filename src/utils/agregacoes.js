/*
 * Progresso é medido por QUANTIDADE, não por número de documentos: 1 doação de
 * 50 kg de arroz atende um item que pede 50 kg, e não "1 de 50".
 */

export function somaQuantidades(registros) {
  return registros.reduce((total, registro) => total + (Number(registro.quantidade) || 0), 0);
}

/** Mapa item_id -> quantidade já doada. */
export function recebidoPorItem(doacoes) {
  return doacoes.reduce((mapa, doacao) => {
    const atual = mapa[doacao.item_id] || 0;
    mapa[doacao.item_id] = atual + (Number(doacao.quantidade) || 0);
    return mapa;
  }, {});
}

export function percentual(recebido, necessario) {
  if (!necessario) return 0;
  return Math.min(100, Math.round((recebido / necessario) * 100));
}

/**
 * Situação de cada item de uma equipe: quanto pede, quanto chegou, quanto falta.
 */
export function situacaoDosItens(itens, doacoes) {
  const recebido = recebidoPorItem(doacoes);

  return itens.map((item) => {
    const necessario = Number(item.quantidade) || 0;
    const jaRecebido = recebido[item.id] || 0;
    return {
      ...item,
      necessario,
      recebido: jaRecebido,
      faltam: Math.max(0, necessario - jaRecebido),
      progresso: percentual(jaRecebido, necessario),
    };
  });
}

/** Resumo de uma equipe para os cards e barras de progresso. */
export function resumoEquipe(equipe, itens, doacoes) {
  const itensEquipe = itens.filter((item) => item.equipe_id === equipe.id);
  const doacoesEquipe = doacoes.filter((doacao) => doacao.equipe_id === equipe.id);
  const situacao = situacaoDosItens(itensEquipe, doacoesEquipe);

  const necessario = somaQuantidades(itensEquipe);
  const recebido = situacao.reduce((total, item) => total + Math.min(item.recebido, item.necessario), 0);

  return {
    equipe,
    itens: situacao,
    totalItens: itensEquipe.length,
    totalDoacoes: doacoesEquipe.length,
    necessario,
    recebido,
    progresso: percentual(recebido, necessario),
    itensZerados: situacao.filter((item) => item.recebido === 0),
    itensFaltando: situacao.filter((item) => item.faltam > 0),
    pendentesEntrega: doacoesEquipe.filter((doacao) => !doacao.entregue).length,
  };
}

/**
 * Doadores que prometeram itens para mais de uma equipe. O coordenador usa
 * isso para combinar uma coleta só e economizar frete.
 */
export function doadoresCompartilhados(doacoes, equipeId) {
  const porDoador = {};

  doacoes.forEach((doacao) => {
    const chave = doacao.doador_telefone || doacao.doador_email || doacao.doador_nome;
    if (!chave) return;
    if (!porDoador[chave]) porDoador[chave] = [];
    porDoador[chave].push(doacao);
  });

  return Object.values(porDoador)
    .filter((doacoesDoDoador) => {
      const equipes = new Set(doacoesDoDoador.map((d) => d.equipe_id));
      return equipes.size > 1 && doacoesDoDoador.some((d) => d.equipe_id === equipeId);
    })
    .map((doacoesDoDoador) => ({
      nome: doacoesDoDoador[0].doador_nome,
      telefone: doacoesDoDoador[0].doador_telefone,
      doacoes: doacoesDoDoador,
      outrasEquipes: doacoesDoDoador.filter((d) => d.equipe_id !== equipeId),
    }));
}
