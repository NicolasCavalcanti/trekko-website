# Trekko Codex

## Seeds

Execute a migração e popular a base com as trilhas:

```bash
npx prisma migrate dev -n add_media_isCover
npx ts-node scripts/seed_trails.ts
```

A execução cria ou atualiza trilhas e define uma mídia de capa (`isCover = true`) para cada uma.

## Validação

Para verificar, consulte o endpoint de trilhas:

```bash
curl http://localhost:3000/api/trails?page=1&pageSize=12
```

Cada item retornará `coverImageUrl` com a URL da capa.

## Testes

Um teste de integração verifica o retorno da capa:

```bash
npm test
```

