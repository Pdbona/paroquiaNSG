# _EVOLUCAO.md — ejc-app-doacoes

Histórico de decisões do app, para quem (Pablo ou outra sessão do Claude)
precisar entender "por que está assim" sem reconstruir o raciocínio do zero.

## O que é

App de coleta de doações para o **II Encontro de Jovens com Cristo**, Paróquia
Nossa Senhora de Guadalupe. Doadores registram doações de itens por um link
público sem login; coordenadores de equipe (Cozinha, Cafezinho, Limpeza etc.)
acompanham e confirmam entrega; o admin gerencia equipes, coordenadores e vê
relatório geral. Login por PIN (não é Firebase Auth de verdade — ver seção
"Limitações conhecidas" abaixo).

## Linha do tempo

1. **Construção inicial** (commits `895cdb9` a `bfafb21`, ago/2026) — app
   completo com 4 visões (Admin, Coordenador Geral, Coordenador de Equipe,
   Doador), Firestore com onSnapshot em tempo real, PWA instalável, rateio
   automático de doações entre equipes que pedem o mesmo item, PIN com hash
   SHA-256, modo mock para rodar localmente sem credenciais. Já seguia o
   essencial do padrão SBS: sem `window.storage`, `firebase` em
   `dependencies`, App.jsx enxuto.

2. **Reestruturação para monorepo** (esta sessão, 11/ago/2026) — Pablo já
   tinha criado o repositório GitHub `paroquiaNSG` e o projeto Firebase
   `paroquiansg-2f648` com a intenção de reaproveitar os dois para **mais de
   um app do EJC**. Isso exigiu três mudanças estruturais:

   - **Monorepo**: todo o código do app moveu de `/` para `/ejc-app-doacoes/`
     dentro do repo `paroquiaNSG`. O workflow do GitHub Actions
     (`.github/workflows/deploy.yml`, na raiz do repo — Actions só lê
     workflows ali) ganhou `paths: ['ejc-app-doacoes/**']` pra só disparar
     quando este app muda, `working-directory: ejc-app-doacoes` nos steps de
     build, e `destination_dir: ejc-app-doacoes` + `keep_files: true` no
     deploy pro GitHub Pages — assim o próximo app do EJC pode publicar na
     mesma branch `gh-pages`, em outra subpasta, sem apagar este.

   - **Firestore namespaced**: o projeto Firebase é compartilhado. Pra dados
     de apps diferentes não colidirem no mesmo banco, todas as collections
     deste app passaram de `equipes`, `itens`, `doacoes`, `coordenadores` (na
     raiz) para `apps/doacoes/equipes`, `apps/doacoes/itens` etc. Só o
     caminho mudou — nome das collections e todos os campos continuam iguais.
     Ver `src/services/db.js` (função `caminhoColecao`) e
     `REGRAS_FIREBASE.txt`.

   - **`CI: false` no workflow**: a versão anterior do `deploy.yml` não tinha
     essa variável no step de build. Sem ela, o GitHub Actions (que seta
     `CI=true` sozinho) trata qualquer warning do ESLint como erro e quebra o
     build — um dos erros críticos já mapeados no padrão SBS. Corrigido nesta
     sessão.

   - **Firebase reaproveitado**: o projeto `paroquiansg-2f648` já tinha um
     Firestore (default) vazio e um app Web registrado (`paroquiaNSG`) — as
     credenciais desse app Web foram reaproveitadas para este app (não é
     preciso registrar um segundo app Web só para mudar o `projectId`, já que
     o isolamento de dados agora é feito pelo caminho `apps/doacoes/...`).
     Havia também regras antigas de teste (`allow read, write: if true` na
     raiz, cobrindo `equipes/itens/doacoes/usuarios/distribuicao_automatica`)
     — confirmado que o banco estava **vazio** (nenhum documento) antes de
     substituí-las, então não havia dado de produção em risco.
     Autenticação anônima foi ativada (Authentication > Sign-in method) para
     habilitar o Bloco A das regras (o mais seguro — esconde dados dos
     doadores de quem não usa o app).

## Decisões que ficam valendo pro próximo app do EJC

Se/quando o próximo app do EJC for criado neste mesmo repositório e projeto
Firebase, seguir o mesmo padrão:

- Nova subpasta em `paroquiaNSG/`, ex: `paroquiaNSG/ejc-app-<nome>/`.
- Novo workflow `.github/workflows/deploy-<nome>.yml` com seu próprio
  `paths` e `destination_dir` (não reaproveitar o `deploy.yml` deste app).
- Collections do novo app sob `apps/<nome>/...` no mesmo Firestore.
- Regras do novo app **adicionadas** ao arquivo de regras do Firestore num
  bloco `match /apps/<nome>/...` à parte — nunca substituindo o bloco
  `apps/doacoes/...` deste app.
- Pode reaproveitar o mesmo app Web registrado no Firebase (mesmo
  `firebaseConfig`) — o isolamento é pelo caminho das collections, não pelo
  app Web.

## Limitações conhecidas (aceitas para o escopo do evento)

- Não há Firebase Auth de verdade — o "login" por PIN acontece no navegador.
  Quem souber mexer no console do navegador consegue escrever no banco sem
  PIN. As regras publicadas reduzem o estrago (validam formato, impedem
  apagar doações, congelam tudo depois de 30/09/2026) mas não impedem isso.
  Ver `REGRAS_FIREBASE.txt`, seção "O que estas regras não resolvem".
- PIN de 4 a 6 dígitos é resistente a bisbilhotice casual, não a um ataque
  de força bruta dedicado.
- Depois do evento: trocar a data de `dentroDoPrazo()` nas regras publicadas
  para uma data passada (deixa o banco só leitura) e exportar os dados
  (Firestore > Exportar) antes de desligar qualquer coisa.

## Links

- Repositório: https://github.com/Pdbona/paroquiaNSG
- App publicado: https://pdbona.github.io/paroquiaNSG/ejc-app-doacoes/
- Firebase Console: https://console.firebase.google.com/project/paroquiansg-2f648/overview
- Firestore (dados): https://console.firebase.google.com/project/paroquiansg-2f648/firestore/databases/-default-/data
