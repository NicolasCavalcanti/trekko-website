# 🔍 Exemplos de Consultas e APIs

Este documento contém exemplos práticos de consultas SQL e sugestões de implementação de APIs para a tabela `guias_cadastur`.

## 📊 Consultas SQL Básicas

### 1. Busca por Estado
```sql
-- Buscar todos os guias de um estado específico
SELECT nome_completo, município, telefone_comercial, email_comercial
FROM guias_cadastur 
WHERE uf = 'SP'
ORDER BY nome_completo;
```

### 2. Busca por Município
```sql
-- Buscar guias em um município específico
SELECT nome_completo, telefone_comercial, email_comercial, website
FROM guias_cadastur 
WHERE município LIKE '%São Paulo%'
ORDER BY nome_completo;
```

### 3. Guias Motoristas
```sql
-- Listar apenas guias motoristas
SELECT nome_completo, uf, município, telefone_comercial
FROM guias_cadastur 
WHERE guia_motorista = 1
ORDER BY uf, município;
```

### 4. Busca por Idiomas
```sql
-- Guias que falam inglês
SELECT nome_completo, idiomas, uf, município
FROM guias_cadastur 
WHERE idiomas LIKE '%Inglês%'
ORDER BY uf;
```

### 5. Busca por Segmentos Turísticos
```sql
-- Guias especializados em Ecoturismo
SELECT nome_completo, uf, município, segmentos, telefone_comercial
FROM guias_cadastur 
WHERE segmentos LIKE '%Ecoturismo%'
ORDER BY uf, município;
```

## 📈 Consultas Estatísticas

### 1. Ranking de Estados
```sql
-- Top 10 estados com mais guias
SELECT 
    uf as Estado,
    COUNT(*) as Total_Guias,
    SUM(CASE WHEN guia_motorista = 1 THEN 1 ELSE 0 END) as Guias_Motoristas,
    ROUND(SUM(CASE WHEN guia_motorista = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as Percentual_Motoristas
FROM guias_cadastur 
WHERE uf IS NOT NULL AND uf != ''
GROUP BY uf 
ORDER BY Total_Guias DESC 
LIMIT 10;
```

### 2. Distribuição por Região
```sql
-- Guias por região do Brasil
SELECT 
    CASE 
        WHEN uf IN ('AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO') THEN 'Norte'
        WHEN uf IN ('AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE') THEN 'Nordeste'
        WHEN uf IN ('GO', 'MT', 'MS', 'DF') THEN 'Centro-Oeste'
        WHEN uf IN ('ES', 'MG', 'RJ', 'SP') THEN 'Sudeste'
        WHEN uf IN ('PR', 'RS', 'SC') THEN 'Sul'
        ELSE 'Não Identificado'
    END as Regiao,
    COUNT(*) as Total_Guias
FROM guias_cadastur 
GROUP BY 
    CASE 
        WHEN uf IN ('AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO') THEN 'Norte'
        WHEN uf IN ('AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE') THEN 'Nordeste'
        WHEN uf IN ('GO', 'MT', 'MS', 'DF') THEN 'Centro-Oeste'
        WHEN uf IN ('ES', 'MG', 'RJ', 'SP') THEN 'Sudeste'
        WHEN uf IN ('PR', 'RS', 'SC') THEN 'Sul'
        ELSE 'Não Identificado'
    END
ORDER BY Total_Guias DESC;
```

### 3. Análise de Idiomas
```sql
-- Idiomas mais falados pelos guias
SELECT 
    'Português' as Idioma,
    COUNT(*) as Total_Guias
FROM guias_cadastur 
WHERE idiomas LIKE '%Português%'

UNION ALL

SELECT 
    'Inglês' as Idioma,
    COUNT(*) as Total_Guias
FROM guias_cadastur 
WHERE idiomas LIKE '%Inglês%'

UNION ALL

SELECT 
    'Espanhol' as Idioma,
    COUNT(*) as Total_Guias
FROM guias_cadastur 
WHERE idiomas LIKE '%Espanhol%'

ORDER BY Total_Guias DESC;
```

## 🚀 Exemplos de API REST

### Estrutura Base da API

```javascript
// Exemplo em Node.js com Express
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// Configuração do banco
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'trekko_db'
};
```

### 1. Endpoint: Listar Guias
```javascript
// GET /api/guias?uf=SP&municipio=São Paulo&page=1&limit=20
app.get('/api/guias', async (req, res) => {
    try {
        const { uf, municipio, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM guias_cadastur WHERE 1=1';
        let params = [];
        
        if (uf) {
            query += ' AND uf = ?';
            params.push(uf);
        }
        
        if (municipio) {
            query += ' AND município LIKE ?';
            params.push(`%${municipio}%`);
        }
        
        query += ' ORDER BY nome_completo LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(query, params);
        await connection.end();
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: rows.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### 2. Endpoint: Buscar por ID
```javascript
// GET /api/guias/:id
app.get('/api/guias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT * FROM guias_cadastur WHERE id = ?',
            [id]
        );
        await connection.end();
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Guia não encontrado' 
            });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### 3. Endpoint: Buscar por Segmento
```javascript
// GET /api/guias/segmento/:segmento
app.get('/api/guias/segmento/:segmento', async (req, res) => {
    try {
        const { segmento } = req.params;
        const { uf, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM guias_cadastur WHERE segmentos LIKE ?';
        let params = [`%${segmento}%`];
        
        if (uf) {
            query += ' AND uf = ?';
            params.push(uf);
        }
        
        query += ' ORDER BY nome_completo LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(query, params);
        await connection.end();
        
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### 4. Endpoint: Estatísticas
```javascript
// GET /api/estatisticas
app.get('/api/estatisticas', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Total de guias
        const [totalRows] = await connection.execute(
            'SELECT COUNT(*) as total FROM guias_cadastur'
        );
        
        // Guias por estado
        const [estadosRows] = await connection.execute(`
            SELECT uf, COUNT(*) as total 
            FROM guias_cadastur 
            WHERE uf IS NOT NULL AND uf != ''
            GROUP BY uf 
            ORDER BY total DESC 
            LIMIT 10
        `);
        
        // Guias motoristas
        const [motoristasRows] = await connection.execute(
            'SELECT COUNT(*) as total FROM guias_cadastur WHERE guia_motorista = 1'
        );
        
        await connection.end();
        
        res.json({
            success: true,
            data: {
                total_guias: totalRows[0].total,
                guias_motoristas: motoristasRows[0].total,
                top_estados: estadosRows
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

## 🔍 Consultas Avançadas

### 1. Busca Full-Text
```sql
-- Busca por nome ou município (case-insensitive)
SELECT nome_completo, uf, município, telefone_comercial
FROM guias_cadastur 
WHERE LOWER(nome_completo) LIKE LOWER('%silva%')
   OR LOWER(município) LIKE LOWER('%silva%')
ORDER BY nome_completo;
```

### 2. Guias Multilíngues
```sql
-- Guias que falam mais de um idioma
SELECT nome_completo, idiomas, uf, município
FROM guias_cadastur 
WHERE (LENGTH(idiomas) - LENGTH(REPLACE(idiomas, '|', ''))) > 0
ORDER BY uf, nome_completo;
```

### 3. Análise de Certificados
```sql
-- Guias com certificados válidos vs vencidos
SELECT 
    CASE 
        WHEN validade_do_certificado > NOW() THEN 'Válido'
        WHEN validade_do_certificado <= NOW() THEN 'Vencido'
        ELSE 'Sem Data'
    END as Status_Certificado,
    COUNT(*) as Total
FROM guias_cadastur 
WHERE validade_do_certificado IS NOT NULL 
AND validade_do_certificado != ''
AND validade_do_certificado != '-'
GROUP BY 
    CASE 
        WHEN validade_do_certificado > NOW() THEN 'Válido'
        WHEN validade_do_certificado <= NOW() THEN 'Vencido'
        ELSE 'Sem Data'
    END;
```

## 📱 Exemplo de Implementação Frontend

### React Component
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuiasList = () => {
    const [guias, setGuias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        uf: '',
        municipio: '',
        segmento: ''
    });

    const fetchGuias = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });
            
            const response = await axios.get(`/api/guias?${params}`);
            setGuias(response.data.data);
        } catch (error) {
            console.error('Erro ao buscar guias:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuias();
    }, [filters]);

    return (
        <div>
            <h2>Guias de Turismo</h2>
            
            {/* Filtros */}
            <div className="filters">
                <input
                    type="text"
                    placeholder="Estado (UF)"
                    value={filters.uf}
                    onChange={(e) => setFilters({...filters, uf: e.target.value})}
                />
                <input
                    type="text"
                    placeholder="Município"
                    value={filters.municipio}
                    onChange={(e) => setFilters({...filters, municipio: e.target.value})}
                />
            </div>

            {/* Lista de Guias */}
            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div className="guias-list">
                    {guias.map(guia => (
                        <div key={guia.id} className="guia-card">
                            <h3>{guia.nome_completo}</h3>
                            <p>{guia.uf} - {guia.município}</p>
                            <p>Tel: {guia.telefone_comercial}</p>
                            <p>Email: {guia.email_comercial}</p>
                            {guia.guia_motorista === 1 && (
                                <span className="badge">Guia Motorista</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GuiasList;
```

## 🔧 Dicas de Performance

### 1. Índices Compostos
```sql
-- Para consultas frequentes por UF + município
CREATE INDEX idx_uf_municipio ON guias_cadastur(uf(10), município(50));
```

### 2. Cache de Consultas
```javascript
// Implementar cache Redis para consultas frequentes
const redis = require('redis');
const client = redis.createClient();

const getCachedGuias = async (key) => {
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
};

const setCachedGuias = async (key, data, ttl = 3600) => {
    await client.setex(key, ttl, JSON.stringify(data));
};
```

### 3. Paginação Eficiente
```sql
-- Use LIMIT com OFFSET para grandes datasets
SELECT * FROM guias_cadastur 
ORDER BY id 
LIMIT 20 OFFSET 100;
```

