require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SSO_SECRET = process.env.SSO_SECRET || 'dev-sso-secret';

app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/sso', (req, res) => {
  const { sso_token } = req.query;
  if (!sso_token) return res.redirect('/?needs_auth=1');
  try {
    const payload = jwt.verify(sso_token, SSO_SECRET);
    const session = jwt.sign(
      { nome: payload.nome, email: payload.email },
      SSO_SECRET,
      { expiresIn: '8h' }
    );
    res.cookie('hub_session', session, {
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 8 * 3600 * 1000,
    });
    return res.redirect('/');
  } catch {
    return res.redirect('/?needs_auth=1');
  }
});

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.hub_session;
  if (!token) return res.send(loginPage());
  try {
    jwt.verify(token, SSO_SECRET);
    next();
  } catch {
    res.clearCookie('hub_session');
    return res.send(loginPage());
  }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`DiretorioRamais rodando em http://localhost:${PORT}`));

function loginPage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acesso — Gran Marquise</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;1,300&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0A0E1A; color: #F5F0E6; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .wrap { text-align: center; padding: 48px 24px; }
  .logo { font-size: 10px; letter-spacing: 0.35em; text-transform: uppercase; color: #8A7E64; margin-bottom: 36px; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .dot { width: 4px; height: 4px; border-radius: 50%; background: #C9A961; display: inline-block; }
  h1 { font-family: 'Fraunces', serif; font-weight: 300; font-style: italic; font-size: 32px; color: #F5F0E6; margin-bottom: 12px; letter-spacing: -0.02em; }
  p { font-family: 'Fraunces', serif; font-style: italic; font-size: 15px; color: #8A7E64; margin-bottom: 36px; line-height: 1.5; }
  a { display: inline-flex; align-items: center; gap: 10px; padding: 13px 28px; background: transparent; border: 1px solid #C9A961; color: #C9A961; text-decoration: none; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; transition: background 0.3s; }
  a:hover { background: rgba(201,169,97,0.1); }
  .line { width: 1px; height: 60px; background: linear-gradient(180deg, transparent, #C9A96155, transparent); margin: 0 auto 36px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="line"></div>
  <div class="logo">Gran Marquise <span class="dot"></span> TI</div>
  <h1>Acesso restrito.</h1>
  <p>Faça login pelo Hub para acessar<br>a Lista de Ramais.</p>
  <a href="https://hub-granmarquise.fly.dev">
    Ir para o Hub
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
  </a>
</div>
</body>
</html>`;
}
