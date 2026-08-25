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
// Servo, Tela, Coordenador de Equipe e Dirigente usam senha única
// compartilhada pela função inteira. Só o Coordenador Geral usa senha
// individual por pessoa — precisa identificar quem emitiu um aviso.
// ---------------------------------------------------------------------------
const CONFIG_PADRAO = {
  tema: 'dark',
  senhaServo: 'servo',
  senhaTela: 'tela',
  senhaCoordenadorEquipe: 'coordequipe',
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

// Aplica edição de nome/duração em um item e propaga o deslocamento (cascata)
// para todos os itens seguintes do mesmo dia. Retorna a lista atualizada e o
// delta em minutos (para gerar o aviso de atraso/adiantamento).
function aplicarEdicaoComCascata(cronograma, id, novoNome, novaDuracao) {
  const item = cronograma.find((i) => i.id === id);
  if (!item) return { cronograma, delta: 0, nomeAntigo: '' };
  const nomeAntigo = item.movimento;
  const delta = novaDuracao - item.duracaoMin;
  const atualizado = cronograma.map((i) => {
    if (i.id === id) {
      return { ...i, movimento: novoNome, duracaoMin: novaDuracao };
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
// Servo (compartilhada) → Tela (compartilhada) → Coordenador de Equipe
// (compartilhada) → Dirigente (compartilhada) → Coordenador Geral
// (individual, só esse identifica quem logou). Retorna null se não bater
// com nada.
function resolverAcessoPorSenha(senha, config) {
  if (!senha) return null;
  if (senha === config.senhaServo) return { perfil: 'servo', nome: null };
  if (senha === config.senhaTela) return { perfil: 'tela', nome: null };
  if (senha === config.senhaCoordenadorEquipe) return { perfil: 'coordenadorEquipe', nome: null };
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

// ============================================================================
// Componente principal
// ============================================================================
export default function EJCApp() {
  const [perfil, setPerfil] = useState(null); // 'servo' | 'coordenadorGeral' | 'coordenadorEquipe' | 'dirigente' | 'tela'
  const [usuarioLogado, setUsuarioLogado] = useState(null); // nome (coordenador/dirigente)
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

  function handleSalvarCronogramaItem(item) {
    const cronograma = encontro.cronograma.some((i) => i.id === item.id)
      ? encontro.cronograma.map((i) => (i.id === item.id ? item : i))
      : [...encontro.cronograma, item];
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

  // Ao encerrar o encontro: todo encontrista com status "aprovado" vira um
  // registro de Servo (base para o próximo encontro), e fica marcado como
  // "formado" na lista de Encontristas pra não ser migrado de novo.
  function handleFinalizarEncontro() {
    const aprovados = encontro.encontristas.filter((p) => p.status === 'aprovado');
    if (aprovados.length === 0) return;
    const novosServos = aprovados.map((p) => ({
      id: `servo-de-${p.id}`,
      nome: p.nome,
      equipe: '',
      equipesAnteriores: '',
      contato: p.contato || '',
      restricoes: p.restricoes || '',
      camisa: p.camisa || '',
      autorizado: false,
      recemFormado: true,
    }));
    const servosSemDuplicata = novosServos.filter((ns) => !encontro.servos.some((s) => s.id === ns.id));
    const encontristasAtualizados = encontro.encontristas.map((p) =>
      p.status === 'aprovado' ? { ...p, status: 'formado' } : p
    );
    salvar({ ...encontro, servos: [...encontro.servos, ...servosSemDuplicata], encontristas: encontristasAtualizados });
  }

  function tentarEntrar(senha) {
    const match = resolverAcessoPorSenha(senha, encontro.config);
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
        onToggleTema={handleToggleTema}
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
      <p style={{ color: CORES.dourado, fontFamily: "'Playfair Display', serif", fontSize: 29.3 }}>Carregando…</p>
    </div>
  );
}

// ============================================================================
// Tela: Login unificado — uma senha só, o papel é definido pela senha digitada
// ============================================================================
function TelaLogin({ branding, erro, onEntrar, onInscrever }) {
  const [senha, setSenha] = useState('');

  return (
    <div style={estilos.telaSeletor}>
      <div style={estilos.marcaDagua} />
      <div className="ejc-tela-dividida">
        {/* Esquerda (ou tela cheia no celular): logo compacta só no celular +
            formulário de acesso + convite pra inscrição. */}
        <div className="ejc-login-card" style={estilos.loginForm}>
          <div className="ejc-logo-compact">
            <div style={{ width: 116, height: 133, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={imagemSantaUrl}
                alt={`Nossa Senhora — ${branding.nomeParoquia}`}
                style={{ maxWidth: '100%', maxHeight: '100%', filter: 'brightness(1.1) contrast(1.05)' }}
              />
            </div>
            <h1 style={{ ...estilos.seletorTituloInstitucional, color: CORES.verdeEscuro, fontSize: 40 }}>
              Sistema de Gestão e Planejamento de Encontros com Cristo
            </h1>
            <p style={{ ...estilos.seletorSubtitulo, color: CORES.terracota, opacity: 0.85, marginBottom: 16 }}>Paróquia {branding.nomeParoquia}</p>
          </div>

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
          <p style={{ marginTop: 20, marginBottom: 10, fontSize: 21.1, opacity: 0.75, textAlign: 'center', color: '#555' }}>
            Ainda não é participante cadastrado?
          </p>
          <button onClick={onInscrever} style={estilos.btnInscricao}>
            🙋 Inscreva-se para o {branding.nomeEvento} →
          </button>
        </div>

        {/* Direita: só aparece em telas largas — a imagem grande da Santa
            substitui a logo compacta do celular (ver @media abaixo). */}
        <div className="ejc-painel-marca">
          <img
            src={imagemSantaUrl}
            alt={`Nossa Senhora — ${branding.nomeParoquia}`}
            className="ejc-painel-marca-img"
          />
          <p className="ejc-painel-marca-legenda">
            Sistema de Gestão e Planejamento de Encontros com Cristo
            <br />
            Paróquia {branding.nomeParoquia}
          </p>
        </div>
      </div>
      <style>{`
        @keyframes pulseGlowInscricao {
          0%, 100% { box-shadow: 0 4px 18px rgba(212,175,55,0.45); }
          50% { box-shadow: 0 4px 30px rgba(212,175,55,0.85); }
        }
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
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 22px;
            padding: 32px;
            background: linear-gradient(160deg, ${CORES.verdeEscuro}, #081C13);
          }
          .ejc-painel-marca-img {
            width: 72%;
            max-width: 340px;
            height: auto;
            filter: brightness(1.1) contrast(1.05) drop-shadow(0 12px 28px rgba(0,0,0,0.45));
          }
          .ejc-painel-marca-legenda {
            color: ${CORES.dourado};
            font-family: 'Playfair Display', serif;
            text-align: center;
            font-size: 22px;
            line-height: 1.4;
            margin: 0;
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
          <p style={{ fontSize: 22.8, color: '#444' }}>
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
        <p style={{ fontSize: 19.5, opacity: 0.7, marginBottom: 16 }}>Paróquia {branding.nomeParoquia}</p>

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
function ModoTela({ encontro, horaAtual, branding, onSair, onToggleTema }) {
  const tema = encontro.config.tema;
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
  const momentoEncontristasAtivo = tarefasAtuais.find((t) => ehEquipeEncontristas(t.equipeNome));

  return (
    <div style={{ ...estilos.telaModoTela, background: cores.fundo, color: cores.texto }}>
      <MarcaDaguaImagem opacidade={0.1} />
      {/* hotspot invisível para sair (canto inferior direito) */}
      <div onClick={onSair} style={estilos.hotspotSair} title="Sair do modo tela" />

      <div style={estilos.telaoBarraTopo}>
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
        <button onClick={onToggleTema} style={estilos.telaoBtnTema} title="Alternar modo claro/escuro">
          {tema === 'dark' ? '☀️ Modo claro' : '🌙 Modo escuro'}
        </button>
      </div>

      <div style={estilos.logoCantoTelao}>
        <img src={imagemSantaUrl} alt="" style={{ width: 26, height: 32, objectFit: 'contain' }} />
        <span>Paróquia {branding.nomeParoquia}</span>
      </div>
      <div style={{ ...estilos.telaMetade, paddingTop: 58 }}>
        <h2 style={{ ...estilos.telaTituloColuna, color: CORES.dourado }}>Cronograma — Encontristas</h2>
        <p style={{ opacity: 0.7, marginTop: -6, fontSize: 27.6 }}>{DIAS_LABEL[diaAtivo]}</p>
        {atual && <MomentoDestaque item={atual} tamanho="grande" cores={cores} />}
        {proximo && <MomentoDestaque item={proximo} tamanho="medio" cores={cores} rotulo="Próximo" />}
        <div style={{ marginTop: 16, opacity: 0.75 }}>
          {demais.slice(0, 6).map((i) => (
            <LinhaMomentoPequena key={i.id} item={i} />
          ))}
        </div>
      </div>
      <div style={{ ...estilos.telaMetade, paddingTop: 58, borderLeft: `2px solid ${CORES.dourado}44` }}>
        <h2 style={{ ...estilos.telaTituloColuna, color: CORES.dourado }}>Cronograma — Servos</h2>
        <p style={{ opacity: 0.7, marginTop: -6, fontSize: 27.6 }}>{DIAS_LABEL[diaAtivo]}</p>
        <div style={{ overflowY: 'auto', maxHeight: '72vh' }}>
          {tarefasAtuais.length === 0 && tarefasProximas.length === 0 && (
            <p style={{ opacity: 0.5, fontSize: 22.8 }}>Nenhuma tarefa de equipe cadastrada pra este momento.</p>
          )}
          {tarefasAtuais.map((t) => (
            <LinhaTarefaEquipeTelao key={t.id} tarefa={t} destaque />
          ))}
          {tarefasProximas.length > 0 && (
            <div style={{ marginTop: tarefasAtuais.length ? 18 : 0, opacity: 0.6, fontSize: 19.5, textTransform: 'uppercase', letterSpacing: 1 }}>
              A seguir
            </div>
          )}
          {tarefasProximas.map((t) => (
            <LinhaTarefaEquipeTelao key={t.id} tarefa={t} destaque={false} />
          ))}
        </div>
      </div>

      {(avisoMovimento || momentoEncontristasAtivo || avisosVisiveis.length > 0) && (
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
          {avisosVisiveis.map((a) => (
            <div key={a.id} style={{ ...estilos.banner, background: a.tipo === 3 ? CORES.dourado : CORES.verde, color: a.tipo === 3 ? CORES.verdeEscuro : '#fff' }}>
              {a.mensagem}
            </div>
          ))}
        </div>
      )}
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
    return minAgora >= inicio && minAgora < fim && /movimenta/i.test(i.movimento);
  }) || null;
}

// Tamanhos do Telão são bem maiores que qualquer outra tela do app — é
// projetor, visto de longe, não celular na mão.
function MomentoDestaque({ item, tamanho, rotulo }) {
  const tamanhos = { grande: 84, medio: 55 };
  return (
    <div style={{ margin: tamanho === 'grande' ? '18px 0' : '10px 0' }}>
      {rotulo && <div style={{ fontSize: 26, letterSpacing: 1, opacity: 0.6, textTransform: 'uppercase' }}>{rotulo}</div>}
      <div style={{ fontSize: tamanhos[tamanho], fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{item.hora}</div>
      <div style={{ fontSize: tamanho === 'grande' ? 46 : 36 }}>{item.movimento}</div>
    </div>
  );
}

function LinhaMomentoPequena({ item }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '6px 0', fontSize: 30.9 }}>
      <span style={{ opacity: 0.6, width: 62 }}>{item.hora}</span>
      <span>{item.movimento}</span>
    </div>
  );
}

// Uma linha do lado "Servos" do telão — uma tarefa de uma equipe num
// horário. `destaque` = tarefa rolando agora (várias podem aparecer juntas,
// já que equipes diferentes fazem coisas diferentes no mesmo instante).
// A equipe "Encontristas" (vinda da Capela Mariana) ganha estilo próprio,
// pra chamar atenção — não é uma tarefa de servo, é um momento especial.
function LinhaTarefaEquipeTelao({ tarefa, destaque }) {
  const especial = ehEquipeEncontristas(tarefa.equipeNome);
  const info = ORIGEM_INFO[tarefa.origem];
  const corSelo = especial ? CORES.dourado : info?.cor;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '78px 1fr 2fr',
        gap: 12,
        padding: '11px 12px',
        fontSize: destaque ? 37 : 29,
        borderRadius: 6,
        marginBottom: 5,
        borderLeft: `4px solid ${corSelo ? `${corSelo}${destaque || especial ? '' : '77'}` : 'transparent'}`,
        background: especial ? `${CORES.dourado}30` : destaque ? `${CORES.dourado}18` : 'transparent',
        opacity: destaque ? 1 : 0.72,
      }}
    >
      <span style={{ opacity: 0.7 }}>{tarefa.hora}</span>
      <span style={{ fontWeight: destaque ? 700 : 500 }}>
        {especial ? '✨ ' : info ? `${info.icone} ` : ''}
        {tarefa.equipeNome}
      </span>
      <span>{info ? info.label : tarefa.tarefa}</span>
    </div>
  );
}

const LABELS_CADASTRO = { usuarios: '👤 Usuários', encontro: '📅 Encontro', encontristas: '🙋 Encontristas' };

// ============================================================================
// Tela: Modo Celular (Servo / Coordenador / Dirigente)
// - Servo: só visualização (cronogramas + avisos), sem abas.
// - Coordenador: só "Encontro" (ao vivo) — edita momentos (cascata), envia
//   avisos, tema.
// - Dirigente: dois grandes blocos —
//     CADASTRO (menu lateral recolhível): Usuários (Servos/Coordenadores/
//       Dirigentes/Acessos) / Encontro (EJC + Equipes) / Encontristas
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
  const [abaCadastro, setAbaCadastro] = useState('usuarios'); // 'usuarios' | 'encontro' | 'encontristas'
  const [abaEncontroSub, setAbaEncontroSub] = useState('ejc'); // 'ejc' | 'equipes' | 'escalas'
  const [menuAberto, setMenuAberto] = useState(false);
  const tema = encontro.config.tema;
  const cores = tema === 'dark'
    ? { fundo: CORES.verdeEscuro, texto: CORES.marfim, cartao: 'rgba(255,255,255,0.06)' }
    : { fundo: '#F5F1E4', texto: CORES.verdeEscuro, cartao: '#ffffff' };

  const rotuloPerfil =
    perfil === 'coordenadorGeral' ? `Coordenador Geral — ${usuarioLogado}` :
    perfil === 'coordenadorEquipe' ? 'Coordenador de Equipe' :
    perfil === 'dirigente' ? 'Dirigente' :
    'Servo';

  // Dirigente em Cadastro trabalha com listas maiores — marca d'água discreta.
  const mostrarMarcaDagua = isDirigente && abaTopo === 'cadastro';
  // A visão "Ao Vivo" (Encontristas + Servos lado a lado) precisa de mais
  // largura que as telas de Cadastro pra caber as duas colunas quando aberta
  // num computador — ver PainelAoVivo, que usa CSS grid responsivo.
  const mostrandoAoVivo = !isDirigente || abaTopo === 'encontro';

  function abrirCadastro() {
    if (abaTopo === 'cadastro') setMenuAberto((m) => !m);
    else {
      setAbaTopo('cadastro');
      setMenuAberto(true);
    }
  }

  function escolherSecaoCadastro(k) {
    setAbaCadastro(k);
    setMenuAberto(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: cores.fundo, color: cores.texto, fontFamily: 'Roboto, sans-serif', position: 'relative' }}>
      {mostrarMarcaDagua && <MarcaDaguaImagem opacidade={0.06} />}
      <div style={estilos.headerCelular}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={imagemSantaUrl} alt="" style={estilos.logoCantoImg} />
          <div>
            <div style={{ fontSize: 19.5, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>{rotuloPerfil}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: CORES.dourado, lineHeight: 1.2 }}>{branding.nomeParoquia}</div>
          </div>
        </div>
        <button onClick={onSair} style={estilos.btnSairHeader}>Sair</button>
      </div>
      <div style={{ height: 4, background: CORES.dourado }} />

      {isDirigente && (
        <div style={estilos.tabNav}>
          <button
            onClick={abrirCadastro}
            style={{ ...estilos.tabBtn, ...(abaTopo === 'cadastro' ? estilos.tabBtnAtiva : {}), fontSize: 22.8, fontWeight: 700 }}
          >
            ☰ Cadastro Geral{abaTopo === 'cadastro' ? ` — ${LABELS_CADASTRO[abaCadastro]}` : ''}
          </button>
          <button
            onClick={() => { setAbaTopo('encontro'); setMenuAberto(false); }}
            style={{ ...estilos.tabBtn, ...(abaTopo === 'encontro' ? estilos.tabBtnAtiva : {}), fontSize: 22.8, fontWeight: 700 }}
          >
            Encontro
          </button>
        </div>
      )}

      {isDirigente && abaTopo === 'cadastro' && abaCadastro === 'encontro' && (
        <div style={{ ...estilos.tabNav, opacity: 0.85 }}>
          {[
            ['ejc', 'EJC (cronograma)'],
            ['equipes', 'Equipes'],
            ['escalas', 'Escalas'],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setAbaEncontroSub(k)} style={{ ...estilos.tabBtn, ...(abaEncontroSub === k ? estilos.tabBtnAtiva : {}), fontSize: 20.3 }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {props.offline && (podeEditarAoVivo || isDirigente) && (
        <div style={estilos.avisoOffline}>
          ⚠️ Firebase ainda não configurado (ou sem conexão) — as alterações ficam salvas só neste aparelho, nesta sessão.
        </div>
      )}

      {/* Menu lateral recolhível — só aparece quando "Cadastro" é clicado */}
      {isDirigente && menuAberto && (
        <>
          <div onClick={() => setMenuAberto(false)} style={estilos.drawerOverlay} />
          <div style={{ ...estilos.drawerPainel, background: tema === 'dark' ? '#0F3A28' : '#fff', color: cores.texto }}>
            <h4 style={{ marginTop: 0, color: CORES.dourado, fontFamily: "'Playfair Display', serif" }}>Cadastro Geral</h4>
            {Object.entries(LABELS_CADASTRO).map(([k, label]) => (
              <button
                key={k}
                onClick={() => escolherSecaoCadastro(k)}
                style={{ ...estilos.itemDrawer, ...(abaCadastro === k ? estilos.itemDrawerAtivo : {}) }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ padding: 16, maxWidth: mostrandoAoVivo ? 1200 : 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {!isDirigente && <PainelAoVivo {...props} podeEditar={podeEditarAoVivo} cores={cores} />}

        {isDirigente && abaTopo === 'encontro' && <PainelAoVivo {...props} podeEditar={false} cores={cores} />}

        {isDirigente && abaTopo === 'cadastro' && abaCadastro === 'usuarios' && (
          <AbaUsuarios
            encontro={encontro}
            onSalvarPessoa={props.onSalvarPessoa}
            onExcluirPessoa={props.onExcluirPessoa}
            onSalvarConfig={props.onSalvarConfig}
            cores={cores}
          />
        )}
        {isDirigente && abaTopo === 'cadastro' && abaCadastro === 'encontro' && abaEncontroSub === 'ejc' && (
          <AbaCronograma {...props} cores={cores} />
        )}
        {isDirigente && abaTopo === 'cadastro' && abaCadastro === 'encontro' && abaEncontroSub === 'equipes' && (
          <AbaEquipes
            equipes={encontro.equipes}
            servos={encontro.servos}
            onSalvar={(e) => props.onSalvarPessoa('equipes', e)}
            onExcluir={(id) => props.onExcluirPessoa('equipes', id)}
            cores={cores}
          />
        )}
        {isDirigente && abaTopo === 'cadastro' && abaCadastro === 'encontro' && abaEncontroSub === 'escalas' && (
          <AbaEscalas
            encontro={encontro}
            onSalvarPessoa={props.onSalvarPessoa}
            onExcluirPessoa={props.onExcluirPessoa}
            cores={cores}
          />
        )}
        {isDirigente && abaTopo === 'cadastro' && abaCadastro === 'encontristas' && (
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
  );
}

// ============================================================================
// Aba Cadastro > Usuários — Servos / Coordenadores / Dirigentes / Acessos.
// Coordenador NÃO é um cadastro próprio: é um Servo escolhido para coordenar
// este EJC, com uma senha de acesso atribuída na hora da escolha.
// ============================================================================
function AbaUsuarios({ encontro, onSalvarPessoa, onExcluirPessoa, onSalvarConfig, cores }) {
  const [sub, setSub] = useState('servos');
  return (
    <div>
      <div style={{ ...estilos.tabNav, opacity: 0.85, padding: 0, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          ['servos', 'Servos'],
          ['coordenadoresGerais', 'Coordenadores Gerais'],
          ['coordenadoresEquipe', 'Coordenadores de Equipe'],
          ['dirigentes', 'Dirigentes'],
          ['acessos', 'Senha de Acesso'],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setSub(k)} style={{ ...estilos.tabBtn, ...(sub === k ? estilos.tabBtnAtiva : {}), fontSize: 20.3 }}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'servos' && (
        <AbaCadastroPessoas
          titulo="Servos"
          pessoas={encontro.servos}
          campos={CAMPOS_SERVO}
          onSalvar={(p) => onSalvarPessoa('servos', p)}
          onExcluir={(id) => onExcluirPessoa('servos', id)}
          cores={cores}
        />
      )}
      {sub === 'coordenadoresGerais' && (
        <AbaCoordenadores
          servos={encontro.servos}
          coordenadores={encontro.config.coordenadoresGerais}
          onSalvarConfig={onSalvarConfig}
          cores={cores}
        />
      )}
      {sub === 'coordenadoresEquipe' && (
        <AbaCoordenadoresEquipe
          equipes={encontro.equipes}
          servos={encontro.servos}
          onSalvarEquipe={(e) => onSalvarPessoa('equipes', e)}
          cores={cores}
        />
      )}
      {sub === 'dirigentes' && (
        <AbaDirigentes
          servos={encontro.servos}
          dirigentesPorFuncao={encontro.config.dirigentesPorFuncao}
          onSalvarConfig={onSalvarConfig}
          cores={cores}
        />
      )}
      {sub === 'acessos' && (
        <AbaAcessosGerais
          senhaServo={encontro.config.senhaServo}
          senhaTela={encontro.config.senhaTela}
          senhaCoordenadorEquipe={encontro.config.senhaCoordenadorEquipe}
          senhaDirigente={encontro.config.senhaDirigente}
          onSalvarConfig={onSalvarConfig}
          cores={cores}
        />
      )}
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
      <p style={{ fontSize: 19.5, opacity: 0.7 }}>
        Coordenador Geral não é um cadastro separado — é um Servo escolhido pra coordenar este encontro
        como um todo. Marque quem vai coordenar e defina a senha de acesso individual de cada um (essa
        identificação é o que permite mostrar quem emitiu um aviso no telão).
      </p>
      {servos.length === 0 && (
        <p style={{ fontSize: 21.1, opacity: 0.6 }}>Cadastre Servos primeiro (aba Servos) pra poder escolher os coordenadores.</p>
      )}
      <div style={estilos.gridCartoes}>
        {servos.map((s) => {
          const coord = coordenadorDe(s.id);
          return (
            <div key={s.id} style={{ ...estilos.cartaoConfig, background: cores.cartao, margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!coord} onChange={() => alternar(s)} />
                <strong>{s.nome}</strong>
                {s.equipe && <span style={{ fontSize: 19.5, opacity: 0.6 }}>· {s.equipe}</span>}
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
// Equipes), marca quais Servos formam a coordenação dela (normalmente 3-4).
// Não é um cadastro à parte: reaproveita a mesma coleção "equipes", só
// grava num campo próprio (coordenadoresIds) — não mexe em membrosIds.
// Acesso de quem coordena qualquer equipe é uma única senha compartilhada
// (Senha de Acesso), sem identificação individual.
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
      <p style={{ fontSize: 19.5, opacity: 0.7 }}>
        Marque quem coordena cada equipe (normalmente 3-4 Servos). Todo mundo que coordena qualquer equipe
        entra com a mesma senha, compartilhada (aba Senha de Acesso) — não precisa identificar qual pessoa.
      </p>
      {equipes.length === 0 && <p style={{ fontSize: 21.1, opacity: 0.6 }}>Cadastre Equipes primeiro (aba Encontro → Equipes).</p>}
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
                <span style={{ fontSize: 19.5, opacity: 0.6 }}>{coordenadoresIds.length} coordenador(es)</span>
              </div>
              {aberta && (
                <div style={{ ...estilos.listaMembrosSugeridos, marginTop: 10 }}>
                  {servos.length === 0 && <p style={{ fontSize: 19.5, opacity: 0.6, margin: 0 }}>Cadastre Servos primeiro (aba Servos).</p>}
                  {servos.map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 21.1, cursor: 'pointer' }}>
                      <input type="checkbox" checked={coordenadoresIds.includes(s.id)} onChange={() => alternarCoordenador(eq, s.id)} />
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
      <p style={{ fontSize: 19.5, opacity: 0.7 }}>
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
                <span style={{ fontSize: 19.5, opacity: 0.6 }}>{servoIds.length} pessoa(s)</span>
              </div>
              {aberta && (
                <div style={{ ...estilos.listaMembrosSugeridos, marginTop: 10 }}>
                  {servos.length === 0 && <p style={{ fontSize: 19.5, opacity: 0.6, margin: 0 }}>Cadastre Servos primeiro (aba Servos).</p>}
                  {servos.map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 21.1, cursor: 'pointer' }}>
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

function AbaAcessosGerais({ senhaServo, senhaTela, senhaCoordenadorEquipe, senhaDirigente, onSalvarConfig, cores }) {
  const [sServo, setSServo] = useState(senhaServo);
  const [sTela, setSTela] = useState(senhaTela);
  const [sCoordEquipe, setSCoordEquipe] = useState(senhaCoordenadorEquipe);
  const [sDirigente, setSDirigente] = useState(senhaDirigente);
  useEffect(() => setSServo(senhaServo), [senhaServo]);
  useEffect(() => setSTela(senhaTela), [senhaTela]);
  useEffect(() => setSCoordEquipe(senhaCoordenadorEquipe), [senhaCoordenadorEquipe]);
  useEffect(() => setSDirigente(senhaDirigente), [senhaDirigente]);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Senha de Acesso</h3>
      <p style={{ fontSize: 19.5, opacity: 0.7 }}>
        Senhas compartilhadas — não pertencem a uma pessoa específica. (Coordenadores Gerais têm senha
        individual própria, cadastrada na aba Coordenadores Gerais.)
      </p>
      <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
        <label style={estilos.label}>Senha do Servo (compartilhada entre todos os servos)</label>
        <input type="text" value={sServo} onChange={(e) => setSServo(e.target.value)} style={estilos.input} />
        <label style={estilos.label}>Senha do Coordenador de Equipe (compartilhada entre todos)</label>
        <input type="text" value={sCoordEquipe} onChange={(e) => setSCoordEquipe(e.target.value)} style={estilos.input} />
        <label style={estilos.label}>Senha do Dirigente (compartilhada entre todos, acesso completo ao Cadastro Geral)</label>
        <input type="text" value={sDirigente} onChange={(e) => setSDirigente(e.target.value)} style={estilos.input} />
        <label style={estilos.label}>Senha da Tela / Telão (um dispositivo, não uma pessoa)</label>
        <input type="text" value={sTela} onChange={(e) => setSTela(e.target.value)} style={estilos.input} />
      </div>
      <button
        onClick={() => onSalvarConfig({ senhaServo: sServo, senhaTela: sTela, senhaCoordenadorEquipe: sCoordEquipe, senhaDirigente: sDirigente })}
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

function PainelAoVivo(props) {
  const { perfil, encontro, horaAtual, cores, podeEditar } = props;
  const mostrarPainelServos =
    perfil === 'servo' || perfil === 'coordenadorGeral' || perfil === 'coordenadorEquipe' || perfil === 'dirigente';

  const diaAtivo = encontro.cronograma.some((i) => i.dia === horaAtual.dia) ? horaAtual.dia : encontro.cronograma[0]?.dia;
  const [diaSelecionado, setDiaSelecionado] = useState(diaAtivo);
  const itensDia = encontro.cronograma.filter((i) => i.dia === diaSelecionado).sort((a, b) => a.ordem - b.ordem);
  const minAgora = horaAtual.dia === diaSelecionado ? horaAtual.minutos : -1;
  const { atual } = classificarMomentos(itensDia, minAgora);
  const avisosVisiveis = mostrarPainelServos ? encontro.avisos.filter((a) => a.expiraEm > Date.now()) : [];
  const avisoMovimento = mostrarPainelServos ? detectarAvisoMovimentoAtivo(itensDia, minAgora) : null;

  const tarefasDia = useMemo(
    () => tarefasEquipeDoDia(encontro.tarefasEquipe, encontro.capelaMariana, encontro.cronograma, diaSelecionado),
    [encontro.tarefasEquipe, encontro.capelaMariana, encontro.cronograma, diaSelecionado]
  );
  const { atuais: tarefasAtuais, proximas: tarefasProximas } = classificarTarefasEquipe(tarefasDia, minAgora);
  const momentoEncontristasAtivo = mostrarPainelServos && tarefasAtuais.find((t) => ehEquipeEncontristas(t.equipeNome));

  const [editando, setEditando] = useState(null);
  const [textoAviso, setTextoAviso] = useState('');
  const [simInput, setSimInput] = useState(props.horaSimulada || '');

  return (
    <div>
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
      {avisosVisiveis.map((a) => (
        <div key={a.id} style={{ ...estilos.bannerInline, background: a.tipo === 3 ? CORES.dourado : CORES.verde, color: a.tipo === 3 ? CORES.verdeEscuro : '#fff' }}>
          {a.mensagem}
        </div>
      ))}

      {podeEditar && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <label style={{ fontSize: 19.5, opacity: 0.7 }}>Simular data/hora (para testes antes do evento)</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input type="datetime-local" value={simInput} onChange={(e) => setSimInput(e.target.value)} style={{ ...estilos.input, marginBottom: 0, flex: 1 }} />
            <button onClick={() => props.onSetHoraSimulada(simInput)} style={estilos.btnPequeno}>Aplicar</button>
            <button onClick={() => { setSimInput(''); props.onSetHoraSimulada(''); }} style={estilos.btnPequeno}>Real</button>
          </div>
        </div>
      )}

      {podeEditar && (
        <div style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <label style={{ fontSize: 19.5, opacity: 0.7 }}>Enviar aviso manual (aparece por 20s p/ Servos + Coordenadores + Telão)</label>
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
          <button onClick={props.onToggleTema} style={{ ...estilos.btnLink, marginTop: 10 }}>
            Alternar tema ({encontro.config.tema === 'dark' ? 'ativar claro' : 'ativar escuro'})
          </button>
        </div>
      )}

      {/* Lado a lado quando há espaço (computador), empilhado no celular —
          puro CSS grid, sem depender de media query nem JS de largura. */}
      <div style={estilos.gridCronogramas}>
        <div>
          <h3 style={{ marginTop: 20, marginBottom: 8 }}>Cronograma — Encontristas</h3>
          <div>
            {itensDia.map((item) => (
              <LinhaMomentoCelular
                key={item.id}
                item={item}
                destaque={atual && atual.id === item.id}
                cores={cores}
                editavel={podeEditar}
                onEditar={() => setEditando(item)}
              />
            ))}
          </div>
        </div>

        {mostrarPainelServos && (
          <div>
            <h3 style={{ marginTop: 20, marginBottom: 8 }}>Cronograma — Servos</h3>
            {tarefasAtuais.length === 0 && tarefasProximas.length === 0 && (
              <p style={{ fontSize: 21.1, opacity: 0.6 }}>Nenhuma tarefa de equipe cadastrada pra este dia ainda.</p>
            )}
            <div>
              {tarefasAtuais.map((t) => (
                <LinhaTarefaEquipeCelular key={t.id} tarefa={t} destaque cores={cores} />
              ))}
              {tarefasProximas.length > 0 && (
                <div style={{ marginTop: tarefasAtuais.length ? 10 : 0, opacity: 0.55, fontSize: 18.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  A seguir
                </div>
              )}
              {tarefasProximas.map((t) => (
                <LinhaTarefaEquipeCelular key={t.id} tarefa={t} destaque={false} cores={cores} />
              ))}
            </div>
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
  );
}

function LinhaMomentoCelular({ item, destaque, cores, editavel, onEditar }) {
  return (
    <div
      onClick={editavel ? onEditar : undefined}
      style={{
        display: 'flex',
        gap: 12,
        padding: '10px 12px',
        marginBottom: 6,
        borderRadius: 8,
        background: destaque ? `${CORES.dourado}33` : cores.cartao,
        cursor: editavel ? 'pointer' : 'default',
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 600, width: 52 }}>{item.hora}</span>
      <span style={{ flex: 1 }}>{item.movimento}</span>
      <span style={{ fontSize: 19.5, opacity: 0.6 }}>{item.duracaoMin}min</span>
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
        display: 'flex',
        gap: 10,
        padding: '9px 12px',
        marginBottom: 6,
        borderRadius: 8,
        alignItems: 'center',
        borderLeft: `3px solid ${corSelo ? `${corSelo}${destaque || especial ? '' : '77'}` : 'transparent'}`,
        background: especial ? `${CORES.dourado}33` : destaque ? `${CORES.dourado}22` : cores.cartao,
        opacity: destaque ? 1 : 0.75,
      }}
    >
      <span style={{ opacity: 0.7, width: 48, fontSize: 21.1 }}>{tarefa.hora}</span>
      <span style={{ flex: 1, fontSize: 21.9 }}>
        <strong>{especial ? '✨ ' : info ? `${info.icone} ` : ''}{tarefa.equipeNome}</strong>: {info ? info.label : tarefa.tarefa}
      </span>
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
        <p style={{ fontSize: 19.5, opacity: 0.7 }}>
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
function AbaCronograma({ encontro, branding, onSalvarCronogramaItem, onExcluirCronogramaItem, onSalvarPessoa, onExcluirPessoa, cores }) {
  const [diaSelecionado, setDiaSelecionado] = useState(Object.keys(DIAS_LABEL)[0]);
  const itensDia = encontro.cronograma.filter((i) => i.dia === diaSelecionado).sort((a, b) => a.ordem - b.ordem);
  const [novo, setNovo] = useState({ hora: '', duracaoMin: 15, movimento: '' });

  function adicionar() {
    if (!novo.hora || !novo.movimento.trim()) return;
    const maxOrdem = Math.max(0, ...encontro.cronograma.map((i) => i.ordem));
    onSalvarCronogramaItem({
      id: `${diaSelecionado}-${maxOrdem + 1}`,
      dia: diaSelecionado,
      ordem: maxOrdem + 1,
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
        <p style={{ fontSize: 19.5, opacity: 0.65, marginTop: -2 }}>
          Clique num momento pra editar hora/duração e as tarefas de cada equipe naquele momento (é aqui que se
          completam dias com equipes ainda em branco, como o Domingo).
        </p>
        {itensDia.map((item) => (
          <LinhaCronogramaEditavel
            key={item.id}
            item={item}
            equipes={encontro.equipes}
            tarefas={encontro.tarefasEquipe.filter((t) => t.cronogramaItemId === item.id)}
            cores={cores}
            onSalvar={onSalvarCronogramaItem}
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 19.5 }}>
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
        {tarefas.length > 0 && <span style={{ fontSize: 18.7, opacity: 0.55 }}>{tarefas.length} equipe(s)</span>}
        <span style={{ fontSize: 19.5, opacity: 0.6 }}>{item.duracaoMin}min</span>
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
      {tarefas.length === 0 && <p style={{ fontSize: 19.5, opacity: 0.6, margin: '4px 0 10px' }}>Nenhuma equipe com tarefa aqui ainda.</p>}
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
      <strong style={{ fontSize: 19.5, width: 84, flexShrink: 0, marginTop: 9, opacity: 0.85 }}>{tarefa.equipeNome}</strong>
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
const CAMPOS_SERVO = [
  { key: 'nome', label: 'Nome', tipo: 'text' },
  { key: 'equipe', label: 'Equipe atual', tipo: 'text' },
  { key: 'equipesAnteriores', label: 'Equipes em que já atuou (separadas por vírgula)', tipo: 'text' },
  { key: 'contato', label: 'Contato', tipo: 'text' },
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

function AbaCadastroPessoas({ titulo, pessoas, campos, onSalvar, onExcluir, cores }) {
  const [form, setForm] = useState(valoresVazios(campos));
  const [editandoId, setEditandoId] = useState(null);

  function salvarForm() {
    if (!form.nome || !form.nome.trim()) return;
    onSalvar({ id: editandoId || `p-${Date.now()}`, ...form });
    setForm(valoresVazios(campos));
    setEditandoId(null);
  }

  function editar(p) {
    setEditandoId(p.id);
    setForm(campos.reduce((acc, c) => ({ ...acc, [c.key]: p[c.key] ?? (c.tipo === 'checkbox' ? false : '') }), {}));
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{titulo} ({pessoas.length})</h3>
      {pessoas.map((p) => (
        <div key={p.id} onClick={() => editar(p)} style={{ ...estilos.linhaServoCelular, background: cores.cartao, cursor: 'pointer' }}>
          <span style={{ flex: 1 }}>{p.nome}</span>
          <span style={{ fontSize: 19.5, opacity: 0.6 }}>{p.equipe || ''}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onExcluir(p.id); }}
            style={{ ...estilos.btnPequeno, background: CORES.terracota, padding: '4px 8px' }}
          >
            ×
          </button>
        </div>
      ))}
      <div style={{ ...estilos.cartaoConfig, background: cores.cartao, marginTop: 16 }}>
        <h4 style={{ marginTop: 0 }}>{editandoId ? 'Editar' : '+ Novo(a)'} {titulo.slice(0, -1)}</h4>
        {campos.map((c) => (
          <div key={c.key}>
            <label style={estilos.label}>{c.label}</label>
            {c.tipo === 'checkbox' ? (
              <input type="checkbox" checked={!!form[c.key]} onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })} style={{ marginBottom: 12 }} />
            ) : (
              <input
                type={c.tipo}
                value={form[c.key]}
                onChange={(e) => setForm({ ...form, [c.key]: c.tipo === 'number' ? parseInt(e.target.value, 10) || '' : e.target.value })}
                style={estilos.input}
              />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={salvarForm} style={estilos.btnEntrar}>{editandoId ? 'Salvar' : 'Adicionar'}</button>
          {editandoId && (
            <button onClick={() => { setEditandoId(null); setForm(valoresVazios(campos)); }} style={{ ...estilos.btnEntrar, background: '#888' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>
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
    onSalvar({ id: editandoId || `equipe-${Date.now()}`, ...form });
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
      <p style={{ fontSize: 19.5, opacity: 0.7 }}>
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
            <div style={{ fontSize: 19.5, opacity: 0.6, marginTop: 2 }}>{(e.membrosIds || []).length} membro(s)</div>
            {e.observacoes && <div style={{ fontSize: 20.3, opacity: 0.75, marginTop: 4, whiteSpace: 'pre-wrap' }}>{e.observacoes}</div>}
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
          {sugeridos.length === 0 && <p style={{ fontSize: 19.5, opacity: 0.6, margin: 0 }}>Cadastre Servos primeiro (aba Usuários → Servos).</p>}
          {sugeridos.map((s) => {
            const experiente = nomeEquipeLower && (s.equipesAnteriores || '').toLowerCase().includes(nomeEquipeLower);
            return (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 21.1, cursor: 'pointer' }}>
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
          <button key={k} onClick={() => setSub(k)} style={{ ...estilos.tabBtn, ...(sub === k ? estilos.tabBtnAtiva : {}), fontSize: 20.3 }}>
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
      {itens.length === 0 && <p style={{ fontSize: 19.5, opacity: 0.6 }}>Nenhum plantão cadastrado ainda pra {DIAS_LABEL[diaSelecionado]}.</p>}
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
      <p style={{ fontSize: 19.5, opacity: 0.7, marginTop: 0 }}>Escala única — aplicada automaticamente ao Sábado e ao Domingo.</p>
      {itens.length === 0 && <p style={{ fontSize: 19.5, opacity: 0.6 }}>Nenhum plantão cadastrado ainda.</p>}
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
  { key: 'nome', label: 'Nome', tipo: 'text' },
  { key: 'idade', label: 'Idade', tipo: 'number' },
  { key: 'responsavel', label: 'Responsável (se menor)', tipo: 'text' },
  { key: 'sala', label: 'Sala', tipo: 'text' },
  { key: 'contato', label: 'Contato', tipo: 'text' },
  { key: 'restricoes', label: 'Restrições', tipo: 'text' },
  { key: 'camisa', label: 'Camisa', tipo: 'text' },
];

function AbaEncontristas({ encontristas, onSalvarPessoa, onExcluirPessoa, onFinalizarEncontro, cores }) {
  const pendentes = encontristas.filter((p) => (p.status || 'pendente') === 'pendente');
  const aprovados = encontristas.filter((p) => p.status === 'aprovado');
  const rejeitados = encontristas.filter((p) => p.status === 'rejeitado');
  const formados = encontristas.filter((p) => p.status === 'formado');
  const [confirmandoFinal, setConfirmandoFinal] = useState(false);

  const [form, setForm] = useState(valoresVazios(CAMPOS_ENCONTRISTA));
  const [editandoId, setEditandoId] = useState(null);

  function salvarForm() {
    if (!form.nome || !form.nome.trim()) return;
    const existente = encontristas.find((p) => p.id === editandoId);
    onSalvarPessoa({ id: editandoId || `p-${Date.now()}`, ...form, status: existente ? existente.status : 'aprovado' });
    setForm(valoresVazios(CAMPOS_ENCONTRISTA));
    setEditandoId(null);
  }

  function editar(p) {
    setEditandoId(p.id);
    setForm(CAMPOS_ENCONTRISTA.reduce((acc, c) => ({ ...acc, [c.key]: p[c.key] ?? '' }), {}));
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Inscrições pendentes ({pendentes.length})</h3>
      {pendentes.length === 0 && <p style={{ fontSize: 21.1, opacity: 0.6 }}>Nenhuma inscrição pendente no momento.</p>}
      {pendentes.map((p) => (
        <div key={p.id} style={{ ...estilos.cartaoConfig, background: cores.cartao }}>
          <strong>{p.nome}</strong>{p.idade ? ` · ${p.idade} anos` : ''}
          <div style={{ fontSize: 19.5, opacity: 0.75, marginTop: 2 }}>
            {p.contato && <span>{p.contato}</span>}
            {p.responsavel && <span> · Responsável: {p.responsavel}</span>}
          </div>
          {p.restricoes && <div style={{ fontSize: 19.5, opacity: 0.75 }}>Restrições: {p.restricoes}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => onSalvarPessoa({ ...p, status: 'aprovado' })} style={estilos.btnPequeno}>✓ Aprovar</button>
            <button onClick={() => onSalvarPessoa({ ...p, status: 'rejeitado' })} style={{ ...estilos.btnPequeno, background: CORES.terracota }}>✗ Rejeitar</button>
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 24 }}>Confirmados ({aprovados.length})</h3>
      {aprovados.map((p) => (
        <div key={p.id} onClick={() => editar(p)} style={{ ...estilos.linhaServoCelular, background: cores.cartao, cursor: 'pointer' }}>
          <span style={{ flex: 1 }}>{p.nome}</span>
          <span style={{ fontSize: 19.5, opacity: 0.6 }}>{p.sala || ''}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onExcluirPessoa(p.id); }}
            style={{ ...estilos.btnPequeno, background: CORES.terracota, padding: '4px 8px' }}
          >
            ×
          </button>
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
              <p style={{ fontSize: 21.1, marginTop: 0 }}>
                Isso vai criar um registro de Servo pra cada um dos {aprovados.length} Encontristas confirmados
                (base pra convocar no próximo EJC) e movê-los pra "Formados" aqui. Confirma?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { onFinalizarEncontro(); setConfirmandoFinal(false); }}
                  style={{ ...estilos.btnPequeno, background: CORES.terracota }}
                >
                  Sim, encerrar
                </button>
                <button onClick={() => setConfirmandoFinal(false)} style={{ ...estilos.btnPequeno, background: '#888' }}>Cancelar</button>
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
        {CAMPOS_ENCONTRISTA.map((c) => (
          <div key={c.key}>
            <label style={estilos.label}>{c.label}</label>
            <input
              type={c.tipo}
              value={form[c.key]}
              onChange={(e) => setForm({ ...form, [c.key]: c.tipo === 'number' ? parseInt(e.target.value, 10) || '' : e.target.value })}
              style={estilos.input}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={salvarForm} style={estilos.btnEntrar}>{editandoId ? 'Salvar' : 'Adicionar'}</button>
          {editandoId && (
            <button onClick={() => { setEditandoId(null); setForm(valoresVazios(CAMPOS_ENCONTRISTA)); }} style={{ ...estilos.btnEntrar, background: '#888' }}>
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
  seletorTitulo: { fontFamily: "'Playfair Display', serif", color: CORES.dourado, fontSize: 48.8, margin: 0 },
  seletorTituloInstitucional: {
    fontFamily: "'Playfair Display', serif",
    color: CORES.dourado,
    fontSize: 39,
    margin: '0 auto',
    maxWidth: 520,
    lineHeight: 1.3,
  },
  seletorSubtitulo: { fontSize: 21.1, letterSpacing: 1, textTransform: 'uppercase', color: CORES.marfim, opacity: 0.7, marginTop: 10 },
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
  label: { display: 'block', fontSize: 19.5, opacity: 0.7, marginBottom: 4, marginTop: 8 },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 22.8,
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  erro: { color: CORES.terracota, fontSize: 19.5, marginBottom: 10 },
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
  btnLink: { background: 'none', border: 'none', color: CORES.verde, cursor: 'pointer', fontSize: 21.1, width: '100%', textAlign: 'center' },
  btnInscricao: {
    position: 'relative',
    zIndex: 1,
    padding: '15px 30px',
    background: `linear-gradient(135deg, ${CORES.dourado}, #F0D77B)`,
    color: CORES.verdeEscuro,
    border: 'none',
    borderRadius: 32,
    fontWeight: 700,
    fontSize: 24.4,
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
  logoCantoTelao: {
    position: 'fixed',
    bottom: 10,
    left: 14,
    zIndex: 15,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 18.7,
    opacity: 0.55,
    letterSpacing: 0.3,
  },
  telaTituloColuna: { fontFamily: "'Playfair Display', serif", fontSize: 40.6, margin: 0, textTransform: 'uppercase', letterSpacing: 1 },
  hotspotSair: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, zIndex: 10, cursor: 'default' },
  telaoBarraTopo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px 0',
    opacity: 0.85,
  },
  telaoBtnTema: {
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${CORES.dourado}55`,
    color: 'inherit',
    padding: '6px 14px',
    borderRadius: 20,
    cursor: 'pointer',
    fontSize: 21.1,
  },
  bannerContainer: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 },
  banner: { padding: '12px 22px', borderRadius: 8, color: 'white', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.35)', textAlign: 'center' },
  bannerInline: { padding: '10px 14px', borderRadius: 8, color: 'white', fontWeight: 600, marginBottom: 10, fontSize: 22.8 },
  headerCelular: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' },
  btnSairHeader: { background: 'rgba(255,255,255,0.12)', border: `1px solid ${CORES.dourado}55`, color: 'inherit', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 21.1 },
  tabNav: { display: 'flex', overflowX: 'auto', gap: 4, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  tabBtn: { background: 'transparent', border: 'none', color: 'inherit', opacity: 0.6, padding: '8px 10px', cursor: 'pointer', fontSize: 21.1, whiteSpace: 'nowrap', borderRadius: 6 },
  tabBtnAtiva: { opacity: 1, background: 'rgba(212,175,55,0.18)', fontWeight: 600 },
  avisoOffline: { background: '#8B4513', color: 'white', fontSize: 20.3, padding: '8px 16px', textAlign: 'center' },
  seletorDias: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  // auto-fit + minmax: 2 colunas quando cabe (computador), 1 coluna quando
  // não cabe (celular) — sem precisar de media query.
  gridCronogramas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0 32px', alignItems: 'start' },
  // Grid pra listas de cartões (equipes, funções, coordenadores…) — em telas
  // largas (notebook/desktop) preenche várias colunas em vez de empilhar um
  // cartão embaixo do outro deixando metade da tela vazia.
  gridCartoes: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, alignItems: 'start' },
  chipDia: { padding: '6px 12px', borderRadius: 20, border: `1px solid ${CORES.dourado}66`, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 21.1 },
  cartaoConfig: { padding: 14, borderRadius: 10, marginBottom: 14 },
  btnPequeno: { padding: '8px 14px', background: CORES.verde, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 21.1 },
  linhaServoCelular: { display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, marginBottom: 6, fontSize: 21.9 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 },
  modalCaixa: { background: 'white', color: '#222', padding: 24, borderRadius: 10, maxWidth: 380, width: '100%' },
  logoCantoImg: { width: 34, height: 40, objectFit: 'contain', flexShrink: 0 },
  drawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 },
  drawerPainel: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 250,
    maxWidth: '80vw',
    zIndex: 41,
    padding: 20,
    boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
    overflowY: 'auto',
  },
  itemDrawer: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    padding: '12px 10px',
    borderRadius: 8,
    fontSize: 23.6,
    cursor: 'pointer',
    marginBottom: 4,
  },
  itemDrawerAtivo: { background: 'rgba(212,175,55,0.18)', fontWeight: 700, color: CORES.dourado },
  listaMembrosSugeridos: {
    maxHeight: 230,
    overflowY: 'auto',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 8,
    padding: '4px 10px',
    marginBottom: 4,
  },
  badgeNovo: { fontSize: 17.1, background: CORES.verde, color: 'white', padding: '2px 7px', borderRadius: 10, fontWeight: 600 },
  badgeExperiente: { fontSize: 17.1, background: CORES.dourado, color: CORES.verdeEscuro, padding: '2px 7px', borderRadius: 10, fontWeight: 600 },
  thImpressao: { border: '1px solid #999', padding: '4px 6px', textAlign: 'left', background: '#eee' },
  tdImpressao: { border: '1px solid #ccc', padding: '4px 6px' },
};
