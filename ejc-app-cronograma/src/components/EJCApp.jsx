import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
// Import de verdade (não caminho cru) — o webpack processa e copia o arquivo
// pra build/static/media/ com hash. Um caminho tipo '/src/assets/...' só
// existe no código-fonte; depois do build essa pasta não é publicada, e a
// imagem quebra (foi o caso até agora).
import imagemSantaFoto from '../assets/nossa-senhora-guadalupe.png';

const imagemSantaUrl = imagemSantaFoto;

// ============================================================================
// EJC App v2 — Sistema de Gestão e Planejamento de Encontros com Cristo
// ============================================================================

// ============================================================================
// CONFIG DE BRANDING — só o desenvolvedor (Pablo) edita isso no código, ao
// "vender" o sistema para outra paróquia. Ninguém edita isso pelo app.
// ============================================================================
const BRANDING_PADRAO = {
  nomeParoquia: 'Nossa Senhora de Guadalupe',
  nomeEvento: 'II Encontro de Jovens com Cristo',
  ano: 2026,
  datas: '28 a 30 de agosto',
};

const EVENTO_ID = 'ejc-2-guadalupe-2026';
// Projeto Firebase "paroquiansg-2f648" é compartilhado com outros apps do EJC
// (ver ejc-app-doacoes/REGRAS_FIREBASE.txt). Pra não colidir dados entre apps
// diferentes no mesmo banco, tudo deste app mora sob "apps/cronograma/...".
const DOC_PATH = ['apps', 'cronograma', 'eventos', EVENTO_ID];

const CORES = {
  verde: '#1B5E3F',
  verdeEscuro: '#0F3A28',
  dourado: '#D4AF37',
  terracota: '#8B4513',
  marfim: '#FFFFF0',
  vermelhoSangue: '#7A0C0C',
};

const DIAS_LABEL = {
  '2026-08-28': 'Sexta, 28/08',
  '2026-08-29': 'Sábado, 29/08',
  '2026-08-30': 'Domingo, 30/08',
};

// ---------------------------------------------------------------------------
// Dados-semente do cronograma do encontrista (extraídos da planilha oficial
// em 06/08/2026). As tarefas de cada equipe por momento ficam numa coleção
// à parte — ver TAREFAS_CRONOGRAMA_SEMENTE mais abaixo.
// ---------------------------------------------------------------------------
const SEED_DIA_28 = [
  ['17:00', 60, 'Montagem da escola'],
  ['18:00', 30, 'Vigília de abertura'],
  ['19:00', 30, 'Término montagem da escola'],
  ['19:30', 30, 'Chegada dos encontristas (acolhida)'],
  ['20:00', 30, 'Teatro do General e Brincadeiras'],
  ['20:30', 20, 'Lanche'],
  ['20:50', 5, 'Movimentação para o plenário'],
  ['20:55', 20, 'Apresentação equipe sala'],
  ['21:15', 40, 'Palestra: Religiosidade'],
  ['21:55', 20, 'Meditação sobre o tema do encontro e apresentação da música tema'],
  ['22:15', 20, 'Brincadeiras'],
  ['22:35', 15, 'Avisos e saída'],
  ['22:50', 20, 'Vigília de encerramento'],
];

const SEED_DIA_29 = [
  ['05:00', 60, 'Chegada dos servos'],
  ['06:00', 20, 'Vigília de abertura'],
  ['06:20', 40, 'Término arrumação da escola'],
  ['07:00', 30, 'Chegada dos encontristas'],
  ['07:30', 15, 'Brincadeiras'],
  ['07:45', 20, 'Café'],
  ['08:05', 5, 'Movimentação para a capela'],
  ['08:10', 50, 'Palestra: Espiritualidade - Momento Orante Mariano (Capela)'],
  ['09:00', 5, 'Movimentação para o plenário'],
  ['09:05', 10, 'Vídeo dos moitas'],
  ['09:15', 45, 'Palestra: O que somos Diante de Deus?'],
  ['10:00', 5, 'Movimentação para o café'],
  ['10:05', 20, 'Café'],
  ['10:25', 5, 'Movimentação para o plenário'],
  ['10:30', 45, 'Palestra: Por que vivemos e personalidade: fases da vida'],
  ['11:15', 5, 'Movimentação para círculo'],
  ['11:20', 30, 'Círculo'],
  ['11:50', 5, 'Movimentação para o plenário'],
  ['11:55', 15, 'Apresentação do círculo'],
  ['12:10', 35, 'Bate-papo: Juventude e Serviço'],
  ['12:45', 10, 'Apresentação dos anjos'],
  ['12:55', 5, 'Movimentação para o almoço'],
  ['13:00', 50, 'Almoço'],
  ['13:50', 5, 'Movimentação para o plenário'],
  ['13:55', 45, 'Palestra: Um Jovem Chamado Jesus'],
  ['14:40', 10, 'Brincadeira: Marmelujo'],
  ['14:50', 35, 'Palestra: Sacramentos'],
  ['15:25', 5, 'Movimentação para o círculo'],
  ['15:30', 20, 'Círculo'],
  ['15:50', 5, 'Movimentação para o plenário'],
  ['15:55', 15, 'Apresentação do círculo'],
  ['16:10', 40, 'Palestra Ceia Eucarística'],
  ['16:50', 5, 'Movimentação para o lanche'],
  ['16:55', 25, 'Lanche'],
  ['17:20', 5, 'Movimentação para a capela'],
  ['17:25', 40, 'Palestra: Pais e filhos + testemunho (na capela) — em paralelo, palestra para os pais no plenário'],
  ['18:05', 5, 'Movimentação para a quadra'],
  ['18:10', 30, 'Momento dos pais'],
  ['18:40', 5, 'Movimentação para o plenário'],
  ['18:45', 10, 'Teatro Life'],
  ['18:55', 30, 'Palestra: Filho Pródigo'],
  ['19:25', 40, 'Adoração'],
  ['20:05', 5, 'Movimentação para a quadra'],
  ['20:10', 60, 'Jantar'],
  ['21:10', 15, 'Teatro Jornal'],
  ['21:25', 15, 'Avisos e Saída'],
  ['21:40', 20, 'Vigília de Encerramento'],
];

const SEED_DIA_30 = [
  ['06:00', 30, 'Chegada dos servos'],
  ['06:30', 30, 'Vigília Inicial'],
  ['07:00', 30, 'Chegada dos encontristas'],
  ['07:30', 15, 'Brincadeiras'],
  ['07:45', 20, 'Café'],
  ['08:05', 5, 'Movimentação para a capela'],
  ['08:10', 40, 'Palestra: Espiritualidade'],
  ['08:50', 5, 'Música especial'],
  ['08:55', 5, 'Movimentação para o plenário'],
  ['09:00', 30, 'Palestra: Jovem Ontem Hoje e Amanhã'],
  ['09:30', 10, 'Brincadeiras'],
  ['09:40', 5, 'Movimentação para o café'],
  ['09:45', 20, 'Café'],
  ['10:05', 5, 'Movimentação para o plenário'],
  ['10:10', 30, 'Palestra: Igreja'],
  ['10:40', 5, 'Movimentação para o Círculo'],
  ['10:45', 20, 'Círculo'],
  ['11:05', 5, 'Movimentação para o plenário'],
  ['11:10', 15, 'Apresentação dos Círculos'],
  ['11:25', 30, 'Palestra: O Jovem, a fé e o discernimento Vocacional'],
  ['11:55', 5, 'Movimentação para o Almoço'],
  ['12:00', 10, 'Brincadeira do Papa Leão XIV'],
  ['12:10', 40, 'Almoço'],
  ['12:50', 60, 'Apresentação das equipes'],
  ['13:50', 30, 'Momento das Rosas'],
  ['14:20', 5, 'Movimentação para o plenário'],
  ['14:25', 30, 'Palestra: Namoro, Noivado, Casamento e Sexo'],
  ['14:55', 5, 'Movimentação para a missa'],
  ['15:00', 90, 'Missa'],
  ['16:30', 20, 'Festa'],
  ['16:50', 15, 'Café'],
  ['17:05', 20, 'Círculo'],
  ['17:25', 20, 'Apresentação dos Círculos, entrega das faixas / Movimentação para o plenário'],
  ['17:45', 50, 'Palestra: Um Jovem Cristão no mundo de hoje'],
  ['18:35', 10, 'Avisos Finais'],
  ['18:45', 5, 'Movimentação para a capela'],
  ['18:50', 15, 'Entrega das Plantas e Saco do Choro'],
  ['19:05', 20, 'Corredor'],
  ['19:25', 20, 'Vigília de Encerramento'],
  ['19:45', 30, 'Arrumação final da escola (TODOS os servos)'],
];

function construirCronogramaSemente() {
  const dias = { '2026-08-28': SEED_DIA_28, '2026-08-29': SEED_DIA_29, '2026-08-30': SEED_DIA_30 };
  const itens = [];
  let ordem = 0;
  Object.entries(dias).forEach(([dia, linhas]) => {
    linhas.forEach(([hora, duracaoMin, movimento]) => {
      itens.push({
        id: `${dia}-${ordem}`,
        dia,
        ordem: ordem++,
        hora,
        duracaoMin,
        movimento,
        ativo: true,
      });
    });
  });
  return itens;
}

// ---------------------------------------------------------------------------
// Equipes — cadastro base (11 equipes de servos da planilha oficial +
// Coordenadores Gerais e Dirigentes, que aparecem nas escalas de
// Vigília/Capela Mariana mas não têm coluna própria no cronograma). Semente
// só entra se "equipes" ainda estiver vazio (não sobrescreve o que o
// Dirigente já tiver cadastrado/editado).
// ---------------------------------------------------------------------------
const NOME_EQUIPE = {
  CAFEZINHO: 'Cafezinho', COZINHA: 'Cozinha', MUSICA: 'Música', CIRCULO: 'Círculo',
  SALA: 'Sala', ACOLHIDA: 'Acolhida', ORDEM: 'Ordem', LITURGIA: 'Liturgia',
  SECRETARIA: 'Secretaria', EXTERNA: 'Externa', LOJINHA: 'Lojinha',
};

const EQUIPES_SEMENTE_NOMES = [...Object.values(NOME_EQUIPE), 'Coordenadores Gerais', 'Dirigentes'];

function construirEquipesSemente() {
  return EQUIPES_SEMENTE_NOMES.map((nome) => ({
    id: `equipe-semente-${nome.toLowerCase().replace(/\s+/g, '-')}`,
    nome,
    observacoes: '',
    membrosIds: [],
    coordenadoresIds: [],
    senha: '',
  }));
}

// ---------------------------------------------------------------------------
// Tarefas de equipe — dados-semente extraídos da planilha oficial (carga
// inicial de 06/08/2026). A partir daqui, tudo se edita pelo Cadastro >
// Escalas, não mais pela planilha.
//
// Modelo: cada linha é UMA tarefa de UMA equipe em UM horário — não fica mais
// presa 1-para-1 a uma linha do cronograma do encontrista (a vigília, por
// exemplo, roda em paralelo, com seus próprios horários).
//   origem 'cronograma' → tarefa nasceu de uma coluna de equipe da planilha,
//     junto de um "momento" específico do encontrista. Não guarda hora própria:
//     ela é sempre resolvida a partir do cronogramaItemId (se o Coordenador
//     atrasar/adiantar o momento, a tarefa acompanha automaticamente).
//   origem 'vigilia' | 'almoco' | 'jantar' → escala própria, com hora e
//     duração independentes do cronograma do encontrista.
// ---------------------------------------------------------------------------

// [dia, movimento (texto exato do item no cronograma), equipe, tarefa]
const TAREFAS_CRONOGRAMA_SEMENTE = [
  ['2026-08-28', 'Montagem da escola', 'CAFEZINHO', 'Preparo do café de boas-vindas.'],
  ['2026-08-28', 'Montagem da escola', 'COZINHA', 'Adiantar o preparo do dia seguinte.'],
  ['2026-08-28', 'Montagem da escola', 'MUSICA', 'Ajustar o som no plenário.'],
  ['2026-08-28', 'Montagem da escola', 'CIRCULO', 'Ajudar na montagem da sala de Liturgia, para a vigília inicial.'],
  ['2026-08-28', 'Montagem da escola', 'SALA', 'Arrumar o plenário.'],
  ['2026-08-28', 'Montagem da escola', 'ACOLHIDA', 'Ajudar a equipe de cafezinho.'],
  ['2026-08-28', 'Montagem da escola', 'ORDEM', 'Limpeza geral da sala de Liturgia, do plenário e dos banheiros. Além de colocar os itens de higiene nos banheiros.'],
  ['2026-08-28', 'Montagem da escola', 'LITURGIA', 'Arrumar a sala para a vigília inicial.'],
  ['2026-08-28', 'Montagem da escola', 'SECRETARIA', 'Arrumar a sala de Liturgia e entregar as lembranças e as placas com os nomes do encontristas à Ordem.'],
  ['2026-08-28', 'Montagem da escola', 'EXTERNA', 'O jovem da equipe + G5 Ficha organiza os crachás e as canecas. Separar por Tios de Externa para facilitar a entrega.'],
  ['2026-08-28', 'Montagem da escola', 'LOJINHA', 'Ajudar na montagem da sala de Liturgia.'],
  ['2026-08-28', 'Término montagem da escola', 'CAFEZINHO', 'Arrumação da mesa de café'],
  ['2026-08-28', 'Chegada dos encontristas (acolhida)', 'MUSICA', 'Os jovens que farão parte do General se organizam.'],
  ['2026-08-28', 'Chegada dos encontristas (acolhida)', 'CIRCULO', 'Preparo para o General.'],
  ['2026-08-28', 'Chegada dos encontristas (acolhida)', 'SALA', 'Preparo para o General.'],
  ['2026-08-28', 'Chegada dos encontristas (acolhida)', 'ACOLHIDA', 'Preparo para o "Tapete Vermelho".'],
  ['2026-08-28', 'Chegada dos encontristas (acolhida)', 'ORDEM', 'Confere a limpeza do plenário e dos banheiros.'],
  ['2026-08-28', 'Chegada dos encontristas (acolhida)', 'EXTERNA', 'Tios liberados para visita das casas dos encontristas'],
  ['2026-08-28', 'Lanche', 'MUSICA', 'Jovens infiltrados. Os que farão o violão escondidos junto com o General.'],
  ['2026-08-28', 'Lanche', 'CIRCULO', 'Jovens infiltrados.'],
  ['2026-08-28', 'Lanche', 'SALA', 'Jovens infiltrados.'],
  ['2026-08-28', 'Lanche', 'ACOLHIDA', 'Após a brincadeira, a equipe fica responsável pela reposição do café, se necessário.'],
  ['2026-08-28', 'Teatro do General e Brincadeiras', 'SALA', 'Quando começar as últimas músicas, "Boa Vontade" e Animadores indicam o uso do banheiro.'],
  ['2026-08-28', 'Teatro do General e Brincadeiras', 'ACOLHIDA', 'A equipe se retira e vai para a sala de apoio.'],
  ['2026-08-28', 'Movimentação para o plenário', 'LITURGIA', 'Envio do Palestrante'],
  ['2026-08-28', 'Palestra: Religiosidade', 'CIRCULO', 'A equipe começa a montagem dos círculos.'],
  ['2026-08-28', 'Palestra: Religiosidade', 'ORDEM', 'Limpeza do pátio (após café) e limpeza dos banheiros dos servos.'],
  ['2026-08-28', 'Palestra: Religiosidade', 'SECRETARIA', 'Ajudar na arrumação das salas de círculo.'],
  ['2026-08-29', 'Chegada dos servos', 'CAFEZINHO', 'Preparo do café da manhã.'],
  ['2026-08-29', 'Chegada dos servos', 'ORDEM', 'Verificar limpeza dos banheiros, plenários e quadra.'],
  ['2026-08-29', 'Chegada dos servos', 'SECRETARIA', 'Entregar as lembranças do dia para a ordem'],
  ['2026-08-29', 'Brincadeiras', 'LITURGIA', 'Envio do Palestrante'],
  ['2026-08-29', 'Café', 'LITURGIA', 'Equipe Externa'],
  ['2026-08-29', 'Café', 'EXTERNA', 'Equipe vai para Vigilia'],
  ['2026-08-29', 'Palestra: Espiritualidade - Momento Orante Mariano (Capela)', 'CAFEZINHO', 'Retirar o café.'],
  ['2026-08-29', 'Palestra: Espiritualidade - Momento Orante Mariano (Capela)', 'ORDEM', 'Ajudar o cafezinho a desmontar o café e limpar o pátio'],
  ['2026-08-29', 'Movimentação para o plenário', 'LITURGIA', 'Envio do Palestrante'],
  ['2026-08-29', 'Palestra: O que somos Diante de Deus?', 'CAFEZINHO', 'Organizar a mesa do próximo café'],
  ['2026-08-29', 'Palestra: O que somos Diante de Deus?', 'ORDEM', 'Ajudar o cafezinho a arrumar o café'],
  ['2026-08-29', 'Café', 'CIRCULO', 'Se arrumar para assistirem palestra e já ficam direto para o circulo'],
  ['2026-08-29', 'Palestra: Por que vivemos e personalidade: fases da vida', 'CAFEZINHO', 'Retirar o café'],
  ['2026-08-29', 'Palestra: Por que vivemos e personalidade: fases da vida', 'COZINHA', '11:00 Início do almoço'],
  ['2026-08-29', 'Palestra: Por que vivemos e personalidade: fases da vida', 'ACOLHIDA', '11:00 Almoçar'],
  ['2026-08-29', 'Palestra: Por que vivemos e personalidade: fases da vida', 'ORDEM', 'Desarrumar o café e Limpar o Pátio'],
  ['2026-08-29', 'Palestra: Por que vivemos e personalidade: fases da vida', 'LOJINHA', 'Arrumar a lojinha no lugar determinado'],
  ['2026-08-29', 'Círculo', 'SALA', 'Se arrumar para almoço dos encontristas'],
  ['2026-08-29', 'Movimentação para o plenário', 'ACOLHIDA', 'Arrumar mesas e cadeiras para o almoço'],
  ['2026-08-29', 'Movimentação para o plenário', 'LOJINHA', 'Anjos se arrumarem'],
  ['2026-08-29', 'Apresentação do círculo', 'LOJINHA', 'Anjos irem para a porta do plenário'],
  ['2026-08-29', 'Apresentação dos anjos', 'MUSICA', 'Entregar respostas dos círculos para a secretaria'],
  ['2026-08-29', 'Bate-papo: Juventude e Serviço', 'SALA', 'Ajudar a ordem a desarrumar o pátio'],
  ['2026-08-29', 'Bate-papo: Juventude e Serviço', 'ACOLHIDA', 'Limpar o pátio e desarrumar as mesas e cadeiras do almoço'],
  ['2026-08-29', 'Bate-papo: Juventude e Serviço', 'LOJINHA', 'Os anjos se arrumam e vão para a porta do plenário.'],
  ['2026-08-29', 'Círculo', 'CAFEZINHO', 'Arrumar a mesa do café'],
  ['2026-08-29', 'Círculo', 'ACOLHIDA', 'Verificar limpeza do plenário'],
  ['2026-08-29', 'Lanche', 'CIRCULO', 'Entregar respostas dos círculos para a secretaria'],
  ['2026-08-29', 'Apresentação do círculo', 'CAFEZINHO', 'Desarrumar a mesa do café'],
  ['2026-08-29', 'Apresentação do círculo', 'ACOLHIDA', 'Limpar o pátio'],
  ['2026-08-29', 'Palestra Ceia Eucarística', 'EXTERNA', 'Tio Transportes, junto com G5-Ficha, recebe os pais no portão 2.'],
  ['2026-08-29', 'Movimentação para a capela', 'EXTERNA', 'G5-Ficha leva os pais para o plenário.'],
  ['2026-08-29', 'Palestra: Pais e filhos + testemunho (na capela) — em paralelo, palestra para os pais no plenário', 'CAFEZINHO', 'Ao mesmo tempo, palestra para os pais acontece no plenário (25min) — tem que acabar antes das 18h.'],
  ['2026-08-29', 'Palestra: Pais e filhos + testemunho (na capela) — em paralelo, palestra para os pais no plenário', 'EXTERNA', 'Tios Transporte vão para a quadra organizar a posição dos encontristas'],
  ['2026-08-29', 'Movimentação para a quadra', 'LITURGIA', 'Tocador e cantor da liturgia tocam para os pais'],
  ['2026-08-29', 'Momento dos pais', 'CIRCULO', 'Se preparar para o teatro e ajudar na arrumação do plenário'],
  ['2026-08-29', 'Momento dos pais', 'SALA', 'Coordenador organiza com a Ordem o plenário para o teatro'],
  ['2026-08-29', 'Momento dos pais', 'ORDEM', 'Organizar o plenário para o Teatro Life'],
  ['2026-08-29', 'Momento dos pais', 'EXTERNA', 'Tia Transporte recepciona os pais e os leva até o local'],
  ['2026-08-29', 'Palestra: Filho Pródigo', 'SALA', 'Boas Vontades ficam atentos à chegada de Jesus para entrar com ele, com as velas'],
  ['2026-08-29', 'Palestra: Filho Pródigo', 'ORDEM', 'Arrumar o jantar'],
  ['2026-08-29', 'Palestra: Filho Pródigo', 'LITURGIA', 'Preparar Jesus para ir ao plenário (Diácono) — dois jovens acompanham com as velas até a porta do plenário e as entregam a dois Boa Vontade'],
  ['2026-08-29', 'Jantar', 'CIRCULO', 'Os membros que vão participar do teatro saem antes para se arrumar'],
  // Correções manuais (nomes na planilha divergiam levemente do cronograma já digitado no app)
  ['2026-08-28', 'Apresentação equipe sala', 'CAFEZINHO', 'Desarrumar café'],
  ['2026-08-29', 'Término arrumação da escola', 'MUSICA', 'Ligar e conferir equipamentos de som.'],
  ['2026-08-29', 'Término arrumação da escola', 'ACOLHIDA', 'Se arrumar para a recepção dos encontristas'],
  ['2026-08-29', 'Término arrumação da escola', 'ORDEM', 'Colocar as lembrancinhas nas cadeiras dos encontristas'],
];

const VIGILIA_SEXTA_SEMENTE = [
  { hora: '19:30', duracaoMin: 60, equipeNome: 'Lojinha', dia: '2026-08-28' },
  { hora: '20:30', duracaoMin: 30, equipeNome: 'Acolhida', dia: '2026-08-28' },
  { hora: '21:00', duracaoMin: 30, equipeNome: 'Cozinha', dia: '2026-08-28' },
  { hora: '21:30', duracaoMin: 30, equipeNome: 'Coordenadores Gerais', dia: '2026-08-28' },
];

const VIGILIA_SABADO_SEMENTE = [
  { hora: '08:00', duracaoMin: 60, equipeNome: 'Externa', dia: '2026-08-29' },
  { hora: '09:00', duracaoMin: 60, equipeNome: 'Círculo', dia: '2026-08-29' },
  { hora: '10:00', duracaoMin: 60, equipeNome: 'Ordem', dia: '2026-08-29' },
  { hora: '11:00', duracaoMin: 60, equipeNome: 'Secretaria', dia: '2026-08-29' },
  { hora: '12:00', duracaoMin: 60, equipeNome: 'Dirigentes', dia: '2026-08-29' },
  { hora: '13:00', duracaoMin: 60, equipeNome: 'Cafezinho', dia: '2026-08-29' },
  { hora: '14:00', duracaoMin: 50, equipeNome: 'Cozinha', dia: '2026-08-29' },
  { hora: '14:50', duracaoMin: 50, equipeNome: 'Acolhida', dia: '2026-08-29' },
  { hora: '15:40', duracaoMin: 80, equipeNome: 'Sala', dia: '2026-08-29' },
  { hora: '17:00', duracaoMin: 220, equipeNome: 'Lojinha', dia: '2026-08-29' },
  { hora: '20:40', duracaoMin: 30, equipeNome: 'Coordenadores Gerais', dia: '2026-08-29' },
];

const VIGILIA_DOMINGO_SEMENTE = [
  { hora: '07:00', duracaoMin: 45, equipeNome: 'Ordem', dia: '2026-08-30' },
  { hora: '07:45', duracaoMin: 45, equipeNome: 'Cafezinho', dia: '2026-08-30' },
  { hora: '08:30', duracaoMin: 40, equipeNome: 'Círculo', dia: '2026-08-30' },
  { hora: '09:10', duracaoMin: 50, equipeNome: 'Externa', dia: '2026-08-30' },
  { hora: '10:00', duracaoMin: 45, equipeNome: 'Secretaria', dia: '2026-08-30' },
  { hora: '10:45', duracaoMin: 30, equipeNome: 'Sala', dia: '2026-08-30' },
];

// Aplica-se automaticamente a Sábado E Domingo (mesma escala nos dois dias) —
// por isso não guarda "dia" e fica numa coleção própria (capelaMariana).
const CAPELA_MARIANA_SEMENTE = [
  { hora: '07:00', duracaoMin: 80, equipeNome: 'Cozinha' },
  { hora: '08:20', duracaoMin: 60, equipeNome: 'Encontristas' },
  { hora: '09:20', duracaoMin: 40, equipeNome: 'Acolhida' },
  { hora: '10:00', duracaoMin: 45, equipeNome: 'Lojinha' },
  { hora: '10:45', duracaoMin: 45, equipeNome: 'Coordenadores Gerais' },
  { hora: '11:30', duracaoMin: 150, equipeNome: 'Sala' },
  { hora: '14:00', duracaoMin: 60, equipeNome: 'Ordem' },
  { hora: '15:00', duracaoMin: 60, equipeNome: 'Dirigentes' },
  { hora: '16:00', duracaoMin: 60, equipeNome: 'Secretaria' },
  { hora: '17:00', duracaoMin: 60, equipeNome: 'Círculo' },
  { hora: '18:00', duracaoMin: 95, equipeNome: 'Cafezinho' },
  { hora: '19:35', duracaoMin: 45, equipeNome: 'Liturgia' },
  { hora: '20:20', duracaoMin: 30, equipeNome: 'Externa' },
];

const ALMOCO_SABADO_SEMENTE = [
  { hora: '11:00', duracaoMin: 30, equipeNome: 'Lojinha', dia: '2026-08-29' },
  { hora: '11:00', duracaoMin: 30, equipeNome: 'Acolhida', dia: '2026-08-29' },
  { hora: '11:00', duracaoMin: 30, equipeNome: 'Ordem', dia: '2026-08-29' },
  { hora: '11:30', duracaoMin: 30, equipeNome: 'Cafezinho', dia: '2026-08-29' },
  { hora: '11:30', duracaoMin: 30, equipeNome: 'Dirigentes', dia: '2026-08-29' },
  { hora: '12:00', duracaoMin: 30, equipeNome: 'Liturgia', dia: '2026-08-29' },
  { hora: '12:00', duracaoMin: 30, equipeNome: 'Secretaria', dia: '2026-08-29' },
  { hora: '12:30', duracaoMin: 30, equipeNome: 'Círculo', dia: '2026-08-29' },
  { hora: '12:30', duracaoMin: 30, equipeNome: 'Coordenadores Gerais', dia: '2026-08-29' },
];

const ALMOCO_DOMINGO_SEMENTE = ALMOCO_SABADO_SEMENTE.map((t) => ({ ...t, dia: '2026-08-30' }));

const JANTAR_SABADO_SEMENTE = [
  { hora: '18:30', duracaoMin: 30, equipeNome: 'Acolhida', dia: '2026-08-29' },
  { hora: '18:30', duracaoMin: 30, equipeNome: 'Ordem', dia: '2026-08-29' },
  { hora: '18:30', duracaoMin: 30, equipeNome: 'Lojinha', dia: '2026-08-29' },
  { hora: '18:30', duracaoMin: 30, equipeNome: 'Liturgia', dia: '2026-08-29' },
  { hora: '19:00', duracaoMin: 35, equipeNome: 'Secretaria', dia: '2026-08-29' },
  { hora: '19:00', duracaoMin: 35, equipeNome: 'Cafezinho', dia: '2026-08-29' },
  { hora: '19:00', duracaoMin: 35, equipeNome: 'Externa', dia: '2026-08-29' },
  { hora: '19:35', duracaoMin: 30, equipeNome: 'Círculo', dia: '2026-08-29' },
  { hora: '19:35', duracaoMin: 30, equipeNome: 'Dirigentes', dia: '2026-08-29' },
];

// Monta a lista final de tarefasEquipe: acha o id do item do cronograma pelo
// (dia + texto do movimento) pra tarefas origem 'cronograma', e usa hora
// própria pra vigília/almoço/jantar.
function construirTarefasEquipeSemente(cronograma) {
  const porChave = new Map();
  cronograma.forEach((item) => porChave.set(`${item.dia}|${item.movimento.trim().toLowerCase()}`, item.id));

  const tarefas = [];
  let n = 0;

  TAREFAS_CRONOGRAMA_SEMENTE.forEach(([dia, movimento, sigla, tarefa]) => {
    const cronogramaItemId = porChave.get(`${dia}|${movimento.trim().toLowerCase()}`);
    if (!cronogramaItemId) return; // planilha referenciou um momento que não existe (não deveria acontecer)
    tarefas.push({
      id: `te-${n++}`,
      dia,
      equipeNome: NOME_EQUIPE[sigla] || sigla,
      tarefa,
      origem: 'cronograma',
      cronogramaItemId,
    });
  });

  const listasComHoraPropria = [
    ...VIGILIA_SEXTA_SEMENTE.map((t) => ({ ...t, origem: 'vigilia', tarefa: 'Plantão de Vigília' })),
    ...VIGILIA_SABADO_SEMENTE.map((t) => ({ ...t, origem: 'vigilia', tarefa: 'Plantão de Vigília' })),
    ...VIGILIA_DOMINGO_SEMENTE.map((t) => ({ ...t, origem: 'vigilia', tarefa: 'Plantão de Vigília' })),
    ...ALMOCO_SABADO_SEMENTE.map((t) => ({ ...t, origem: 'almoco', tarefa: 'Servir o Almoço' })),
    ...ALMOCO_DOMINGO_SEMENTE.map((t) => ({ ...t, origem: 'almoco', tarefa: 'Servir o Almoço' })),
    ...JANTAR_SABADO_SEMENTE.map((t) => ({ ...t, origem: 'jantar', tarefa: 'Servir o Jantar' })),
  ];
  listasComHoraPropria.forEach((t) => {
    // Sem duracaoMin: Vigília/Almoço/Jantar só têm hora de início na fonte —
    // o fim de cada plantão é calculado sozinho (ver comFimAteProximoDaMesmaEscala).
    tarefas.push({ id: `te-${n++}`, dia: t.dia, equipeNome: t.equipeNome, tarefa: t.tarefa, origem: t.origem, hora: t.hora, cronogramaItemId: null });
  });

  return tarefas;
}

// Capela Mariana — aplica-se automaticamente a Sábado e Domingo (ver função
// que resolve a timeline do dia, mais abaixo). Sem duracaoMin, mesmo motivo
// acima.
function construirCapelaMarianaSemente() {
  return CAPELA_MARIANA_SEMENTE.map((t, i) => ({ id: `cap-${i}`, hora: t.hora, equipeNome: t.equipeNome }));
}

// ---------------------------------------------------------------------------
// Funções fixas do G5 (Dirigentes) — mesmo padrão em todo EJC. Cada função
// recebe 3-4 Servos vinculados (config.dirigentesPorFuncao), TODOS usando a
// mesma senha compartilhada (config.senhaDirigente) — não há identificação
// individual de qual dirigente logou, só a função dá acesso completo.
// ---------------------------------------------------------------------------
const FUNCOES_DIRIGENTE = ['Ficha', 'Montagem', 'Finanças', 'Pós Encontro', 'Palestra'];

// ---------------------------------------------------------------------------
// CONFIG_PADRAO — senhas de demonstração. TROCAR antes do evento real
// (Dirigente > Cadastro Geral > Usuários > Senha de Acesso).
// Servo, Tela e Dirigente usam senha única compartilhada pela função inteira.
// Coordenador de Equipe NÃO tem senha geral — cada equipe tem a sua própria
// senha (compartilhada só entre os coordenadores daquela equipe), cadastrada
// em Cadastro > Coordenadores de Equipe (campo "senha" de cada equipe). Só o
// Coordenador Geral usa senha individual por pessoa — precisa identificar
// quem emitiu um aviso.
// ---------------------------------------------------------------------------
const CONFIG_PADRAO = {
  tema: 'dark',
  // Tema exclusivo da Tela (telão) — separado de "tema" (celular: Servo,
  // Coordenadores, Dirigente) pra alternar um não mudar o outro.
  temaTela: 'dark',
  senhaServo: 'servo',
  senhaTela: 'tela',
  senhaDirigente: 'dirigente',
  coordenadoresGerais: [
    { servoId: null, nome: 'Coordenador Geral 1', senha: 'geral1' },
    { servoId: null, nome: 'Coordenador Geral 2', senha: 'geral2' },
  ],
  dirigentesPorFuncao: FUNCOES_DIRIGENTE.reduce((acc, f) => ({ ...acc, [f]: [] }), {}),
};

const CRONOGRAMA_SEMENTE = construirCronogramaSemente();

const ENCONTRO_PADRAO = {
  cronograma: CRONOGRAMA_SEMENTE,
  servos: [],
  encontristas: [],
  equipes: construirEquipesSemente(),
  tarefasEquipe: construirTarefasEquipeSemente(CRONOGRAMA_SEMENTE),
  capelaMariana: construirCapelaMarianaSemente(),
  avisos: [],
  config: CONFIG_PADRAO,
};

// ---------------------------------------------------------------------------
// Helpers de tempo
// ---------------------------------------------------------------------------
function horaParaMin(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
function minParaHora(totalMin) {
  const t = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function agoraComoData(simulado) {
  if (simulado) return new Date(simulado);
  return new Date();
}
function dataParaDiaHora(data) {
  const dia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  const hora = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  return { dia, hora, minutos: horaParaMin(hora) };
}

// Aplica edição de nome/hora/duração em um item e propaga o deslocamento
// (cascata) para todos os itens seguintes do mesmo dia. O delta cascateado é
// a mudança no HORÁRIO DE TÉRMINO do item editado (hora+duração) — cobre os
// dois jeitos de mexer no cronograma: só mudar a duração (hora do item
// continua a mesma, ex.: ajuste ao vivo de atraso/adiantamento) ou mudar
// também o horário de início (ex.: correção no Cadastro > Cronograma). Sem
// isso, editar só a hora de início (sem mudar a duração) não deslocava nada
// depois, porque o delta antigo olhava só pra duração. `novaHora` é
// opcional — quando omitida, mantém a hora atual do item (uso do modal Ao
// Vivo, que não deixa editar hora). Retorna a lista atualizada e o delta em
// minutos (para gerar o aviso de atraso/adiantamento).
function aplicarEdicaoComCascata(cronograma, id, novoNome, novaDuracao, novaHora) {
  const item = cronograma.find((i) => i.id === id);
  if (!item) return { cronograma, delta: 0, nomeAntigo: '' };
  const nomeAntigo = item.movimento;
  const horaFinal = novaHora || item.hora;
  const delta = horaParaMin(horaFinal) + novaDuracao - (horaParaMin(item.hora) + item.duracaoMin);
  const atualizado = cronograma.map((i) => {
    if (i.id === id) {
      return { ...i, movimento: novoNome, duracaoMin: novaDuracao, hora: horaFinal };
    }
    if (i.dia === item.dia && i.ordem > item.ordem && delta !== 0) {
      return { ...i, hora: minParaHora(horaParaMin(i.hora) + delta) };
    }
    return i;
  });
  return { cronograma: atualizado, delta, nomeAntigo };
}

function criarAviso(tipo, mensagem, duracaoMs) {
  const agora = Date.now();
  return {
    id: `av-${agora}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    mensagem,
    criadoEm: agora,
    expiraEm: agora + duracaoMs,
  };
}

// Determina o papel de acesso a partir da senha digitada, checando na ordem:
// Servo (compartilhada) → Tela (compartilhada) → Coordenador de Equipe (a
// senha é da EQUIPE, não da função — cada equipe tem a sua própria, então a
// senha já identifica automaticamente qual equipe a pessoa coordena) →
// Dirigente (compartilhada) → Coordenador Geral (individual, só esse
// identifica quem logou). Retorna null se não bater com nada.
function resolverAcessoPorSenha(senha, config, equipes) {
  if (!senha) return null;
  if (senha === config.senhaServo) return { perfil: 'servo', nome: null };
  if (senha === config.senhaTela) return { perfil: 'tela', nome: null };
  const equipe = (equipes || []).find((e) => e.senha && e.senha === senha);
  if (equipe) return { perfil: 'coordenadorEquipe', nome: equipe.nome };
  if (senha === config.senhaDirigente) return { perfil: 'dirigente', nome: null };
  const cg = (config.coordenadoresGerais || []).find((c) => c.senha === senha);
  if (cg) return { perfil: 'coordenadorGeral', nome: cg.nome };
  return null;
}

// ---------------------------------------------------------------------------
// Timeline de tarefas de equipe — junta cronograma + vigília + almoço/jantar
// + Capela Mariana num único horário resolvido por dia, pra alimentar tanto
// o telão quanto a visão "Ao Vivo" do celular.
// ---------------------------------------------------------------------------
const EQUIPE_ENCONTRISTAS = 'Encontristas';
function ehEquipeEncontristas(equipeNome) {
  return (equipeNome || '').trim().toLowerCase() === EQUIPE_ENCONTRISTAS.toLowerCase();
}

// Identidade visual de cada tipo de tarefa de equipe — só pra dar uma
// identificada rápida na coluna dos Servos (ícone + nome curto). Tarefas
// origem 'cronograma' não levam selo — são o "padrão", ligadas a um momento
// específico do encontrista.
const ORIGEM_INFO = {
  vigilia: { icone: '🕯️', label: 'Vigília', cor: CORES.dourado },
  capela: { icone: '⛪', label: 'Capela Mariana', cor: CORES.dourado },
  almoco: { icone: '🍽️', label: 'Almoço', cor: CORES.terracota },
  jantar: { icone: '🌙', label: 'Jantar', cor: CORES.terracota },
};

// Resolve a hora/duração efetiva de uma tarefa: se nasceu de um momento do
// cronograma, segue o horário ATUAL desse item (já refletindo qualquer
// cascata de atraso/adiantamento do Coordenador); senão usa a hora própria
// da escala (Vigília/Almoço/Jantar/Capela Mariana).
function resolverTarefaEquipe(tarefa, cronogramaPorId) {
  if (tarefa.origem === 'cronograma') {
    const item = cronogramaPorId.get(tarefa.cronogramaItemId);
    if (!item) return null; // item do cronograma foi excluído — tarefa órfã, ignora
    return { hora: item.hora, duracaoMin: item.duracaoMin };
  }
  return { hora: tarefa.hora, duracaoMin: tarefa.duracaoMin };
}

// Vigília, Almoço, Jantar e Capela Mariana não têm duração de verdade na
// fonte — só "a partir de tal horário". O fim de cada plantão é sempre
// CALCULADO aqui como "até começar o próximo plantão da mesma escala",
// nunca guardado, pra continuar certo mesmo depois que o Dirigente adicionar
// ou editar plantões pelo Cadastro. Cada origem forma sua própria linha do
// tempo independente (a Vigília de uma equipe não "corta" o plantão de
// Almoço de outra, mesmo que ambos apareçam juntos na mesma lista final).
function comFimAteProximoDaMesmaEscala(lista) {
  const porOrigem = new Map();
  lista.forEach((t) => {
    if (!porOrigem.has(t.origem)) porOrigem.set(t.origem, []);
    porOrigem.get(t.origem).push(t);
  });
  const resultado = [];
  porOrigem.forEach((grupo) => {
    const horasDistintas = [...new Set(grupo.map((t) => t.hora))].sort((a, b) => horaParaMin(a) - horaParaMin(b));
    grupo.forEach((t) => {
      const idx = horasDistintas.indexOf(t.hora);
      const proximaHora = horasDistintas[idx + 1];
      const duracaoMin = proximaHora ? horaParaMin(proximaHora) - horaParaMin(t.hora) : Math.max(1, 1440 - horaParaMin(t.hora));
      resultado.push({ ...t, duracaoMin });
    });
  });
  return resultado;
}

// Monta a timeline de tarefas de equipe de um dia específico, já com hora
// resolvida e ordenada — injeta a Capela Mariana automaticamente em Sábado e
// Domingo (mesma escala nos dois dias, cadastrada uma vez só).
function tarefasEquipeDoDia(tarefasEquipe, capelaMariana, cronograma, dia) {
  const cronogramaPorId = new Map(cronograma.map((i) => [i.id, i]));
  const doDia = (tarefasEquipe || []).filter((t) => t.dia === dia);
  const capelaAplicavel = dia === '2026-08-29' || dia === '2026-08-30';
  const capelaComoTarefas = capelaAplicavel
    ? (capelaMariana || []).map((c) => ({
        id: `${c.id}-${dia}`,
        equipeNome: c.equipeNome,
        tarefa: 'Capela Mariana',
        origem: 'capela',
        hora: c.hora,
      }))
    : [];
  const todas = [...doDia, ...capelaComoTarefas];

  const deCronograma = todas
    .filter((t) => t.origem === 'cronograma')
    .map((t) => {
      const r = resolverTarefaEquipe(t, cronogramaPorId);
      return r ? { ...t, hora: r.hora, duracaoMin: r.duracaoMin } : null;
    })
    .filter(Boolean);

  const deEscalasPropriaHora = comFimAteProximoDaMesmaEscala(todas.filter((t) => t.origem !== 'cronograma'));

  return [...deCronograma, ...deEscalasPropriaHora].sort((a, b) => horaParaMin(a.hora) - horaParaMin(b.hora));
}

// Dado um instante (minAgora), separa a timeline resolvida em "rolando agora"
// (pode ser várias equipes ao mesmo tempo) e "o resto do dia" — sem cortar em
// 6, senão escalas que só começam mais tarde (Vigília, por exemplo) somem da
// tela por horas a fio. As telas que mostram isso já rolam (scroll).
function classificarTarefasEquipe(tarefasResolvidas, minAgora) {
  if (minAgora < 0) {
    return { atuais: [], proximas: tarefasResolvidas };
  }
  const atuais = tarefasResolvidas.filter((t) => {
    const inicio = horaParaMin(t.hora);
    const fim = inicio + t.duracaoMin;
    return minAgora >= inicio && minAgora < fim;
  });
  const idsAtuais = new Set(atuais.map((t) => t.id));
  const proximas = tarefasResolvidas.filter((t) => !idsAtuais.has(t.id) && horaParaMin(t.hora) > minAgora);
  return { atuais, proximas };
}

// Um momento é "de movimentação" (troca de sala/ambiente) quando o texto
// menciona isso — ganha uma cor de fundo própria em toda tela que lista
// momentos, mesmo antes de chegar a vez dele, pra já avisar visualmente que
// vem um deslocamento.
function ehMomentoMovimentacao(texto) {
  return /movimenta/i.test(texto || '');
}

// Agrupa tarefas de equipe por horário de início — cada grupo vira uma
// "linha do tempo" com um cartão por equipe que tem ação naquele horário,
// pra rolar na horizontal (ver FaixaHorarioEquipes) em vez de uma lista
// vertical longa misturando todas as equipes juntas.
function agruparTarefasPorHora(tarefas) {
  const porHora = new Map();
  tarefas.forEach((t) => {
    if (!porHora.has(t.hora)) porHora.set(t.hora, []);
    porHora.get(t.hora).push(t);
  });
  return [...porHora.entries()]
    .map(([hora, itens]) => ({ hora, itens }))
    .sort((a, b) => horaParaMin(a.hora) - horaParaMin(b.hora));
}

// ============================================================================
// Componente principal
// ============================================================================
export default function EJCApp() {
  const [perfil, setPerfil] = useState(null); // 'servo' | 'coordenadorGeral' | 'coordenadorEquipe' | 'dirigente' | 'tela'
  const [usuarioLogado, setUsuarioLogado] = useState(null); // nome do Coordenador Geral OU nome da equipe (Coordenador de Equipe)
  const [mostrarInscricao, setMostrarInscricao] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [encontro, setEncontro] = useState(ENCONTRO_PADRAO);
  const [carregado, setCarregado] = useState(false);
  const [offline, setOffline] = useState(false);
  const [horaSimulada, setHoraSimulada] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('sim');
    return p || '';
  });

  // Assina o documento do Firestore em tempo real. Se o Firebase ainda não
  // estiver configurado (sem projeto criado), cai silenciosamente para os
  // dados-semente locais e sinaliza "offline" para o coordenador/dirigente.
  useEffect(() => {
    let ativo = true;
    // Erro de PERMISSÃO (credencial inválida) dispara o callback de erro do
    // onSnapshot na hora — mas problema de CONECTIVIDADE (sem projeto real,
    // rede bloqueada) faz o SDK ficar tentando de novo em silêncio, sem
    // nunca chamar nem sucesso nem erro. Esse timeout garante que a tela sai
    // do "Carregando…" de qualquer forma, caindo pro modo offline local.
    const timeoutOffline = setTimeout(() => {
      if (ativo) { setOffline(true); setCarregado(true); }
    }, 6000);
    try {
      const ref = doc(db, ...DOC_PATH);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (!ativo) return;
          clearTimeout(timeoutOffline);
          if (snap.exists()) {
            const d = snap.data();
            setEncontro({
              cronograma: d.cronograma?.length ? d.cronograma : ENCONTRO_PADRAO.cronograma,
              servos: d.servos || [],
              encontristas: d.encontristas || [],
              equipes: d.equipes?.length ? d.equipes : ENCONTRO_PADRAO.equipes,
              tarefasEquipe: d.tarefasEquipe?.length ? d.tarefasEquipe : ENCONTRO_PADRAO.tarefasEquipe,
              capelaMariana: d.capelaMariana?.length ? d.capelaMariana : ENCONTRO_PADRAO.capelaMariana,
              avisos: d.avisos || [],
              config: { ...CONFIG_PADRAO, ...(d.config || {}) },
            });
          } else {
            // primeira vez: semeia o documento com os dados padrão
            setDoc(ref, ENCONTRO_PADRAO).catch(() => setOffline(true));
          }
          setCarregado(true);
          setOffline(false);
        },
        () => {
          if (!ativo) return;
          clearTimeout(timeoutOffline);
          setOffline(true);
          setCarregado(true);
        }
      );
      return () => {
        ativo = false;
        clearTimeout(timeoutOffline);
        unsub();
      };
    } catch (e) {
      clearTimeout(timeoutOffline);
      setOffline(true);
      setCarregado(true);
    }
  }, []);

  const salvar = useCallback(async (novoEncontro) => {
    setEncontro(novoEncontro); // otimista — telão/celulares refletem na hora
    try {
      const ref = doc(db, ...DOC_PATH);
      await setDoc(ref, novoEncontro, { merge: true });
      setOffline(false);
    } catch (e) {
      setOffline(true);
    }
  }, []);

  const horaAtual = useMemo(() => {
    const d = agoraComoData(horaSimulada);
    return dataParaDiaHora(d);
  }, [horaSimulada]);

  // pruning periódico de avisos expirados (evita crescer o documento à toa)
  useEffect(() => {
    const t = setInterval(() => {
      setEncontro((prev) => {
        const vivos = prev.avisos.filter((a) => a.expiraEm > Date.now() - 5000);
        if (vivos.length === prev.avisos.length) return prev;
        return { ...prev, avisos: vivos };
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  function handleEnviarAviso(mensagem) {
    const aviso = criarAviso(3, mensagem, 20000);
    salvar({ ...encontro, avisos: [...encontro.avisos, aviso] });
  }

  function handleEditarMomento(id, novoNome, novaDuracao) {
    const { cronograma, delta, nomeAntigo } = aplicarEdicaoComCascata(encontro.cronograma, id, novoNome, novaDuracao);
    let avisos = encontro.avisos;
    if (delta !== 0) {
      const texto =
        delta > 0
          ? `Atraso no momento "${novoNome || nomeAntigo}" de ${delta} minuto${delta > 1 ? 's' : ''}`
          : `Adiantamento no momento "${novoNome || nomeAntigo}" de ${Math.abs(delta)} minuto${Math.abs(delta) > 1 ? 's' : ''}`;
      avisos = [...avisos, criarAviso(1, texto, 20000)];
    }
    salvar({ ...encontro, cronograma, avisos });
  }

  function handleToggleTema() {
    salvar({ ...encontro, config: { ...encontro.config, tema: encontro.config.tema === 'dark' ? 'light' : 'dark' } });
  }

  // Tema da Tela é independente do tema do celular — ver comentário em
  // CONFIG_PADRAO.temaTela.
  function handleToggleTemaTela() {
    salvar({ ...encontro, config: { ...encontro.config, temaTela: encontro.config.temaTela === 'dark' ? 'light' : 'dark' } });
  }

  function handleSalvarCronogramaItem(item) {
    const cronograma = encontro.cronograma.some((i) => i.id === item.id)
      ? encontro.cronograma.map((i) => (i.id === item.id ? item : i))
      : [...encontro.cronograma, item];
    salvar({ ...encontro, cronograma });
  }

  // Edição de um momento já existente feita em Cadastro > Cronograma (hora,
  // duração e/ou nome, direto na tabela do Dirigente) — precisa da mesma
  // cascata de aplicarEdicaoComCascata que o modal Ao Vivo usa, senão só
  // aquele item muda e todo o resto do dia fica com o horário desalinhado
  // (era exatamente esse o bug: handleSalvarCronogramaItem sozinho só
  // substitui o item, sem deslocar os seguintes). Diferente da edição ao
  // vivo, não gera aviso de atraso/adiantamento — aqui é ajuste/planejamento
  // de cronograma, não uma notificação em tempo real pros Servos.
  function handleEditarCronogramaItemComCascata(item) {
    const { cronograma } = aplicarEdicaoComCascata(encontro.cronograma, item.id, item.movimento, item.duracaoMin, item.hora);
    salvar({ ...encontro, cronograma });
  }

  function handleExcluirCronogramaItem(id) {
    salvar({ ...encontro, cronograma: encontro.cronograma.filter((i) => i.id !== id) });
  }

  function handleSalvarPessoa(colecao, pessoa) {
    const lista = encontro[colecao].some((p) => p.id === pessoa.id)
      ? encontro[colecao].map((p) => (p.id === pessoa.id ? pessoa : p))
      : [...encontro[colecao], pessoa];
    salvar({ ...encontro, [colecao]: lista });
  }

  function handleExcluirPessoa(colecao, id) {
    salvar({ ...encontro, [colecao]: encontro[colecao].filter((p) => p.id !== id) });
  }

  function handleSalvarConfig(configParcial) {
    salvar({ ...encontro, config: { ...encontro.config, ...configParcial } });
  }

  // Ao encerrar o encontro: cada Encontrista "aprovado" que REALMENTE fez o
  // encontro vira um registro de Servo (base para o próximo EJC, com
  // recemFormado=true — prioridade pra ser chamado a servir, sem ser
  // obrigatório, via sugerirServosParaEquipe) e fica "formado" na lista de
  // Encontristas. Quem consta em idsNaoFizeram volta pra "pendente" — o
  // cadastro fica em aberto pro próximo encontro em vez de virar Servo.
  function handleFinalizarEncontro(idsNaoFizeram = []) {
    const aprovados = encontro.encontristas.filter((p) => p.status === 'aprovado');
    if (aprovados.length === 0) return;
    const fizeram = aprovados.filter((p) => !idsNaoFizeram.includes(p.id));
    const novosServos = fizeram.map((p) => ({
      id: `servo-de-${p.id}`,
      nome: p.nome,
      dataNascimento: p.dataNascimento || '',
      cpf: p.cpf || '',
      equipe: '',
      equipesAnteriores: '',
      contato: p.contato || '',
      cep: p.cep || '',
      rua: p.rua || '',
      numero: p.numero || '',
      complemento: p.complemento || '',
      bairro: p.bairro || '',
      cidade: p.cidade || '',
      restricoes: p.restricoes || '',
      camisa: p.camisa || '',
      autorizado: false,
      recemFormado: true,
    }));
    const servosSemDuplicata = novosServos.filter((ns) => !encontro.servos.some((s) => s.id === ns.id));
    const encontristasAtualizados = encontro.encontristas.map((p) => {
      if (p.status !== 'aprovado') return p;
      return idsNaoFizeram.includes(p.id) ? { ...p, status: 'pendente' } : { ...p, status: 'formado' };
    });
    salvar({ ...encontro, servos: [...encontro.servos, ...servosSemDuplicata], encontristas: encontristasAtualizados });
  }

  function tentarEntrar(senha) {
    const match = resolverAcessoPorSenha(senha, encontro.config, encontro.equipes);
    if (match) {
      setErroLogin('');
      setPerfil(match.perfil);
      setUsuarioLogado(match.nome);
    } else {
      setErroLogin('Senha incorreta');
    }
  }

  function sair() {
    setPerfil(null);
    setUsuarioLogado(null);
    setErroLogin('');
  }

  if (!carregado) {
    return <TelaCarregando />;
  }

  if (mostrarInscricao) {
    return (
      <TelaInscricaoPublica
        branding={BRANDING_PADRAO}
        onInscrever={(pessoa) => handleSalvarPessoa('encontristas', pessoa)}
        onVoltar={() => setMostrarInscricao(false)}
      />
    );
  }

  if (!perfil) {
    return (
      <TelaLogin
        branding={BRANDING_PADRAO}
        erro={erroLogin}
        onEntrar={tentarEntrar}
        onInscrever={() => setMostrarInscricao(true)}
      />
    );
  }

  if (perfil === 'tela') {
    return (
      <ModoTela
        encontro={encontro}
        horaAtual={horaAtual}
        branding={BRANDING_PADRAO}
        onSair={sair}
        onToggleTemaTela={handleToggleTemaTela}
      />
    );
  }

  return (
    <ModoCelular
      perfil={perfil}
      usuarioLogado={usuarioLogado}
      branding={BRANDING_PADRAO}
      encontro={encontro}
      horaAtual={horaAtual}
      offline={offline}
      onEditarMomento={handleEditarMomento}
      onEnviarAviso={handleEnviarAviso}
      onToggleTema={handleToggleTema}
      onSalvarCronogramaItem={handleSalvarCronogramaItem}
      onEditarCronogramaItemComCascata={handleEditarCronogramaItemComCascata}
      onExcluirCronogramaItem={handleExcluirCronogramaItem}
      onSalvarPessoa={handleSalvarPessoa}
      onExcluirPessoa={handleExcluirPessoa}
      onSalvarConfig={handleSalvarConfig}
      onFinalizarEncontro={handleFinalizarEncontro}
      onSetHoraSimulada={setHoraSimulada}
      horaSimulada={horaSimulada}
      onSair={sair}
    />
  );
}

// ============================================================================
// Tela: Carregando
// ============================================================================
function TelaCarregando() {
  return (
    <div style={estilos.telaCarregando}>
      <div style={estilos.marcaDagua} />
      <p style={{ color: CORES.dourado, fontFamily: "'Playfair Display', serif", fontSize: 23.7 }}>Carregando…</p>
    </div>
  );
}

// ============================================================================
// Tela: Login unificado — uma senha só, o papel é definido pela senha digitada
// ============================================================================
function TelaLogin({ branding, erro, onEntrar }) {
  const [senha, setSenha] = useState('');

  return (
    <div style={estilos.telaSeletor}>
      <div style={estilos.marcaDagua} />
      <div className="ejc-tela-dividida">
        {/* Esquerda em telas largas — só a imagem da Santa, maior, sozinha.
            No celular fica escondida (a logo compacta abaixo cobre o mobile). */}
        <div className="ejc-painel-marca">
          <img
            src={imagemSantaUrl}
            alt={`Nossa Senhora — ${branding.nomeParoquia}`}
            className="ejc-painel-marca-img"
          />
        </div>

        {/* Direita (ou tela cheia no celular): logo compacta só no celular,
            título/subtítulo institucional acima da senha, e o formulário
            de acesso. */}
        <div className="ejc-login-card" style={estilos.loginForm}>
          <div className="ejc-logo-compact">
            <div style={{ width: 116, height: 133, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={imagemSantaUrl}
                alt={`Nossa Senhora — ${branding.nomeParoquia}`}
                style={{ maxWidth: '100%', maxHeight: '100%', filter: 'brightness(1.1) contrast(1.05)' }}
              />
            </div>
          </div>
          <h1 style={{ ...estilos.seletorTituloInstitucional, color: CORES.verdeEscuro, fontSize: 32.3 }}>
            Sistema de Gestão e Planejamento de Encontros com Cristo
          </h1>
          <p style={{ ...estilos.seletorSubtitulo, color: CORES.terracota, opacity: 0.85, marginBottom: 16 }}>Paróquia {branding.nomeParoquia}</p>

          <h2 style={{ color: CORES.verdeEscuro, marginTop: 0 }}>Acesso ao Sistema</h2>
          <label style={estilos.label}>Senha de Acesso</label>
          <input
            type="password"
            placeholder="Digite a senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onEntrar(senha)}
            style={estilos.input}
            autoFocus
          />
          {erro && <div style={estilos.erro}>{erro}</div>}
          <button onClick={() => onEntrar(senha)} style={estilos.btnEntrar}>
            Entrar
          </button>
        </div>
      </div>
      <style>{`
        .ejc-tela-dividida { width: 100%; max-width: 460px; position: relative; z-index: 1; }
        .ejc-painel-marca { display: none; }
        @media (min-width: 860px) {
          .ejc-tela-dividida {
            display: flex;
            align-items: stretch;
            max-width: 1100px;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          }
          .ejc-login-card { flex: 1 1 55%; max-width: none !important; border-radius: 0 !important; box-shadow: none !important; }
          .ejc-logo-compact { display: none; }
          .ejc-painel-marca {
            display: flex;
            flex: 0 0 45%;
            align-items: center;
            justify-content: center;
            padding: 32px;
            background: linear-gradient(160deg, ${CORES.verdeEscuro}, #081C13);
          }
          .ejc-painel-marca-img {
            width: 80%;
            max-width: 380px;
            height: auto;
            filter: brightness(1.1) contrast(1.05) drop-shadow(0 12px 28px rgba(0,0,0,0.45));
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Tela: Inscrição pública do Encontrista — sem senha, sem acesso ao sistema.
// Cria um registro pendente que os Dirigentes aprovam/rejeitam depois.
// ============================================================================
function TelaInscricaoPublica({ branding, onInscrever, onVoltar }) {
  const [form, setForm] = useState({ nome: '', idade: '', responsavel: '', contato: '', restricoes: '', camisa: '' });
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  function campo(key, valor) {
    setForm({ ...form, [key]: valor });
  }

  function enviar() {
    if (!form.nome.trim()) {
      setErro('Informe o nome completo');
      return;
    }
    onInscrever({
      id: `insc-${Date.now()}`,
      nome: form.nome.trim(),
      idade: form.idade ? parseInt(form.idade, 10) : '',
      responsavel: form.responsavel,
      sala: '',
      contato: form.contato,
      restricoes: form.restricoes,
      camisa: form.camisa,
      status: 'pendente',
    });
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div style={estilos.telaSeletor}>
        <div style={estilos.marcaDagua} />
        <div style={{ width: 100, height: 120, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={imagemSantaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
        <div style={estilos.loginForm}>
          <h2 style={{ color: CORES.verde, marginTop: 0 }}>Inscrição enviada! ✓</h2>
          <p style={{ fontSize: 18.4, color: '#444' }}>
            Obrigado, <strong>{form.nome}</strong>! Sua inscrição para o <strong>{branding.nomeEvento}</strong> foi recebida.
            A equipe organizadora vai avaliar e confirmar sua participação em breve.
          </p>
          <button onClick={onVoltar} style={estilos.btnEntrar}>Voltar ao início</button>
        </div>
      </div>
    );
  }

  return (
    <div style={estilos.telaSeletor}>
      <div style={estilos.marcaDagua} />
      <div style={{ width: 90, height: 100, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={imagemSantaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
      </div>
      <div style={{ ...estilos.loginForm, maxWidth: 440 }}>
        <h2 style={{ color: CORES.verdeEscuro, marginTop: 0, marginBottom: 2 }}>Inscrição — {branding.nomeEvento}</h2>
        <p style={{ fontSize: 15.8, opacity: 0.7, marginBottom: 16 }}>Paróquia {branding.nomeParoquia}</p>

        <label style={estilos.label}>Nome completo</label>
        <input type="text" value={form.nome} onChange={(e) => campo('nome', e.target.value)} style={estilos.input} />

        <label style={estilos.label}>Idade</label>
        <input type="number" value={form.idade} onChange={(e) => campo('idade', e.target.value)} style={estilos.input} />

        <label style={estilos.label}>Nome do responsável (se menor de idade)</label>
        <input type="text" value={form.responsavel} onChange={(e) => campo('responsavel', e.target.value)} style={estilos.input} />

        <label style={estilos.label}>Contato (WhatsApp)</label>
        <input type="text" value={form.contato} onChange={(e) => campo('contato', e.target.value)} style={estilos.input} />

        <label style={estilos.label}>Restrições alimentares / de saúde</label>
        <input type="text" value={form.restricoes} onChange={(e) => campo('restricoes', e.target.value)} style={estilos.input} />

        <label style={estilos.label}>Tamanho de camisa</label>
        <input type="text" value={form.camisa} onChange={(e) => campo('camisa', e.target.value)} style={estilos.input} />

        {erro && <div style={estilos.erro}>{erro}</div>}
        <button onClick={enviar} style={estilos.btnEntrar}>Enviar Inscrição</button>
        <button onClick={onVoltar} style={estilos.btnLink}>← Voltar</button>
      </div>
    </div>
  );
}

// ============================================================================
// Tela: Modo Tela (telão / projetor) — somente leitura, split-screen
// ============================================================================
function ModoTela({ encontro, horaAtual, branding, onSair, onToggleTemaTela }) {
  // Tema próprio da Tela — independente do tema usado no celular (Servo,
  // Coordenadores, Dirigente). Alternar aqui não deve mudar a tela de mais
  // ninguém, só o telão.
  const tema = encontro.config.temaTela;
  const cores = tema === 'dark'
    ? { fundo: `linear-gradient(160deg, ${CORES.verdeEscuro}, #081C13)`, texto: CORES.marfim, painel: 'rgba(255,255,255,0.04)' }
    : { fundo: `linear-gradient(160deg, #F3EFE0, ${CORES.marfim})`, texto: CORES.verdeEscuro, painel: 'rgba(27,94,63,0.05)' };

  const diaPadrao = encontro.cronograma.some((i) => i.dia === horaAtual.dia) ? horaAtual.dia : encontro.cronograma[0]?.dia;
  // O telão também escolhe o dia manualmente, igual às outras telas — só
  // parte do dia atual como sugestão inicial, não trava nele.
  const [diaSelecionado, setDiaSelecionado] = useState(diaPadrao);
  const diaAtivo = diaSelecionado || diaPadrao;

  const itensDia = encontro.cronograma.filter((i) => i.dia === diaAtivo).sort((a, b) => a.ordem - b.ordem);
  const minAgora = horaAtual.dia === diaAtivo ? horaAtual.minutos : -1;

  const { atual, proximo, demais } = classificarMomentos(itensDia, minAgora);
  const avisosVisiveis = encontro.avisos.filter((a) => a.expiraEm > Date.now());
  const avisoMovimento = detectarAvisoMovimentoAtivo(itensDia, minAgora);

  const tarefasDia = useMemo(
    () => tarefasEquipeDoDia(encontro.tarefasEquipe, encontro.capelaMariana, encontro.cronograma, diaAtivo),
    [encontro.tarefasEquipe, encontro.capelaMariana, encontro.cronograma, diaAtivo]
  );
  const { atuais: tarefasAtuais, proximas: tarefasProximas } = classificarTarefasEquipe(tarefasDia, minAgora);
  const gruposProximasTelao = useMemo(() => agruparTarefasPorHora(tarefasProximas), [tarefasProximas]);
  const momentoEncontristasAtivo = tarefasAtuais.find((t) => ehEquipeEncontristas(t.equipeNome));

  return (
    <div style={{ ...estilos.telaModoTela, background: cores.fundo, color: cores.texto }}>
      <MarcaDaguaImagem opacidade={0.1} />
      {/* hotspot invisível para sair (canto inferior direito) */}
      <div onClick={onSair} style={estilos.hotspotSair} title="Sair do modo tela" />

      <div style={{ ...estilos.telaoBarraTopo, background: cores.fundo }}>
        <div style={estilos.seletorDias}>
          {Object.keys(DIAS_LABEL).map((d) => (
            <button
              key={d}
              onClick={() => setDiaSelecionado(d)}
              style={{ ...estilos.chipDia, ...(d === diaAtivo ? { background: CORES.dourado, color: CORES.verdeEscuro } : {}) }}
            >
              {DIAS_LABEL[d]}
            </button>
          ))}
        </div>
        <button onClick={onToggleTemaTela} style={estilos.telaoBtnTema} title="Alternar modo claro/escuro (só nesta tela)">
          {tema === 'dark' ? '☀️ Modo claro' : '🌙 Modo escuro'}
        </button>
      </div>

      <div style={{ ...estilos.telaMetade, paddingTop: 70 }}>
        <h2 style={{ ...estilos.telaTituloColuna, color: CORES.dourado }}>Cronograma — Encontristas</h2>
        <p style={{ opacity: 0.7, marginTop: -6, fontSize: 22.3 }}>{DIAS_LABEL[diaAtivo]}</p>
        {atual && <MomentoDestaque item={atual} tamanho="grande" cores={cores} />}
        {proximo && <MomentoDestaque item={proximo} tamanho="medio" cores={cores} rotulo="Próximo" />}
        <div style={{ marginTop: 16, opacity: 0.75 }}>
          {demais.slice(0, 6).map((i) => (
            <LinhaMomentoPequena key={i.id} item={i} />
          ))}
        </div>
      </div>
      <div style={{ ...estilos.telaMetade, paddingTop: 70, borderLeft: `2px solid ${CORES.dourado}44` }}>
        <h2 style={{ ...estilos.telaTituloColuna, color: CORES.dourado }}>Cronograma — Servos</h2>
        <p style={{ opacity: 0.7, marginTop: -6, fontSize: 22.3 }}>{DIAS_LABEL[diaAtivo]}</p>
        <div style={{ overflowY: 'auto', maxHeight: '72vh' }}>
          {tarefasAtuais.length === 0 && tarefasProximas.length === 0 && (
            <p style={{ opacity: 0.5, fontSize: 18.4 }}>Nenhuma tarefa de equipe cadastrada pra este momento.</p>
          )}
          {tarefasAtuais.length > 0 && (
            <FaixaHorarioEquipes rotulo="Agora" itens={tarefasAtuais} destaque cores={cores} grande />
          )}
          {gruposProximasTelao.map((g, i) => (
            <FaixaHorarioEquipes key={g.hora} rotulo={g.hora} itens={g.itens} destaque={i === 0 && tarefasAtuais.length === 0} cores={cores} grande />
          ))}
        </div>
      </div>

      {(avisoMovimento || momentoEncontristasAtivo || avisosVisiveis.some((a) => a.tipo !== 3)) && (
        <div style={estilos.bannerContainer}>
          {avisoMovimento && (
            <div style={{ ...estilos.banner, background: CORES.terracota }}>
              🤫 Movimento em andamento — {avisoMovimento.movimento} — SILÊNCIO, por favor
            </div>
          )}
          {momentoEncontristasAtivo && (
            <div style={{ ...estilos.banner, background: CORES.dourado, color: CORES.verdeEscuro }}>
              ✨ Momento dos Encontristas na Capela Mariana — atenção especial
            </div>
          )}
          {avisosVisiveis.filter((a) => a.tipo !== 3).map((a) => (
            <div key={a.id} style={{ ...estilos.banner, background: CORES.verde, color: '#fff' }}>
              {a.mensagem}
            </div>
          ))}
        </div>
      )}

      {/* Aviso manual do Coordenador Geral — centralizado na tela, maior e
          em vermelho sangue translúcido, separado da pilha de banners. */}
      {avisosVisiveis.filter((a) => a.tipo === 3).map((a) => (
        <div key={a.id} style={estilos.avisoManual}>{a.mensagem}</div>
      ))}
    </div>
  );
}

function classificarMomentos(itensDia, minAgora) {
  if (minAgora < 0) {
    return { atual: itensDia[0] || null, proximo: itensDia[1] || null, demais: itensDia.slice(2) };
  }
  let idxAtual = -1;
  for (let i = 0; i < itensDia.length; i++) {
    const inicio = horaParaMin(itensDia[i].hora);
    const fim = inicio + itensDia[i].duracaoMin;
    if (minAgora >= inicio && minAgora < fim) {
      idxAtual = i;
      break;
    }
  }
  if (idxAtual === -1) {
    // entre momentos: acha o próximo que ainda não começou
    idxAtual = itensDia.findIndex((i) => horaParaMin(i.hora) > minAgora) - 1;
  }
  const atual = itensDia[idxAtual] || null;
  const proximo = itensDia[idxAtual + 1] || null;
  const demais = itensDia.slice(idxAtual + 2);
  return { atual, proximo, demais };
}

function detectarAvisoMovimentoAtivo(itensDia, minAgora) {
  if (minAgora < 0) return null;
  return itensDia.find((i) => {
    const inicio = horaParaMin(i.hora);
    const fim = inicio + i.duracaoMin;
    return minAgora >= inicio && minAgora < fim && ehMomentoMovimentacao(i.movimento);
  }) || null;
}

// Tamanhos do Telão são bem maiores que qualquer outra tela do app — é
// projetor, visto de longe, não celular na mão.
function MomentoDestaque({ item, tamanho, rotulo }) {
  const tamanhos = { grande: 67.8, medio: 44.4 };
  const movimentacao = ehMomentoMovimentacao(item.movimento);
  return (
    <div
      style={{
        margin: tamanho === 'grande' ? '18px 0' : '10px 0',
        padding: movimentacao ? '10px 16px' : 0,
        borderRadius: movimentacao ? 10 : 0,
        background: movimentacao ? `${CORES.terracota}22` : 'transparent',
      }}
    >
      {rotulo && <div style={{ fontSize: 21, letterSpacing: 1, opacity: 0.6, textTransform: 'uppercase' }}>{rotulo}</div>}
      <div style={{ fontSize: tamanhos[tamanho], fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{item.hora}</div>
      <div style={{ fontSize: tamanho === 'grande' ? 37.2 : 29.1 }}>{item.movimento}</div>
    </div>
  );
}

function LinhaMomentoPequena({ item }) {
  const movimentacao = ehMomentoMovimentacao(item.movimento);
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: '6px 10px',
        borderRadius: 6,
        background: movimentacao ? `${CORES.terracota}22` : 'transparent',
      }}
    >
      {/* minWidth (não width) + flexShrink:0 — sem isso o flex espreme a
          caixa da hora abaixo da largura do texto em fontes grandes, e o
          número acaba vazando pro espaço do gap, "colando" no movimento. */}
      <span style={{ opacity: 0.6, minWidth: 92, flexShrink: 0, fontSize: 25 }}>{item.hora}</span>
      <span style={{ fontSize: 25 }}>{item.movimento}</span>
    </div>
  );
}

// Uma linha do lado "Servos" do telão — uma tarefa de uma equipe num
// horário. `destaque` = tarefa rolando agora (várias podem aparecer juntas,
// já que equipes diferentes fazem coisas diferentes no mesmo instante).
// A equipe "Encontristas" (vinda da Capela Mariana) ganha estilo próprio,
// pra chamar atenção — não é uma tarefa de servo, é um momento especial.
// Lista com "ver mais" — mostra só os N primeiros itens e revela o resto sob
// clique, pra não lotar a tela em cronogramas longos. Sem uso em telas sem
// interação (Telão), que preferem rolagem vertical natural.
function ListaComVerMais({ itens, max = 5, renderItem, corBtn }) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? itens : itens.slice(0, max);
  const restantes = itens.length - visiveis.length;
  return (
    <>
      {visiveis.map(renderItem)}
      {restantes > 0 && (
        <button
          onClick={() => setExpandido(true)}
          style={{ background: 'none', border: 'none', color: corBtn || CORES.verde, cursor: 'pointer', fontSize: 17, padding: '6px 0', textAlign: 'left' }}
        >
          Ver mais {restantes} →
        </button>
      )}
    </>
  );
}

// Uma "linha do tempo": horário + cartões de equipe que agem naquele
// horário, um do lado do outro com rolagem horizontal própria — o
// cronograma dos encontristas ao lado fica parado, só essa faixa rola.
function FaixaHorarioEquipes({ rotulo, itens, destaque, cores, grande }) {
  return (
    <div style={{ marginBottom: grande ? 18 : 10 }}>
      <div
        style={{
          fontWeight: 700,
          fontFamily: destaque ? "'Playfair Display', serif" : 'inherit',
          fontSize: grande ? (destaque ? 24.2 : 17.8) : destaque ? 16.2 : 12.9,
          opacity: destaque ? 1 : 0.65,
          marginBottom: 4,
          color: destaque ? CORES.dourado : 'inherit',
        }}
      >
        {rotulo}
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {itens.map((t) => (
          <CaixaTarefaEquipe key={t.id} tarefa={t} destaque={destaque} cores={cores} grande={grande} />
        ))}
      </div>
    </div>
  );
}

function CaixaTarefaEquipe({ tarefa, destaque, cores, grande }) {
  const especial = ehEquipeEncontristas(tarefa.equipeNome);
  const info = ORIGEM_INFO[tarefa.origem];
  const corSelo = especial ? CORES.dourado : info?.cor;
  return (
    <div
      style={{
        flex: '0 0 auto',
        minWidth: grande ? 190 : 148,
        maxWidth: grande ? 260 : 200,
        padding: grande ? '10px 12px' : '8px 10px',
        borderRadius: 8,
        borderLeft: `3px solid ${corSelo ? `${corSelo}${destaque || especial ? '' : '77'}` : 'transparent'}`,
        background: especial ? `${CORES.dourado}30` : destaque ? `${CORES.dourado}18` : cores.cartao,
        fontSize: grande ? (destaque ? 19.4 : 15.3) : destaque ? 16.2 : 12.9,
        opacity: destaque || especial ? 1 : 0.78,
      }}
    >
      <strong>
        {especial ? '✨ ' : info ? `${info.icone} ` : ''}
        {tarefa.equipeNome}
      </strong>
      <div style={{ opacity: 0.85, marginTop: 2 }}>{info ? info.label : tarefa.tarefa}</div>
    </div>
  );
}

// Árvore da barra lateral do Cadastro Geral — cada item é uma "seção"
// (secaoAtiva) que a área de conteúdo sabe renderizar diretamente, sem mais
// abas horizontais aninhadas (essas cortavam/quebravam em telas estreitas).
const MENU_LATERAL = [
  { grupo: 'Cadastros', itens: [
    { key: 'servos', label: 'Servos' },
    { key: 'equipes', label: 'Equipes' },
    { key: 'coordenadoresGerais', label: 'Coordenadores Gerais' },
    { key: 'coordenadoresEquipe', label: 'Coordenadores de Equipe' },
    { key: 'dirigentes', label: 'Dirigentes' },
    { key: 'encontristas', label: 'Encontristas' },
  ]},
  { grupo: 'Encontro', itens: [
    { key: 'ejc', label: 'EJC (cronograma)' },
    { key: 'escalas', label: 'Escalas' },
  ]},
  { grupo: 'Configurações', itens: [
    { key: 'acessos', label: 'Senha de Acesso' },
  ]},
];

// ============================================================================
// Tela: Modo Celular (Servo / Coordenador / Dirigente)
// - Servo: só visualização (cronogramas + avisos), sem abas.
// - Coordenador: só "Encontro" (ao vivo) — edita momentos (cascata), envia
//   avisos, tema.
// - Dirigente: dois grandes blocos —
//     CADASTRO GERAL: barra lateral fixa (vira drawer recolhível só no
//       celular) com Usuários / Encontro / Encontristas
//     ENCONTRO: visão ao vivo, somente leitura
// ============================================================================
function ModoCelular(props) {
  const { perfil, usuarioLogado, encontro, branding, onSair } = props;
  const isCoordenadorGeral = perfil === 'coordenadorGeral';
  const isCoordenadorEquipe = perfil === 'coordenadorEquipe';
  const isDirigente = perfil === 'dirigente';
  // Coordenador Geral e Coordenador de Equipe têm a mesma capacidade
  // operacional no painel Ao Vivo (editar cascata de momento, enviar avisos,
  // alternar tema) — só o Geral fica identificado por nome.
  const podeEditarAoVivo = isCoordenadorGeral || isCoordenadorEquipe;
  const [abaTopo, setAbaTopo] = useState('cadastro'); // 'cadastro' | 'encontro' — só Dirigente usa
  const [secaoAtiva, setSecaoAtiva] = useState('servos'); // folha ativa dentro de MENU_LATERAL
  const [menuAberto, setMenuAberto] = useState(false); // só controla o drawer no celular
  const tema = encontro.config.tema;
  const cores = tema === 'dark'
    ? { fundo: CORES.verdeEscuro, texto: CORES.marfim, cartao: 'rgba(255,255,255,0.06)' }
    : { fundo: '#F5F1E4', texto: CORES.verdeEscuro, cartao: '#ffffff' };

  const rotuloPerfil =
    perfil === 'coordenadorGeral' ? `Coordenador Geral — ${usuarioLogado}` :
    perfil === 'coordenadorEquipe' ? `Coordenador de Equipe — ${usuarioLogado}` :
    perfil === 'dirigente' ? 'Dirigente' :
    'Servo';

  // Dirigente em Cadastro trabalha com listas maiores — marca d'água discreta.
  const mostrarMarcaDagua = isDirigente && abaTopo === 'cadastro';
  // A visão "Ao Vivo" (Encontristas + Servos lado a lado) precisa de mais
  // largura que as telas de Cadastro pra caber as duas colunas quando aberta
  // num computador — ver PainelAoVivo, que usa CSS grid responsivo.
  const mostrandoAoVivo = !isDirigente || abaTopo === 'encontro';

  function escolherSecao(k) {
    setAbaTopo('cadastro');
    setSecaoAtiva(k);
    setMenuAberto(false);
  }

  const tituloSecaoAtiva = MENU_LATERAL.flatMap((g) => g.itens).find((i) => i.key === secaoAtiva)?.label || '';

  return (
    <div style={{ minHeight: '100vh', background: cores.fundo, color: cores.texto, fontFamily: 'Roboto, sans-serif', position: 'relative' }}>
      {mostrarMarcaDagua && <MarcaDaguaImagem opacidade={0.06} />}
      <div style={estilos.headerCelular}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={imagemSantaUrl} alt="" style={estilos.logoCantoImg} />
          <div>
            <div style={{ fontSize: 15.8, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>{rotuloPerfil}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: CORES.dourado, lineHeight: 1.2 }}>{branding.nomeParoquia}</div>
          </div>
        </div>
        <button onClick={onSair} style={estilos.btnSairHeader}>Sair</button>
      </div>
      <div style={{ height: 4, background: CORES.dourado }} />

      {isDirigente && (
        <div className="ejc-barra-topo" style={estilos.tabNav}>
          <button className="ejc-btn-hamburguer" onClick={() => setMenuAberto((m) => !m)} style={{ ...estilos.tabBtn, fontSize: 18.4, fontWeight: 700 }}>
            ☰ {abaTopo === 'cadastro' ? tituloSecaoAtiva : 'Cadastro Geral'}
          </button>
          <button
            onClick={() => { setAbaTopo(abaTopo === 'encontro' ? 'cadastro' : 'encontro'); setMenuAberto(false); }}
            style={{ ...estilos.tabBtn, ...(abaTopo === 'encontro' ? estilos.tabBtnAtiva : {}), fontSize: 18.4, fontWeight: 700, marginLeft: 'auto' }}
          >
            {abaTopo === 'encontro' ? '← Voltar ao Cadastro' : 'Ver Encontro (Ao Vivo) →'}
          </button>
        </div>
      )}

      {props.offline && (podeEditarAoVivo || isDirigente) && (
        <div style={estilos.avisoOffline}>
          ⚠️ Firebase ainda não configurado (ou sem conexão) — as alterações ficam salvas só neste aparelho, nesta sessão.
        </div>
      )}

      <div className="ejc-layout-cadastro">
        {isDirigente && abaTopo === 'cadastro' && (
          <>
            {menuAberto && <div className="ejc-sidebar-overlay" onClick={() => setMenuAberto(false)} />}
            <div
              className={`ejc-sidebar ejc-sidebar--${tema}${menuAberto ? ' ejc-sidebar--aberta' : ''}`}
              style={{ background: tema === 'dark' ? '#0F3A28' : '#FCFAF5', color: cores.texto }}
            >
              <div className="ejc-sidebar-titulo">Cadastro Geral</div>
              {MENU_LATERAL.map((grupo) => (
                <div key={grupo.grupo} className="ejc-sidebar-grupo">
                  <div className="ejc-sidebar-grupo-label">{grupo.grupo}</div>
                  {grupo.itens.map((item) => {
                    const ativo = secaoAtiva === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => escolherSecao(item.key)}
                        className={`ejc-item-sidebar${ativo ? ' ejc-item-sidebar--ativo' : ''}`}
                        style={ativo ? { color: tema === 'dark' ? CORES.dourado : CORES.verde } : undefined}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="ejc-conteudo-cadastro" style={{ padding: 16, maxWidth: mostrandoAoVivo ? 1200 : 1100, margin: '0 auto', position: 'relative', zIndex: 1, width: '100%' }}>
          {!isDirigente && (
            <PainelAoVivo
              {...props}
              podeEditar={podeEditarAoVivo}
              cores={cores}
              equipeCoordenada={isCoordenadorEquipe ? usuarioLogado : ''}
            />
          )}

          {isDirigente && abaTopo === 'encontro' && <PainelAoVivo {...props} podeEditar={false} cores={cores} equipeCoordenada="" />}

          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'servos' && (
            <AbaCadastroPessoas
              titulo="Servos"
              pessoas={encontro.servos}
              campos={CAMPOS_SERVO}
              equipes={encontro.equipes}
              onSalvar={(p) => props.onSalvarPessoa('servos', p)}
              onExcluir={(id) => props.onExcluirPessoa('servos', id)}
              cores={cores}
            />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'coordenadoresGerais' && (
            <AbaCoordenadores
              servos={encontro.servos}
              coordenadores={encontro.config.coordenadoresGerais}
              onSalvarConfig={props.onSalvarConfig}
              cores={cores}
            />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'coordenadoresEquipe' && (
            <AbaCoordenadoresEquipe
              equipes={encontro.equipes}
              servos={encontro.servos}
              onSalvarEquipe={(e) => props.onSalvarPessoa('equipes', e)}
              cores={cores}
            />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'dirigentes' && (
            <AbaDirigentes
              servos={encontro.servos}
              dirigentesPorFuncao={encontro.config.dirigentesPorFuncao}
              onSalvarConfig={props.onSalvarConfig}
              cores={cores}
            />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'acessos' && (
            <AbaAcessosGerais
              senhaServo={encontro.config.senhaServo}
              senhaTela={encontro.config.senhaTela}
              senhaDirigente={encontro.config.senhaDirigente}
              onSalvarConfig={props.onSalvarConfig}
              cores={cores}
            />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'ejc' && (
            <AbaCronograma {...props} cores={cores} />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'equipes' && (
            <AbaEquipes
              equipes={encontro.equipes}
              servos={encontro.servos}
              onSalvar={(e) => props.onSalvarPessoa('equipes', e)}
              onExcluir={(id) => props.onExcluirPessoa('equipes', id)}
              cores={cores}
            />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'escalas' && (
            <AbaEscalas
              encontro={encontro}
              onSalvarPessoa={props.onSalvarPessoa}
              onExcluirPessoa={props.onExcluirPessoa}
              cores={cores}
            />
          )}
          {isDirigente && abaTopo === 'cadastro' && secaoAtiva === 'encontristas' && (
            <AbaEncontristas
              encontristas={encontro.encontristas}
              onSalvarPessoa={(p) => props.onSalvarPessoa('encontristas', p)}
              onExcluirPessoa={(id) => props.onExcluirPessoa('encontristas', id)}
              onFinalizarEncontro={props.onFinalizarEncontro}
              cores={cores}
            />
          )}
        </div>
      </div>

      <style>{`
        .ejc-layout-cadastro { display: block; }
        .ejc-sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 40; }
        .ejc-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 264px; max-width: 82vw;
          z-index: 41; padding: 22px 0 16px; box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          overflow-y: auto; transform: translateX(-100%); transition: transform 0.2s ease;
        }
        .ejc-sidebar--aberta { transform: translateX(0); }

        .ejc-sidebar-titulo {
          margin: 0 20px 16px; padding-bottom: 14px;
          font-family: 'Playfair Display', serif; font-size: 21px; font-weight: 700;
          color: ${CORES.dourado}; border-bottom: 1px solid rgba(212,175,55,0.3);
        }
        .ejc-sidebar-grupo { margin-bottom: 18px; }
        .ejc-sidebar-grupo-label {
          padding: 0 20px 8px; font-size: 12px; font-weight: 600; opacity: 0.5;
          text-transform: uppercase; letter-spacing: 1.2px;
        }
        .ejc-item-sidebar {
          display: block; width: 100%; text-align: left; background: transparent;
          border: none; border-left: 3px solid transparent; color: inherit;
          padding: 10px 20px; font-size: 16px; font-family: 'Roboto', sans-serif;
          cursor: pointer; line-height: 1.3; transition: background 0.15s ease, border-color 0.15s ease;
        }
        .ejc-sidebar--dark .ejc-item-sidebar:hover { background: rgba(255,255,255,0.06); }
        .ejc-sidebar--light .ejc-item-sidebar:hover { background: rgba(15,58,40,0.05); }
        .ejc-sidebar--dark .ejc-item-sidebar--ativo { background: rgba(212,175,55,0.14); border-left-color: ${CORES.dourado}; font-weight: 700; }
        .ejc-sidebar--light .ejc-item-sidebar--ativo { background: rgba(27,94,63,0.08); border-left-color: ${CORES.dourado}; font-weight: 700; }

        @media (min-width: 860px) {
          .ejc-btn-hamburguer { display: none; }
          .ejc-sidebar-overlay { display: none; }
          .ejc-layout-cadastro { display: flex; align-items: flex-start; }
          .ejc-sidebar {
            position: sticky; top: 0; transform: none; box-shadow: none;
            width: 252px; flex: 0 0 252px; height: 100vh;
            border-right: 1px solid ${tema === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,58,40,0.08)'};
          }
          .ejc-conteudo-cadastro { flex: 1 1 auto; max-width: 1100px !important; }
        }
      `}</style>
    </div>
  );
}

// Escolha de coordenadores a partir da lista de Servos (não é cadastro à parte).
function AbaCoordenadores({ servos, coordenadores, onSalvarConfig, cores }) {
  const [selecionados, setSelecionados] = useState(coordenadores || []);
  useEffect(() => setSelecionados(coordenadores || []), [coordenadores]);

  function coordenadorDe(servoId) {
    return selecionados.find((c) => c.servoId === servoId);
  }
  function alternar(servo) {
    if (coordenadorDe(servo.id)) {
      setSelecionados(selecionados.filter((c) => c.servoId !== servo.id));
    } else {
      setSelecionados([...selecionados, { servoId: servo.id, nome: servo.nome, senha: '' }]);
    }
  }
  function atualizarSenha(servoId, senha) {
    setSelecionados(selecionados.map((c) => (c.servoId === servoId ? { ...c, senha } : c)));
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Coordenadores Gerais deste EJC</h3>
      <p style={{ fontSize: 15.8, opacity: 0.7 }}>
        Coordenador Geral não é um cadastro separado — é um Servo escolhido pra coordenar este encontro
        como um todo. Marque quem vai coordenar e defina a senha de acesso individual de cada um (essa
        identificação é o que permite mostrar quem emitiu um aviso no telão).
      </p>
      {servos.length === 0 && (
        <p style={{ fontSize: 17, opacity: 0.6 }}>Cadastre Servos primeiro (aba Servos) pra poder escolher os coordenadores.</p>
      )}
      <div style={estilos.gridCartoes}>
        {servos.map((s) => {
          const coord = coordenadorDe(s.id);
          return (
            <div key={s.id} style={{ ...estilos.cartaoConfig, background: cores.cartao, margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!coord} onChange={() => alternar(s)} />
                <strong>{s.nome}</strong>
                {s.equipe && <span style={{ fontSize: 15.8, opacity: 0.6 }}>· {s.equipe}</span>}
              </label>
              {coord && (
                <div style={{ marginTop: 8 }}>
                  <label style={estilos.label}>Senha de acesso (Coordenador)</label>
                  <input type="text" value={coord.senha} onChange={(e) => atualizarSenha(s.id, e.target.value)} style={estilos.input} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={() => onSalvarConfig({ coordenadoresGerais: selecionados })} style={{ ...estilos.btnEntrar, marginTop: 8 }}>
        Salvar Coordenadores Gerais
      </button>
    </div>
  );
}

// Coordenadores de Equipe — pra cada equipe já cadastrada (aba Encontro >
// Equipes), marca quais Servos formam a coordenação dela (normalmente 3-4) e
// define a senha de acesso daquela equipe. Não é um cadastro à parte:
// reaproveita a mesma coleção "equipes", só grava campos próprios
// (coordenadoresIds, senha) — não mexe em membrosIds. Cada equipe tem sua
// própria senha, compartilhada só entre quem coordena aquela equipe — a
// senha da Cozinha é diferente da senha da Sala, por exemplo. Ao entrar com
// a senha de uma equipe, o app já sabe qual equipe é (não precisa perguntar).
function AbaCoordenadoresEquipe({ equipes, servos, onSalvarEquipe, cores }) {
  const [expandidaId, setExpandidaId] = useState(null);

  function alternarCoordenador(equipe, servoId) {
    const atual = equipe.coordenadoresIds || [];
    const coordenadoresIds = atual.includes(servoId) ? atual.filter((id) => id !== servoId) : [...atual, servoId];
    onSalvarEquipe({ ...equipe, coordenadoresIds });
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Coordenadores de Equipe</h3>
      <p style={{ fontSize: 15.8, opacity: 0.7 }}>
        Marque quem coordena cada equipe (normalmente 3-4 Servos) e defina a senha de acesso dela. Todo
        mundo que coordena aquela equipe entra com a mesma senha — mas equipes diferentes têm senhas
        diferentes. Ao logar, o coordenador já vê o cronograma do Encontrista e, ao lado, só a própria equipe.
      </p>
      {equipes.length === 0 && <p style={{ fontSize: 17, opacity: 0.6 }}>Cadastre Equipes primeiro (aba Encontro → Equipes).</p>}
      <div style={estilos.gridCartoes}>
        {equipes.map((eq) => {
          const coordenadoresIds = eq.coordenadoresIds || [];
          const aberta = expandidaId === eq.id;
          return (
            <div
              key={eq.id}
              style={{ ...estilos.cartaoConfig, background: cores.cartao, margin: 0, ...(aberta ? { gridColumn: '1 / -1' } : {}) }}
            >
              <div
                onClick={() => setExpandidaId(aberta ? null : eq.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <strong>{eq.nome}</strong>
                <span style={{ fontSize: 15.8, opacity: 0.6 }}>{coordenadoresIds.length} coordenador(es)</span>
              </div>
              {aberta && (
                <>
                  <label style={{ ...estilos.label, marginTop: 12 }}>Senha de acesso da equipe {eq.nome}</label>
                  <input
                    type="text"
                    value={eq.senha || ''}
                    onChange={(e) => onSalvarEquipe({ ...eq, senha: e.target.value })}
                    style={estilos.input}
                    placeholder="Ex: cozinha2026"
                  />
                  <div style={{ ...estilos.listaMembrosSugeridos, marginTop: 10 }}>
                    {servos.length === 0 && <p style={{ fontSize: 15.8, opacity: 0.6, margin: 0 }}>Cadastre Servos primeiro (aba Servos).</p>}
                    {servos.map((s) => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 17, cursor: 'pointer' }}>
                        <input type="checkbox" checked={coordenadoresIds.includes(s.id)} onChange={() => alternarCoordenador(eq, s.id)} />
                        <span style={{ flex: 1 }}>{s.nome}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Dirigentes — estrutura fixa do G5 (Ficha, Montagem, Finanças, Pós Encontro,
// Palestra). Cada função recebe 3-4 Servos vinculados; todos os dirigentes,
// de qualquer função, entram com a mesma senha compartilhada — sem
// identificação individual (diferente do Coordenador Geral).
function AbaDirigentes({ servos, dirigentesPorFuncao, onSalvarConfig, cores }) {
  const [porFuncao, setPorFuncao] = useState(dirigentesPorFuncao || {});
  useEffect(() => setPorFuncao(dirigentesPorFuncao || {}), [dirigentesPorFuncao]);
  const [expandida, setExpandida] = useState(null);

  function alternarServo(funcao, servoId) {
    const atual = porFuncao[funcao] || [];
    const novaLista = atual.includes(servoId) ? atual.filter((id) => id !== servoId) : [...atual, servoId];
    const novo = { ...porFuncao, [funcao]: novaLista };
    setPorFuncao(novo);
    onSalvarConfig({ dirigentesPorFuncao: novo });
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Dirigentes (G5)</h3>
      <p style={{ fontSize: 15.8, opacity: 0.7 }}>
        Vincule 3-4 Servos a cada função. Todos os dirigentes entram com a mesma senha compartilhada (aba
        Senha de Acesso), com acesso completo ao Cadastro Geral — não há identificação individual.
      </p>
      <div style={estilos.gridCartoes}>
        {FUNCOES_DIRIGENTE.map((funcao) => {
          const servoIds = porFuncao[funcao] || [];
          const aberta = expandida === funcao;
          return (
            <div
              key={funcao}
              style={{ ...estilos.cartaoConfig, background: cores.cartao, margin: 0, ...(aberta ? { gridColumn: '1 / -1' } : {}) }}
            >
              <div
                onClick={() => setExpandida(aberta ? null : funcao)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <strong>{funcao}</strong>
                <span style={{ fontSize: 15.8, opacity: 0.6 }}>{servoIds.length} pessoa(s)</span>
              </div>
              {aberta && (
                <div style={{ ...estilos.listaMembrosSugeridos, marginTop: 10 }}>
                  {servos.length === 0 && <p style={{ fontSize: 15.8, opacity: 0.6, margin: 0 }}>Cadastre Servos primeiro (aba Servos).</p>}
                  {servos.map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 17, cursor: 'pointer' }}>
                      <input type="checkbox" checked={servoIds.includes(s.id)} onChange={() => alternarServo(funcao, s.id)} />
                      <span style={{ flex: 1 }}>{s.nome}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AbaAcessosGerais({ senhaServo, senhaTela, senhaDirigente, onSalvarConfig, cores }) {
  const [sServo, setSServo] = useState(senhaServo);
  const [sTela, setSTela] = useState(senhaTela);
  const [sDirigente, setSDirigente] = useState(senhaDirigente);
  useEffect(() => setSServo(senhaServo), [senhaServo]);
  useEffect(() => setSTela(senhaTela), [senhaTela]);
  useEffect(() => setSDirigente(senhaDirigente), [senhaDirigente]);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Senha de Acesso</h3>
      <p style={{ fontSize: 15.8, opacity: 0.7 }}>
        Senhas compartilhadas — não pertencem a uma pessoa específica. (Coordenadores Gerais têm senha
        individual própria, cadastrada na aba Coordenadores Gerais; a senha de cada Coordenador de Equipe é
        por equipe — Cozinha, Sala etc. — cadastrada na aba Coordenadores de Equipe.)
      </p>
      <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
        <label style={estilos.label}>Senha do Servo (compartilhada entre todos os servos)</label>
        <input type="text" value={sServo} onChange={(e) => setSServo(e.target.value)} style={estilos.input} />
        <label style={estilos.label}>Senha do Dirigente (compartilhada entre todos, acesso completo ao Cadastro Geral)</label>
        <input type="text" value={sDirigente} onChange={(e) => setSDirigente(e.target.value)} style={estilos.input} />
        <label style={estilos.label}>Senha da Tela / Telão (um dispositivo, não uma pessoa)</label>
        <input type="text" value={sTela} onChange={(e) => setSTela(e.target.value)} style={estilos.input} />
      </div>
      <button
        onClick={() => onSalvarConfig({ senhaServo: sServo, senhaTela: sTela, senhaDirigente: sDirigente })}
        style={estilos.btnEntrar}
      >
        Salvar Senhas
      </button>
    </div>
  );
}

// Marca d'água grande e discreta, usada nas telas de "visão maior" (telão e
// Cadastro do Dirigente) — imagem centralizada, baixa opacidade, sem cliques.
function MarcaDaguaImagem({ opacidade = 0.12 }) {
  return (
    <img
      src={imagemSantaUrl}
      alt=""
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60vh',
        maxWidth: '90vw',
        opacity: opacidade,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

// Capa impressa (primeira página) de qualquer impressão feita a partir do
// painel Ao Vivo — imagem de Nossa Senhora de Guadalupe, nome do evento e o
// dia em destaque (o resto do conteúdo entra na página seguinte, forçado
// pelo page-break abaixo).
function CapaImpressao({ branding, dia, rotulo }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 60, breakAfter: 'page', pageBreakAfter: 'always' }}>
      <img src={imagemSantaUrl} alt="Nossa Senhora de Guadalupe" style={{ width: 200, filter: 'brightness(1.05)' }} />
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, margin: '18px 0 4px' }}>{branding?.nomeEvento}</h1>
      <p style={{ fontSize: 19, margin: 0 }}>Paróquia {branding?.nomeParoquia}</p>
      <div
        style={{
          marginTop: 48,
          display: 'inline-block',
          padding: '14px 36px',
          border: `3px solid ${CORES.dourado}`,
          borderRadius: 12,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          {rotulo || DIAS_LABEL[dia]}
        </span>
      </div>
    </div>
  );
}

// Faixa com o dia em destaque, repetida no topo de cada seção impressa
// (depois da capa) — pedido explícito pra não deixar dúvida de qual dia é
// aquela página, especialmente quando só uma escala é impressa em separado.
function FaixaDiaImpressao({ dia }) {
  return (
    <div
      style={{
        background: CORES.verdeEscuro,
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 6,
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 20,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 14,
      }}
    >
      {DIAS_LABEL[dia]}
    </div>
  );
}

// Uma seção de um dia dentro de uma impressão "3 dias seguidos" — a faixa do
// dia entra no topo da própria página de conteúdo (não numa página só sua,
// como a capa) e o próximo dia começa numa página nova (quebra ANTES de
// cada dia, exceto o primeiro, que já começa logo após a capa).
function SecaoDiaImpressao({ dia, primeiro, children }) {
  return (
    <div style={primeiro ? undefined : { breakBefore: 'page', pageBreakBefore: 'always' }}>
      <FaixaDiaImpressao dia={dia} />
      {children}
    </div>
  );
}

// Tabela Hora/Equipe usada nas impressões em separado (Vigília, Capela
// Mariana, Almoço/Jantar) — mesmas colunas nos três casos, com a coluna de
// Refeição só aparecendo quando faz sentido (Almoço/Jantar).
function TabelaImpressaoHoraEquipe({ itens, comRefeicao }) {
  if (itens.length === 0) return <p>Nenhum plantão cadastrado pra este dia.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.8 }}>
      <thead>
        <tr>
          <th style={estilos.thImpressao}>Hora</th>
          <th style={estilos.thImpressao}>Equipe</th>
          {comRefeicao && <th style={estilos.thImpressao}>Refeição</th>}
        </tr>
      </thead>
      <tbody>
        {itens.map((t) => (
          <tr key={t.id}>
            <td style={estilos.tdImpressao}>{t.hora}</td>
            <td style={estilos.tdImpressao}>{t.equipeNome}</td>
            {comRefeicao && <td style={estilos.tdImpressao}>{ORIGEM_INFO[t.origem]?.label || t.tarefa}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PainelAoVivo(props) {
  const { perfil, encontro, horaAtual, cores, podeEditar, branding, equipeCoordenada } = props;
  const isCoordenadorEquipe = perfil === 'coordenadorEquipe';
  // Simular data/hora e Enviar aviso manual são só do Coordenador Geral —
  // o Coordenador de Equipe não tem essas ferramentas, só edita a cascata
  // de momentos e alterna o próprio tema.
  const isCoordenadorGeral = perfil === 'coordenadorGeral';
  // Painel de equipe (coluna "Servos") não aparece pro Servo — ele entra e
  // vê só o cronograma do Encontrista. Coordenador de Equipe já sabe qual
  // equipe é a sua desde o login (a senha é da equipe); Coordenador Geral e
  // Dirigente veem todas as equipes.
  const mostrarPainelEquipe = perfil === 'coordenadorGeral' || perfil === 'coordenadorEquipe' || perfil === 'dirigente';

  const diaAtivo = encontro.cronograma.some((i) => i.dia === horaAtual.dia) ? horaAtual.dia : encontro.cronograma[0]?.dia;
  const [diaSelecionado, setDiaSelecionado] = useState(diaAtivo);
  const itensDia = encontro.cronograma.filter((i) => i.dia === diaSelecionado).sort((a, b) => a.ordem - b.ordem);
  const minAgora = horaAtual.dia === diaSelecionado ? horaAtual.minutos : -1;
  const { atual, proximo, demais } = classificarMomentos(itensDia, minAgora);
  // Avisos e o alerta de silêncio/movimento valem pra todo mundo que
  // acompanha o Encontro ao vivo, inclusive o Servo — não só quem vê a
  // coluna de equipes.
  const avisosVisiveis = encontro.avisos.filter((a) => a.expiraEm > Date.now());
  const avisoMovimento = detectarAvisoMovimentoAtivo(itensDia, minAgora);

  const tarefasDia = useMemo(
    () => tarefasEquipeDoDia(encontro.tarefasEquipe, encontro.capelaMariana, encontro.cronograma, diaSelecionado),
    [encontro.tarefasEquipe, encontro.capelaMariana, encontro.cronograma, diaSelecionado]
  );
  // Coordenador de Equipe só vê a própria equipe — os demais perfis
  // (Coordenador Geral, Dirigente) veem todas.
  const tarefasDiaVisivel =
    isCoordenadorEquipe && equipeCoordenada ? tarefasDia.filter((t) => t.equipeNome === equipeCoordenada) : tarefasDia;
  const { atuais: tarefasAtuais, proximas: tarefasProximas } = classificarTarefasEquipe(tarefasDiaVisivel, minAgora);
  const gruposProximas = useMemo(() => agruparTarefasPorHora(tarefasProximas), [tarefasProximas]);
  const momentoEncontristasAtivo = tarefasAtuais.find((t) => ehEquipeEncontristas(t.equipeNome));

  const [editando, setEditando] = useState(null);
  const [textoAviso, setTextoAviso] = useState('');
  const [simInput, setSimInput] = useState(props.horaSimulada || '');
  // Qual conteúdo a área de impressão (.imprimir-area, mais abaixo) mostra —
  // null/'padrao' é o que já existia (Encontrista + equipe(s) visível na
  // tela); os demais são as impressões em separado do Coordenador Geral.
  // Sempre a impressão de UM dia só (o selecionado), com a capa entrando
  // antes via CapaImpressao.
  const [modoImpressao, setModoImpressao] = useState(null);
  const [equipeImpressao, setEquipeImpressao] = useState('');

  // equipeParaImprimir é passado só pelos botões do Coordenador de Equipe
  // (a própria equipe, fixa) — os do Coordenador Geral já mantêm o valor
  // escolhido no <select> em equipeImpressao.
  function imprimirComo(modo, equipeParaImprimir) {
    if (equipeParaImprimir !== undefined) setEquipeImpressao(equipeParaImprimir);
    setModoImpressao(modo);
    // dá um tick pro React re-renderizar a .imprimir-area com o conteúdo
    // novo antes de abrir o diálogo de impressão do navegador.
    setTimeout(() => window.print(), 50);
  }

  const capelaAplicavelHoje = tarefasDia.some((t) => t.origem === 'capela');

  return (
    <div>
    <div className="no-print">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={estilos.seletorDias}>
          {Object.keys(DIAS_LABEL).map((d) => (
            <button
              key={d}
              onClick={() => setDiaSelecionado(d)}
              style={{ ...estilos.chipDia, ...(d === diaSelecionado ? { background: CORES.dourado, color: CORES.verdeEscuro } : {}) }}
            >
              {DIAS_LABEL[d]}
            </button>
          ))}
        </div>
        <button onClick={() => imprimirComo('padrao')} style={estilos.btnPequeno}>🖨️ Imprimir</button>
      </div>

      {isCoordenadorGeral && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <label style={{ fontSize: 15.8, opacity: 0.7 }}>Imprimir em separado — {DIAS_LABEL[diaSelecionado]}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <button onClick={() => imprimirComo('encontrista')} style={estilos.btnPequeno}>🖨️ Encontrista</button>
            <button onClick={() => imprimirComo('encontrista3dias')} style={estilos.btnPequeno}>🖨️ Encontrista (3 dias)</button>
            <button onClick={() => imprimirComo('vigilia')} style={estilos.btnPequeno}>🖨️ Vigília</button>
            <button onClick={() => imprimirComo('capela')} style={estilos.btnPequeno}>🖨️ Capela Mariana</button>
            <button onClick={() => imprimirComo('refeicoes')} style={estilos.btnPequeno}>🖨️ Almoço/Jantar</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <select
              value={equipeImpressao}
              onChange={(e) => setEquipeImpressao(e.target.value)}
              style={{ ...estilos.input, marginBottom: 0, flex: 1, minWidth: 160 }}
            >
              <option value="">Escolha uma equipe…</option>
              {encontro.equipes.map((eq) => (
                <option key={eq.id} value={eq.nome}>{eq.nome}</option>
              ))}
            </select>
            <button onClick={() => equipeImpressao && imprimirComo('equipe')} style={estilos.btnPequeno}>🖨️ Imprimir equipe</button>
            <button onClick={() => equipeImpressao && imprimirComo('equipe3dias')} style={estilos.btnPequeno}>🖨️ Equipe (3 dias)</button>
          </div>
        </div>
      )}

      {isCoordenadorEquipe && equipeCoordenada && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <label style={{ fontSize: 15.8, opacity: 0.7 }}>Imprimir em separado — {DIAS_LABEL[diaSelecionado]}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <button onClick={() => imprimirComo('encontrista')} style={estilos.btnPequeno}>🖨️ Encontrista</button>
            <button onClick={() => imprimirComo('encontrista3dias')} style={estilos.btnPequeno}>🖨️ Encontrista (3 dias)</button>
            <button onClick={() => imprimirComo('equipe', equipeCoordenada)} style={estilos.btnPequeno}>🖨️ Equipe {equipeCoordenada}</button>
            <button onClick={() => imprimirComo('equipe3dias', equipeCoordenada)} style={estilos.btnPequeno}>🖨️ Equipe (3 dias)</button>
          </div>
        </div>
      )}

      {avisoMovimento && (
        <div style={{ ...estilos.bannerInline, background: CORES.terracota }}>
          🤫 Movimento em andamento — {avisoMovimento.movimento} — SILÊNCIO
        </div>
      )}
      {momentoEncontristasAtivo && (
        <div style={{ ...estilos.bannerInline, background: CORES.dourado, color: CORES.verdeEscuro }}>
          ✨ Momento dos Encontristas na Capela Mariana — atenção especial
        </div>
      )}
      {avisosVisiveis.filter((a) => a.tipo !== 3).map((a) => (
        <div key={a.id} style={{ ...estilos.bannerInline, background: CORES.verde, color: '#fff' }}>
          {a.mensagem}
        </div>
      ))}

      {podeEditar && isCoordenadorGeral && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <label style={{ fontSize: 15.8, opacity: 0.7 }}>Simular data/hora (para testes antes do evento)</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input type="datetime-local" value={simInput} onChange={(e) => setSimInput(e.target.value)} style={{ ...estilos.input, marginBottom: 0, flex: 1 }} />
            <button onClick={() => props.onSetHoraSimulada(simInput)} style={estilos.btnPequeno}>Aplicar</button>
            <button onClick={() => { setSimInput(''); props.onSetHoraSimulada(''); }} style={estilos.btnPequeno}>Real</button>
          </div>
        </div>
      )}

      {podeEditar && isCoordenadorGeral && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <label style={{ fontSize: 15.8, opacity: 0.7 }}>Enviar aviso manual (aparece por 20s p/ Servos + Coordenadores + Telão)</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              type="text"
              placeholder='Ex: "Chamar João na recepção"'
              value={textoAviso}
              onChange={(e) => setTextoAviso(e.target.value)}
              style={{ ...estilos.input, marginBottom: 0, flex: 1 }}
            />
            <button
              onClick={() => {
                if (textoAviso.trim()) {
                  props.onEnviarAviso(textoAviso.trim());
                  setTextoAviso('');
                }
              }}
              style={estilos.btnPequeno}
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {podeEditar && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <button onClick={props.onToggleTema} style={{ ...estilos.btnLink, marginTop: 0 }}>
            Alternar tema ({encontro.config.tema === 'dark' ? 'ativar claro' : 'ativar escuro'})
          </button>
        </div>
      )}

      {/* Aviso manual do Coordenador Geral — centralizado na tela, maior e
          em vermelho sangue translúcido, separado dos demais avisos. */}
      {avisosVisiveis.filter((a) => a.tipo === 3).map((a) => (
        <div key={a.id} style={estilos.avisoManual}>{a.mensagem}</div>
      ))}

      {/* Lado a lado quando há espaço (computador), empilhado no celular —
          puro CSS grid, sem depender de media query nem JS de largura. */}
      <div style={estilos.gridCronogramas}>
        <div>
          <h3 style={{ marginTop: 20, marginBottom: 8 }}>Cronograma — Encontristas</h3>
          <div>
            {atual && (
              <LinhaMomentoCelular item={atual} nivel="atual" cores={cores} editavel={podeEditar} onEditar={() => setEditando(atual)} />
            )}
            {proximo && (
              <LinhaMomentoCelular item={proximo} nivel="proximo" cores={cores} editavel={podeEditar} onEditar={() => setEditando(proximo)} />
            )}
            <ListaComVerMais
              itens={demais}
              max={5}
              renderItem={(item) => (
                <LinhaMomentoCelular key={item.id} item={item} cores={cores} editavel={podeEditar} onEditar={() => setEditando(item)} />
              )}
            />
          </div>
        </div>

        {mostrarPainelEquipe && (
          <div>
            <h3 style={{ marginTop: 20, marginBottom: 8 }}>
              {isCoordenadorEquipe ? `Cronograma — Equipe ${equipeCoordenada}` : 'Cronograma — Servos'}
            </h3>

            {tarefasAtuais.length === 0 && tarefasProximas.length === 0 && (
              <p style={{ fontSize: 17, opacity: 0.6 }}>Nenhuma tarefa cadastrada pra este dia ainda.</p>
            )}
            {isCoordenadorEquipe ? (
              // Uma equipe só — lista cronológica simples, sem agrupar em caixas.
              <div>
                {tarefasAtuais.map((t) => (
                  <LinhaTarefaEquipeCelular key={t.id} tarefa={t} destaque cores={cores} />
                ))}
                <ListaComVerMais
                  itens={tarefasProximas}
                  max={5}
                  renderItem={(t) => <LinhaTarefaEquipeCelular key={t.id} tarefa={t} destaque={false} cores={cores} />}
                />
              </div>
            ) : (
              // Todas as equipes — agrupadas por horário, cada horário com
              // suas equipes lado a lado (rolagem horizontal própria).
              <div>
                {tarefasAtuais.length > 0 && <FaixaHorarioEquipes rotulo="Agora" itens={tarefasAtuais} destaque cores={cores} />}
                <ListaComVerMais
                  itens={gruposProximas}
                  max={5}
                  renderItem={(g, i) => (
                    <FaixaHorarioEquipes key={g.hora} rotulo={g.hora} itens={g.itens} destaque={i === 0 && tarefasAtuais.length === 0} cores={cores} />
                  )}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {editando && (
        <ModalEditarMomento
          item={editando}
          onFechar={() => setEditando(null)}
          onSalvar={(nome, duracao) => {
            props.onEditarMomento(editando.id, nome, duracao);
            setEditando(null);
          }}
        />
      )}
    </div>

    {/* Área usada só na impressão (ver .imprimir-area em index.css). Sempre
        começa com a capa (CapaImpressao — imagem, evento e o dia em
        destaque) e depois o conteúdo do modoImpressao escolhido: "padrao"
        (ou nenhum ainda escolhido) é o que já existia — Encontrista + a
        coluna de equipe(s) visível na tela — e os demais são as impressões
        em separado do Coordenador Geral. Sempre um dia só, o selecionado. */}
    <div className="imprimir-area">
      <CapaImpressao
        branding={branding}
        dia={diaSelecionado}
        rotulo={modoImpressao === 'encontrista3dias' || modoImpressao === 'equipe3dias' ? 'Sexta a Domingo — 28 a 30/08' : undefined}
      />

      {(!modoImpressao || modoImpressao === 'padrao' || modoImpressao === 'encontrista') && (
        <>
          <FaixaDiaImpressao dia={diaSelecionado} />
          <h3>Cronograma — Encontristas</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.8, marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={estilos.thImpressao}>Hora</th>
                <th style={estilos.thImpressao}>Duração</th>
                <th style={estilos.thImpressao}>Movimento</th>
              </tr>
            </thead>
            <tbody>
              {itensDia.map((i) => (
                <tr key={i.id}>
                  <td style={estilos.tdImpressao}>{i.hora}</td>
                  <td style={estilos.tdImpressao}>{i.duracaoMin}min</td>
                  <td style={estilos.tdImpressao}>{i.movimento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(!modoImpressao || modoImpressao === 'padrao') && mostrarPainelEquipe && (
        <>
          <h3>{isCoordenadorEquipe ? `Equipe ${equipeCoordenada}` : 'Tarefas de Equipe'}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.8 }}>
            <thead>
              <tr>
                <th style={estilos.thImpressao}>Hora</th>
                {!isCoordenadorEquipe && <th style={estilos.thImpressao}>Equipe</th>}
                <th style={estilos.thImpressao}>Tarefa</th>
              </tr>
            </thead>
            <tbody>
              {tarefasDiaVisivel.map((t) => (
                <tr key={t.id}>
                  <td style={estilos.tdImpressao}>{t.hora}</td>
                  {!isCoordenadorEquipe && <td style={estilos.tdImpressao}>{t.equipeNome}</td>}
                  <td style={estilos.tdImpressao}>{ORIGEM_INFO[t.origem] ? ORIGEM_INFO[t.origem].label : t.tarefa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {modoImpressao === 'equipe' && equipeImpressao && (
        <>
          <FaixaDiaImpressao dia={diaSelecionado} />
          <h3>Equipe {equipeImpressao}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.8 }}>
            <thead>
              <tr>
                <th style={estilos.thImpressao}>Hora</th>
                <th style={estilos.thImpressao}>Tarefa</th>
              </tr>
            </thead>
            <tbody>
              {tarefasDia.filter((t) => t.equipeNome === equipeImpressao).map((t) => (
                <tr key={t.id}>
                  <td style={estilos.tdImpressao}>{t.hora}</td>
                  <td style={estilos.tdImpressao}>{ORIGEM_INFO[t.origem] ? ORIGEM_INFO[t.origem].label : t.tarefa}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tarefasDia.filter((t) => t.equipeNome === equipeImpressao).length === 0 && (
            <p>Nenhuma tarefa cadastrada pra essa equipe neste dia.</p>
          )}
        </>
      )}

      {modoImpressao === 'encontrista3dias' && (
        <>
          {Object.keys(DIAS_LABEL).map((dia, i) => {
            const itensDoDia = encontro.cronograma.filter((it) => it.dia === dia).sort((a, b) => a.ordem - b.ordem);
            return (
              <SecaoDiaImpressao key={dia} dia={dia} primeiro={i === 0}>
                <h3>Cronograma — Encontristas</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.8, marginBottom: 20 }}>
                  <thead>
                    <tr>
                      <th style={estilos.thImpressao}>Hora</th>
                      <th style={estilos.thImpressao}>Duração</th>
                      <th style={estilos.thImpressao}>Movimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDoDia.map((it) => (
                      <tr key={it.id}>
                        <td style={estilos.tdImpressao}>{it.hora}</td>
                        <td style={estilos.tdImpressao}>{it.duracaoMin}min</td>
                        <td style={estilos.tdImpressao}>{it.movimento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SecaoDiaImpressao>
            );
          })}
        </>
      )}

      {modoImpressao === 'equipe3dias' && equipeImpressao && (
        <>
          {Object.keys(DIAS_LABEL).map((dia, i) => {
            const tarefasDoDia = tarefasEquipeDoDia(encontro.tarefasEquipe, encontro.capelaMariana, encontro.cronograma, dia).filter(
              (t) => t.equipeNome === equipeImpressao
            );
            return (
              <SecaoDiaImpressao key={dia} dia={dia} primeiro={i === 0}>
                <h3>Equipe {equipeImpressao}</h3>
                {tarefasDoDia.length === 0 ? (
                  <p>Nenhuma tarefa cadastrada pra essa equipe neste dia.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.8 }}>
                    <thead>
                      <tr>
                        <th style={estilos.thImpressao}>Hora</th>
                        <th style={estilos.thImpressao}>Tarefa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tarefasDoDia.map((t) => (
                        <tr key={t.id}>
                          <td style={estilos.tdImpressao}>{t.hora}</td>
                          <td style={estilos.tdImpressao}>{ORIGEM_INFO[t.origem] ? ORIGEM_INFO[t.origem].label : t.tarefa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SecaoDiaImpressao>
            );
          })}
        </>
      )}

      {modoImpressao === 'vigilia' && (
        <>
          <FaixaDiaImpressao dia={diaSelecionado} />
          <h3>Escala de Vigília</h3>
          <TabelaImpressaoHoraEquipe itens={tarefasDia.filter((t) => t.origem === 'vigilia')} />
        </>
      )}

      {modoImpressao === 'capela' && (
        <>
          <FaixaDiaImpressao dia={diaSelecionado} />
          <h3>Capela Mariana</h3>
          {capelaAplicavelHoje ? (
            <TabelaImpressaoHoraEquipe itens={tarefasDia.filter((t) => t.origem === 'capela')} />
          ) : (
            <p>A escala da Capela Mariana só se aplica ao Sábado e ao Domingo.</p>
          )}
        </>
      )}

      {modoImpressao === 'refeicoes' && (
        <>
          <FaixaDiaImpressao dia={diaSelecionado} />
          <h3>Almoço / Jantar</h3>
          <TabelaImpressaoHoraEquipe
            itens={tarefasDia.filter((t) => t.origem === 'almoco' || t.origem === 'jantar')}
            comRefeicao
          />
        </>
      )}
    </div>
    </div>
  );
}

// nivel: 'atual' (bem destacado) | 'proximo' (destacado, menor) | undefined
// (linha compacta normal). Hora e duração ficam numa linha própria, acima
// do movimento — texto longo (ex: "Chegada dos encontristas (acolhida)")
// quebra em várias linhas sem espremer ou desalinhar hora/duração.
function LinhaMomentoCelular({ item, nivel, cores, editavel, onEditar }) {
  const movimentacao = ehMomentoMovimentacao(item.movimento);
  const destaque = nivel === 'atual' || nivel === 'proximo';
  const fundo = nivel === 'atual'
    ? `${CORES.dourado}38`
    : nivel === 'proximo'
    ? `${CORES.dourado}1c`
    : movimentacao
    ? `${CORES.terracota}1c`
    : cores.cartao;
  const fontHora = nivel === 'atual' ? 27.5 : nivel === 'proximo' ? 21 : 16.2;
  const fontMovimento = nivel === 'atual' ? 19.4 : nivel === 'proximo' ? 17 : 14.5;
  return (
    <div
      onClick={editavel ? onEditar : undefined}
      style={{
        padding: nivel === 'atual' ? '14px 16px' : '10px 12px',
        marginBottom: 6,
        borderRadius: 8,
        background: fundo,
        cursor: editavel ? 'pointer' : 'default',
      }}
    >
      {nivel === 'proximo' && <div style={{ fontSize: 12.1, letterSpacing: 1, opacity: 0.65, textTransform: 'uppercase', marginBottom: 2 }}>Próximo</div>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: fontHora, color: destaque ? CORES.dourado : 'inherit' }}>{item.hora}</span>
        <span style={{ fontSize: nivel ? 12.1 : 10.9, opacity: 0.6 }}>{item.duracaoMin}min</span>
      </div>
      <div style={{ fontSize: fontMovimento, marginTop: 2 }}>{item.movimento}</div>
    </div>
  );
}

// Uma tarefa de equipe na visão "Ao Vivo" do celular — mesma ideia da versão
// do telão, só que empilhada (uma equipe por linha, layout de celular).
function LinhaTarefaEquipeCelular({ tarefa, destaque, cores }) {
  const especial = ehEquipeEncontristas(tarefa.equipeNome);
  const info = ORIGEM_INFO[tarefa.origem];
  const corSelo = especial ? CORES.dourado : info?.cor;
  return (
    <div
      style={{
        padding: '9px 12px',
        marginBottom: 6,
        borderRadius: 8,
        borderLeft: `3px solid ${corSelo ? `${corSelo}${destaque || especial ? '' : '77'}` : 'transparent'}`,
        background: especial ? `${CORES.dourado}33` : destaque ? `${CORES.dourado}22` : cores.cartao,
        opacity: destaque ? 1 : 0.75,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: destaque ? 19.4 : 15.3, color: destaque ? CORES.dourado : 'inherit' }}>{tarefa.hora}</span>
        <strong style={{ fontSize: 15.8 }}>{especial ? '✨ ' : info ? `${info.icone} ` : ''}{tarefa.equipeNome}</strong>
      </div>
      <div style={{ fontSize: 14.5, marginTop: 2 }}>{info ? info.label : tarefa.tarefa}</div>
    </div>
  );
}

function ModalEditarMomento({ item, onSalvar, onFechar }) {
  const [nome, setNome] = useState(item.movimento);
  const [duracao, setDuracao] = useState(item.duracaoMin);

  return (
    <div style={estilos.modalOverlay} onClick={onFechar}>
      <div style={estilos.modalCaixa} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Editar momento — {item.hora}</h3>
        <label style={estilos.label}>Nome</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={estilos.input} />
        <label style={estilos.label}>Duração (minutos)</label>
        <input
          type="number"
          min={1}
          value={duracao}
          onChange={(e) => setDuracao(parseInt(e.target.value, 10) || 1)}
          style={estilos.input}
        />
        <p style={{ fontSize: 15.8, opacity: 0.7 }}>
          Alterar a duração desloca automaticamente todos os momentos seguintes deste dia e gera um aviso de
          atraso/adiantamento para Servos e Coordenadores.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onSalvar(nome, duracao)} style={estilos.btnEntrar}>Salvar</button>
          <button onClick={onFechar} style={{ ...estilos.btnEntrar, background: '#888' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Aba Cadastro > Cronograma (CRUD completo, inclusive equipes/tarefa servos)
// — acesso exclusivo do Dirigente
// ============================================================================
function AbaCronograma({ encontro, branding, onSalvarCronogramaItem, onEditarCronogramaItemComCascata, onExcluirCronogramaItem, onSalvarPessoa, onExcluirPessoa, cores }) {
  const [diaSelecionado, setDiaSelecionado] = useState(Object.keys(DIAS_LABEL)[0]);
  const itensDia = encontro.cronograma.filter((i) => i.dia === diaSelecionado).sort((a, b) => a.ordem - b.ordem);
  const [novo, setNovo] = useState({ hora: '', duracaoMin: 15, movimento: '' });

  function adicionar() {
    if (!novo.hora || !novo.movimento.trim()) return;
    // maxOrdem só do dia selecionado — usar o máximo global (de todos os
    // dias) inflava a ordem do item novo bem acima da de qualquer outro
    // momento do mesmo dia, quebrando a ordenação e a cascata daquele dia.
    const maxOrdemDoDia = Math.max(0, ...itensDia.map((i) => i.ordem));
    onSalvarCronogramaItem({
      id: `${diaSelecionado}-${Date.now()}`,
      dia: diaSelecionado,
      ordem: maxOrdemDoDia + 1,
      hora: novo.hora,
      duracaoMin: novo.duracaoMin,
      movimento: novo.movimento,
      ativo: true,
    });
    setNovo({ hora: '', duracaoMin: 15, movimento: '' });
  }

  return (
    <div>
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={estilos.seletorDias}>
            {Object.keys(DIAS_LABEL).map((d) => (
              <button key={d} onClick={() => setDiaSelecionado(d)} style={{ ...estilos.chipDia, ...(d === diaSelecionado ? { background: CORES.dourado, color: CORES.verdeEscuro } : {}) }}>
                {DIAS_LABEL[d]}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} style={estilos.btnPequeno}>🖨️ Imprimir</button>
        </div>
        <p style={{ fontSize: 15.8, opacity: 0.65, marginTop: -2 }}>
          Clique num momento pra editar hora/duração e as tarefas de cada equipe naquele momento (é aqui que se
          completam dias com equipes ainda em branco, como o Domingo). Mudar a hora ou a duração desloca
          automaticamente todos os momentos seguintes daquele dia, pra manter os intervalos entre eles.
        </p>
        {itensDia.map((item) => (
          <LinhaCronogramaEditavel
            key={item.id}
            item={item}
            equipes={encontro.equipes}
            tarefas={encontro.tarefasEquipe.filter((t) => t.cronogramaItemId === item.id)}
            cores={cores}
            onSalvar={onEditarCronogramaItemComCascata}
            onExcluir={() => onExcluirCronogramaItem(item.id)}
            onSalvarTarefa={(t) => onSalvarPessoa('tarefasEquipe', t)}
            onExcluirTarefa={(id) => onExcluirPessoa('tarefasEquipe', id)}
          />
        ))}
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao, marginTop: 16 }}>
          <h4 style={{ marginTop: 0 }}>+ Novo momento</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr', gap: 8 }}>
            <input type="time" value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} style={estilos.input} />
            <input type="number" min={1} value={novo.duracaoMin} onChange={(e) => setNovo({ ...novo, duracaoMin: parseInt(e.target.value, 10) || 1 })} style={estilos.input} />
            <input type="text" placeholder="Nome do momento" value={novo.movimento} onChange={(e) => setNovo({ ...novo, movimento: e.target.value })} style={estilos.input} />
          </div>
          <button onClick={adicionar} style={estilos.btnEntrar}>Adicionar</button>
        </div>
      </div>

      {/* Área usada só na impressão (ver .imprimir-area em index.css) — cronograma completo dos 3 dias */}
      <div className="imprimir-area">
        <h2 style={{ fontFamily: "'Playfair Display', serif" }}>{branding?.nomeEvento}</h2>
        <p>Paróquia {branding?.nomeParoquia}</p>
        {Object.keys(DIAS_LABEL).map((dia) => (
          <div key={dia} style={{ marginBottom: 20, breakInside: 'avoid' }}>
            <h3>{DIAS_LABEL[dia]}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15.8 }}>
              <thead>
                <tr>
                  <th style={estilos.thImpressao}>Hora</th>
                  <th style={estilos.thImpressao}>Duração</th>
                  <th style={estilos.thImpressao}>Movimento</th>
                  <th style={estilos.thImpressao}>Tarefas de equipe</th>
                </tr>
              </thead>
              <tbody>
                {encontro.cronograma.filter((i) => i.dia === dia).sort((a, b) => a.ordem - b.ordem).map((i) => {
                  const tarefasDoItem = encontro.tarefasEquipe.filter((t) => t.cronogramaItemId === i.id);
                  return (
                    <tr key={i.id}>
                      <td style={estilos.tdImpressao}>{i.hora}</td>
                      <td style={estilos.tdImpressao}>{i.duracaoMin}min</td>
                      <td style={estilos.tdImpressao}>{i.movimento}</td>
                      <td style={estilos.tdImpressao}>
                        {tarefasDoItem.length ? tarefasDoItem.map((t) => `${t.equipeNome}: ${t.tarefa}`).join(' · ') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinhaCronogramaEditavel({ item, equipes, tarefas, cores, onSalvar, onExcluir, onSalvarTarefa, onExcluirTarefa }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(item);
  const [novaEquipe, setNovaEquipe] = useState('');
  const [novaTarefa, setNovaTarefa] = useState('');

  useEffect(() => setForm(item), [item]);

  if (!aberto) {
    return (
      <div onClick={() => setAberto(true)} style={{ ...estilos.linhaServoCelular, background: cores.cartao, cursor: 'pointer' }}>
        <span style={{ opacity: 0.7, width: 48 }}>{item.hora}</span>
        <span style={{ flex: 1 }}>{item.movimento}</span>
        {tarefas.length > 0 && <span style={{ fontSize: 15.1, opacity: 0.55 }}>{tarefas.length} equipe(s)</span>}
        <span style={{ fontSize: 15.8, opacity: 0.6 }}>{item.duracaoMin}min</span>
      </div>
    );
  }

  function adicionarTarefa() {
    if (!novaEquipe || !novaTarefa.trim()) return;
    onSalvarTarefa({
      id: `te-${item.id}-${Date.now()}`,
      dia: item.dia,
      equipeNome: novaEquipe,
      tarefa: novaTarefa.trim(),
      origem: 'cronograma',
      cronogramaItemId: item.id,
    });
    setNovaEquipe('');
    setNovaTarefa('');
  }

  return (
    <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr', gap: 8 }}>
        <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} style={estilos.input} />
        <input type="number" min={1} value={form.duracaoMin} onChange={(e) => setForm({ ...form, duracaoMin: parseInt(e.target.value, 10) || 1 })} style={estilos.input} />
        <input type="text" value={form.movimento} onChange={(e) => setForm({ ...form, movimento: e.target.value })} style={estilos.input} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => onSalvar(form)} style={estilos.btnPequeno}>Salvar momento</button>
        <button onClick={onExcluir} style={{ ...estilos.btnPequeno, background: CORES.terracota }}>Excluir momento</button>
        <button onClick={() => setAberto(false)} style={{ ...estilos.btnPequeno, background: '#888' }}>Fechar</button>
      </div>

      <label style={{ ...estilos.label, marginTop: 0 }}>Tarefas de equipe neste momento</label>
      {tarefas.length === 0 && <p style={{ fontSize: 15.8, opacity: 0.6, margin: '4px 0 10px' }}>Nenhuma equipe com tarefa aqui ainda.</p>}
      {tarefas.map((t) => (
        <TarefaEquipeInline key={t.id} tarefa={t} onSalvar={onSalvarTarefa} onExcluir={() => onExcluirTarefa(t.id)} />
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6, marginTop: 8 }}>
        <select value={novaEquipe} onChange={(e) => setNovaEquipe(e.target.value)} style={{ ...estilos.input, marginBottom: 0 }}>
          <option value="">Equipe…</option>
          {equipes.map((eq) => (
            <option key={eq.id} value={eq.nome}>{eq.nome}</option>
          ))}
        </select>
        <input type="text" placeholder="Tarefa da equipe" value={novaTarefa} onChange={(e) => setNovaTarefa(e.target.value)} style={{ ...estilos.input, marginBottom: 0 }} />
        <button onClick={adicionarTarefa} style={estilos.btnPequeno}>+ Add</button>
      </div>
    </div>
  );
}

// Uma tarefa de equipe já cadastrada num momento — edita o texto inline
// (salva ao sair do campo) ou remove.
function TarefaEquipeInline({ tarefa, onSalvar, onExcluir }) {
  const [texto, setTexto] = useState(tarefa.tarefa);
  useEffect(() => setTexto(tarefa.tarefa), [tarefa.tarefa]);

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
      <strong style={{ fontSize: 15.8, width: 84, flexShrink: 0, marginTop: 9, opacity: 0.85 }}>{tarefa.equipeNome}</strong>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { if (texto.trim() && texto !== tarefa.tarefa) onSalvar({ ...tarefa, tarefa: texto.trim() }); }}
        style={{ ...estilos.input, marginBottom: 0, minHeight: 34, fontFamily: 'inherit', resize: 'vertical', flex: 1 }}
      />
      <button onClick={onExcluir} style={{ ...estilos.btnPequeno, background: CORES.terracota, padding: '4px 8px', marginTop: 4 }}>×</button>
    </div>
  );
}

// ============================================================================
// Aba Cadastro > Servos — CRUD direto (equipe monta a lista, sem inscrição)
// ============================================================================
// ---------------------------------------------------------------------------
// Máscaras de formulário (CPF, telefone, data, CEP) — formatação progressiva
// construída a partir só dos dígitos digitados, sem depender de nenhuma lib
// externa. Reconstruir do zero a cada tecla (em vez de encadear regex sobre
// o valor já mascarado) evita os bugs clássicos desse tipo de máscara.
// ---------------------------------------------------------------------------
function maskCPF(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += '.' + d.slice(3, 6);
  if (d.length > 6) out += '.' + d.slice(6, 9);
  if (d.length > 9) out += '-' + d.slice(9, 11);
  return out;
}
function maskData(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '/' + d.slice(2, 4);
  if (d.length > 4) out += '/' + d.slice(4, 8);
  return out;
}
function maskCEP(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 8);
  let out = d.slice(0, 5);
  if (d.length > 5) out += '-' + d.slice(5, 8);
  return out;
}
function maskTelefone(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}

// Idade calculada a partir da data de nascimento (DD/MM/AAAA) — não fica
// desatualizada como um número de idade digitado à mão.
function calcularIdade(dataBR) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBR || '');
  if (!m) return null;
  const nasc = new Date(+m[3], +m[2] - 1, +m[1]);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

// Busca endereço (rua/bairro/cidade) a partir do CEP via ViaCEP — serviço
// público gratuito, sem necessidade de chave. Número e complemento nunca
// vêm do CEP, por isso continuam sendo digitados à mão.
async function buscarEnderecoPorCep(cepDigitos) {
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cepDigitos}/json/`);
    const dados = await resp.json();
    if (dados.erro) return null;
    return { rua: dados.logradouro || '', bairro: dados.bairro || '', cidade: dados.localidade || '' };
  } catch {
    return null;
  }
}

// Hook compartilhado pelos formulários de Servo e Encontrista — cuida do
// campo CEP: aplica a máscara e, ao completar 8 dígitos, busca e preenche
// rua/bairro/cidade automaticamente (o usuário ainda pode corrigir à mão).
function useCepAutocomplete(setForm) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState('');

  function onCepChange(valorDigitado) {
    const cepMascarado = maskCEP(valorDigitado);
    setForm((f) => ({ ...f, cep: cepMascarado }));
    setErroCep('');
    const digitos = cepMascarado.replace(/\D/g, '');
    if (digitos.length === 8) {
      setBuscandoCep(true);
      buscarEnderecoPorCep(digitos).then((endereco) => {
        setBuscandoCep(false);
        if (endereco) {
          setForm((f) => ({ ...f, rua: endereco.rua || f.rua, bairro: endereco.bairro || f.bairro, cidade: endereco.cidade || f.cidade }));
        } else {
          setErroCep('CEP não encontrado — preencha o endereço manualmente.');
        }
      });
    }
  }

  return { buscandoCep, erroCep, onCepChange };
}

// Confere os campos marcados como obrigatórios (menos Complemento, que é o
// único opcional dentro do bloco de endereço) — retorna a lista de rótulos
// que faltam ou estão incompletos, pra mostrar num aviso só.
function validarCampos(campos, form) {
  const erros = [];
  campos.forEach((c) => {
    if (!c.obrigatorio || c.tipo === 'checkbox') return;
    const v = form[c.key];
    if (!v || !String(v).trim()) {
      erros.push(c.label);
      return;
    }
    const digitos = String(v).replace(/\D/g, '');
    if (c.tipo === 'cpf' && digitos.length !== 11) erros.push(`${c.label} incompleto`);
    if (c.tipo === 'telefone' && digitos.length < 10) erros.push(`${c.label} incompleto`);
    if (c.tipo === 'data' && digitos.length !== 8) erros.push(`${c.label} incompleta`);
    if (c.tipo === 'cep' && digitos.length !== 8) erros.push(`${c.label} incompleto`);
  });
  return erros;
}

// Campo de formulário genérico — usado tanto no cadastro de Servos quanto de
// Encontristas, pra não duplicar a lógica de máscara/CEP/obrigatoriedade.
function CampoDinamico({ campo: c, form, setForm, equipes, buscandoCep, erroCep, onCepChange }) {
  const valor = form[c.key];
  const rotulo = `${c.label}${c.obrigatorio ? ' *' : ''}`;

  if (c.tipo === 'checkbox') {
    return (
      <div>
        <label style={estilos.label}>{rotulo}</label>
        <input type="checkbox" checked={!!valor} onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })} style={{ marginBottom: 12 }} />
      </div>
    );
  }
  if (c.tipo === 'equipeSelect') {
    return (
      <div>
        <label style={estilos.label}>{rotulo}</label>
        <select value={valor} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} style={estilos.input}>
          <option value="">Nenhuma / a definir</option>
          {(equipes || []).map((eq) => (
            <option key={eq.id} value={eq.nome}>{eq.nome}</option>
          ))}
        </select>
      </div>
    );
  }
  if (c.tipo === 'cep') {
    return (
      <div>
        <label style={estilos.label}>{rotulo}</label>
        <input type="text" inputMode="numeric" placeholder="00000-000" value={valor} onChange={(e) => onCepChange(e.target.value)} style={estilos.input} />
        {buscandoCep && <p style={{ fontSize: 14, opacity: 0.6, marginTop: -8 }}>Buscando endereço…</p>}
        {!buscandoCep && erroCep && <p style={{ fontSize: 14, color: CORES.terracota, marginTop: -8 }}>{erroCep}</p>}
      </div>
    );
  }
  const MASCARAS = { cpf: maskCPF, telefone: maskTelefone, data: maskData };
  const PLACEHOLDERS = { cpf: '000.000.000-00', telefone: '(00) 00000-0000', data: 'DD/MM/AAAA' };
  const mascara = MASCARAS[c.tipo];
  return (
    <div>
      <label style={estilos.label}>{rotulo}</label>
      <input
        type={c.tipo === 'number' ? 'number' : 'text'}
        inputMode={mascara ? 'numeric' : undefined}
        placeholder={PLACEHOLDERS[c.tipo]}
        value={valor}
        onChange={(e) => {
          const v = mascara ? mascara(e.target.value) : c.tipo === 'number' ? parseInt(e.target.value, 10) || '' : e.target.value;
          setForm({ ...form, [c.key]: v });
        }}
        style={estilos.input}
      />
    </div>
  );
}

// Nome, data de nascimento, CPF, telefone e o bloco de endereço (CEP com
// busca automática de rua/bairro/cidade, mais número e complemento
// digitados à mão) são obrigatórios — só Complemento fica opcional.
const CAMPOS_SERVO = [
  { key: 'nome', label: 'Nome completo', tipo: 'text', obrigatorio: true },
  { key: 'dataNascimento', label: 'Data de nascimento', tipo: 'data', obrigatorio: true },
  { key: 'cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true },
  { key: 'contato', label: 'Telefone', tipo: 'telefone', obrigatorio: true },
  { key: 'cep', label: 'CEP', tipo: 'cep', obrigatorio: true },
  { key: 'rua', label: 'Rua', tipo: 'text', obrigatorio: true },
  { key: 'numero', label: 'Número', tipo: 'text', obrigatorio: true },
  { key: 'complemento', label: 'Complemento', tipo: 'text' },
  { key: 'bairro', label: 'Bairro', tipo: 'text', obrigatorio: true },
  { key: 'cidade', label: 'Cidade', tipo: 'text', obrigatorio: true },
  { key: 'equipe', label: 'Equipe atual', tipo: 'equipeSelect' },
  { key: 'coordenouEquipeAtual', label: 'Foi coordenador(a) desta equipe?', tipo: 'checkbox' },
  { key: 'equipesAnteriores', label: 'Equipes em que já atuou (separadas por vírgula)', tipo: 'text' },
  { key: 'restricoes', label: 'Restrições', tipo: 'text' },
  { key: 'camisa', label: 'Camisa', tipo: 'text' },
  { key: 'autorizado', label: 'Autorizado', tipo: 'checkbox' },
];

// Ordena servos pra sugerir membros de uma equipe: primeiro quem acabou de
// virar servo no encontro anterior (recemFormado), depois intercala quem já
// atuou nessa equipe (experiente) com quem nunca atuou (sem experiência).
function sugerirServosParaEquipe(servos, nomeEquipe) {
  const recemFormados = servos.filter((s) => s.recemFormado);
  const restantes = servos.filter((s) => !s.recemFormado);
  const nome = (nomeEquipe || '').trim().toLowerCase();
  const experientes = restantes.filter((s) => nome && (s.equipesAnteriores || '').toLowerCase().includes(nome));
  const inexperientes = restantes.filter((s) => !(nome && (s.equipesAnteriores || '').toLowerCase().includes(nome)));
  const intercalados = [];
  const max = Math.max(experientes.length, inexperientes.length);
  for (let i = 0; i < max; i++) {
    if (experientes[i]) intercalados.push(experientes[i]);
    if (inexperientes[i]) intercalados.push(inexperientes[i]);
  }
  return [...recemFormados, ...intercalados];
}

function valoresVazios(campos) {
  const v = {};
  campos.forEach((c) => (v[c.key] = c.tipo === 'checkbox' ? false : ''));
  return v;
}

function AbaCadastroPessoas({ titulo, pessoas, campos, equipes, onSalvar, onExcluir, cores }) {
  const [form, setForm] = useState(valoresVazios(campos));
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');
  // Lista dos já cadastrados fica recolhida por padrão — o formulário de
  // cadastro/edição é o que importa na maioria das visitas a esta tela.
  const [listaAberta, setListaAberta] = useState(false);
  const { buscandoCep, erroCep, onCepChange } = useCepAutocomplete(setForm);

  const pessoasOrdenadas = useMemo(
    () => [...pessoas].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')),
    [pessoas]
  );

  function salvarForm() {
    const erros = validarCampos(campos, form);
    if (erros.length) {
      setErro('Preencha corretamente: ' + erros.join(', '));
      return;
    }
    setErro('');
    onSalvar({ id: editandoId || `p-${Date.now()}`, ...form });
    setForm(valoresVazios(campos));
    setEditandoId(null);
  }

  function editar(p) {
    setEditandoId(p.id);
    setForm(campos.reduce((acc, c) => ({ ...acc, [c.key]: p[c.key] ?? (c.tipo === 'checkbox' ? false : '') }), {}));
    setErro('');
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{titulo} ({pessoas.length})</h3>
      <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
        <h4 style={{ marginTop: 0 }}>{editandoId ? 'Editar' : '+ Novo(a)'} {titulo.slice(0, -1)}</h4>
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: -6 }}>* campo obrigatório</p>
        <div className="ejc-form-grid">
          {campos.map((c) => (
            <CampoDinamico
              key={c.key}
              campo={c}
              form={form}
              setForm={setForm}
              equipes={equipes}
              buscandoCep={c.tipo === 'cep' && buscandoCep}
              erroCep={c.tipo === 'cep' ? erroCep : ''}
              onCepChange={onCepChange}
            />
          ))}
        </div>
        {erro && <div style={estilos.erro}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={salvarForm} style={estilos.btnEntrar}>{editandoId ? 'Salvar' : 'Adicionar'}</button>
          {editandoId && (
            <button onClick={() => { setEditandoId(null); setForm(valoresVazios(campos)); setErro(''); }} style={{ ...estilos.btnEntrar, background: '#888' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <button onClick={() => setListaAberta((a) => !a)} style={{ ...estilos.btnLink, textAlign: 'left', marginTop: 16 }}>
        {listaAberta ? '▾' : '▸'} {titulo} cadastrados ({pessoas.length})
      </button>
      {listaAberta && pessoasOrdenadas.map((p) => (
        <div key={p.id} onClick={() => editar(p)} style={{ ...estilos.linhaServoCelular, background: cores.cartao, cursor: 'pointer' }}>
          <span style={{ flex: 1 }}>{p.nome}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onExcluir(p.id); }}
            style={{ ...estilos.btnPequeno, background: CORES.terracota, padding: '4px 8px' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Aba Cadastro > Encontro > Equipes — cadastro básico das equipes de servos.
// Estrutura ainda simples de propósito (nome + observações livres); os
// padrões por equipe (pedidos da cozinha, cafezinho etc.) entram depois que
// forem definidos, sem precisar mudar o modelo de dados.
// ============================================================================
function AbaEquipes({ equipes, servos, onSalvar, onExcluir, cores }) {
  const [form, setForm] = useState({ nome: '', observacoes: '', membrosIds: [] });
  const [editandoId, setEditandoId] = useState(null);

  function salvarForm() {
    if (!form.nome.trim()) return;
    // Preserva coordenadoresIds/senha (não editados aqui) ao salvar — este
    // formulário só mexe em nome/observações/membros.
    const existente = equipes.find((e) => e.id === editandoId);
    onSalvar({ ...existente, id: editandoId || `equipe-${Date.now()}`, ...form });
    setForm({ nome: '', observacoes: '', membrosIds: [] });
    setEditandoId(null);
  }

  function editar(e) {
    setEditandoId(e.id);
    setForm({ nome: e.nome, observacoes: e.observacoes || '', membrosIds: e.membrosIds || [] });
  }

  function alternarMembro(servoId) {
    setForm((f) => ({
      ...f,
      membrosIds: f.membrosIds.includes(servoId) ? f.membrosIds.filter((id) => id !== servoId) : [...f.membrosIds, servoId],
    }));
  }

  const sugeridos = sugerirServosParaEquipe(servos, form.nome);
  const nomeEquipeLower = form.nome.trim().toLowerCase();

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Equipes ({equipes.length})</h3>
      <p style={{ fontSize: 15.8, opacity: 0.7 }}>
        Cada equipe pode ter observações/padrões próprios (itens de pedido da cozinha, cafezinho etc.) — campo livre por enquanto.
      </p>
      <div style={estilos.gridCartoes}>
        {equipes.map((e) => (
          <div key={e.id} onClick={() => editar(e)} style={{ ...estilos.cartaoConfig, background: cores.cartao, cursor: 'pointer', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{e.nome}</strong>
              <button
                onClick={(ev) => { ev.stopPropagation(); onExcluir(e.id); }}
                style={{ ...estilos.btnPequeno, background: CORES.terracota, padding: '4px 8px' }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 15.8, opacity: 0.6, marginTop: 2 }}>{(e.membrosIds || []).length} membro(s)</div>
            {e.observacoes && <div style={{ fontSize: 16.4, opacity: 0.75, marginTop: 4, whiteSpace: 'pre-wrap' }}>{e.observacoes}</div>}
          </div>
        ))}
      </div>

      <div style={{ ...estilos.cartaoConfig, background: cores.cartao, marginTop: 16 }}>
        <h4 style={{ marginTop: 0 }}>{editandoId ? 'Editar' : '+ Nova'} Equipe</h4>
        <label style={estilos.label}>Nome</label>
        <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={estilos.input} />
        <label style={estilos.label}>Observações / padrões (opcional)</label>
        <textarea
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          style={{ ...estilos.input, minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }}
        />

        <label style={estilos.label}>
          Membros sugeridos — prioridade: recém-formados do último encontro, depois uma mistura de quem já
          atuou nesta equipe e quem nunca atuou
        </label>
        <div style={estilos.listaMembrosSugeridos}>
          {sugeridos.length === 0 && <p style={{ fontSize: 15.8, opacity: 0.6, margin: 0 }}>Cadastre Servos primeiro (aba Usuários → Servos).</p>}
          {sugeridos.map((s) => {
            const experiente = nomeEquipeLower && (s.equipesAnteriores || '').toLowerCase().includes(nomeEquipeLower);
            return (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 17, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.membrosIds.includes(s.id)} onChange={() => alternarMembro(s.id)} />
                <span style={{ flex: 1 }}>{s.nome}</span>
                {s.recemFormado && <span style={estilos.badgeNovo}>novo</span>}
                {!s.recemFormado && experiente && <span style={estilos.badgeExperiente}>já atuou aqui</span>}
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={salvarForm} style={estilos.btnEntrar}>{editandoId ? 'Salvar' : 'Adicionar'}</button>
          {editandoId && (
            <button onClick={() => { setEditandoId(null); setForm({ nome: '', observacoes: '', membrosIds: [] }); }} style={{ ...estilos.btnEntrar, background: '#888' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Aba Cadastro > Encontro > Escalas — Vigília, Capela Mariana e Almoço/Jantar.
// Tudo entra aqui como tarefasEquipe (mesma coleção do cronograma, origem
// diferente), exceto Capela Mariana, que fica numa coleção própria porque a
// mesma escala se aplica automaticamente a Sábado E Domingo.
// ============================================================================
function AbaEscalas({ encontro, onSalvarPessoa, onExcluirPessoa, cores }) {
  const [sub, setSub] = useState('vigilia');
  return (
    <div>
      <div style={{ ...estilos.tabNav, opacity: 0.85, padding: 0, marginBottom: 14 }}>
        {[
          ['vigilia', 'Vigília'],
          ['capela', 'Capela Mariana'],
          ['refeicoes', 'Almoço / Jantar'],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setSub(k)} style={{ ...estilos.tabBtn, ...(sub === k ? estilos.tabBtnAtiva : {}), fontSize: 16.4 }}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'vigilia' && (
        <AbaEscalaPorDia
          titulo="Vigília"
          origem="vigilia"
          tarefaPadrao="Plantão de Vigília"
          tarefasEquipe={encontro.tarefasEquipe}
          equipes={encontro.equipes}
          onSalvar={(t) => onSalvarPessoa('tarefasEquipe', t)}
          onExcluir={(id) => onExcluirPessoa('tarefasEquipe', id)}
          cores={cores}
        />
      )}

      {sub === 'capela' && (
        <AbaCapelaMariana
          capelaMariana={encontro.capelaMariana}
          equipes={encontro.equipes}
          onSalvar={(c) => onSalvarPessoa('capelaMariana', c)}
          onExcluir={(id) => onExcluirPessoa('capelaMariana', id)}
          cores={cores}
        />
      )}

      {sub === 'refeicoes' && (
        <>
          <AbaEscalaPorDia
            titulo="Almoço"
            origem="almoco"
            tarefaPadrao="Servir o Almoço"
            tarefasEquipe={encontro.tarefasEquipe}
            equipes={encontro.equipes}
            onSalvar={(t) => onSalvarPessoa('tarefasEquipe', t)}
            onExcluir={(id) => onExcluirPessoa('tarefasEquipe', id)}
            cores={cores}
            diasDisponiveis={['2026-08-29', '2026-08-30']}
          />
          <div style={{ height: 20 }} />
          <AbaEscalaPorDia
            titulo="Jantar"
            origem="jantar"
            tarefaPadrao="Servir o Jantar"
            tarefasEquipe={encontro.tarefasEquipe}
            equipes={encontro.equipes}
            onSalvar={(t) => onSalvarPessoa('tarefasEquipe', t)}
            onExcluir={(id) => onExcluirPessoa('tarefasEquipe', id)}
            cores={cores}
            diasDisponiveis={['2026-08-29']}
          />
        </>
      )}
    </div>
  );
}

// Escala genérica com hora própria, filtrada por origem + dia (Vigília,
// Almoço, Jantar) — cada uma é uma "tarefa de equipe" independente, sem
// vínculo com nenhum momento do cronograma do encontrista.
function AbaEscalaPorDia({ titulo, origem, tarefaPadrao, tarefasEquipe, equipes, onSalvar, onExcluir, cores, diasDisponiveis }) {
  const dias = diasDisponiveis || Object.keys(DIAS_LABEL);
  const [diaSelecionado, setDiaSelecionado] = useState(dias[0]);
  const itens = tarefasEquipe
    .filter((t) => t.origem === origem && t.dia === diaSelecionado)
    .sort((a, b) => horaParaMin(a.hora) - horaParaMin(b.hora));

  const [novo, setNovo] = useState({ hora: '', equipeNome: '' });

  function adicionar() {
    if (!novo.hora || !novo.equipeNome) return;
    onSalvar({
      id: `te-${origem}-${diaSelecionado}-${Date.now()}`,
      dia: diaSelecionado,
      equipeNome: novo.equipeNome,
      tarefa: tarefaPadrao,
      origem,
      hora: novo.hora,
      cronogramaItemId: null,
    });
    setNovo({ hora: '', equipeNome: '' });
  }

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>{titulo}</h3>
      {dias.length > 1 && (
        <div style={{ ...estilos.seletorDias, marginBottom: 10 }}>
          {dias.map((d) => (
            <button key={d} onClick={() => setDiaSelecionado(d)} style={{ ...estilos.chipDia, ...(d === diaSelecionado ? { background: CORES.dourado, color: CORES.verdeEscuro } : {}) }}>
              {DIAS_LABEL[d]}
            </button>
          ))}
        </div>
      )}
      {itens.length === 0 && <p style={{ fontSize: 15.8, opacity: 0.6 }}>Nenhum plantão cadastrado ainda pra {DIAS_LABEL[diaSelecionado]}.</p>}
      {itens.map((t) => (
        <LinhaEscalaEditavel key={t.id} tarefa={t} equipes={equipes} onSalvar={onSalvar} onExcluir={() => onExcluir(t.id)} cores={cores} />
      ))}
      <div style={{ ...estilos.cartaoConfig, background: cores.cartao, marginTop: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
          <input type="time" value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} style={estilos.input} />
          <select value={novo.equipeNome} onChange={(e) => setNovo({ ...novo, equipeNome: e.target.value })} style={estilos.input}>
            <option value="">Equipe…</option>
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.nome}>{eq.nome}</option>
            ))}
          </select>
        </div>
        <button onClick={adicionar} style={estilos.btnEntrar}>+ Adicionar plantão</button>
      </div>
    </div>
  );
}

// Capela Mariana — coleção própria (sem "dia"), aplicada automaticamente a
// Sábado e Domingo. "Encontristas" aparece como opção especial: não é uma
// equipe de servo, é o próprio momento deles na Capela.
function AbaCapelaMariana({ capelaMariana, equipes, onSalvar, onExcluir, cores }) {
  const itens = [...capelaMariana].sort((a, b) => horaParaMin(a.hora) - horaParaMin(b.hora));
  const [novo, setNovo] = useState({ hora: '', equipeNome: '' });

  function adicionar() {
    if (!novo.hora || !novo.equipeNome) return;
    onSalvar({ id: `cap-${Date.now()}`, hora: novo.hora, equipeNome: novo.equipeNome });
    setNovo({ hora: '', equipeNome: '' });
  }

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>Capela Mariana</h3>
      <p style={{ fontSize: 15.8, opacity: 0.7, marginTop: 0 }}>Escala única — aplicada automaticamente ao Sábado e ao Domingo.</p>
      {itens.length === 0 && <p style={{ fontSize: 15.8, opacity: 0.6 }}>Nenhum plantão cadastrado ainda.</p>}
      {itens.map((c) => (
        <LinhaEscalaEditavel
          key={c.id}
          tarefa={c}
          equipes={equipes}
          comDescricao={false}
          onSalvar={(t) => onSalvar({ id: t.id, hora: t.hora, equipeNome: t.equipeNome })}
          onExcluir={() => onExcluir(c.id)}
          cores={cores}
        />
      ))}
      <div style={{ ...estilos.cartaoConfig, background: cores.cartao, marginTop: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
          <input type="time" value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} style={estilos.input} />
          <select value={novo.equipeNome} onChange={(e) => setNovo({ ...novo, equipeNome: e.target.value })} style={estilos.input}>
            <option value="">Equipe…</option>
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.nome}>{eq.nome}</option>
            ))}
            <option value={EQUIPE_ENCONTRISTAS}>✨ Encontristas (momento especial)</option>
          </select>
        </div>
        <button onClick={adicionar} style={estilos.btnEntrar}>+ Adicionar plantão</button>
      </div>
    </div>
  );
}

// Linha editável genérica de uma escala com hora própria (Vigília, Almoço,
// Jantar, Capela Mariana) — hora, equipe e (opcional) descrição. Sem campo de
// duração: a fonte só tem "a partir de tal horário" — o fim de cada plantão é
// calculado sozinho (até começar o próximo da mesma escala), ver
// comFimAteProximoDaMesmaEscala.
function LinhaEscalaEditavel({ tarefa, equipes, onSalvar, onExcluir, cores, comDescricao = true }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(tarefa);
  useEffect(() => setForm(tarefa), [tarefa]);

  if (!aberto) {
    return (
      <div onClick={() => setAberto(true)} style={{ ...estilos.linhaServoCelular, background: cores.cartao, cursor: 'pointer' }}>
        <span style={{ opacity: 0.7, width: 48 }}>{tarefa.hora}</span>
        <span style={{ flex: 1 }}>{ehEquipeEncontristas(tarefa.equipeNome) ? `✨ ${tarefa.equipeNome}` : tarefa.equipeNome}</span>
      </div>
    );
  }

  return (
    <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
        <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} style={estilos.input} />
        <select value={form.equipeNome} onChange={(e) => setForm({ ...form, equipeNome: e.target.value })} style={estilos.input}>
          {equipes.map((eq) => (
            <option key={eq.id} value={eq.nome}>{eq.nome}</option>
          ))}
          {ehEquipeEncontristas(form.equipeNome) && <option value={EQUIPE_ENCONTRISTAS}>✨ Encontristas (momento especial)</option>}
        </select>
      </div>
      {comDescricao && (
        <>
          <label style={estilos.label}>Descrição (opcional)</label>
          <input type="text" value={form.tarefa} onChange={(e) => setForm({ ...form, tarefa: e.target.value })} style={estilos.input} />
        </>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { onSalvar(form); setAberto(false); }} style={estilos.btnPequeno}>Salvar</button>
        <button onClick={onExcluir} style={{ ...estilos.btnPequeno, background: CORES.terracota }}>Excluir</button>
        <button onClick={() => setAberto(false)} style={{ ...estilos.btnPequeno, background: '#888' }}>Fechar</button>
      </div>
    </div>
  );
}

// ============================================================================
// Aba Cadastro > Encontristas — fila de inscrições públicas (aprovar/rejeitar)
// + cadastro manual direto pelo Dirigente
// ============================================================================
const CAMPOS_ENCONTRISTA = [
  { key: 'nome', label: 'Nome completo', tipo: 'text', obrigatorio: true },
  { key: 'dataNascimento', label: 'Data de nascimento', tipo: 'data', obrigatorio: true },
  { key: 'cpf', label: 'CPF', tipo: 'cpf', obrigatorio: true },
  { key: 'contato', label: 'Telefone', tipo: 'telefone', obrigatorio: true },
  { key: 'responsavel', label: 'Responsável (se menor)', tipo: 'text' },
  { key: 'cep', label: 'CEP', tipo: 'cep', obrigatorio: true },
  { key: 'rua', label: 'Rua', tipo: 'text', obrigatorio: true },
  { key: 'numero', label: 'Número', tipo: 'text', obrigatorio: true },
  { key: 'complemento', label: 'Complemento', tipo: 'text' },
  { key: 'bairro', label: 'Bairro', tipo: 'text', obrigatorio: true },
  { key: 'cidade', label: 'Cidade', tipo: 'text', obrigatorio: true },
  { key: 'sala', label: 'Sala', tipo: 'text' },
  { key: 'restricoes', label: 'Restrições', tipo: 'text' },
  { key: 'camisa', label: 'Camisa', tipo: 'text' },
];

function AbaEncontristas({ encontristas, onSalvarPessoa, onExcluirPessoa, onFinalizarEncontro, cores }) {
  const pendentes = encontristas.filter((p) => (p.status || 'pendente') === 'pendente');
  const aprovados = encontristas.filter((p) => p.status === 'aprovado');
  const rejeitados = encontristas.filter((p) => p.status === 'rejeitado');
  const formados = encontristas.filter((p) => p.status === 'formado');
  const [confirmandoFinal, setConfirmandoFinal] = useState(false);
  // Ao encerrar, o padrão é assumir que todo Confirmado FEZ o encontro —
  // aqui só se marca a exceção (quem não fez), pra dar menos clique no caso
  // comum. Quem for marcado aqui volta pro cadastro em aberto (status
  // "pendente") em vez de virar Servo.
  const [naoFizeram, setNaoFizeram] = useState([]);

  const [form, setForm] = useState(valoresVazios(CAMPOS_ENCONTRISTA));
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');
  const { buscandoCep, erroCep, onCepChange } = useCepAutocomplete(setForm);

  function salvarForm() {
    const erros = validarCampos(CAMPOS_ENCONTRISTA, form);
    if (erros.length) {
      setErro('Preencha corretamente: ' + erros.join(', '));
      return;
    }
    setErro('');
    const existente = encontristas.find((p) => p.id === editandoId);
    onSalvarPessoa({ id: editandoId || `p-${Date.now()}`, ...form, status: existente ? existente.status : 'aprovado' });
    setForm(valoresVazios(CAMPOS_ENCONTRISTA));
    setEditandoId(null);
  }

  function editar(p) {
    setEditandoId(p.id);
    setForm(CAMPOS_ENCONTRISTA.reduce((acc, c) => ({ ...acc, [c.key]: p[c.key] ?? '' }), {}));
    setErro('');
  }

  function alternarNaoFez(id) {
    setNaoFizeram((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  function confirmarEncerramento() {
    onFinalizarEncontro(naoFizeram);
    setConfirmandoFinal(false);
    setNaoFizeram([]);
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Inscrições pendentes ({pendentes.length})</h3>
      {pendentes.length === 0 && <p style={{ fontSize: 17, opacity: 0.6 }}>Nenhuma inscrição pendente no momento.</p>}
      {pendentes.map((p) => {
        const idade = calcularIdade(p.dataNascimento);
        return (
          <div key={p.id} style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
            <strong>{p.nome}</strong>{idade !== null ? ` · ${idade} anos` : ''}
            <div style={{ fontSize: 15.8, opacity: 0.75, marginTop: 2 }}>
              {p.contato && <span>{p.contato}</span>}
              {p.responsavel && <span> · Responsável: {p.responsavel}</span>}
            </div>
            {p.restricoes && <div style={{ fontSize: 15.8, opacity: 0.75 }}>Restrições: {p.restricoes}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => onSalvarPessoa({ ...p, status: 'aprovado' })} style={estilos.btnPequeno}>✓ Aprovar</button>
              <button onClick={() => onSalvarPessoa({ ...p, status: 'rejeitado' })} style={{ ...estilos.btnPequeno, background: CORES.terracota }}>✗ Rejeitar</button>
            </div>
          </div>
        );
      })}

      <h3 style={{ marginTop: 24 }}>Confirmados ({aprovados.length})</h3>
      {aprovados.map((p) => (
        <div key={p.id} style={{ ...estilos.linhaServoCelular, background: cores.cartao }}>
          {confirmandoFinal && (
            <input
              type="checkbox"
              checked={naoFizeram.includes(p.id)}
              onChange={() => alternarNaoFez(p.id)}
              title="Marcar se NÃO fez o encontro"
            />
          )}
          <span onClick={() => !confirmandoFinal && editar(p)} style={{ flex: 1, cursor: confirmandoFinal ? 'default' : 'pointer' }}>{p.nome}</span>
          <span style={{ fontSize: 15.8, opacity: 0.6 }}>{p.sala || ''}</span>
          {!confirmandoFinal && (
            <button
              onClick={(e) => { e.stopPropagation(); onExcluirPessoa(p.id); }}
              style={{ ...estilos.btnPequeno, background: CORES.terracota, padding: '4px 8px' }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {aprovados.length > 0 && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao, marginTop: 10, border: `1px dashed ${CORES.dourado}66` }}>
          {!confirmandoFinal ? (
            <button onClick={() => setConfirmandoFinal(true)} style={{ ...estilos.btnPequeno, background: CORES.terracota }}>
              🏁 Encerrar este Encontro — mover Confirmados para Servos
            </button>
          ) : (
            <div>
              <p style={{ fontSize: 17, marginTop: 0 }}>
                Marque acima só quem <strong>não</strong> fez o encontro — o cadastro deles volta a ficar em
                aberto (pendente) pro próximo EJC. Os demais {aprovados.length - naoFizeram.length} viram
                Servo(s), com prioridade pra serem chamados a servir no próximo encontro (não é obrigatório).
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={confirmarEncerramento}
                  style={{ ...estilos.btnPequeno, background: CORES.terracota }}
                >
                  Confirmar e encerrar
                </button>
                <button onClick={() => { setConfirmandoFinal(false); setNaoFizeram([]); }} style={{ ...estilos.btnPequeno, background: '#888' }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {formados.length > 0 && (
        <>
          <h3 style={{ marginTop: 24, opacity: 0.6 }}>Formados — viraram Servos ({formados.length})</h3>
          {formados.map((p) => (
            <div key={p.id} style={{ ...estilos.linhaServoCelular, background: cores.cartao, opacity: 0.6 }}>
              <span style={{ flex: 1 }}>{p.nome}</span>
            </div>
          ))}
        </>
      )}

      {rejeitados.length > 0 && (
        <>
          <h3 style={{ marginTop: 24, opacity: 0.6 }}>Não confirmados ({rejeitados.length})</h3>
          {rejeitados.map((p) => (
            <div key={p.id} style={{ ...estilos.linhaServoCelular, background: cores.cartao, opacity: 0.6 }}>
              <span style={{ flex: 1 }}>{p.nome}</span>
              <button onClick={() => onSalvarPessoa({ ...p, status: 'pendente' })} style={estilos.btnPequeno}>Reavaliar</button>
            </div>
          ))}
        </>
      )}

      <div style={{ ...estilos.cartaoConfig, background: cores.cartao, marginTop: 16 }}>
        <h4 style={{ marginTop: 0 }}>{editandoId ? 'Editar' : '+ Cadastrar'} Encontrista manualmente</h4>
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: -6 }}>* campo obrigatório</p>
        <div className="ejc-form-grid">
          {CAMPOS_ENCONTRISTA.map((c) => (
            <CampoDinamico
              key={c.key}
              campo={c}
              form={form}
              setForm={setForm}
              buscandoCep={c.tipo === 'cep' && buscandoCep}
              erroCep={c.tipo === 'cep' ? erroCep : ''}
              onCepChange={onCepChange}
            />
          ))}
        </div>
        {erro && <div style={estilos.erro}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={salvarForm} style={estilos.btnEntrar}>{editandoId ? 'Salvar' : 'Adicionar'}</button>
          {editandoId && (
            <button onClick={() => { setEditandoId(null); setForm(valoresVazios(CAMPOS_ENCONTRISTA)); setErro(''); }} style={{ ...estilos.btnEntrar, background: '#888' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Estilos
// ============================================================================
const estilos = {
  telaCarregando: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(160deg, ${CORES.verdeEscuro}, #081C13)`,
  },
  marcaDagua: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(212,175,55,0.10), transparent 60%)',
    pointerEvents: 'none',
  },
  telaSeletor: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(160deg, ${CORES.verdeEscuro}, #081C13)`,
    color: CORES.marfim,
    padding: 24,
    position: 'relative',
  },
  seletorHalo: { textAlign: 'center', marginBottom: 36 },
  seletorTitulo: { fontFamily: "'Playfair Display', serif", color: CORES.dourado, fontSize: 39.4, margin: 0 },
  seletorTituloInstitucional: {
    fontFamily: "'Playfair Display', serif",
    color: CORES.dourado,
    fontSize: 31.5,
    margin: '0 auto',
    maxWidth: 520,
    lineHeight: 1.3,
  },
  seletorSubtitulo: { fontSize: 17, letterSpacing: 1, textTransform: 'uppercase', color: CORES.marfim, opacity: 0.7, marginTop: 10 },
  loginForm: {
    background: 'white',
    color: '#222',
    padding: 36,
    borderRadius: 10,
    boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
    maxWidth: 380,
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  label: { display: 'block', fontSize: 15.8, opacity: 0.7, marginBottom: 4, marginTop: 8 },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 18.4,
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  erro: { color: CORES.terracota, fontSize: 15.8, marginBottom: 10 },
  btnEntrar: {
    width: '100%',
    padding: 12,
    background: `linear-gradient(135deg, ${CORES.terracota}, #5c2e14)`,
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 8,
  },
  btnLink: { background: 'none', border: 'none', color: CORES.verde, cursor: 'pointer', fontSize: 17, width: '100%', textAlign: 'center' },
  btnInscricao: {
    position: 'relative',
    zIndex: 1,
    padding: '15px 30px',
    background: `linear-gradient(135deg, ${CORES.dourado}, #F0D77B)`,
    color: CORES.verdeEscuro,
    border: 'none',
    borderRadius: 32,
    fontWeight: 700,
    fontSize: 19.7,
    cursor: 'pointer',
    letterSpacing: 0.2,
    animation: 'pulseGlowInscricao 2.4s ease-in-out infinite',
  },
  telaModoTela: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: 'Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  telaMetade: { flex: 1, padding: '32px 30px', overflow: 'hidden', position: 'relative', zIndex: 1 },
  telaTituloColuna: { fontFamily: "'Playfair Display', serif", fontSize: 32.8, margin: 0, textTransform: 'uppercase', letterSpacing: 1 },
  hotspotSair: { position: 'fixed', bottom: 0, right: 0, width: 32, height: 32, zIndex: 45, cursor: 'default' },
  telaoBarraTopo: {
    // fixed (não absolute) — o Telão pode rolar verticalmente quando o dia
    // tem muita coisa, e a barra de dias precisa continuar visível parada
    // no topo em vez de rolar junto com o conteúdo.
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px 12px',
  },
  telaoBtnTema: {
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${CORES.dourado}55`,
    color: 'inherit',
    padding: '6px 14px',
    borderRadius: 20,
    cursor: 'pointer',
    fontSize: 17,
  },
  bannerContainer: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 },
  banner: { padding: '12px 22px', borderRadius: 8, color: 'white', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.35)', textAlign: 'center' },
  bannerInline: { padding: '10px 14px', borderRadius: 8, color: 'white', fontWeight: 600, marginBottom: 10, fontSize: 18.4 },
  // Aviso manual do Coordenador Geral — centralizado na tela (não só embaixo,
  // como os demais banners), maior e um pouco transparente.
  avisoManual: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: `${CORES.vermelhoSangue}e0`,
    color: '#fff',
    padding: '30px 48px',
    borderRadius: 16,
    fontWeight: 700,
    fontSize: 29.6,
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    zIndex: 50,
    maxWidth: '82vw',
  },
  headerCelular: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' },
  btnSairHeader: { background: 'rgba(255,255,255,0.12)', border: `1px solid ${CORES.dourado}55`, color: 'inherit', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 17 },
  tabNav: { display: 'flex', overflowX: 'auto', gap: 4, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  tabBtn: { background: 'transparent', border: 'none', color: 'inherit', opacity: 0.6, padding: '8px 10px', cursor: 'pointer', fontSize: 17, whiteSpace: 'nowrap', borderRadius: 6 },
  tabBtnAtiva: { opacity: 1, background: 'rgba(212,175,55,0.18)', fontWeight: 600 },
  avisoOffline: { background: '#8B4513', color: 'white', fontSize: 16.4, padding: '8px 16px', textAlign: 'center' },
  seletorDias: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  // auto-fit + minmax: 2 colunas quando cabe (computador), 1 coluna quando
  // não cabe (celular) — sem precisar de media query.
  gridCronogramas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0 32px', alignItems: 'start' },
  // Grid pra listas de cartões (equipes, funções, coordenadores…) — em telas
  // largas (notebook/desktop) preenche várias colunas em vez de empilhar um
  // cartão embaixo do outro deixando metade da tela vazia.
  gridCartoes: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, alignItems: 'start' },
  chipDia: { padding: '6px 12px', borderRadius: 20, border: `1px solid ${CORES.dourado}66`, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 17 },
  cartaoConfig: { padding: 14, borderRadius: 10, marginBottom: 14 },
  btnPequeno: { padding: '8px 14px', background: CORES.verde, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 17 },
  linhaServoCelular: { display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, marginBottom: 6, fontSize: 17.7 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 },
  modalCaixa: { background: 'white', color: '#222', padding: 24, borderRadius: 10, maxWidth: 380, width: '100%' },
  logoCantoImg: { width: 48, height: 56, objectFit: 'contain', flexShrink: 0 },
  listaMembrosSugeridos: {
    maxHeight: 230,
    overflowY: 'auto',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 8,
    padding: '4px 10px',
    marginBottom: 4,
  },
  badgeNovo: { fontSize: 13.8, background: CORES.verde, color: 'white', padding: '2px 7px', borderRadius: 10, fontWeight: 600 },
  badgeExperiente: { fontSize: 13.8, background: CORES.dourado, color: CORES.verdeEscuro, padding: '2px 7px', borderRadius: 10, fontWeight: 600 },
  thImpressao: { border: '1px solid #999', padding: '4px 6px', textAlign: 'left', background: '#eee' },
  tdImpressao: { border: '1px solid #ccc', padding: '4px 6px' },
};
