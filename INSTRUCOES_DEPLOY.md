# 🚀 INSTRUÇÕES COMPLETAS PARA DEPLOY DO TREKKO

## 📋 CHECKLIST PRÉ-DEPLOY

✅ Todos os arquivos estão na pasta `trekko-final-deploy`
✅ Arquivo `CNAME` criado com `www.trekko.com.br`
✅ README.md com documentação completa
✅ Funcionalidades testadas e funcionando

## 🔧 PASSO A PASSO DETALHADO

### 1️⃣ CRIAR REPOSITÓRIO NO GITHUB

1. Acesse https://github.com
2. Clique no botão verde "New" ou "New repository"
3. **Nome do repositório**: `trekko-website` (ou outro nome de sua escolha)
4. **Visibilidade**: Marque "Public" (obrigatório para GitHub Pages gratuito)
5. **NÃO** marque "Add a README file" (já temos um)
6. Clique em "Create repository"

### 2️⃣ FAZER UPLOAD DOS ARQUIVOS

**MÉTODO 1 - Via Interface Web (Mais Fácil):**

1. No repositório recém-criado, clique em "uploading an existing file"
2. Selecione TODOS os arquivos da pasta `trekko-final-deploy`:
   - `index.html`
   - `perfil.html`
   - `trilha.html`
   - `trilhas.html`
   - `guia.html`
   - `guias.html`
   - `auth.js`
   - `README.md`
   - `CNAME`
   - `.gitignore`
   - E todos os outros arquivos
3. Arraste todos para a área de upload
4. Na caixa "Commit changes":
   - **Título**: "Deploy inicial do site Trekko"
   - **Descrição**: "Site completo com todas as funcionalidades implementadas"
5. Clique em "Commit changes"

**MÉTODO 2 - Via Git (Se você tem Git instalado):**

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/trekko-website.git
cd trekko-website

# Copie todos os arquivos da pasta trekko-final-deploy para aqui
# (use seu gerenciador de arquivos ou comando cp)

# Adicione todos os arquivos
git add .

# Faça o commit
git commit -m "Deploy inicial do site Trekko"

# Envie para o GitHub
git push origin main
```

### 3️⃣ ATIVAR GITHUB PAGES

1. No seu repositório no GitHub, clique na aba "Settings"
2. No menu lateral esquerdo, clique em "Pages"
3. Em "Source", selecione "Deploy from a branch"
4. Em "Branch", selecione "main"
5. Em "Folder", deixe "/ (root)"
6. Clique em "Save"
7. **AGUARDE**: O GitHub mostrará uma mensagem dizendo que o site está sendo construído
8. Após alguns minutos, aparecerá um link: `https://SEU_USUARIO.github.io/trekko-website`

### 4️⃣ CONFIGURAR DOMÍNIO PERSONALIZADO

#### 4.1 - Configuração no GitHub:

1. Ainda em "Settings" > "Pages"
2. Em "Custom domain", digite: `www.trekko.com.br`
3. Clique em "Save"
4. O GitHub criará automaticamente um arquivo `CNAME` (já incluído nos arquivos)
5. **NÃO** marque "Enforce HTTPS" ainda (marque só depois que o DNS propagar)

#### 4.2 - Configuração DNS no seu Provedor:

**Acesse o painel do seu provedor de domínio** (onde você comprou trekko.com.br) e configure:

**REGISTRO CNAME (para www):**
```
Tipo: CNAME
Nome: www
Valor: SEU_USUARIO.github.io
TTL: 3600 (ou deixe padrão)
```

**REGISTRO A (para domínio raiz):**
```
Tipo: A
Nome: @ (ou deixe vazio, ou trekko.com.br)
Valores (adicione todos os 4):
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
TTL: 3600 (ou deixe padrão)
```

#### 4.3 - Aguardar Propagação DNS:

- **Tempo**: 15 minutos a 48 horas (geralmente 2-6 horas)
- **Teste**: Use https://dnschecker.org/ para verificar se propagou
- **Quando propagar**: O site estará disponível em www.trekko.com.br

#### 4.4 - Ativar HTTPS:

1. Após a propagação DNS, volte em "Settings" > "Pages"
2. Marque "Enforce HTTPS"
3. Aguarde alguns minutos
4. O site estará disponível em https://www.trekko.com.br

## 🔍 VERIFICAÇÃO FINAL

### ✅ Checklist de Funcionamento:

1. **Página inicial**: https://www.trekko.com.br
2. **Trilhas**: https://www.trekko.com.br/trilhas.html
3. **Guias**: https://www.trekko.com.br/guias.html
4. **Perfil**: https://www.trekko.com.br/perfil.html
5. **Responsividade**: Teste no celular
6. **Funcionalidades**:
   - Cadastro/Login
   - Busca de trilhas
   - Filtros por estado
   - Sistema de avaliações
   - Adicionar trilha (para guias)

## 🆘 SOLUÇÃO DE PROBLEMAS

### Problema: "Site não carrega"
- **Causa**: DNS ainda não propagou
- **Solução**: Aguarde mais tempo, teste em https://dnschecker.org/

### Problema: "Erro 404"
- **Causa**: Arquivos não foram enviados corretamente
- **Solução**: Verifique se `index.html` está na raiz do repositório

### Problema: "Funcionalidades não funcionam"
- **Causa**: JavaScript bloqueado ou erro de CORS
- **Solução**: Teste em navegador diferente, verifique console do navegador

### Problema: "Domínio não funciona"
- **Causa**: Configuração DNS incorreta
- **Solução**: Verifique os registros DNS no seu provedor

## 📞 SUPORTE

- **GitHub Pages**: https://docs.github.com/en/pages
- **DNS**: Consulte seu provedor de domínio
- **Funcionalidades**: Teste primeiro em https://SEU_USUARIO.github.io/trekko-website

---

## 🎉 PARABÉNS!

Após seguir todos os passos, seu site Trekko estará disponível em:
**https://www.trekko.com.br**

🏔️ **Conectando aventureiros e guias profissionais!**

