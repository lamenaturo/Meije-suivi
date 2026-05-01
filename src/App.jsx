import { useState, useEffect, useCallback, memo } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, where, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { browserLocalPersistence, setPersistence } from "firebase/auth";
import Anamnese from "./Anamnese";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const PRATICIENNE_EMAIL = "lamenaturo@gmail.com";
const CLOUD_NAME = "di45b4ymc";
const UPLOAD_PRESET = "meije_naturo";
const EMAILJS_SERVICE = "service_5bi57sr";
const EMAILJS_TEMPLATE = "template_3w471uo";
const EMAILJS_TEMPLATE_BIENVENUE = "template_im5mm8v";
const EMAILJS_PUBLIC = "zpxiv3rkIbtfdqAQ6";

const PHASES_CYCLE = ["Menstruelle", "Folliculaire", "Ovulation", "Lutéale", "Je ne sais pas"];

const TI = [
  { key: "sommeil", label: "Sommeil", icon: "🌙", question: "Comment as-tu dormi cette semaine ?" },
  { key: "digestion", label: "Digestion", icon: "🌿", question: "Comment as-tu digéré cette semaine ?" },
  { key: "energie", label: "Énergie", icon: "⚡", question: "Comment te sens-tu niveau énergie ?" },
  { key: "douleurs", label: "Douleurs", icon: "🔥", question: "Comment te sens-tu au niveau des douleurs ?" },
  { key: "humeur", label: "Humeur", icon: "🌊", question: "Comment te sens-tu émotionnellement ?" },
  { key: "alimentation", label: "Alimentation", icon: "🥗", question: "Comment as-tu mangé cette semaine ?" },
];

const SC = [
  { v: 1, label: "Pas top", color: "#B5583A" },
  { v: 2, label: "Difficile", color: "#C4784A" },
  { v: 3, label: "Moyen", color: "#B8A05A" },
  { v: 4, label: "Bien", color: "#6A9E7A" },
  { v: 5, label: "Super bien", color: "#4A8E6A" },
];

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
// Palette Automne Doux — fond marron chaud praticienne / crème cliente

const P = {
  // Praticienne — fond marron chaud
  pBg: "#1C1410",
  pSurface: "rgba(255,245,235,0.05)",
  pSurface2: "rgba(255,245,235,0.09)",
  pBorder: "rgba(255,245,235,0.1)",
  pBorder2: "rgba(255,245,235,0.18)",
  pText: "rgba(255,245,235,0.92)",
  pTextMid: "rgba(255,245,235,0.5)",
  pTextDim: "rgba(255,245,235,0.25)",
  pAccent: "#C8856C",      // terracotta
  pAccentDim: "rgba(200,133,108,0.15)",
  pAccentBorder: "rgba(200,133,108,0.3)",
  pGreen: "#7A9E82",       // sauge
  pGreenDim: "rgba(122,158,130,0.15)",

  // Cliente — fond crème
  cBg: "#F5EFE6",
  cSurface: "#FFFDFB",
  cSurface2: "#EDE6DA",
  cBorder: "rgba(44,28,16,0.1)",
  cBorder2: "rgba(44,28,16,0.2)",
  cText: "#2C1C10",
  cTextMid: "rgba(44,28,16,0.55)",
  cTextDim: "rgba(44,28,16,0.28)",
  cAccent: "#8B6A4A",      // bark chaud
  cGreen: "#5A8A68",       // sauge foncé
  cGreenDim: "rgba(90,138,104,0.12)",
  cGreenBorder: "rgba(90,138,104,0.25)",
  cTerra: "#B5583A",       // terracotta cliente
  cTerraDim: "rgba(181,88,58,0.1)",

  // Partagé
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', sans-serif",
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: ${P.pBg}; -webkit-font-smoothing: antialiased; }
  input, textarea, button, select { font-family: ${P.sans}; }
  input:focus, textarea:focus { outline: none; }
  button { cursor: pointer; }
  /* Mobile safe area */
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 16px); }
  /* Scroll */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  .slide-up { animation: slideUp 0.35s ease forwards; }
`;

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

const sendEmail = async (templateId, params) => {
  try {
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_PUBLIC);
      await window.emailjs.send(EMAILJS_SERVICE, templateId, params);
    }
  } catch (e) { console.error("Email error:", e); }
};

const wk = () => {
  const n = new Date();
  const s = new Date(n);
  s.setDate(n.getDate() - n.getDay() + 1);
  const mois = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
  return "Semaine du " + s.getDate() + " " + mois[s.getMonth()];
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%",
      transform: "translateX(-50%)",
      background: P.pAccent, color: "#1C1410",
      padding: "12px 22px", borderRadius: 30,
      fontFamily: P.sans, fontSize: 13, fontWeight: 500,
      zIndex: 9999, whiteSpace: "nowrap",
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      animation: "toastIn 0.3s ease forwards",
    }}>
      {message}
    </div>
  );
}

function ScoreDot({ value, size = 36 }) {
  const s = SC.find(x => x.v === value);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: s ? s.color + "22" : "rgba(255,255,255,0.06)",
      border: `1.5px solid ${s ? s.color : "rgba(255,255,255,0.1)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: s ? s.color : "rgba(255,255,255,0.3)",
      fontFamily: P.serif, fontSize: size * 0.42, fontWeight: 600,
      flexShrink: 0,
    }}>
      {value || "–"}
    </div>
  );
}

// ─── INPUT STYLES ─────────────────────────────────────────────────────────────

const iP = (theme = "p") => ({
  width: "100%",
  background: theme === "p" ? P.pSurface : P.cSurface,
  border: `1px solid ${theme === "p" ? P.pBorder : P.cBorder}`,
  borderRadius: 10,
  padding: "12px 14px",
  color: theme === "p" ? P.pText : P.cText,
  fontFamily: P.sans,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  WebkitAppearance: "none",
});

const Btn = ({ onClick, variant = "primary", theme = "p", disabled, children, style = {}, small }) => {
  const base = {
    padding: small ? "8px 16px" : "12px 22px",
    borderRadius: 30,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: P.sans,
    fontWeight: 500,
    fontSize: small ? 12 : 14,
    transition: "all 0.2s",
    opacity: disabled ? 0.5 : 1,
    letterSpacing: "0.2px",
    ...style,
  };
  const variants = {
    primary: { background: P.pAccent, color: "#1C1410" },
    sage: { background: P.pGreen, color: "#1C1410" },
    ghost: { background: theme === "p" ? P.pSurface : P.cSurface2, color: theme === "p" ? P.pTextMid : P.cTextMid, border: `1px solid ${theme === "p" ? P.pBorder : P.cBorder}` },
    danger: { background: "rgba(181,88,58,0.15)", color: "#B5583A", border: "1px solid rgba(181,88,58,0.2)" },
    cPrimary: { background: P.cGreen, color: "#FFFDFB" },
    cGhost: { background: P.cSurface2, color: P.cTextMid, border: `1px solid ${P.cBorder}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
};

// ─── POLITIQUE CONFIDENTIALITE ────────────────────────────────────────────────

function PolitiqueConfidentialite({ onClose, theme = "p" }) {
  const bg = theme === "p" ? P.pBg : P.cBg;
  const tx = theme === "p" ? P.pText : P.cText;
  const tm = theme === "p" ? P.pTextMid : P.cTextMid;
  const td = theme === "p" ? P.pTextDim : P.cTextDim;
  const ac = theme === "p" ? P.pAccent : P.cGreen;
  const sf = theme === "p" ? P.pSurface : P.cSurface;
  const bd = theme === "p" ? P.pBorder : P.cBorder;
  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "40px 20px", fontFamily: P.sans }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Btn onClick={onClose} variant="ghost" theme={theme} small style={{ marginBottom: 28 }}>← Retour</Btn>
        <h1 style={{ fontFamily: P.serif, fontSize: 30, color: tx, fontWeight: 300, marginBottom: 6 }}>Politique de confidentialité</h1>
        <p style={{ color: td, fontSize: 13, marginBottom: 36 }}>Mise à jour : avril 2026</p>
        {[
          ["1. Responsable du traitement", `Meije — Naturopathe fonctionnelle\nContact : lamenaturo@gmail.com\nSite : meije-suivi.vercel.app`],
          ["2. Données collectées", `Données d'identification : prénom, email\nDonnées de santé : questionnaire, symptômes, cycle, bilans\nDocuments : bilans sanguins, ordonnances\nMessages échangés avec la praticienne`],
          ["3. Finalité", `Préparer et personnaliser les consultations\nSuivre l'évolution de votre état de santé\nVous envoyer votre protocole personnalisé`],
          ["4. Base légale", `Votre consentement explicite (art. 9 RGPD)\nExécution du contrat d'accompagnement naturopathique`],
          ["5. Hébergement", `Firebase (Google) — base de données, serveurs Europe\nCloudinary — stockage des fichiers\nVercel — hébergement du site\nEmailJS — notifications email`],
          ["6. Conservation", `Durée de l'accompagnement + 3 ans. Suppression possible à tout moment sur demande.`],
          ["7. Vos droits", `Accès, rectification, effacement, portabilité, opposition.\nContact : lamenaturo@gmail.com\nRéclamation : www.cnil.fr`],
        ].map(([titre, texte]) => (
          <div key={titre} style={{ marginBottom: 24 }}>
            <h2 style={{ color: ac, fontSize: 14, fontWeight: 500, marginBottom: 8, letterSpacing: "0.3px" }}>{titre}</h2>
            <p style={{ color: tm, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-line" }}>{texte}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────

function LandingPage({ onEnter }) {
  const features = [
    { icon: "🌿", title: "Ton protocole personnalisé", desc: "Consulte ton protocole naturopathique à tout moment, depuis ton téléphone ou ordinateur." },
    { icon: "📝", title: "Suivi hebdomadaire", desc: "Remplis ton suivi chaque semaine — sommeil, énergie, cycle, douleurs — et suis ta progression." },
    { icon: "📈", title: "Visualise tes progrès", desc: "Un graphique clair pour voir l'évolution de tes symptômes semaine après semaine, en lien avec ton cycle." },
    { icon: "💬", title: "Échanges avec Meije", desc: "Reçois des messages personnalisés et reste en lien entre chaque consultation." },
  ];
  return (
    <div style={{ minHeight: "100vh", background: P.pBg, fontFamily: P.sans, overflowX: "hidden",
      backgroundImage: "radial-gradient(ellipse at 20% 10%, rgba(200,133,108,0.14) 0%, transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(122,158,130,0.1) 0%, transparent 50%)" }}>

      {/* Hero */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px 40px", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: P.pAccent, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 20, animation: "fadeIn 0.6s ease" }}>Naturopathie fonctionnelle</p>
        <h1 style={{ fontFamily: P.serif, fontSize: "clamp(36px, 8vw, 56px)", color: P.pText, fontWeight: 300, lineHeight: 1.15, marginBottom: 16, animation: "fadeIn 0.7s ease" }}>
          meije<span style={{ color: P.pAccent, fontStyle: "italic" }}>.</span>naturo
        </h1>
        <p style={{ color: P.pTextMid, fontSize: 16, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 36px", fontWeight: 300, animation: "fadeIn 0.8s ease" }}>
          Ton espace de suivi personnalisé — pour avancer vers ton mieux-être, semaine après semaine, avec un accompagnement qui te ressemble vraiment.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "slideUp 0.6s ease" }}>
          <button onClick={onEnter} style={{ background: P.pAccent, color: "#1C1410", border: "none", borderRadius: 30, padding: "14px 32px", fontFamily: P.sans, fontSize: 14, fontWeight: 500, cursor: "pointer", letterSpacing: "0.3px" }}>
            Accéder à mon espace
          </button>
          <a href="https://www.instagram.com/meije.naturo" target="_blank" rel="noreferrer" style={{ background: P.pSurface, color: P.pTextMid, border: `1px solid ${P.pBorder}`, borderRadius: 30, padding: "14px 24px", fontFamily: P.sans, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
            @meije.naturo
          </a>
        </div>
      </div>

      {/* Séparateur organique */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${P.pBorder}, transparent)`, margin: "8px 0" }} />

      {/* Features */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ fontFamily: P.serif, fontSize: 22, color: P.pText, fontWeight: 300, textAlign: "center", marginBottom: 28 }}>
          Ce que tu trouveras <em style={{ fontStyle: "italic", color: P.pAccent }}>ici</em>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} style={{ background: P.pSurface, border: `1px solid ${P.pBorder}`, borderRadius: 16, padding: "20px 20px" }}>
              <span style={{ fontSize: 22, display: "block", marginBottom: 10 }}>{icon}</span>
              <p style={{ color: P.pText, fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{title}</p>
              <p style={{ color: P.pTextDim, fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* À propos */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 32px" }}>
        <div style={{ background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, borderRadius: 20, padding: "28px 24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: P.pAccent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: P.serif, fontSize: 22, color: "#1C1410", flexShrink: 0 }}>M</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ fontFamily: P.serif, fontSize: 18, color: P.pText, fontWeight: 400, marginBottom: 8 }}>Meije, naturopathe fonctionnelle</p>
            <p style={{ color: P.pTextMid, fontSize: 13, lineHeight: 1.7 }}>
              Spécialisée en santé féminine — cycle hormonal, SOPK, SPM, endométriose et fertilité. J'accompagne les femmes qui veulent comprendre leur corps et retrouver leur équilibre naturellement.
            </p>
            <a href="https://www.instagram.com/meije.naturo" target="_blank" rel="noreferrer" style={{ color: P.pAccent, fontSize: 12, textDecoration: "none", display: "inline-block", marginTop: 10 }}>→ Instagram @meije.naturo</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "16px 20px 40px", borderTop: `1px solid ${P.pBorder}` }}>
        <p style={{ color: P.pTextDim, fontSize: 11 }}>
          Espace confidentiel · Données protégées · meije.naturo © 2026
        </p>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prénom, setPrénom] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (showPrivacy) return <PolitiqueConfidentialite onClose={() => setShowPrivacy(false)} theme="p" />;

  const login = async () => {
    setError(""); setLoading(true);
    try {
      const c = await signInWithEmailAndPassword(auth, email, password);
      const d = await getDoc(doc(db, "users", c.user.uid));
      onLogin({ uid: c.user.uid, email, prénom: d.data()?.prénom || "", role: email === PRATICIENNE_EMAIL ? "praticienne" : "cliente" });
    } catch { setError("Email ou mot de passe incorrect."); }
    setLoading(false);
  };

  const register = async () => {
    setError(""); setLoading(true);
    if (!email || !password || !prénom) { setError("Remplis tous les champs."); setLoading(false); return; }
    try {
      const c = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", c.user.uid), { prénom, email, role: "cliente", createdAt: new Date().toISOString(), complements: [] });
      onLogin({ uid: c.user.uid, email, prénom, role: "cliente" });
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setError("Compte déjà existant.");
      else if (e.code === "auth/weak-password") setError("Mot de passe trop court (6 min).");
      else setError("Erreur lors de la création du compte.");
    }
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
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "20px 20px 40px",
      background: P.pBg,
      backgroundImage: "radial-gradient(ellipse at 30% 20%, rgba(200,133,108,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(122,158,130,0.08) 0%, transparent 50%)",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 0.5s ease" }}>
        <p style={{ fontFamily: P.serif, fontSize: 32, color: P.pText, fontWeight: 300, letterSpacing: "1px", marginBottom: 6 }}>
          meije<span style={{ color: P.pAccent, fontStyle: "italic" }}>.</span>naturo
        </p>
        <p style={{ color: P.pTextDim, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase" }}>Espace de suivi personnalisé</p>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: P.pSurface,
        borderRadius: 20, border: `1px solid ${P.pBorder}`,
        padding: "28px 24px",
        animation: "slideUp 0.4s ease",
      }}>
        {/* Tabs login/register */}
        <div style={{ display: "flex", background: "rgba(255,245,235,0.04)", borderRadius: 30, padding: 3, marginBottom: 24 }}>
          {[["login", "Se connecter"], ["register", "Créer un compte"]].map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setResetSent(false); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 28, border: "none",
              fontFamily: P.sans, fontSize: 13, fontWeight: 500, transition: "all 0.2s",
              background: mode === m ? P.pAccent : "transparent",
              color: mode === m ? "#1C1410" : P.pTextDim,
            }}>{l}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <div>
              <label style={{ color: P.pTextDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 6 }}>Prénom</label>
              <input value={prénom} onChange={e => setPrénom(e.target.value)} placeholder="Ton prénom" style={iP("p")} />
            </div>
          )}
          <div>
            <label style={{ color: P.pTextDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 6 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.fr" type="email" style={iP("p")} onKeyDown={e => e.key === "Enter" && (mode === "login" ? login() : register())} />
          </div>
          <div>
            <label style={{ color: P.pTextDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 6 }}>Mot de passe</label>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" style={iP("p")} onKeyDown={e => e.key === "Enter" && (mode === "login" ? login() : register())} />
          </div>

          {error && <div style={{ color: "#C4614A", fontSize: 13, background: "rgba(196,97,74,0.1)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(196,97,74,0.2)" }}>{error}</div>}
          {resetSent && <div style={{ color: P.pGreen, fontSize: 13, background: P.pGreenDim, borderRadius: 10, padding: "10px 14px" }}>Email envoyé ! Vérifie ta boîte mail.</div>}

          <Btn onClick={mode === "login" ? login : register} disabled={loading} style={{ marginTop: 4, width: "100%" }}>
            {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </Btn>

          {mode === "login" && (
            <button onClick={reset} style={{ background: "none", border: "none", color: P.pTextDim, fontSize: 12, cursor: "pointer", fontFamily: P.sans, textAlign: "center", textDecoration: "underline", padding: "4px 0" }}>
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </div>

      <p style={{ color: P.pTextDim, fontSize: 11, textAlign: "center", marginTop: 20 }}>
        Suivi confidentiel ·{" "}
        <button onClick={() => setShowPrivacy(true)} style={{ background: "none", border: "none", color: P.pTextDim, fontSize: 11, cursor: "pointer", fontFamily: P.sans, textDecoration: "underline" }}>
          Politique de confidentialité
        </button>
      </p>
    </div>
  );
}

// ─── GRAPHIQUE ÉVOLUTION ──────────────────────────────────────────────────────

const PHASE_COLORS = {
  "Menstruelle": "#B5583A",
  "Folliculaire": "#C8956C",
  "Ovulation": "#4A8E6A",
  "Lutéale": "#7A6A9A",
  "Je ne sais pas": "#888",
};

function EvolutionChart({ entries, activeKeys, theme = "c" }) {
  const bg = theme === "c" ? P.cSurface : P.pSurface;
  const textColor = theme === "c" ? P.cTextMid : P.pTextMid;
  const dimColor = theme === "c" ? P.cTextDim : P.pTextDim;
  const borderColor = theme === "c" ? P.cBorder : P.pBorder;

  if (!entries || entries.length < 2) return (
    <div style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: "20px", textAlign: "center" }}>
      <p style={{ color: dimColor, fontSize: 13 }}>Au moins 2 semaines de suivi sont nécessaires pour afficher le graphique.</p>
    </div>
  );

  const W = 560, H = 200;
  const PAD = { top: 20, right: 16, bottom: 44, left: 32 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const n = entries.length;

  const xPos = i => PAD.left + (n === 1 ? iW / 2 : (i / (n - 1)) * iW);
  const yPos = v => PAD.top + iH - ((v - 1) / 4) * iH;

  const getAvg = e => {
    const vals = TI.map(i => e.scores?.[i.key]).filter(Boolean);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const getSeries = key => {
    if (key === "_avg") return entries.map(e => getAvg(e));
    return entries.map(e => e.scores?.[key] ?? null);
  };

  const CHART_KEYS = activeKeys.length ? activeKeys : ["_avg"];
  const COLORS = ["#C8856C", "#4A8E6A", "#7A6A9A", "#B8A05A", "#5A8ABE", "#BE5A8A"];

  const makePath = (data) => {
    const pts = data.map((v, i) => v !== null ? [xPos(i), yPos(v)] : null).filter(Boolean);
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1], [cx, cy] = pts[i];
      const cpx = (px + cx) / 2;
      d += ` C ${cpx} ${py} ${cpx} ${cy} ${cx} ${cy}`;
    }
    return d;
  };

  // Dates courtes
  const shortDate = iso => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: "16px", overflow: "hidden" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        {/* Grille Y */}
        {[1, 2, 3, 4, 5].map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)} stroke={theme === "c" ? "rgba(44,28,16,0.08)" : "rgba(255,245,235,0.07)"} strokeWidth={0.5} />
            <text x={PAD.left - 6} y={yPos(v) + 4} textAnchor="end" fontSize={9} fill={dimColor}>{v}</text>
          </g>
        ))}

        {/* Zones phase du cycle — fond coloré léger */}
        {entries.map((e, i) => {
          if (!e.cyclePhase || e.cyclePhase === "Je ne sais pas") return null;
          const x = xPos(i);
          const nextX = i < n - 1 ? xPos(i + 1) : W - PAD.right;
          const col = PHASE_COLORS[e.cyclePhase] || "#888";
          const segW = i < n - 1 ? (nextX - x) : 20;
          return (
            <rect key={i} x={x - segW / 2} y={PAD.top} width={segW} height={iH}
              fill={col} opacity={0.07} rx={2} />
          );
        })}

        {/* Courbes */}
        {CHART_KEYS.map((key, ki) => {
          const data = getSeries(key);
          const color = COLORS[ki % COLORS.length];
          const path = makePath(data);
          return (
            <g key={key}>
              {path && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.9} />}
              {data.map((v, i) => v !== null && (
                <circle key={i} cx={xPos(i)} cy={yPos(v)} r={3.5} fill={color} stroke={theme === "c" ? P.cSurface : "#1C1410"} strokeWidth={1.5} />
              ))}
            </g>
          );
        })}

        {/* Labels X + phase */}
        {entries.map((e, i) => {
          const x = xPos(i);
          const phase = e.cyclePhase && e.cyclePhase !== "Je ne sais pas" ? e.cyclePhase : null;
          const col = phase ? PHASE_COLORS[phase] : dimColor;
          // Affiche seulement 1 label sur 2 si trop de semaines
          const show = n <= 8 || i % 2 === 0;
          return show ? (
            <g key={i}>
              <text x={x} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill={phase ? col : dimColor} fontWeight={phase ? "500" : "400"}>
                {shortDate(e.date)}
              </text>
              {phase && (
                <text x={x} y={H - PAD.bottom + 26} textAnchor="middle" fontSize={8} fill={col} opacity={0.8}>
                  {phase.slice(0, 4)}.
                </text>
              )}
            </g>
          ) : null;
        })}
      </svg>

      {/* Légende phases */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, paddingTop: 10, borderTop: `1px solid ${borderColor}` }}>
        {Object.entries(PHASE_COLORS).filter(([k]) => k !== "Je ne sais pas").map(([phase, col]) => (
          <div key={phase} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: col, opacity: 0.7 }} />
            <span style={{ fontSize: 10, color: dimColor }}>{phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartSelector({ entries, theme = "c" }) {
  const allKeys = [
    { key: "_avg", label: "Moyenne globale", icon: "📊" },
    ...TI.map(t => ({ key: t.key, label: t.label, icon: t.icon })),
  ];

  // Par défaut : tous sélectionnés sauf la moyenne si on a des axes spécifiques
  const [selected, setSelected] = useState(["_avg"]);

  const toggle = key => {
    setSelected(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    );
  };

  const borderColor = theme === "c" ? P.cBorder : P.pBorder;
  const textColor = theme === "c" ? P.cTextMid : P.pTextMid;
  const activeGreen = theme === "c" ? P.cGreen : P.pGreen;
  const activeDim = theme === "c" ? P.cGreenDim : P.pGreenDim;

  const hasData = key => entries.some(e =>
    key === "_avg"
      ? TI.some(t => e.scores?.[t.key])
      : e.scores?.[key]
  );

  return (
    <div>
      {/* Sélecteur axes */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {allKeys.filter(k => hasData(k.key)).map(({ key, label, icon }) => {
          const active = selected.includes(key);
          return (
            <button key={key} onClick={() => toggle(key)} style={{
              padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${active ? activeGreen : borderColor}`,
              background: active ? activeDim : "transparent",
              color: active ? activeGreen : textColor,
              fontFamily: P.sans, fontSize: 11, fontWeight: active ? 500 : 400,
              cursor: "pointer",
            }}>
              {icon} {label}
            </button>
          );
        })}
      </div>
      <EvolutionChart entries={entries} activeKeys={selected} theme={theme} />
    </div>
  );
}

// ─── BOTTOM NAV (mobile) ──────────────────────────────────────────────────────

function BottomNav({ items, active, onChange, theme }) {
  const bg = theme === "p" ? P.pBg : P.cSurface;
  const border = theme === "p" ? P.pBorder : P.cBorder;
  const activeColor = theme === "p" ? P.pAccent : P.cGreen;
  const inactiveColor = theme === "p" ? P.pTextDim : P.cTextDim;
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: bg,
      borderTop: `1px solid ${border}`,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
      zIndex: 100,
    }}>
      {items.map(({ key, label, icon }) => {
        const isActive = active === key;
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            flex: 1, border: "none", background: "none",
            padding: "10px 4px 6px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: isActive ? activeColor : inactiveColor,
            fontFamily: P.sans, fontSize: 10, fontWeight: isActive ? 500 : 400,
            transition: "color 0.2s",
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── ESPACE CLIENTE ───────────────────────────────────────────────────────────

const CLIENT_NAV = [
  { key: "home", label: "Accueil", icon: "🏠" },
  { key: "suivi", label: "Suivi", icon: "📝" },
  { key: "evolution", label: "Évolution", icon: "📈" },
  { key: "protocole", label: "Protocole", icon: "🌿" },
  { key: "moi", label: "Mon dossier", icon: "👤" },
];

function Cliente({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [complements, setComplements] = useState([]);
  const [protocoles, setProtocoles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [view, setView] = useState("home");
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [cyclePhase, setCyclePhase] = useState("");
  const [cycleNote, setCycleNote] = useState("");
  const [complementsPris, setComplementsPris] = useState({});
  const [humeur, setHumeur] = useState("");
  const [confidences, setConfidences] = useState("");
  const [uploadDocs, setUploadDocs] = useState([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [anamneseView, setAnamneseView] = useState(false);

  const showToast = useCallback((msg) => setToast(msg), []);

  useEffect(() => {
    const q = query(collection(db, "entries"), where("userUid", "==", user.uid), orderBy("date", "asc"));
    const u = onSnapshot(q, s => { setEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const q2 = query(collection(db, "messages"), where("toUid", "==", user.uid), orderBy("date", "asc"));
    const u2 = onSnapshot(q2, s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q3 = query(collection(db, "anamneses"), where("userUid", "==", user.uid), orderBy("date", "asc"));
    const u3 = onSnapshot(q3, s => setAnamneses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q5 = query(collection(db, "protocoles"), where("toUid", "==", user.uid), orderBy("date", "asc"));
    const u5 = onSnapshot(q5, s => setProtocoles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q6 = query(collection(db, "documents"), where("userUid", "==", user.uid), orderBy("date", "asc"));
    const u6 = onSnapshot(q6, s => setDocuments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const userRef = doc(db, "users", user.uid);
    const u4 = onSnapshot(userRef, d => { if (d.data()?.complements) setComplements(d.data().complements); });
    return () => { u(); u2(); u3(); u4(); u5(); u6(); };
  }, [user.uid]);

  const doUploadDocs = async (files) => {
    setUploadingDocs(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET); fd.append("folder", "meije-naturo/suivis");
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.secure_url) uploaded.push({ url: data.secure_url, name: file.name, type: file.type });
      } catch {}
    }
    setUploadDocs(prev => [...prev, ...uploaded]);
    setUploadingDocs(false);
  };

  const submit = async () => {
    await addDoc(collection(db, "entries"), {
      userUid: user.uid, userEmail: user.email, userPrénom: user.prénom,
      weekLabel: wk(), date: new Date().toISOString(),
      scores, notes, cyclePhase, cycleNote,
      complementsPris, humeur_libre: humeur, confidences, documents: uploadDocs,
    });
    setScores({}); setNotes({}); setCyclePhase(""); setCycleNote("");
    setComplementsPris({}); setHumeur(""); setConfidences(""); setUploadDocs([]);
    setSaved(true);
    showToast("Suivi envoyé à Meije ✓");
    setTimeout(() => { setSaved(false); setView("home"); }, 1800);
  };

  const lm = messages[messages.length - 1];
  const hasAnamnese = anamneses.length > 0;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: P.cBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: P.serif, fontSize: 18, color: P.cTextDim, fontWeight: 300 }}>Chargement…</p>
    </div>
  );

  if (anamneseView) return <Anamnese user={user} onDone={() => setAnamneseView(false)} readonly={hasAnamnese} existingData={anamneses[0]} />;

  const pageStyle = { minHeight: "100vh", background: P.cBg, paddingBottom: 80, fontFamily: P.sans };
  const headerStyle = {
    background: P.cSurface, borderBottom: `1px solid ${P.cBorder}`,
    padding: "16px 20px 14px",
    position: "sticky", top: 0, zIndex: 50,
  };
  const inner = { maxWidth: 600, margin: "0 auto", padding: "20px 16px" };

  return (
    <div style={pageStyle}>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Header */}
      <div style={headerStyle}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: P.serif, fontSize: 20, color: P.cText, fontWeight: 300, letterSpacing: "0.5px" }}>
              Bonjour <em style={{ fontStyle: "italic", color: P.cGreen }}>{user.prénom}</em>
            </p>
            <p style={{ fontSize: 11, color: P.cTextDim, letterSpacing: "1px", textTransform: "uppercase", marginTop: 1 }}>meije.naturo</p>
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "none", fontFamily: P.sans, fontSize: 12, color: P.cTextDim, cursor: "pointer" }}>Déconnexion</button>
        </div>
      </div>

      {/* ── HOME ── */}
      {view === "home" && (
        <div style={inner} className="fade-in">
          {lm && (
            <div style={{ background: P.cSurface, border: `1px solid ${P.cBorder}`, borderLeft: `3px solid ${P.cGreen}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: P.cGreen, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>Message de Meije</p>
              <p style={{ color: P.cText, fontSize: 14, lineHeight: 1.7 }}>{lm.text}</p>
            </div>
          )}

          {/* Stats rapides */}
          {entries.length > 0 && (() => {
            const last = entries[entries.length - 1];
            const vs = TI.map(i => last.scores?.[i.key]).filter(Boolean);
            const avg = vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length) : null;
            const sc = avg ? SC.find(x => x.v === Math.round(avg)) : null;
            return (
              <div style={{ background: P.cSurface, borderRadius: 14, border: `1px solid ${P.cBorder}`, padding: "16px 18px", marginBottom: 20, display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: sc ? sc.color + "22" : P.cSurface2, border: `2px solid ${sc ? sc.color : P.cBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: P.serif, fontSize: 20, color: sc ? sc.color : P.cTextDim, fontWeight: 400 }}>{avg ? avg.toFixed(1) : "–"}</span>
                </div>
                <div>
                  <p style={{ color: P.cText, fontSize: 14, fontWeight: 500 }}>Dernière semaine</p>
                  <p style={{ color: P.cTextMid, fontSize: 12, marginTop: 2 }}>{last.weekLabel} · {sc?.label || "–"}</p>
                </div>
              </div>
            );
          })()}

          {/* Cards navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setAnamneseView(true)} style={{ background: P.cSurface, border: `1px solid ${P.cBorder}`, borderRadius: 14, padding: "18px 20px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: P.cAccent, fontFamily: P.serif, fontSize: 17, fontWeight: 400 }}>Mon questionnaire de santé</p>
                <p style={{ color: P.cTextMid, fontSize: 12, marginTop: 3 }}>{hasAnamnese ? "Consulter ou modifier mes réponses" : "À remplir avant notre première consultation"}</p>
              </div>
              <span style={{ color: P.cBorder2, fontSize: 20 }}>›</span>
            </button>

            {protocoles.length > 0 && (
              <div style={{ background: P.cGreenDim, border: `1px solid ${P.cGreenBorder}`, borderRadius: 14, padding: "16px 18px" }}>
                <p style={{ fontSize: 10, color: P.cGreen, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>Mon protocole actuel</p>
                <p style={{ color: P.cText, fontSize: 14, fontWeight: 500 }}>{protocoles[protocoles.length - 1].titre}</p>
                <p style={{ color: P.cTextMid, fontSize: 12, marginTop: 4 }}>{new Date(protocoles[protocoles.length - 1].date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
              </div>
            )}

            {entries.length > 0 && (
              <button onClick={() => setView("historique")} style={{ background: P.cSurface, border: `1px solid ${P.cBorder}`, borderRadius: 14, padding: "16px 20px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: P.cText, fontSize: 14, fontWeight: 500 }}>Mon historique</p>
                  <p style={{ color: P.cTextMid, fontSize: 12, marginTop: 2 }}>{entries.length} semaine{entries.length > 1 ? "s" : ""} enregistrée{entries.length > 1 ? "s" : ""}</p>
                </div>
                <span style={{ color: P.cBorder2, fontSize: 20 }}>›</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SUIVI DE LA SEMAINE ── */}
      {view === "suivi" && (
        <div style={inner} className="fade-in">
          <p style={{ fontFamily: P.serif, fontSize: 22, color: P.cText, fontWeight: 300, marginBottom: 4 }}>Suivi de la semaine</p>
          <p style={{ color: P.cTextDim, fontSize: 12, letterSpacing: "0.5px", marginBottom: 24 }}>{wk()}</p>

          {/* Compléments */}
          {complements.length > 0 && (
            <Section title="Tes compléments cette semaine" theme="c">
              {complements.map((c, i) => {
                const nom = typeof c === "string" ? c : c.nom;
                const lien = typeof c === "string" ? "" : c.lien;
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ color: P.cText, fontSize: 13 }}>{nom}</span>
                      {lien && <a href={lien} target="_blank" rel="noreferrer" style={{ color: P.cGreen, fontSize: 11, textDecoration: "none" }}>→ Commander</a>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["Pris régulièrement", "Pris irrégulièrement", "Pas pris"].map(opt => {
                        const colors = { "Pris régulièrement": "#4A8E6A", "Pris irrégulièrement": "#B8A05A", "Pas pris": "#B5583A" };
                        const active = complementsPris[nom] === opt;
                        return (
                          <button key={opt} onClick={() => setComplementsPris(p => ({ ...p, [nom]: opt }))} style={{
                            padding: "7px 12px", borderRadius: 20,
                            border: `1.5px solid ${active ? colors[opt] : P.cBorder}`,
                            background: active ? colors[opt] + "18" : "transparent",
                            color: active ? colors[opt] : P.cTextMid,
                            fontSize: 12, fontFamily: P.sans, fontWeight: active ? 500 : 400,
                          }}>{opt}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Cycle */}
          <Section title="🌸 Où en es-tu dans ton cycle ?" theme="c">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {PHASES_CYCLE.map(p => (
                <button key={p} onClick={() => setCyclePhase(p)} style={{
                  padding: "8px 14px", borderRadius: 20,
                  border: `1.5px solid ${cyclePhase === p ? P.cGreen : P.cBorder}`,
                  background: cyclePhase === p ? P.cGreenDim : "transparent",
                  color: cyclePhase === p ? P.cGreen : P.cTextMid,
                  fontSize: 13, fontFamily: P.sans,
                }}>{p}</button>
              ))}
            </div>
            <textarea value={cycleNote} onChange={e => setCycleNote(e.target.value)} placeholder="Précisions sur ton cycle..." rows={2} style={{ ...iP("c"), resize: "vertical" }} />
          </Section>

          {/* Scores */}
          {TI.map(item => (
            <Section key={item.key} title={`${item.icon} ${item.question}`} theme="c">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {SC.map(s => {
                  const active = scores[item.key] === s.v;
                  return (
                    <button key={s.v} onClick={() => setScores(p => ({ ...p, [item.key]: s.v }))} style={{
                      padding: "8px 14px", borderRadius: 20,
                      border: `1.5px solid ${active ? s.color : P.cBorder}`,
                      background: active ? s.color + "18" : "transparent",
                      color: active ? s.color : P.cTextMid,
                      fontSize: 13, fontFamily: P.sans, fontWeight: active ? 500 : 400,
                    }}>{s.v} · {s.label}</button>
                  );
                })}
              </div>
              <textarea value={notes[item.key] || ""} onChange={e => setNotes(p => ({ ...p, [item.key]: e.target.value }))} placeholder={`Précisions sur ${item.label.toLowerCase()}…`} rows={2} style={{ ...iP("c"), resize: "vertical" }} />
            </Section>
          ))}

          <Section title="Comment tu te sens globalement ?" theme="c">
            <textarea value={humeur} onChange={e => setHumeur(e.target.value)} placeholder="Fatiguée, stressée, en forme…" rows={3} style={{ ...iP("c"), resize: "vertical" }} />
          </Section>
          <Section title="Tu as quelque chose à ajouter ?" theme="c">
            <textarea value={confidences} onChange={e => setConfidences(e.target.value)} placeholder="Une question, un détail, ce qui s'est passé cette semaine…" rows={4} style={{ ...iP("c"), resize: "vertical" }} />
          </Section>

          {saved
            ? <div style={{ background: P.cGreenDim, border: `1px solid ${P.cGreenBorder}`, borderRadius: 12, padding: 14, color: P.cGreen, textAlign: "center", fontFamily: P.sans }}>Suivi enregistré ✓</div>
            : <Btn onClick={submit} variant="cPrimary" style={{ width: "100%", marginTop: 8 }}>Envoyer à Meije</Btn>
          }
        </div>
      )}

      {/* ── PROTOCOLE ── */}
      {view === "protocole" && (
        <div style={inner} className="fade-in">
          <p style={{ fontFamily: P.serif, fontSize: 22, color: P.cText, fontWeight: 300, marginBottom: 20 }}>Mon protocole</p>
          {protocoles.length === 0
            ? <EmptyState message="Ton protocole personnalisé apparaîtra ici après votre première consultation." theme="c" />
            : [...protocoles].reverse().map(p => (
              <div key={p.id} style={{ background: P.cSurface, border: `1px solid ${P.cBorder}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <p style={{ fontFamily: P.serif, fontSize: 18, color: P.cText, fontWeight: 400 }}>{p.titre}</p>
                  <span style={{ color: P.cTextDim, fontSize: 11 }}>{new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
                </div>
                <p style={{ color: P.cTextMid, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{p.contenu}</p>
                {p.fichiers?.length > 0 && (
                  <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {p.fichiers.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ background: P.cGreenDim, border: `1px solid ${P.cGreenBorder}`, borderRadius: 8, padding: "7px 12px", color: P.cGreen, fontSize: 12, textDecoration: "none" }}>{f.name}</a>
                    ))}
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* ── ÉVOLUTION ── */}
      {view === "evolution" && (
        <div style={inner} className="fade-in">
          <p style={{ fontFamily: P.serif, fontSize: 22, color: P.cText, fontWeight: 300, marginBottom: 4 }}>Mon évolution</p>
          <p style={{ color: P.cTextDim, fontSize: 12, marginBottom: 20 }}>Tes scores semaine par semaine, en lien avec ton cycle</p>

          {entries.length < 2
            ? <EmptyState message="Remplis au moins 2 semaines de suivi pour voir ton évolution." theme="c" />
            : (
              <>
                {/* Résumé progression */}
                {(() => {
                  const last = entries[entries.length - 1];
                  const first = entries[0];
                  const getAvg = e => { const vs = TI.map(i => e.scores?.[i.key]).filter(Boolean); return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null; };
                  const avgFirst = getAvg(first), avgLast = getAvg(last);
                  const diff = avgFirst && avgLast ? (avgLast - avgFirst).toFixed(1) : null;
                  return diff ? (
                    <div style={{ background: diff > 0 ? P.cGreenDim : P.cTerraDim, border: `1px solid ${diff > 0 ? P.cGreenBorder : "rgba(181,88,58,0.2)"}`, borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 28 }}>{diff > 0 ? "📈" : "📉"}</span>
                      <div>
                        <p style={{ color: diff > 0 ? P.cGreen : P.cTerra, fontWeight: 500, fontSize: 14 }}>
                          {diff > 0 ? `+${diff} points depuis le début` : `${diff} points depuis le début`}
                        </p>
                        <p style={{ color: P.cTextMid, fontSize: 12, marginTop: 2 }}>
                          {entries.length} semaines · de {avgFirst?.toFixed(1)} à {avgLast?.toFixed(1)} en moyenne
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}

                <ChartSelector entries={entries} theme="c" />

                {/* Mini-résumé par axe */}
                <div style={{ marginTop: 20 }}>
                  <p style={{ color: P.cTextDim, fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Progression par axe</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                    {TI.filter(t => entries.some(e => e.scores?.[t.key])).map(t => {
                      const vals = entries.map(e => e.scores?.[t.key]).filter(Boolean);
                      const first = vals[0], last = vals[vals.length - 1];
                      const diff = last - first;
                      const sc = SC.find(x => x.v === Math.round(last));
                      return (
                        <div key={t.key} style={{ background: P.cSurface, border: `1px solid ${P.cBorder}`, borderRadius: 12, padding: "12px 14px" }}>
                          <p style={{ fontSize: 16, marginBottom: 4 }}>{t.icon}</p>
                          <p style={{ color: P.cTextMid, fontSize: 11, marginBottom: 6 }}>{t.label}</p>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontFamily: P.serif, fontSize: 20, color: sc?.color || P.cText }}>{last}</span>
                            <span style={{ fontSize: 11, color: diff > 0 ? P.cGreen : diff < 0 ? P.cTerra : P.cTextDim, fontWeight: 500 }}>
                              {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "="}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )
          }
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {view === "docs" && (
        <div style={inner} className="fade-in">
          <p style={{ fontFamily: P.serif, fontSize: 22, color: P.cText, fontWeight: 300, marginBottom: 6 }}>Mes documents</p>
          <p style={{ color: P.cTextMid, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Envoie tes bilans, ordonnances, photos… Meije les recevra directement.</p>
          <div style={{ background: P.cSurface, borderRadius: 14, border: `1px solid ${P.cBorder}`, padding: "18px 20px", marginBottom: 20 }}>
            <label style={{ display: "block", background: P.cGreenDim, border: `1px dashed ${P.cGreenBorder}`, borderRadius: 10, padding: "20px", textAlign: "center", cursor: "pointer", color: P.cGreen, fontSize: 13 }}>
              + Ajouter un fichier
              <input type="file" multiple accept="image/*,application/pdf" onChange={e => doUploadDocs(Array.from(e.target.files))} style={{ display: "none" }} />
            </label>
            {uploadingDocs && <p style={{ color: P.cGreen, fontSize: 13, marginTop: 10, textAlign: "center" }}>Upload en cours…</p>}
            {uploadDocs.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {uploadDocs.map((d, i) => <FileTag key={i} name={d.name} theme="c" />)}
                <Btn variant="cPrimary" onClick={async () => {
                  await addDoc(collection(db, "documents"), { userUid: user.uid, userEmail: user.email, date: new Date().toISOString(), files: uploadDocs });
                  setUploadDocs([]);
                  showToast("Documents envoyés à Meije ✓");
                }} style={{ marginTop: 12, width: "100%" }}>Envoyer à Meije</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MON DOSSIER ── */}
      {view === "moi" && (
        <div style={inner} className="fade-in">
          <p style={{ fontFamily: P.serif, fontSize: 22, color: P.cText, fontWeight: 300, marginBottom: 20 }}>Mon dossier</p>
          <div style={{ background: P.cSurface, borderRadius: 14, border: `1px solid ${P.cBorder}`, padding: "16px 20px", marginBottom: 16 }}>
            <p style={{ color: P.cTextDim, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Compte</p>
            <p style={{ color: P.cText, fontSize: 15 }}>{user.prénom}</p>
            <p style={{ color: P.cTextMid, fontSize: 13, marginTop: 2 }}>{user.email}</p>
          </div>
          <Btn variant="ghost" theme="c" onClick={() => setAnamneseView(true)} style={{ width: "100%", marginBottom: 10 }}>
            {hasAnamnese ? "Voir mon questionnaire de santé" : "Remplir mon questionnaire"}
          </Btn>
          <Btn variant="ghost" theme="c" onClick={onLogout} style={{ width: "100%" }}>Se déconnecter</Btn>
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {view === "historique" && (
        <div style={inner} className="fade-in">
          <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: P.cTextMid, fontSize: 13, fontFamily: P.sans, marginBottom: 16, cursor: "pointer" }}>← Retour</button>
          <p style={{ fontFamily: P.serif, fontSize: 22, color: P.cText, fontWeight: 300, marginBottom: 20 }}>Mon historique</p>
          {[...entries].reverse().map(e => {
            const vs = TI.map(i => e.scores?.[i.key]).filter(Boolean);
            const avg = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
            const sc = avg ? SC.find(x => x.v === Math.round(avg)) : null;
            return (
              <div key={e.id} style={{ background: P.cSurface, borderRadius: 12, border: `1px solid ${P.cBorder}`, padding: "16px 18px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <p style={{ color: P.cText, fontWeight: 500, fontSize: 14 }}>{e.weekLabel}</p>
                    <p style={{ color: P.cTextDim, fontSize: 11, marginTop: 2 }}>{new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                  </div>
                  {avg && <div style={{ background: sc ? sc.color + "22" : P.cSurface2, border: `1.5px solid ${sc?.color || P.cBorder}`, borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: P.serif, fontSize: 16, color: sc?.color || P.cTextDim }}>{avg.toFixed(1)}</div>}
                </div>
                {e.cyclePhase && <p style={{ color: P.cAccent, fontSize: 12, marginBottom: 6 }}>Phase : {e.cyclePhase}</p>}
                {e.confidences && <p style={{ color: P.cTextMid, fontSize: 13, lineHeight: 1.6 }}>{e.confidences}</p>}
              </div>
            );
          })}
        </div>
      )}

      <BottomNav
        items={CLIENT_NAV}
        active={view}
        onChange={setView}
        theme="c"
      />
    </div>
  );
}

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────

function Section({ title, children, theme = "p" }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ color: theme === "c" ? P.cText : P.pText, fontSize: 14, fontWeight: 500, marginBottom: 12, lineHeight: 1.4 }}>{title}</p>
      {children}
    </div>
  );
}

function EmptyState({ message, theme = "p" }) {
  const bg = theme === "p" ? P.pSurface : P.cSurface;
  const bd = theme === "p" ? P.pBorder : P.cBorder;
  const td = theme === "p" ? P.pTextDim : P.cTextDim;
  return (
    <div style={{ background: bg, borderRadius: 12, border: `1px solid ${bd}`, padding: "24px 20px", textAlign: "center" }}>
      <p style={{ color: td, fontSize: 14, lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

function FileTag({ name, theme = "p" }) {
  const bg = theme === "p" ? P.pAccentDim : P.cGreenDim;
  const bd = theme === "p" ? P.pAccentBorder : P.cGreenBorder;
  const col = theme === "p" ? P.pAccent : P.cGreen;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "6px 12px", marginBottom: 6, marginRight: 6 }}>
      <span style={{ color: col, fontSize: 12 }}>✓</span>
      <span style={{ color: col, fontSize: 12 }}>{name}</span>
    </div>
  );
}

// ─── ESPACE PRATICIENNE ───────────────────────────────────────────────────────

const PRAT_NAV = [
  { key: "clients", label: "Consultantes", icon: "👥" },
  { key: "messages", label: "Messages", icon: "💬" },
  { key: "profil", label: "Mon espace", icon: "🌿" },
];

const TABS_CLIENT = [
  { key: "dossier", label: "Dossier" },
  { key: "suivi", label: "Suivis" },
  { key: "evolution", label: "Évolution" },
  { key: "complements", label: "Compléments" },
  { key: "protocole", label: "Protocole" },
  { key: "anamnese", label: "Questionnaire" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes privées" },
  { key: "message", label: "Message" },
];

function Praticienne({ user, onLogout }) {
  const [clients, setClients] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [selected, setSelected] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [protocoles, setProtocoles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("dossier");
  const [mainView, setMainView] = useState("clients");
  const [newProtocole, setNewProtocole] = useState({ titre: "", contenu: "" });
  const [sendingProtocole, setSendingProtocole] = useState(false);
  const [newComplement, setNewComplement] = useState({ nom: "", lien: "" });
  const [savingComplements, setSavingComplements] = useState(false);
  const [anamneseMode, setAnamneseMode] = useState("view");
  const [uploadedAnamnese, setUploadedAnamnese] = useState([]);
  const [uploadingAnamnese, setUploadingAnamnese] = useState(false);
  const [savingAnamnese, setSavingAnamnese] = useState(false);
  const [protocoleFiles, setProtocoleFiles] = useState([]);
  const [uploadingProtocole, setUploadingProtocole] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ prenom: "", email: "", password: "" });
  const [creatingClient, setCreatingClient] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [toast, setToast] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteHistory, setNoteHistory] = useState([]);
  const showToast = useCallback((msg) => setToast(msg), []);

  const getDefaultTitre = (prenom, nb) => `Protocole n°${nb + 1} — ${prenom}`;
  const getDefaultMessage = (prenom) => `Bonjour ${prenom},\n\nSuite à notre consultation, je t'ai préparé ton protocole personnalisé. Tu le trouveras ci-dessous.\n\nN'hésite pas à me contacter si tu as des questions.\n\nPrends soin de toi 🌿\nMeije`;

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "cliente"));
    const u = onSnapshot(q, s => {
      const list = s.docs.map(d => ({ uid: d.id, ...d.data() }));
      list.sort((a, b) => (a.prenom || "").localeCompare(b.prenom || "", "fr"));
      setClients(list);
      setLoading(false);
    });
    // Tous les messages (pour vue globale)
    const qm = query(collection(db, "messages"), orderBy("date", "desc"));
    const um = onSnapshot(qm, s => setAllMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u(); um(); };
  }, []);

  const clientsFiltres = clients.filter(c =>
    (c.prenom || "").toLowerCase().includes(recherche.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(recherche.toLowerCase())
  );

  const select = useCallback(c => {
    setSelected(c); setNewMsg(""); setActiveTab("dossier"); setAnamneseMode("view");
    setNewProtocole({ titre: getDefaultTitre(c.prenom, 0), contenu: getDefaultMessage(c.prenom) });
    const userRef = doc(db, "users", c.uid);
    onSnapshot(userRef, d => setClientData(d.data()));
    const q1 = query(collection(db, "entries"), where("userUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q1, s => setEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q2 = query(collection(db, "messages"), where("toUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q2, s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q3 = query(collection(db, "anamneses"), where("userUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q3, s => setAnamneses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q4 = query(collection(db, "protocoles"), where("toUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q4, s => {
      const p = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setProtocoles(p);
      setNewProtocole(prev => ({ ...prev, titre: getDefaultTitre(c.prenom, p.length) }));
    });
    const q5 = query(collection(db, "documents"), where("userUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q5, s => setDocuments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    // Notes privées
    const q6 = query(collection(db, "notes_privees"), where("clientUid", "==", c.uid), orderBy("date", "desc"));
    onSnapshot(q6, s => setNoteHistory(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    setPrivateNotes("");
    setMainView("fiche");
  }, []);

  const saveNote = async () => {
    if (!privateNotes.trim()) return;
    setSavingNote(true);
    await addDoc(collection(db, "notes_privees"), {
      clientUid: selected.uid, clientPrenom: selected.prenom,
      text: privateNotes.trim(), date: new Date().toISOString(),
    });
    setPrivateNotes("");
    setSavingNote(false);
    showToast("Note enregistrée ✓");
  };

  const deleteNote = async (id) => {
    const { deleteDoc, doc: fd } = await import("firebase/firestore");
    await deleteDoc(fd(db, "notes_privees", id));
  };
    if (!newClientForm.prenom || !newClientForm.email || !newClientForm.password) return;
    setCreatingClient(true);
    try {
      const { initializeApp, getApp } = await import("firebase/app");
      const { getAuth, createUserWithEmailAndPassword: createUser } = await import("firebase/auth");
      let secondaryApp;
      try { secondaryApp = getApp("secondary"); }
      catch {
        const { firebaseConfig } = await import("./firebase");
        secondaryApp = initializeApp(firebaseConfig, "secondary");
      }
      const secondaryAuth = getAuth(secondaryApp);
      const c = await createUser(secondaryAuth, newClientForm.email, newClientForm.password);
      await setDoc(doc(db, "users", c.user.uid), {
        prenom: newClientForm.prenom, email: newClientForm.email,
        role: "cliente", createdAt: new Date().toISOString(), complements: [], rappelsActifs: true,
      });
      await secondaryAuth.signOut();
      await sendEmail(EMAILJS_TEMPLATE_BIENVENUE, { prenom: newClientForm.prenom, to_email: newClientForm.email });
      setNewClientForm({ prenom: "", email: "", password: "" });
      setShowNewClient(false);
      showToast("Espace créé pour " + newClientForm.prenom + " ✓");
    } catch (e) { alert("Erreur : " + e.message); }
    setCreatingClient(false);
  };

  const addComplement = async () => {
    if (!newComplement.nom.trim()) return;
    setSavingComplements(true);
    const current = clientData?.complements || [];
    const item = { nom: newComplement.nom.trim(), lien: newComplement.lien.trim() };
    await updateDoc(doc(db, "users", selected.uid), { complements: [...current, item] });
    setNewComplement({ nom: "", lien: "" });
    setSavingComplements(false);
    showToast("Complément ajouté ✓");
  };

  const removeComplement = async (idx) => {
    const current = clientData?.complements || [];
    await updateDoc(doc(db, "users", selected.uid), { complements: current.filter((_, i) => i !== idx) });
  };

  const uploadProtocoleFiles = async (files) => {
    setUploadingProtocole(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET); fd.append("folder", "meije-naturo/protocoles");
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.secure_url) uploaded.push({ url: data.secure_url, name: file.name, type: file.type });
      } catch {}
    }
    setProtocoleFiles(prev => [...prev, ...uploaded]);
    setUploadingProtocole(false);
  };

  const sendProtocole = async () => {
    if (!newProtocole.titre.trim()) return;
    setSendingProtocole(true);
    await addDoc(collection(db, "protocoles"), {
      toUid: selected.uid, toEmail: selected.email, toPrenom: selected.prenom,
      titre: newProtocole.titre.trim(), contenu: newProtocole.contenu.trim(),
      fichiers: protocoleFiles, date: new Date().toISOString(),
    });
    try { await sendEmail(EMAILJS_TEMPLATE, { prenom: selected.prenom, to_email: selected.email, titre: newProtocole.titre.trim() }); } catch {}
    setNewProtocole({ titre: "", contenu: "" }); setProtocoleFiles([]);
    setSendingProtocole(false);
    showToast("Protocole envoyé à " + selected.prenom + " ✓");
  };

  const sendMsg = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await addDoc(collection(db, "messages"), {
      toUid: selected.uid, toEmail: selected.email, toPrenom: selected.prenom,
      text: newMsg.trim(), date: new Date().toISOString(),
    });
    setNewMsg(""); setSending(false);
    showToast("Message envoyé à " + selected.prenom + " ✓");
  };

  const uploadAnamnesePDF = async (files) => {
    setUploadingAnamnese(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET); fd.append("folder", "meije-naturo/anamneses");
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.secure_url) uploaded.push({ url: data.secure_url, name: file.name, type: file.type });
      } catch {}
    }
    setUploadedAnamnese(prev => [...prev, ...uploaded]);
    setUploadingAnamnese(false);
  };

  const saveAnamnesePDF = async () => {
    if (!uploadedAnamnese.length) return;
    setSavingAnamnese(true);
    await addDoc(collection(db, "anamneses"), {
      userUid: selected.uid, userEmail: selected.email, userPrenom: selected.prenom,
      date: new Date().toISOString(), saisieParPraticienne: true, bilans: uploadedAnamnese,
    });
    setUploadedAnamnese([]); setSavingAnamnese(false); setAnamneseMode("view");
    showToast("Document enregistré ✓");
  };

  const deleteProtocole = async (id) => {
    if (!window.confirm("Supprimer ce protocole ?")) return;
    const { deleteDoc, doc: fd } = await import("firebase/firestore");
    await deleteDoc(fd(db, "protocoles", id));
    showToast("Protocole supprimé");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: P.pBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: P.serif, fontSize: 20, color: P.pTextDim, fontWeight: 300 }}>Chargement…</p>
    </div>
  );

  const pInner = { maxWidth: 800, margin: "0 auto", padding: "20px 16px" };
  const pHeader = {
    background: P.pSurface, borderBottom: `1px solid ${P.pBorder}`,
    padding: "16px 20px", position: "sticky", top: 0, zIndex: 50,
  };

  return (
    <div style={{ minHeight: "100vh", background: P.pBg, fontFamily: P.sans, paddingBottom: 80 }}>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Header */}
      <div style={pHeader}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: P.serif, fontSize: 20, color: P.pText, fontWeight: 300, letterSpacing: "0.5px" }}>
              meije<span style={{ color: P.pAccent, fontStyle: "italic" }}>.</span>naturo
            </p>
            <p style={{ fontSize: 10, color: P.pAccent, letterSpacing: "2px", textTransform: "uppercase", marginTop: 1 }}>Espace praticienne</p>
          </div>
          {selected && mainView === "fiche" && (
            <button onClick={() => { setSelected(null); setMainView("clients"); }} style={{ background: P.pSurface2, border: `1px solid ${P.pBorder}`, borderRadius: 20, padding: "7px 14px", color: P.pTextMid, fontSize: 12, fontFamily: P.sans }}>← Retour</button>
          )}
        </div>
      </div>

      {/* ── LISTE CONSULTANTES ── */}
      {mainView === "clients" && (
        <div style={pInner} className="fade-in">
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher une consultante…" style={{ ...iP("p"), flex: 1 }} />
            <Btn onClick={() => setShowNewClient(!showNewClient)} variant="primary" style={{ flexShrink: 0, borderRadius: 10, padding: "11px 16px" }}>+</Btn>
          </div>

          {showNewClient && (
            <div style={{ background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }} className="slide-up">
              <p style={{ color: P.pAccent, fontWeight: 500, fontSize: 14, marginBottom: 14 }}>Créer un espace consultante</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={newClientForm.prenom} onChange={e => setNewClientForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" style={iP("p")} />
                <input value={newClientForm.email} onChange={e => setNewClientForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" type="email" style={iP("p")} />
                <input value={newClientForm.password} onChange={e => setNewClientForm(f => ({ ...f, password: e.target.value }))} placeholder="Mot de passe temporaire" style={iP("p")} />
              </div>
              <p style={{ color: P.pTextDim, fontSize: 12, margin: "10px 0" }}>Elle pourra le changer via "Mot de passe oublié".</p>
              <Btn onClick={createClient} disabled={creatingClient} variant="primary">{creatingClient ? "Création…" : "Créer son espace"}</Btn>
            </div>
          )}

          <p style={{ color: P.pTextDim, fontSize: 12, marginBottom: 12 }}>{clients.length} consultante{clients.length > 1 ? "s" : ""}</p>

          {/* Index alphabet */}
          {!recherche && clients.length > 5 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => {
                const has = clients.some(c => (c.prenom || "").toUpperCase().startsWith(l));
                return has ? (
                  <button key={l} onClick={() => setRecherche(l)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${P.pAccentBorder}`, background: P.pAccentDim, color: P.pAccent, fontSize: 11, fontFamily: P.sans, fontWeight: 500 }}>{l}</button>
                ) : null;
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clientsFiltres.map(c => (
              <button key={c.uid} onClick={() => select(c)} style={{
                background: P.pSurface, border: `1px solid ${P.pBorder}`,
                borderRadius: 12, padding: "14px 18px",
                textAlign: "left", display: "flex", alignItems: "center",
                justifyContent: "space-between", transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: P.serif, fontSize: 18, color: P.pAccent, flexShrink: 0 }}>
                    {(c.prenom || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: P.pText, fontWeight: 500, fontSize: 15 }}>{c.prenom}</p>
                    <p style={{ color: P.pTextDim, fontSize: 12, marginTop: 2 }}>{c.email}</p>
                  </div>
                </div>
                <span style={{ color: P.pTextDim, fontSize: 18 }}>›</span>
              </button>
            ))}
            {clientsFiltres.length === 0 && recherche && (
              <EmptyState message={`Aucune consultante pour "${recherche}"`} theme="p" />
            )}
            {clients.length === 0 && (
              <EmptyState message="Aucune consultante inscrite pour l'instant." theme="p" />
            )}
          </div>
        </div>
      )}

      {/* ── MESSAGES GLOBAUX ── */}
      {mainView === "messages" && (
        <div style={pInner} className="fade-in">
          <p style={{ fontFamily: P.serif, fontSize: 22, color: P.pText, fontWeight: 300, marginBottom: 20 }}>Messages envoyés</p>
          {allMessages.length === 0
            ? <EmptyState message="Aucun message envoyé." theme="p" />
            : allMessages.slice(0, 30).map(m => (
              <div key={m.id} style={{ background: P.pSurface, border: `1px solid ${P.pBorder}`, borderRadius: 12, padding: "14px 18px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ color: P.pAccent, fontSize: 12, fontWeight: 500 }}>→ {m.toPrenom}</p>
                  <p style={{ color: P.pTextDim, fontSize: 11 }}>{new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                </div>
                <p style={{ color: P.pTextMid, fontSize: 13, lineHeight: 1.6 }}>{m.text}</p>
              </div>
            ))
          }
        </div>
      )}

      {/* ── MON ESPACE PRATICIENNE ── */}
      {mainView === "profil" && (
        <div style={pInner} className="fade-in">
          <p style={{ fontFamily: P.serif, fontSize: 26, color: P.pText, fontWeight: 300, marginBottom: 6 }}>Meije</p>
          <p style={{ color: P.pTextDim, fontSize: 13, marginBottom: 24 }}>{user.email}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              ["Consultantes", clients.length],
              ["Messages envoyés", allMessages.length],
            ].map(([l, v]) => (
              <div key={l} style={{ background: P.pSurface, borderRadius: 12, border: `1px solid ${P.pBorder}`, padding: "16px 18px" }}>
                <p style={{ fontFamily: P.serif, fontSize: 28, color: P.pText, fontWeight: 300 }}>{v}</p>
                <p style={{ color: P.pTextDim, fontSize: 11, letterSpacing: "0.5px", marginTop: 4 }}>{l}</p>
              </div>
            ))}
          </div>
          <Btn onClick={onLogout} variant="ghost" theme="p" style={{ width: "100%" }}>Se déconnecter</Btn>
        </div>
      )}

      {/* ── FICHE CLIENTE ── */}
      {mainView === "fiche" && selected && (
        <div style={pInner} className="fade-in">
          {/* En-tête cliente */}
          <div style={{ background: P.pSurface, borderRadius: 14, border: `1px solid ${P.pBorder}`, padding: "18px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: P.serif, fontSize: 22, color: P.pAccent, flexShrink: 0 }}>
              {(selected.prenom || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: P.serif, fontSize: 20, color: P.pText, fontWeight: 400 }}>{selected.prenom}</p>
              <p style={{ color: P.pTextDim, fontSize: 12, marginTop: 2 }}>{selected.email}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <Chip label={`${entries.length} suivi${entries.length > 1 ? "s" : ""}`} color={P.pGreen} />
                {anamneses.length > 0 && <Chip label="Questionnaire rempli" color={P.pGreen} />}
                {protocoles.length > 0 && <Chip label={`${protocoles.length} protocole${protocoles.length > 1 ? "s" : ""}`} color={P.pAccent} />}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
            {TABS_CLIENT.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: 20,
                border: `1px solid ${activeTab === key ? P.pAccentBorder : P.pBorder}`,
                background: activeTab === key ? P.pAccentDim : "transparent",
                color: activeTab === key ? P.pAccent : P.pTextDim,
                fontFamily: P.sans, fontSize: 12, fontWeight: activeTab === key ? 500 : 400,
                whiteSpace: "nowrap", transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>

          {/* Dossier */}
          {activeTab === "dossier" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { key: "anamnese", label: "Questionnaire", val: anamneses.length > 0 ? `Rempli le ${new Date(anamneses[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "Non rempli", col: P.pGreen },
                { key: "suivi", label: "Derniers suivis", val: `${entries.length} semaine${entries.length > 1 ? "s" : ""}`, col: P.pGreen },
                { key: "complements", label: "Compléments", val: `${clientData?.complements?.length || 0} prescrit${(clientData?.complements?.length || 0) > 1 ? "s" : ""}`, col: P.pGreen },
                { key: "protocole", label: "Protocole", val: `${protocoles.length} envoyé${protocoles.length > 1 ? "s" : ""}`, col: P.pAccent },
                { key: "message", label: "Messages", val: `${messages.length} message${messages.length > 1 ? "s" : ""}`, col: P.pAccent },
                { key: "documents", label: "Documents", val: `${documents.length} fichier${documents.length > 1 ? "s" : ""}`, col: P.pGreen },
              ].map(({ key, label, val, col }) => (
                <button key={key} onClick={() => setActiveTab(key)} style={{ background: P.pSurface, borderRadius: 12, border: `1px solid ${P.pBorder}`, padding: "14px 16px", textAlign: "left", cursor: "pointer" }}>
                  <p style={{ color: col, fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>{label}</p>
                  <p style={{ color: P.pText, fontSize: 14 }}>{val}</p>
                </button>
              ))}
            </div>
          )}

          {/* Suivis */}
          {activeTab === "suivi" && (
            <div>
              {entries.length === 0
                ? <EmptyState message={`${selected.prenom} n'a pas encore rempli de suivi.`} theme="p" />
                : [...entries].reverse().map(e => {
                  const vs = TI.map(i => e.scores?.[i.key]).filter(Boolean);
                  const avg = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
                  const sc = avg ? SC.find(x => x.v === Math.round(avg)) : null;
                  return (
                    <div key={e.id} style={{ background: P.pSurface, borderRadius: 12, border: `1px solid ${P.pBorder}`, padding: "16px 18px", marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <p style={{ color: P.pText, fontWeight: 500 }}>{e.weekLabel}</p>
                          <p style={{ color: P.pTextDim, fontSize: 12 }}>{new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>
                        <ScoreDot value={avg ? Math.round(avg) : null} size={40} />
                      </div>
                      {e.complementsPris && Object.keys(e.complementsPris).length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <p style={{ color: P.pGreen, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Compléments</p>
                          {Object.entries(e.complementsPris).map(([comp, statut]) => {
                            const colors = { "Pris régulièrement": P.pGreen, "Pris irrégulièrement": "#B8A05A", "Pas pris": "#B5583A" };
                            return (
                              <div key={comp} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: P.pSurface2, borderRadius: 8, marginBottom: 4 }}>
                                <span style={{ color: P.pTextMid, fontSize: 13 }}>{comp}</span>
                                <span style={{ color: colors[statut] || P.pTextDim, fontSize: 12, fontWeight: 500 }}>{statut}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {e.cyclePhase && (
                        <div style={{ background: P.pAccentDim, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                          <p style={{ color: P.pAccent, fontSize: 12, marginBottom: 4 }}>Phase : {e.cyclePhase}</p>
                          {e.cycleNote && <p style={{ color: P.pTextMid, fontSize: 13 }}>{e.cycleNote}</p>}
                        </div>
                      )}
                      {TI.filter(i => e.scores?.[i.key]).map(i => {
                        const sc2 = SC.find(x => x.v === e.scores[i.key]);
                        return (
                          <div key={i.key} style={{ background: P.pSurface2, borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: e.notes?.[i.key] ? 4 : 0 }}>
                              <span style={{ color: P.pTextMid, fontSize: 13 }}>{i.icon} {i.label}</span>
                              <span style={{ color: sc2?.color || P.pTextDim, fontSize: 12, fontWeight: 500 }}>{sc2?.label}</span>
                            </div>
                            {e.notes?.[i.key] && <p style={{ color: P.pTextDim, fontSize: 12, fontStyle: "italic" }}>{e.notes[i.key]}</p>}
                          </div>
                        );
                      })}
                      {e.humeur_libre && <div style={{ background: P.pGreenDim, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}><p style={{ color: P.pGreen, fontSize: 10, marginBottom: 4 }}>Humeur</p><p style={{ color: P.pText, fontSize: 13, lineHeight: 1.6 }}>{e.humeur_libre}</p></div>}
                      {e.confidences && <div style={{ background: P.pAccentDim, borderRadius: 8, padding: "10px 14px" }}><p style={{ color: P.pAccent, fontSize: 10, marginBottom: 4 }}>Ajout</p><p style={{ color: P.pText, fontSize: 13, lineHeight: 1.6 }}>{e.confidences}</p></div>}
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* Évolution praticienne */}
          {activeTab === "evolution" && (
            <div>
              <p style={{ color: P.pTextDim, fontSize: 12, marginBottom: 16 }}>
                Évolution de {selected.prenom} — scores en lien avec son cycle
              </p>
              {entries.length < 2
                ? <EmptyState message={`${selected.prenom} n'a pas encore assez de suivis pour afficher le graphique.`} theme="p" />
                : (
                  <>
                    {(() => {
                      const getAvg = e => { const vs = TI.map(i => e.scores?.[i.key]).filter(Boolean); return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null; };
                      const avgFirst = getAvg(entries[0]), avgLast = getAvg(entries[entries.length - 1]);
                      const diff = avgFirst && avgLast ? (avgLast - avgFirst).toFixed(1) : null;
                      return diff ? (
                        <div style={{ background: diff > 0 ? P.pGreenDim : P.pAccentDim, border: `1px solid ${diff > 0 ? "rgba(122,158,130,0.3)" : P.pAccentBorder}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 24 }}>{diff > 0 ? "📈" : "📉"}</span>
                          <div>
                            <p style={{ color: diff > 0 ? P.pGreen : P.pAccent, fontWeight: 500, fontSize: 14 }}>
                              {diff > 0 ? `+${diff} pts depuis le début` : `${diff} pts depuis le début`}
                            </p>
                            <p style={{ color: P.pTextDim, fontSize: 12, marginTop: 2 }}>
                              {entries.length} semaines · moy. {avgFirst?.toFixed(1)} → {avgLast?.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                    <ChartSelector entries={entries} theme="p" />
                    <div style={{ marginTop: 20 }}>
                      <p style={{ color: P.pTextDim, fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Par axe</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                        {TI.filter(t => entries.some(e => e.scores?.[t.key])).map(t => {
                          const vals = entries.map(e => e.scores?.[t.key]).filter(Boolean);
                          const diff = vals[vals.length - 1] - vals[0];
                          const last = vals[vals.length - 1];
                          const sc = SC.find(x => x.v === Math.round(last));
                          return (
                            <div key={t.key} style={{ background: P.pSurface, border: `1px solid ${P.pBorder}`, borderRadius: 10, padding: "12px" }}>
                              <p style={{ fontSize: 14 }}>{t.icon}</p>
                              <p style={{ color: P.pTextDim, fontSize: 10, marginBottom: 4, marginTop: 4 }}>{t.label}</p>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                                <span style={{ fontFamily: P.serif, fontSize: 18, color: sc?.color || P.pText }}>{last}</span>
                                <span style={{ fontSize: 11, color: diff > 0 ? P.pGreen : diff < 0 ? "#B5583A" : P.pTextDim, fontWeight: 500 }}>
                                  {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "="}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )
              }
            </div>
          )}

          {/* Compléments */}
            <div>
              {clientData?.complements?.length > 0
                ? clientData.complements.map((c, i) => {
                  const nom = typeof c === "string" ? c : c.nom;
                  const lien = typeof c === "string" ? "" : c.lien;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: P.pSurface, borderRadius: 10, padding: "12px 16px", marginBottom: 8, border: `1px solid ${P.pBorder}` }}>
                      <div>
                        <span style={{ color: P.pText, fontSize: 14 }}>{nom}</span>
                        {lien && <a href={lien} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginLeft: 10, color: P.pGreen, fontSize: 12, textDecoration: "none" }}>→ Commander</a>}
                      </div>
                      <button onClick={() => removeComplement(i)} style={{ background: "none", border: "none", color: "#B5583A", fontSize: 20, lineHeight: 1, cursor: "pointer" }}>×</button>
                    </div>
                  );
                })
                : <EmptyState message="Aucun complément ajouté." theme="p" />
              }
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={newComplement.nom} onChange={e => setNewComplement(f => ({ ...f, nom: e.target.value }))} placeholder="Nom — Ex : Magnésium 300 mg/j le soir" style={iP("p")} />
                <input value={newComplement.lien} onChange={e => setNewComplement(f => ({ ...f, lien: e.target.value }))} placeholder="Lien produit (optionnel)" style={iP("p")} />
                <Btn onClick={addComplement} disabled={savingComplements} variant="primary" style={{ alignSelf: "flex-start" }}>Ajouter</Btn>
              </div>
            </div>
          )}

          {/* Protocole */}
          {activeTab === "protocole" && (
            <div>
              {protocoles.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  {[...protocoles].reverse().map(p => (
                    <div key={p.id} style={{ background: P.pSurface, borderRadius: 12, border: `1px solid ${P.pBorder}`, padding: "16px 18px", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <p style={{ color: P.pAccent, fontFamily: P.serif, fontSize: 17, fontWeight: 400 }}>{p.titre}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ color: P.pTextDim, fontSize: 11 }}>{new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                          <button onClick={() => deleteProtocole(p.id)} style={{ background: "none", border: "none", color: "#B5583A", fontSize: 18, cursor: "pointer" }}>×</button>
                        </div>
                      </div>
                      <p style={{ color: P.pTextMid, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{p.contenu}</p>
                      {p.fichiers?.length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {p.fichiers.map((f, i) => <FileTag key={i} name={f.name} theme="p" />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: P.pSurface, borderRadius: 14, border: `1px solid ${P.pBorder}`, padding: "18px 20px" }}>
                <p style={{ color: P.pAccent, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Nouveau protocole</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input value={newProtocole.titre} onChange={e => setNewProtocole(p => ({ ...p, titre: e.target.value }))} placeholder="Titre" style={iP("p")} />
                  <textarea value={newProtocole.contenu} onChange={e => setNewProtocole(p => ({ ...p, contenu: e.target.value }))} placeholder="Message d'accompagnement…" rows={10} style={{ ...iP("p"), resize: "vertical" }} />
                  <label style={{ display: "block", background: P.pAccentDim, border: `1px dashed ${P.pAccentBorder}`, borderRadius: 10, padding: "14px", textAlign: "center", cursor: "pointer", color: P.pAccent, fontSize: 13 }}>
                    + Joindre un fichier
                    <input type="file" multiple accept="image/*,application/pdf" onChange={e => uploadProtocoleFiles(Array.from(e.target.files))} style={{ display: "none" }} />
                  </label>
                  {uploadingProtocole && <p style={{ color: P.pAccent, fontSize: 13 }}>Upload en cours…</p>}
                  {protocoleFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileTag name={f.name} theme="p" />
                      <button onClick={() => setProtocoleFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#B5583A", fontSize: 14, cursor: "pointer" }}>×</button>
                    </div>
                  ))}
                  <Btn onClick={sendProtocole} disabled={sendingProtocole || !newProtocole.titre.trim()} variant="primary">
                    {sendingProtocole ? "Envoi…" : `Envoyer à ${selected.prenom}`}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* Questionnaire */}
          {activeTab === "anamnese" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <Btn onClick={() => setAnamneseMode("view")} variant={anamneseMode === "view" ? "primary" : "ghost"} theme="p" small>Réponses</Btn>
                <Btn onClick={() => setAnamneseMode("upload")} variant={anamneseMode === "upload" ? "primary" : "ghost"} theme="p" small>Uploader PDF</Btn>
              </div>
              {anamneseMode === "view" && (
                anamneses.length === 0
                  ? <EmptyState message={`${selected.prenom} n'a pas encore rempli le questionnaire.`} theme="p" />
                  : anamneses.map(a => (
                    <div key={a.id}>
                      <p style={{ color: P.pTextDim, fontSize: 12, marginBottom: 14 }}>
                        Rempli le {new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        {a.saisieParPraticienne && <span style={{ color: P.pAccent, marginLeft: 8 }}>· Saisi par toi</span>}
                      </p>
                      {a.bilans?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          {a.bilans.map((b, i) => (
                            <a key={i} href={b.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, borderRadius: 8, padding: "7px 12px", color: P.pAccent, fontSize: 13, textDecoration: "none", marginRight: 8, marginBottom: 8 }}>{b.name}</a>
                          ))}
                        </div>
                      )}
                      {a.form && Object.keys(a.form).length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            ["Problématique principale", a.form.problematique],
                            ["Durée du problème", a.form.dureeProbleme],
                            ["Impact vie quotidienne", a.form.impactVieQuotidienne],
                            ["Objectifs 3 mois", a.form.objectifs3mois],
                            ["Antécédents médicaux", a.form.maladiesChroniques],
                            ["Médicaments", a.form.medicaments],
                            ["Compléments actuels", a.form.complementsActuels],
                            ["Coucher / Lever", a.form.heureCoucher && `${a.form.heureCoucher} / ${a.form.heureLever}`],
                            ["Qualité sommeil", a.form.qualiteSommeil && `${a.form.qualiteSommeil} / 10`],
                            ["Niveau stress", a.form.niveauStress && `${a.form.niveauStress} / 10`],
                            ["Sources de stress", a.form.sourcesStress],
                            ["Âge des règles", a.form.ageRegles],
                            ["Durée cycle / règles", a.form.dureeCycle && `${a.form.dureeCycle}j / ${a.form.dureeRegles}j`],
                            ["Intensité douleurs", a.form.intensiteDouleurs && `${a.form.intensiteDouleurs} / 10`],
                            ["Description douleurs", a.form.descriptionDouleurs],
                            ["Petit-déjeuner", a.form.petitDejeunerType],
                            ["Déjeuner", a.form.dejeunerType],
                            ["Dîner", a.form.dinerType],
                            ["Eau / jour", a.form.quantiteEau],
                            ["Motivation", a.form.motivation && `${a.form.motivation} / 10`],
                            ["Attentes", a.form.attentes],
                            ["Informations supplémentaires", a.form.infosSup],
                          ].filter(([_, v]) => v).map(([label, val]) => (
                            <div key={label} style={{ display: "flex", gap: 12, background: P.pSurface2, borderRadius: 8, padding: "10px 14px" }}>
                              <span style={{ color: P.pTextDim, fontSize: 12, minWidth: 170, flexShrink: 0 }}>{label}</span>
                              <span style={{ color: P.pTextMid, fontSize: 13, lineHeight: 1.5 }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              )}
              {anamneseMode === "upload" && (
                <div style={{ background: P.pSurface, borderRadius: 12, border: `1px solid ${P.pBorder}`, padding: 18 }}>
                  <label style={{ display: "block", background: P.pAccentDim, border: `1px dashed ${P.pAccentBorder}`, borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", color: P.pAccent, fontSize: 13, marginBottom: 12 }}>
                    + Uploader un PDF ou une photo
                    <input type="file" multiple accept="image/*,application/pdf" onChange={e => uploadAnamnesePDF(Array.from(e.target.files))} style={{ display: "none" }} />
                  </label>
                  {uploadingAnamnese && <p style={{ color: P.pAccent, fontSize: 13, marginBottom: 10 }}>Upload en cours…</p>}
                  {uploadedAnamnese.length > 0 && (
                    <div>
                      {uploadedAnamnese.map((f, i) => <FileTag key={i} name={f.name} theme="p" />)}
                      <Btn onClick={saveAnamnesePDF} disabled={savingAnamnese} variant="primary" style={{ marginTop: 12 }}>
                        {savingAnamnese ? "Enregistrement…" : "Enregistrer dans le dossier"}
                      </Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          {activeTab === "documents" && (
            <div>
              {documents.length === 0
                ? <EmptyState message={`Aucun document partagé par ${selected.prenom}.`} theme="p" />
                : documents.map(d => (
                  <div key={d.id} style={{ background: P.pSurface, borderRadius: 12, border: `1px solid ${P.pBorder}`, padding: "14px 18px", marginBottom: 10 }}>
                    <p style={{ color: P.pTextDim, fontSize: 11, marginBottom: 10 }}>{new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {d.files?.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, borderRadius: 8, padding: "7px 12px", color: P.pAccent, fontSize: 12, textDecoration: "none" }}>
                          {f.type?.includes("image") ? "🖼 " : "📄 "}{f.name}
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Notes privées */}
          {activeTab === "notes" && (
            <div>
              <div style={{ background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                <p style={{ color: P.pAccent, fontSize: 11 }}>🔒 Ces notes sont uniquement visibles par toi. Elles n'apparaissent jamais dans l'espace de {selected.prenom}.</p>
              </div>
              <textarea
                value={privateNotes}
                onChange={e => setPrivateNotes(e.target.value)}
                placeholder={`Observations cliniques, impressions, points à revoir avec ${selected.prenom}…`}
                rows={5}
                style={{ ...iP("p"), resize: "vertical", marginBottom: 10 }}
              />
              <Btn onClick={saveNote} disabled={savingNote || !privateNotes.trim()} variant="primary" style={{ marginBottom: 24 }}>
                {savingNote ? "Enregistrement…" : "Enregistrer la note"}
              </Btn>

              {noteHistory.length > 0 && (
                <div>
                  <p style={{ color: P.pTextDim, fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Historique des notes</p>
                  {noteHistory.map(n => (
                    <div key={n.id} style={{ background: P.pSurface, border: `1px solid ${P.pBorder}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <p style={{ color: P.pTextDim, fontSize: 11 }}>{new Date(n.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                        <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", color: "#B5583A", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
                      </div>
                      <p style={{ color: P.pTextMid, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {noteHistory.length === 0 && <EmptyState message="Aucune note enregistrée pour l'instant." theme="p" />}
            </div>
          )}

          {/* Message */}
          {activeTab === "message" && (
            <div>
              {messages.length === 0
                ? <EmptyState message={`Aucun message envoyé à ${selected.prenom}.`} theme="p" />
                : messages.map(m => (
                  <div key={m.id} style={{ background: P.pAccentDim, border: `1px solid ${P.pAccentBorder}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                    <p style={{ color: P.pText, fontSize: 14, lineHeight: 1.6 }}>{m.text}</p>
                    <p style={{ color: P.pTextDim, fontSize: 11, marginTop: 6 }}>{new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
                  </div>
                ))
              }
              <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={`Message pour ${selected.prenom}…`} rows={3} style={{ ...iP("p"), resize: "vertical", marginTop: 12, marginBottom: 10 }} />
              <Btn onClick={sendMsg} disabled={sending || !newMsg.trim()} variant="primary">
                {sending ? "Envoi…" : `Envoyer à ${selected.prenom}`}
              </Btn>
            </div>
          )}
        </div>
      )}

      <BottomNav
        items={PRAT_NAV}
        active={mainView === "fiche" ? "clients" : mainView}
        onChange={v => { setMainView(v); setSelected(null); }}
        theme="p"
      />
    </div>
  );
}

// ─── CHIP ─────────────────────────────────────────────────────────────────────

function Chip({ label, color }) {
  return (
    <span style={{ background: color + "18", border: `1px solid ${color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color, fontFamily: P.sans }}>
      {label}
    </span>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    const u = onAuthStateChanged(auth, async fw => {
      if (fw) {
        const d = await getDoc(doc(db, "users", fw.uid));
        setUser({ uid: fw.uid, email: fw.email, prénom: d.data()?.prénom || "", role: fw.email === PRATICIENNE_EMAIL ? "praticienne" : "cliente" });
        setShowLanding(false); // déjà connectée, pas besoin de la landing
      } else { setUser(null); }
      setChecking(false);
    });
    return u;
  }, []);

  const logout = async () => { await signOut(auth); setUser(null); };

  if (checking) return (
    <div style={{ minHeight: "100vh", background: P.pBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: P.serif, fontSize: 22, color: P.pTextDim, fontWeight: 300, letterSpacing: "1px" }}>meije.naturo</p>
    </div>
  );

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js" />
      {!user
        ? (showLanding
          ? <LandingPage onEnter={() => setShowLanding(false)} />
          : <Auth onLogin={u => { setUser(u); setShowLanding(false); }} />)
        : user.role === "praticienne"
          ? <Praticienne user={user} onLogout={logout} />
          : <Cliente user={user} onLogout={logout} />
      }
    </>
  );
}
