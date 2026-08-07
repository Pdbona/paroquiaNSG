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
} from './mockFirestore';

// Só cai no mock em desenvolvimento. Em produção sem credencial o app mostra
// tela de erro em vez de fingir que salvou os dados.
export const MODO_MOCK = !firebaseConfigurado && process.env.NODE_ENV === 'development';
export const CONFIG_AUSENTE = !firebaseConfigurado && !MODO_MOCK;

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
    collection(db, colecao),
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

  const snapshot = await getDocs(collection(db, colecao));
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
    await setDoc(doc(db, colecao, id), corpo);
    return id;
  }
  const referencia = await addDoc(collection(db, colecao), corpo);
  return referencia.id;
}

export async function atualizar(colecao, id, dados) {
  if (MODO_MOCK) return mockAtualizar(colecao, id, dados);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  await updateDoc(doc(db, colecao, id), dados);
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
 * `alocacoes`: [{ itemId, equipeId, itemNome, quantidade }]
 */
export async function registrarDoacaoRateada(alocacoes, dadosDoador) {
  if (MODO_MOCK) return mockRegistrarDoacaoRateada(alocacoes, dadosDoador);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  const lote = writeBatch(db);

  alocacoes.forEach((alocacao) => {
    const doacaoRef = doc(collection(db, 'doacoes'));
    lote.set(doacaoRef, {
      ...dadosDoador,
      item_id: alocacao.itemId,
      item_nome: alocacao.itemNome,
      equipe_id: alocacao.equipeId,
      quantidade: alocacao.quantidade,
    });
    lote.update(doc(db, 'itens', alocacao.itemId), {
      recebido: increment(alocacao.quantidade),
    });
  });

  await lote.commit();
}

export async function remover(colecao, id) {
  if (MODO_MOCK) return mockRemover(colecao, id);
  if (CONFIG_AUSENTE) throw ERRO_SEM_CONFIG;

  await deleteDoc(doc(db, colecao, id));
}
