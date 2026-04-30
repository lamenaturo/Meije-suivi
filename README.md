# meije.naturo · Espace de suivi

Application de suivi hebdomadaire pour les consultantes de meije.naturo.

## Déploiement sur Vercel (gratuit)

### Étape 1 — Mettre le projet sur GitHub
1. Crée un compte sur github.com
2. Crée un nouveau repository (bouton vert "New") → nomme-le `meije-suivi` → Public → Create
3. Sur la page du repo, clique "uploading an existing file"
4. Glisse tous les fichiers de ce dossier dedans → Commit changes

### Étape 2 — Déployer sur Vercel
1. Va sur vercel.com → Sign up with GitHub
2. "Add New Project" → sélectionne ton repo `meije-suivi`
3. Framework Preset : **Create React App**
4. Clique Deploy → dans 2 minutes tu as une URL !

### Étape 3 — Créer ton compte praticienne
1. Va sur ton URL Vercel
2. Crée un compte avec l'email : lamenaturo@gmail.com
3. C'est tout — tu es automatiquement reconnue comme praticienne

## Connexion praticienne
- Email : meije@naturo.fr
- Mot de passe : celui que tu auras choisi à l'inscription

## Structure Firebase
- `users` : profils des consultantes
- `entries` : suivis hebdomadaires
- `messages` : messages de Meije vers les consultantes
