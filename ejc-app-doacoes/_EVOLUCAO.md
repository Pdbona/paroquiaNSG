# _EVOLUCAO.md — ejc-app-doacoes

Histórico de decisões do app, para quem (Pablo ou outra sessão do Claude)
precisar entender "por que está assim" sem reconstruir o raciocínio do zero.

**Status:** ✅ no ar em 11/ago/2026 — https://pdbona.github.io/paroquiaNSG/ejc-app-doacoes/

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

   - **Dois problemas de primeiro deploy, já corrigidos**:
     1. `package-lock.json` nunca tinha sido commitado (só existia numa cópia
        local usada pra validar o build fora do Google Drive — ver nota
        abaixo). O `actions/setup-node` falhava logo no início com "Some
        specified paths were not resolved, unable to cache dependencies".
     2. O `GITHUB_TOKEN` automático do Actions estava com permissão só
        leitura (padrão do GitHub para repositórios novos). O último passo
        (`peaceiris/actions-gh-pages`, que faz `git push` pra branch
        `gh-pages`) falhava com "the process '/usr/bin/git' failed with exit
        code 128". Corrigido em Settings > Actions > General > Workflow
        permissions > "Read and write permissions".

   - **Nota sobre `npm install` nesta pasta**: como o projeto vive dentro do
     Google Drive (sincronização em nuvem), `npm install` local aqui costuma
     falhar com erros `EBADF`/`EPERM` — o cliente do Drive brinca de travar
     arquivos no meio da escrita do `node_modules`. Não afeta o deploy real
     (o GitHub Actions instala num runner limpo, sem Drive no meio); só
     afeta quem tentar rodar `npm start` localmente nesta pasta. Se precisar
     testar localmente, copie a pasta para fora do Drive antes de instalar.

3. **PIN em texto puro + importação de itens em lote** (11/ago/2026, mesmo dia
   do primeiro deploy):

   - **PIN visível pro Admin**: decisão explícita do Pablo, com o risco
     explicado antes de implementar (ver pergunta/resposta na conversa). O
     campo `pin` da collection `coordenadores` passou a ser gravado em texto
     puro (`services/auth.js`) em vez do hash SHA-256 anterior (`pin_hash`).
     O Admin vê o PIN de cada coordenador na aba Coordenadores. **Trade-off
     aceito conscientemente**: como essa collection é de leitura pública
     (necessário pra tela de login listar nomes antes de autenticar),
     qualquer pessoa que abrir o console do navegador também lê todos os
     PINs — não é só o Admin que ganhou visibilidade, foi removida a única
     proteção que existia. `pinConfere` ainda aceita o formato antigo
     (`pin_hash`) por compatibilidade, mas nada mais grava nesse formato.

   - **Importar lista de itens**: novo componente
     `src/components/ImportarItensModal.jsx`, usado tanto pelo Coordenador de
     Equipe (`CoordinatorTeamDashboard`, equipe travada na dele) quanto pelo
     Admin (`AdminPanel`, nova aba "📦 Itens", escolhe a equipe de destino).
     Cola-se uma lista (uma linha por item: `Nome, Quantidade, Unidade`,
     aceita vírgula ou tab — dá pra colar direto de uma coluna do
     Excel/Planilhas) ou carrega-se um arquivo `.csv`/`.txt`. Antes de
     gravar, mostra uma prévia com cada linha marcada como Ok, Duplicada
     (já existe na equipe, ou repetida dentro da própria lista) ou Inválida
     (sem nome, ou quantidade não numérica), e só grava as linhas marcadas.
     Não faz parsing de PDF/DOC (como o `INSTRUCOES_COLETA_DOACOES.md`
     original cogitava) — decisão deliberada: extrair texto de PDF/DOC de
     forma confiável no navegador exigiria bibliotecas pesadas (pdf.js,
     mammoth) e ainda assim não lida bem com tabelas; CSV/TXT colado cobre o
     caso real ("parei de cadastrar um por um") sem essa fragilidade.

4. **Doador com "permissão negada" ao registrar doação** (13/ago/2026):
   coordenador relatou o erro tentando doar Farinha de mandioca (2kg) pra
   Cozinha. Investigação (Firebase Console, com a extensão Claude in Chrome):
   Authentication > Anônimo ativado ✅, regras publicadas batendo com o BLOCO
   A do `REGRAS_FIREBASE.txt` ✅, e o item "Farinha de mandioca" com `nome` e
   `quantidade` válidos no Firestore ✅ — nenhuma das causas óbvias. Sobrou o
   comportamento do próprio app: `garantirSessaoAnonima()` (`services/auth.js`)
   roda em segundo plano no carregamento e, se falhar (comum em navegadores
   internos de app — WhatsApp, Instagram —, que bloqueiam o armazenamento que
   o Firebase Auth usa), o app segue funcionando normalmente até a gravação
   cair em "permissão negada" sem chance de recuperação. Corrigido em
   `DonorForm.jsx` (`confirmarDoacao`): tenta `garantirSessaoAnonima()` de
   novo bem antes de gravar (não só no carregamento), e se ainda assim vier
   `permission-denied`, mostra um aviso que o doador consegue agir ("abra
   este link no Chrome/Safari, não no navegador do WhatsApp") em vez da
   mensagem técnica de `mensagemDeErro` (`services/db.js`), que é escrita pro
   Admin conferir o Firebase Console — confusa pra quem só está doando.

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
- App publicado (4 opções — Admin/Coord. Geral/Coord. Equipe/Doador): https://pdbona.github.io/paroquiaNSG/ejc-app-doacoes/
- **Link exclusivo do doador** (cai direto no formulário, sem tela de escolha): https://pdbona.github.io/paroquiaNSG/doacao_ejc_pnguadalupe/
- Firebase Console: https://console.firebase.google.com/project/paroquiansg-2f648/overview
- Firestore (dados): https://console.firebase.google.com/project/paroquiansg-2f648/firestore/databases/-default-/data

### Como funciona o link exclusivo do doador

`doacao_ejc_pnguadalupe/index.html` é uma página estática de redirecionamento
(meta refresh + JS) publicada manualmente na branch `gh-pages`, na raiz do
repo (fora da subpasta `ejc-app-doacoes/` que o GitHub Actions gerencia) —
por isso não precisou mexer no workflow. Ela manda pra
`ejc-app-doacoes/?doador`; o parâmetro `?doador` é lido por `App.jsx`
(função `telaInicial`) e pula a tela de login, abrindo já no formulário.

Existe uma cópia-fonte deste arquivo na branch `main`
(`doacao_ejc_pnguadalupe/index.html`, na raiz do repo) só como documentação
— o arquivo que o navegador carrega de fato é o publicado direto na
`gh-pages`. Se precisar mudar o destino do redirecionamento, edite os dois
(ou publique de novo na gh-pages com `git worktree`, do jeito que foi feito
aqui: `git fetch origin gh-pages`, `git worktree add <pasta> gh-pages`,
edita, commit, `git push origin gh-pages` — sem tocar em `ejc-app-doacoes/`
pra não conflitar com o próximo deploy do Actions).
