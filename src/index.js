<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1C1410" />
    <meta name="description" content="meije.naturo — Ton espace de suivi naturopathique personnalisé" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="meije.naturo" />

    <!-- Fonts préchargées pour éviter le flash -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
      rel="stylesheet"
    />

    <!-- EmailJS -->
    <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js" defer></script>

    <title>meije.naturo</title>

    <style>
      /* Évite le flash blanc au chargement */
      body { background: #1C1410; margin: 0; }
      #root { min-height: 100vh; }
    </style>
  </head>
  <body>
    <noscript>Cette application nécessite JavaScript pour fonctionner.</noscript>
    <div id="root"></div>
  </body>
</html>
