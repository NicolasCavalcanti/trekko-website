# 🗺️ Banco de Dados - Guias CADASTUR

Este repositório contém a estrutura completa do banco de dados para gerenciamento de guias de turismo registrados no **CADASTUR** (Sistema de Cadastro de Pessoas Físicas e Jurídicas que atuam no setor do turismo).

## 📊 Informações do Dataset

- **Total de registros**: 54.040 guias de turismo
- **Estados cobertos**: 27 UFs
- **Municípios únicos**: 2.130
- **Guias motoristas**: 1.474
- **Fonte**: CADASTUR - Ministério do Turismo

## ⚠️ Arquivos Divididos para GitHub

Devido ao limite de 25MB do GitHub, o arquivo original de dados SQL (32MB) foi dividido em **4 partes menores**:
- `03a_insert_data_guias_cadastur_part1.sql` (~11MB)
- `03b_insert_data_guias_cadastur_part2.sql` (~11MB) 
- `03c_insert_data_guias_cadastur_part3.sql` (~11MB)
- `03d_insert_data_guias_cadastur_part4.sql` (~26KB)

Os scripts de automação executam todas as partes automaticamente na sequência correta.

## 🚀 Início Rápido

### Pré-requisitos
- MySQL 8.0 ou superior
- Acesso com privilégios DDL/DML

### Instalação Automática
```bash
# Clone o repositório
git clone [URL_DO_REPOSITORIO]
cd [NOME_DO_REPOSITORIO]

# Execute o script de setup
cd scripts
./setup_database.sh
```

### Instalação Manual
```bash
# 1. Criar tabela
mysql -u root -p < database/01_create_table_guias_cadastur.sql

# 2. Limpar dados existentes (opcional)
mysql -u root -p < database/02_truncate_table_guias_cadastur.sql

# 3. Importar dados (4 partes em sequência)
mysql -u root -p trekko_db < database/03a_insert_data_guias_cadastur_part1.sql
mysql -u root -p trekko_db < database/03b_insert_data_guias_cadastur_part2.sql
mysql -u root -p trekko_db < database/03c_insert_data_guias_cadastur_part3.sql
mysql -u root -p trekko_db < database/03d_insert_data_guias_cadastur_part4.sql

# 4. Validar importação
mysql -u root -p < database/04_validate_data_guias_cadastur.sql
```

### Instalação Automática das 4 Partes
```bash
# Usar script específico para importar todas as partes
cd scripts
./import_all_parts.sh
```

## 📁 Estrutura do Projeto

```
├── README.md                          # Este arquivo
├── database/                          # Scripts SQL
│   ├── 01_create_table_guias_cadastur.sql           # Criação da tabela
│   ├── 02_truncate_table_guias_cadastur.sql         # Limpeza da tabela
│   ├── 03_import_all_data_guias_cadastur.sql        # Instruções de importação
│   ├── 03a_insert_data_guias_cadastur_part1.sql     # Dados parte 1 (~18k registros)
│   ├── 03b_insert_data_guias_cadastur_part2.sql     # Dados parte 2 (~18k registros)
│   ├── 03c_insert_data_guias_cadastur_part3.sql     # Dados parte 3 (~18k registros)
│   ├── 03d_insert_data_guias_cadastur_part4.sql     # Dados parte 4 (restantes)
│   └── 04_validate_data_guias_cadastur.sql          # Validação e estatísticas
├── scripts/                           # Scripts de automação
│   ├── setup_database.sh             # Setup completo automatizado
│   ├── import_all_parts.sh           # Importação automática das 4 partes
│   └── backup_database.sh            # Backup da tabela
└── docs/                             # Documentação
    ├── database_schema.md            # Esquema do banco de dados
    ├── api_examples.md               # Exemplos de consultas
    └── deployment_guide.md           # Guia de implantação
```

## 🏗️ Estrutura da Tabela

A tabela `guias_cadastur` possui os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT AUTO_INCREMENT | Chave primária |
| `idiomas` | TEXT | Idiomas falados (separados por \|) |
| `atividade_turística` | TEXT | Tipo de atividade turística |
| `uf` | TEXT | Unidade Federativa (Estado) |
| `município` | TEXT | Município de origem |
| `nome_completo` | TEXT | Nome completo do guia |
| `telefone_comercial` | TEXT | Telefone comercial |
| `email_comercial` | TEXT | Email comercial |
| `website` | TEXT | Website pessoal/profissional |
| `número_do_certificado` | TEXT | Número do certificado CADASTUR |
| `validade_do_certificado` | TEXT | Data de validade do certificado |
| `município_de_atuação` | TEXT | Municípios de atuação (separados por \|) |
| `categorias` | TEXT | Categorias de atuação (separadas por \|) |
| `segmentos` | TEXT | Segmentos turísticos (separados por \|) |
| `guia_motorista` | BIGINT | Indica se é guia motorista (0=Não, 1=Sim) |
| `created_at` | TIMESTAMP | Data de criação do registro |
| `updated_at` | TIMESTAMP | Data da última atualização |

## 🔍 Consultas Úteis

### Top 10 Estados com Mais Guias
```sql
SELECT uf, COUNT(*) as total_guias 
FROM guias_cadastur 
GROUP BY uf 
ORDER BY total_guias DESC 
LIMIT 10;
```

### Guias Motoristas por Estado
```sql
SELECT uf, COUNT(*) as guias_motoristas 
FROM guias_cadastur 
WHERE guia_motorista = 1 
GROUP BY uf 
ORDER BY guias_motoristas DESC;
```

### Buscar Guias por Município
```sql
SELECT nome_completo, telefone_comercial, email_comercial 
FROM guias_cadastur 
WHERE município LIKE '%São Paulo%';
```

## 📈 Estatísticas do Dataset

- **Total de registros**: 54.040
- **Estados únicos**: 27
- **Municípios únicos**: 2.130
- **Guias motoristas**: 1.474 (2,7% do total)
- **Registros com certificado válido**: ~48.940

## 🛠️ Manutenção

### Backup
```bash
cd scripts
./backup_database.sh
```

### Revalidação dos Dados
```bash
mysql -u root -p < database/04_validate_data_guias_cadastur.sql
```

## 📋 Índices Criados

Para otimização de performance, os seguintes índices são criados automaticamente:

- `idx_uf`: Índice no campo UF
- `idx_municipio`: Índice no campo município
- `idx_nome_completo`: Índice no nome completo
- `idx_numero_certificado`: Índice no número do certificado
- `idx_guia_motorista`: Índice para guias motoristas
- `idx_created_at`: Índice na data de criação

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte, abra uma issue no GitHub ou entre em contato através do email: [seu-email@exemplo.com]

---

**Desenvolvido com ❤️ para o projeto Trekko**

