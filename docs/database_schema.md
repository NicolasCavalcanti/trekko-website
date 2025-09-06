# 🗄️ Esquema do Banco de Dados

## Visão Geral

O banco de dados `trekko_db` foi projetado para armazenar e gerenciar informações de guias de turismo registrados no CADASTUR (Sistema de Cadastro de Pessoas Físicas e Jurídicas que atuam no setor do turismo).

## Estrutura do Banco

### Banco de Dados: `trekko_db`
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_0900_ai_ci
- **Engine**: InnoDB

## Tabela: `guias_cadastur`

### Descrição
Tabela principal que armazena todos os dados dos guias de turismo cadastrados no sistema CADASTUR.

### Estrutura Completa

```sql
CREATE TABLE `guias_cadastur` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Chave primária auto-incremento',
  `idiomas` TEXT COMMENT 'Idiomas falados pelo guia (separados por |)',
  `atividade_turística` TEXT COMMENT 'Tipo de atividade turística',
  `uf` TEXT COMMENT 'Unidade Federativa (Estado)',
  `município` TEXT COMMENT 'Município de origem',
  `nome_completo` TEXT COMMENT 'Nome completo do guia',
  `telefone_comercial` TEXT COMMENT 'Telefone comercial',
  `email_comercial` TEXT COMMENT 'Email comercial',
  `website` TEXT COMMENT 'Website pessoal ou profissional',
  `número_do_certificado` TEXT COMMENT 'Número do certificado CADASTUR',
  `validade_do_certificado` TEXT COMMENT 'Data de validade do certificado',
  `município_de_atuação` TEXT COMMENT 'Municípios onde atua (separados por |)',
  `categorias` TEXT COMMENT 'Categorias de atuação (separadas por |)',
  `segmentos` TEXT COMMENT 'Segmentos turísticos (separados por |)',
  `guia_motorista` BIGINT DEFAULT 0 COMMENT 'Indica se é guia motorista (0=Não, 1=Sim)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### Detalhamento dos Campos

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | INT | NÃO | AUTO_INCREMENT | Identificador único do registro |
| `idiomas` | TEXT | SIM | NULL | Lista de idiomas separados por pipe (\|) |
| `atividade_turística` | TEXT | SIM | NULL | Tipo de atividade (ex: "Guia de Turismo") |
| `uf` | TEXT | SIM | NULL | Sigla do estado (ex: "SP", "RJ") |
| `município` | TEXT | SIM | NULL | Nome do município de origem |
| `nome_completo` | TEXT | SIM | NULL | Nome completo do guia |
| `telefone_comercial` | TEXT | SIM | NULL | Telefone para contato comercial |
| `email_comercial` | TEXT | SIM | NULL | Email para contato comercial |
| `website` | TEXT | SIM | NULL | URL do site pessoal/profissional |
| `número_do_certificado` | TEXT | SIM | NULL | Número do certificado CADASTUR |
| `validade_do_certificado` | TEXT | SIM | NULL | Data de validade do certificado |
| `município_de_atuação` | TEXT | SIM | NULL | Municípios onde atua (separados por \|) |
| `categorias` | TEXT | SIM | NULL | Categorias de atuação (separadas por \|) |
| `segmentos` | TEXT | SIM | NULL | Segmentos turísticos (separados por \|) |
| `guia_motorista` | BIGINT | SIM | 0 | Flag indicando se é guia motorista |
| `created_at` | TIMESTAMP | NÃO | CURRENT_TIMESTAMP | Data/hora de criação |
| `updated_at` | TIMESTAMP | NÃO | CURRENT_TIMESTAMP | Data/hora da última atualização |

### Índices

Para otimização de consultas, os seguintes índices são criados:

```sql
-- Índices para otimização de consultas
CREATE INDEX `idx_uf` ON `guias_cadastur`(`uf`(10));
CREATE INDEX `idx_municipio` ON `guias_cadastur`(`município`(50));
CREATE INDEX `idx_nome_completo` ON `guias_cadastur`(`nome_completo`(100));
CREATE INDEX `idx_numero_certificado` ON `guias_cadastur`(`número_do_certificado`(20));
CREATE INDEX `idx_guia_motorista` ON `guias_cadastur`(`guia_motorista`);
CREATE INDEX `idx_created_at` ON `guias_cadastur`(`created_at`);
```

## Padrões de Dados

### Campos com Múltiplos Valores
Alguns campos utilizam o caractere pipe (`|`) como separador para múltiplos valores:

- **idiomas**: `"Português|Inglês|Espanhol"`
- **município_de_atuação**: `"São Paulo|Campinas|Santos"`
- **categorias**: `"Guia Regional|Atrativo Cultural"`
- **segmentos**: `"Ecoturismo|Turismo Cultural|Turismo de Aventura"`

### Campo guia_motorista
- `0`: Não é guia motorista
- `1`: É guia motorista

### Formato de Datas
- **validade_do_certificado**: Formato timestamp MySQL
- **created_at/updated_at**: TIMESTAMP automático

## Exemplos de Valores

### Registro Típico
```sql
INSERT INTO guias_cadastur VALUES (
    1,
    'Português|Inglês',
    'Guia de Turismo',
    'SP',
    'São Paulo',
    'JOÃO DA SILVA SANTOS',
    '(11)99999-9999',
    'joao.santos@email.com',
    'www.joaoguia.com.br',
    '12345678901',
    '2025-12-31 23:59:59',
    'São Paulo|Campinas|Santos',
    'Guia Regional|Atrativo Cultural',
    'Turismo Cultural|Ecoturismo',
    1,
    NOW(),
    NOW()
);
```

## Considerações Técnicas

### Performance
- Índices otimizados para consultas por UF, município e nome
- Campo `guia_motorista` indexado para filtros rápidos
- Índice temporal para consultas por data

### Escalabilidade
- Engine InnoDB para suporte a transações
- Character set UTF8MB4 para suporte completo a Unicode
- Campos TEXT para flexibilidade nos dados

### Integridade
- Chave primária auto-incremento
- Timestamps automáticos para auditoria
- Comentários em todos os campos para documentação

## Manutenção

### Backup Recomendado
```bash
mysqldump -u root -p trekko_db guias_cadastur > backup_guias_cadastur.sql
```

### Estatísticas da Tabela
```sql
SELECT 
    table_name,
    table_rows,
    data_length,
    index_length,
    (data_length + index_length) as total_size
FROM information_schema.tables 
WHERE table_schema = 'trekko_db' 
AND table_name = 'guias_cadastur';
```

