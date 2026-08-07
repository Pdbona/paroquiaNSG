/*
 * Firestore falso, em memória, usado APENAS em desenvolvimento quando não
 * existe .env.local com as credenciais do Firebase. Serve para rodar e testar
 * o app na máquina local sem depender do projeto no Firebase.
 *
 * Nunca é ativado em build de produção: ver MODO_MOCK em services/db.js.
 * Os dados vivem só na memória da aba — recarregar a página volta ao seed.
 */

const SEED = {
  equipes: [
    { id: 'equipe-cozinha', nome: 'Cozinha', ativa: true, criada_em: new Date('2026-08-01') },
    { id: 'equipe-cafezinho', nome: 'Cafezinho', ativa: true, criada_em: new Date('2026-08-01') },
    { id: 'equipe-limpeza', nome: 'Limpeza', ativa: true, criada_em: new Date('2026-08-01') },
  ],
  itens: [
    // "recebido" é o espelho público da soma das doações desse item — a
    // tela do doador usa isso pra ratear sem precisar ler dados de outros
    // doadores. Ver registrarDoacaoRateada em services/db.js.
    { id: 'item-arroz', nome: 'Arroz (kg)', quantidade: 50, recebido: 10, equipe_id: 'equipe-cozinha', ativo: true, criado_em: new Date('2026-08-02') },
    { id: 'item-feijao', nome: 'Feijão (kg)', quantidade: 30, recebido: 0, equipe_id: 'equipe-cozinha', ativo: true, criado_em: new Date('2026-08-02') },
    { id: 'item-cafe', nome: 'Café (pacote 500g)', quantidade: 20, recebido: 0, equipe_id: 'equipe-cafezinho', ativo: true, criado_em: new Date('2026-08-02') },
    { id: 'item-acucar', nome: 'Açúcar (kg)', quantidade: 15, recebido: 0, equipe_id: 'equipe-cafezinho', ativo: true, criado_em: new Date('2026-08-02') },
    { id: 'item-detergente', nome: 'Detergente (un)', quantidade: 24, recebido: 0, equipe_id: 'equipe-limpeza', ativo: true, criado_em: new Date('2026-08-02') },
  ],
  coordenadores: [
    // PIN em texto puro só no seed de desenvolvimento. Em produção o app grava
    // pin_hash (ver services/auth.js).
    { id: 'coord-admin', nome: 'Administrador', tipo: 'admin', pin: '1234', ativo: true, criado_em: new Date('2026-08-01') },
    { id: 'coord-geral-maria', nome: 'Maria (Geral)', tipo: 'coord-geral', pin: '5678', ativo: true, criado_em: new Date('2026-08-01') },
    { id: 'coord-cozinha', nome: 'João (Cozinha)', tipo: 'coord-equipe', equipe_id: 'equipe-cozinha', pin: '9012', ativo: true, criado_em: new Date('2026-08-01') },
    { id: 'coord-cafezinho', nome: 'Ana (Cafezinho)', tipo: 'coord-equipe', equipe_id: 'equipe-cafezinho', pin: '3456', ativo: true, criado_em: new Date('2026-08-01') },
  ],
  doacoes: [
    {
      id: 'doacao-exemplo',
      item_id: 'item-arroz',
      item_nome: 'Arroz (kg)',
      quantidade: 10,
      equipe_id: 'equipe-cozinha',
      doador_nome: 'Doador de Exemplo',
      doador_email: 'exemplo@email.com',
      doador_telefone: '(11) 98765-4321',
      doador_cep: '01001-000',
      doador_endereco: 'Praça da Sé',
      doador_cidade: 'São Paulo',
      doador_estado: 'SP',
      data_criacao: new Date('2026-08-05'),
      entregue: false,
    },
  ],
};

let store = null;
const listeners = {};
let contador = 0;

function iniciar() {
  if (store) return;
  store = {};
  Object.keys(SEED).forEach((colecao) => {
    store[colecao] = SEED[colecao].map((doc) => ({ ...doc }));
  });
}

function garantirColecao(colecao) {
  iniciar();
  if (!store[colecao]) store[colecao] = [];
  if (!listeners[colecao]) listeners[colecao] = new Set();
}

function copiar(colecao) {
  return store[colecao].map((doc) => ({ ...doc }));
}

function notificar(colecao) {
  listeners[colecao].forEach((callback) => callback(copiar(colecao)));
}

function novoId(colecao) {
  contador += 1;
  return `${colecao}-${Date.now().toString(36)}-${contador}`;
}

export function mockAssinar(colecao, aoReceber) {
  garantirColecao(colecao);
  listeners[colecao].add(aoReceber);
  // onSnapshot do Firestore também entrega o estado atual na assinatura.
  aoReceber(copiar(colecao));
  return () => listeners[colecao].delete(aoReceber);
}

export async function mockListar(colecao) {
  garantirColecao(colecao);
  return copiar(colecao);
}

export async function mockAdicionar(colecao, dados) {
  garantirColecao(colecao);
  const id = dados.id || novoId(colecao);
  store[colecao].push({ ...dados, id });
  notificar(colecao);
  return id;
}

export async function mockAtualizar(colecao, id, dados) {
  garantirColecao(colecao);
  const indice = store[colecao].findIndex((doc) => doc.id === id);
  if (indice === -1) throw new Error(`Documento ${id} não existe em ${colecao}`);
  store[colecao][indice] = { ...store[colecao][indice], ...dados };
  notificar(colecao);
}

export async function mockRemover(colecao, id) {
  garantirColecao(colecao);
  store[colecao] = store[colecao].filter((doc) => doc.id !== id);
  notificar(colecao);
}

/** Espelha o comportamento em lote de registrarDoacaoRateada (services/db.js). */
export async function mockRegistrarDoacaoRateada(alocacoes, dadosDoador) {
  garantirColecao('doacoes');
  garantirColecao('itens');

  alocacoes.forEach((alocacao) => {
    const id = novoId('doacoes');
    store.doacoes.push({
      ...dadosDoador,
      id,
      item_id: alocacao.itemId,
      item_nome: alocacao.itemNome,
      equipe_id: alocacao.equipeId,
      quantidade: alocacao.quantidade,
    });

    const indice = store.itens.findIndex((item) => item.id === alocacao.itemId);
    if (indice !== -1) {
      const atual = Number(store.itens[indice].recebido) || 0;
      store.itens[indice] = { ...store.itens[indice], recebido: atual + alocacao.quantidade };
    }
  });

  notificar('doacoes');
  notificar('itens');
}
