# 🚀 Deploy da Página "Sobre" - Trekko

## 📁 Arquivos para Deploy

### Arquivos principais:
- `sobre.html` - Página "Sobre" completa
- `images/hero-sobre.jpg` - Imagem hero (Serra Fina)
- `images/cta-sobre.jpg` - Imagem CTA (Pico da Bandeira)

## 🔧 Instruções de Deploy

### 1. **Estrutura no repositório:**
```
/
├── sobre.html
├── images/
│   ├── hero-sobre.jpg
│   └── cta-sobre.jpg
└── (outros arquivos existentes)
```

### 2. **Comandos Git:**
```bash
# Adicionar arquivos
git add sobre.html
git add images/hero-sobre.jpg
git add images/cta-sobre.jpg

# Commit com mensagem descritiva
git commit -m "feat: adiciona página 'Sobre' completa com storytelling e design responsivo

- Implementa página 'Sobre' seguindo diretrizes de marketing e UX
- Design responsivo mobile-first com paleta Trekko
- Contadores dinâmicos animados e JavaScript avançado
- SEO otimizado e Google Analytics integrado
- Storytelling profissional focado em sustentabilidade"

# Push para GitHub
git push origin main
```

### 3. **Verificação pós-deploy:**
- [ ] Página acessível em `https://seudominio.com/sobre.html`
- [ ] Imagens carregando corretamente
- [ ] Navegação funcionando entre páginas
- [ ] Responsividade em dispositivos móveis
- [ ] Contadores animados funcionando
- [ ] Modais de login/cadastro operacionais

## 🔗 Integração com Site Existente

### Links que precisam ser atualizados:
1. **Menu principal**: Adicionar link para `/sobre.html`
2. **Footer**: Link "Sobre nós" deve apontar para `/sobre.html`
3. **Homepage**: Considerar adicionar CTA para página Sobre

### Exemplo de link no menu:
```html
<a href="/sobre.html" class="nav-link">Sobre</a>
```

## 📊 Monitoramento

### Google Analytics:
- Eventos de CTA clicks configurados
- Tracking de scroll depth
- Métricas de tempo na página
- Conversões de modais

### Métricas a acompanhar:
- Taxa de engajamento na página
- Tempo médio na página
- Cliques nos CTAs
- Taxa de conversão para trilhas

## 🎯 Próximos Passos Recomendados

1. **Testes A/B**: Otimizar CTAs e conversões
2. **Conteúdo dinâmico**: Integrar contadores com API real
3. **Blog integration**: Adicionar seção de artigos
4. **Testimonials**: Expandir depoimentos de usuários

## ⚠️ Observações Importantes

- **Compatibilidade**: Testado em Chrome, Firefox, Safari, Edge
- **Performance**: Imagens otimizadas para carregamento rápido
- **SEO**: Meta tags configuradas para compartilhamento social
- **Acessibilidade**: HTML semântico e navegação por teclado

---

**Status**: ✅ Pronto para deploy em produção

