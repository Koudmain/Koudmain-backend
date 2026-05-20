/**
 * Génère le HTML de l'email de vérification Koudmain.
 * Design dark mode premium avec code centré en grand.
 */
export function buildEmailVerificationHtml(firstName: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vérification de votre email — Koudmain</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: #0f0f13;
      font-family: 'Inter', Arial, sans-serif;
      color: #e2e2e8;
      padding: 40px 20px;
    }
    .wrapper {
      max-width: 560px;
      margin: 0 auto;
    }
    .card {
      background: linear-gradient(145deg, #1a1a24, #141420);
      border: 1px solid #2a2a3a;
      border-radius: 20px;
      padding: 48px 40px;
      text-align: center;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    }
    .logo {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 36px;
    }
    .logo span {
      background: linear-gradient(90deg, #7c6af7, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    .subtitle {
      font-size: 15px;
      color: #8888aa;
      line-height: 1.6;
      margin-bottom: 40px;
    }
    .code-wrapper {
      background: linear-gradient(135deg, #1e1e2e, #16162a);
      border: 1px solid #3a3a5c;
      border-radius: 16px;
      padding: 28px 24px;
      margin: 0 auto 40px;
      display: inline-block;
      width: 100%;
    }
    .code-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #6666aa;
      margin-bottom: 16px;
    }
    .code {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #a78bfa;
      font-variant-numeric: tabular-nums;
    }
    .expiry {
      font-size: 13px;
      color: #55558a;
      margin-top: 12px;
    }
    .divider {
      border: none;
      border-top: 1px solid #2a2a3a;
      margin: 40px 0 32px;
    }
    .warning {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      padding: 16px 20px;
      font-size: 13px;
      color: #f87171;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .footer {
      font-size: 12px;
      color: #44445a;
      line-height: 1.7;
      margin-top: 32px;
    }
    .footer a {
      color: #7c6af7;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">Koud<span>main</span></div>

      <h1>Confirmez votre adresse email</h1>
      <p class="subtitle">
        Bonjour <strong>${firstName}</strong>,<br />
        Utilisez le code ci-dessous pour finaliser votre inscription sur Koudmain.
      </p>

      <div class="code-wrapper">
        <p class="code-label">Votre code de vérification</p>
        <p class="code">${code}</p>
        <p class="expiry">⏱ Valide pendant <strong>15 minutes</strong></p>
      </div>

      <div class="warning">
        Si vous n'avez pas créé de compte sur Koudmain, ignorez cet email. Votre adresse ne sera pas enregistrée.
      </div>

      <hr class="divider" />

      <p class="footer">
        © ${new Date().getFullYear()} Koudmain — Tous droits réservés<br />
        <a href="https://koudmain.fr">koudmain.fr</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
