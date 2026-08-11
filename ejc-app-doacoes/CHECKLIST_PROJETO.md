# ✅ Checklist Completo do Projeto

## 📦 Arquivos Criados (Verificar se tem tudo)

### Configuração e Dependências
- [x] `package.json` — Dependências do projeto
- [x] `.env.example` — Template de variáveis
- [x] `.gitignore` — Arquivos a ignorar no Git
- [x] `README.md` — Documentação técnica

### Código Principal
- [x] `src/index.js` — Ponto de entrada
- [x] `src/index.css` — Estilos globais
- [x] `src/App.jsx` — Componente principal
- [x] `src/App.css` — Estilos do App
- [x] `src/firebase.js` — Configuração Firebase

### Componentes
- [x] `src/components/LoginView.jsx` — Tela de login
- [x] `src/components/AdminPanel.jsx` — Painel admin
- [x] `src/components/CoordinatorGeneralDashboard.jsx` — Dashboard coord. geral
- [x] `src/components/CoordinatorTeamDashboard.jsx` — Dashboard coord. equipe
- [x] `src/components/DonorForm.jsx` — Formulário doador

### Estilos dos Componentes
- [x] `src/styles/LoginView.css`
- [x] `src/styles/AdminPanel.css`
- [x] `src/styles/DonorForm.css`

### Arquivos Públicos (PWA)
- [x] `public/index.html` — Página principal
- [x] `public/manifest.json` — Configuração PWA

### CI/CD
- [x] `.github/workflows/deploy.yml` — GitHub Actions

### Configuração Firebase
- [x] `REGRAS_FIREBASE.txt` — Regras Firestore para colar

### Documentação
- [x] `INSTRUCOES_COLETA_DOACOES.md` — Guia do usuário (já fornecido)
- [x] `COMO_ENVIAR_GITHUB.txt` — Como colocar no GitHub
- [x] `CHECKLIST_PROJETO.md` — Este arquivo

---

## 🚀 Sequência de Ações

### ✅ JÁ FEITO
- [x] Estrutura React criada
- [x] 4 visões implementadas (Admin, CoordGeral, CoordEquipe, Doador)
- [x] Firebase integration pronto
- [x] Estilos completos (cores, responsive, PWA)
- [x] GitHub Actions CI/CD configurado
- [x] Documentação técnica

### ⏳ PRÓXIMAS AÇÕES (você faz)

1. **Passo 1:** Substituir código firebase.js e criar .env.local
   ```
   ✓ Código corrigido já fornecido acima
   ✓ Template .env.example já criado
   ```

2. **Passo 2:** Criar conta GitHub + Firebase
   ```
   → github.com (Sign up)
   → firebase.google.com (Criar projeto)
   ```

3. **Passo 3:** Configurar Firebase Firestore
   ```
   → Criar banco em southamerica-east1
   → Colar regras de REGRAS_FIREBASE.txt
   → Copiar chaves para .env.local
   ```

4. **Passo 4:** Enviar arquivos para GitHub
   ```
   → Seguir COMO_ENVIAR_GITHUB.txt
   → Upload de todos os arquivos
   → Ou usar Git na linha de comando
   ```

5. **Passo 5:** Ativar GitHub Pages
   ```
   → Settings → Pages
   → Source: GitHub Actions
   → Esperar 2-4 min
   ```

6. **Passo 6:** Testar e instalar nos celulares
   ```
   → Abrir link: https://SEU-USUARIO.github.io/ejc-doacoes/
   → Instalar no Android: Chrome → ⋮ → Instalar
   → Instalar no iPhone: Safari → Compartilhar → Tela Inicial
   ```

---

## 🔐 Segurança - Checklist

- [ ] Criar arquivo `.env.local` (cópia de .env.example)
- [ ] Preencher `.env.local` com chaves do Firebase
- [ ] Verificar que `.env.local` está no `.gitignore`
- [ ] **NUNCA** fazer commit de `.env.local`
- [ ] Trocar PIN admin de "1234" para outro
- [ ] Criar PINs individuais para cada coordenador

---

## 📱 Testes - Checklist

Antes de usar com doadores reais:

- [ ] App abre no link
- [ ] Login funciona (Admin, Coord Geral, Coord Equipe)
- [ ] Sem login funciona (Doador)
- [ ] Criar equipe (Admin)
- [ ] Adicionar item (Coord Equipe)
- [ ] Registrar doação (Doador)
- [ ] Ver doação no dashboard (Coord Equipe)
- [ ] Marcar entregue funciona
- [ ] Instala no Android
- [ ] Instala no iPhone
- [ ] Funciona offline (PWA)

---

## 📊 Estrutura de Dados Firebase

Collections que serão criadas automaticamente:

```
Firestore Database
├── equipes/
│   └── {equipaId}
│       ├── nome: string
│       ├── criada_em: timestamp
│       └── ativa: boolean
│
├── itens/
│   └── {itemId}
│       ├── nome: string
│       ├── quantidade: number
│       ├── equipe_id: string
│       └── criado_em: timestamp
│
├── doacoes/
│   └── {doacaoId}
│       ├── item_id: string
│       ├── item_nome: string
│       ├── quantidade: number
│       ├── equipe_id: string
│       ├── doador_nome: string
│       ├── doador_email: string
│       ├── doador_telefone: string
│       ├── doador_cep: string
│       ├── doador_endereco: string
│       ├── doador_cidade: string
│       ├── doador_estado: string
│       ├── data_criacao: timestamp
│       └── entregue: boolean
│
└── coordenadores/
    └── {coordId}
        ├── nome: string
        ├── criado_em: timestamp
        └── ativo: boolean
```

---

## 🎨 Cores Utilizadas

- Verde Profundo: `#1B5E3F` (primária)
- Dourado: `#D4AF37` (destaque)
- Terracota: `#8B4513` (secundária)
- Marfim: `#FFFFF0` (fundo claro)

---

## 🔗 Links Importantes

- GitHub: https://github.com (criar repo)
- Firebase: https://firebase.google.com (criar projeto)
- ViaCEP: https://viacep.com.br (busca de CEP - já integrado)

---

## 📞 Resumo Final

**Status do Projeto:** ✅ 99% Pronto

O que falta é apenas:
1. Suas contas criadas (GitHub + Firebase)
2. Dados do Firebase no .env.local
3. Upload para GitHub
4. Ativação de GitHub Pages

**Tempo estimado:** 40-60 minutos

---

**Gerado em:** Agosto 2026  
**Para:** Pablo Bona — SBS Solution  
**Projeto:** II Encontro de Jovens com Cristo
