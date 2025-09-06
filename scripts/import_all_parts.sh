#!/bin/bash
# ============================================================================
# Script: Importação Automática de Todas as Partes
# Descrição: Executa a importação sequencial de todas as 4 partes
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
echo -e "${BLUE}           IMPORTAÇÃO AUTOMÁTICA - GUIAS CADASTUR (4 PARTES)${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Função para executar SQL e verificar resultado
execute_sql_part() {
    local sql_file=$1
    local part_name=$2
    local part_number=$3
    
    echo -e "${YELLOW}[$part_number/4] Importando $part_name...${NC}"
    
    if mysql -u $DB_USER -p$DB_PASS $DB_NAME < "$sql_file"; then
        echo -e "${GREEN}✅ $part_name - SUCESSO${NC}"
        
        # Contar registros após cada parte
        local count=$(mysql -u $DB_USER -p$DB_PASS $DB_NAME -se "SELECT COUNT(*) FROM guias_cadastur;")
        echo -e "${GREEN}   Registros na tabela: $count${NC}"
        return 0
    else
        echo -e "${RED}❌ $part_name - ERRO${NC}"
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

# Verificar se o banco existe
echo -e "${YELLOW}Verificando banco de dados...${NC}"
if mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME;" 2>/dev/null; then
    echo -e "${GREEN}✅ Banco de dados '$DB_NAME' encontrado${NC}"
else
    echo -e "${RED}❌ Erro: Banco de dados '$DB_NAME' não encontrado${NC}"
    echo -e "${YELLOW}Execute primeiro: 01_create_table_guias_cadastur.sql${NC}"
    exit 1
fi

# Contar registros antes da importação
echo -e "${YELLOW}Verificando registros existentes...${NC}"
INITIAL_COUNT=$(mysql -u $DB_USER -p$DB_PASS $DB_NAME -se "SELECT COUNT(*) FROM guias_cadastur;")
echo -e "${BLUE}Registros antes da importação: $INITIAL_COUNT${NC}"

# Executar importação das 4 partes
echo -e "${BLUE}Iniciando importação das 4 partes...${NC}"

# Parte 1
execute_sql_part "../database/03a_insert_data_guias_cadastur_part1.sql" "Parte 1 (~18.000 registros)" "1"
if [ $? -ne 0 ]; then exit 1; fi

# Parte 2  
execute_sql_part "../database/03b_insert_data_guias_cadastur_part2.sql" "Parte 2 (~18.000 registros)" "2"
if [ $? -ne 0 ]; then exit 1; fi

# Parte 3
execute_sql_part "../database/03c_insert_data_guias_cadastur_part3.sql" "Parte 3 (~18.000 registros)" "3"
if [ $? -ne 0 ]; then exit 1; fi

# Parte 4
execute_sql_part "../database/03d_insert_data_guias_cadastur_part4.sql" "Parte 4 (registros restantes)" "4"
if [ $? -ne 0 ]; then exit 1; fi

# Validação final
echo -e "${BLUE}Executando validação final...${NC}"
if mysql -u $DB_USER -p$DB_PASS $DB_NAME < "../database/04_validate_data_guias_cadastur.sql"; then
    echo -e "${GREEN}✅ Validação executada com sucesso${NC}"
else
    echo -e "${YELLOW}⚠️ Aviso: Erro na validação (dados podem estar corretos)${NC}"
fi

# Contagem final
FINAL_COUNT=$(mysql -u $DB_USER -p$DB_PASS $DB_NAME -se "SELECT COUNT(*) FROM guias_cadastur;")
IMPORTED_COUNT=$((FINAL_COUNT - INITIAL_COUNT))

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}                    IMPORTAÇÃO CONCLUÍDA!${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}Registros antes: $INITIAL_COUNT${NC}"
echo -e "${GREEN}Registros depois: $FINAL_COUNT${NC}"
echo -e "${GREEN}Registros importados: $IMPORTED_COUNT${NC}"
echo -e "${GREEN}Meta esperada: 54.040${NC}"

if [ $FINAL_COUNT -eq 54040 ]; then
    echo -e "${GREEN}🎯 SUCESSO TOTAL: 54.040 registros importados corretamente!${NC}"
elif [ $IMPORTED_COUNT -eq 54040 ]; then
    echo -e "${GREEN}🎯 SUCESSO: 54.040 registros importados corretamente!${NC}"
else
    echo -e "${YELLOW}⚠️ ATENÇÃO: Número de registros diferente do esperado${NC}"
fi

echo -e "${BLUE}============================================================================${NC}"

