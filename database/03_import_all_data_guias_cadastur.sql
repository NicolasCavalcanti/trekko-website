-- ============================================================================
-- Script: Importação Completa de Dados - Guias CADASTUR
-- Descrição: Executa a importação de todas as 4 partes dos dados
-- Total de registros: 54.040
-- Versão: 1.0
-- Data: 2025-09-06
-- ============================================================================

-- Usar o banco de dados
USE `trekko_db`;

-- Configurações iniciais para melhor performance
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;
SET sql_log_bin = 0;

-- Mensagem inicial
SELECT 'Iniciando importação de dados dos guias CADASTUR...' as Status;
SELECT 'Total esperado: 54.040 registros em 4 partes' as Info;

-- Verificar se a tabela existe
SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'Tabela guias_cadastur encontrada ✓'
    ELSE 'ERRO: Tabela guias_cadastur não encontrada!'
END as 'Verificação da Tabela'
FROM information_schema.tables 
WHERE table_schema = 'trekko_db' 
AND table_name = 'guias_cadastur';

-- Contar registros antes da importação
SELECT COUNT(*) as 'Registros antes da importação' FROM guias_cadastur;

-- ============================================================================
-- INSTRUÇÕES PARA IMPORTAÇÃO MANUAL
-- ============================================================================
-- 
-- Para importar todos os dados, execute os seguintes comandos em sequência:
-- 
-- 1. mysql -u root -p trekko_db < 03a_insert_data_guias_cadastur_part1.sql
-- 2. mysql -u root -p trekko_db < 03b_insert_data_guias_cadastur_part2.sql  
-- 3. mysql -u root -p trekko_db < 03c_insert_data_guias_cadastur_part3.sql
-- 4. mysql -u root -p trekko_db < 03d_insert_data_guias_cadastur_part4.sql
-- 
-- Ou use o script automatizado: ./import_all_parts.sh
-- 
-- ============================================================================

-- Restaurar configurações
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
SET AUTOCOMMIT = 1;
SET sql_log_bin = 1;

SELECT 'Script de importação preparado!' as Status;
SELECT 'Execute os arquivos part1, part2, part3 e part4 em sequência' as Instrucao;

