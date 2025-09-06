# 🚀 Guia de Implantação

Este documento fornece instruções detalhadas para implantar o banco de dados de guias CADASTUR em diferentes ambientes.

## 📋 Pré-requisitos

### Requisitos de Sistema
- **MySQL**: 8.0 ou superior
- **RAM**: Mínimo 2GB (recomendado 4GB+)
- **Armazenamento**: Mínimo 1GB livre
- **Sistema Operacional**: Linux (Ubuntu/CentOS), Windows, macOS

### Permissões Necessárias
- Usuário com privilégios DDL (CREATE, DROP, ALTER)
- Usuário com privilégios DML (INSERT, UPDATE, DELETE, SELECT)
- Acesso de administrador para instalação do MySQL

## 🔧 Instalação do MySQL

### Ubuntu/Debian
```bash
# Atualizar repositórios
sudo apt update

# Instalar MySQL Server
sudo apt install -y mysql-server mysql-client

# Iniciar serviço
sudo systemctl start mysql
sudo systemctl enable mysql

# Configurar segurança (opcional)
sudo mysql_secure_installation
```

### CentOS/RHEL
```bash
# Instalar repositório MySQL
sudo yum install -y mysql-server mysql

# Iniciar serviço
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Obter senha temporária do root
sudo grep 'temporary password' /var/log/mysqld.log
```

### Windows
1. Baixar MySQL Installer do site oficial
2. Executar o instalador
3. Escolher "Server only" ou "Full"
4. Configurar senha do root
5. Testar conexão

### macOS
```bash
# Usando Homebrew
brew install mysql

# Iniciar serviço
brew services start mysql

# Configurar senha do root
mysql_secure_installation
```

## 🗄️ Configuração do Banco de Dados

### 1. Configuração Inicial
```sql
-- Conectar como root
mysql -u root -p

-- Criar usuário específico para a aplicação (recomendado)
CREATE USER 'trekko_user'@'localhost' IDENTIFIED BY 'senha_segura_123';
GRANT ALL PRIVILEGES ON trekko_db.* TO 'trekko_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configurações de Performance
```sql
-- Ajustar configurações para melhor performance
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 67108864; -- 64MB
```

### 3. Arquivo de Configuração (my.cnf)
```ini
[mysqld]
# Configurações básicas
port = 3306
socket = /var/run/mysqld/mysqld.sock
datadir = /var/lib/mysql

# Configurações de performance
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Configurações de charset
character-set-server = utf8mb4
collation-server = utf8mb4_0900_ai_ci

# Configurações de segurança
bind-address = 127.0.0.1
skip-name-resolve

[client]
default-character-set = utf8mb4
```

## 📦 Implantação dos Scripts

### Método 1: Script Automatizado (Recomendado)
```bash
# 1. Clonar repositório
git clone [URL_DO_REPOSITORIO]
cd [NOME_DO_REPOSITORIO]

# 2. Dar permissão de execução
chmod +x scripts/setup_database.sh

# 3. Executar setup
cd scripts
./setup_database.sh
```

### Método 2: Execução Manual
```bash
# 1. Criar estrutura do banco
mysql -u root -p < database/01_create_table_guias_cadastur.sql

# 2. Limpar dados existentes (se necessário)
mysql -u root -p < database/02_truncate_table_guias_cadastur.sql

# 3. Importar dados (pode demorar alguns minutos)
mysql -u root -p trekko_db < database/03_insert_data_guias_cadastur.sql

# 4. Validar importação
mysql -u root -p < database/04_validate_data_guias_cadastur.sql
```

### Método 3: Via Interface Gráfica
1. Abrir MySQL Workbench ou phpMyAdmin
2. Conectar ao servidor MySQL
3. Executar scripts na ordem:
   - `01_create_table_guias_cadastur.sql`
   - `02_truncate_table_guias_cadastur.sql`
   - `03_insert_data_guias_cadastur.sql`
   - `04_validate_data_guias_cadastur.sql`

## 🐳 Implantação com Docker

### Dockerfile
```dockerfile
FROM mysql:8.0

# Variáveis de ambiente
ENV MYSQL_ROOT_PASSWORD=root123
ENV MYSQL_DATABASE=trekko_db
ENV MYSQL_USER=trekko_user
ENV MYSQL_PASSWORD=trekko123

# Copiar scripts de inicialização
COPY database/ /docker-entrypoint-initdb.d/

# Configurações customizadas
COPY my.cnf /etc/mysql/conf.d/

# Expor porta
EXPOSE 3306
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  mysql:
    build: .
    container_name: trekko_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: trekko_db
      MYSQL_USER: trekko_user
      MYSQL_PASSWORD: trekko123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database:/docker-entrypoint-initdb.d
    networks:
      - trekko_network

  phpmyadmin:
    image: phpmyadmin/phpmyadmin
    container_name: trekko_phpmyadmin
    restart: always
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
      PMA_USER: root
      PMA_PASSWORD: root123
    ports:
      - "8080:80"
    depends_on:
      - mysql
    networks:
      - trekko_network

volumes:
  mysql_data:

networks:
  trekko_network:
    driver: bridge
```

### Comandos Docker
```bash
# Construir e iniciar
docker-compose up -d

# Verificar logs
docker-compose logs mysql

# Acessar MySQL
docker exec -it trekko_mysql mysql -u root -p

# Parar serviços
docker-compose down
```

## ☁️ Implantação em Nuvem

### AWS RDS
```bash
# 1. Criar instância RDS MySQL
aws rds create-db-instance \
    --db-instance-identifier trekko-db \
    --db-instance-class db.t3.micro \
    --engine mysql \
    --master-username admin \
    --master-user-password senha123 \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxxx

# 2. Conectar e executar scripts
mysql -h trekko-db.xxxxxxxxx.us-east-1.rds.amazonaws.com -u admin -p
```

### Google Cloud SQL
```bash
# 1. Criar instância
gcloud sql instances create trekko-db \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=us-central1

# 2. Definir senha do root
gcloud sql users set-password root \
    --host=% \
    --instance=trekko-db \
    --password=senha123

# 3. Conectar
gcloud sql connect trekko-db --user=root
```

### Azure Database for MySQL
```bash
# 1. Criar servidor
az mysql server create \
    --resource-group myResourceGroup \
    --name trekko-db \
    --location eastus \
    --admin-user myadmin \
    --admin-password senha123 \
    --sku-name GP_Gen5_2

# 2. Configurar firewall
az mysql server firewall-rule create \
    --resource-group myResourceGroup \
    --server trekko-db \
    --name AllowMyIP \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 255.255.255.255
```

## 🔒 Configurações de Segurança

### 1. Usuários e Permissões
```sql
-- Criar usuário apenas para leitura
CREATE USER 'readonly_user'@'%' IDENTIFIED BY 'senha_readonly';
GRANT SELECT ON trekko_db.* TO 'readonly_user'@'%';

-- Criar usuário para aplicação
CREATE USER 'app_user'@'%' IDENTIFIED BY 'senha_app';
GRANT SELECT, INSERT, UPDATE ON trekko_db.* TO 'app_user'@'%';

-- Remover usuários desnecessários
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'%';
```

### 2. SSL/TLS
```sql
-- Verificar suporte SSL
SHOW VARIABLES LIKE 'have_ssl';

-- Forçar conexões SSL
ALTER USER 'app_user'@'%' REQUIRE SSL;
```

### 3. Backup Automático
```bash
#!/bin/bash
# Script de backup automático

BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="trekko_db"

# Criar backup
mysqldump -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Manter apenas backups dos últimos 7 dias
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Adicionar ao crontab para execução diária
# 0 2 * * * /path/to/backup_script.sh
```

## 📊 Monitoramento

### 1. Queries de Monitoramento
```sql
-- Verificar status da tabela
SELECT 
    table_name,
    table_rows,
    ROUND(data_length/1024/1024, 2) as 'Data Size (MB)',
    ROUND(index_length/1024/1024, 2) as 'Index Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'trekko_db';

-- Verificar conexões ativas
SHOW PROCESSLIST;

-- Verificar performance
SHOW STATUS LIKE 'Slow_queries';
SHOW STATUS LIKE 'Questions';
```

### 2. Logs de Auditoria
```sql
-- Habilitar log de queries lentas
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão
```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Verificar porta
netstat -tlnp | grep 3306

# Testar conexão
mysql -u root -p -h localhost
```

#### 2. Erro de Importação
```bash
# Verificar espaço em disco
df -h

# Verificar logs de erro
tail -f /var/log/mysql/error.log

# Aumentar timeout
mysql -u root -p -e "SET GLOBAL max_execution_time = 0;"
```

#### 3. Performance Lenta
```sql
-- Analisar queries lentas
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Verificar índices
SHOW INDEX FROM guias_cadastur;

-- Analisar query específica
EXPLAIN SELECT * FROM guias_cadastur WHERE uf = 'SP';
```

## ✅ Checklist de Implantação

- [ ] MySQL instalado e configurado
- [ ] Usuários e permissões criados
- [ ] Scripts executados na ordem correta
- [ ] Validação dos dados confirmada (54.040 registros)
- [ ] Índices criados e funcionando
- [ ] Backup configurado
- [ ] Monitoramento implementado
- [ ] Documentação atualizada
- [ ] Testes de conectividade realizados
- [ ] Configurações de segurança aplicadas

## 📞 Suporte

Para problemas durante a implantação:

1. Verificar logs de erro do MySQL
2. Consultar a documentação oficial do MySQL
3. Abrir issue no repositório do GitHub
4. Contatar a equipe de suporte técnico

---

**Última atualização**: 2025-09-06

