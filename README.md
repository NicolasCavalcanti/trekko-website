# 🏔️ Trekko - Plataforma de Trekking do Brasil

[![Deploy Status](https://img.shields.io/badge/deploy-active-brightgreen)](https://www.trekko.com.br)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)](package.json)

## 📋 Sobre o Projeto

O **Trekko** é a maior plataforma de trekking do Brasil, conectando aventureiros a guias especializados e trilhas incríveis por todo o país. Nossa missão é democratizar o acesso às belezas naturais brasileiras através de experiências seguras e inesquecíveis.

### ✨ Funcionalidades Principais

- 🏔️ **Catálogo de Trilhas** - Mais de 20 trilhas com imagens reais e informações detalhadas
- 👨‍🦯 **Rede de Guias** - Guias certificados pelo CADASTUR
- ⭐ **Sistema de Avaliações** - Reviews e recomendações da comunidade
- 📱 **Interface Responsiva** - Experiência otimizada para mobile e desktop
- 🔍 **Busca Avançada** - Filtros por estado, cidade, dificuldade e duração
- 💰 **Sistema de Comissões** - Regras de negócio robustas para pagamentos
- 📊 **Painel Administrativo** - Métricas e simuladores para gestão

## 🚀 Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Framework CSS:** Tailwind CSS
- **APIs:** Integração com CADASTUR (Ministério do Turismo)
- **Analytics:** Google Analytics 4 (G-S816P190VN)
- **Monetização:** Google AdSense (ca-pub-2482023752745520)
- **Deploy:** GitHub Pages
- **Domínio:** www.trekko.com.br

## 📊 Estatísticas do Sistema

- **20 trilhas** com galerias completas (60 fotos profissionais)
- **8 estados** brasileiros cobertos
- **100% responsivo** para todos os dispositivos
- **Sistema de imagens** com 22MB otimizados
- **API integrada** com dados reais do CADASTUR

## 🚀 Como Hospedar no GitHub Pages com Domínio Personalizado

### Passo 1: Criar Repositório no GitHub

1. Acesse [GitHub.com](https://github.com) e faça login
2. Clique em "New repository" (botão verde)
3. Nome do repositório: `trekko-website`
4. Marque como "Public"
5. Clique em "Create repository"

### Passo 2: Fazer Upload dos Arquivos

**Opção A - Via Interface Web:**
1. No repositório criado, clique em "uploading an existing file"
2. Arraste todos os arquivos desta pasta para a área de upload
3. Escreva uma mensagem: "Deploy inicial do site Trekko"
4. Clique em "Commit changes"

**Opção B - Via Git (se tiver instalado):**
```bash
git clone https://github.com/SEU_USUARIO/trekko-website.git
cd trekko-website
# Copie todos os arquivos desta pasta para dentro da pasta clonada
git add .
git commit -m "Deploy inicial do site Trekko"
git push origin main
```

### Passo 3: Ativar GitHub Pages

1. No repositório, vá em "Settings" (aba superior)
2. Role para baixo até "Pages" (menu lateral esquerdo)
3. Em "Source", selecione "Deploy from a branch"
4. Em "Branch", selecione "main" e "/ (root)"
5. Clique em "Save"
6. Aguarde alguns minutos - o site ficará disponível em: `https://SEU_USUARIO.github.io/trekko-website`

### Passo 4: Configurar Domínio Personalizado (www.trekko.com.br)

#### 4.1 - No GitHub:
1. Ainda em "Settings" > "Pages"
2. Em "Custom domain", digite: `www.trekko.com.br`
3. Clique em "Save"
4. Marque a opção "Enforce HTTPS" (após configurar DNS)

#### 4.2 - No seu Provedor de Domínio:
Configure os seguintes registros DNS:

**Registro CNAME:**
```
Nome: www
Valor: SEU_USUARIO.github.io
TTL: 3600 (ou padrão)
```

**Registro A (para domínio raiz trekko.com.br):**
```
Nome: @ (ou deixe vazio)
Valores: 
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
TTL: 3600 (ou padrão)
```

#### 4.3 - Aguardar Propagação:
- A propagação DNS pode levar de 15 minutos a 48 horas
- Teste em: https://dnschecker.org/
- Quando propagar, o site estará disponível em www.trekko.com.br

## 🔧 Funcionalidades Implementadas

### ✅ Sistema de Usuários
- Cadastro de trekkers e guias
- Login/logout
- Perfis personalizados
- Dados do CADASTUR (read-only para guias)

### ✅ Sistema de Trilhas
- Integração com API oficial do CADASTUR
- Filtros por estado, cidade, nome
- Detalhes completos das trilhas
- Sistema de favoritos

### ✅ Sistema de Guias
- Perfis verificados
- Dados oficiais do CADASTUR
- Sistema de avaliações
- Adição de trilhas ao perfil

### ✅ Sistema de Avaliações
- Avaliação de trilhas (1-5 estrelas)
- Avaliação de guias
- Comentários e fotos
- Sistema de recomendação

## 📱 Compatibilidade

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS Safari, Android Chrome)
- ✅ Tablet (iPad, Android tablets)

## 🔗 APIs Utilizadas

- **CADASTUR API**: `https://g8h3ilcvjnlq.manus.space/api/`
  - `/trails` - Trilhas oficiais
  - `/guides` - Guias verificados

## 📞 Suporte

Para dúvidas sobre hospedagem ou configuração, consulte:
- [Documentação GitHub Pages](https://docs.github.com/en/pages)
- [Configuração de domínio personalizado](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

**🏔️ Desenvolvido para conectar aventureiros e guias profissionais!**

