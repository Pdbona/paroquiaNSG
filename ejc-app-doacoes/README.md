# App Coleta de Doações - EJC

Sistema web de coleta de doações para o II Encontro de Jovens com Cristo da Paróquia Nossa Senhora de Guadalupe.

## 🎯 Funcionalidades

### Visões do Aplicativo
- **🔐 Administrador**: Gerenciar equipes, coordenadores, visualizar relatórios completos
- **👥 Coordenador Geral**: Visualização read-only de todas as equipes
- **👤 Coordenador de Equipe**: Gerenciar sua equipe específica, registrar doações
- **🎁 Doador**: Formulário público para registrar doações sem autenticação

### Recursos
- ✅ Sincronização em tempo real via Firebase
- ✅ Responsivo (mobile, tablet, desktop)
- ✅ PWA (funciona offline, instalável)
- ✅ Integração ViaCEP para busca de endereço
- ✅ Identidade visual personalizada
- ✅ Relatórios de progresso por equipe

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + CSS puro
- **Backend**: Firebase Firestore
- **Autenticação**: Sistema de PIN
- **Deploy**: GitHub Pages
- **CI/CD**: GitHub Actions
- **API Externa**: ViaCEP

## 📋 Pré-requisitos

- Node.js 16+ (baixar em nodejs.org)
- npm ou yarn
- Conta GitHub
- Conta Google (para Firebase)

## ⚙️ Configuração Inicial

### 1. Clonar o repositório

```bash
git clone https://github.com/SEU-USUARIO/ejc-doacoes.git
cd ejc-doacoes
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env.local

# Editar .env.local com suas chaves do Firebase
nano .env.local
```

### 4. Iniciar servidor de desenvolvimento

```bash
npm start
```

O app abrirá em `http://localhost:3000`

## 🚀 Deployment

### No GitHub Pages

1. **Fazer push para GitHub**
   ```bash
   git add .
   git commit -m "Deploy inicial"
   git push origin main
   ```

2. **Ativar GitHub Actions**
   - Ir em Settings → Pages
   - Selecionar Source: GitHub Actions
   - Aguardar deployment

3. **Acessar o app**
   ```
   https://SEU-USUARIO.github.io/ejc-doacoes/
   ```

## 📁 Estrutura de Pastas

```
ejc-doacoes/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── LoginView.jsx
│   │   ├── AdminPanel.jsx
│   │   ├── CoordinatorGeneralDashboard.jsx
│   │   ├── CoordinatorTeamDashboard.jsx
│   │   └── DonorForm.jsx
│   ├── styles/
│   │   ├── LoginView.css
│   │   ├── AdminPanel.css
│   │   └── DonorForm.css
│   ├── App.jsx
│   ├── App.css
│   ├── firebase.js
│   ├── index.js
│   └── index.css
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔐 Segurança

### Variáveis de Ambiente
- **Nunca** commite `.env.local` no Git
- Use `.env.example` como template
- Chaves sensíveis ficam seguras no GitHub Secrets (para CI/CD)

### Regras Firestore
- Todos os acessos utilizam regras de segurança restritivas
- Doadores só podem escrever, não ler dados de outras doações
- Coordenadores têm acesso apenas à sua equipe

## 📱 Instalação nos Celulares

### Android (Chrome)
1. Abrir app no navegador
2. Menu ⋮ → Instalar aplicativo
3. Confirmar

### iPhone (Safari)
1. Abrir app no Safari
2. Botão Compartilhar → Adicionar à Tela de Início
3. Confirmar

## 🔄 Atualizar Código

Para fazer alterações e atualizar o app:

1. **Editar arquivo localmente**
2. **Commitar e fazer push**
   ```bash
   git add arquivo-editado.jsx
   git commit -m "Descrição da mudança"
   git push origin main
   ```
3. **GitHub Actions faz deploy automaticamente**
   - Verificar em Actions aba
   - Em 2-4 minutos, app atualiza para todos os usuários

## 🆘 Troubleshooting

### Erro: "Firebase não está configurado"
- Verificar se `.env.local` existe na raiz do projeto
- Confirmar se variáveis têm valores corretos
- Reiniciar servidor (`npm start`)

### Erro: "Chave Firebase colada errada"
- Abrir `src/firebase.js`
- Verificar bloco `const firebaseConfig = { ... }`
- Garantir que não há quebras de linha ou comentários no meio
- Reiniciar servidor

### App abre mas fica azul/branco
- Abrir console do navegador (F12)
- Procurar por erros vermelhos
- Verificar conexão com internet
- Limpar cache: Ctrl+Shift+Delete

### Não instala no iPhone
- Deve ser Safari, não Chrome
- iPhone precisa iOS 11.3+

## 📊 Estrutura Firebase

### Collections

**equipes**
```json
{
  "nome": "Cozinha",
  "criada_em": "2024-08-15",
  "ativa": true
}
```

**itens**
```json
{
  "nome": "Arroz 5kg",
  "quantidade": 10,
  "equipe_id": "...",
  "criado_em": "2024-08-15"
}
```

**doacoes**
```json
{
  "item_id": "...",
  "item_nome": "Arroz 5kg",
  "quantidade": 2,
  "equipe_id": "...",
  "doador_nome": "João Silva",
  "doador_email": "joao@email.com",
  "doador_telefone": "(11) 98765-4321",
  "doador_cep": "01310100",
  "doador_endereco": "Av Paulista",
  "doador_cidade": "São Paulo",
  "doador_estado": "SP",
  "data_criacao": "2024-08-15",
  "entregue": false
}
```

## 🎨 Identidade Visual

### Cores
- Verde Profundo: `#1B5E3F`
- Dourado: `#D4AF37`
- Terracota: `#8B4513`
- Marfim: `#FFFFF0`

### Tipografia
- Títulos: Playfair Display
- Corpo: Roboto

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar a documentação de usuário (INSTRUCOES.md)
2. Contatar administrador do projeto

## 📄 Licença

Desenvolvido pela SBS Solution para uso interno.

---

**Versão**: 1.0.0  
**Última atualização**: Agosto 2024
