/* Conversões e validações usadas em vários componentes. */

/**
 * O Firestore devolve Timestamp, o mock devolve Date e um JSON antigo pode
 * devolver string. Esta função normaliza os três casos.
 */
export function paraData(valor) {
  if (!valor) return null;
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (valor instanceof Date) return valor;

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarData(valor) {
  const data = paraData(valor);
  return data ? data.toLocaleDateString('pt-BR') : '-';
}

export function formatarDataHora(valor) {
  const data = paraData(valor);
  if (!data) return '-';
  return `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function somenteDigitos(texto) {
  return String(texto || '').replace(/\D/g, '');
}

export function formatarTelefone(texto) {
  const digitos = somenteDigitos(texto).slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function formatarCEP(texto) {
  const digitos = somenteDigitos(texto).slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export function emailValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(texto || '').trim());
}

/** Fixo (10) ou celular (11) dígitos. */
export function telefoneValido(texto) {
  const digitos = somenteDigitos(texto);
  return digitos.length === 10 || digitos.length === 11;
}

export function cepValido(texto) {
  return somenteDigitos(texto).length === 8;
}

export function pinValido(pin) {
  return /^\d{4,6}$/.test(String(pin || ''));
}

// Faixa dos acentos combinantes na tabela Unicode. Escrito com RegExp para o
// arquivo não depender de caracteres combinantes soltos no código-fonte.
const ACENTOS_COMBINANTES = new RegExp('[\\u0300-\\u036f]', 'g');

/** Compara nomes ignorando maiúsculas e acentos, para barrar duplicatas. */
export function normalizarNome(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(ACENTOS_COMBINANTES, '');
}

export function rotuloTipo(tipo) {
  if (tipo === 'admin') return 'Administrador';
  if (tipo === 'coord-geral') return 'Coordenador Geral';
  if (tipo === 'coord-equipe') return 'Coordenador de Equipe';
  return tipo;
}
