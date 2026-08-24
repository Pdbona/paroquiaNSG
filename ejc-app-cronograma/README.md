# EJC App v2 — Encontro de Jovens com Cristo

Aplicação web (React + Firebase Firestore) para gerenciar o cronograma ao vivo do
**II Encontro de Jovens com Cristo — Paróquia Nossa Senhora de Guadalupe**, 28 a 30
de agosto de 2026.

Faz parte do monorepo [`paroquiaNSG`](https://github.com/Pdbona/paroquiaNSG),
junto com o `ejc-app-doacoes` (coleta de doações) — mesmo repositório GitHub,
mesmo projeto Firebase, cada app na sua subpasta.

## 📋 Estrutura do Projeto

```
ejc-app-cronograma/
├── src/
│   ├── components/EJCApp.jsx   # componente único: login, telão, celular, cadastro
│   ├── firebase.js             # config do Firestore (via variáveis de ambiente)
│   ├── App.jsx / App.css / index.js / index.css
├── public/index.html
└── REGRAS_FIREBASE.txt         # bloco de regras deste app (soma às do ejc-app-doacoes)
```
(As pastas de projeto — proposta, dados do cliente, gemba, cotações, entregáveis —
ficam fora do repositório, em `APP_PNdG/APP_EJC/` no ambiente local do Pablo.)

O workflow de deploy (`deploy-cronograma.yml`) mora na raiz do monorepo, junto
com o `deploy.yml` do app de Doações — ver `../.github/workflows/`.

## 🚀 Quick Start (local)

```bash
npm install
npm start
```
Abre em `http://localhost:3000`. Sem `.env.local`, o app funciona só localmente
nesta sessão (mostra o aviso "Firebase ainda não configurado") — os dados não
persistem entre recarregamentos.

## 🔥 1. Firebase — projeto compartilhado, já configurado

Este app reaproveita o **mesmo projeto e o mesmo app Web** já registrados pro
`ejc-app-doacoes` (`paroquiansg-2f648`, app Web `paroquiaNSG`) — não é preciso
criar projeto nem registrar app novo. Só isolamento de dados por caminho:
tudo deste app mora em `apps/cronograma/eventos/{id}` (ver `DOC_PATH` em
`EJCApp.jsx`), enquanto o de Doações mora em `apps/doacoes/...`.

1. Copiar `.env.example` para `.env.local` e preencher as 6 variáveis com o
   `firebaseConfig` do app Web `paroquiaNSG` (Firebase Console → Configurações
   do projeto → Geral → Seus apps).
2. Regras do Firestore — **somar** (nunca substituir) o bloco deste app às
   regras que já existem lá pro `ejc-app-doacoes`. Texto exato e explicação em
   [REGRAS_FIREBASE.txt](REGRAS_FIREBASE.txt).

⚠️ Regras abertas pra este app — qualquer um com a URL lê/escreve o cronograma.
Aceitável porque é ferramenta interna de um único evento, sem dado pessoal
sensível (diferente do app de Doações, que guarda dado de doador).

## 📦 2. Deploy (GitHub Pages)

O workflow `../.github/workflows/deploy-cronograma.yml` builda com `CI: false`
e injeta as mesmas 6 variáveis do Firebase via **Settings → Secrets and
variables → Actions** do repositório `paroquiaNSG` — os secrets já existem lá
(usados pelo `ejc-app-doacoes`) e servem pra este app também, mesmo projeto
Firebase. Só dispara quando algo muda em `ejc-app-cronograma/**`, e publica em
`gh-pages` dentro da própria subpasta, sem apagar o app de Doações publicado
no mesmo branch.

```bash
git add ejc-app-cronograma .github/workflows/deploy-cronograma.yml
git commit -m "Adiciona ejc-app-cronograma ao monorepo"
git push
```
URL final: `https://pdbona.github.io/paroquiaNSG/ejc-app-cronograma/`

## 👥 Acesso — uma senha só, o papel é definido pela senha digitada

Não existe mais seleção de perfil por botão. A tela de login pede **uma única
"Senha de Acesso"**; o sistema reconhece automaticamente quem está entrando:

| Quem digita | Tipo de senha | O que vê/pode fazer |
|---|---|---|
| **Servo** | Compartilhada (uma só pra todo o time) | Cronograma de encontristas + servos + avisos/banners. Só leitura. |
| **Tela / Telão** | Compartilhada (é um dispositivo, não uma pessoa) | Split-screen dos dois cronogramas, sem cabeçalho/controles. Hotspot invisível no canto inferior direito pra sair. |
| **Coordenador** | Individual por pessoa | Só a tela "Ao Vivo": edita nome/duração de qualquer momento (cascata automática + aviso de atraso/adiantamento), envia avisos manuais, alterna tema, simula data/hora pra testar. |
| **Dirigente** | Individual por pessoa | Abas Cronograma/Servos/Encontristas (CRUD completo) + Config (troca as senhas de Servo/Tela/Coordenadores/Dirigentes) + Ao Vivo somente leitura. |

Senhas de demonstração (trocar antes do evento real, em Dirigente → Config):
`servo`, `tela`, coordenadores `coord1`–`coord4`, dirigentes `dirigente1`/`dirigente2`.

Para testar o comportamento por horário antes do evento, o Coordenador tem um
campo "Simular data/hora" (ou usar `?sim=2026-08-28T20:50` na URL).

## 🙋 Encontrista — inscrição pública, sem acesso ao sistema

O participante **não loga em lugar nenhum**. Na tela de login há um link
"Quer participar do encontro? Inscreva-se aqui" que abre um formulário público
(nome, idade, responsável, contato, restrições, camisa) — ao enviar, cria uma
inscrição com status `pendente`. O Dirigente aprova ou rejeita em
Cadastro → Encontristas; só depois de aprovado o registro conta como
confirmado. Servos também podem ser cadastrados manualmente ali pelo Dirigente
(sem fila de aprovação, é cadastro direto de equipe).

## ✅ Status desta versão (v2)

- [x] 3 perfis + Modo Tela, cronograma dos 3 dias (28-30/08) já carregado da
      planilha oficial
- [x] Edição de momento com cascata automática + banner de atraso/adiantamento
- [x] Banner automático de "Movimento" (detecta nome contendo "Movimentação")
- [x] Aviso manual do coordenador (20s) + tema dark/light sincronizado
      (Coordenador alterna pelo celular; o próprio telão também tem um botão
      próprio, já que passa por diferentes níveis de luz ao longo do evento)
- [x] Marca d'água de Nossa Senhora aplicada (telão + Cadastro do Dirigente)
- [x] Timeline de tarefas por equipe (Cadastro → Cronograma) — cada momento
      pode ter várias equipes com tarefas independentes, carregadas da
      planilha oficial pras abas Sexta e Sábado (Domingo ainda em branco,
      completar pelo Cadastro)
- [x] Escalas de Vigília, Capela Mariana (aplicada automaticamente a Sábado e
      Domingo) e Almoço/Jantar — timeline própria, independente do horário do
      encontrista, com CRUD em Cadastro → Escalas
- [x] Telão com seletor de dia (igual às demais telas) + destaque especial
      pro momento dos Encontristas na Capela Mariana
- [x] Cadastro de Cronograma / Equipes / Escalas / Servos / Encontristas (CRUD)
- [x] Persistência em tempo real via Firestore (`onSnapshot`)
- [ ] Senhas individuais reais dos 4 coordenadores
- [ ] Projeto Firebase criado (ver seção 1 acima)

## 🎨 Identidade Visual

- Verde profundo `#1B5E3F` · Dourado `#D4AF37` · Terracota `#8B4513` · Marfim `#FFFFF0`
- Tipografia: Playfair Display (títulos), Roboto (corpo)

## 👤 Autor

**Pablo Bona** — SBS Solution

---
**Versão**: 2.0.0 — Agosto 2026
