import { useState, useEffect, useCallback, memo } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, browserLocalPersistence, setPersistence } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, where, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Anamnese from "./Anamnese";
import { getSystemClient, getSystemPraticienne } from "./normes";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const PRATICIENNE_EMAIL = process.env.REACT_APP_PRATICIENNE_EMAIL || "lamenaturo@gmail.com";
const INSTAGRAM = process.env.REACT_APP_INSTAGRAM || "https://www.instagram.com/meije.naturo";
const CLOUD_NAME = "di45b4ymc";
const UPLOAD_PRESET = "meije_naturo";
const EMAILJS_SERVICE = "service_5bi57sr";
const EMAILJS_TEMPLATE = "template_3w471uo";
const EMAILJS_TEMPLATE_BIENVENUE = "template_im5mm8v";
const EMAILJS_PUBLIC = "zpxiv3rkIbtfdqAQ6";

const PHASES_CYCLE = ["Menstruelle", "Folliculaire", "Ovulation", "Lutéale", "Je ne sais pas"];

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
];

// ─── PROFILS ET SOUS-PROFILS ─────────────────────────────────────────────────

const PROFILS = [
  {
    groupe: "Cycle hormonal",
    sousProfiles: [
      { key: "spm", label: "SPM", priorites: ["humeur", "anxiete", "douleurs", "sommeil", "energie"] },
      { key: "sopk", label: "SOPK", priorites: ["energie", "douleurs", "alimentation", "poids", "sommeil"] },
      { key: "endometriose", label: "Endométriose", priorites: ["douleurs", "energie", "humeur", "sommeil"] },
      { key: "fertilite", label: "Fertilité", priorites: ["alimentation", "anxiete", "energie", "sommeil"] },
      { key: "menopause", label: "Ménopause", priorites: ["sommeil", "humeur", "anxiete", "energie", "douleurs"] },
    ]
  },
  {
    groupe: "Énergie & Fatigue",
    sousProfiles: [
      { key: "fatigue", label: "Fatigue chronique", priorites: ["energie", "sommeil", "alimentation", "digestion", "humeur"] },
      { key: "surmenage", label: "Surmenage", priorites: ["energie", "anxiete", "sommeil", "alimentation", "humeur"] },
    ]
  },
  {
    groupe: "Poids & Corps",
    sousProfiles: [
      { key: "poids_general", label: "Poids", priorites: ["alimentation", "energie", "digestion", "poids", "humeur"] },
      { key: "retention", label: "Rétention d'eau", priorites: ["poids", "alimentation", "digestion"] },
    ]
  },
  {
    groupe: "Digestif",
    sousProfiles: [
      { key: "digestif", label: "Troubles digestifs", priorites: ["digestion", "alimentation", "douleurs", "energie", "peau"] },
    ]
  },
  {
    groupe: "Peau",
    sousProfiles: [
      { key: "peau_profil", label: "Problèmes de peau", priorites: ["peau", "alimentation", "digestion", "humeur"] },
    ]
  },
  {
    groupe: "Bien-être mental",
    sousProfiles: [
      { key: "mental", label: "Stress & Anxiété", priorites: ["anxiete", "humeur", "sommeil", "energie", "alimentation"] },
    ]
  },
  {
    groupe: "Sommeil",
    sousProfiles: [
      { key: "sommeil_profil", label: "Troubles du sommeil", priorites: ["sommeil", "anxiete", "energie", "humeur"] },
    ]
  },
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
};

const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: ${P.pBg}; -webkit-font-smoothing: antialiased; }
  input, textarea, button, select { font-family: ${P.sans}; }
  input:focus, textarea:focus { outline: none; }
  button { cursor: pointer; }
  @media (max-width: 768px) { .prat-grid { grid-template-columns: 1fr !important; } }
  @media (min-width: 1024px) { .page-inner { max-width: 720px !important; } .prat-inner { max-width: 900px !important; } }
  .card-raised { box-shadow: 0 2px 8px rgba(44,28,16,0.08), 0 1px 2px rgba(44,28,16,0.05), inset 0 1px 0 rgba(255,255,255,0.7) !important; }
  .card-elevated { box-shadow: 0 6px 20px rgba(44,28,16,0.12), 0 2px 6px rgba(44,28,16,0.07), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(44,28,16,0.03) !important; }
  .card-raised-dark { box-shadow: 0 2px 10px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,245,235,0.06) !important; }
  .card-elevated-dark { box-shadow: 0 6px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,245,235,0.08) !important; }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 16px); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
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

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:P.pAccent, color:"#1C1410", padding:"12px 22px", borderRadius:30, fontFamily:P.sans, fontSize:13, fontWeight:500, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(0,0,0,0.25)", animation:"toastIn 0.3s ease forwards" }}>
      {message}
    </div>
  );
}

function ScoreDot({ value, size = 36 }) {
  const s = SC.find(x => x.v === value);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:s ? s.color+"22":"rgba(255,255,255,0.06)", border:`1.5px solid ${s ? s.color:"rgba(255,255,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", color:s ? s.color:"rgba(255,255,255,0.3)", fontFamily:P.serif, fontSize:size*0.42, fontWeight:600, flexShrink:0 }}>
      {value || "–"}
    </div>
  );
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

const PHASE_COLORS = { "Menstruelle":"#B5583A","Folliculaire":"#C8956C","Ovulation":"#4A8E6A","Lutéale":"#7A6A9A","Je ne sais pas":"#888" };

function EvolutionChart({ entries, activeKeys, theme="c" }) {
  const bg=theme==="c"?P.cSurface:P.pSurface, textColor=theme==="c"?P.cTextMid:P.pTextMid;
  const dimColor=theme==="c"?P.cTextDim:P.pTextDim, borderColor=theme==="c"?P.cBorder:P.pBorder;
  if (!entries||entries.length<2) return (
    <div style={{ background:bg, border:`1px solid ${borderColor}`, borderRadius:12, padding:"20px", textAlign:"center" }}>
      <p style={{ color:dimColor, fontSize:13 }}>Au moins 2 semaines de suivi sont nécessaires.</p>
    </div>
  );
  const W=560,H=200,PAD={top:20,right:16,bottom:44,left:32},iW=W-PAD.left-PAD.right,iH=H-PAD.top-PAD.bottom,n=entries.length;
  const xPos=i=>PAD.left+(n===1?iW/2:(i/(n-1))*iW);
  const yPos=v=>PAD.top+iH-((v-1)/4)*iH;
  const getAvg=e=>{const vs=TI.map(i=>e.scores?.[i.key]).filter(Boolean);return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;};
  const getSeries=key=>key==="_avg"?entries.map(e=>getAvg(e)):entries.map(e=>e.scores?.[key]??null);
  const CHART_KEYS=activeKeys.length?activeKeys:["_avg"];
  const COLORS=["#C8856C","#4A8E6A","#7A6A9A","#B8A05A","#5A8ABE","#BE5A8A"];
  const makePath=data=>{
    const pts=data.map((v,i)=>v!==null?[xPos(i),yPos(v)]:null).filter(Boolean);
    if(pts.length<2)return"";
    let d=`M ${pts[0][0]} ${pts[0][1]}`;
    for(let i=1;i<pts.length;i++){const[px,py]=pts[i-1],[cx,cy]=pts[i],cpx=(px+cx)/2;d+=` C ${cpx} ${py} ${cpx} ${cy} ${cx} ${cy}`;}
    return d;
  };
  const shortDate=iso=>{const d=new Date(iso);return`${d.getDate()}/${d.getMonth()+1}`;};
  return (
    <div style={{ background:bg, border:`1px solid ${borderColor}`, borderRadius:14, padding:"16px", overflow:"hidden" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block", overflow:"visible" }}>
        {[1,2,3,4,5].map(v=>(
          <g key={v}>
            <line x1={PAD.left} y1={yPos(v)} x2={W-PAD.right} y2={yPos(v)} stroke={theme==="c"?"rgba(44,28,16,0.08)":"rgba(255,245,235,0.07)"} strokeWidth={0.5}/>
            <text x={PAD.left-6} y={yPos(v)+4} textAnchor="end" fontSize={9} fill={dimColor}>{v}</text>
          </g>
        ))}
        {entries.map((e,i)=>{
          if(!e.cyclePhase||e.cyclePhase==="Je ne sais pas")return null;
          const x=xPos(i),nextX=i<n-1?xPos(i+1):W-PAD.right,col=PHASE_COLORS[e.cyclePhase]||"#888",segW=i<n-1?(nextX-x):20;
          return <rect key={i} x={x-segW/2} y={PAD.top} width={segW} height={iH} fill={col} opacity={0.07} rx={2}/>;
        })}
        {CHART_KEYS.map((key,ki)=>{
          const data=getSeries(key),color=COLORS[ki%COLORS.length],path=makePath(data);
          return (
            <g key={key}>
              {path&&<path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.9}/>}
              {data.map((v,i)=>v!==null&&<circle key={i} cx={xPos(i)} cy={yPos(v)} r={3.5} fill={color} stroke={theme==="c"?P.cSurface:"#1C1410"} strokeWidth={1.5}/>)}
            </g>
          );
        })}
        {entries.map((e,i)=>{
          const x=xPos(i),phase=e.cyclePhase&&e.cyclePhase!=="Je ne sais pas"?e.cyclePhase:null;
          const col=phase?PHASE_COLORS[phase]:dimColor,show=n<=8||i%2===0;
          return show?(
            <g key={i}>
              <text x={x} y={H-PAD.bottom+14} textAnchor="middle" fontSize={9} fill={phase?col:dimColor} fontWeight={phase?"500":"400"}>{shortDate(e.date)}</text>
              {phase&&<text x={x} y={H-PAD.bottom+26} textAnchor="middle" fontSize={8} fill={col} opacity={0.8}>{phase.slice(0,4)}.</text>}
            </g>
          ):null;
        })}
      </svg>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:8, paddingTop:10, borderTop:`1px solid ${borderColor}` }}>
        {Object.entries(PHASE_COLORS).filter(([k])=>k!=="Je ne sais pas").map(([phase,col])=>(
          <div key={phase} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:col, opacity:0.7 }}/>
            <span style={{ fontSize:10, color:dimColor }}>{phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartSelector({ entries, theme="c" }) {
  const allKeys=[{key:"_avg",label:"Moyenne globale",icon:"📊"},...TI.map(t=>({key:t.key,label:t.label,icon:t.icon}))];
  const [selected,setSelected]=useState(["_avg"]);
  const toggle=key=>setSelected(prev=>prev.includes(key)?(prev.length>1?prev.filter(k=>k!==key):prev):[...prev,key]);
  const borderColor=theme==="c"?P.cBorder:P.pBorder,activeGreen=theme==="c"?P.cGreen:P.pGreen,activeDim=theme==="c"?P.cGreenDim:P.pGreenDim;
  const hasData=key=>entries.some(e=>key==="_avg"?TI.some(t=>e.scores?.[t.key]):e.scores?.[key]);
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
        {allKeys.filter(k=>hasData(k.key)).map(({key,label,icon})=>{
          const active=selected.includes(key);
          return <button key={key} onClick={()=>toggle(key)} style={{ padding:"6px 12px", borderRadius:20, border:`1.5px solid ${active?activeGreen:borderColor}`, background:active?activeDim:"transparent", color:active?activeGreen:(theme==="c"?P.cTextMid:P.pTextMid), fontFamily:P.sans, fontSize:11, fontWeight:active?500:400, cursor:"pointer" }}>{icon} {label}</button>;
        })}
      </div>
      <EvolutionChart entries={entries} activeKeys={selected} theme={theme}/>
    </div>
  );
}

function BottomNav({ items, active, onChange, theme }) {
  const bg=theme==="p"?P.pBg:(P.cNavBg||P.cSurface2),border=theme==="p"?P.pBorder:P.cBorder;
  const activeColor=theme==="p"?P.pAccent:P.cGreen,inactiveColor=theme==="p"?P.pTextDim:P.cTextDim;
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:bg, borderTop:`1px solid ${border}`, display:"flex", paddingBottom:"env(safe-area-inset-bottom, 8px)", zIndex:100 }}>
      {items.map(({key,label,icon,badge})=>{
        const isActive=active===key;
        return (
          <button key={key} onClick={()=>onChange(key)} style={{ flex:1, border:"none", background:"none", padding:"10px 4px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:3, color:isActive?activeColor:inactiveColor, fontFamily:P.sans, fontSize:10, fontWeight:isActive?500:400, transition:"color 0.2s", position:"relative" }}>
            <span style={{ fontSize:20, lineHeight:1, position:"relative" }}>
              {icon}
              {badge>0&&<span style={{ position:"absolute", top:-2, right:-4, width:8, height:8, background:activeColor, borderRadius:"50%", display:"block" }}/>}
            </span>
            <span>{label}</span>
          </button>
        );
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
  const [userProfil,setUserProfil]=useState({profilGroupe:"",profilSous:""});
  const [view,setView]=useState("home");const [scores,setScores]=useState({});
  const [notes,setNotes]=useState({});const [cyclePhase,setCyclePhase]=useState("");
  const [cycleNote,setCycleNote]=useState("");const [complementsPris,setComplementsPris]=useState({});
  const [humeur,setHumeur]=useState("");const [confidences,setConfidences]=useState("");
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
    const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{method:"POST",body:fd});
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Erreur ${res.status}`);}
    const data=await res.json();if(!data.secure_url)throw new Error("Upload échoué");
    return{url:data.secure_url,name:file.name,type:file.type};
  };

  const doUploadDocs=async(files)=>{
    setUploadingDocs(true);const uploaded=[];
    for(const file of files){try{const r=await uploadToCloudinaryClient(file,"meije-naturo/suivis");uploaded.push(r);}catch(e){showToast("Erreur : "+e.message);}}
    setUploadDocs(prev=>[...prev,...uploaded]);setUploadingDocs(false);
  };

  const submit=async()=>{
    await addDoc(collection(db,"entries"),{userUid:user.uid,userEmail:user.email,userPrénom:user.prénom,weekLabel:wk(),date:new Date().toISOString(),scores,notes,cyclePhase,cycleNote,complementsPris,humeur_libre:humeur,confidences,documents:uploadDocs});
    try{await sendEmail(EMAILJS_TEMPLATE_BIENVENUE,{prenom:user.prénom,action:"a rempli son suivi",to_email:PRATICIENNE_EMAIL});}catch{}
    setScores({});setNotes({});setCyclePhase("");setCycleNote("");setComplementsPris({});setHumeur("");setConfidences("");setUploadDocs([]);
    setSaved(true);showToast("Suivi envoyé à Meije ✓");
    setTimeout(()=>{setSaved(false);setView("home");},1800);
  };

  const lm=messages[messages.length-1];const hasAnamnese=anamneses.length>0;

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
          {entries.length>0&&(()=>{
            const last=entries[entries.length-1];const vs=TI.map(i=>last.scores?.[i.key]).filter(Boolean);
            const avg=vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;const sc=avg?SC.find(x=>x.v===Math.round(avg)):null;
            return(
              <div style={{background:P.cSurface,borderRadius:16,border:`1px solid ${P.cBorder}`,padding:"16px 18px",marginBottom:16,display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:sc?sc.color+"22":P.cSurface2,border:`2px solid ${sc?sc.color:P.cBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontFamily:P.serif,fontSize:18,color:sc?sc.color:P.cTextDim}}>{avg?avg.toFixed(1):"–"}</span>
                </div>
                <div>
                  <p style={{color:P.cText,fontSize:13,fontWeight:500}}>Dernière semaine · {sc?.label||"–"}</p>
                  <p style={{color:P.cTextMid,fontSize:11,marginTop:2}}>{last.weekLabel}</p>
                </div>
              </div>
            );
          })()}
          {(()=>{
            const notifs=[];
            if(lm){const isNew=Date.now()-new Date(lm.date).getTime()<7*24*60*60*1000;notifs.push(<div key="msg" style={{background:P.cSurface,border:`0.5px solid rgba(44,28,16,0.08)`,borderLeft:`3px solid ${P.cGreen}`,borderRadius:14,padding:"14px 18px",marginBottom:12}} className="card-raised"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><p style={{fontSize:10,color:P.cGreen,textTransform:"uppercase",letterSpacing:"1.5px"}}>💬 Message de Meije</p>{isNew&&<span style={{background:P.cGreen,color:"#fff",fontSize:9,padding:"2px 7px",borderRadius:10,fontWeight:600}}>Nouveau</span>}</div><p style={{color:P.cText,fontSize:13,lineHeight:1.6}}>{lm.text}</p><p style={{color:P.cTextDim,fontSize:11,marginTop:6}}>{new Date(lm.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p></div>);}
            if(protocoles.length>0){const last=protocoles[protocoles.length-1];const isNew=Date.now()-new Date(last.date).getTime()<14*24*60*60*1000;notifs.push(<button key="proto" onClick={()=>setView("protocole")} style={{width:"100%",background:P.cSurface,border:`0.5px solid rgba(44,28,16,0.08)`,borderLeft:`3px solid ${P.cAccent}`,borderRadius:14,padding:"14px 18px",marginBottom:12,textAlign:"left",cursor:"pointer"}} className="card-elevated"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><p style={{fontSize:10,color:P.cAccent,textTransform:"uppercase",letterSpacing:"1.5px"}}>🌿 Protocole mis à jour</p>{isNew&&<span style={{background:P.cAccent,color:"#fff",fontSize:9,padding:"2px 7px",borderRadius:10,fontWeight:600}}>Nouveau</span>}</div><p style={{color:P.cText,fontSize:13,fontWeight:500}}>{last.titre}</p><p style={{color:P.cTextDim,fontSize:11,marginTop:4}}>Voir mon protocole →</p></button>);}
            const lastEntry=entries[entries.length-1];const daysSince=lastEntry?Math.floor((Date.now()-new Date(lastEntry.date).getTime())/(1000*60*60*24)):99;
            if(daysSince>=6)notifs.push(<button key="suivi" onClick={()=>setView("suivi")} style={{width:"100%",background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:14,padding:"14px 18px",marginBottom:12,textAlign:"left",cursor:"pointer"}}><p style={{fontSize:10,color:P.cGreen,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:6}}>📝 Suivi de la semaine</p><p style={{color:P.cText,fontSize:13}}>C'est l'heure de remplir ton suivi !</p><p style={{color:P.cTextDim,fontSize:11,marginTop:4}}>Remplir maintenant →</p></button>);
            if(!hasAnamnese)notifs.push(<button key="qst" onClick={()=>setAnamneseView(true)} style={{width:"100%",background:P.cSurface,border:`1px solid ${P.cBorder}`,borderLeft:`3px solid ${P.cAccent}`,borderRadius:14,padding:"14px 18px",marginBottom:12,textAlign:"left",cursor:"pointer"}}><p style={{fontSize:10,color:P.cAccent,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:6}}>📋 Action requise</p><p style={{color:P.cText,fontSize:13,fontWeight:500}}>Remplis ton questionnaire de santé</p><p style={{color:P.cTextDim,fontSize:11,marginTop:4}}>À compléter avant ta première consultation →</p></button>);
            return notifs.length>0?<div>{notifs}</div>:<div style={{background:P.cSurface,border:`1px solid ${P.cBorder}`,borderRadius:14,padding:"20px",textAlign:"center"}}><p style={{color:P.cTextDim,fontSize:13}}>Tout est à jour 🌿</p></div>;
          })()}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            {entries.length>0&&<button onClick={()=>setView("historique")} style={{flex:1,background:P.cSurface2,border:`1px solid ${P.cBorder}`,borderRadius:10,padding:"10px",textAlign:"center",cursor:"pointer"}}><p style={{color:P.cTextMid,fontSize:11}}>📊 Historique</p></button>}
            <button onClick={()=>setView("evolution")} style={{flex:1,background:P.cSurface2,border:`1px solid ${P.cBorder}`,borderRadius:10,padding:"10px",textAlign:"center",cursor:"pointer"}}><p style={{color:P.cTextMid,fontSize:11}}>📈 Évolution</p></button>
            <button onClick={()=>setView("docs")} style={{flex:1,background:P.cSurface2,border:`1px solid ${P.cBorder}`,borderRadius:10,padding:"10px",textAlign:"center",cursor:"pointer"}}><p style={{color:P.cTextMid,fontSize:11}}>📁 Documents</p></button>
          </div>
        </div>
      )}

      {view==="suivi"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:4}}>Suivi de la semaine</p>
          <p style={{color:P.cTextDim,fontSize:12,letterSpacing:"0.5px",marginBottom:24}}>{wk()}</p>
          {complements.length>0&&(
            <Section title="Tes compléments cette semaine" theme="c">
              {complements.map((c,i)=>{
                const nom=typeof c==="string"?c:c.nom,lien=typeof c==="string"?"":c.lien,posologie=typeof c==="string"?"":c.posologie,codePromo=typeof c==="string"?"":c.codePromo;
                return(
                  <div key={i} style={{marginBottom:14,background:P.cSurface,border:`1px solid ${P.cBorder}`,borderRadius:12,padding:"12px 14px"}}>
                    <p style={{color:P.cText,fontSize:14,fontWeight:500,marginBottom:posologie?4:8}}>{nom}</p>
                    {posologie&&<p style={{color:P.cAccent,fontSize:12,marginBottom:8}}>💊 {posologie}</p>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
                      {lien&&<a href={lien} target="_blank" rel="noreferrer" style={{color:P.cGreen,fontSize:12,textDecoration:"none"}}>→ Commander</a>}
                      {codePromo&&<span style={{background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:6,padding:"2px 8px",color:P.cGreen,fontSize:11,fontWeight:500}}>🏷 Code : {codePromo}</span>}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {["Pris régulièrement","Pris irrégulièrement","Pas pris"].map(opt=>{
                        const colors={"Pris régulièrement":"#4A8E6A","Pris irrégulièrement":"#B8A05A","Pas pris":"#B5583A"},active=complementsPris[nom]===opt;
                        return<button key={opt} onClick={()=>setComplementsPris(p=>({...p,[nom]:opt}))} style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${active?colors[opt]:P.cBorder}`,background:active?colors[opt]+"18":"transparent",color:active?colors[opt]:P.cTextMid,fontSize:12,fontFamily:P.sans,fontWeight:active?500:400}}>{opt}</button>;
                      })}
                    </div>
                  </div>
                );
              })}
            </Section>
          )}
          <Section title="🌸 Où en es-tu dans ton cycle ?" theme="c">
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {PHASES_CYCLE.map(p=><button key={p} onClick={()=>setCyclePhase(p)} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${cyclePhase===p?P.cGreen:P.cBorder}`,background:cyclePhase===p?P.cGreenDim:"transparent",color:cyclePhase===p?P.cGreen:P.cTextMid,fontSize:13,fontFamily:P.sans}}>{p}</button>)}
            </div>
            <textarea value={cycleNote} onChange={e=>setCycleNote(e.target.value)} placeholder="Précisions sur ton cycle..." rows={2} style={{...iP("c"),resize:"vertical"}}/>
          </Section>
          {(()=>{
            const axesExclus=userProfil.axesExclus||[];
            const toutesLesPriorites=[...new Set([(userProfil.profils||[]).flatMap(key=>{const s=PROFILS.flatMap(g=>g.sousProfiles).find(s=>s.key===key);return s?.priorites||[];}),...(userProfil.axesManuel||[])].flat())].filter(k=>!axesExclus.includes(k));
            const prioritaires=toutesLesPriorites.length>0?TI.filter(t=>toutesLesPriorites.includes(t.key)):TI;
            const secondaires=toutesLesPriorites.length>0?TI.filter(t=>!toutesLesPriorites.includes(t.key)):[];
            const renderQuestion=(item,isPrio)=>(
              <div key={item.key} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <p style={{color:P.cText,fontSize:14,fontWeight:500}}>{item.icon} {item.question}</p>
                  {isPrio&&toutesLesPriorites.length>0&&<span style={{background:P.cGreenDim,border:`0.5px solid ${P.cGreenBorder}`,borderRadius:20,padding:"2px 8px",fontSize:9,color:P.cGreen,fontWeight:500,textTransform:"uppercase",letterSpacing:"1px"}}>Prioritaire</span>}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {SC.map(s=>{const active=scores[item.key]===s.v;return<button key={s.v} onClick={()=>setScores(p=>({...p,[item.key]:s.v}))} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${active?s.color:P.cBorder}`,background:active?s.color+"18":"transparent",color:active?s.color:P.cTextMid,fontSize:13,fontFamily:P.sans,fontWeight:active?500:400}}>{s.v} · {s.label}</button>;})}
                </div>
                <textarea value={notes[item.key]||""} onChange={e=>setNotes(p=>({...p,[item.key]:e.target.value}))} placeholder={`Précisions sur ${item.label.toLowerCase()}…`} rows={2} style={{...iP("c"),resize:"vertical"}}/>
              </div>
            );
            return<>{prioritaires.map(item=>renderQuestion(item,true))}{secondaires.length>0&&<div style={{marginTop:8,marginBottom:16,borderTop:`1px solid ${P.cBorder}`,paddingTop:16}}><p style={{color:P.cTextDim,fontSize:11,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:14}}>Autres paramètres</p>{secondaires.map(item=>renderQuestion(item,false))}</div>}</>;
          })()}
          <Section title="Comment tu te sens globalement ?" theme="c">
            <textarea value={humeur} onChange={e=>setHumeur(e.target.value)} placeholder="Fatiguée, stressée, en forme…" rows={3} style={{...iP("c"),resize:"vertical"}}/>
          </Section>
          <Section title="Tu as quelque chose à ajouter ?" theme="c">
            <textarea value={confidences} onChange={e=>setConfidences(e.target.value)} placeholder="Une question, un détail…" rows={4} style={{...iP("c"),resize:"vertical"}}/>
          </Section>
          {saved?<div style={{background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:12,padding:14,color:P.cGreen,textAlign:"center"}}>Suivi enregistré ✓</div>:<Btn onClick={submit} variant="cPrimary" style={{width:"100%",marginTop:8}}>Envoyer à Meije</Btn>}
        </div>
      )}

      {view==="protocole"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:20}}>Mon protocole</p>
          {protocoles.length===0?<EmptyState message="Ton protocole personnalisé apparaîtra ici après votre première consultation." theme="c"/>
            :[...protocoles].reverse().map(p=>(
              <div key={p.id} style={{background:P.cSurface,border:`1px solid ${P.cBorder}`,borderRadius:14,padding:"18px 20px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <p style={{fontFamily:P.serif,fontSize:18,color:P.cText,fontWeight:400}}>{p.titre}</p>
                  <span style={{color:P.cTextDim,fontSize:11}}>{new Date(p.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</span>
                </div>
                <p style={{color:P.cTextMid,fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{p.contenu}</p>
                {p.fichiers?.length>0&&<div style={{marginTop:14}}><p style={{color:P.cTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Fichiers joints</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{p.fichiers.map((f,i)=><a key={i} href={f.url} target="_blank" rel="noreferrer" download={f.name} style={{display:"inline-flex",alignItems:"center",gap:6,background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:8,padding:"8px 14px",color:P.cGreen,fontSize:12,textDecoration:"none"}}><span>{f.type?.includes("pdf")?"📄":"🖼"}</span><span>{f.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}</div></div>}
              </div>
            ))}
        </div>
      )}

      {view==="evolution"&&(
        <div style={inner} className="fade-in">
          <button onClick={()=>setView("home")} style={{background:"none",border:"none",color:P.cTextMid,fontSize:13,fontFamily:P.sans,marginBottom:16,cursor:"pointer"}}>← Retour</button>
          <p style={{fontFamily:P.serif,fontSize:22,color:P.cText,fontWeight:300,marginBottom:4}}>Mon évolution</p>
          <p style={{color:P.cTextDim,fontSize:12,marginBottom:20}}>Tous tes paramètres de santé, semaine après semaine</p>
          {entries.length<2?<EmptyState message="Remplis au moins 2 semaines de suivi pour voir ton évolution." theme="c"/>:(
            <>
              {(()=>{const last=entries[entries.length-1],first=entries[0];const getAvg=e=>{const vs=TI.map(i=>e.scores?.[i.key]).filter(Boolean);return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;};const avgFirst=getAvg(first),avgLast=getAvg(last),diff=avgFirst&&avgLast?(avgLast-avgFirst).toFixed(1):null;return diff?(<div style={{background:diff>0?P.cGreenDim:P.cTerraDim,border:`1px solid ${diff>0?P.cGreenBorder:"rgba(181,88,58,0.2)"}`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:28}}>{diff>0?"📈":"📉"}</span><div><p style={{color:diff>0?P.cGreen:P.cTerra,fontWeight:500,fontSize:14}}>{diff>0?`+${diff} points depuis le début`:`${diff} points depuis le début`}</p><p style={{color:P.cTextMid,fontSize:12,marginTop:2}}>{entries.length} semaines · de {avgFirst?.toFixed(1)} à {avgLast?.toFixed(1)}</p></div></div>):null;})()}
              <ChartSelector entries={entries} theme="c"/>
            </>
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
          {documents.length>0&&<div style={{marginTop:8}}><p style={{color:P.cTextMid,fontSize:12,marginBottom:10}}>Bilans déjà envoyés :</p>{documents.map(d=><div key={d.id} style={{background:P.cSurface,borderRadius:12,border:`1px solid ${P.cBorder}`,padding:"12px 16px",marginBottom:8}}><p style={{color:P.cTextDim,fontSize:11,marginBottom:8}}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</p><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{d.files?.map((f,i)=><a key={i} href={f.url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,background:P.cGreenDim,border:`1px solid ${P.cGreenBorder}`,borderRadius:8,padding:"6px 10px",color:P.cGreen,fontSize:12,textDecoration:"none"}}><span>{f.type?.includes("image")?"🖼":"📄"}</span><span>{f.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}</div></div>)}</div>}
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
            return<div key={e.id} style={{background:P.cSurface,borderRadius:12,border:`1px solid ${P.cBorder}`,padding:"16px 18px",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div><p style={{color:P.cText,fontWeight:500,fontSize:14}}>{e.weekLabel}</p><p style={{color:P.cTextDim,fontSize:11,marginTop:2}}>{new Date(e.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p></div>{avg&&<div style={{background:sc?sc.color+"22":P.cSurface2,border:`1.5px solid ${sc?.color||P.cBorder}`,borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:P.serif,fontSize:16,color:sc?.color||P.cTextDim}}>{avg.toFixed(1)}</div>}</div>{e.cyclePhase&&<p style={{color:P.cAccent,fontSize:12,marginBottom:6}}>Phase : {e.cyclePhase}</p>}{e.confidences&&<p style={{color:P.cTextMid,fontSize:13,lineHeight:1.6}}>{e.confidences}</p>}</div>;
          })}
        </div>
      )}

      <BottomNav items={CLIENT_NAV.map(item=>{let badge=0;if(item.key==="home"){if(lm&&Date.now()-new Date(lm.date).getTime()<7*24*60*60*1000)badge=1;if(protocoles.length>0&&Date.now()-new Date(protocoles[protocoles.length-1].date).getTime()<14*24*60*60*1000)badge++;}if(item.key==="protocole"&&protocoles.length>0&&Date.now()-new Date(protocoles[protocoles.length-1].date).getTime()<14*24*60*60*1000)badge=1;return{...item,badge};})} active={view} onChange={setView} theme="c"/>
    </div>
  );
}

function Section({ title, children, theme="p" }) {
  return<div style={{marginBottom:20}}><p style={{color:theme==="c"?P.cText:P.pText,fontSize:14,fontWeight:500,marginBottom:12,lineHeight:1.4}}>{title}</p>{children}</div>;
}

function EmptyState({ message, theme="p" }) {
  const bg=theme==="p"?P.pSurface:P.cSurface,bd=theme==="p"?P.pBorder:P.cBorder,td=theme==="p"?P.pTextDim:P.cTextDim;
  return<div style={{background:bg,borderRadius:12,border:`1px solid ${bd}`,padding:"24px 20px",textAlign:"center"}}><p style={{color:td,fontSize:14,lineHeight:1.6}}>{message}</p></div>;
}

function FileTag({ name, url, theme="p" }) {
  const bg=theme==="p"?P.pAccentDim:P.cGreenDim,bd=theme==="p"?P.pAccentBorder:P.cGreenBorder,col=theme==="p"?P.pAccent:P.cGreen;
  const inner=<div style={{display:"inline-flex",alignItems:"center",gap:6,background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:"6px 12px",marginBottom:6,marginRight:6}}><span style={{color:col,fontSize:12}}>📎</span><span style={{color:col,fontSize:12}}>{name}</span>{url&&<span style={{color:col,fontSize:10,opacity:0.7}}>↓</span>}</div>;
  if(url)return<a href={url} target="_blank" rel="noreferrer" download={name} style={{textDecoration:"none"}}>{inner}</a>;
  return inner;
}

function Chip({ label, color }) {
  return<span style={{background:color+"18",border:`1px solid ${color}44`,borderRadius:20,padding:"3px 10px",fontSize:11,color,fontFamily:P.sans}}>{label}</span>;
}

// ─── ESPACE PRATICIENNE ───────────────────────────────────────────────────────

const PRAT_NAV = [
  { key:"clients", label:"Consultantes", icon:"👥" },
  { key:"messages", label:"Messages", icon:"💬" },
  { key:"profil", label:"Mon espace", icon:"🌿" },
];

const TABS_CLIENT = [
  { key:"suivi", label:"Suivis" },
  { key:"evolution", label:"Évolution" },
  { key:"complements", label:"Compléments" },
  { key:"protocole", label:"Protocole" },
  { key:"anamnese", label:"Questionnaire" },
  { key:"documents", label:"Documents" },
  { key:"notes", label:"Notes privées" },
  { key:"message", label:"Message" },
];

// ─── FONCTION IA ──────────────────────────────────────────────────────────────

async function genererProtocolesIA({ selected, documents, anamneses, entries, protocoles, setNewProtocole, setProtoPrat, showToast, setIaLoading, setIaStep, setIaError, db, setDoc, doc }) {
  setIaLoading(true); setIaError("");

  const bilans = [];
  documents.forEach(d => d.files?.forEach(f => bilans.push({ url: f.url, name: f.name, type: f.type })));
  anamneses.forEach(a => a.bilans?.forEach(b => bilans.push({ url: b.url, name: b.name, type: b.type })));

  if (bilans.length === 0) {
    setIaError("Aucun bilan ou document trouvé. Demande à " + selected.prenom + " d'uploader son bilan depuis son espace.");
    setIaLoading(false); return;
  }

  const anamneseTexte = anamneses.map(a => {
    if (!a.form) return "";
    const f = a.form;
    return [
      f.problematique && `Problématique : ${f.problematique}`,
      f.objectifs3mois && `Objectifs : ${f.objectifs3mois}`,
      f.maladiesChroniques && `Antécédents : ${f.maladiesChroniques}`,
      f.medicaments && `Médicaments : ${f.medicaments}`,
      f.complementsActuels && `Compléments actuels : ${f.complementsActuels}`,
      f.qualiteSommeil && `Sommeil : ${f.qualiteSommeil}/10`,
      f.niveauStress && `Stress : ${f.niveauStress}/10`,
      f.dureeCycle && `Cycle : ${f.dureeCycle}j / règles ${f.dureeRegles}j`,
      f.intensiteDouleurs && `Douleurs : ${f.intensiteDouleurs}/10 — ${f.descriptionDouleurs}`,
      f.petitDejeunerType && `Petit-dej : ${f.petitDejeunerType}`,
      f.dejeunerType && `Déjeuner : ${f.dejeunerType}`,
      f.dinerType && `Dîner : ${f.dinerType}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const dernierSuivi = entries.length > 0 ? (() => {
    const e = entries[entries.length - 1];
    return [
      e.weekLabel,
      e.cyclePhase && `Phase cycle : ${e.cyclePhase}`,
      ...TI.map(i => e.scores?.[i.key] ? `${i.label} : ${e.scores[i.key]}/5${e.notes?.[i.key] ? ` (${e.notes[i.key]})` : ""}` : null).filter(Boolean),
      e.humeur_libre && `Humeur : ${e.humeur_libre}`,
      e.confidences && `Ajout : ${e.confidences}`,
    ].filter(Boolean).join("\n");
  })() : "Pas encore de suivi rempli.";

  const toBase64 = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((res2, rej) => {
        const r = new FileReader();
        r.onload = () => res2(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  setIaStep("Chargement des bilans…");
  const docsContent = [];
  const pdfs = bilans.filter(b => b.type?.includes("pdf") || b.url?.includes(".pdf")).slice(0, 3);
  const images = bilans.filter(b => b.type?.includes("image")).slice(0, 2);

  for (const pdf of pdfs) {
    const b64 = await toBase64(pdf.url);
    if (b64) docsContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 }, title: pdf.name });
  }
  for (const img of images) {
    const b64 = await toBase64(img.url);
    if (b64) docsContent.push({ type: "image", source: { type: "base64", media_type: img.type || "image/jpeg", data: b64 } });
  }

  const SYSTEM_CLIENT = getSystemClient(selected.prenom);
  const SYSTEM_PRAT = getSystemPraticienne(selected.prenom);

  try {
    setIaStep("Génération du protocole cliente…");
    const r1 = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 4000,
        system: SYSTEM_CLIENT,
        messages: [{ role: "user", content: [
          { type: "text", text: `Cliente : ${selected.prenom}\n\nAnamnèse :\n${anamneseTexte || "Non disponible"}\n\nDernier suivi hebdomadaire :\n${dernierSuivi}\n\nGénère le protocole cliente vulgarisé et bienveillant.` },
          ...docsContent,
        ]}],
      }),
    });
    const d1 = await r1.json();
    const protocoleCliente = d1.content?.find(b => b.type === "text")?.text || "";

    setIaStep("Génération du protocole praticienne…");
    const r2 = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 4000,
        system: SYSTEM_PRAT,
        messages: [{ role: "user", content: [
          { type: "text", text: `Cliente : ${selected.prenom}\n\nAnamnèse :\n${anamneseTexte || "Non disponible"}\n\nDernier suivi :\n${dernierSuivi}\n\nGénère le protocole praticienne technique et détaillé.` },
          ...docsContent,
        ]}],
      }),
    });
    const d2 = await r2.json();
    const protocolePraticienne = d2.content?.find(b => b.type === "text")?.text || "";

    setNewProtocole({ titre: `Protocole n°${protocoles.length + 1} — ${selected.prenom}`, contenu: protocoleCliente });

    if (protocolePraticienne) {
      await setDoc(doc(db, "notes_privees", `proto_ia_${selected.uid}`), {
        clientUid: selected.uid, type: "protocole_praticienne_ia",
        text: protocolePraticienne, date: new Date().toISOString(),
      });
      setProtoPrat(protocolePraticienne);
    }

    setIaStep("");
    showToast("Protocoles générés ✓ Relis avant d'envoyer 🌿");
  } catch (e) {
    setIaError("Erreur lors de la génération : " + e.message);
  }
  setIaLoading(false);
}

// ─── PRATICIENNE ──────────────────────────────────────────────────────────────

function Praticienne({ user, onLogout }) {
  const [clients,setClients]=useState([]);const [recherche,setRecherche]=useState("");
  const [selected,setSelected]=useState(null);const [clientData,setClientData]=useState(null);
  const [entries,setEntries]=useState([]);const [messages,setMessages]=useState([]);
  const [anamneses,setAnamneses]=useState([]);const [protocoles,setProtocoles]=useState([]);
  const [documents,setDocuments]=useState([]);const [newMsg,setNewMsg]=useState("");
  const [allMessages,setAllMessages]=useState([]);const [recentActivity,setRecentActivity]=useState([]);
  const [loading,setLoading]=useState(true);const [sending,setSending]=useState(false);
  const [activeTab,setActiveTab]=useState("suivi");const [mainView,setMainView]=useState("profil");
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
  // ── États IA ──
  const [iaLoading,setIaLoading]=useState(false);
  const [iaStep,setIaStep]=useState("");
  const [iaError,setIaError]=useState("");

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
    setSelected(c);setNewMsg("");setActiveTab("suivi");setAnamneseMode("view");setIaError("");setIaStep("");
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
  const deleteNote=async(id)=>{const{deleteDoc,doc:fd}=await import("firebase/firestore");await deleteDoc(fd(db,"notes_privees",id));};
  const saveStatut=async(uid,statut)=>{await updateDoc(doc(db,"users",uid),{statut});};
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
  const uploadToCloudinary=async(file,folder)=>{const fd=new FormData();fd.append("file",file);fd.append("upload_preset",UPLOAD_PRESET);fd.append("folder",folder);const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{method:"POST",body:fd});if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Erreur ${res.status}`);}const data=await res.json();if(!data.secure_url)throw new Error("Upload échoué");return{url:data.secure_url,name:file.name,type:file.type};};
  const uploadProtocoleFiles=async(files)=>{setUploadingProtocole(true);const uploaded=[];for(const file of files){try{const r=await uploadToCloudinary(file,"meije-naturo/protocoles");uploaded.push(r);}catch(e){showToast("Erreur : "+e.message);}}setProtocoleFiles(prev=>[...prev,...uploaded]);setUploadingProtocole(false);};
  const uploadAnamnesePDF=async(files)=>{setUploadingAnamnese(true);const uploaded=[];for(const file of files){try{const r=await uploadToCloudinary(file,"meije-naturo/anamneses");uploaded.push(r);}catch(e){showToast("Erreur : "+e.message);}}setUploadedAnamnese(prev=>[...prev,...uploaded]);setUploadingAnamnese(false);};
  const saveAnamnesePDF=async()=>{if(!uploadedAnamnese.length)return;setSavingAnamnese(true);await addDoc(collection(db,"anamneses"),{userUid:selected.uid,userEmail:selected.email,userPrenom:selected.prenom,date:new Date().toISOString(),saisieParPraticienne:true,bilans:uploadedAnamnese});setUploadedAnamnese([]);setSavingAnamnese(false);setAnamneseMode("view");showToast("Document enregistré ✓");};
  const sendProtocole=async()=>{if(!newProtocole.titre.trim())return;setSendingProtocole(true);await addDoc(collection(db,"protocoles"),{toUid:selected.uid,toEmail:selected.email,toPrenom:selected.prenom,titre:newProtocole.titre.trim(),contenu:newProtocole.contenu.trim(),fichiers:protocoleFiles,date:new Date().toISOString()});try{await sendEmail(EMAILJS_TEMPLATE,{prenom:selected.prenom,to_email:selected.email,titre:newProtocole.titre.trim()});}catch{}setNewProtocole({titre:"",contenu:""});setProtocoleFiles([]);setSendingProtocole(false);showToast("Protocole envoyé à "+selected.prenom+" ✓");};
  const sendMsg=async()=>{if(!newMsg.trim())return;setSending(true);await addDoc(collection(db,"messages"),{toUid:selected.uid,toEmail:selected.email,toPrenom:selected.prenom,text:newMsg.trim(),date:new Date().toISOString()});try{await sendEmail(EMAILJS_TEMPLATE,{prenom:selected.prenom,to_email:selected.email});}catch{}setNewMsg("");setSending(false);showToast("Message envoyé ✓");};
  const deleteProtocole=async(id)=>{if(!window.confirm("Supprimer ce protocole ?"))return;const{deleteDoc,doc:fd}=await import("firebase/firestore");await deleteDoc(fd(db,"protocoles",id));showToast("Protocole supprimé");};

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
              <button onClick={()=>{setShowNotifPanel(p=>{if(!p)setSeenCount(recentActivity.length);return!p;})}} style={{background:P.pSurface2,border:`1px solid ${P.pBorder}`,borderRadius:20,padding:"7px 14px",color:P.pTextMid,fontSize:15,fontFamily:P.sans,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                🔔{recentActivity.length>seenCount&&<span style={{background:P.pAccent,color:"#1C1410",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{recentActivity.length-seenCount}</span>}
              </button>
              {showNotifPanel&&(
                <div style={{position:"absolute",top:44,right:0,width:280,background:"#2A1E14",border:`1px solid ${P.pBorder}`,borderRadius:16,padding:16,zIndex:200,boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
                  <p style={{fontFamily:P.serif,fontSize:15,color:P.pText,marginBottom:12}}>Activité récente</p>
                  {recentActivity.length===0?<p style={{color:P.pTextDim,fontSize:13}}>Aucune activité 🌿</p>
                    :recentActivity.slice(0,8).map((a,i)=>{
                      const prenom=a.userPrénom||a.userPrenom||a.clientPrenom||"—";
                      const icons={suivi:"📝",anamnese:"📋",document:"📁"};
                      const labels={suivi:"a rempli son suivi",anamnese:"a envoyé son questionnaire",document:"a partagé des documents"};
                      const daysAgo=Math.floor((Date.now()-new Date(a.date).getTime())/(1000*60*60*24));
                      const timeLabel=daysAgo===0?"Aujourd'hui":daysAgo===1?"Hier":`Il y a ${daysAgo}j`;
                      const clientCible=clients.find(c=>c.uid===(a.userUid||a.clientUid));
                      return<div key={i} onClick={()=>{if(clientCible){setSelected(clientCible);setMainView("fiche");setShowNotifPanel(false);}}} style={{padding:"8px 10px",borderRadius:10,marginBottom:6,background:"rgba(255,255,255,0.04)",cursor:clientCible?"pointer":"default",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><p style={{fontSize:12,color:"rgba(242,232,218,0.8)"}}>{icons[a.type]} <span style={{color:P.pAccent}}>{prenom}</span> {labels[a.type]}</p><p style={{fontSize:10,color:"rgba(242,232,218,0.3)",flexShrink:0}}>{timeLabel}</p></div>;
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
        <div style={pInner} className="fade-in">
          <p style={{fontFamily:P.serif,fontSize:22,color:P.pText,fontWeight:300,marginBottom:20}}>Messages envoyés</p>
          {allMessages.length===0?<EmptyState message="Aucun message envoyé." theme="p"/>
            :allMessages.slice(0,30).map(m=>(
              <div key={m.id} style={{background:P.pSurface,border:`1px solid ${P.pBorder}`,borderRadius:12,padding:"14px 18px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><p style={{color:P.pAccent,fontSize:12,fontWeight:500}}>→ {m.toPrenom}</p><p style={{color:P.pTextDim,fontSize:11}}>{new Date(m.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</p></div>
                <p style={{color:P.pTextMid,fontSize:13,lineHeight:1.6}}>{m.text}</p>
              </div>
            ))}
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
          <div style={{background:P.pSurface,borderRadius:14,border:`1px solid ${P.pBorder}`,padding:"18px 20px",marginBottom:18,display:"flex",alignItems:"center",gap:16}}>
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

          <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8,marginBottom:18}}>
            {[{key:"suivi",label:"Suivis",val:entries.length,unit:`semaine${entries.length>1?"s":""}`,col:P.pGreen,icon:"📝"},{key:"protocole",label:"Protocoles",val:protocoles.length,unit:`envoyé${protocoles.length>1?"s":""}`,col:P.pAccent,icon:"🌿"},{key:"complements",label:"Compléments",val:clientData?.complements?.length||0,unit:`prescrit${(clientData?.complements?.length||0)>1?"s":""}`,col:P.pGreen,icon:"💊"},{key:"anamnese",label:"Questionnaire",val:anamneses.length>0?"✓":"–",unit:anamneses.length>0?"rempli":"en attente",col:anamneses.length>0?P.pGreen:P.pTextDim,icon:"📋"},{key:"documents",label:"Documents",val:documents.length,unit:`fichier${documents.length>1?"s":""}`,col:P.pGreen,icon:"📁"},{key:"message",label:"Messages",val:messages.length,unit:`envoyé${messages.length>1?"s":""}`,col:P.pAccent,icon:"💬"}].map(({key,label,val,unit,col,icon})=>(
              <button key={key} onClick={()=>setActiveTab(key)} style={{background:P.pSurface,borderRadius:12,border:`0.5px solid ${P.pBorder}`,padding:"12px 14px",textAlign:"left",cursor:"pointer"}} className="card-raised-dark">
                <p style={{fontSize:16,marginBottom:6}}>{icon}</p>
                <p style={{fontFamily:P.serif,fontSize:22,color:col,fontWeight:300,lineHeight:1}}>{val}</p>
                <p style={{color:P.pTextDim,fontSize:10,marginTop:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{unit}</p>
                <p style={{color:P.pTextMid,fontSize:11,marginTop:2}}>{label}</p>
              </button>
            ))}
          </div>

          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,marginBottom:20}}>
            {TABS_CLIENT.map(({key,label})=>(
              <button key={key} onClick={()=>setActiveTab(key)} style={{flexShrink:0,padding:"8px 14px",borderRadius:20,border:`1px solid ${activeTab===key?P.pAccentBorder:P.pBorder}`,background:activeTab===key?P.pAccentDim:"transparent",color:activeTab===key?P.pAccent:P.pTextDim,fontFamily:P.sans,fontSize:12,fontWeight:activeTab===key?500:400,whiteSpace:"nowrap",transition:"all 0.2s"}}>{label}</button>
            ))}
          </div>

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

          {/* ── TAB SUIVIS ── */}
          {activeTab==="suivi"&&(
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
                      {e.complementsPris&&Object.keys(e.complementsPris).length>0&&(
                        <div style={{marginBottom:10}}>
                          <p style={{color:P.pGreen,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Compléments</p>
                          {Object.entries(e.complementsPris).map(([comp,statut])=>{const colors={"Pris régulièrement":P.pGreen,"Pris irrégulièrement":"#B8A05A","Pas pris":"#B5583A"};return<div key={comp} style={{display:"flex",justifyContent:"space-between",padding:"6px 12px",background:P.pSurface2,borderRadius:8,marginBottom:4}}><span style={{color:P.pTextMid,fontSize:13}}>{comp}</span><span style={{color:colors[statut]||P.pTextDim,fontSize:12,fontWeight:500}}>{statut}</span></div>;})}
                        </div>
                      )}
                      {e.cyclePhase&&<div style={{background:P.pAccentDim,borderRadius:8,padding:"10px 14px",marginBottom:8}}><p style={{color:P.pAccent,fontSize:12,marginBottom:4}}>Phase : {e.cyclePhase}</p>{e.cycleNote&&<p style={{color:P.pTextMid,fontSize:13}}>{e.cycleNote}</p>}</div>}
                      {TI.filter(i=>e.scores?.[i.key]).map(i=>{const sc2=SC.find(x=>x.v===e.scores[i.key]);return<div key={i.key} style={{background:P.pSurface2,borderRadius:8,padding:"8px 12px",marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:e.notes?.[i.key]?4:0}}><span style={{color:P.pTextMid,fontSize:13}}>{i.icon} {i.label}</span><span style={{color:sc2?.color||P.pTextDim,fontSize:12,fontWeight:500}}>{sc2?.label}</span></div>{e.notes?.[i.key]&&<p style={{color:P.pTextDim,fontSize:12,fontStyle:"italic"}}>{e.notes[i.key]}</p>}</div>;})}
                      {e.humeur_libre&&<div style={{background:P.pGreenDim,borderRadius:8,padding:"10px 14px",marginBottom:8}}><p style={{color:P.pGreen,fontSize:10,marginBottom:4}}>Humeur</p><p style={{color:P.pText,fontSize:13,lineHeight:1.6}}>{e.humeur_libre}</p></div>}
                      {e.confidences&&<div style={{background:P.pAccentDim,borderRadius:8,padding:"10px 14px"}}><p style={{color:P.pAccent,fontSize:10,marginBottom:4}}>Ajout</p><p style={{color:P.pText,fontSize:13,lineHeight:1.6}}>{e.confidences}</p></div>}
                    </div>
                  );
                })}
            </div>
          )}

          {/* ── TAB ÉVOLUTION ── */}
          {activeTab==="evolution"&&(
            <div>
              {entries.length<2?<EmptyState message={`${selected.prenom} n'a pas encore assez de suivis.`} theme="p"/>:(
                <>
                  {(()=>{const getAvg=e=>{const vs=TI.map(i=>e.scores?.[i.key]).filter(Boolean);return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;};const avgFirst=getAvg(entries[0]),avgLast=getAvg(entries[entries.length-1]),diff=avgFirst&&avgLast?(avgLast-avgFirst).toFixed(1):null;return diff?(<div style={{background:diff>0?P.pGreenDim:P.pAccentDim,border:`1px solid ${diff>0?"rgba(122,158,130,0.3)":P.pAccentBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:24}}>{diff>0?"📈":"📉"}</span><div><p style={{color:diff>0?P.pGreen:P.pAccent,fontWeight:500,fontSize:14}}>{diff>0?`+${diff} pts depuis le début`:`${diff} pts depuis le début`}</p><p style={{color:P.pTextDim,fontSize:12,marginTop:2}}>{entries.length} semaines · moy. {avgFirst?.toFixed(1)} → {avgLast?.toFixed(1)}</p></div></div>):null;})()}
                  <ChartSelector entries={entries} theme="p"/>
                </>
              )}
            </div>
          )}

          {/* ── TAB COMPLÉMENTS ── */}
          {activeTab==="complements"&&(
            <div>
              {clientData?.complements?.length>0?clientData.complements.map((c,i)=>{
                const nom=typeof c==="string"?c:c.nom,lien=typeof c==="string"?"":c.lien,posologie=typeof c==="string"?"":c.posologie,codePromo=typeof c==="string"?"":c.codePromo;
                const isEditing=typeof editingComplement==="object"&&editingComplement?.idx===i,edited=isEditing?editingComplement:null;
                if(isEditing&&edited)return(
                  <div key={i} style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <input value={edited.nom} onChange={e=>setEditingComplement({...edited,nom:e.target.value})} placeholder="Nom" style={{...iP("p"),fontSize:13}}/>
                      <input value={edited.posologie} onChange={e=>setEditingComplement({...edited,posologie:e.target.value})} placeholder="Posologie" style={{...iP("p"),fontSize:13}}/>
                      <input value={edited.lien} onChange={e=>setEditingComplement({...edited,lien:e.target.value})} placeholder="Lien produit" style={{...iP("p"),fontSize:13}}/>
                      <input value={edited.codePromo} onChange={e=>setEditingComplement({...edited,codePromo:e.target.value})} placeholder="Code promo" style={{...iP("p"),fontSize:13}}/>
                      <div style={{display:"flex",gap:8}}><Btn onClick={()=>updateComplement(i,{nom:edited.nom,lien:edited.lien,posologie:edited.posologie,codePromo:edited.codePromo})} variant="primary" small>Enregistrer</Btn><Btn onClick={()=>setEditingComplement(null)} variant="ghost" theme="p" small>Annuler</Btn></div>
                    </div>
                  </div>
                );
                return(
                  <div key={i} style={{background:P.pSurface,borderRadius:10,padding:"12px 16px",marginBottom:8,border:`1px solid ${P.pBorder}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}><p style={{color:P.pText,fontSize:14,fontWeight:500,marginBottom:posologie?4:0}}>{nom}</p>{posologie&&<p style={{color:P.pAccent,fontSize:12,marginBottom:4}}>💊 {posologie}</p>}<div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>{lien&&<a href={lien} target="_blank" rel="noreferrer" style={{color:P.pGreen,fontSize:12,textDecoration:"none"}}>→ Commander</a>}{codePromo&&<span style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:6,padding:"2px 8px",color:P.pAccent,fontSize:11,fontWeight:500}}>🏷 {codePromo}</span>}</div></div>
                      <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8}}><button onClick={()=>setEditingComplement({idx:i,nom,lien:lien||"",posologie:posologie||"",codePromo:codePromo||""})} style={{background:"none",border:"none",color:P.pTextDim,fontSize:13,cursor:"pointer"}}>✏️</button><button onClick={()=>removeComplement(i)} style={{background:"none",border:"none",color:"#B5583A",fontSize:18,lineHeight:1,cursor:"pointer"}}>×</button></div>
                    </div>
                  </div>
                );
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

          {/* ── TAB PROTOCOLE avec IA ── */}
          {activeTab==="protocole"&&(
            <div>
              {/* BLOC IA */}
              <div style={{background:"rgba(200,133,108,0.08)",border:"1px solid rgba(200,133,108,0.25)",borderRadius:14,padding:"18px 20px",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div>
                    <p style={{color:P.pAccent,fontSize:13,fontWeight:500,marginBottom:4}}>✦ Générer les protocoles avec l'IA</p>
                    <p style={{color:P.pTextDim,fontSize:12,lineHeight:1.5}}>
                      L'IA analyse les bilans et l'anamnèse de {selected.prenom} et pré-remplit les deux protocoles.{" "}
                      {documents.reduce((n,d)=>n+(d.files?.length||0),0)+anamneses.reduce((n,a)=>n+(a.bilans?.length||0),0)===0
                        ?" ⚠️ Aucun bilan disponible pour l'instant."
                        :` ${documents.reduce((n,d)=>n+(d.files?.length||0),0)+anamneses.reduce((n,a)=>n+(a.bilans?.length||0),0)} document(s) disponible(s).`}
                    </p>
                  </div>
                  <button onClick={handleGenererIA} disabled={iaLoading} style={{background:iaLoading?"rgba(200,133,108,0.3)":P.pAccent,color:"#1C1410",border:"none",borderRadius:30,padding:"11px 22px",fontFamily:P.sans,fontWeight:500,fontSize:13,cursor:iaLoading?"not-allowed":"pointer",flexShrink:0,boxShadow:iaLoading?"none":"0 3px 10px rgba(200,133,108,0.3)",transition:"all 0.2s"}}>
                    {iaLoading?"⏳ "+iaStep:"✦ Générer"}
                  </button>
                </div>
                {iaLoading&&(
                  <div style={{marginTop:14}}>
                    <div style={{height:3,background:"rgba(200,133,108,0.15)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",background:P.pAccent,borderRadius:2,width:iaStep.includes("cliente")?"50%":iaStep.includes("praticienne")?"85%":"20%",transition:"width 0.8s ease"}}/>
                    </div>
                    <p style={{color:P.pTextDim,fontSize:11,marginTop:8,textAlign:"center"}}>{iaStep}</p>
                  </div>
                )}
                {iaError&&<div style={{marginTop:12,background:"rgba(181,88,58,0.1)",border:"1px solid rgba(181,88,58,0.3)",borderRadius:10,padding:"10px 14px"}}><p style={{color:"#B5583A",fontSize:13}}>{iaError}</p></div>}
                {!iaLoading&&newProtocole.contenu&&newProtocole.contenu!==getDefaultMessage(selected.prenom)&&(
                  <div style={{marginTop:12,background:"rgba(122,158,130,0.1)",border:"1px solid rgba(122,158,130,0.25)",borderRadius:10,padding:"10px 14px"}}>
                    <p style={{color:P.pGreen,fontSize:12}}>✓ Protocoles générés — Le protocole praticienne est dans les Notes privées. Relis et ajuste avant d'envoyer 🌿</p>
                  </div>
                )}
              </div>

              {/* Protocoles déjà envoyés */}
              {protocoles.length>0&&(
                <div style={{marginBottom:20}}>
                  {[...protocoles].reverse().map(p=>(
                    <div key={p.id} style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,padding:"16px 18px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <p style={{color:P.pAccent,fontFamily:P.serif,fontSize:17,fontWeight:400}}>{p.titre}</p>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{color:P.pTextDim,fontSize:11}}>{new Date(p.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span>
                          <button onClick={()=>deleteProtocole(p.id)} style={{background:"none",border:"none",color:"#B5583A",fontSize:18,cursor:"pointer"}}>×</button>
                        </div>
                      </div>
                      <p style={{color:P.pTextMid,fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{p.contenu}</p>
                      {p.fichiers?.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:8}}>{p.fichiers.map((f,i)=><FileTag key={i} name={f.name} url={f.url} theme="p"/>)}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Éditeur protocole */}
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

          {/* ── TAB QUESTIONNAIRE ── */}
          {activeTab==="anamnese"&&(
            <div>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <Btn onClick={()=>setAnamneseMode("view")} variant={anamneseMode==="view"?"primary":"ghost"} theme="p" small>Réponses</Btn>
                <Btn onClick={()=>setAnamneseMode("upload")} variant={anamneseMode==="upload"?"primary":"ghost"} theme="p" small>Uploader PDF</Btn>
              </div>
              {anamneseMode==="view"&&(anamneses.length===0?<EmptyState message={`${selected.prenom} n'a pas encore rempli le questionnaire.`} theme="p"/>
                :anamneses.map(a=>(
                  <div key={a.id}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <p style={{color:P.pTextDim,fontSize:12}}>Rempli le {new Date(a.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}{a.saisieParPraticienne&&<span style={{color:P.pAccent,marginLeft:8}}>· Saisi par toi</span>}</p>
                    </div>
                    {a.bilans?.length>0&&<div style={{marginBottom:16}}>{a.bilans.map((b,i)=><a key={i} href={b.url} target="_blank" rel="noreferrer" download={b.name} style={{display:"inline-flex",alignItems:"center",gap:5,background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:8,padding:"7px 12px",color:P.pAccent,fontSize:13,textDecoration:"none",marginRight:8,marginBottom:8}}><span>{b.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}</div>}
                    {a.form&&Object.keys(a.form).length>0&&(
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[["Problématique principale",a.form.problematique],["Objectifs 3 mois",a.form.objectifs3mois],["Antécédents médicaux",a.form.maladiesChroniques],["Médicaments",a.form.medicaments],["Compléments actuels",a.form.complementsActuels],["Sommeil",a.form.qualiteSommeil&&`${a.form.qualiteSommeil}/10`],["Stress",a.form.niveauStress&&`${a.form.niveauStress}/10`],["Cycle",a.form.dureeCycle&&`${a.form.dureeCycle}j / règles ${a.form.dureeRegles}j`],["Douleurs",a.form.intensiteDouleurs&&`${a.form.intensiteDouleurs}/10 — ${a.form.descriptionDouleurs}`]].filter(([_,v])=>v).map(([label,val])=>(
                          <div key={label} style={{display:"flex",gap:12,background:P.pSurface2,borderRadius:8,padding:"10px 14px"}}><span style={{color:P.pTextDim,fontSize:12,minWidth:170,flexShrink:0}}>{label}</span><span style={{color:P.pTextMid,fontSize:13,lineHeight:1.5}}>{val}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              {anamneseMode==="upload"&&(
                <div style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,padding:18}}>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={e=>uploadAnamnesePDF(Array.from(e.target.files))} style={{color:P.pTextMid,fontSize:13,marginBottom:12,display:"block",width:"100%"}}/>
                  {uploadingAnamnese&&<p style={{color:P.pAccent,fontSize:13}}>Upload en cours…</p>}
                  {uploadedAnamnese.length>0&&<div style={{marginTop:12}}>{uploadedAnamnese.map((f,i)=><FileTag key={i} name={f.name} theme="p"/>)}<Btn onClick={saveAnamnesePDF} disabled={savingAnamnese} variant="primary" style={{marginTop:12}}>{savingAnamnese?"Enregistrement…":"Enregistrer dans le dossier"}</Btn></div>}
                </div>
              )}
            </div>
          )}

          {/* ── TAB DOCUMENTS ── */}
          {activeTab==="documents"&&(
            <div>
              {documents.length===0?<EmptyState message={`Aucun document partagé par ${selected.prenom}.`} theme="p"/>
                :documents.map(d=>(
                  <div key={d.id} style={{background:P.pSurface,borderRadius:12,border:`1px solid ${P.pBorder}`,padding:"14px 18px",marginBottom:10}}>
                    <p style={{color:P.pTextDim,fontSize:11,marginBottom:10}}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {d.files?.map((f,i)=><a key={i} href={f.url} target="_blank" rel="noreferrer" download={f.name} style={{display:"inline-flex",alignItems:"center",gap:5,background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:8,padding:"7px 12px",color:P.pAccent,fontSize:12,textDecoration:"none"}}><span>{f.type?.includes("image")?"🖼":"📄"}</span><span>{f.name}</span><span style={{opacity:0.6,fontSize:10}}>↓</span></a>)}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ── TAB NOTES PRIVÉES ── */}
          {activeTab==="notes"&&(
            <div>
              <div style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:16}}><p style={{color:P.pAccent,fontSize:11}}>🔒 Ces notes sont uniquement visibles par toi.</p></div>
              <textarea value={privateNotes} onChange={e=>setPrivateNotes(e.target.value)} placeholder={`Observations cliniques pour ${selected.prenom}…`} rows={5} style={{...iP("p"),resize:"vertical",marginBottom:10}}/>
              <Btn onClick={saveNote} disabled={savingNote||!privateNotes.trim()} variant="primary" style={{marginBottom:24}}>{savingNote?"Enregistrement…":"Enregistrer la note"}</Btn>
              {noteHistory.length>0&&(
                <div>
                  <p style={{color:P.pTextDim,fontSize:11,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Historique des notes</p>
                  {noteHistory.map(n=>(
                    <div key={n.id} style={{background:P.pSurface,border:`1px solid ${P.pBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><p style={{color:P.pTextDim,fontSize:11}}>{new Date(n.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p><button onClick={()=>deleteNote(n.id)} style={{background:"none",border:"none",color:"#B5583A",fontSize:16,cursor:"pointer",lineHeight:1}}>×</button></div>
                      <p style={{color:P.pTextMid,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:28}}>
                <p style={{color:P.pTextDim,fontSize:10,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:12}}>🔒 Protocole praticienne (privé — généré par l'IA)</p>
                <textarea value={protoPrat} onChange={e=>setProtoPrat(e.target.value)} placeholder={`Données techniques pour ${selected.prenom}…`} rows={8} style={{...iP("p"),resize:"vertical",marginBottom:10}}/>
                <Btn onClick={saveProtoPrat} disabled={savingProtoPrat||!protoPrat.trim()} variant="primary">{savingProtoPrat?"Enregistrement…":"Enregistrer le protocole praticienne"}</Btn>
              </div>
            </div>
          )}

          {/* ── TAB MESSAGE ── */}
          {activeTab==="message"&&(
            <div>
              {messages.length===0?<EmptyState message={`Aucun message envoyé à ${selected.prenom}.`} theme="p"/>
                :messages.map(m=>(
                  <div key={m.id} style={{background:P.pAccentDim,border:`1px solid ${P.pAccentBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:8}}>
                    <p style={{color:P.pText,fontSize:14,lineHeight:1.6}}>{m.text}</p>
                    <p style={{color:P.pTextDim,fontSize:11,marginTop:6}}>{new Date(m.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p>
                  </div>
                ))}
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
