# DiretorioRamais — Gran Marquise TI

## O que é este projeto

Diretório de ramais do Hotel Gran Marquise.

- **Stack:** Static site (HTML/CSS/JS ou React Babel standalone) + nginx
- **Deploy:** Fly.io via GitHub Actions
- **Site em produção:** https://diretorio-ramais-granmarquise.fly.dev
- **Repositório:** https://github.com/caiobholanda/ListaRamais

## Estrutura

```
public/
  index.html        — página principal
nginx.conf          — config nginx para servir os arquivos estáticos
Dockerfile          — nginx:alpine copiando public/
fly.toml            — config do app Fly.io
.github/workflows/
  deploy.yml        — CI/CD: push em main → flyctl deploy
```

## Deploy automático

Push em `main` → GitHub Actions → `flyctl deploy --remote-only`

O secret `FLY_API_TOKEN` deve estar configurado no repositório GitHub.
