-- ============================================================================
-- Script: Criação da Tabela guias_cadastur
-- Descrição: Tabela para armazenar dados de guias de turismo do CADASTUR
-- Versão: 1.0
-- Data: 2025-09-06
-- ============================================================================

-- Criar banco de dados se não existir
CREATE DATABASE IF NOT EXISTS `trekko_db` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;

-- Usar o banco de dados
USE `trekko_db`;

-- Criar tabela guias_cadastur
CREATE TABLE IF NOT EXISTS `guias_cadastur` (
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
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_0900_ai_ci
COMMENT='Tabela de guias de turismo cadastrados no CADASTUR';

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS `idx_uf` ON `guias_cadastur`(`uf`(10));
CREATE INDEX IF NOT EXISTS `idx_municipio` ON `guias_cadastur`(`município`(50));
CREATE INDEX IF NOT EXISTS `idx_nome_completo` ON `guias_cadastur`(`nome_completo`(100));
CREATE INDEX IF NOT EXISTS `idx_numero_certificado` ON `guias_cadastur`(`número_do_certificado`(20));
CREATE INDEX IF NOT EXISTS `idx_guia_motorista` ON `guias_cadastur`(`guia_motorista`);
CREATE INDEX IF NOT EXISTS `idx_created_at` ON `guias_cadastur`(`created_at`);

-- Comentários da tabela
ALTER TABLE `guias_cadastur` COMMENT = 'Tabela contendo dados de guias de turismo registrados no CADASTUR - Sistema de Cadastro de Pessoas Físicas e Jurídicas que atuam no setor do turismo';

