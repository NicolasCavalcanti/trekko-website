-- ============================================================================
-- Script: Limpeza da Tabela guias_cadastur
-- Descrição: Remove todos os dados da tabela para nova importação
-- Versão: 1.0
-- Data: 2025-09-06
-- ============================================================================

-- Usar o banco de dados
USE `trekko_db`;

-- Verificar se a tabela existe antes de limpar
SELECT 'Verificando existência da tabela...' as Status;
SELECT COUNT(*) as 'Registros antes da limpeza' FROM `guias_cadastur`;

-- Limpar todos os dados da tabela
TRUNCATE TABLE `guias_cadastur`;

-- Confirmar limpeza
SELECT COUNT(*) as 'Registros após limpeza' FROM `guias_cadastur`;
SELECT 'Tabela limpa com sucesso!' as Status;

