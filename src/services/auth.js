/*
 * Login por PIN contra a collection "coordenadores".
 *
 * LIMITAÇÃO CONHECIDA: sem Firebase Auth ou Cloud Functions, a verificação
 * acontece no navegador e a collection precisa ser legível. Por isso o PIN é
 * gravado como hash SHA-256 (pin_hash) e nunca em texto puro — quem ler a
 * collection não vê o PIN direto. Um PIN de 4 dígitos ainda é quebrável por
 * força bruta offline, então isto protege contra bisbilhotice, não contra um
 * atacante dedicado. Para o uso do evento (coleta de doações da paróquia) é
 * suficiente; se um dia precisar de segurança real, migrar para Firebase Auth.
 */

import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { adicionar, atualizar } from './db';

const SAL = 'ejc-2026-guadalupe';

/**
 * Login anônimo do Firebase. Não tem nada a ver com o PIN: serve só para o
 * Firestore reconhecer que a chamada veio do app, e assim as regras poderem
 * esconder os dados dos doadores de quem não abriu o site.
 *
 * Se o provedor "Anônimo" não estiver ativado no Firebase Console, segue sem
 * ele — nesse caso use as REGRAS MÍNIMAS do arquivo REGRAS_FIREBASE.txt.
 */
export async function garantirSessaoAnonima() {
  if (!auth) return null; // modo demonstração
  if (auth.currentUser) return auth.currentUser;

  try {
    const credencial = await signInAnonymously(auth);
    return credencial.user;
  } catch (erro) {
    console.warn(
      'Login anônimo do Firebase indisponível:',
      erro.code,
      '— o app segue funcionando com as regras mínimas.'
    );
    return null;
  }
}

export async function gerarHashPin(pin) {
  const dados = new TextEncoder().encode(`${SAL}:${pin}`);
  const buffer = await window.crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Aceita tanto pin_hash quanto o campo pin em texto puro, para não quebrar
 * documentos criados na mão no Firebase Console.
 */
export async function pinConfere(pin, coordenador) {
  if (!coordenador) return false;

  if (coordenador.pin_hash) {
    return coordenador.pin_hash === (await gerarHashPin(pin));
  }
  if (coordenador.pin) {
    return String(coordenador.pin) === String(pin);
  }
  return false;
}

export async function criarCoordenador({ nome, tipo, pin, equipe_id = null }) {
  return adicionar('coordenadores', {
    nome: nome.trim(),
    tipo,
    equipe_id,
    pin_hash: await gerarHashPin(pin),
    ativo: true,
    criado_em: new Date(),
  });
}

export async function redefinirPin(coordenadorId, novoPin) {
  await atualizar('coordenadores', coordenadorId, {
    pin_hash: await gerarHashPin(novoPin),
    // Remove resquício de PIN em texto puro de documentos antigos.
    pin: null,
    pin_atualizado_em: new Date(),
  });
}

/** Dados guardados na sessão da aba — sem PIN nem hash. */
export function sessaoDoCoordenador(coordenador) {
  return {
    id: coordenador.id,
    nome: coordenador.nome,
    tipo: coordenador.tipo,
    equipe_id: coordenador.equipe_id || null,
  };
}
