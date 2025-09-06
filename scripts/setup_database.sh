#!/bin/bash
# ============================================================================
# Script: Setup Completo do Banco de Dados
# Descrição: Automatiza todo o processo de criação e importação
# Versão: 1.0
# Data: 2025-09-06
# ============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações do banco
DB_NAME="trekko_db"
DB_USER="root"
DB_PASS="password123"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}                    SETUP BANCO DE DADOS - GUIAS CADASTUR${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Função para executar SQL e verificar resultado
execute_sql() {
    local sql_file=$1
    local description=$2
    
    echo -e "${YELLOW}Executando: $description${NC}"
    
    if mysql -u $DB_USER -p$DB_PASS < "$sql_file"; then
        echo -e "${GREEN}✅ $description - SUCESSO${NC}"
        return 0
    else
        echo -e "${RED}❌ $description - ERRO${NC}"
        return 1
    fi
}

# Verificar se MySQL está rodando
echo -e "${YELLOW}Verificando se MySQL está rodando...${NC}"
if ! systemctl is-active --quiet mysql; then
    echo -e "${YELLOW}Iniciando MySQL...${NC}"
    sudo systemctl start mysql
fi

if systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✅ MySQL está rodando${NC}"
else
    echo -e "${RED}❌ Erro: MySQL não está rodando${NC}"
    exit 1
fi

# Executar scripts na ordem
echo -e "${BLUE}Iniciando setup do banco de dados...${NC}"

# 1. Criar tabela
execute_sql "../database/01_create_table_guias_cadastur.sql" "Criação da tabela"

# 2. Limpar dados existentes
execute_sql "../database/02_truncate_table_guias_cadastur.sql" "Limpeza da tabela"

# 3. Importar dados (4 partes)
echo -e "${YELLOW}Importando dados em 4 partes (isso pode demorar alguns minutos)...${NC}"

# Importar parte 1
echo -e "${YELLOW}Importando Parte 1/4...${NC}"
if mysql -u $DB_USER -p$DB_PASS $DB_NAME < "../database/03a_insert_data_guias_cadastur_part1.sql"; then
    echo -e "${GREEN}✅ Parte 1 - SUCESSO${NC}"
else
    echo -e "${RED}❌ Parte 1 - ERRO${NC}"
    exit 1
fi

# Importar parte 2
echo -e "${YELLOW}Importando Parte 2/4...${NC}"
if mysql -u $DB_USER -p$DB_PASS $DB_NAME < "../database/03b_insert_data_guias_cadastur_part2.sql"; then
    echo -e "${GREEN}✅ Parte 2 - SUCESSO${NC}"
else
    echo -e "${RED}❌ Parte 2 - ERRO${NC}"
    exit 1
fi

# Importar parte 3
echo -e "${YELLOW}Importando Parte 3/4...${NC}"
if mysql -u $DB_USER -p$DB_PASS $DB_NAME < "../database/03c_insert_data_guias_cadastur_part3.sql"; then
    echo -e "${GREEN}✅ Parte 3 - SUCESSO${NC}"
else
    echo -e "${RED}❌ Parte 3 - ERRO${NC}"
    exit 1
fi

# Importar parte 4
echo -e "${YELLOW}Importando Parte 4/4...${NC}"
if mysql -u $DB_USER -p$DB_PASS $DB_NAME < "../database/03d_insert_data_guias_cadastur_part4.sql"; then
    echo -e "${GREEN}✅ Parte 4 - SUCESSO${NC}"
    echo -e "${GREEN}✅ Importação completa de dados - SUCESSO${NC}"
else
    echo -e "${RED}❌ Parte 4 - ERRO${NC}"
    exit 1
fi

# 4. Validar dados
execute_sql "../database/04_validate_data_guias_cadastur.sql" "Validação dos dados"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}                    SETUP CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}Banco de dados: $DB_NAME${NC}"
echo -e "${GREEN}Tabela: guias_cadastur${NC}"
echo -e "${GREEN}Registros esperados: 54.040${NC}"
echo -e "${BLUE}============================================================================${NC}"

