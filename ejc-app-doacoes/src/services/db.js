/*
 * Camada única de acesso a dados. Os componentes nunca falam com o Firestore
 * direto: assim dá para rodar o app localmente sem credenciais (modo mock) e
 * o tratamento de erro fica em um lugar só.
 */

import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db, firebaseConfigurado } from '../firebase';
import {
  mockAssinar,
  mockListar,
  mockAdicionar,
  mockAtualizar,
  mockRemover,
  mockRegistrarDoacaoRateada,
  mockAtualizarQuantidadeDoacao,
} from './mockFirestore';

// Só cai no mock em desenvolvimento. Em produção sem credencial o app mostra
// tela de erro em vez de fingir que salvou os dados.
export const MODO_MOCK = !firebaseConfigurado && process.env.NODE_ENV === 'development';
export const CONFIG_AUSENTE = !firebaseConfigurado && !MODO_MOCK;

// O projeto Firebase "paroquiansg-2f648" é compartilhado com outros apps do
// EJC. Para não colidir dados de apps diferentes no mesmo banco, tudo deste
// app mora sob o documento "apps/doacoes" — cada collection lógica
// (equipes, itens, doacoes, coordenadores) vira uma subcollection dali. Ver
// REGRAS_FIREBASE.txt, que espelha esse mesmo caminho.
const NAMESPACE_APP = 'apps/doacoes';
const caminhoColecao = (colecao) => `${NAMESPACE_APP}/${colecao}`;

const ERRO_SEM_CONFIG = new Error(
  'Firebase não configurado: crie o arquivo .env.local com as chaves do projeto.'
);

export function mensagemDeErro(erro) {
  if (!erro) return 'Erro desconhecido.';
  const codigo = erro.code || '';

  if (codigo === 'permission-denied') {
    return (
      'Permissão negada pelo Firestore. Confira duas coisas no Firebase Console: ' +
      '(1) as regras publicadas são as do arquivo REGRAS_FIREBASE.txt; ' +
      '(2) se você usou as REGRAS RECOMENDADAS, o provedor de login "Anônimo" ' +
      'precisa estar ativado em Authentication > Sign-in method.'
    );
  }
  if (codigo === 'unavailable' || codigo === 'failed-precondition') {
    return 'Sem conexão com o Firestore. Verifique a internet e tente novamente.';
  }
  if (codigo === 'not-found') {
    return 'Registro não encontrado. Ele pode ter sido removido por outra pessoa.';
  }
  return erro.message || String(erro);
}

/**
 * Assina uma collection em tempo real. Devolve a função para cancelar.
 */
export function assinarColecao(colecao, aoReceber, aoFalhar) {
  if (MODO_MOCK) return mockAssinar(colecao, aoReceber);

  if (CONFIG_AUSENTE) {
    if (aoFalhar) aoFalhar(ERRO_SEM_CONFIG);
    return () => {};
  }

  return onSnapshot(
    collection(db, caminhoColecao(colecao)),
    (snapshot) => aoReceber(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (erro) => {
      console.error(`Erro ao ouvir a collection "${colecao}":`, erro);
      if (aoFalhar) aoFalhar(erro);
    }
  );
}

export async function listar(colecao) {
  if (MODO_MOCK) return mockListar(colecao);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  const snapshot = await getDocs(collection(db, caminhoColecao(colecao)));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria um documento. Se `dados.id` vier preenchido, usa esse id legível em vez
 * do id aleatório do Firestore.
 */
export async function adicionar(colecao, dados) {
  if (MODO_MOCK) return mockAdicionar(colecao, dados);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  const { id, ...corpo } = dados;
  if (id) {
    await setDoc(doc(db, caminhoColecao(colecao), id), corpo);
    return id;
  }
  const referencia = await addDoc(collection(db, caminhoColecao(colecao)), corpo);
  return referencia.id;
}

export async function atualizar(colecao, id, dados) {
  if (MODO_MOCK) return mockAtualizar(colecao, id, dados);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  await updateDoc(doc(db, caminhoColecao(colecao), id), dados);
}

/**
 * Grava uma doação já rateada entre as equipes que compartilham o item: um
 * documento em "doacoes" por equipe, e o "recebido" do item correspondente
 * incrementado — tudo num lote só (ou grava tudo, ou não grava nada).
 *
 * O contador "recebido" existe só pra tela pública do doador saber quanto
 * cada item ainda precisa sem precisar ler a collection "doacoes" (que tem
 * nome/telefone/endereço de outras pessoas). Admin e coordenadores continuam
 * calculando a partir de "doacoes" mesmo, que é a fonte mais rica.
 *
 * `alocacoes`: [{ itemId, equipeId, itemNome, itemUnidade, quantidade }]
 */
export async function registrarDoacaoRateada(alocacoes, dadosDoador) {
  if (MODO_MOCK) return mockRegistrarDoacaoRateada(alocacoes, dadosDoador);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  const lote = writeBatch(db);

  alocacoes.forEach((alocacao) => {
    const doacaoRef = doc(collection(db, caminhoColecao('doacoes')));
    lote.set(doacaoRef, {
      ...dadosDoador,
      item_id: alocacao.itemId,
      item_nome: alocacao.itemNome,
      item_unidade: alocacao.itemUnidade || '',
      equipe_id: alocacao.equipeId,
      quantidade: alocacao.quantidade,
    });
    lote.update(doc(db, caminhoColecao('itens'), alocacao.itemId), {
      recebido: increment(alocacao.quantidade),
    });
  });

  await lote.commit();
}

/**
 * Corrige a quantidade de uma doação já registrada — o Admin usa isso pra
 * consertar erro de digitação (do doador ou de quem lançou) sem precisar
 * apagar e recriar o registro.
 *
 * O contador "recebido" do item é ajustado pela DIFERENÇA entre a
 * quantidade nova e a antiga (via increment), nunca sobrescrito: ele soma
 * doações de vários doadores, então substituir o valor apagaria a
 * contribuição de todo mundo.
 */
export async function atualizarQuantidadeDoacao(doacao, novaQuantidade) {
  if (MODO_MOCK) return mockAtualizarQuantidadeDoacao(doacao, novaQuantidade);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  const diferenca = novaQuantidade - (Number(doacao.quantidade) || 0);
  const lote = writeBatch(db);

  lote.update(doc(db, caminhoColecao('doacoes'), doacao.id), { quantidade: novaQuantidade });
  if (doacao.item_id && diferenca !== 0) {
    lote.update(doc(db, caminhoColecao('itens'), doacao.item_id), {
      recebido: increment(diferenca),
    });
  }

  await lote.commit();
}

export async function remover(colecao, id) {
  if (MODO_MOCK) return mockRemover(colecao, id);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  await deleteDoc(doc(db, caminhoColecao(colecao), id));
}
