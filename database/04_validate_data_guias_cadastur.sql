-- ============================================================================
-- Script: Validação dos Dados guias_cadastur
-- Descrição: Valida a importação e fornece estatísticas dos dados
-- Versão: 1.0
-- Data: 2025-09-06
-- ============================================================================

-- Usar o banco de dados
USE `trekko_db`;

-- Validação 1: Contagem total de registros
SELECT 'VALIDAÇÃO 1: Contagem Total' as Validacao;
SELECT COUNT(*) as 'Total de Registros' FROM `guias_cadastur`;
SELECT CASE 
    WHEN COUNT(*) = 54040 THEN '✅ SUCESSO: 54.040 registros importados corretamente'
    ELSE '❌ ERRO: Número de registros incorreto'
END as 'Status da Importação'
FROM `guias_cadastur`;

-- Validação 2: Estatísticas gerais
SELECT 'VALIDAÇÃO 2: Estatísticas Gerais' as Validacao;
SELECT 
    'Total de registros' as Estatistica, 
    COUNT(*) as Valor 
FROM `guias_cadastur`
UNION ALL
SELECT 
    'Estados únicos' as Estatistica, 
    COUNT(DISTINCT uf) as Valor 
FROM `guias_cadastur`
UNION ALL
SELECT 
    'Municípios únicos' as Estatistica, 
    COUNT(DISTINCT município) as Valor 
FROM `guias_cadastur`
UNION ALL
SELECT 
    'Guias motoristas' as Estatistica, 
    COUNT(*) as Valor 
FROM `guias_cadastur` 
WHERE guia_motorista = 1
UNION ALL
SELECT 
    'Registros com certificado' as Estatistica, 
    COUNT(*) as Valor 
FROM `guias_cadastur` 
WHERE `número_do_certificado` IS NOT NULL 
AND `número_do_certificado` != '' 
AND `número_do_certificado` != '-';

-- Validação 3: Top 10 estados com mais guias
SELECT 'VALIDAÇÃO 3: Top 10 Estados' as Validacao;
SELECT 
    uf as Estado,
    COUNT(*) as 'Quantidade de Guias'
FROM `guias_cadastur`
WHERE uf IS NOT NULL AND uf != ''
GROUP BY uf
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Validação 4: Verificar integridade dos dados
SELECT 'VALIDAÇÃO 4: Integridade dos Dados' as Validacao;
SELECT 
    'Registros sem nome' as Verificacao,
    COUNT(*) as Quantidade
FROM `guias_cadastur`
WHERE nome_completo IS NULL OR nome_completo = ''
UNION ALL
SELECT 
    'Registros sem UF' as Verificacao,
    COUNT(*) as Quantidade
FROM `guias_cadastur`
WHERE uf IS NULL OR uf = ''
UNION ALL
SELECT 
    'Registros sem município' as Verificacao,
    COUNT(*) as Quantidade
FROM `guias_cadastur`
WHERE município IS NULL OR município = '';

-- Validação 5: Amostra dos dados
SELECT 'VALIDAÇÃO 5: Amostra dos Dados (5 primeiros registros)' as Validacao;
SELECT 
    nome_completo,
    uf,
    município,
    CASE guia_motorista 
        WHEN 1 THEN 'Sim' 
        ELSE 'Não' 
    END as 'É Motorista'
FROM `guias_cadastur`
ORDER BY nome_completo
LIMIT 5;

-- Resultado final
SELECT 'RESULTADO FINAL' as Status;
SELECT CASE 
    WHEN COUNT(*) = 54040 THEN '🎯 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!'
    ELSE '⚠️ VERIFICAR IMPORTAÇÃO - Contagem incorreta'
END as 'Status Final'
FROM `guias_cadastur`;

