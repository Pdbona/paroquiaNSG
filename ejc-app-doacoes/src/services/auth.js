/*
 * Login por PIN contra a collection "coordenadores".
 *
 * PIN em texto puro (decisão explícita do Pablo, 11/ago/2026): o Admin
 * precisa conseguir ver o PIN dos demais coordenadores na tela, então o
 * campo "pin" é gravado sem hash. ATENÇÃO — como esta collection é de
 * leitura pública (`allow read: if true`, necessário pra tela de login
 * listar os nomes antes de qualquer autenticação), isso significa que
 * QUALQUER pessoa que abrir o console do navegador consegue ler o PIN de
 * todos os coordenadores, não só o Admin pelo painel. Ver aviso em
 * REGRAS_FIREBASE.txt. Sem Firebase Auth ou Cloud Functions não tem como
 * restringir isso de verdade — se um dia precisar de segurança real,
 * migrar para Firebase Auth.
 */

import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { adicionar, atualizar } from './db';

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

/**
 * Aceita tanto o campo "pin" (texto puro, atual) quanto "pin_hash" (formato
 * antigo, de antes de 11/ago/2026) — assim contas criadas antes dessa
 * mudança continuam entrando normalmente. Contas novas só gravam "pin".
 */
export async function pinConfere(pin, coordenador) {
  if (!coordenador) return false;

  if (coordenador.pin) {
    return String(coordenador.pin) === String(pin);
  }
  if (coordenador.pin_hash) {
    const dados = new TextEncoder().encode(`ejc-2026-guadalupe:${pin}`);
    const buffer = await window.crypto.subtle.digest('SHA-256', dados);
    const hash = Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return coordenador.pin_hash === hash;
  }
  return false;
}

export async function criarCoordenador({ nome, tipo, pin, equipe_id = null }) {
  return adicionar('coordenadores', {
    nome: nome.trim(),
    tipo,
    equipe_id,
    pin: String(pin),
    ativo: true,
    criado_em: new Date(),
  });
}

export async function redefinirPin(coordenadorId, novoPin) {
  await atualizar('coordenadores', coordenadorId, {
    pin: String(novoPin),
    pin_hash: null,
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
