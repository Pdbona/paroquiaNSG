# App Coleta de Doações — Guia de Publicação

**Para:** Pablo Bona — SBS Solution  
**Operação:** Coleta de Doações - II Encontro de Jovens com Cristo  
**Meta:** app no ar e rodando no link  

Tempo total estimado: **40 a 60 minutos**, sem conhecimento técnico.  
Custo: **R$ 0,00** — tudo em plano gratuito.

---

## O que você vai ter

Um app que funciona online, onde:

- **Doadores** acessam via link público, veem os itens necessários, escolhem o que querem doar, preenchem seus dados (nome, tel, email, CEP) e confirmam
- **Coordenadores** fazem login com senha, veem as doações da sua equipe, sabem quem doou e quando vão buscar
- **Você (Admin)** controla tudo: cria equipes, coordenadores, importa listas, acompanha o progresso

Tudo sincronizado em tempo real. Quando alguém doa, aparece na tela do coordenador em segundos.

---

## Visão geral das 4 etapas

| Etapa | O que é | Tempo |
|-------|---------|-------|
| 1 | Criar as contas (GitHub e Firebase) | 10 min |
| 2 | Criar o banco de dados | 15 min |
| 3 | Publicar o app e obter o link | 20 min |
| 4 | Teste do link nos celulares | 5 min |

---

# ETAPA 1 — Criar as contas

## 1.1 — Conta no GitHub

O GitHub vai hospedar o app de graça e gerar o endereço que os coordenadores e doadores vão abrir no celular.

1. Acesse **github.com**
2. Clique em **Sign up**
3. Informe e-mail, senha e um nome de usuário
   - sugestão: `sbssolution` ou `pablobona`
   - **anote esse nome**, ele vai aparecer no link do app
4. Confirme o e-mail que o GitHub enviar

## 1.2 — Conta no Firebase

O Firebase é o banco de dados. É do Google — se você já tem Gmail, use a mesma conta.

1. Acesse **firebase.google.com**
2. Clique em **Comece agora** / **Get started**
3. Entre com sua conta Google

---

# ETAPA 2 — Criar o banco de dados

## 2.1 — Criar o projeto

1. No Firebase, clique em **Criar um projeto**
2. Nome: `ejc-doacoes`
3. Google Analytics: **desative** (não precisamos)
4. Clique em **Criar projeto** e aguarde

## 2.2 — Criar o banco

1. No menu lateral, clique em **Criar** > **Firestore Database**
2. Clique em **Criar banco de dados**
3. Local: escolha **southamerica-east1 (São Paulo)**
   - é o mais próximo, deixa o app mais rápido
4. Escolha **Iniciar no modo de teste**
5. Clique em **Ativar**

## 2.3 — Aplicar as regras de segurança

1. Ainda no Firestore, abra a aba **Regras**
2. Apague tudo o que estiver lá
3. Abra o arquivo **REGRAS_FIREBASE.txt** que veio junto
4. Copie o bloco indicado e cole no lugar
5. Clique em **Publicar**

## 2.4 — Pegar a chave de conexão

Esta é a parte que mais gera dúvida. Vá com calma.

1. Clique na **engrenagem** ⚙️ (canto superior esquerdo) > **Configurações do projeto**
2. Role até o fim, na seção **Seus aplicativos**
3. Clique no ícone **`</>`** (Web)
4. Apelido do app: `ejc-doacoes-web`
5. **Não** marque Firebase Hosting
6. Clique em **Registrar app**
7. A tela vai mostrar um bloco de código parecido com isto:

```js
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "ejc-doacoes-abc12.firebaseapp.com",
  projectId: "ejc-doacoes-abc12",
  storageBucket: "ejc-doacoes-abc12.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

8. **Copie esse bloco inteiro.** Você vai colar no próximo passo.

## 2.5 — Colar a chave no app

1. Abra a pasta do app no seu computador
2. Entre em `src` e abra o arquivo **`firebase.js`**
   - use o Bloco de Notas ou qualquer editor de texto
3. Localize o trecho que diz `COLE_AQUI_SUA_API_KEY`
4. **Substitua o bloco inteiro** pelo que você copiou do Firebase
5. Salve o arquivo

> **Atenção ao colar:** mantenha o `const firebaseConfig = {` e o `};`.  
> Troque apenas o miolo, com os valores reais.

---

# ETAPA 3 — Publicar o app

## 3.1 — Enviar os arquivos para o GitHub

1. No GitHub, clique no **+** (canto superior direito) > **New repository**
2. Nome: `ejc-doacoes`
3. Marque **Public**
   - precisa ser público para o site gratuito funcionar
   - isso expõe o *código*, não os *dados* das doações
4. Clique em **Create repository**
5. Na tela seguinte, clique em **uploading an existing file**
6. Arraste **todos os arquivos e pastas** da pasta do app
   - **exceto** a pasta `node_modules`, se ela existir
7. Clique em **Commit changes**

## 3.2 — Ligar a publicação automática

1. No seu repositório, abra a aba **Settings**
2. No menu lateral, clique em **Pages**
3. Em **Source**, selecione **GitHub Actions**
4. Pronto — não precisa configurar mais nada

O arquivo `.github/workflows/deploy.yml` que veio junto já ensina o GitHub a montar e publicar o app sozinho.

## 3.3 — Aguardar a publicação

1. Abra a aba **Actions** do repositório
2. Você verá um processo rodando (bolinha amarela)
3. Em 2 a 4 minutos vira um **✅ verde**
4. Se ficar **❌ vermelho**, veja a seção *Se algo der errado*

## 3.4 — Seu link

O endereço do app será:

```
https://SEU-USUARIO.github.io/ejc-doacoes/
```

Trocando `SEU-USUARIO` pelo nome que você criou na Etapa 1.1.  
Exemplo: `https://sbssolution.github.io/ejc-doacoes/`

**Abra esse link no computador para conferir se o app aparece.**

---

# ETAPA 4 — Instalar nos celulares

O app não vai para a Play Store nem para a App Store. Ele se instala direto pelo navegador e fica com ícone na tela inicial, igual a qualquer outro aplicativo.

## Android (a maioria dos coordenadores)

1. Abrir o link no **Google Chrome**
2. Tocar nos **três pontinhos** ⋮ (canto superior direito)
3. Tocar em **Instalar aplicativo** ou **Adicionar à tela inicial**
4. Confirmar em **Instalar**

Pode aparecer sozinho um aviso na parte de baixo dizendo *"Adicionar Coleta de Doações à tela inicial"* — se aparecer, é só tocar.

## iPhone

1. Abrir o link no **Safari** (precisa ser o Safari)
2. Tocar no botão **Compartilhar** (quadrado com seta para cima)
3. Rolar e tocar em **Adicionar à Tela de Início**
4. Tocar em **Adicionar**

## Como fica

O ícone verde da Paróquia Nossa Senhora de Guadalupe aparece na tela do celular. Ao tocar, o app abre em tela cheia, sem barra de navegador — parece um app comum.

## Mensagem pronta para mandar no WhatsApp

> Pessoal, a partir de [DATA] vamos coordenar as doações pelo app.
>
> 1. Abra este link no celular: **[COLE SEU LINK AQUI]**
> 2. **Coordenadores:** façam login com a senha que passei
> 3. **Doadores:** acessem sem login — é só escolher o item e confirmar
> 4. **iPhone:** use o Safari (não funciona no Chrome)
> 5. Instale na tela inicial para acessar rápido depois
>
> Qualquer dúvida me chama.

---

# Primeiro acesso

Todos usam **o mesmo link**. O que muda é o modo de entrada:

| Quem | Como | O que precisa |
|------|------|----------------|
| Doador | Link público | Sem login |
| Coordenador | Login | Senha individual |
| Você (Pablo) | Login Admin | Senha admin |

## Antes de começar — configure o app

1. Abra o link e entre como **Admin** (PIN inicial: **1234**)
2. Vá em **Configurações**
3. **Troque o PIN do admin** — não deixe 1234
4. **Crie as equipes:** Cozinha, Cafezinho, Limpeza
5. **Crie coordenadores** com nomes e PINs individuais
6. **Importe as listas** de doações (PDF, XLS ou DOC)

> **Por que PIN individual:** o app grava quem registrou cada doação. Se houver dúvida, você sabe com quem conversar.

---

# Como atualizar o app depois

Quando você quiser mudar algo (adicionar equipe, alterar regras, etc), me envie o pedido que eu devolvo o arquivo alterado. Para publicar:

1. Vá ao repositório no GitHub
2. Abra o arquivo que mudou
3. Clique no **lápis** ✏️
4. Cole o conteúdo novo
5. Clique em **Commit changes**

Em 2 a 4 minutos o app atualiza sozinho em todos os celulares.

---

# Se algo der errado

**A tela fica azul e não sai do lugar**  
Chave do Firebase colada errada. Revise o passo 2.5 — normalmente falta uma aspa ou uma vírgula.

**Aparece a faixa vermelha "Erro de conexão"**  
Sem internet ou regras do Firebase não publicadas. Confira o passo 2.3. Enquanto a faixa estiver visível, o registro **não** foi gravado.

**O coordenador lança doação e não aparece para você**  
O app atualiza a cada 20 segundos. Se não aparecer, puxe a tela para baixo ou toque no botão de atualizar.

**Actions ficou vermelho ❌**  
Clique no processo e veja a mensagem. Quase sempre é a pasta `node_modules` enviada por engano — apague-a do repositório.

**Não instala no iPhone**  
Precisa ser o Safari. Chrome no iPhone não oferece a instalação.

**Esqueceu o PIN**  
Me acione. Dá para restaurar pelo painel do Firebase.

---

# Checklist final — antes de começar

- [ ] App abre no link
- [ ] Instalado no seu celular
- [ ] Instalado no celular de cada coordenador
- [ ] PIN do admin trocado (não é mais 1234)
- [ ] Equipes criadas (Cozinha, Cafezinho, Limpeza)
- [ ] Coordenadores cadastrados com PIN individual
- [ ] Listas importadas (itens de cada equipe)
- [ ] **Teste real:** um coordenador registra uma doação e você recebe em tempo real

Esse último item é o que vale. Faça o teste com calma — não no dia do evento com tudo acontecendo.

---

**Dúvida em qualquer ponto, me acione.**

SBS Solution — Consultoria em Lean Manufacturing e Logística
