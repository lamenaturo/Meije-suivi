import { useState, useEffect, useCallback, memo } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, browserLocalPersistence, setPersistence } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, where, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Anamnese from "./Anamnese";
import { getSystemClient, getSystemPraticienne } from "./normes";

const PRATICIENNE_EMAIL = process.env.REACT_APP_PRATICIENNE_EMAIL || "lamenaturo@gmail.com";
const INSTAGRAM = process.env.REACT_APP_INSTAGRAM || "https://www.instagram.com/meije.naturo";
const CLOUD_NAME = "di45b4ymc";
const UPLOAD_PRESET = "meije_naturo_public";
const EMAILJS_SERVICE = "service_5bi57sr";
const EMAILJS_TEMPLATE = "template_3w471uo";
const EMAILJS_TEMPLATE_BIENVENUE = "template_im5mm8v";
const EMAILJS_PUBLIC = "zpxiv3rkIbtfdqAQ6";

const fixPdfUrl = (url) => url;

const PHASES_CYCLE = ["Menstruelle", "Folliculaire", "Ovulation", "Lutéale", "Je ne sais pas"];
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const TI = [
  { key: "sommeil", label: "Sommeil", icon: "🌙", question: "Comment as-tu dormi cette semaine ?" },
  { key: "energie", label: "Énergie", icon: "⚡", question: "Comment te sens-tu niveau énergie ?" },
  { key: "humeur", label: "Humeur", icon: "🌊", question: "Comment te sens-tu émotionnellement ?" },
  { key: "anxiete", label: "Anxiété", icon: "😮‍💨", question: "Comment tu gères ton niveau de stress et d'anxiété ?" },
  { key: "douleurs", label: "Douleurs", icon: "🔥", question: "Comment te sens-tu au niveau des douleurs ?" },
  { key: "digestion", label: "Digestion", icon: "🌿", question: "Comment as-tu digéré cette semaine ?" },
  { key: "alimentation", label: "Alimentation", icon: "🥗", question: "Comment as-tu mangé cette semaine ?" },
  { key: "peau", label: "Peau", icon: "✨", question: "Comment va ta peau cette semaine ?" },
  { key: "poids", label: "Poids / Rétention", icon: "⚖️", question: "Comment tu te sens dans ton corps cette semaine ?" },
  { key: "hydratation", label: "Hydratation", icon: "💧", question: "Tu as bien bu cette semaine ?" },
  { key: "activite", label: "Activité physique", icon: "🏃", question: "Comment s'est passée ton activité physique ?" },
];

// ─── QUESTIONS SPÉCIFIQUES PAR PROFIL ────────────────────────────────────────
const QUESTIONS_PROFIL = {
  sopk: [
    { key: "sopk_douleurs_pelv", label: "Douleurs pelviennes", icon: "🔥", question: "As-tu eu des douleurs pelviennes cette semaine ?", type: "scale" },
    { key: "sopk_acne", label: "Acné", icon: "✨", question: "Comment est ton acné cette semaine ?", type: "scale" },
    { key: "sopk_pilosite", label: "Pilosité / Calvitie", icon: "🪞", question: "As-tu remarqué des changements de pilosité ?", type: "text" },
    { key: "sopk_retention", label: "Poids / Rétention", icon: "⚖️", question: "Ressens-tu de la rétention ou des changements de poids ?", type: "scale" },
    { key: "sopk_libido", label: "Libido", icon: "💫", question: "Comment est ta libido cette semaine ?", type: "scale" },
    { key: "sopk_fringales", label: "Fringales de sucre", icon: "🍬", question: "As-tu eu des fringales de sucre ?", type: "scale" },
    { key: "sopk_transit", label: "Transit", icon: "🌿", question: "Comment est ton transit cette semaine ?", type: "scale" },
  ],
  spm: [
    { key: "spm_douleurs", label: "Douleurs J1-J2", icon: "🔥", question: "Intensité des douleurs menstruelles (J1-J2) ?", type: "scale" },
    { key: "spm_seins", label: "Seins douloureux", icon: "💫", question: "Tes seins sont-ils gonflés ou douloureux ?", type: "oui_non" },
    { key: "spm_irritabilite", label: "Irritabilité", icon: "🌊", question: "Comment est ton niveau d'irritabilité ?", type: "scale" },
    { key: "spm_fringales", label: "Fringales", icon: "🍬", question: "Fringales (sucre / sel) ?", type: "scale" },
    { key: "spm_maux_tete", label: "Maux de tête", icon: "💆", question: "As-tu eu des maux de tête ?", type: "oui_non" },
    { key: "spm_retention", label: "Rétention d'eau", icon: "⚖️", question: "Ressens-tu de la rétention d'eau / ballonnements ?", type: "scale" },
    { key: "spm_sommeil_pre", label: "Sommeil pré-règles", icon: "🌙", question: "Comment est ton sommeil en phase pré-menstruelle ?", type: "scale" },
  ],
  endometriose: [
    { key: "endo_douleurs", label: "Douleurs pelviennes", icon: "🔥", question: "Intensité des douleurs pelviennes (1-5) ?", type: "scale" },
    { key: "endo_localisation", label: "Localisation douleurs", icon: "📍", question: "Où se situent les douleurs exactement ?", type: "text" },
    { key: "endo_selles", label: "Douleurs à la selle", icon: "🌿", question: "As-tu des douleurs lors des selles ?", type: "oui_non" },
    { key: "endo_fatigue", label: "Fatigue post-douleur", icon: "⚡", question: "Fatigue ressentie après les douleurs ?", type: "scale" },
    { key: "endo_inflammation", label: "Inflammation ressentie", icon: "🔥", question: "Ressens-tu de l'inflammation dans le corps ?", type: "scale" },
    { key: "endo_impact_vie", label: "Impact vie quotidienne", icon: "🏠", question: "As-tu pu travailler / sortir normalement ?", type: "text" },
    { key: "endo_transit", label: "Transit", icon: "🌿", question: "Comment est ton transit cette semaine ?", type: "scale" },
  ],
  fertilite: [
    { key: "fert_temp", label: "Température basale", icon: "🌡️", question: "Ta température basale ce matin (°C) ?", type: "text" },
    { key: "fert_glaire", label: "Glaire cervicale", icon: "💧", question: "Description de ta glaire cervicale ?", type: "text" },
    { key: "fert_libido", label: "Libido", icon: "💫", question: "Comment est ta libido cette semaine ?", type: "scale" },
    { key: "fert_stress_cycle", label: "Stress lié au cycle", icon: "😮‍💨", question: "Niveau de stress lié au cycle / fertilité ?", type: "scale" },
    { key: "fert_humeur", label: "Humeur générale", icon: "🌊", question: "Comment est ton humeur cette semaine ?", type: "scale" },
    { key: "fert_transit", label: "Transit", icon: "🌿", question: "Comment est ton transit ?", type: "scale" },
  ],
  menopause: [
    { key: "meno_bouffees", label: "Bouffées de chaleur", icon: "🌡️", question: "Combien de bouffées de chaleur par jour ?", type: "text" },
    { key: "meno_sueurs", label: "Sueurs nocturnes", icon: "🌙", question: "As-tu eu des sueurs nocturnes ?", type: "oui_non" },
    { key: "meno_secheresse", label: "Sécheresse vaginale/peau", icon: "💧", question: "Ressens-tu de la sécheresse (vaginale ou cutanée) ?", type: "scale" },
    { key: "meno_humeur", label: "Humeur", icon: "🌊", question: "Comment est ton humeur cette semaine ?", type: "scale" },
    { key: "meno_libido", label: "Libido", icon: "💫", question: "Comment est ta libido ?", type: "scale" },
    { key: "meno_articulations", label: "Douleurs articulaires", icon: "🦴", question: "As-tu des douleurs articulaires ?", type: "oui_non" },
    { key: "meno_memoire", label: "Mémoire / Concentration", icon: "🧠", question: "Comment est ta mémoire et ta concentration ?", type: "scale" },
  ],
  fatigue: [
    { key: "fat_energie_matin", label: "Énergie matin", icon: "🌅", question: "Ton niveau d'énergie au réveil ?", type: "scale" },
    { key: "fat_energie_apm", label: "Énergie après-midi", icon: "☀️", question: "Ton niveau d'énergie en après-midi ?", type: "scale" },
    { key: "fat_energie_soir", label: "Énergie soir", icon: "🌆", question: "Ton niveau d'énergie en soirée ?", type: "scale" },
    { key: "fat_recuperation", label: "Récupération", icon: "💪", question: "Ta récupération après un effort ?", type: "scale" },
    { key: "fat_brouillard", label: "Brouillard mental", icon: "🧠", question: "As-tu du brouillard mental / difficultés de concentration ?", type: "scale" },
    { key: "fat_douleurs_musc", label: "Douleurs musculaires", icon: "🔥", question: "Niveau de douleurs musculaires ?", type: "scale" },
    { key: "fat_repos", label: "Temps de repos", icon: "🛋️", question: "Combien d'heures passées allongée / au repos ?", type: "text" },
    { key: "fat_post_exertion", label: "Post-exertion", icon: "⚡", question: "Te sens-tu pire après un effort physique ou mental ?", type: "oui_non" },
    { key: "fat_appetit", label: "Appétit", icon: "🥗", question: "Comment est ton appétit cette semaine ?", type: "scale" },
  ],
  surmenage: [
    { key: "sur_charge", label: "Charge mentale", icon: "🧠", question: "Comment est ta charge mentale cette semaine ?", type: "scale" },
    { key: "sur_deconnexion", label: "Capacité à déconnecter", icon: "📴", question: "Arrives-tu à déconnecter du travail / des obligations ?", type: "scale" },
    { key: "sur_tensions", label: "Tensions physiques", icon: "💆", question: "Où ressens-tu des tensions physiques ?", type: "text" },
    { key: "sur_ecrans", label: "Temps d'écrans", icon: "📱", question: "Combien d'heures d'écrans par jour en moyenne ?", type: "text" },
    { key: "sur_accomplissement", label: "Sentiment d'accomplissement", icon: "✅", question: "Te sens-tu accomplie cette semaine ?", type: "scale" },
    { key: "sur_relations", label: "Relations sociales", icon: "👥", question: "As-tu pu voir des proches / t'es-tu sentie isolée ?", type: "scale" },
  ],
  poids_general: [
    { key: "poids_appetit", label: "Appétit", icon: "🥗", question: "Comment est ton appétit cette semaine ?", type: "scale" },
    { key: "poids_fringales", label: "Fringales", icon: "🍬", question: "As-tu eu des fringales ? Lesquelles ?", type: "text" },
    { key: "poids_retention", label: "Rétention d'eau", icon: "⚖️", question: "Ressens-tu de la rétention d'eau / gonflements ?", type: "scale" },
    { key: "poids_activite", label: "Activité physique", icon: "🏃", question: "Quelle activité physique cette semaine ? Durée ?", type: "text" },
    { key: "poids_emotionnel", label: "Alimentation émotionnelle", icon: "💭", question: "As-tu mangé sous l'effet des émotions ?", type: "oui_non" },
    { key: "poids_restriction", label: "Cycles restriction/excès", icon: "🔄", question: "As-tu alterné restriction et excès alimentaires ?", type: "oui_non" },
    { key: "poids_rapport_corps", label: "Rapport au corps", icon: "🪞", question: "Comment te sens-tu dans ton corps cette semaine ?", type: "text" },
  ],
  retention: [
    { key: "ret_gonflement", label: "Gonflements", icon: "⚖️", question: "Où ressens-tu des gonflements ? (jambes, ventre, visage…)", type: "text" },
    { key: "ret_alimentation", label: "Sel / Sucre consommés", icon: "🥗", question: "As-tu consommé beaucoup de sel ou de sucre ?", type: "scale" },
    { key: "ret_eau", label: "Hydratation", icon: "💧", question: "As-tu bien bu de l'eau cette semaine ?", type: "scale" },
  ],
  digestif: [
    { key: "dig_transit", label: "Transit", icon: "🌿", question: "Comment est ton transit ? (normal, constipation, diarrhées)", type: "text" },
    { key: "dig_ballonnements", label: "Ballonnements", icon: "💨", question: "Niveau de ballonnements ?", type: "scale" },
    { key: "dig_douleurs_repas", label: "Douleurs après repas", icon: "🔥", question: "As-tu des douleurs / gêne après les repas ?", type: "oui_non" },
    { key: "dig_aliments", label: "Aliments déclencheurs", icon: "🥗", question: "As-tu identifié des aliments qui déclenchent des symptômes ?", type: "text" },
    { key: "dig_bristol", label: "Consistance selles (Bristol)", icon: "📊", question: "Type de selles cette semaine (échelle de Bristol 1-7) ?", type: "text" },
    { key: "dig_dernier_repas", label: "Heure dernier repas", icon: "🕐", question: "À quelle heure mange-tu ton dernier repas ?", type: "text" },
    { key: "dig_mastication", label: "Mastication / Vitesse", icon: "🍽️", question: "Manges-tu rapidement ou lentement ?", type: "text" },
  ],
  peau_profil: [
    { key: "peau_etat", label: "État peau général", icon: "✨", question: "Comment est l'état général de ta peau cette semaine ?", type: "scale" },
    { key: "peau_acne", label: "Poussées d'acné", icon: "🔍", question: "As-tu eu des poussées d'acné ? Où ?", type: "text" },
    { key: "peau_alim", label: "Lien alimentation/peau", icon: "🥗", question: "As-tu remarqué un lien entre ce que tu as mangé et ta peau ?", type: "text" },
    { key: "peau_stress", label: "Lien stress/peau", icon: "😮‍💨", question: "Le stress a-t-il impacté ta peau cette semaine ?", type: "oui_non" },
    { key: "peau_hydratation", label: "Hydratation", icon: "💧", question: "Combien de verres d'eau par jour ?", type: "text" },
    { key: "peau_cycle", label: "Lien cycle/peau", icon: "🌸", question: "Ta peau change-t-elle selon la phase du cycle ?", type: "text" },
    { key: "peau_produits", label: "Produits utilisés", icon: "🧴", question: "Quels produits as-tu utilisé sur ta peau cette semaine ?", type: "text" },
    { key: "peau_soleil", label: "Exposition soleil", icon: "☀️", question: "T'es-tu exposée au soleil cette semaine ?", type: "oui_non" },
  ],
  mental: [
    { key: "ment_stress", label: "Niveau de stress", icon: "😮‍💨", question: "Ton niveau de stress global cette semaine ?", type: "scale" },
    { key: "ment_ruminations", label: "Ruminations", icon: "🌀", question: "As-tu eu des pensées répétitives / ruminations ?", type: "scale" },
    { key: "ment_angoisses", label: "Crises d'angoisse", icon: "💨", question: "Combien de crises d'angoisse cette semaine ?", type: "text" },
    { key: "ment_relaxation", label: "Techniques de relaxation", icon: "🧘", question: "As-tu pratiqué des techniques de relaxation ? Lesquelles ?", type: "text" },
    { key: "ment_relations", label: "Qualité des relations", icon: "👥", question: "Comment sont tes relations sociales cette semaine ?", type: "scale" },
    { key: "ment_controle", label: "Sentiment de contrôle", icon: "🎯", question: "Te sens-tu en contrôle de ta vie / tes émotions ?", type: "scale" },
  ],
  sommeil_profil: [
    { key: "som_endormissement", label: "Endormissement", icon: "🌙", question: "As-tu du mal à t'endormir ?", type: "scale" },
    { key: "som_reveils", label: "Réveils nocturnes", icon: "⏰", question: "Combien de réveils nocturnes ?", type: "text" },
    { key: "som_qualite", label: "Qualité du sommeil", icon: "💤", question: "Ton sommeil est-il récupérateur ?", type: "scale" },
    { key: "som_cauchemars", label: "Cauchemars", icon: "😨", question: "As-tu eu des cauchemars ?", type: "oui_non" },
    { key: "som_heure_coucher", label: "Heure de coucher", icon: "🕐", question: "À quelle heure t'es-tu couchée en moyenne ?", type: "text" },
  ],
};

const PROFILS = [
  { groupe: "Cycle hormonal", sousProfiles: [
    { key: "spm", label: "SPM", priorites: ["humeur", "anxiete", "douleurs", "sommeil", "energie"] },
    { key: "sopk", label: "SOPK", priorites: ["energie", "douleurs", "alimentation", "poids", "sommeil"] },
    { key: "endometriose", label: "Endométriose", priorites: ["douleurs", "energie", "humeur", "sommeil"] },
    { key: "fertilite", label: "Fertilité", priorites: ["alimentation", "anxiete", "energie", "sommeil"] },
    { key: "menopause", label: "Ménopause", priorites: ["sommeil", "humeur", "anxiete", "energie", "douleurs"] },
  ]},
  { groupe: "Énergie & Fatigue", sousProfiles: [
    { key: "fatigue", label: "Fatigue chronique", priorites: ["energie", "sommeil", "alimentation", "digestion", "humeur"] },
    { key: "surmenage", label: "Surmenage", priorites: ["energie", "anxiete", "sommeil", "alimentation", "humeur"] },
  ]},
  { groupe: "Poids & Corps", sousProfiles: [
    { key: "poids_general", label: "Poids", priorites: ["alimentation", "energie", "digestion", "poids", "humeur"] },
    { key: "retention", label: "Rétention d'eau", priorites: ["poids", "alimentation", "digestion"] },
  ]},
  { groupe: "Digestif", sousProfiles: [
    { key: "digestif", label: "Troubles digestifs", priorites: ["digestion", "alimentation", "douleurs", "energie", "peau"] },
  ]},
  { groupe: "Peau", sousProfiles: [
    { key: "peau_profil", label: "Problèmes de peau", priorites: ["peau", "alimentation", "digestion", "humeur"] },
  ]},
  { groupe: "Bien-être mental", sousProfiles: [
    { key: "mental", label: "Stress & Anxiété", priorites: ["anxiete", "humeur", "sommeil", "energie", "alimentation"] },
  ]},
  { groupe: "Sommeil", sousProfiles: [
    { key: "sommeil_profil", label: "Troubles du sommeil", priorites: ["sommeil", "anxiete", "energie", "humeur"] },
  ]},
];

const SC = [
  { v: 1, label: "Pas top", color: "#B5583A" },
  { v: 2, label: "Difficile", color: "#C4784A" },
  { v: 3, label: "Moyen", color: "#B8A05A" },
  { v: 4, label: "Bien", color: "#6A9E7A" },
  { v: 5, label: "Super bien", color: "#4A8E6A" },
];

const P = {
  pBg: "#1C1410", pSurface: "rgba(255,245,235,0.05)", pSurface2: "rgba(255,245,235,0.09)",
  pBorder: "rgba(255,245,235,0.1)", pBorder2: "rgba(255,245,235,0.18)",
  pText: "rgba(255,245,235,0.92)", pTextMid: "rgba(255,245,235,0.5)", pTextDim: "rgba(255,245,235,0.25)",
  pAccent: "#C8856C", pAccentDim: "rgba(200,133,108,0.15)", pAccentBorder: "rgba(200,133,108,0.3)",
  pGreen: "#7A9E82", pGreenDim: "rgba(122,158,130,0.15)",
  cBg: "#E8DDD0", cSurface: "#F5EDE2", cSurface2: "#DDD0C0", cNavBg: "#8A7560",
  cBorder: "rgba(44,28,12,0.13)", cBorder2: "rgba(44,28,12,0.22)",
  cText: "#1E1208", cTextMid: "rgba(30,18,8,0.6)", cTextDim: "rgba(30,18,8,0.38)",
  cAccent: "#8A5A2A", cGreen: "#4A7A5A", cGreenDim: "rgba(74,122,90,0.15)", cGreenBorder: "rgba(74,122,90,0.3)",
  cTerra: "#B5583A", cTerraDim: "rgba(181,88,58,0.12)",
  serif: "'Cormorant Garamond', Georgia, serif", sans: "'DM Sans', sans-serif",
  shadowRaised: "0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25)",
  shadowInner: "inset 0 2px 5px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
  shadowElevated: "0 0 0 1px rgba(200,133,108,0.2), 0 8px 28px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)",
  shadowAccent: "0 4px 18px rgba(200,133,108,0.3), 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
  shadowGlow: "0 0 20px rgba(200,133,108,0.2), 0 4px 12px rgba(0,0,0,0.3)",
};

const CHART_JS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";

// ─── PDF ANAMNÈSE — téléchargement direct (plus de window.print) ──────────────
const downloadAnamnesePDF = (anamnese, prenom) => {
  const text = anamnese.pdfText || "";
  const date = new Date(anamnese.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Anamnèse — ${prenom}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Cormorant+Garamond:wght@500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; color: #1C1008; background: #fff; padding: 40px 48px; font-size: 12px; line-height: 1.7; }
  .header { border-bottom: 2px solid #B5583A; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header h1 { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #B5583A; font-weight: 600; }
  .header .meta { font-size: 11px; color: rgba(28,16,8,0.5); text-align: right; }
  pre { white-space: pre-wrap; font-family: 'DM Sans', sans-serif; font-size: 12px; line-height: 1.8; color: #1C1008; }
  @media print { body { padding: 20px 24px; } @page { margin: 1.5cm; size: A4; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Questionnaire de santé</h1>
    <p style="font-size:13px;color:rgba(28,16,8,0.6);margin-top:4px;">${prenom}</p>
  </div>
  <div class="meta">
    <p>Meije Delmonte — Naturopathe fonctionnelle</p>
    <p>Rempli le ${date}</p>
  </div>
</div>
<pre>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anamnese_${(prenom || "cliente").toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: ${P.pBg}; -webkit-font-smoothing: antialiased; }
  input, textarea, button, select { font-family: ${P.sans}; }
  input:focus, textarea:focus { outline: none; }
  button { cursor: pointer; }
  .card-raised-dark { box-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25) !important; transition: box-shadow 0.2s, transform 0.2s !important; }
  .card-raised-dark:hover { box-shadow: 0 1px 0 rgba(255,255,255,0.07), 0 8px 20px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3) !important; transform: translateY(-1px); }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @media (max-width: 768px) { .prat-grid { grid-template-columns: 1fr !important; } }
  @media (min-width: 1024px) { .page-inner { max-width: 720px !important; } .prat-inner { max-width: 900px !important; } }
  .card-raised { box-shadow: 0 2px 8px rgba(44,28,16,0.08), 0 1px 2px rgba(44,28,16,0.05), inset 0 1px 0 rgba(255,255,255,0.7) !important; }
  .card-elevated { box-shadow: 0 6px 20px rgba(44,28,16,0.12), 0 2px 6px rgba(44,28,16,0.07), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(44,28,16,0.03) !important; }
  .card-elevated-dark { box-shadow: 0 6px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,245,235,0.08) !important; }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 16px); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .slide-up { animation: slideUp 0.35s ease forwards; }
`;

const sendEmail = async (templateId, params) => {
  try {
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_PUBLIC);
      await window.emailjs.send(EMAILJS_SERVICE, templateId, params);
    }
  } catch (e) { console.error("Email error:", e); }
};

const wk = () => {
  const n = new Date(); const s = new Date(n);
  s.setDate(n.getDate() - n.getDay() + 1);
  const mois = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
  return "Semaine du " + s.getDate() + " " + mois[s.getMonth()];
};

const initJournalAlimentaire = () =>
  JOURS_SEMAINE.reduce((acc, jour) => ({
    ...acc,
    [jour]: [
      { heure: "", texte: "", repas: "Matin" },
      { heure: "", texte: "", repas: "Midi" },
      { heure: "", texte: "", repas: "Soir" },
    ]
  }), {});

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:P.pAccent, color:"#1C1410", padding:"12px 22px", borderRadius:30, fontFamily:P.sans, fontSize:13, fontWeight:500, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(0,0,0,0.25)", animation:"toastIn 0.3s ease forwards" }}>{message}</div>;
}

function ScoreDot({ value, size = 36 }) {
  const s = SC.find(x => x.v === value);
  return <div style={{ width:size, height:size, borderRadius:"50%", background:s ? s.color+"22":"rgba(255,255,255,0.06)", border:`1.5px solid ${s ? s.color:"rgba(255,255,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", color:s ? s.color:"rgba(255,255,255,0.3)", fontFamily:P.serif, fontSize:size*0.42, fontWeight:600, flexShrink:0 }}>{value || "–"}</div>;
}

const iP = (theme = "p") => ({
  width:"100%", background:theme==="p"?P.pSurface:P.cSurface, border:`1px solid ${theme==="p"?P.pBorder:P.cBorder}`,
  borderRadius:10, padding:"12px 14px", color:theme==="p"?P.pText:P.cText, fontFamily:P.sans, fontSize:14,
  outline:"none", boxSizing:"border-box", transition:"border-color 0.2s", WebkitAppearance:"none",
});

const Btn = ({ onClick, variant="primary", theme="p", disabled, children, style={}, small }) => {
  const base = { padding:small?"8px 16px":"12px 22px", borderRadius:30, border:"none", cursor:disabled?"not-allowed":"pointer", fontFamily:P.sans, fontWeight:500, fontSize:small?12:14, transition:"all 0.2s", opacity:disabled?0.5:1, letterSpacing:"0.2px", ...style };
  const variants = {
    primary: { background:P.pAccent, color:"#1C1410", boxShadow:"0 3px 10px rgba(200,133,108,0.3), inset 0 1px 0 rgba(255,255,255,0.2)" },
    sage: { background:P.pGreen, color:"#1C1410", boxShadow:"0 3px 10px rgba(122,158,130,0.3), inset 0 1px 0 rgba(255,255,255,0.2)" },
    ghost: { background:theme==="p"?P.pSurface:P.cSurface2, color:theme==="p"?P.pTextMid:P.cTextMid, border:`1px solid ${theme==="p"?P.pBorder:P.cBorder}` },
    danger: { background:"rgba(181,88,58,0.15)", color:"#B5583A", border:"1px solid rgba(181,88,58,0.2)" },
    cPrimary: { background:P.cGreen, color:"#FFFDFB" },
    cGhost: { background:P.cSurface2, color:P.cTextMid, border:`1px solid ${P.cBorder}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...variants[variant]}}>{children}</button>;
};

function Section({ title, children, theme="p" }) {
  return <div style={{marginBottom:20}}><p style={{color:theme==="c"?P.cText:P.pText,fontSize:14,fontWeight:500,marginBottom:12,lineHeight:1.4}}>{title}</p>{children}</div>;
}

function EmptyState({ message, theme="p" }) {
  const bg=theme==="p"?P.pSurface:P.cSurface,bd=theme==="p"?P.pBorder:P.cBorder,td=theme==="p"?P.pTextDim:P.cTextDim;
  return <div style={{background:bg,borderRadius:12,border:`1px solid ${bd}`,padding:"24px 20px",textAlign:"center"}}><p style={{color:td,fontSize:14,lineHeight:1.6}}>{message}</p></div>;
}

function FileTag({ name, url, theme="p" }) {
  const bg=theme==="p"?P.pAccentDim:P.cGreenDim,bd=theme==="p"?P.pAccentBorder:P.cGreenBorder,col=theme==="p"?P.pAccent:P.cGreen;
  const inner=<div style={{display:"inline-flex",alignItems:"center",gap:6,background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:"6px 12px",marginBottom:6,marginRight:6}}><span style={{color:col,fontSize:12}}>📎</span><span style={{color:col,fontSize:12}}>{name}</span>{url&&<span style={{color:col,fontSize:10,opacity:0.7}}>↓</span>}</div>;
  if(url)return<a href={fixPdfUrl(url)} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>{inner}</a>;
  return inner;
}

function Chip({ label, color }) {
  return <span style={{background:color+"18",border:`1px solid ${color}44`,borderRadius:20,padding:"3px 10px",fontSize:11,color,fontFamily:P.sans}}>{label}</span>;
}

// ─── COMPOSANT QUESTION PROFIL ────────────────────────────────────────────────
function QuestionProfilItem({ q, value, onChange, theme="c" }) {
  const textColor = theme==="c" ? P.cText : P.pText;
  const dimColor = theme==="c" ? P.cTextDim : P.pTextDim;
  const surfaceColor = theme==="c" ? P.cSurface : P.pSurface;
  const borderColor = theme==="c" ? P.cBorder : P.pBorder;

  return (
    <div style={{marginBottom:16,background:surfaceColor,borderRadius:12,border:`1px solid ${borderColor}`,padding:"14px 16px"}}>
      <p style={{color:textColor,fontSize:13,fontWeight:500,marginBottom:10}}>{q.icon} {q.question}</p>
      {q.type === "scale" && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {SC.map(s => {
            const active = value === s.v;
            return <button key={s.v} onClick={() => onChange(active ? null : s.v)}
              style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${active?s.color:borderColor}`,background:active?s.color+"18":"transparent",color:active?s.color:dimColor,fontSize:12,fontFamily:P.sans,fontWeight:active?500:400}}>
              {s.v} · {s.label}
            </button>;
          })}
        </div>
      )}
      {q.type === "oui_non" && (
        <div style={{display:"flex",gap:8}}>
          {["Oui","Non","Parfois"].map(opt => {
            const active = value === opt;
            const col = opt==="Oui"?"#B5583A":opt==="Non"?"#4A8E6A":"#B8A05A";
            return <button key={opt} onClick={() => onChange(active ? null : opt)}
              style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${active?col:borderColor}`,background:active?col+"18":"transparent",color:active?col:dimColor,fontSize:12,fontFamily:P.sans,fontWeight:active?500:400}}>
              {opt}
            </button>;
          })}
        </div>
      )}
      {q.type === "text" && (
        <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder="Précise ici…" rows={2}
          style={{...iP(theme),resize:"vertical",fontSize:13}}/>
      )}
    </div>
  );
}

// ─── JOURNAL ALIMENTAIRE ──────────────────────────────────────────────────────
function JournalAlimentaire({ journal, onChange, theme="c" }) {
  const textColor = theme==="c" ? P.cText : P.pText;
  const dimColor = theme==="c" ? P.cTextDim : P.pTextDim;
  const surfaceColor = theme==="c" ? P.cSurface : P.pSurface;
  const surface2 = theme==="c" ? P.cSurface2 : P.pSurface2;
  const borderColor = theme==="c" ? P.cBorder : P.pBorder;
  const accentColor = theme==="c" ? P.cGreen : P.pAccent;

  const updateRepas = (jour, idx, field, val) => {
    const newJournal = { ...journal };
    newJournal[jour] = [...(newJournal[jour] || [])];
    newJournal[jour][idx] = { ...newJournal[jour][idx], [field]: val };
    onChange(newJournal);
  };

  return (
    <div>
      {JOURS_SEMAINE.map(jour => (
        <div key={jour} style={{marginBottom:16,background:surfaceColor,borderRadius:12,border:`1px solid ${borderColor}`,overflow:"hidden"}}>
          <div style={{background:surface2,padding:"10px 14px",borderBottom:`1px solid ${borderColor}`}}>
            <p style={{color:textColor,fontSize:13,fontWeight:600}}>{jour}</p>
          </div>
          <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
            {(journal?.[jour] || [{heure:"",texte:"",repas:"Matin"},{heure:"",texte:"",repas:"Midi"},{heure:"",texte:"",repas:"Soir"}]).map((repas, idx) => (
              <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{flexShrink:0,width:50}}>
                  <p style={{color:accentColor,fontSize:10,fontWeight:600,marginBottom:4}}>{repas.repas}</p>
                  <input value={repas.heure} onChange={e=>updateRepas(jour,idx,"heure",e.target.value)}
                    placeholder="12h" style={{width:"100%",background:surface2,border:`1px solid ${borderColor}`,borderRadius:8,padding:"6px 8px",color:textColor,fontSize:12,fontFamily:P.sans,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <textarea value={repas.texte} onChange={e=>updateRepas(jour,idx,"texte",e.target.value)}
                  placeholder={`Repas du ${repas.repas.toLowerCase()}…`} rows={2}
                  style={{flex:1,background:surface2,border:`1px solid ${borderColor}`,borderRadius:8,padding:"6px 10px",color:textColor,fontSize:12,fontFamily:P.sans,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PolitiqueConfidentialite({ onClose, theme="p" }) {
  const bg=theme==="p"?P.pBg:P.cBg, tx=theme==="p"?P.pText:P.cText, tm=theme==="p"?P.pTextMid:P.cTextMid;
  const td=theme==="p"?P.pTextDim:P.cTextDim, ac=theme==="p"?P.pAccent:P.cGreen;
  return (
    <div style={{ minHeight:"100vh", background:bg, padding:"40px 20px", fontFamily:P.sans }}>
      <div style={{ maxWidth:680, margin:"0 auto" }}>
        <Btn onClick={onClose} variant="ghost" theme={theme} small style={{ marginBottom:28 }}>← Retour</Btn>
        <h1 style={{ fontFamily:P.serif, fontSize:30, color:tx, fontWeight:300, marginBottom:6 }}>Politique de confidentialité</h1>
        <p style={{ color:td, fontSize:13, marginBottom:36 }}>Mise à jour : avril 2026</p>
        {[
          ["1. Responsable du traitement","Meije — Naturopathe fonctionnelle\nContact : lamenaturo@gmail.com"],
          ["2. Données collectées","Données d'identification : prénom, email\nDonnées de santé : questionnaire, symptômes, cycle, bilans"],
          ["3. Finalité","Préparer et personnaliser les consultations\nSuivre l'évolution de votre état de santé"],
          ["4. Base légale","Votre consentement explicite (art. 9 RGPD)"],
          ["5. Hébergement","Firebase (Google) · Cloudinary · Vercel · EmailJS"],
          ["6. Conservation","Durée de l'accompagnement + 3 ans."],
          ["7. Vos droits","Accès, rectification, effacement, portabilité.\nContact : lamenaturo@gmail.com"],
        ].map(([titre,texte]) => (
          <div key={titre} style={{ marginBottom:24 }}>
            <h2 style={{ color:ac, fontSize:14, fontWeight:500, marginBottom:8 }}>{titre}</h2>
            <p style={{ color:tm, fontSize:14, lineHeight:1.8, whiteSpace:"pre-line" }}>{texte}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingPage({ onEnter }) {
  const features = [
    { icon:"📋", title:"Ton questionnaire de santé", desc:"Remplis ton anamnèse et joins tes bilans directement depuis ton espace." },
    { icon:"🌿", title:"Ton protocole personnalisé", desc:"Une fois analysés, Meije te met à disposition ton protocole naturopathique." },
    { icon:"📝", title:"Suivi hebdomadaire", desc:"Chaque semaine, remplis ton suivi pour que Meije puisse ajuster ton accompagnement." },
    { icon:"📈", title:"Visualise tes progrès", desc:"Un graphique clair pour voir l'évolution de tes symptômes semaine après semaine." },
  ];
  return (
    <div style={{ minHeight:"100vh", background:P.pBg, fontFamily:P.sans, overflowX:"hidden", position:"relative", backgroundImage:"radial-gradient(ellipse at 20% 10%, rgba(200,133,108,0.14) 0%, transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(122,158,130,0.1) 0%, transparent 50%)" }}>
      <div style={{ position:"absolute", top:16, left:20, zIndex:10 }}>
        <a href="https://meijenaturo.fr" style={{ color:"rgba(242,232,218,0.3)", fontSize:12, fontFamily:P.sans, textDecoration:"none" }}>← meijenaturo.fr</a>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"60px 24px 40px", textAlign:"center" }}>
        <p style={{ fontSize:10, color:P.pAccent, letterSpacing:"3px", textTransform:"uppercase", marginBottom:20 }}>Naturopathie fonctionnelle</p>
        <h1 style={{ fontFamily:P.serif, fontSize:"clamp(36px, 8vw, 56px)", color:P.pText, fontWeight:300, lineHeight:1.15, marginBottom:16 }}>meije<span style={{ color:P.pAccent, fontStyle:"italic" }}>.</span>naturo</h1>
        <p style={{ color:P.pTextMid, fontSize:16, lineHeight:1.7, maxWidth:460, margin:"0 auto 12px", fontWeight:300 }}>Ton espace privé de suivi naturopathique.</p>
        <p style={{ color:P.pTextDim, fontSize:13, lineHeight:1.6, maxWidth:400, margin:"0 auto 36px" }}>Tu as reçu un accès de Meije ? Connecte-toi pour accéder à ton espace personnalisé.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={onEnter} style={{ background:P.pAccent, color:"#1C1410", border:"none", borderRadius:30, padding:"14px 32px", fontFamily:P.sans, fontSize:14, fontWeight:500, cursor:"pointer", boxShadow:"0 4px 14px rgba(200,133,108,0.3)" }}>Accéder à mon espace</button>
          <a href={INSTAGRAM} target="_blank" rel="noreferrer" style={{ background:P.pAccent, color:"#1C1410", border:"none", borderRadius:30, padding:"14px 32px", fontFamily:P.sans, fontSize:14, fontWeight:500, cursor:"pointer", boxShadow:"0 4px 14px rgba(200,133,108,0.3)", textDecoration:"none", display:"inline-block" }}>Mon Instagram</a>
        </div>
      </div>
      <div style={{ height:1, background:`linear-gradient(90deg, transparent, ${P.pBorder}, transparent)`, margin:"8px 0" }} />
      <div style={{ maxWidth:680, margin:"0 auto", padding:"32px 20px 0" }}>
        <div style={{ background:P.pAccentDim, border:`1px solid ${P.pAccentBorder}`, borderRadius:16, padding:"20px 24px", textAlign:"center" }}>
          <p style={{ color:P.pAccent, fontSize:13, fontWeight:500, marginBottom:6 }}>Tu n'as pas encore de compte ?</p>
          <p style={{ color:P.pTextDim, fontSize:13, lineHeight:1.6, marginBottom:12 }}>L'accès à cet espace est créé par Meije après confirmation de ton RDV.</p>
          <a href="https://meijenaturo.fr" target="_blank" rel="noreferrer" style={{ color:P.pAccent, fontSize:13, textDecoration:"none", fontWeight:500 }}>Prendre rendez-vous → meijenaturo.fr</a>
        </div>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"32px 20px" }}>
        <p style={{ fontFamily:P.serif, fontSize:22, color:P.pText, fontWeight:300, textAlign:"center", marginBottom:24 }}>Ton espace de suivi, <em style={{ fontStyle:"italic", color:P.pAccent }}>tout-en-un</em></p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:12 }}>
          {features.map(({icon,title,desc}) => (
            <div key={title} style={{ background:P.pSurface, border:`0.5px solid ${P.pBorder}`, borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,245,235,0.06)" }}>
              <span style={{ fontSize:20, display:"block", marginBottom:10 }}>{icon}</span>
              <p style={{ color:P.pText, fontSize:14, fontWeight:500, marginBottom:6 }}>{title}</p>
              <p style={{ color:P.pTextDim, fontSize:13, lineHeight:1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ textAlign:"center", padding:"16px 20px 40px", borderTop:`1px solid ${P.pBorder}` }}>
        <p style={{ color:P.pTextDim, fontSize:11 }}>Espace confidentiel · Données protégées · meije.naturo © 2026</p>
      </div>
    </div>
  );
}

function Auth({ onLogin, onBack }) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  if (showPrivacy) return <PolitiqueConfidentialite onClose={() => setShowPrivacy(false)} theme="p" />;
  const login = async () => {
    setError(""); setLoading(true);
    try {
      const c = await signInWithEmailAndPassword(auth, email, password);
      const d = await getDoc(doc(db, "users", c.user.uid));
      onLogin({ uid:c.user.uid, email, prénom:d.data()?.prénom||"", role:email===PRATICIENNE_EMAIL?"praticienne":"cliente" });
    } catch { setError("Email ou mot de passe incorrect."); }
    setLoading(false);
  };
  const reset = async () => {
    if (!email) { setError("Entre ton email d'abord."); return; }
    setError(""); setLoading(true);
    try { await sendPasswordResetEmail(auth, email); setResetSent(true); }
    catch { setError("Email introuvable."); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 20px 40px", background:P.pBg, backgroundImage:"radial-gradient(ellipse at 30% 20%, rgba(200,133,108,0.12) 0%, transparent 55%)" }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        {onBack && <button onClick={onBack} style={{ background:"none", border:"none", color:P.pTextDim, fontSize:12, fontFamily:P.sans, cursor:"pointer", display:"block", margin:"0 auto 20px" }}>← Retour à l'accueil</button>}
        <p style={{ fontFamily:P.serif, fontSize:32, color:P.pText, fontWeight:300, letterSpacing:"1px", marginBottom:6 }}>meije<span style={{ color:P.pAccent, fontStyle:"italic" }}>.</span>naturo</p>
        <p style={{ color:P.pTextDim, fontSize:12, letterSpacing:"2px", textTransform:"uppercase" }}>Espace de suivi personnalisé</p>
      </div>
      <div style={{ width:"100%", maxWidth:380, background:P.pSurface, borderRadius:20, border:`1px solid ${P.pBorder}`, padding:"28px 24px" }}>
        <p style={{ color:P.pTextDim, fontSize:11, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:20, textAlign:"center" }}>Connexion</p>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ color:P.pTextDim, fontSize:10, textTransform:"uppercase", letterSpacing:"1.5px", display:"block", marginBottom:6 }}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.fr" type="email" style={iP("p")} onKeyDown={e=>e.key==="Enter"&&login()} />
          </div>
          <div>
            <label style={{ color:P.pTextDim, fontSize:10, textTransform:"uppercase", letterSpacing:"1.5px", display:"block", marginBottom:6 }}>Mot de passe</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type="password" style={iP("p")} onKeyDown={e=>e.key==="Enter"&&login()} />
          </div>
          {error && <div style={{ color:"#C4614A", fontSize:13, background:"rgba(196,97,74,0.1)", borderRadius:10, padding:"10px 14px" }}>{error}</div>}
          {resetSent && <div style={{ color:P.pGreen, fontSize:13, background:P.pGreenDim, borderRadius:10, padding:"10px 14px" }}>Email envoyé !</div>}
          <Btn onClick={login} disabled={loading} style={{ marginTop:4, width:"100%" }}>{loading?"…":"Se connecter"}</Btn>
          <button onClick={reset} style={{ background:"none", border:"none", color:P.pTextDim, fontSize:12, cursor:"pointer", fontFamily:P.sans, textAlign:"center", textDecoration:"underline", padding:"4px 0" }}>Mot de passe oublié ?</button>
        </div>
      </div>
      <div style={{ marginTop:20, textAlign:"center" }}>
        <p style={{ color:P.pTextDim, fontSize:12 }}>Ton espace t'a été envoyé par Meije suite à ton accompagnement.</p>
        <p style={{ color:P.pTextDim, fontSize:11, marginTop:12 }}>
          Suivi confidentiel ·{" "}
          <button onClick={()=>setShowPrivacy(true)} style={{ background:"none", border:"none", color:P.pTextDim, fontSize:11, cursor:"pointer", fontFamily:P.sans, textDecoration:"underline" }}>Politique de confidentialité</button>
        </p>
      </div>
    </div>
  );
}

// ─── GRAPHIQUES ───────────────────────────────────────────────────────────────
let chartJsLoaded = false;
function loadChartJs(cb) {
  if (window.Chart) { cb(); return; }
  if (chartJsLoaded) { const wait = setInterval(() => { if (window.Chart) { clearInterval(wait); cb(); } }, 50); return; }
  chartJsLoaded = true;
  const s = document.createElement("script"); s.src = CHART_JS_CDN; s.onload = cb; document.head.appendChild(s);
}

const CHART_COLORS = {
  sommeil:"#C8856C", energie:"#E8B89A", humeur:"#7A9E82", anxiete:"#9E8A7A",
  douleurs:"#B5583A", digestion:"#6A9E7A", alimentation:"#C4A882", peau:"#B8956A",
  poids:"#A89060", hydratation:"#7AB8C8", activite:"#8A9E7A", _avg:"#C8856C",
};

function EvolutionChart({ entries, activeKeys, theme="c" }) {
  const [id] = useState(`evo-${Math.random().toString(36).slice(2,7)}`);
  const chartRef = useCallback(node => {
    if (!node) return;
    loadChartJs(() => {
      if (node._chartInstance) { node._chartInstance.destroy(); }
      const isDark = theme === "p";
      const gridColor = isDark ? "rgba(255,245,235,0.06)" : "rgba(44,28,16,0.08)";
      const tickColor = isDark ? "rgba(255,245,235,0.3)" : "rgba(44,28,16,0.35)";
      const tooltipBg = isDark ? "#2A1A10" : "#F5EDE2";
      const tooltipText = isDark ? "rgba(255,245,235,0.9)" : "#1E1208";
      const getAvg = e => { const vs = TI.map(i => e.scores?.[i.key]).filter(Boolean); return vs.length ? Math.round(vs.reduce((a,b) => a+b, 0) / vs.length * 10) / 10 : null; };
      const KEYS = activeKeys.length ? activeKeys : ["_avg"];
      const datasets = KEYS.map(key => {
        const color = CHART_COLORS[key] || "#C8856C";
        const data = key === "_avg" ? entries.map(e => getAvg(e)) : entries.map(e => e.scores?.[key] ?? null);
        const isAvg = key === "_avg";
        return { label: isAvg ? "Moyenne globale" : (TI.find(t => t.key === key)?.label || key), data, borderColor: color, backgroundColor: color + (isAvg ? "18" : "10"), borderWidth: isAvg ? 2 : 1.5, pointBackgroundColor: color, pointRadius: isAvg ? 4 : 3.5, pointHoverRadius: 6, tension: 0.4, fill: isAvg, spanGaps: true };
      });
      const labels = entries.map(e => { const d = new Date(e.date); return `${d.getDate()}/${d.getMonth()+1}`; });
      node._chartInstance = new window.Chart(node, {
        type: "line", data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: tooltipBg, borderColor: "rgba(200,133,108,0.3)", borderWidth: 1, titleColor: tooltipText, bodyColor: isDark ? "rgba(255,245,235,0.6)" : "rgba(44,28,16,0.6)", callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y?.toFixed(1)}/5` } } }, scales: { x: { grid: { color: gridColor, lineWidth: 0.5 }, ticks: { font: { size: 10 }, color: tickColor, maxRotation: 0, autoSkip: entries.length > 8 }, border: { display: false } }, y: { min: 1, max: 5, grid: { color: gridColor, lineWidth: 0.5 }, ticks: { stepSize: 1, font: { size: 10 }, color: tickColor }, border: { display: false } } } },
      });
    });
  }, [entries, activeKeys, theme]);

  const borderColor = theme === "c" ? P.cBorder : P.pBorder;
  const bg = theme === "c" ? P.cSurface : P.pSurface;
  const dimColor = theme === "c" ? P.cTextDim : P.pTextDim;
  if (!entries || entries.length < 2) return <div style={{ background:bg, border:`1px solid ${borderColor}`, borderRadius:12, padding:"20px", textAlign:"center" }}><p style={{ color:dimColor, fontSize:13 }}>Au moins 2 semaines de suivi sont nécessaires.</p></div>;
  const KEYS = activeKeys.length ? activeKeys : ["_avg"];
  return (
    <div style={{ background:bg, border:`1px solid ${borderColor}`, borderRadius:14, padding:"16px", overflow:"hidden" }}>
      <div style={{ position:"relative", width:"100%", height:200 }}><canvas ref={chartRef} /></div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:10, paddingTop:10, borderTop:`1px solid ${borderColor}` }}>
        {KEYS.map(key => { const color = CHART_COLORS[key] || "#C8856C"; const label = key === "_avg" ? "Moyenne globale" : (TI.find(t => t.key === key)?.label || key); return <div key={key} style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:10, borderRadius:"50%", background:color }} /><span style={{ fontSize:10, color:dimColor }}>{label}</span></div>; })}
      </div>
    </div>
  );
}

function ChartSelector({ entries, theme="c" }) {
  const allKeys=[{key:"_avg",label:"Moyenne globale",icon:"📊"},...TI.map(t=>({key:t.key,label:t.label,icon:t.icon}))];
  const [selected,setSelected]=useState(["_avg"]);
  const toggle=key=>setSelected(prev=>prev.includes(key)?(prev.length>1?prev.filter(k=>k!==key):prev):[...prev,key]);
  const borderColor=theme==="c"?P.cBorder:P.pBorder, activeBg=theme==="c"?P.cGreenDim:P.pAccentDim;
  const activeColor=theme==="c"?P.cGreen:P.pAccent, activeEdge=theme==="c"?P.cGreenBorder:P.pAccentBorder;
  const hasData=key=>entries.some(e=>key==="_avg"?TI.some(t=>e.scores?.[t.key]):e.scores?.[key]);
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
        {allKeys.filter(k=>hasData(k.key)).map(({key,label,icon})=>{
          const active=selected.includes(key);
          return <button key={key} onClick={()=>toggle(key)} style={{ padding:"6px 12px", borderRadius:20, border:`1.5px solid ${active?activeEdge:borderColor}`, background:active?activeBg:"transparent", color:active?activeColor:(theme==="c"?P.cTextMid:P.pTextMid), fontFamily:P.sans, fontSize:11, fontWeight:active?500:400, cursor:"pointer" }}>{icon} {label}</button>;
        })}
      </div>
      <EvolutionChart entries={entries} activeKeys={selected} theme={theme}/>
    </div>
  );
}

function BottomNav({ items, active, onChange, theme }) {
  const bg=theme==="p"?P.pBg:(P.cNavBg||P.cSurface2), border=theme==="p"?P.pBorder:P.cBorder;
  const activeColor=theme==="p"?P.pAccent:P.cGreen, inactiveColor=theme==="p"?P.pTextDim:P.cTextDim;
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:theme==="p"?"linear-gradient(to top,#160E06,#1E1408)":bg, borderTop:`1px solid ${theme==="p"?"rgba(200,133,108,0.2)":border}`, boxShadow:theme==="p"?"0 -4px 20px rgba(0,0,0,0.5)":"0 -2px 10px rgba(0,0,0,0.15)", display:"flex", paddingBottom:"env(safe-area-inset-bottom, 8px)", zIndex:100 }}>
      {items.map(({key,label,icon,badge})=>{
        const isActive=active===key;
        return <button key={key} onClick={()=>onChange(key)} style={{ flex:1, border:"none", background:isActive&&theme==="p"?"rgba(200,133,108,0.08)":"none", padding:"12px 4px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:isActive?activeColor:inactiveColor, fontFamily:P.sans, fontSize:10, fontWeight:isActive?600:400, letterSpacing:isActive?"0.5px":"0", transition:"all 0.2s", position:"relative", borderRadius:"12px 12px 0 0" }}>
          <span style={{ fontSize:24, lineHeight:1, position:"relative", filter:isActive&&theme==="p"?"drop-shadow(0 0 8px rgba(200,133,108,0.6))":isActive?"drop-shadow(0 0 6px rgba(74,122,90,0.5))":"none", transition:"filter 0.2s" }}>
            {icon}{badge>0&&<span style={{ position:"absolute", top:-2, right:-4, width:8, height:8, background:activeColor, borderRadius:"50%", display:"block" }}/>}
          </span>
          <span>{label}</span>
        </button>;
      })}
    </div>
  );
}

// ─── ESPACE CLIENTE ───────────────────────────────────────────────────────────
const CLIENT_NAV = [
  { key:"home", label:"Accueil", icon:"🏠" },
  { key:"suivi", label:"Suivi", icon:"📝" },
  { key:"evolution", label:"Évolution", icon:"📈" },
  { key:"protocole", label:"Protocole", icon:"🌿" },
  { key:"moi", label:"Mon dossier", icon:"👤" },
];

function Cliente({ user, onLogout }) {
  const [entries,setEntries]=useState([]);const [messages,setMessages]=useState([]);
  const [anamneses,setAnamneses]=useState([]);const [complements,setComplements]=useState([]);
  const [protocoles,setProtocoles]=useState([]);const [documents,setDocuments]=useState([]);
  const [userProfil,setUserProfil]=useState({profils:[],axesManuel:[],axesExclus:[]});
  const [view,setView]=useState("home");const [clientFolder,setClientFolder]=useState(null);
  const [scores,setScores]=useState({});const [notes,setNotes]=useState({});
  const [scoresProfi,setScoresProfi]=useState({});
  const [cyclePhase,setCyclePhase]=useState("");const [cycleNote,setCycleNote]=useState("");
  const [complementsPris,setComplementsPris]=useState({});
  const [humeur,setHumeur]=useState("");const [confidences,setConfidences]=useState("");
  const [commentaireCliente,setCommentaireCliente]=useState("");
  const [journalAlimentaire,setJournalAlimentaire]=useState(initJournalAlimentaire());
  const [uploadDocs,setUploadDocs]=useState([]);const [uploadingDocs,setUploadingDocs]=useState(false);
  const [saved,setSaved]=useState(false);const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState("");const [anamneseView,setAnamneseView]=useState(false);
  const showToast=useCallback((msg)=>setToast(msg),[]);

  useEffect(()=>{
    const q=query(collection(db,"entries"),where("userUid","==",user.uid),orderBy("date","asc"));
    const u=onSnapshot(q,s=>{setEntries(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);});
    const q2=query(collection(db,"messages"),where("toUid","==",user.uid),orderBy("date","asc"));
    const u2=onSnapshot(q2,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))));
    const q3=query(collection(db,"anamneses"),where("userUid","==",user.uid),orderBy("date","asc"));
    const u3=onSnapshot(q3,s=>setAnamneses(s.docs.map(d=>({id:d.id,...d.data()}))));
    const q5=query(collection(db,"protocoles"),where("toUid","==",user.uid),orderBy("date","asc"));
    const u5=onSnapshot(q5,s=>setProtocoles(s.docs.map(d=>({id:d.id,...d.data()}))));
    const q6=query(collection(db,"documents"),where("userUid","==",user.uid),orderBy("date","asc"));
    const u6=onSnapshot(q6,s=>setDocuments(s.docs.map(d=>({id:d.id,...d.data()}))));
    const userRef=doc(db,"users",user.uid);
    const u4=onSnapshot(userRef,d=>{
      const data=d.data();
      if(data?.complements)setComplements(data.complements);
      setUserProfil({profils:data?.profils||[],axesManuel:data?.axesManuel||[],axesExclus:data?.axesExclus||[],visioLink:data?.visioLink||""});
    });
    return()=>{u();u2();u3();u4();u5();u6();};
  },[user.uid]);

  const uploadToCloudinaryClient=async(file,folder)=>{
    const fd=new FormData();fd.append("file",file);fd.append("upload_preset",UPLOAD_PRESET);fd.append("folder",folder);
    const isPDF=file?.type==="application/pdf";const endpoint=isPDF?"raw":"image";
    const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`,{method:"POST",body:fd});
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Erreur ${res.status}`);}
    const data=await res.json();if(!data.secure_url)throw new Error("Upload échoué");
    return{url:data.secure_url,name:file.name,type:file.type};
  };

  const doUploadDocs=async(files)=>{
    setUploadingDocs(true);const uploaded=[];
    for(const file of files){try{const r=await uploadToCloudinaryClient(file,"meije-naturo/suivis");uploaded.push(r);}catch(e){showToast("Erreur : "+e.message);}}
    setUploadDocs(prev=>[...prev,...uploaded]);setUploadingDocs(false);
  };

  const deleteDocument=async(docId)=>{
    if(!window.confirm("Supprimer ce document ?"))return;
    await deleteDoc(doc(db,"documents",docId));showToast("Document supprimé ✓");
  };

  const submit=async()=>{
    const entryData = {
      userUid:user.uid, userEmail:user.email, userPrénom:user.prénom,
      weekLabel:wk(), date:new Date().toISOString(),
      scores, notes, scoresProfi,
      cyclePhase, cycleNote, complementsPris,
      humeur_libre:humeur, confidences,
      commentaireCliente, commentaireDate: commentaireCliente ? new Date().toISOString() : "",
      journalAlimentaire, documents:uploadDocs,
    };
    await addDoc(collection(db,"entries"), entryData);
    try{await sendEmail(EMAILJS_TEMPLATE_BIENVENUE,{prenom:user.prénom,action:"a rempli son suivi",to_email:PRATICIENNE_EMAIL});}catch{}
    if(commentaireCliente){
      try{await sendEmail(EMAILJS_TEMPLATE_BIENVENUE,{prenom:user.prénom,action:"a laissé un commentaire sur son suivi",to_email:PRATICIENNE_EMAIL});}catch{}
    }
    setScores({});setNotes({});setScoresProfi({});setCyclePhase("");setCycleNote("");
    setComplementsPris({});setHumeur("");setConfidences("");setCommentaireCliente("");
    setJournalAlimentaire(initJournalAlimentaire());setUploadDocs([]);
    setSaved(true);showToast("Suivi envoyé à Meije ✓");
    setTimeout(()=>{setSaved(false);setView("home");},1800);
  };

  // Répondre à un commentaire de Meije
  const repondreCommentaire=async(entryId, reponse)=>{
    await updateDoc(doc(db,"entries",entryId),{reponsePraticienne:reponse,reponseDate:new Date().toISOString()});
    showToast("Réponse enregistrée ✓");
  };

  const lm=messages[messages.length-1];const hasAnamnese=anamneses.length>0;
  const profilsActifs = userProfil.profils || [];

  if(loading)return<div style={{minHeight:"100vh",background:P.cBg,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:P.serif,fontSize:18,color:P.cTextDim,fontWeight:300}}>Chargement…</p></div>;
  if(anamneseView)return<Anamnese user={user} onDone={()=>setAnamneseView(false)} readonly={false} existingData={anamneses[0]}/>;

  const pageStyle={minHeight:"100vh",background:P.cBg,paddingBottom:80,fontFamily:P.sans};
  const headerStyle={background:P.cSurface,borderBottom:`1px solid ${P.cBorder}`,padding:"16px 20px 14px",position:"sticky",top:0,zIndex:50};
  const inner={maxWidth:600,margin:"0 auto",padding:"20px 16px"};

  return (
    <div style={pageStyle}>
      {toast&&<Toast message={toast} onClose={()=>setToast("")}/>}
      <div style={headerStyle}>
        <div style={{maxWidth:600,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{fontFamily:P.serif,fontSize:20,color:P.cText,fontWeight:300,letterSpacing:"0.5px"}}>Bonjour <em style={{fontStyle:"italic",color:P.cGreen}}>{user.prénom}</em></p>
            <p style={{fontSize:11,color:P.cTextDim,letterSpacing:"1px",textTransform:"uppercase",marginTop:1}}>meije.naturo</p>
          </div>
          <button onClick={onLogout} style={{background:"none",border:"none",fontFamily:P.sans,fontSize:12,color:P.cTextDim,cursor:"pointer"}}>Déconnexion</button>
        </div>
      </div>

      {view==="home"&&(
        <div style={inner} className="fade-in">
          <div style={{marginBottom:24}}>
            <p style={{fontFamily:P.serif,fontSize:26,color:P.cText,fontWeight:300}}>Bonjour {user.prénom} 🌿</p>
            <p style={{color:P.cTextDim,fontSize:12,marginTop:4}}>Ton espace de suivi naturopathique</p>
          </div>
          {(()=>{
            const alerts=[];
            if(!hasAnamnese)alerts.push(<button key="qst" onClick={()=>setAnamneseView(true)} style={{width:"100%",background:P.cTerraDim,border:`1px solid rgba(181,88,58,0.25)`,borderRadius:14,padding:"14px 18px",marginBottom:10,textAlign:"left",cursor:"pointer"}}><p style={{fontSize:10,color:P.cTerra,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:4}}>📋 Action requise</p><p style={{color:P.cText,fontSize:13,fontWeight:500}}>Remplis ton questionnaire de santé →</p></button>);
            const lastEntry=entries[entries.length-1];const daysSince=lastEntry?Math.floor((Date.now()-new Date(lastEntry.date).getTime())/(1000*60*60*24)):99;
            if(daysSince>=6)alerts.push(<button key="suivi" onClick={()=>setView("suivi")} style={{width:"100%",background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:14,padding:"14px 18px",marginBottom:10,textAlign:"left",cursor:"pointer"}}><p style={{fontSize:10,color:P.cGreen,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:4}}>📝 Suivi de la semaine</p><p style={{color:P.cText,fontSize:13}}>C'est l'heure de remplir ton suivi →</p></button>);
            if(lm&&Date.now()-new Date(lm.date).getTime()<7*24*60*60*1000)alerts.push(<div key="msg" style={{background:P.cSurface,border:`1px solid ${P.cGreenBorder}`,borderRadius:14,padding:"14px 18px",marginBottom:10}}><p style={{fontSize:10,color:P.cGreen,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:4}}>💬 Nouveau message de Meije</p><p style={{color:P.cText,fontSize:13,lineHeight:1.6}}>{lm.text}</p></div>);
            // Notif réponse praticienne sur suivi
            const lastEntryWithReponse = [...entries].reverse().find(e => e.reponsePraticienne && e.reponseDate && Date.now()-new Date(e.reponseDate).getTime()<7*24*60*60*1000);
            if(lastEntryWithReponse) alerts.push(<div key="rep" style={{background:P.cSurface,border:`1px solid ${P.cGreenBorder}`,borderRadius:14,padding:"14px 18px",marginBottom:10}}><p style={{fontSize:10,color:P.cGreen,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:4}}>💬 Meije a répondu à ton suivi</p><p style={{color:P.cText,fontSize:13,lineHeight:1.6}}>{lastEntryWithReponse.reponsePraticienne}</p></div>);
            return alerts.length>0?<div style={{marginBottom:8}}>{alerts}</div>:null;
          })()}
          <p style={{color:P.cTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"2px",marginBottom:12}}>Mes dossiers</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:16}}>
            {[
              {key:"protocole",icon:"🌿",label:"Mon protocole",badge:protocoles.length>0&&Date.now()-new Date(protocoles[protocoles.length-1].date).getTime()<14*24*60*60*1000},
              {key:"suivi",icon:"📝",label:"Mon suivi",badge:false},
              {key:"documents",icon:"📁",label:"Mes documents",badge:false},
              {key:"questionnaire",icon:"📋",label:"Questionnaire",badge:!hasAnamnese},
              {key:"evolution",icon:"📈",label:"Mon évolution",badge:false},
              {key:"messages",icon:"💬",label:"Messages",badge:lm&&Date.now()-new Date(lm.date).getTime()<7*24*60*60*1000},
            ].map(({key,icon,label,badge})=>{
              const isOpen=clientFolder===key;
              return(
                <button key={key} onClick={()=>setClientFolder(isOpen?null:key)} style={{background:isOpen?"linear-gradient(135deg,rgba(138,90,42,0.15),rgba(138,90,42,0.05))":P.cSurface,border:`1px solid ${isOpen?"rgba(138,90,42,0.35)":P.cBorder}`,borderRadius:18,padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:10,cursor:"pointer",position:"relative",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:isOpen?"0 4px 18px rgba(138,90,42,0.2), inset 0 1px 0 rgba(255,255,255,0.15)":"0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"}}>
                  {badge&&<span style={{position:"absolute",top:10,right:10,width:8,height:8,borderRadius:"50%",background:P.cTerra}}/>}
                  <span style={{fontSize:28}}>{icon}</span>
                  <p style={{color:isOpen?P.cAccent:P.cTextMid,fontSize:12,fontWeight:isOpen?600:400,textAlign:"center",letterSpacing:"0.3px"}}>{label}</p>
                  <span style={{color:isOpen?P.cAccent:P.cTextDim,fontSize:10,transition:"transform 0.2s",display:"block",transform:isOpen?"rotate(180deg)":"none"}}>▾</span>
                </button>
              );
            })}
          </div>
          {clientFolder==="protocole"&&(<div style={{background:P.cSurface,borderRadius:16,border:`1px solid ${P.cBorder}`,padding:"20px",marginBottom:16}} className="fade-in">{protocoles.length===0?<p style={{color:P.cTextDim,fontSize:13,textAlign:"center"}}>Ton protocole arrive bientôt 🌿</p>:protocoles.map((p,i)=>(<div key={i} style={{marginBottom:i<protocoles.length-1?20:0}}><p style={{fontFamily:P.serif,fontSize:18,color:P.cText,marginBottom:8}}>{p.titre}</p><p style={{color:P.cTextMid,fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{p.contenu}</p>{p.fichiers?.map((f,j)=><a key={j} href={f.url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:10,background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:8,padding:"6px 12px",color:P.cGreen,fontSize:12,textDecoration:"none"}}>📄 {f.name}</a>)}</div>))}</div>)}
          {clientFolder==="suivi"&&(<div style={{background:P.cSurface,borderRadius:16,border:`1px solid ${P.cBorder}`,padding:"20px",marginBottom:16}} className="fade-in"><Btn variant="cPrimary" onClick={()=>setView("suivi")} style={{width:"100%",marginBottom:12}}>Remplir mon suivi de la semaine →</Btn>{entries.length>0&&<Btn variant="ghost" theme="c" onClick={()=>setView("historique")} style={{width:"100%"}}>Voir mon historique</Btn>}</div>)}
          {clientFolder==="documents"&&(<div style={{background:P.cSurface,borderRadius:16,border:`1px solid ${P.cBorder}`,padding:"20px",marginBottom:16}} className="fade-in"><Btn variant="cPrimary" onClick={()=>setView("docs")} style={{width:"100%"}}>Gérer mes documents →</Btn></div>)}
          {clientFolder==="questionnaire"&&(<div style={{background:P.cSurface,borderRadius:16,border:`1px solid ${P.cBorder}`,padding:"20px",marginBottom:16}} className="fade-in"><Btn variant="cPrimary" onClick={()=>setAnamneseView(true)} style={{width:"100%"}}>{hasAnamnese?"Modifier mon questionnaire →":"Remplir mon questionnaire →"}</Btn></div>)}
          {clientFolder==="evolution"&&(<div style={{background:P.cSurface,borderRadius:16,border:`1px solid ${P.cBorder}`,padding:"20px",marginBottom:16}} className="fade-in"><Btn variant="cPrimary" onClick={()=>setView("evolution")} style={{width:"100%"}}>Voir mon évolution →</Btn></div>)}
          {clientFolder==="messages"&&(<div style={{background:P.cSurface,borderRadius:16,border:`1px solid ${P.cBorder}`,padding:"20px",marginBottom:16}} className="fade-in">{messages.length===0?<p style={{color:P.cTextDim,fontSize:13,textAlign:"center"}}>Aucun message pour l'instant 🌿</p>:messages.slice().reverse().slice(0,5).map(m=>(<div key={m.id} style={{background:P.cSurface2,borderRadius:12,padding:"12px 14px",marginBottom:8}}><p style={{color:P.cText,fontSize:13,lineHeight:1.6}}>{m.text}</p><p style={{color:P.cTextDim,fontSize:11,marginTop:4}}>{new Date(m.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p></div>))}</div>)}
        </div>
      )}

      {view==="suivi"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:4}}>Suivi de la semaine</p>
          <p style={{color:P.cTextDim,fontSize:12,letterSpacing:"0.5px",marginBottom:24}}>{wk()}</p>

          {/* Compléments */}
          {complements.length>0&&(
            <Section title="Tes compléments cette semaine" theme="c">
              {complements.map((c,i)=>{
                const nom=typeof c==="string"?c:c.nom,lien=typeof c==="string"?"":c.lien,posologie=typeof c==="string"?"":c.posologie,codePromo=typeof c==="string"?"":c.codePromo;
                return(<div key={i} style={{marginBottom:14,background:P.cSurface,border:`1px solid ${P.cBorder}`,borderRadius:12,padding:"12px 14px"}}><p style={{color:P.cText,fontSize:14,fontWeight:500,marginBottom:posologie?4:8}}>{nom}</p>{posologie&&<p style={{color:P.cAccent,fontSize:12,marginBottom:8}}>💊 {posologie}</p>}<div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>{lien&&<a href={lien} target="_blank" rel="noreferrer" style={{color:P.cGreen,fontSize:12,textDecoration:"none"}}>→ Commander</a>}{codePromo&&<span style={{background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:6,padding:"2px 8px",color:P.cGreen,fontSize:11,fontWeight:500}}>🏷 Code : {codePromo}</span>}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Pris régulièrement","Pris irrégulièrement","Pas pris"].map(opt=>{const colors={"Pris régulièrement":"#4A8E6A","Pris irrégulièrement":"#B8A05A","Pas pris":"#B5583A"},active=complementsPris[nom]===opt;return<button key={opt} onClick={()=>setComplementsPris(p=>({...p,[nom]:opt}))} style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${active?colors[opt]:P.cBorder}`,background:active?colors[opt]+"18":"transparent",color:active?colors[opt]:P.cTextMid,fontSize:12,fontFamily:P.sans,fontWeight:active?500:400}}>{opt}</button>;})}</div></div>);
              })}
            </Section>
          )}

          {/* Phase du cycle */}
          <Section title="🌸 Où en es-tu dans ton cycle ?" theme="c">
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {PHASES_CYCLE.map(p=><button key={p} onClick={()=>setCyclePhase(p)} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${cyclePhase===p?P.cGreen:P.cBorder}`,background:cyclePhase===p?P.cGreenDim:"transparent",color:cyclePhase===p?P.cGreen:P.cTextMid,fontSize:13,fontFamily:P.sans}}>{p}</button>)}
            </div>
            <textarea value={cycleNote} onChange={e=>setCycleNote(e.target.value)} placeholder="Précisions sur ton cycle..." rows={2} style={{...iP("c"),resize:"vertical"}}/>
          </Section>

          {/* Tronc commun */}
          {(()=>{
            const axesExclus=userProfil.axesExclus||[];
            const toutesLesPriorites=[...new Set([(userProfil.profils||[]).flatMap(key=>{const s=PROFILS.flatMap(g=>g.sousProfiles).find(s=>s.key===key);return s?.priorites||[];}),...(userProfil.axesManuel||[])].flat())].filter(k=>!axesExclus.includes(k));
            const prioritaires=toutesLesPriorites.length>0?TI.filter(t=>toutesLesPriorites.includes(t.key)):TI;
            const secondaires=toutesLesPriorites.length>0?TI.filter(t=>!toutesLesPriorites.includes(t.key)):[];
            const renderQuestion=(item,isPrio)=>(<div key={item.key} style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><p style={{color:P.cText,fontSize:14,fontWeight:500}}>{item.icon} {item.question}</p>{isPrio&&toutesLesPriorites.length>0&&<span style={{background:P.cGreenDim,border:`0.5px solid ${P.cGreenBorder}`,borderRadius:20,padding:"2px 8px",fontSize:9,color:P.cGreen,fontWeight:500,textTransform:"uppercase",letterSpacing:"1px"}}>Prioritaire</span>}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{SC.map(s=>{const active=scores[item.key]===s.v;return<button key={s.v} onClick={()=>setScores(p=>({...p,[item.key]:s.v}))} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${active?s.color:P.cBorder}`,background:active?s.color+"18":"transparent",color:active?s.color:P.cTextMid,fontSize:13,fontFamily:P.sans,fontWeight:active?500:400}}>{s.v} · {s.label}</button>;})}</div><textarea value={notes[item.key]||""} onChange={e=>setNotes(p=>({...p,[item.key]:e.target.value}))} placeholder={`Précisions sur ${item.label.toLowerCase()}…`} rows={2} style={{...iP("c"),resize:"vertical"}}/></div>);
            return<>{prioritaires.map(item=>renderQuestion(item,true))}{secondaires.length>0&&<div style={{marginTop:8,marginBottom:16,borderTop:`1px solid ${P.cBorder}`,paddingTop:16}}><p style={{color:P.cTextDim,fontSize:11,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:14}}>Autres paramètres</p>{secondaires.map(item=>renderQuestion(item,false))}</div>}</>;
          })()}

          {/* Bloc spécifique par profil */}
          {profilsActifs.length > 0 && (() => {
            const questionsSpecifiques = profilsActifs.flatMap(profil => QUESTIONS_PROFIL[profil] || []);
            if(questionsSpecifiques.length === 0) return null;
            const profil = PROFILS.flatMap(g=>g.sousProfiles).find(s=>s.key===profilsActifs[0]);
            return (
              <div style={{marginTop:8,marginBottom:20,background:"rgba(74,122,90,0.05)",border:`1px solid ${P.cGreenBorder}`,borderRadius:14,padding:"16px"}}>
                <p style={{color:P.cGreen,fontSize:11,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:14,fontWeight:600}}>
                  🎯 Suivi {profilsActifs.map(k=>PROFILS.flatMap(g=>g.sousProfiles).find(s=>s.key===k)?.label).filter(Boolean).join(" · ")}
                </p>
                {questionsSpecifiques.map(q => (
                  <QuestionProfilItem key={q.key} q={q} value={scoresProfi[q.key]}
                    onChange={val => setScoresProfi(p=>({...p,[q.key]:val}))} theme="c"/>
                ))}
              </div>
            );
          })()}

          {/* Humeur globale */}
          <Section title="Comment tu te sens globalement ?" theme="c">
            <textarea value={humeur} onChange={e=>setHumeur(e.target.value)} placeholder="Fatiguée, stressée, en forme…" rows={3} style={{...iP("c"),resize:"vertical"}}/>
          </Section>

          {/* Journal alimentaire */}
          <div style={{marginBottom:20}}>
            <p style={{color:P.cText,fontSize:14,fontWeight:500,marginBottom:4}}>🥗 Journal alimentaire de la semaine</p>
            <p style={{color:P.cTextDim,fontSize:12,marginBottom:12}}>Note tes repas avec l'heure pour chaque jour</p>
            <JournalAlimentaire journal={journalAlimentaire} onChange={setJournalAlimentaire} theme="c"/>
          </div>

          {/* Confidences */}
          <Section title="Tu as quelque chose à ajouter ?" theme="c">
            <textarea value={confidences} onChange={e=>setConfidences(e.target.value)} placeholder="Une question, un détail…" rows={3} style={{...iP("c"),resize:"vertical"}}/>
          </Section>

          {/* Commentaire pour Meije */}
          <Section title="💬 Laisser un commentaire à Meije" theme="c">
            <textarea value={commentaireCliente} onChange={e=>setCommentaireCliente(e.target.value)} placeholder="Un mot, une question directement pour Meije sur ce suivi…" rows={3} style={{...iP("c"),resize:"vertical"}}/>
          </Section>

          {saved?<div style={{background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:12,padding:14,color:P.cGreen,textAlign:"center"}}>Suivi enregistré ✓</div>:<Btn onClick={submit} variant="cPrimary" style={{width:"100%",marginTop:8}}>Envoyer à Meije</Btn>}
        </div>
      )}

      {view==="protocole"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:20}}>Mon protocole</p>
          {protocoles.length===0?<EmptyState message="Ton protocole personnalisé apparaîtra ici après votre première consultation." theme="c"/>:[...protocoles].reverse().map(p=>(<div key={p.id} style={{background:P.cSurface,border:`1px solid ${P.cBorder}`,borderRadius:14,padding:"18px 20px",marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><p style={{fontFamily:P.serif,fontSize:18,color:P.cText,fontWeight:400}}>{p.titre}</p><span style={{color:P.cTextDim,fontSize:11}}>{new Date(p.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</span></div><p style={{color:P.cTextMid,fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{p.contenu}</p>{p.fichiers?.length>0&&<div style={{marginTop:14}}><p style={{color:P.cTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Fichiers joints</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{p.fichiers.map((f,i)=><a key={i} href={f.url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:8,padding:"8px 14px",color:P.cGreen,fontSize:12,textDecoration:"none"}}><span>{f.type?.includes("pdf")?"📄":"🖼"}</span><span>{f.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}</div></div>}</div>))}
        </div>
      )}

      {view==="evolution"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:4}}>Mon évolution</p>
          <p style={{color:P.cTextDim,fontSize:12,marginBottom:20}}>Tous tes paramètres de santé, semaine après semaine</p>
          {entries.length<2?<EmptyState message="Remplis au moins 2 semaines de suivi pour voir ton évolution." theme="c"/>:(
            <>{(()=>{const last=entries[entries.length-1],first=entries[0];const getAvg=e=>{const vs=TI.map(i=>e.scores?.[i.key]).filter(Boolean);return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;};const avgFirst=getAvg(first),avgLast=getAvg(last),diff=avgFirst&&avgLast?(avgLast-avgFirst).toFixed(1):null;return diff?(<div style={{background:diff>0?P.cGreenDim:P.cTerraDim,border:`1px solid ${diff>0?P.cGreenBorder:"rgba(181,88,58,0.2)"}`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:28}}>{diff>0?"📈":"📉"}</span><div><p style={{color:diff>0?P.cGreen:P.cTerra,fontWeight:500,fontSize:14}}>{diff>0?`+${diff} points depuis le début`:`${diff} points depuis le début`}</p><p style={{color:P.cTextMid,fontSize:12,marginTop:2}}>{entries.length} semaines · de {avgFirst?.toFixed(1)} à {avgLast?.toFixed(1)}</p></div></div>):null;})()}<ChartSelector entries={entries} theme="c"/></>
          )}
        </div>
      )}

      {view==="docs"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:6}}>Mes documents</p>
          <p style={{color:P.cTextMid,fontSize:13,marginBottom:24,lineHeight:1.6}}>Envoie tes bilans sanguins, photos, résultats…</p>
          <div style={{background:P.cSurface,borderRadius:14,border:`1px solid ${P.cBorder}`,padding:"18px 20px",marginBottom:20}}>
            <div style={{background:P.cGreenDim,border:`0.5px solid ${P.cGreenBorder}`,borderRadius:8,padding:"10px 14px",marginBottom:14}}><p style={{color:P.cGreen,fontSize:12}}>📎 Max 10 MB. Si trop lourd → <a href="https://ilovepdf.com" target="_blank" rel="noreferrer" style={{color:P.cGreen,fontWeight:500}}>ilovepdf.com</a></p></div>
            <input type="file" multiple accept="image/*,application/pdf" onChange={e=>doUploadDocs(Array.from(e.target.files))} style={{color:P.cTextMid,fontSize:13,display:"block",width:"100%",marginBottom:8}}/>
            {uploadingDocs&&<p style={{color:P.cGreen,fontSize:13,marginTop:10}}>Upload en cours…</p>}
            {uploadDocs.length>0&&<div style={{marginTop:14}}>{uploadDocs.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:8,padding:"8px 12px",marginBottom:6}}><span style={{color:P.cGreen,fontSize:12}}>📎 {d.name}</span><button onClick={()=>setUploadDocs(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:P.cTextMid,fontSize:18,cursor:"pointer",lineHeight:1}}>×</button></div>)}<Btn variant="cPrimary" onClick={async()=>{await addDoc(collection(db,"documents"),{userUid:user.uid,userEmail:user.email,date:new Date().toISOString(),files:uploadDocs});try{await sendEmail(EMAILJS_TEMPLATE_BIENVENUE,{prenom:user.prénom,action:"a partagé des documents",to_email:PRATICIENNE_EMAIL});}catch{}setUploadDocs([]);showToast("Documents envoyés ✓");}} style={{marginTop:12,width:"100%"}}>Envoyer à Meije</Btn></div>}
          </div>
          {documents.length>0&&(<div style={{marginTop:8}}><p style={{color:P.cTextMid,fontSize:12,marginBottom:10}}>Bilans déjà envoyés :</p>{documents.map(d=>(<div key={d.id} style={{background:P.cSurface,borderRadius:12,border:`1px solid ${P.cBorder}`,padding:"12px 16px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><p style={{color:P.cTextDim,fontSize:11}}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</p><button onClick={()=>deleteDocument(d.id)} style={{background:"none",border:"none",color:"#B5583A",fontSize:18,lineHeight:1,cursor:"pointer",padding:"0 4px"}}>×</button></div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{d.files?.map((f,i)=><a key={i} href={fixPdfUrl(f.url)} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:8,padding:"6px 10px",color:P.cGreen,fontSize:12,textDecoration:"none"}}><span>{f.type?.includes("image")?"🖼":"📄"}</span><span>{f.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}</div></div>))}</div>)}
        </div>
      )}

      {view==="moi"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:20}}>Mon dossier</p>
          <div style={{background:P.cSurface,borderRadius:16,border:`0.5px solid ${P.cBorder}`,padding:"20px",marginBottom:16}} className="card-raised">
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:P.cGreenDim,border:`1.5px solid ${P.cGreenBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:P.serif,fontSize:20,color:P.cGreen}}>{user.prénom?.[0]?.toUpperCase()||"?"}</div>
              <div><p style={{color:P.cText,fontSize:16,fontFamily:P.serif,fontWeight:400}}>{user.prénom}</p><p style={{color:P.cTextMid,fontSize:12,marginTop:2}}>{user.email}</p></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8}}>
              {[["Semaines",entries.length],["Protocoles",protocoles.length],["Documents",documents.length]].map(([l,v])=><div key={l} style={{background:P.cSurface2,borderRadius:10,padding:"10px 12px",textAlign:"center"}}><p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300}}>{v}</p><p style={{color:P.cTextDim,fontSize:10,marginTop:2}}>{l}</p></div>)}
            </div>
          </div>
          <Btn variant="ghost" theme="c" onClick={()=>setAnamneseView(true)} style={{width:"100%",marginBottom:10}}>{hasAnamnese?"Voir mon questionnaire":"Remplir mon questionnaire"}</Btn>
          <Btn variant="ghost" theme="c" onClick={()=>setView("docs")} style={{width:"100%",marginBottom:10}}>Mes documents</Btn>
          <Btn variant="ghost" theme="c" onClick={onLogout} style={{width:"100%",marginTop:6}}>Se déconnecter</Btn>
        </div>
      )}

      {view==="historique"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:20}}>Mon historique</p>
          {[...entries].reverse().map(e=>{
            const vs=TI.map(i=>e.scores?.[i.key]).filter(Boolean),avg=vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null,sc=avg?SC.find(x=>x.v===Math.round(avg)):null;
            return<div key={e.id} style={{background:P.cSurface,borderRadius:12,border:`1px solid ${P.cBorder}`,padding:"16px 18px",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div><p style={{color:P.cText,fontWeight:500,fontSize:14}}>{e.weekLabel}</p><p style={{color:P.cTextDim,fontSize:11,marginTop:2}}>{new Date(e.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p></div>{avg&&<div style={{background:sc?sc.color+"22":P.cSurface2,border:`1.5px solid ${sc?.color||P.cBorder}`,borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:P.serif,fontSize:16,color:sc?.color||P.cTextDim}}>{avg.toFixed(1)}</div>}</div>{e.cyclePhase&&<p style={{color:P.cAccent,fontSize:12,marginBottom:6}}>Phase : {e.cyclePhase}</p>}{e.commentaireCliente&&<div style={{background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:8,padding:"8px 12px",marginTop:8}}><p style={{color:P.cGreen,fontSize:11,marginBottom:4}}>Ton commentaire</p><p style={{color:P.cText,fontSize:13}}>{e.commentaireCliente}</p></div>}{e.reponsePraticienne&&<div style={{background:P.cTerraDim,border:`1px solid rgba(181,88,58,0.2)`,borderRadius:8,padding:"8px 12px",marginTop:6}}><p style={{color:P.cTerra,fontSize:11,marginBottom:4}}>Réponse de Meije</p><p style={{color:P.cText,fontSize:13}}>{e.reponsePraticienne}</p></div>}</div>;
          })}
        </div>
      )}

      <BottomNav items={CLIENT_NAV.map(item=>{let badge=0;if(item.key==="home"){if(lm&&Date.now()-new Date(lm.date).getTime()<7*24*60*60*1000)badge=1;if(protocoles.length>0&&Date.now()-new Date(protocoles[protocoles.length-1].date).getTime()<14*24*60*60*1000)badge++;}if(item.key==="protocole"&&protocoles.length>0&&Date.now()-new Date(protocoles[protocoles.length-1].date).getTime()<14*24*60*60*1000)badge=1;return{...item,badge};})} active={view} onChange={setView} theme="c"/>
    </div>
  );
}

// ─── FONCTION IA (inchangée) ──────────────────────────────────────────────────
async function genererProtocolesIA({ selected, documents, anamneses, entries, protocoles, setNewProtocole, setProtoPrat, showToast, setIaLoading, setIaStep, setIaError, db, setDoc, doc }) {
  setIaLoading(true); setIaError("");
  const bilans = [];
  documents.forEach(d => d.files?.forEach(f => bilans.push({ url: f.url, name: f.name, type: f.type })));
  anamneses.forEach(a => a.bilans?.forEach(b => bilans.push({ url: b.url, name: b.name, type: b.type })));
  if (bilans.length === 0) { setIaError("Aucun bilan ou document trouvé. Demande à " + selected.prenom + " d'uploader son bilan depuis son espace."); setIaLoading(false); return; }
  const anamneseTexte = anamneses.map(a => { if (!a.form) return ""; const f = a.form; return [f.problematique && `Problématique : ${f.problematique}`, f.objectifs3mois && `Objectifs : ${f.objectifs3mois}`, f.maladiesChroniques && `Antécédents : ${f.maladiesChroniques}`, f.medicaments && `Médicaments : ${f.medicaments}`, f.complementsActuels && `Compléments actuels : ${f.complementsActuels}`, f.qualiteSommeil && `Sommeil : ${f.qualiteSommeil}/10`, f.niveauStress && `Stress : ${f.niveauStress}/10`, f.dureeCycle && `Cycle : ${f.dureeCycle}j / règles ${f.dureeRegles}j`, f.intensiteDouleurs && `Douleurs : ${f.intensiteDouleurs}/10 — ${f.descriptionDouleurs}`, f.dejeunerType && `Déjeuner : ${f.dejeunerType}`, f.dinerType && `Dîner : ${f.dinerType}`].filter(Boolean).join("\n"); }).join("\n\n");
  const dernierSuivi = entries.length > 0 ? (() => { const e = entries[entries.length - 1]; return [e.weekLabel, e.cyclePhase && `Phase cycle : ${e.cyclePhase}`, ...TI.map(i => e.scores?.[i.key] ? `${i.label} : ${e.scores[i.key]}/5${e.notes?.[i.key] ? ` (${e.notes[i.key]})` : ""}` : null).filter(Boolean), e.humeur_libre && `Humeur : ${e.humeur_libre}`, e.confidences && `Ajout : ${e.confidences}`, e.commentaireCliente && `Commentaire : ${e.commentaireCliente}`].filter(Boolean).join("\n"); })() : "Pas encore de suivi rempli.";
  const toBase64 = async (url) => { try { const res = await fetch(url); const blob = await res.blob(); return new Promise((res2, rej) => { const r = new FileReader(); r.onload = () => res2(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); }); } catch { return null; } };
  setIaStep("Chargement des bilans…");
  const docsContent = [];
  const pdfs = bilans.filter(b => b.type?.includes("pdf") || b.url?.includes(".pdf")).slice(0, 3);
  const images = bilans.filter(b => b.type?.includes("image")).slice(0, 2);
  for (const pdf of pdfs) { const b64 = await toBase64(pdf.url); if (b64) docsContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 }, title: pdf.name }); }
  for (const img of images) { const b64 = await toBase64(img.url); if (b64) docsContent.push({ type: "image", source: { type: "base64", media_type: img.type || "image/jpeg", data: b64 } }); }
  const SYSTEM_CLIENT = getSystemClient(selected.prenom);
  const SYSTEM_PRAT = getSystemPraticienne(selected.prenom);
  try {
    setIaStep("Génération du protocole cliente…");
    const r1 = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ max_tokens: 4000, system: SYSTEM_CLIENT, messages: [{ role: "user", content: [{ type: "text", text: `Cliente : ${selected.prenom}\n\nAnamnèse :\n${anamneseTexte || "Non disponible"}\n\nDernier suivi hebdomadaire :\n${dernierSuivi}\n\nGénère le protocole cliente vulgarisé et bienveillant.` }, ...docsContent] }] }) });
    const d1 = await r1.json(); const protocoleCliente = d1.content?.find(b => b.type === "text")?.text || "";
    setIaStep("Génération du protocole praticienne…");
    const r2 = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ max_tokens: 4000, system: SYSTEM_PRAT, messages: [{ role: "user", content: [{ type: "text", text: `Cliente : ${selected.prenom}\n\nAnamnèse :\n${anamneseTexte || "Non disponible"}\n\nDernier suivi :\n${dernierSuivi}\n\nGénère le protocole praticienne technique et détaillé.` }, ...docsContent] }] }) });
    const d2 = await r2.json(); const protocolePraticienne = d2.content?.find(b => b.type === "text")?.text || "";
    setNewProtocole({ titre: `Protocole n°${protocoles.length + 1} — ${selected.prenom}`, contenu: protocoleCliente });
    if (protocolePraticienne) { await setDoc(doc(db, "notes_privees", `proto_ia_${selected.uid}`), { clientUid: selected.uid, type: "protocole_praticienne_ia", text: protocolePraticienne, date: new Date().toISOString() }); setProtoPrat(protocolePraticienne); }
    setIaStep(""); showToast("Protocoles générés ✓ Relis avant d'envoyer 🌿");
  } catch (e) { setIaError("Erreur lors de la génération : " + e.message); }
  setIaLoading(false);
}

// ─── ESPACE PRATICIENNE ───────────────────────────────────────────────────────
const PRAT_NAV = [
  { key:"clients", label:"Consultantes", icon:"👥" },
  { key:"messages", label:"Messages", icon:"💬" },
  { key:"profil", label:"Mon espace", icon:"🌿" },
];

function Praticienne({ user, onLogout }) {
  const [clients,setClients]=useState([]);const [recherche,setRecherche]=useState("");
  const [selected,setSelected]=useState(null);const [clientData,setClientData]=useState(null);
  const [entries,setEntries]=useState([]);const [messages,setMessages]=useState([]);
  const [anamneses,setAnamneses]=useState([]);const [protocoles,setProtocoles]=useState([]);
  const [documents,setDocuments]=useState([]);const [newMsg,setNewMsg]=useState("");
  const [allMessages,setAllMessages]=useState([]);const [recentActivity,setRecentActivity]=useState([]);
  const [msgConv,setMsgConv]=useState(null);const [msgText,setMsgText]=useState('');
  const [sendingMsg,setSendingMsg]=useState(false);const [convMessages,setConvMessages]=useState([]);
  const [loading,setLoading]=useState(true);const [sending,setSending]=useState(false);
  const [activeTab,setActiveTab]=useState(null);const [editInfos,setEditInfos]=useState(false);
  const [infosForm,setInfosForm]=useState({});const [savingInfos,setSavingInfos]=useState(false);
  const [mainView,setMainView]=useState("profil");
  const [showNotifPanel,setShowNotifPanel]=useState(false);const [seenCount,setSeenCount]=useState(0);
  const [newProtocole,setNewProtocole]=useState({titre:"",contenu:""});
  const [sendingProtocole,setSendingProtocole]=useState(false);
  const [newComplement,setNewComplement]=useState({nom:"",lien:"",posologie:"",codePromo:""});
  const [editingComplement,setEditingComplement]=useState(null);
  const [savingComplements,setSavingComplements]=useState(false);
  const [anamneseMode,setAnamneseMode]=useState("view");
  const [uploadedAnamnese,setUploadedAnamnese]=useState([]);
  const [uploadingAnamnese,setUploadingAnamnese]=useState(false);
  const [savingAnamnese,setSavingAnamnese]=useState(false);
  const [protocoleFiles,setProtocoleFiles]=useState([]);
  const [uploadingProtocole,setUploadingProtocole]=useState(false);
  const [newClientForm,setNewClientForm]=useState({prenom:"",email:"",password:""});
  const [creatingClient,setCreatingClient]=useState(false);
  const [showNewClient,setShowNewClient]=useState(false);
  const [toast,setToast]=useState("");
  const [privateNotes,setPrivateNotes]=useState("");
  const [protoPrat,setProtoPrat]=useState("");
  const [savingProtoPrat,setSavingProtoPrat]=useState(false);
  const [savingNote,setSavingNote]=useState(false);
  const [noteHistory,setNoteHistory]=useState([]);
  const [iaLoading,setIaLoading]=useState(false);
  const [iaStep,setIaStep]=useState("");
  const [iaError,setIaError]=useState("");
  const [clearedActivity,setClearedActivity]=useState([]);
  // Nouveau : réponse praticienne sur suivi
  const [reponseEnCours,setReponseEnCours]=useState({});
  const [savingReponse,setSavingReponse]=useState({});
  // Onglet journal alimentaire
  const [journalEntryIdx,setJournalEntryIdx]=useState(0);

  const showToast=useCallback((msg)=>setToast(msg),[]);
  const getDefaultTitre=(prenom,nb)=>`Protocole n°${nb+1} — ${prenom}`;
  const getDefaultMessage=(prenom)=>`Bonjour ${prenom},\n\nJ'ai bien reçu ton questionnaire et tes bilans, merci de les avoir partagés !\n\nAprès analyse, je t'ai préparé ton protocole personnalisé. Tu le trouveras ci-dessous — prends le temps de bien le lire et n'hésite pas si tu as des questions.\n\nBonne continuation 🌿\nMeije`;

  useEffect(()=>{
    const q=query(collection(db,"users"),where("role","==","cliente"));
    const u=onSnapshot(q,s=>{const list=s.docs.map(d=>({uid:d.id,...d.data()}));list.sort((a,b)=>(a.prenom||"").localeCompare(b.prenom||"","fr"));setClients(list);setLoading(false);});
    const qm=query(collection(db,"messages"),orderBy("date","desc"));
    const um=onSnapshot(qm,s=>setAllMessages(s.docs.map(d=>({id:d.id,...d.data()}))));
    const qa=query(collection(db,"entries"),orderBy("date","desc"));
    const ua=onSnapshot(qa,s=>{const acts=s.docs.slice(0,20).map(d=>({id:d.id,type:"suivi",...d.data()}));setRecentActivity(prev=>{const anam=prev.filter(p=>p.type==="anamnese");return[...acts,...anam].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15);});});
    const qan=query(collection(db,"anamneses"),orderBy("date","desc"));
    const uan=onSnapshot(qan,s=>{const acts=s.docs.slice(0,10).map(d=>({id:d.id,type:"anamnese",...d.data()}));setRecentActivity(prev=>{const suivis=prev.filter(p=>p.type==="suivi");return[...suivis,...acts].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15);});});
    const qdoc=query(collection(db,"documents"),orderBy("date","desc"));
    const udoc=onSnapshot(qdoc,s=>{const acts=s.docs.slice(0,10).map(d=>({id:d.id,type:"document",...d.data()}));setRecentActivity(prev=>{const rest=prev.filter(p=>p.type!=="document");return[...rest,...acts].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15);});});
    return()=>{u();um();ua();uan();udoc();};
  },[]);

  const clientsFiltres=clients.filter(c=>(c.prenom||"").toLowerCase().includes(recherche.toLowerCase())||(c.email||"").toLowerCase().includes(recherche.toLowerCase()));

  const select=useCallback(c=>{
    if(window._clientUnsubs)window._clientUnsubs.forEach(fn=>fn());
    setSelected(c);setNewMsg("");setActiveTab(null);setAnamneseMode("view");setIaError("");setIaStep("");
    setClientData(null);setEntries([]);setMessages([]);setAnamneses([]);setProtocoles([]);setDocuments([]);setNoteHistory([]);
    setNewProtocole({titre:getDefaultTitre(c.prenom,0),contenu:getDefaultMessage(c.prenom)});
    const userRef=doc(db,"users",c.uid);
    const u0=onSnapshot(userRef,d=>setClientData(d.data()));
    const q1=query(collection(db,"entries"),where("userUid","==",c.uid),orderBy("date","asc"));
    const u1=onSnapshot(q1,s=>setEntries(s.docs.map(d=>({id:d.id,...d.data()}))||[]));
    const q2=query(collection(db,"messages"),where("toUid","==",c.uid),orderBy("date","asc"));
    const u2=onSnapshot(q2,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))||[]));
    const q3=query(collection(db,"anamneses"),where("userUid","==",c.uid),orderBy("date","asc"));
    const u3=onSnapshot(q3,s=>setAnamneses(s.docs.map(d=>({id:d.id,...d.data()}))||[]));
    const q4=query(collection(db,"protocoles"),where("toUid","==",c.uid),orderBy("date","asc"));
    const u4=onSnapshot(q4,s=>{const p=s.docs.map(d=>({id:d.id,...d.data()}))||[];setProtocoles(p);setNewProtocole(prev=>({...prev,titre:getDefaultTitre(c.prenom,p.length)}));});
    const q5=query(collection(db,"documents"),where("userUid","==",c.uid),orderBy("date","asc"));
    const u5=onSnapshot(q5,s=>setDocuments(s.docs.map(d=>({id:d.id,...d.data()}))||[]));
    let u6=()=>{};
    try{const q6=query(collection(db,"notes_privees"),where("clientUid","==",c.uid),orderBy("date","desc"));u6=onSnapshot(q6,s=>setNoteHistory(s.docs.map(d=>({id:d.id,...d.data()}))||[]),()=>setNoteHistory([]));}catch{setNoteHistory([]);}
    window._clientUnsubs=[u0,u1,u2,u3,u4,u5,u6];
    setPrivateNotes("");setMainView("fiche");
  },[]);

  const handleGenererIA=()=>genererProtocolesIA({selected,documents,anamneses,entries,protocoles,setNewProtocole,setProtoPrat,showToast,setIaLoading,setIaStep,setIaError,db,setDoc,doc});
  const saveProtoPrat=async()=>{if(!protoPrat.trim()||!selected)return;setSavingProtoPrat(true);await setDoc(doc(db,"notes_privees",`proto_${selected.uid}`),{clientUid:selected.uid,type:"protocole_praticienne",text:protoPrat.trim(),date:new Date().toISOString()});setSavingProtoPrat(false);showToast("Protocole praticienne enregistré ✓");};
  const saveNote=async()=>{if(!privateNotes.trim())return;setSavingNote(true);await addDoc(collection(db,"notes_privees"),{clientUid:selected.uid,clientPrenom:selected.prenom,text:privateNotes.trim(),date:new Date().toISOString()});setPrivateNotes("");setSavingNote(false);showToast("Note enregistrée ✓");};
  const deleteNote=async(id)=>{await deleteDoc(doc(db,"notes_privees",id));};
  const saveStatut=async(uid,statut)=>{await updateDoc(doc(db,"users",uid),{statut});};

  // Répondre à un commentaire cliente sur un suivi
  const envoyerReponse=async(entryId)=>{
    const rep=reponseEnCours[entryId];
    if(!rep?.trim())return;
    setSavingReponse(p=>({...p,[entryId]:true}));
    await updateDoc(doc(db,"entries",entryId),{reponsePraticienne:rep.trim(),reponseDate:new Date().toISOString()});
    try{const entry=entries.find(e=>e.id===entryId);await sendEmail(EMAILJS_TEMPLATE_BIENVENUE,{prenom:selected.prenom,action:"a répondu à ton suivi",to_email:selected.email});}catch{}
    setReponseEnCours(p=>({...p,[entryId]:""}));
    setSavingReponse(p=>({...p,[entryId]:false}));
    showToast("Réponse envoyée ✓");
  };

  const createClient=async()=>{
    if(!newClientForm.prenom||!newClientForm.email||!newClientForm.password)return;
    setCreatingClient(true);
    try{
      const{initializeApp,getApp}=await import("firebase/app");const{getAuth,createUserWithEmailAndPassword:createUser}=await import("firebase/auth");
      let secondaryApp;try{secondaryApp=getApp("secondary");}catch{const{firebaseConfig}=await import("./firebase");secondaryApp=initializeApp(firebaseConfig,"secondary");}
      const secondaryAuth=getAuth(secondaryApp);const c=await createUser(secondaryAuth,newClientForm.email,newClientForm.password);
      await setDoc(doc(db,"users",c.user.uid),{prenom:newClientForm.prenom,email:newClientForm.email,role:"cliente",createdAt:new Date().toISOString(),complements:[],rappelsActifs:true});
      await secondaryAuth.signOut();
      await sendEmail(EMAILJS_TEMPLATE_BIENVENUE,{prenom:newClientForm.prenom,to_email:newClientForm.email});
      setNewClientForm({prenom:"",email:"",password:""});setShowNewClient(false);
      showToast("Espace créé pour "+newClientForm.prenom+" ✓");
    }catch(e){alert("Erreur : "+e.message);}
    setCreatingClient(false);
  };
  const addComplement=async()=>{if(!newComplement.nom.trim())return;setSavingComplements(true);const current=clientData?.complements||[];const item={nom:newComplement.nom.trim(),lien:newComplement.lien.trim(),posologie:newComplement.posologie?.trim()||"",codePromo:newComplement.codePromo?.trim()||""};await updateDoc(doc(db,"users",selected.uid),{complements:[...current,item]});setNewComplement({nom:"",lien:"",posologie:"",codePromo:""});setSavingComplements(false);showToast("Complément ajouté ✓");};
  const removeComplement=async(idx)=>{const current=clientData?.complements||[];await updateDoc(doc(db,"users",selected.uid),{complements:current.filter((_,i)=>i!==idx)});};
  const updateComplement=async(idx,updated)=>{const current=clientData?.complements||[];await updateDoc(doc(db,"users",selected.uid),{complements:current.map((c,i)=>i===idx?updated:c)});setEditingComplement(null);showToast("Complément mis à jour ✓");};
  const uploadToCloudinary=async(file,folder)=>{const fd=new FormData();fd.append("file",file);fd.append("upload_preset",UPLOAD_PRESET);fd.append("folder",folder);const isPDF=file.type==="application/pdf";const endpoint=isPDF?"raw":"image";const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`,{method:"POST",body:fd});if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Erreur ${res.status}`);}const data=await res.json();if(!data.secure_url)throw new Error("Upload échoué");return{url:data.secure_url,name:file.name,type:file.type};};
  const uploadProtocoleFiles=async(files)=>{setUploadingProtocole(true);const uploaded=[];for(const file of files){try{const r=await uploadToCloudinary(file,"meije-naturo/protocoles");uploaded.push(r);}catch(e){showToast("Erreur : "+e.message);}}setProtocoleFiles(prev=>[...prev,...uploaded]);setUploadingProtocole(false);};
  const uploadAnamnesePDF=async(files)=>{setUploadingAnamnese(true);const uploaded=[];for(const file of files){try{const r=await uploadToCloudinary(file,"meije-naturo/anamneses");uploaded.push(r);}catch(e){showToast("Erreur : "+e.message);}}setUploadedAnamnese(prev=>[...prev,...uploaded]);setUploadingAnamnese(false);};
  const saveAnamnesePDF=async()=>{if(!uploadedAnamnese.length)return;setSavingAnamnese(true);await addDoc(collection(db,"anamneses"),{userUid:selected.uid,userEmail:selected.email,userPrenom:selected.prenom,date:new Date().toISOString(),saisieParPraticienne:true,bilans:uploadedAnamnese});setUploadedAnamnese([]);setSavingAnamnese(false);setAnamneseMode("view");showToast("Document enregistré ✓");};
  const sendProtocole=async()=>{if(!newProtocole.titre.trim())return;setSendingProtocole(true);await addDoc(collection(db,"protocoles"),{toUid:selected.uid,toEmail:selected.email,toPrenom:selected.prenom,titre:newProtocole.titre.trim(),contenu:newProtocole.contenu.trim(),fichiers:protocoleFiles,date:new Date().toISOString()});try{await sendEmail(EMAILJS_TEMPLATE,{prenom:selected.prenom,to_email:selected.email,titre:newProtocole.titre.trim()});}catch{}setNewProtocole({titre:"",contenu:""});setProtocoleFiles([]);setSendingProtocole(false);showToast("Protocole envoyé à "+selected.prenom+" ✓");};
  const sendMsg=async()=>{if(!newMsg.trim())return;setSending(true);await addDoc(collection(db,"messages"),{toUid:selected.uid,toEmail:selected.email,toPrenom:selected.prenom,text:newMsg.trim(),date:new Date().toISOString()});try{await sendEmail(EMAILJS_TEMPLATE,{prenom:selected.prenom,to_email:selected.email});}catch{}setNewMsg("");setSending(false);showToast("Message envoyé ✓");};
  const deleteProtocole=async(id)=>{if(!window.confirm("Supprimer ce protocole ?"))return;await deleteDoc(doc(db,"protocoles",id));showToast("Protocole supprimé");};

  const visibleActivity = recentActivity.filter(a => !clearedActivity.includes(a.id));
  const unreadCount = visibleActivity.length > seenCount ? visibleActivity.length - seenCount : 0;

  if(loading)return<div style={{minHeight:"100vh",background:P.pBg,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:P.serif,fontSize:20,color:P.pTextDim,fontWeight:300}}>Chargement…</p></div>;

  const pInner={maxWidth:800,margin:"0 auto",padding:"20px 16px"};
  const pHeader={background:P.pSurface,borderBottom:`1px solid ${P.pBorder}`,padding:"16px 20px",position:"sticky",top:0,zIndex:50};

  return (
    <div style={{minHeight:"100vh",background:P.pBg,fontFamily:P.sans,paddingBottom:80}}>
      {toast&&<Toast message={toast} onClose={()=>setToast("")}/>}
      <div style={pHeader}>
        <div style={{maxWidth:800,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{fontFamily:P.serif,fontSize:20,color:P.pText,fontWeight:300,letterSpacing:"0.5px"}}>meije<span style={{color:P.pAccent,fontStyle:"italic"}}>.</span>naturo</p>
            <p style={{fontSize:10,color:P.pAccent,letterSpacing:"2px",textTransform:"uppercase",marginTop:1}}>Espace praticienne</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {selected&&mainView==="fiche"&&<button onClick={()=>{setSelected(null);setMainView("clients");}} style={{background:P.pSurface2,border:`1px solid ${P.pBorder}`,borderRadius:20,padding:"7px 14px",color:P.pTextMid,fontSize:12,fontFamily:P.sans,cursor:"pointer"}}>← Retour</button>}
            <div style={{position:"relative"}}>
              <button onClick={()=>{setSeenCount(visibleActivity.length);setShowNotifPanel(p=>!p)}} style={{background:P.pSurface2,border:`1px solid ${P.pBorder}`,borderRadius:20,padding:"7px 14px",color:P.pTextMid,fontSize:15,fontFamily:P.sans,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                🔔{unreadCount>0&&<span style={{background:P.pAccent,color:"#1C1410",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{unreadCount}</span>}
              </button>
              {showNotifPanel&&(
                <div style={{position:"absolute",top:44,right:0,width:290,background:"#2A1E14",border:`1px solid ${P.pBorder}`,borderRadius:16,padding:16,zIndex:200,boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <p style={{fontFamily:P.serif,fontSize:15,color:P.pText}}>Activité récente</p>
                    {visibleActivity.length>0&&<button onClick={()=>{setClearedActivity(recentActivity.map(a=>a.id));setSeenCount(0);}} style={{background:"none",border:"none",color:P.pTextDim,fontSize:11,fontFamily:P.sans,cursor:"pointer",textDecoration:"underline"}}>Tout effacer</button>}
                  </div>
                  {visibleActivity.length===0?<p style={{color:P.pTextDim,fontSize:13}}>Aucune activité 🌿</p>
                    :visibleActivity.slice(0,8).map((a,i)=>{
                      const prenom=a.userPrénom||a.userPrenom||a.clientPrenom||"—";
                      const icons={suivi:"📝",anamnese:"📋",document:"📁"};
                      const labels={suivi:"a rempli son suivi",anamnese:"a envoyé son questionnaire",document:"a partagé des documents"};
                      const daysAgo=Math.floor((Date.now()-new Date(a.date).getTime())/(1000*60*60*24));
                      const timeLabel=daysAgo===0?"Aujourd'hui":daysAgo===1?"Hier":`Il y a ${daysAgo}j`;
                      const clientCible=clients.find(c=>c.uid===(a.userUid||a.clientUid));
                      return(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,marginBottom:6,background:"rgba(255,255,255,0.04)"}}>
                          <div style={{flex:1,cursor:clientCible?"pointer":"default"}} onClick={()=>{if(clientCible){setSelected(clientCible);setMainView("fiche");setShowNotifPanel(false);}}}>
                            <p style={{fontSize:12,color:"rgba(242,232,218,0.8)"}}>{icons[a.type]} <span style={{color:P.pAccent}}>{prenom}</span> {labels[a.type]}</p>
                            <p style={{fontSize:10,color:"rgba(242,232,218,0.3)",marginTop:2}}>{timeLabel}</p>
                          </div>
                          <button onClick={()=>setClearedActivity(prev=>[...prev,a.id])} style={{background:"none",border:"none",color:P.pTextDim,fontSize:16,cursor:"pointer",lineHeight:1,flexShrink:0,padding:"0 2px"}}>×</button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            <button onClick={onLogout} style={{background:"none",border:"none",color:P.pTextDim,fontSize:12,fontFamily:P.sans,cursor:"pointer"}}>Déconnexion</button>
          </div>
        </div>
      </div>

      {/* ── LISTE CONSULTANTES ── */}
      {mainView==="clients"&&(
        <div style={pInner} className="fade-in">
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder="Rechercher une consultante…" style={{...iP("p"),flex:1}}/>
            <Btn onClick={()=>setShowNewClient(!showNewClient)} variant="primary" style={{flexShrink:0,borderRadius:10,padding:"11px 16px"}}>+</Btn>
          </div>
          {showNewClient&&(
            <div style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:14,padding:"18px 20px",marginBottom:16}} className="slide-up">
              <p style={{color:P.pAccent,fontWeight:500,fontSize:14,marginBottom:14}}>Créer un espace consultante</p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input value={newClientForm.prenom} onChange={e=>setNewClientForm(f=>({...f,prenom:e.target.value}))} placeholder="Prénom" style={iP("p")}/>
                <input value={newClientForm.email} onChange={e=>setNewClientForm(f=>({...f,email:e.target.value}))} placeholder="Email" type="email" style={iP("p")}/>
                <input value={newClientForm.password} onChange={e=>setNewClientForm(f=>({...f,password:e.target.value}))} placeholder="Mot de passe temporaire" style={iP("p")}/>
              </div>
              <p style={{color:P.pTextDim,fontSize:12,margin:"10px 0"}}>Elle pourra le changer via "Mot de passe oublié".</p>
              <Btn onClick={createClient} disabled={creatingClient} variant="primary">{creatingClient?"Création…":"Créer son espace"}</Btn>
            </div>
          )}
          <p style={{color:P.pTextDim,fontSize:12,marginBottom:12}}>{clients.length} consultante{clients.length>1?"s":""}</p>
          {!recherche&&clients.length>5&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l=>{const has=clients.some(c=>(c.prenom||"").toUpperCase().startsWith(l));return has?<button key={l} onClick={()=>setRecherche(l)} style={{width:26,height:26,borderRadius:6,border:`1px solid ${P.pAccentBorder}`,background:P.pAccentDim,color:P.pAccent,fontSize:11,fontFamily:P.sans,fontWeight:500}}>{l}</button>:null;})}
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {clientsFiltres.map(c=>(
              <button key={c.uid} onClick={()=>select(c)} style={{background:P.pSurface,border:`1px solid ${P.pBorder}`,borderRadius:12,padding:"14px 18px",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:P.serif,fontSize:18,color:P.pAccent,flexShrink:0}}>{(c.prenom||"?")[0].toUpperCase()}</div>
                  <div><p style={{color:P.pText,fontWeight:500,fontSize:15}}>{c.prenom}</p><p style={{color:P.pTextDim,fontSize:12,marginTop:2}}>{c.email}</p></div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {(()=>{const s=c.statut||"en cours";const cols={"en cours":P.pGreen,"en pause":"#B8A05A","terminé":P.pTextDim};return<span style={{fontSize:10,color:cols[s],background:cols[s]+"18",border:`0.5px solid ${cols[s]}44`,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>{s}</span>;})()}
                  <span style={{color:P.pTextDim,fontSize:18}}>›</span>
                </div>
              </button>
            ))}
            {clientsFiltres.length===0&&recherche&&<EmptyState message={`Aucune consultante pour "${recherche}"`} theme="p"/>}
            {clients.length===0&&<EmptyState message="Aucune consultante inscrite pour l'instant." theme="p"/>}
          </div>
        </div>
      )}

      {/* ── MESSAGES GLOBAUX ── */}
      {mainView==="messages"&&(
        <div style={{...pInner,display:"flex",gap:16,height:"calc(100vh - 120px)",overflow:"hidden"}} className="fade-in">
          <div style={{width:260,flexShrink:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
            <p style={{fontFamily:P.serif,fontSize:18,color:P.pText,fontWeight:300,marginBottom:8}}>Conversations</p>
            {clients.length===0?<EmptyState message="Aucune consultante." theme="p"/>
              :clients.map(c=>{
                const lastMsg=[...allMessages].filter(m=>m.userUid===c.uid||m.toUid===c.uid).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
                const isActive=msgConv?.uid===c.uid;
                return(
                  <button key={c.uid} onClick={async()=>{setMsgConv(c);const qc=query(collection(db,"messages"),where("userUid","==",c.uid),orderBy("date","asc"));onSnapshot(qc,s=>setConvMessages(s.docs.map(d=>({id:d.id,...d.data()}))));}} style={{background:isActive?P.pAccentDim:P.pSurface,border:`1px solid ${isActive?P.pAccentBorder:P.pBorder}`,borderRadius:12,padding:"12px 14px",textAlign:"left",cursor:"pointer",transition:"all 0.2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <p style={{color:isActive?P.pAccent:P.pText,fontSize:13,fontWeight:500}}>{c.prenom} {c.nom||""}</p>
                      {lastMsg&&<p style={{color:P.pTextDim,fontSize:10}}>{new Date(lastMsg.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</p>}
                    </div>
                    {lastMsg&&<p style={{color:P.pTextDim,fontSize:11,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",maxWidth:180}}>{lastMsg.from==="praticienne"?"Toi : ":""}{lastMsg.text}</p>}
                  </button>
                );
              })}
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",background:P.pSurface,borderRadius:16,border:`1px solid ${P.pBorder}`,overflow:"hidden"}}>
            {!msgConv?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:P.pTextDim,fontSize:13}}>Sélectionne une conversation 🌿</p></div>
              :<>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${P.pBorder}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:P.pAccentDim,display:"flex",alignItems:"center",justifyContent:"center",color:P.pAccent,fontWeight:600,fontSize:14}}>{msgConv.prenom?.[0]}</div>
                  <div><p style={{color:P.pText,fontSize:14,fontWeight:500}}>{msgConv.prenom} {msgConv.nom||""}</p><p style={{color:P.pTextDim,fontSize:11}}>{msgConv.email}</p></div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
                  {convMessages.length===0?<p style={{color:P.pTextDim,fontSize:13,textAlign:"center",marginTop:20}}>Aucun message encore 🌿</p>
                    :convMessages.map(m=>{const isMe=m.from==="praticienne";return(<div key={m.id} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}><div style={{maxWidth:"75%",background:isMe?P.pAccentDim:P.pSurface2,border:`1px solid ${isMe?P.pAccentBorder:P.pBorder}`,borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 14px"}}><p style={{color:isMe?P.pAccent:P.pText,fontSize:13,lineHeight:1.6}}>{m.text}</p><p style={{color:P.pTextDim,fontSize:10,marginTop:4,textAlign:isMe?"right":"left"}}>{new Date(m.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p></div></div>);})}
                </div>
                <div style={{padding:"12px 18px",borderTop:`1px solid ${P.pBorder}`,display:"flex",gap:10,alignItems:"flex-end"}}>
                  <textarea value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();document.getElementById("send-msg-btn").click();}}} placeholder={`Écrire à ${msgConv.prenom}…`} rows={2} style={{flex:1,background:P.pSurface2,border:`1px solid ${P.pBorder}`,borderRadius:12,padding:"10px 14px",color:P.pText,fontFamily:P.sans,fontSize:13,resize:"none",outline:"none"}}/>
                  <button id="send-msg-btn" disabled={!msgText.trim()||sendingMsg} onClick={async()=>{if(!msgText.trim())return;setSendingMsg(true);await addDoc(collection(db,"messages"),{userUid:msgConv.uid,toPrenom:msgConv.prenom,toUid:msgConv.uid,text:msgText.trim(),date:new Date().toISOString(),from:"praticienne",read:false});setMsgText("");setSendingMsg(false);}} style={{background:P.pAccent,color:"#1C1410",border:"none",borderRadius:12,padding:"10px 16px",fontFamily:P.sans,fontSize:13,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",opacity:msgText.trim()?1:0.5}}>
                    {sendingMsg?"…":"Envoyer →"}
                  </button>
                </div>
              </>}
          </div>
        </div>
      )}

      {/* ── MON ESPACE ── */}
      {mainView==="profil"&&(
        <div style={pInner} className="fade-in">
          <p style={{fontFamily:P.serif,fontSize:26,color:P.pText,fontWeight:300,marginBottom:4}}>Mon espace</p>
          <p style={{color:P.pTextDim,fontSize:12,marginBottom:24}}>{user.email}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:10,marginBottom:24}}>
            {[["Consultantes",clients.length],["En cours",clients.filter(c=>(c.statut||"en cours")==="en cours").length],["Messages",allMessages.length]].map(([l,v])=>(
              <div key={l} style={{background:P.pSurface,borderRadius:12,border:`0.5px solid ${P.pBorder}`,padding:"14px 16px"}} className="card-raised-dark">
                <p style={{fontFamily:P.serif,fontSize:26,color:P.pText,fontWeight:300}}>{v}</p>
                <p style={{color:P.pTextDim,fontSize:10,letterSpacing:"0.5px",marginTop:4}}>{l}</p>
              </div>
            ))}
          </div>
          <p style={{color:P.pTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:12}}>Activité récente</p>
          {recentActivity.length===0?<EmptyState message="Aucune activité récente." theme="p"/>
            :recentActivity.map(a=>{
              const prenom=a.userPrénom||a.userPrenom||a.clientPrenom||"—";
              const icons={suivi:"📝",anamnese:"📋",document:"📁"};
              const labels={suivi:"a rempli son suivi",anamnese:"a envoyé son questionnaire",document:"a partagé des documents"};
              const colors={suivi:P.pGreen,anamnese:P.pAccent,document:P.pGreen};
              const daysAgo=Math.floor((Date.now()-new Date(a.date).getTime())/(1000*60*60*24));
              const timeLabel=daysAgo===0?"Aujourd'hui":daysAgo===1?"Hier":`Il y a ${daysAgo} j`;
              const clientCible=clients.find(c=>c.uid===(a.userUid||a.clientUid)||c.email===a.userEmail);
              return<div key={a.id} onClick={()=>{if(clientCible){setSelected(clientCible);select(clientCible);}}} style={{display:"flex",alignItems:"center",gap:12,background:P.pSurface,borderRadius:10,border:`0.5px solid ${P.pBorder}`,padding:"10px 14px",marginBottom:8,cursor:clientCible?"pointer":"default"}} className="card-raised-dark"><span style={{fontSize:16}}>{icons[a.type]}</span><div style={{flex:1}}><p style={{color:P.pText,fontSize:13}}><span style={{color:colors[a.type],fontWeight:500}}>{prenom}</span> {labels[a.type]}</p>{a.weekLabel&&<p style={{color:P.pTextDim,fontSize:11,marginTop:2}}>{a.weekLabel}</p>}</div><p style={{color:P.pTextDim,fontSize:11,flexShrink:0}}>{timeLabel}</p></div>;
            })}
          <div style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${P.pBorder}`}}><Btn onClick={onLogout} variant="ghost" theme="p" style={{width:"100%"}}>Se déconnecter</Btn></div>
        </div>
      )}

      {/* ── FICHE CLIENTE ── */}
      {mainView==="fiche"&&selected&&(
        <div style={pInner} className="fade-in">
          <div style={{background:P.pSurface,borderRadius:18,border:`1px solid ${P.pBorder}`,padding:"20px 22px",marginBottom:18,display:"flex",alignItems:"center",gap:16,boxShadow:P.shadowRaised}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:P.serif,fontSize:22,color:P.pAccent,flexShrink:0}}>{(selected.prenom||"?")[0].toUpperCase()}</div>
            <div style={{flex:1}}>
              <p style={{fontFamily:P.serif,fontSize:20,color:P.pText,fontWeight:400}}>{selected.prenom}</p>
              <p style={{color:P.pTextDim,fontSize:12,marginTop:2}}>{selected.email}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8,alignItems:"center"}}>
                <Chip label={`${entries.length} suivi${entries.length>1?"s":""}`} color={P.pGreen}/>
                {anamneses.length>0&&<Chip label="Questionnaire rempli" color={P.pGreen}/>}
                {protocoles.length>0&&<Chip label={`${protocoles.length} protocole${protocoles.length>1?"s":""}`} color={P.pAccent}/>}
                {["en cours","en pause","terminé"].map(s=>{const active=(clientData?.statut||"en cours")===s;const cols={"en cours":P.pGreen,"en pause":"#B8A05A","terminé":P.pTextDim};return<button key={s} onClick={()=>saveStatut(selected.uid,s)} style={{padding:"3px 10px",borderRadius:20,border:`0.5px solid ${active?cols[s]+"66":P.pBorder}`,background:active?cols[s]+"22":"transparent",color:active?cols[s]:P.pTextDim,fontFamily:P.sans,fontSize:11,cursor:"pointer",fontWeight:active?500:400}}>{s}</button>;})}
              </div>
            </div>
          </div>

          {/* Onglets principaux */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
            {[
              {key:"infos",icon:"👤",label:"Infos"},
              {key:"documents",icon:"📁",label:"Documents"},
              {key:"suivis",icon:"📊",label:"Suivis"},
              {key:"message",icon:"💬",label:"Messages"},
              {key:"notes",icon:"🔒",label:"Notes"},
            ].map(({key,icon,label})=>{
              const isActive=activeTab===key||(key==="documents"&&["anamnese","protocole","complements"].includes(activeTab));
              return(
                <button key={key} onClick={()=>setActiveTab(activeTab===key?null:key)} style={{background:isActive?"linear-gradient(160deg,rgba(200,133,108,0.2),rgba(200,133,108,0.08))":P.pSurface,border:`1px solid ${isActive?"rgba(200,133,108,0.4)":P.pBorder}`,borderRadius:18,padding:"18px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:isActive?P.shadowAccent:P.shadowRaised}} className="card-raised-dark">
                  <span style={{fontSize:24}}>{icon}</span>
                  <p style={{color:isActive?P.pAccent:P.pTextMid,fontSize:11,fontWeight:isActive?600:400,letterSpacing:"0.3px"}}>{label}</p>
                </button>
              );
            })}
          </div>

          {activeTab==="documents"&&(
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[{key:"anamnese",icon:"📋",label:"Anamnèse"},{key:"protocole",icon:"🌿",label:"Protocole"},{key:"complements",icon:"💊",label:"Compléments"}].map(({key,icon,label})=>(
                <button key={key} onClick={()=>setActiveTab(activeTab===key?null:key)} style={{padding:"8px 16px",borderRadius:20,border:`1px solid ${P.pBorder}`,background:P.pSurface,color:P.pTextMid,fontFamily:P.sans,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",boxShadow:P.shadowRaised}}>
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>
          )}

          {/* Résumé statut */}
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20,padding:"10px 14px",background:P.pSurface,borderRadius:12,border:`0.5px solid ${P.pBorder}`,boxShadow:P.shadowInner}}>
            {[
              anamneses.length>0&&{label:"Questionnaire rempli",col:P.pGreen,dot:"✓"},
              protocoles.length>0&&{label:`${protocoles.length} protocole${protocoles.length>1?"s":""} envoyé${protocoles.length>1?"s":""}`,col:P.pAccent,dot:"🌿"},
              messages.filter(m=>!m.read&&m.from!=="praticienne").length>0&&{label:`${messages.filter(m=>!m.read&&m.from!=="praticienne").length} message${messages.filter(m=>!m.read&&m.from!=="praticienne").length>1?"s":""} non lu`,col:"#E8A040",dot:"💬"},
              {label:`${entries.length} semaine${entries.length>1?"s":""} de suivi`,col:P.pTextDim,dot:"📝"},
              // Commentaire non répondu
              entries.filter(e=>e.commentaireCliente&&!e.reponsePraticienne).length>0&&{label:`${entries.filter(e=>e.commentaireCliente&&!e.reponsePraticienne).length} commentaire${entries.filter(e=>e.commentaireCliente&&!e.reponsePraticienne).length>1?"s":""} sans réponse`,col:"#E8A040",dot:"💬"},
            ].filter(Boolean).map((s,i)=>(
              <span key={i} style={{fontSize:11,color:s.col,display:"flex",alignItems:"center",gap:4}}>
                <span>{s.dot}</span>{s.label}
                {i<4&&<span style={{color:P.pBorder,marginLeft:4}}>·</span>}
              </span>
            ))}
          </div>

          {/* Profils de suivi */}
          <details style={{marginBottom:16}}>
            <summary style={{color:P.pTextDim,fontSize:11,cursor:"pointer",padding:"8px 0",listStyle:"none",display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:P.pAccent}}>⚙️</span>
              <span>Profils de suivi · {(clientData?.profils||[]).length===0?"Non défini":(clientData.profils||[]).map(k=>PROFILS.flatMap(g=>g.sousProfiles).find(s=>s.key===k)?.label).filter(Boolean).join(", ")}</span>
            </summary>
            <div style={{background:P.pSurface,borderRadius:12,border:`0.5px solid ${P.pBorder}`,padding:"14px 16px",marginTop:8}}>
              {PROFILS.map(g=>(
                <div key={g.groupe} style={{marginBottom:12}}>
                  <p style={{color:P.pTextMid,fontSize:11,fontWeight:500,marginBottom:6}}>{g.groupe}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {g.sousProfiles.map(s=>{const sel_profils=clientData?.profils||[];const active=sel_profils.includes(s.key);return<button key={s.key} onClick={async()=>{const current=clientData?.profils||[];const updated=active?current.filter(k=>k!==s.key):[...current,s.key];await updateDoc(doc(db,"users",selected.uid),{profils:updated});}} style={{padding:"5px 11px",borderRadius:20,cursor:"pointer",border:`1.5px solid ${active?P.pGreen:P.pBorder}`,background:active?P.pGreenDim:"transparent",color:active?P.pGreen:P.pTextMid,fontFamily:P.sans,fontSize:11,fontWeight:active?500:400}}>{active?"✓ ":""}{s.label}</button>;})}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* ── ONGLET INFOS ── */}
          {activeTab==="infos"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <p style={{color:P.pTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1.5px"}}>Informations de la consultante</p>
                <button onClick={()=>{if(!editInfos)setInfosForm({prenom:selected.prenom||"",nom:selected.nom||"",dateNaissance:selected.dateNaissance||"",adresse:selected.adresse||"",tel:selected.tel||"",email:selected.email||""});setEditInfos(p=>!p);}} style={{background:editInfos?P.pAccentDim:"transparent",border:`1px solid ${editInfos?P.pAccentBorder:P.pBorder}`,borderRadius:20,padding:"6px 14px",color:editInfos?P.pAccent:P.pTextMid,fontSize:12,fontFamily:P.sans,cursor:"pointer"}}>
                  {editInfos?"Annuler":"✏️ Modifier"}
                </button>
              </div>
              {[{label:"Prénom",key:"prenom"},{label:"Nom",key:"nom"},{label:"Date de naissance",key:"dateNaissance",placeholder:"JJ/MM/AAAA"},{label:"Adresse",key:"adresse",placeholder:"Rue, ville, code postal"},{label:"Téléphone",key:"tel",placeholder:"06 00 00 00 00"},{label:"Email",key:"email",readonly:true}].map(({label,key,placeholder,readonly:ro})=>(
                <div key={key} style={{marginBottom:12}}>
                  <p style={{color:P.pTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:6}}>{label}</p>
                  {editInfos&&!ro
                    ?<input value={infosForm[key]||""} onChange={e=>setInfosForm(p=>({...p,[key]:e.target.value}))} placeholder={placeholder||label} style={{width:"100%",background:P.pSurface2,border:`1px solid ${P.pBorder}`,borderRadius:10,padding:"10px 14px",color:P.pText,fontFamily:P.sans,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    :<div style={{background:P.pSurface,border:`1px solid ${P.pBorder}`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><p style={{color:selected[key]?P.pText:P.pTextDim,fontSize:13,fontFamily:P.sans}}>{selected[key]||"—"}</p><button onClick={()=>navigator.clipboard.writeText(selected[key]||"")} style={{background:"none",border:"none",color:P.pTextDim,cursor:"pointer",fontSize:12,padding:"2px 6px"}}>📋</button></div>
                  }
                </div>
              ))}
              {editInfos&&(<button onClick={async()=>{setSavingInfos(true);await updateDoc(doc(db,"users",selected.uid),{prenom:infosForm.prenom,nom:infosForm.nom,dateNaissance:infosForm.dateNaissance,adresse:infosForm.adresse,tel:infosForm.tel});setEditInfos(false);setSavingInfos(false);showToast("Informations mises à jour ✓");}} disabled={savingInfos} style={{width:"100%",background:P.pAccent,color:"#1C1410",border:"none",borderRadius:30,padding:"12px",fontFamily:P.sans,fontSize:13,fontWeight:500,cursor:"pointer",marginTop:8}}>{savingInfos?"Enregistrement…":"Enregistrer les modifications"}</button>)}
            </div>
          )}

          {/* ── ONGLET SUIVIS ── avec commentaires + questions profil */}
          {activeTab==="suivis"&&(
            <div>
              {entries.length===0?<EmptyState message={`${selected.prenom} n'a pas encore rempli de suivi.`} theme="p"/>
                :[...entries].reverse().map(e=>{
                  const vs=TI.map(i=>e.scores?.[i.key]).filter(Boolean),avg=vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null,sc=avg?SC.find(x=>x.v===Math.round(avg)):null;
                  return(
                    <div key={e.id} style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,padding:"16px 18px",marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <div><p style={{color:P.pText,fontWeight:500}}>{e.weekLabel}</p><p style={{color:P.pTextDim,fontSize:12}}>{new Date(e.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</p></div>
                        <ScoreDot value={avg?Math.round(avg):null} size={40}/>
                      </div>
                      {/* Compléments */}
                      {e.complementsPris&&Object.keys(e.complementsPris).length>0&&(<div style={{marginBottom:10}}><p style={{color:P.pGreen,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Compléments</p>{Object.entries(e.complementsPris).map(([comp,statut])=>{const colors={"Pris régulièrement":P.pGreen,"Pris irrégulièrement":"#B8A05A","Pas pris":"#B5583A"};return<div key={comp} style={{display:"flex",justifyContent:"space-between",padding:"6px 12px",background:P.pSurface2,borderRadius:8,marginBottom:4}}><span style={{color:P.pTextMid,fontSize:13}}>{comp}</span><span style={{color:colors[statut]||P.pTextDim,fontSize:12,fontWeight:500}}>{statut}</span></div>;})}</div>)}
                      {/* Phase cycle */}
                      {e.cyclePhase&&<div style={{background:P.pAccentDim,borderRadius:8,padding:"10px 14px",marginBottom:8}}><p style={{color:P.pAccent,fontSize:12,marginBottom:4}}>Phase : {e.cyclePhase}</p>{e.cycleNote&&<p style={{color:P.pTextMid,fontSize:13}}>{e.cycleNote}</p>}</div>}
                      {/* Scores tronc commun */}
                      {TI.filter(i=>e.scores?.[i.key]).map(i=>{const sc2=SC.find(x=>x.v===e.scores[i.key]);return<div key={i.key} style={{background:P.pSurface2,borderRadius:8,padding:"8px 12px",marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:e.notes?.[i.key]?4:0}}><span style={{color:P.pTextMid,fontSize:13}}>{i.icon} {i.label}</span><span style={{color:sc2?.color||P.pTextDim,fontSize:12,fontWeight:500}}>{sc2?.label}</span></div>{e.notes?.[i.key]&&<p style={{color:P.pTextDim,fontSize:12,fontStyle:"italic"}}>{e.notes[i.key]}</p>}</div>;})}
                      {/* Scores profil spécifique */}
                      {e.scoresProfi&&Object.keys(e.scoresProfi).length>0&&(
                        <div style={{marginTop:8,marginBottom:8}}>
                          <p style={{color:P.pGreen,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>🎯 Suivi spécifique</p>
                          {Object.entries(e.scoresProfi).map(([key,val])=>{
                            const q = Object.values(QUESTIONS_PROFIL).flat().find(q=>q.key===key);
                            if(!q||!val) return null;
                            const sc3 = typeof val === "number" ? SC.find(x=>x.v===val) : null;
                            return<div key={key} style={{background:P.pSurface2,borderRadius:8,padding:"8px 12px",marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:P.pTextMid,fontSize:12}}>{q.icon} {q.label}</span><span style={{color:sc3?.color||P.pTextDim,fontSize:12,fontWeight:500}}>{sc3?.label||String(val)}</span></div></div>;
                          })}
                        </div>
                      )}
                      {/* Humeur */}
                      {e.humeur_libre&&<div style={{background:P.pGreenDim,borderRadius:8,padding:"10px 14px",marginBottom:8}}><p style={{color:P.pGreen,fontSize:10,marginBottom:4}}>Humeur</p><p style={{color:P.pText,fontSize:13,lineHeight:1.6}}>{e.humeur_libre}</p></div>}
                      {/* Confidences */}
                      {e.confidences&&<div style={{background:P.pAccentDim,borderRadius:8,padding:"10px 14px",marginBottom:8}}><p style={{color:P.pAccent,fontSize:10,marginBottom:4}}>Ajout</p><p style={{color:P.pText,fontSize:13,lineHeight:1.6}}>{e.confidences}</p></div>}
                      {/* Commentaire cliente + réponse */}
                      {e.commentaireCliente&&(
                        <div style={{background:"rgba(122,158,130,0.08)",border:`1px solid ${P.pGreen}33`,borderRadius:10,padding:"12px 14px",marginTop:10}}>
                          <p style={{color:P.pGreen,fontSize:11,fontWeight:600,marginBottom:6}}>💬 Commentaire de {selected.prenom}</p>
                          <p style={{color:P.pText,fontSize:13,lineHeight:1.6,marginBottom:10}}>{e.commentaireCliente}</p>
                          {e.reponsePraticienne
                            ? <div style={{background:P.pAccentDim,borderRadius:8,padding:"8px 12px"}}><p style={{color:P.pAccent,fontSize:11,marginBottom:4}}>Ta réponse</p><p style={{color:P.pText,fontSize:13}}>{e.reponsePraticienne}</p></div>
                            : <div>
                                <textarea value={reponseEnCours[e.id]||""} onChange={ev=>setReponseEnCours(p=>({...p,[e.id]:ev.target.value}))} placeholder="Répondre à ce commentaire…" rows={2} style={{...iP("p"),fontSize:12,resize:"vertical",marginBottom:8}}/>
                                <Btn onClick={()=>envoyerReponse(e.id)} disabled={!reponseEnCours[e.id]?.trim()||savingReponse[e.id]} variant="sage" small>{savingReponse[e.id]?"Envoi…":"Répondre"}</Btn>
                              </div>
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* ── ONGLET JOURNAL ALIMENTAIRE ── */}
          {activeTab==="suivis"&&entries.length>0&&(
            <div style={{marginTop:24}}>
              <p style={{color:P.pTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:12}}>🥗 Journal alimentaire</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                {[...entries].reverse().slice(0,8).map((e,i)=>(
                  <button key={e.id} onClick={()=>setJournalEntryIdx(i)} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${journalEntryIdx===i?P.pAccentBorder:P.pBorder}`,background:journalEntryIdx===i?P.pAccentDim:"transparent",color:journalEntryIdx===i?P.pAccent:P.pTextMid,fontSize:11,fontFamily:P.sans}}>
                    {e.weekLabel||new Date(e.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}
                  </button>
                ))}
              </div>
              {(()=>{
                const e = [...entries].reverse()[journalEntryIdx];
                if(!e?.journalAlimentaire) return <EmptyState message="Pas de journal alimentaire pour cette semaine." theme="p"/>;
                return(
                  <div style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,overflow:"hidden"}}>
                    {JOURS_SEMAINE.map(jour=>{
                      const repas = e.journalAlimentaire[jour];
                      const hasData = repas?.some(r=>r.texte||r.heure);
                      return(
                        <div key={jour} style={{borderBottom:`1px solid ${P.pBorder}`,padding:"12px 16px"}}>
                          <p style={{color:hasData?P.pText:P.pTextDim,fontSize:13,fontWeight:hasData?500:400,marginBottom:hasData?8:0}}>{jour}</p>
                          {hasData&&repas.map((r,i)=>(
                            r.texte&&<div key={i} style={{display:"flex",gap:10,marginBottom:4,alignItems:"flex-start"}}>
                              <span style={{color:P.pAccent,fontSize:11,fontWeight:600,minWidth:40,flexShrink:0}}>{r.heure||r.repas}</span>
                              <p style={{color:P.pTextMid,fontSize:12,lineHeight:1.5}}>{r.texte}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── ONGLET ÉVOLUTION ── */}
          {activeTab==="evolution"&&(
            <div>
              {entries.length<2?<EmptyState message={`${selected.prenom} n'a pas encore assez de suivis.`} theme="p"/>:(
                <>{(()=>{const getAvg=e=>{const vs=TI.map(i=>e.scores?.[i.key]).filter(Boolean);return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;};const avgFirst=getAvg(entries[0]),avgLast=getAvg(entries[entries.length-1]),diff=avgFirst&&avgLast?(avgLast-avgFirst).toFixed(1):null;return diff?(<div style={{background:diff>0?P.pGreenDim:P.pAccentDim,border:`1px solid ${diff>0?"rgba(122,158,130,0.3)":P.pAccentBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:24}}>{diff>0?"📈":"📉"}</span><div><p style={{color:diff>0?P.pGreen:P.pAccent,fontWeight:500,fontSize:14}}>{diff>0?`+${diff} pts depuis le début`:`${diff} pts depuis le début`}</p><p style={{color:P.pTextDim,fontSize:12,marginTop:2}}>{entries.length} semaines · moy. {avgFirst?.toFixed(1)} → {avgLast?.toFixed(1)}</p></div></div>):null;})()}<ChartSelector entries={entries} theme="p"/></>
              )}
            </div>
          )}

          {/* ── ONGLET COMPLÉMENTS ── */}
          {activeTab==="complements"&&(
            <div>
              {clientData?.complements?.length>0?clientData.complements.map((c,i)=>{
                const nom=typeof c==="string"?c:c.nom,lien=typeof c==="string"?"":c.lien,posologie=typeof c==="string"?"":c.posologie,codePromo=typeof c==="string"?"":c.codePromo;
                const isEditing=typeof editingComplement==="object"&&editingComplement?.idx===i,edited=isEditing?editingComplement:null;
                if(isEditing&&edited)return(<div key={i} style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}><div style={{display:"flex",flexDirection:"column",gap:8}}><input value={edited.nom} onChange={e=>setEditingComplement({...edited,nom:e.target.value})} placeholder="Nom" style={{...iP("p"),fontSize:13}}/><input value={edited.posologie} onChange={e=>setEditingComplement({...edited,posologie:e.target.value})} placeholder="Posologie" style={{...iP("p"),fontSize:13}}/><input value={edited.lien} onChange={e=>setEditingComplement({...edited,lien:e.target.value})} placeholder="Lien produit" style={{...iP("p"),fontSize:13}}/><input value={edited.codePromo} onChange={e=>setEditingComplement({...edited,codePromo:e.target.value})} placeholder="Code promo" style={{...iP("p"),fontSize:13}}/><div style={{display:"flex",gap:8}}><Btn onClick={()=>updateComplement(i,{nom:edited.nom,lien:edited.lien,posologie:edited.posologie,codePromo:edited.codePromo})} variant="primary" small>Enregistrer</Btn><Btn onClick={()=>setEditingComplement(null)} variant="ghost" theme="p" small>Annuler</Btn></div></div></div>);
                return(<div key={i} style={{background:P.pSurface,borderRadius:10,padding:"12px 16px",marginBottom:8,border:`1px solid ${P.pBorder}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><p style={{color:P.pText,fontSize:14,fontWeight:500,marginBottom:posologie?4:0}}>{nom}</p>{posologie&&<p style={{color:P.pAccent,fontSize:12,marginBottom:4}}>💊 {posologie}</p>}<div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>{lien&&<a href={lien} target="_blank" rel="noreferrer" style={{color:P.pGreen,fontSize:12,textDecoration:"none"}}>→ Commander</a>}{codePromo&&<span style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:6,padding:"2px 8px",color:P.pAccent,fontSize:11,fontWeight:500}}>🏷 {codePromo}</span>}</div></div><div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8}}><button onClick={()=>setEditingComplement({idx:i,nom,lien:lien||"",posologie:posologie||"",codePromo:codePromo||""})} style={{background:"none",border:"none",color:P.pTextDim,fontSize:13,cursor:"pointer"}}>✏️</button><button onClick={()=>removeComplement(i)} style={{background:"none",border:"none",color:"#B5583A",fontSize:18,lineHeight:1,cursor:"pointer"}}>×</button></div></div></div>);
              }):<EmptyState message="Aucun complément ajouté." theme="p"/>}
              <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10}}>
                <input value={newComplement.nom} onChange={e=>setNewComplement(f=>({...f,nom:e.target.value}))} placeholder="Nom du complément" style={iP("p")}/>
                <input value={newComplement.posologie||""} onChange={e=>setNewComplement(f=>({...f,posologie:e.target.value}))} placeholder="Posologie" style={iP("p")}/>
                <input value={newComplement.lien} onChange={e=>setNewComplement(f=>({...f,lien:e.target.value}))} placeholder="Lien produit (optionnel)" style={iP("p")}/>
                <input value={newComplement.codePromo||""} onChange={e=>setNewComplement(f=>({...f,codePromo:e.target.value}))} placeholder="Code promo (optionnel)" style={iP("p")}/>
                <Btn onClick={addComplement} disabled={savingComplements} variant="primary" style={{alignSelf:"flex-start"}}>Ajouter</Btn>
              </div>
            </div>
          )}

          {/* ── ONGLET PROTOCOLE ── */}
          {activeTab==="protocole"&&(
            <div>
              <div style={{background:"rgba(200,133,108,0.08)",border:"1px solid rgba(200,133,108,0.25)",borderRadius:14,padding:"18px 20px",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div>
                    <p style={{color:P.pAccent,fontSize:13,fontWeight:500,marginBottom:4}}>✦ Générer les protocoles avec l'IA</p>
                    <p style={{color:P.pTextDim,fontSize:12,lineHeight:1.5}}>
                      L'IA analyse les bilans et l'anamnèse de {selected.prenom} et pré-remplit les deux protocoles.{" "}
                      {documents.reduce((n,d)=>n+(d.files?.length||0),0)+anamneses.reduce((n,a)=>n+(a.bilans?.length||0),0)===0?" ⚠️ Aucun bilan disponible pour l'instant.":` ${documents.reduce((n,d)=>n+(d.files?.length||0),0)+anamneses.reduce((n,a)=>n+(a.bilans?.length||0),0)} document(s) disponible(s).`}
                    </p>
                  </div>
                  <button onClick={handleGenererIA} disabled={iaLoading} style={{background:iaLoading?"rgba(200,133,108,0.3)":P.pAccent,color:"#1C1410",border:"none",borderRadius:30,padding:"11px 22px",fontFamily:P.sans,fontWeight:500,fontSize:13,cursor:iaLoading?"not-allowed":"pointer",flexShrink:0,boxShadow:iaLoading?"none":"0 3px 10px rgba(200,133,108,0.3)",transition:"all 0.2s"}}>
                    {iaLoading?"⏳ "+iaStep:"✦ Générer"}
                  </button>
                </div>
                {iaLoading&&(<div style={{marginTop:14}}><div style={{height:3,background:"rgba(200,133,108,0.15)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:P.pAccent,borderRadius:2,width:iaStep.includes("cliente")?"50%":iaStep.includes("praticienne")?"85%":"20%",transition:"width 0.8s ease"}}/></div><p style={{color:P.pTextDim,fontSize:11,marginTop:8,textAlign:"center"}}>{iaStep}</p></div>)}
                {iaError&&<div style={{marginTop:12,background:"rgba(181,88,58,0.1)",border:"1px solid rgba(181,88,58,0.3)",borderRadius:10,padding:"10px 14px"}}><p style={{color:"#B5583A",fontSize:13}}>{iaError}</p></div>}
                {!iaLoading&&newProtocole.contenu&&newProtocole.contenu!==getDefaultMessage(selected.prenom)&&(<div style={{marginTop:12,background:"rgba(122,158,130,0.1)",border:"1px solid rgba(122,158,130,0.25)",borderRadius:10,padding:"10px 14px"}}><p style={{color:P.pGreen,fontSize:12}}>✓ Protocoles générés — Le protocole praticienne est dans les Notes privées. Relis et ajuste avant d'envoyer 🌿</p></div>)}
              </div>
              {protocoles.length>0&&(<div style={{marginBottom:20}}>{[...protocoles].reverse().map(p=>(<div key={p.id} style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,padding:"16px 18px",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><p style={{color:P.pAccent,fontFamily:P.serif,fontSize:17,fontWeight:400}}>{p.titre}</p><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:P.pTextDim,fontSize:11}}>{new Date(p.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span><button onClick={()=>deleteProtocole(p.id)} style={{background:"none",border:"none",color:"#B5583A",fontSize:18,cursor:"pointer"}}>×</button></div></div><p style={{color:P.pTextMid,fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{p.contenu}</p>{p.fichiers?.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:8}}>{p.fichiers.map((f,i)=><FileTag key={i} name={f.name} url={f.url} theme="p"/>)}</div>}</div>))}</div>)}
              <div style={{background:P.pSurface,borderRadius:14,border:`1px solid ${P.pBorder}`,padding:"18px 20px"}}>
                <p style={{color:P.pAccent,fontSize:13,fontWeight:500,marginBottom:14}}>{newProtocole.contenu&&newProtocole.contenu!==getDefaultMessage(selected.prenom)?"✏️ Relire et envoyer":"Nouveau protocole"}</p>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <input value={newProtocole.titre} onChange={e=>setNewProtocole(p=>({...p,titre:e.target.value}))} placeholder="Titre" style={iP("p")}/>
                  <textarea value={newProtocole.contenu} onChange={e=>setNewProtocole(p=>({...p,contenu:e.target.value}))} placeholder="Message d'accompagnement… ou génère-le avec l'IA ci-dessus 🌿" rows={14} style={{...iP("p"),resize:"vertical"}}/>
                  <div>
                    <p style={{color:P.pTextDim,fontSize:12,marginBottom:6}}>Joindre un fichier :</p>
                    <p style={{color:P.pTextDim,fontSize:11,marginBottom:8}}>Max 10 MB · <a href="https://ilovepdf.com" target="_blank" rel="noreferrer" style={{color:P.pAccent}}>ilovepdf.com</a></p>
                    <input type="file" multiple accept="image/*,application/pdf" onChange={e=>uploadProtocoleFiles(Array.from(e.target.files))} style={{color:P.pTextMid,fontSize:13,display:"block",width:"100%"}}/>
                  </div>
                  {uploadingProtocole&&<p style={{color:P.pAccent,fontSize:13}}>Upload en cours…</p>}
                  {protocoleFiles.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}><FileTag name={f.name} url={f.url} theme="p"/><button onClick={()=>setProtocoleFiles(prev=>prev.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#B5583A",fontSize:14,cursor:"pointer"}}>×</button></div>)}
                  <Btn onClick={sendProtocole} disabled={sendingProtocole||!newProtocole.titre.trim()} variant="primary">{sendingProtocole?"Envoi…":`Envoyer à ${selected.prenom}`}</Btn>
                </div>
              </div>
            </div>
          )}

          {/* ── ONGLET ANAMNÈSE ── */}
          {activeTab==="anamnese"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <Btn onClick={()=>setAnamneseMode("view")} variant={anamneseMode==="view"?"primary":"ghost"} theme="p" small>Réponses</Btn>
                <Btn onClick={()=>setAnamneseMode("upload")} variant={anamneseMode==="upload"?"primary":"ghost"} theme="p" small>Uploader PDF</Btn>
                {anamneses.length>0&&anamneses[0].pdfText&&<Btn onClick={()=>downloadAnamnesePDF(anamneses[0],selected.prenom)} variant="ghost" theme="p" small>⬇ Télécharger PDF</Btn>}
              </div>
              {anamneseMode==="view"&&(anamneses.length===0?<EmptyState message={`${selected.prenom} n'a pas encore rempli le questionnaire.`} theme="p"/>:anamneses.map(a=>(<div key={a.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><p style={{color:P.pTextDim,fontSize:12}}>Rempli le {new Date(a.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}{a.saisieParPraticienne&&<span style={{color:P.pAccent,marginLeft:8}}>· Saisi par toi</span>}</p></div>{a.bilans?.length>0&&<div style={{marginBottom:16}}>{a.bilans.map((b,i)=><a key={i} href={fixPdfUrl(b.url)} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:8,padding:"7px 12px",color:P.pAccent,fontSize:13,textDecoration:"none",marginRight:8,marginBottom:8}}><span>{b.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}</div>}{a.form&&Object.keys(a.form).length>0&&(<div style={{display:"flex",flexDirection:"column",gap:6}}>{[["Genre",a.form.genre],["Problématique principale",a.form.problematique],["Objectifs 3 mois",a.form.objectifs3mois],["Antécédents médicaux",a.form.maladiesChroniques],["Médicaments",a.form.medicaments],["Compléments actuels",a.form.complementsActuels],["Tour de taille",a.form.tourDeTaille&&`${a.form.tourDeTaille} cm`],["Tour de cou",a.form.tourDeCou&&`${a.form.tourDeCou} cm`],["Sommeil",a.form.qualiteSommeil&&`${a.form.qualiteSommeil}/10`],["Stress",a.form.niveauStress&&`${a.form.niveauStress}/10`],["Cycle",a.form.dureeCycle&&`${a.form.dureeCycle}j / règles ${a.form.dureeRegles}j`],["Douleurs",a.form.intensiteDouleurs&&`${a.form.intensiteDouleurs}/10 — ${a.form.descriptionDouleurs}`]].filter(([_,v])=>v).map(([label,val])=>(<div key={label} style={{display:"flex",gap:12,background:P.pSurface2,borderRadius:8,padding:"10px 14px"}}><span style={{color:P.pTextDim,fontSize:12,minWidth:170,flexShrink:0}}>{label}</span><span style={{color:P.pTextMid,fontSize:13,lineHeight:1.5}}>{val}</span></div>))}</div>)}</div>)))}
              {anamneseMode==="upload"&&(<div style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,padding:18}}><input type="file" multiple accept="image/*,application/pdf" onChange={e=>uploadAnamnesePDF(Array.from(e.target.files))} style={{color:P.pTextMid,fontSize:13,marginBottom:12,display:"block",width:"100%"}}/>{uploadingAnamnese&&<p style={{color:P.pAccent,fontSize:13}}>Upload en cours…</p>}{uploadedAnamnese.length>0&&<div style={{marginTop:12}}>{uploadedAnamnese.map((f,i)=><FileTag key={i} name={f.name} theme="p"/>)}<Btn onClick={saveAnamnesePDF} disabled={savingAnamnese} variant="primary" style={{marginTop:12}}>{savingAnamnese?"Enregistrement…":"Enregistrer dans le dossier"}</Btn></div>}</div>)}
            </div>
          )}

          {/* ── ONGLET DOCUMENTS ── */}
          {activeTab==="documents"&&!["anamnese","protocole","complements"].includes(activeTab)&&(
            <div>
              {documents.length===0?<EmptyState message={`Aucun document partagé par ${selected.prenom}.`} theme="p"/>
                :documents.map(d=>(<div key={d.id} style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,padding:"14px 18px",marginBottom:10}}><p style={{color:P.pTextDim,fontSize:11,marginBottom:10}}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{d.files?.map((f,i)=><a key={i} href={fixPdfUrl(f.url)} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:8,padding:"7px 12px",color:P.pAccent,fontSize:12,textDecoration:"none"}}><span>{f.type?.includes("image")?"🖼":"📄"}</span><span>{f.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}</div></div>))}
            </div>
          )}

          {/* ── ONGLET NOTES ── */}
          {activeTab==="notes"&&(
            <div>
              <div style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:16}}><p style={{color:P.pAccent,fontSize:11}}>🔒 Ces notes sont uniquement visibles par toi.</p></div>
              <textarea value={privateNotes} onChange={e=>setPrivateNotes(e.target.value)} placeholder={`Observations cliniques pour ${selected.prenom}…`} rows={5} style={{...iP("p"),resize:"vertical",marginBottom:10}}/>
              <Btn onClick={saveNote} disabled={savingNote||!privateNotes.trim()} variant="primary" style={{marginBottom:24}}>{savingNote?"Enregistrement…":"Enregistrer la note"}</Btn>
              {noteHistory.length>0&&(
                <div>
                  <p style={{color:P.pTextDim,fontSize:11,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Historique des notes</p>
                  {noteHistory.map(n=>(<div key={n.id} style={{background:P.pSurface,border:`1px solid ${P.pBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><p style={{color:P.pTextDim,fontSize:11}}>{new Date(n.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p><button onClick={()=>deleteNote(n.id)} style={{background:"none",border:"none",color:"#B5583A",fontSize:16,cursor:"pointer",lineHeight:1}}>×</button></div><p style={{color:P.pTextMid,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{n.text}</p></div>))}
                </div>
              )}
              <div style={{marginTop:28}}>
                <p style={{color:P.pTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:12}}>🔒 Protocole praticienne (privé — généré par l'IA)</p>
                <textarea value={protoPrat} onChange={e=>setProtoPrat(e.target.value)} placeholder={`Données techniques pour ${selected.prenom}…`} rows={8} style={{...iP("p"),resize:"vertical",marginBottom:10}}/>
                <Btn onClick={saveProtoPrat} disabled={savingProtoPrat||!protoPrat.trim()} variant="primary">{savingProtoPrat?"Enregistrement…":"Enregistrer le protocole praticienne"}</Btn>
              </div>
            </div>
          )}

          {/* ── ONGLET MESSAGES ── */}
          {activeTab==="message"&&(
            <div>
              {messages.length===0?<EmptyState message={`Aucun message envoyé à ${selected.prenom}.`} theme="p"/>
                :messages.map(m=>(<div key={m.id} style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:8}}><p style={{color:P.pText,fontSize:14,lineHeight:1.6}}>{m.text}</p><p style={{color:P.pTextDim,fontSize:11,marginTop:6}}>{new Date(m.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p></div>))}
              <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)} placeholder={`Message pour ${selected.prenom}…`} rows={3} style={{...iP("p"),resize:"vertical",marginTop:12,marginBottom:10}}/>
              <Btn onClick={sendMsg} disabled={sending||!newMsg.trim()} variant="primary">{sending?"Envoi…":`Envoyer à ${selected.prenom}`}</Btn>
            </div>
          )}
        </div>
      )}

      <BottomNav items={PRAT_NAV} active={mainView==="fiche"?"clients":mainView} onChange={v=>{setMainView(v);setSelected(null);}} theme="p"/>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);const [checking,setChecking]=useState(true);const [showLanding,setShowLanding]=useState(true);
  useEffect(()=>{
    setPersistence(auth,browserLocalPersistence).catch(console.error);
    const u=onAuthStateChanged(auth,async fw=>{
      if(fw){const d=await getDoc(doc(db,"users",fw.uid));setUser({uid:fw.uid,email:fw.email,prénom:d.data()?.prénom||"",role:fw.email===PRATICIENNE_EMAIL?"praticienne":"cliente"});setShowLanding(false);}
      else setUser(null);
      setChecking(false);
    });
    return u;
  },[]);
  const logout=async()=>{await signOut(auth);setUser(null);setShowLanding(true);};
  if(checking)return<div style={{minHeight:"100vh",background:P.pBg,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:P.serif,fontSize:22,color:P.pTextDim,fontWeight:300,letterSpacing:"1px"}}>meije.naturo</p></div>;
  return(
    <>
      <style>{GLOBAL_CSS}</style>
      {!user?(showLanding?<LandingPage onEnter={()=>setShowLanding(false)}/>:<Auth onLogin={()=>{}} onBack={()=>setShowLanding(true)}/>):user.role==="praticienne"?<Praticienne user={user} onLogout={logout}/>:<Cliente user={user} onLogout={logout}/>}
    </>
  );
}
