# User Stories

## Autenticação e Cadastro
Como usuário, quero me cadastrar e fazer login usando e-mail ou OAuth para acessar o sistema.

### Critérios de Aceitação
- Cadastro com validação de e-mail
- Login seguro
- Logout disponível

## Controle de Acesso por Papéis
Como admin, quero autenticação com papéis (admin/guia/trekker) para ter permissões diferenciadas.

### Critérios de Aceitação
- RBAC configurado
- Acesso negado se o papel estiver incorreto

## Design System
Como desenvolvedor, quero um design system padronizado (cores, botões, tipografia, componentes) para garantir consistência.

### Critérios de Aceitação
- Biblioteca de componentes documentada em Storybook

## Pipeline CI/CD
Como desenvolvedor, quero pipelines CI/CD funcionando para ter deploy contínuo em staging.

### Critérios de Aceitação
- Build, test e deploy automáticos em push para a branch main
