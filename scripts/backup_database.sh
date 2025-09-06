#!/bin/bash
# ============================================================================
# Script: Backup do Banco de Dados
# Descrição: Cria backup da tabela guias_cadastur
# Versão: 1.0
# Data: 2025-09-06
# ============================================================================

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DB_NAME="trekko_db"
DB_USER="root"
DB_PASS="password123"
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/guias_cadastur_backup_$DATE.sql"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}                    BACKUP BANCO DE DADOS - GUIAS CADASTUR${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

echo -e "${YELLOW}Criando backup da tabela guias_cadastur...${NC}"
echo -e "${YELLOW}Arquivo: $BACKUP_FILE${NC}"

# Criar backup
if mysqldump -u $DB_USER -p$DB_PASS $DB_NAME guias_cadastur > $BACKUP_FILE; then
    echo -e "${GREEN}✅ Backup criado com sucesso!${NC}"
    
    # Mostrar informações do backup
    echo -e "${BLUE}Informações do backup:${NC}"
    echo -e "${GREEN}Arquivo: $BACKUP_FILE${NC}"
    echo -e "${GREEN}Tamanho: $(du -h $BACKUP_FILE | cut -f1)${NC}"
    echo -e "${GREEN}Data: $(date)${NC}"
    
    # Contar linhas no backup
    LINES=$(wc -l < $BACKUP_FILE)
    echo -e "${GREEN}Linhas no arquivo: $LINES${NC}"
    
else
    echo -e "${RED}❌ Erro ao criar backup${NC}"
    exit 1
fi

echo -e "${BLUE}============================================================================${NC}"

