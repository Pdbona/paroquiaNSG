/*
 * Progresso é medido por QUANTIDADE, não por número de documentos: 1 doação de
 * 50 kg de arroz atende um item que pede 50 kg, e não "1 de 50".
 */

import { normalizarNome } from './formato';

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
    // Lista crua das doações da equipe — usada no relatório "só o que foi
    // doado e por quem" (RelatorioPorEquipe).
    doacoes: doacoesEquipe,
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
 * Divide a doação de um item compartilhado entre as equipes que o pedem —
 * a tela do doador não segrega por equipe, então isso acontece no momento
 * de gravar. Regra combinada com o Pablo: quantidade par divide igual;
 * ímpar, o resto vai pra Cozinha. Nunca passa do que cada equipe ainda
 * precisa — o excedente migra pra quem ainda tem espaço, e só sobra pra
 * primeira da lista se TODAS já tiverem atingido a meta (a doação física
 * não pode sumir do registro).
 *
 * `registros`: [{ id, equipeNome, necessario, recebido }]
 * devolve: [{ id, quantidade }]
 */
export function ratearEntreEquipes(quantidadeTotal, registros) {
  if (registros.length === 0) return [];
  if (registros.length === 1) {
    return [{ id: registros[0].id, quantidade: quantidadeTotal }];
  }

  const ordenados = [...registros].sort((a, b) => {
    const aCozinha = normalizarNome(a.equipeNome) === 'cozinha';
    const bCozinha = normalizarNome(b.equipeNome) === 'cozinha';
    if (aCozinha !== bCozinha) return aCozinha ? -1 : 1;
    return a.equipeNome.localeCompare(b.equipeNome, 'pt-BR');
  });

  const n = ordenados.length;
  const base = Math.floor(quantidadeTotal / n);
  const resto = quantidadeTotal % n;

  let alocacao = ordenados.map((registro, indice) => ({
    ...registro,
    quantidade: base + (indice === 0 ? resto : 0),
  }));

  // Respeita o teto de cada equipe: quem passaria do necessário devolve o
  // excedente, que é redistribuído pra quem ainda tem espaço.
  let sobra = 0;
  alocacao = alocacao.map((registro) => {
    const capacidade = Math.max(0, registro.necessario - registro.recebido);
    if (registro.quantidade > capacidade) {
      sobra += registro.quantidade - capacidade;
      return { ...registro, quantidade: capacidade };
    }
    return registro;
  });

  let indice = 0;
  while (sobra > 0 && indice < alocacao.length) {
    const registro = alocacao[indice];
    const capacidade = Math.max(0, registro.necessario - registro.recebido);
    const espaco = capacidade - registro.quantidade;
    if (espaco > 0) {
      const dar = Math.min(espaco, sobra);
      registro.quantidade += dar;
      sobra -= dar;
    }
    indice += 1;
  }

  // Todo mundo já supriu a meta e ainda sobrou: deposita na primeira da
  // lista em vez de descartar a quantidade que a pessoa está doando de fato.
  if (sobra > 0) {
    alocacao[0].quantidade += sobra;
  }

  return alocacao.map((registro) => ({ id: registro.id, quantidade: registro.quantidade }));
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
