# 🧪 GUIA COMPLETO DE TESTES - TREKKO

## 🌐 **VERSÃO DE TESTES DISPONÍVEL**

**Link da versão de testes:** [Será fornecido após publicação]

---

## 📋 **CHECKLIST COMPLETO DE TESTES**

### **1. 🏠 PÁGINA INICIAL (index.html)**
- [ ] **Carregamento da página** - Verifica se carrega sem erros
- [ ] **Menu de navegação** - Todos os links funcionam
- [ ] **Seção de trilhas em destaque** - Exibe trilhas com imagens
- [ ] **Botões de ação** - "Ver Trilhas", "Encontrar Guias"
- [ ] **Responsividade** - Testa em mobile e desktop

### **2. 🏔️ PÁGINA DE TRILHAS (trilhas.html)**
- [ ] **Sistema de imagens funcionando** - Cards mostram fotos reais
- [ ] **Filtros por estado** - Dropdown com todos os estados
- [ ] **Filtros por cidade** - Campo de busca funcional
- [ ] **Filtros por nome** - Busca por nome da trilha
- [ ] **Botão "Limpar Filtros"** - Reseta todos os filtros
- [ ] **API CADASTUR** - Retorna trilhas reais do banco
- [ ] **Paginação** - Se houver muitas trilhas

**Trilhas com imagens para testar:**
- ✅ Trilha da Pedra Bonita (RJ)
- ✅ Pico da Bandeira (MG) 
- ✅ Travessia Serra Fina (MG)

### **3. 📄 PÁGINA INDIVIDUAL DE TRILHA (trilha.html)**
- [ ] **Hero image** - Imagem de capa em alta resolução
- [ ] **Galeria de fotos** - 3 imagens por trilha
- [ ] **Modal de visualização** - Clique para ampliar imagens
- [ ] **Informações da trilha** - Dados completos exibidos
- [ ] **Sistema de avaliações** - Funcional e interativo
- [ ] **Botão "Avaliar Trilha"** - Modal abre corretamente
- [ ] **Upload de fotos** - Sistema de avaliação com imagens

### **4. 👤 PÁGINA DE PERFIL (perfil.html)**
- [ ] **Criação de usuário guia** - Sistema de autenticação
- [ ] **Botão "Adicionar Trilha"** - Aparece para guias
- [ ] **Modal de seleção** - Lista trilhas da API
- [ ] **Filtros funcionando** - Estado, cidade, nome
- [ ] **Seleção de trilha** - Clique mostra detalhes
- [ ] **Campo de preço** - Aceita valores
- [ ] **Trilha adicionada** - Aparece em "Minhas Atividades"
- [ ] **Editar perfil** - Modal funcional
- [ ] **Campos read-only** - CADASTUR e localização protegidos

### **5. 🔧 PAINEL ADMINISTRATIVO (admin.html)**
- [ ] **Acesso ao painel** - URL: /admin.html
- [ ] **Métricas de sucesso** - Cards com estatísticas
- [ ] **Simulador de comissão** - Cálculos corretos
- [ ] **Simulador de estorno** - Política por janelas
- [ ] **Validador de trilhas** - JSON de entrada
- [ ] **Log de auditoria** - Registros em tempo real
- [ ] **Configuração de comissões** - Override por guia

### **6. 💰 REGRAS DE NEGÓCIO**
- [ ] **Comissão global** - 15% padrão
- [ ] **Override por guia** - Comissões personalizadas
- [ ] **Política de estorno:**
  - [ ] 100% até 48h antes
  - [ ] 50% até 24h antes
  - [ ] 0% no dia da trilha
- [ ] **Cálculo de repasses** - Valor - taxas - comissão
- [ ] **Log de auditoria** - Todas as ações registradas

### **7. ✅ VALIDAÇÃO DE TRILHAS**
- [ ] **Campos obrigatórios** - Nome, descrição, localização
- [ ] **Mínimo 1 foto** - Para publicação
- [ ] **Status "publicada"** - Obrigatório para exibição
- [ ] **Validação em tempo real** - Formulários
- [ ] **Upload com progresso** - Sistema de fotos

---

## 🎯 **CENÁRIOS DE TESTE ESPECÍFICOS**

### **Cenário 1: Usuário Trekker**
1. Acesse a página inicial
2. Navegue para "Ver Trilhas"
3. Use filtros para encontrar trilhas em SP
4. Clique em uma trilha para ver detalhes
5. Visualize a galeria de fotos
6. Deixe uma avaliação

### **Cenário 2: Usuário Guia**
1. Acesse o perfil (/perfil.html)
2. Crie um usuário guia via console
3. Clique em "Adicionar Trilha"
4. Filtre trilhas por estado
5. Selecione uma trilha
6. Defina um preço
7. Confirme a adição
8. Verifique se aparece em "Minhas Atividades"

### **Cenário 3: Administrador**
1. Acesse o painel (/admin.html)
2. Verifique as métricas de sucesso
3. Teste o simulador de comissão
4. Teste o simulador de estorno
5. Valide uma trilha usando JSON
6. Verifique o log de auditoria

---

## 🐛 **POSSÍVEIS PROBLEMAS E SOLUÇÕES**

### **Problema: Imagens não carregam**
- **Causa:** Caminho incorreto das imagens
- **Solução:** Verificar se pasta `images/trilhas/` existe

### **Problema: Filtros não funcionam**
- **Causa:** API não responde ou parâmetros incorretos
- **Solução:** Verificar console do navegador

### **Problema: Modal não abre**
- **Causa:** JavaScript não carregado
- **Solução:** Verificar se todos os scripts estão incluídos

### **Problema: Trilha não é adicionada**
- **Causa:** Função `addSelectedTrail` com erro
- **Solução:** Verificar localStorage e console

---

## 📊 **MÉTRICAS DE SUCESSO ESPERADAS**

### **Performance:**
- ✅ Tempo de carregamento < 3s
- ✅ Upload de 10 imagens < 30s
- ✅ Processamento de estorno < 10s

### **Funcionalidade:**
- ✅ 0 erros críticos no console
- ✅ Todos os filtros funcionando
- ✅ Sistema de imagens operacional
- ✅ Regras de negócio implementadas

### **Usabilidade:**
- ✅ Interface responsiva
- ✅ Navegação intuitiva
- ✅ Feedback visual adequado

---

## 🚀 **PRÓXIMOS PASSOS APÓS TESTES**

### **Se todos os testes passarem:**
1. ✅ Fazer backup da versão atual
2. ✅ Atualizar repositório GitHub
3. ✅ Deploy em www.trekko.com.br
4. ✅ Monitorar métricas em produção

### **Se houver problemas:**
1. 🔧 Documentar bugs encontrados
2. 🔧 Priorizar correções críticas
3. 🔧 Aplicar correções
4. 🔧 Repetir ciclo de testes

---

## 📞 **SUPORTE**

Em caso de problemas durante os testes:
1. Verifique o console do navegador (F12)
2. Documente o erro com screenshot
3. Informe o cenário que causou o problema
4. Forneça detalhes do navegador/dispositivo

**🎯 BOA SORTE COM OS TESTES!**

