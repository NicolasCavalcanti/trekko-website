# 🚀 Instruções de Deploy - Trekko

## 📦 Arquivos Incluídos

### 🌐 Páginas HTML (7 arquivos)
- `index.html` - Página inicial ✅ Analytics + AdSense
- `trilhas.html` - Listagem de trilhas ✅ Analytics + AdSense  
- `trilha.html` - Página individual da trilha ✅ Analytics + AdSense
- `guias.html` - Listagem de guias ✅ Analytics + AdSense
- `guia.html` - Perfil do guia ✅ Analytics + AdSense
- `perfil.html` - Perfil do usuário ✅ Analytics + AdSense
- `admin.html` - Painel administrativo ✅ Analytics + AdSense

### 📜 Scripts JavaScript (3 arquivos)
- `js/trail-images.js` - Sistema de imagens das trilhas (20 trilhas, 60 fotos)
- `js/business-rules.js` - Regras de negócio (comissões, estornos, validações)
- `js/trail-validation.js` - Validação de trilhas e campos obrigatórios

### 🖼️ Imagens (60 arquivos)
- `images/trilhas/` - 60 fotos profissionais das trilhas (22MB otimizado)

### ⚙️ Configurações
- `CNAME` - Configuração do domínio www.trekko.com.br
- `ads.txt` - Configuração Google AdSense
- `README.md` - Documentação completa

## 🔧 Configurações Aplicadas

### 📊 Google Analytics 4
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S816P190VN"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-S816P190VN');
</script>
```

### 💰 Google AdSense
```html
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2482023752745520"
     crossorigin="anonymous"></script>
<meta name="google-adsense-account" content="ca-pub-2482023752745520">
```

### 📄 Arquivo ads.txt
```
google.com, pub-2482023752745520, DIRECT, f08c47fec0942fa0
```

## 🌐 Deploy no GitHub Pages

### Passo 1: Criar Repositório
1. Acesse [GitHub.com](https://github.com)
2. Clique em "New repository"
3. Nome: `trekko-website`
4. Público: ✅
5. Clique em "Create repository"

### Passo 2: Upload dos Arquivos
1. Clique em "uploading an existing file"
2. Arraste TODOS os arquivos desta pasta
3. Commit message: "Deploy inicial Trekko com Analytics e AdSense"
4. Clique em "Commit changes"

### Passo 3: Ativar GitHub Pages
1. Vá em "Settings" > "Pages"
2. Source: "Deploy from a branch"
3. Branch: "main" / "/ (root)"
4. Clique em "Save"

### Passo 4: Configurar Domínio
1. Em "Custom domain": `www.trekko.com.br`
2. Clique em "Save"
3. Configure DNS no seu provedor:

**Registro CNAME:**
```
Nome: www
Valor: SEU_USUARIO.github.io
```

**Registro A:**
```
Nome: @
Valores:
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

## ✅ Checklist de Verificação

### 📊 Analytics e AdSense
- [ ] Google Analytics configurado (G-S816P190VN)
- [ ] Google AdSense configurado (ca-pub-2482023752745520)
- [ ] Arquivo ads.txt no diretório raiz
- [ ] Meta tag AdSense em todas as páginas

### 🖼️ Sistema de Imagens
- [ ] 60 imagens das trilhas carregadas
- [ ] Sistema de galerias funcionando
- [ ] Imagens otimizadas (22MB total)

### 🔧 Funcionalidades
- [ ] Busca de trilhas funcionando
- [ ] Filtros por estado/cidade operacionais
- [ ] Sistema de avaliações ativo
- [ ] Perfis de guias carregando
- [ ] Painel administrativo acessível

### 🌐 Deploy
- [ ] Site acessível via GitHub Pages
- [ ] Domínio personalizado configurado
- [ ] HTTPS ativo
- [ ] Todas as páginas carregando

## 🎯 URLs Importantes

- **Site Principal:** https://www.trekko.com.br
- **GitHub Pages:** https://SEU_USUARIO.github.io/trekko-website
- **Painel Admin:** https://www.trekko.com.br/admin.html
- **API CADASTUR:** https://g8h3ilcvjnlq.manus.space/api/

## 📞 Suporte

- **GitHub Pages:** https://docs.github.com/en/pages
- **Google Analytics:** https://analytics.google.com/
- **Google AdSense:** https://www.google.com/adsense/

---

**🏔️ Trekko - Conectando aventureiros às belezas do Brasil!**

