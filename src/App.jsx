import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, where, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Anamnese from "./Anamnese";

const PRATICIENNE_EMAIL = "lamenaturo@gmail.com";
const CLOUD_NAME = "di45b4ymc";
const UPLOAD_PRESET = "meije_naturo";
const EMAILJS_SERVICE = "service_5bi57sr";
const EMAILJS_TEMPLATE = "template_3w471uo";
const EMAILJS_PUBLIC = "zpxiv3rkIbtfdqAQ6";

const PHASES_CYCLE = ["Menstruelle", "Folliculaire", "Ovulation", "Luteale", "Je ne sais pas"];

const TI = [
  { key: "sommeil", label: "Sommeil", icon: "🌙", question: "Comment as-tu dormi cette semaine ?" },
  { key: "digestion", label: "Digestion", icon: "🌿", question: "Comment as-tu digéré cette semaine ?" },
  { key: "energie", label: "Énergie", icon: "⚡", question: "Comment te sens-tu niveau énergie cette semaine ?" },
  { key: "douleurs", label: "Douleurs", icon: "🔥", question: "Comment te sens-tu au niveau des douleurs cette semaine ?" },
  { key: "humeur", label: "Humeur", icon: "🌊", question: "Comment te sens-tu émotionnellement cette semaine ?" },
  { key: "alimentation", label: "Alimentation", icon: "🥗", question: "Comment as-tu mangé cette semaine ?" },
];

const SC = [
  { v: 1, label: "Pas top", color: "#C4614A" },
  { v: 2, label: "Difficile", color: "#D4906A" },
  { v: 3, label: "Moyen", color: "#C8B86A" },
  { v: 4, label: "Bien", color: "#7BAF8C" },
  { v: 5, label: "Super bien", color: "#5BA08A" },
];

const bg = "#0c0f0e";
const sf = "rgba(255,255,255,0.04)";
const bd = "rgba(255,255,255,0.08)";
const ac = "#7EC8A0";
const ad = "rgba(126,200,160,0.15)";
const ab = "rgba(126,200,160,0.3)";
const wm = "#C8956C";
const wd = "rgba(200,149,108,0.12)";
const tx = "rgba(255,255,255,0.88)";
const tm = "rgba(255,255,255,0.45)";
const td = "rgba(255,255,255,0.22)";

const iS = { width: "100%", background: sf, border: "1px solid " + bd, borderRadius: 10, padding: "11px 14px", color: tx, fontFamily: "sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };

function btn(v) {
  const base = { padding: "11px 22px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600, fontSize: 14 };
  if (v === "primary") return { ...base, background: ac, color: "#0c0f0e" };
  if (v === "warm") return { ...base, background: wm, color: "#0c0f0e" };
  return { ...base, background: sf, color: tm, border: "1px solid " + bd };
}

function SD({ value, size }) {
  size = size || 36;
  const s = SC.find(x => x.v === value);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: s ? s.color : sf, display: "flex", alignItems: "center", justifyContent: "center", color: s ? "#0c0f0e" : td, fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {value || "-"}
    </div>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prénom, setPrénom] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const login = async () => {
    setError(""); setLoading(true);
    try {
      const c = await signInWithEmailAndPassword(auth, email, password);
      const d = await getDoc(doc(db, "users", c.user.uid));
      onLogin({ uid: c.user.uid, email, prénom: d.data() ? d.data().prénom : "", role: email === PRATICIENNE_EMAIL ? "praticienne" : "cliente" });
    } catch (e) { setError("Email ou mot de passe incorrect."); }
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
      else setError("Erreur création compte.");
    }
    setLoading(false);
  };

  const reset = async () => {
    if (!email) { setError("Entre ton email d'abord."); return; }
    setError(""); setLoading(true);
    try { await sendPasswordResetEmail(auth, email); setResetSent(true); }
    catch (e) { setError("Email introuvable."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: bg }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <p style={{ color: tx, fontSize: 24, fontWeight: 700, fontFamily: "serif" }}>meije.naturo</p>
          <p style={{ color: td, fontSize: 13 }}>Ton espace de suivi personnalisé</p>
        </div>
        <div style={{ background: sf, borderRadius: 16, border: "1px solid " + bd, padding: 28 }}>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3, marginBottom: 24 }}>
            <button onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "sans-serif", fontSize: 13, fontWeight: 600, background: mode === "login" ? ac : "transparent", color: mode === "login" ? "#0c0f0e" : tm }}>Se connecter</button>
            <button onClick={() => { setMode("register"); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "sans-serif", fontSize: 13, fontWeight: 600, background: mode === "register" ? ac : "transparent", color: mode === "register" ? "#0c0f0e" : tm }}>Créer un compte</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "register" && (
              <div>
                <label style={{ color: td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Prénom</label>
                <input value={prénom} onChange={e => setPrénom(e.target.value)} placeholder="Ton prénom" style={iS} />
              </div>
            )}
            <div>
              <label style={{ color: td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.fr" type="email" style={iS} />
            </div>
            <div>
              <label style={{ color: td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Mot de passe</label>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="........" type="password" style={iS} />
            </div>
            {error && <div style={{ color: "#D4826A", fontSize: 13, background: "rgba(212,130,106,0.1)", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}
            {resetSent && <div style={{ color: ac, fontSize: 13, background: ad, borderRadius: 8, padding: "8px 12px" }}>Email envoyé ! Vérifie ta boîte mail.</div>}
            <button onClick={mode === "login" ? login : register} disabled={loading} style={{ ...btn("primary"), marginTop: 4 }}>{loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
            {mode === "login" && <button onClick={reset} style={{ background: "none", border: "none", color: td, fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "sans-serif", padding: 0, textAlign: "center" }}>Mot de passe oublié ?</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cliente({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [complements, setComplements] = useState([]);
  const [protocoles, setProtocoles] = useState([]);
  const [view, setView] = useState("home");
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [cyclePhase, setCyclePhase] = useState("");
  const [cycleNote, setCycleNote] = useState("");
  const [complementsPris, setComplementsPris] = useState({});
  const [humeur, setHumeur] = useState("");
  const [confidences, setConfidences] = useState("");
  const [docs, setDocs] = useState([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "entries"), where("userUid", "==", user.uid), orderBy("date", "asc"));
    const u = onSnapshot(q, s => { setEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const q2 = query(collection(db, "messages"), where("toUid", "==", user.uid), orderBy("date", "asc"));
    const u2 = onSnapshot(q2, s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q3 = query(collection(db, "anamneses"), where("userUid", "==", user.uid), orderBy("date", "asc"));
    const u3 = onSnapshot(q3, s => setAnamneses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q5 = query(collection(db, "protocoles"), where("toUid", "==", user.uid), orderBy("date", "asc"));
    const u5 = onSnapshot(q5, s => setProtocoles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const userRef = doc(db, "users", user.uid);
    const u4 = onSnapshot(userRef, d => { if (d.data() && d.data().complements) setComplements(d.data().complements); });
    return () => { u(); u2(); u3(); u4(); u5(); };
  }, [user.uid]);

  const wk = () => {
    const n = new Date();
    const s = new Date(n);
    s.setDate(n.getDate() - n.getDay() + 1);
    const mois = ["jan", "fev", "mar", "avr", "mai", "jun", "jul", "aou", "sep", "oct", "nov", "dec"];
    return "Semaine du " + s.getDate() + " " + mois[s.getMonth()];
  };

  const uploadDocs = async (files) => {
    setUploadingDocs(true);
    const uploaded = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "meije-naturo/suivis");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) uploaded.push({ url: data.secure_url, name: file.name, type: file.type });
      } catch (e) { console.error(e); }
    }
    setDocs(prev => [...prev, ...uploaded]);
    setUploadingDocs(false);
  };

  const submit = async () => {
    await addDoc(collection(db, "entries"), {
      userUid: user.uid, userEmail: user.email, userPrénom: user.prénom,
      weekLabel: wk(), date: new Date().toISOString(),
      scores, notes, cyclePhase, cycleNote,
      complementsPris, humeur_libre: humeur, confidences, documents: docs,
    });
    setScores({}); setNotes({}); setCyclePhase(""); setCycleNote("");
    setComplementsPris({}); setHumeur(""); setConfidences(""); setDocs([]);
    setSaved(true);
    setTimeout(() => { setSaved(false); setView("home"); }, 1800);
  };

  const lm = messages[messages.length - 1];
  const hasAnamnese = anamneses.length > 0;

  if (loading) return <div style={{ color: td, padding: 40, textAlign: "center" }}>Chargement...</div>;
  if (view === "anamnese") return <Anamnese user={user} onDone={() => setView("home")} readonly={hasAnamnese} existingData={anamneses[0]} />;

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "28px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ color: ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>meije.naturo</div>
            <h1 style={{ fontFamily: "serif", fontSize: 26, color: tx, fontWeight: 700 }}>Bonjour {user.prénom}</h1>
          </div>
          <button onClick={onLogout} style={{ ...btn("ghost"), fontSize: 12, padding: "7px 14px" }}>Déconnexion</button>
        </div>

        {lm && (
          <div style={{ background: wd, border: "1px solid rgba(200,149,108,0.25)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <div style={{ color: wm, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Message de Meije</div>
            <p style={{ color: tx, fontSize: 15, lineHeight: 1.6 }}>{lm.text}</p>
          </div>
        )}

        {view === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setView("anamnese")} style={{ background: wd, border: "1px solid rgba(200,149,108,0.3)", borderRadius: 14, padding: "20px 22px", cursor: "pointer", textAlign: "left", color: tx, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: wm, fontWeight: 700, fontSize: 16, marginBottom: 3 }}>Mon questionnaire de santé</div>
                <div style={{ color: tm, fontSize: 13 }}>{hasAnamnese ? "Consulter ou modifier mes réponses" : "À remplir avant notre première consultation"}</div>
              </div>
              <span style={{ fontSize: 22 }}>{">"}</span>
            </button>
            <button onClick={() => setView("new")} style={{ background: ad, border: "1px solid " + ab, borderRadius: 14, padding: "20px 22px", cursor: "pointer", textAlign: "left", color: tx, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: ac, fontWeight: 700, fontSize: 16, marginBottom: 3 }}>Remplir mon suivi de la semaine</div>
                <div style={{ color: tm, fontSize: 13 }}>{wk()}</div>
              </div>
              <span style={{ fontSize: 22 }}>{">"}</span>
            </button>
            {protocoles.length > 0 && (
              <button onClick={() => setView("protocoles")} style={{ background: "rgba(155,140,196,0.1)", border: "1px solid rgba(155,140,196,0.25)", borderRadius: 14, padding: "18px 22px", cursor: "pointer", textAlign: "left", color: tx, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "#9B8EC4", fontWeight: 700, fontSize: 16, marginBottom: 3 }}>Mon protocole</div>
                  <div style={{ color: tm, fontSize: 13 }}>{protocoles.length} protocole{protocoles.length > 1 ? "s" : ""} reçu{protocoles.length > 1 ? "s" : ""}</div>
                </div>
                <span style={{ fontSize: 20 }}>{">"}</span>
              </button>
            )}
            {entries.length > 0 && (
              <button onClick={() => setView("history")} style={{ background: sf, border: "1px solid " + bd, borderRadius: 14, padding: "18px 22px", cursor: "pointer", textAlign: "left", color: tx, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>Mon historique</div>
                  <div style={{ color: tm, fontSize: 13 }}>{entries.length} semaine{entries.length > 1 ? "s" : ""}</div>
                </div>
                <span style={{ fontSize: 20 }}>{">"}</span>
              </button>
            )}
            <button onClick={() => setView("documents")} style={{ background: sf, border: "1px solid " + bd, borderRadius: 14, padding: "18px 22px", cursor: "pointer", textAlign: "left", color: tx, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>Mes documents</div>
                <div style={{ color: tm, fontSize: 13 }}>Uploader bilans, ordonnances, photos...</div>
              </div>
              <span style={{ fontSize: 20 }}>{">"}</span>
            </button>
          </div>
        )}

        {view === "new" && (
          <div>
            <button onClick={() => setView("home")} style={{ ...btn("ghost"), fontSize: 12, padding: "6px 14px", marginBottom: 20 }}>Retour</button>
            <h2 style={{ fontFamily: "serif", fontSize: 20, color: tx, marginBottom: 6 }}>Ton suivi de la semaine</h2>
            <p style={{ color: tm, fontSize: 13, marginBottom: 24 }}>{wk()}</p>

            {/* Complements */}
            {complements.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: tx, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Tes compléments cette semaine</div>
                {complements.map((c, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ color: tm, fontSize: 13, marginBottom: 6 }}>{c}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Pris régulièrement", "Pris irrégulièrement", "Pas pris"].map(opt => (
                        <button key={opt} onClick={() => setComplementsPris(p => ({ ...p, [c]: opt }))} style={{ padding: "6px 12px", borderRadius: 20, border: "2px solid " + (complementsPris[c] === opt ? (opt === "Pris régulièrement" ? "#7BAF8C" : opt === "Pris irrégulièrement" ? "#C8B86A" : "#C4614A") : bd), background: complementsPris[c] === opt ? "rgba(255,255,255,0.06)" : "transparent", color: complementsPris[c] === opt ? tx : td, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cycle */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: tx, fontWeight: 600, fontSize: 15, marginBottom: 10 }}>🌸 Où en es-tu dans ton cycle cette semaine ?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {PHASES_CYCLE.map(p => (
                  <button key={p} onClick={() => setCyclePhase(p)} style={{ padding: "8px 14px", borderRadius: 20, border: "2px solid " + (cyclePhase === p ? ac : bd), background: cyclePhase === p ? ad : "transparent", color: cyclePhase === p ? ac : tm, cursor: "pointer", fontSize: 13, fontFamily: "sans-serif" }}>{p}</button>
                ))}
              </div>
              <textarea value={cycleNote} onChange={e => setCycleNote(e.target.value)} placeholder="Précisions sur ton cycle (douleurs, durée des règles, SPM...)" rows={2} style={{ ...iS, resize: "vertical" }} />
            </div>

            {/* Autres questions avec score + note */}
            {TI.map(item => (
              <div key={item.key} style={{ marginBottom: 24 }}>
                <div style={{ color: tx, fontWeight: 600, fontSize: 15, marginBottom: 10 }}>{item.icon} {item.question}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {SC.map(s => (
                    <button key={s.v} onClick={() => setScores(p => ({ ...p, [item.key]: s.v }))} style={{ padding: "8px 14px", borderRadius: 20, border: "2px solid " + (scores[item.key] === s.v ? s.color : bd), background: scores[item.key] === s.v ? s.color + "22" : "transparent", color: scores[item.key] === s.v ? s.color : tm, cursor: "pointer", fontSize: 13, fontWeight: scores[item.key] === s.v ? 700 : 400, fontFamily: "sans-serif" }}>{s.v} - {s.label}</button>
                  ))}
                </div>
                <textarea value={notes[item.key] || ""} onChange={e => setNotes(p => ({ ...p, [item.key]: e.target.value }))} placeholder={"Precisions sur " + item.label.toLowerCase() + "..."} rows={2} style={{ ...iS, resize: "vertical" }} />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Comment tu te sens globalement ?</label>
              <textarea value={humeur} onChange={e => setHumeur(e.target.value)} placeholder="Fatiguée, stressée, plutôt bien..." rows={3} style={{ ...iS, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Tu as quelque chose à ajouter ?</label>
              <textarea value={confidences} onChange={e => setConfidences(e.target.value)} placeholder="Un détail, une question, quelque chose qui s'est passé cette semaine..." rows={4} style={{ ...iS, resize: "vertical" }} />
            </div>

            {saved ? <div style={{ background: ad, border: "1px solid " + ab, borderRadius: 10, padding: 14, color: ac, fontWeight: 600, textAlign: "center" }}>Suivi enregistré !</div> : <button onClick={submit} style={{ ...btn("primary"), width: "100%" }}>Envoyer à Meije</button>}
          </div>
        )}

        

        

        

        {view === "documents" && (
          <div>
            <button onClick={() => setView("home")} style={{ ...btn("ghost"), fontSize: 12, padding: "6px 14px", marginBottom: 20 }}>Retour</button>
            <h2 style={{ fontFamily: "serif", fontSize: 20, color: tx, marginBottom: 8 }}>Mes documents</h2>
            <p style={{ color: tm, fontSize: 13, marginBottom: 20 }}>Uploade tes bilans sanguins, ordonnances, photos... Meije les recevra directement.</p>
            <div style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 20, marginBottom: 20 }}>
              <input type="file" multiple accept="image/*,application/pdf" onChange={e => uploadDocs(Array.from(e.target.files))} style={{ color: tm, fontSize: 13 }} />
              {uploadingDocs && <div style={{ color: ac, fontSize: 13, marginTop: 10 }}>Upload en cours...</div>}
              {docs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {docs.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: ad, borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                      <span style={{ color: ac, fontSize: 12 }}>ok</span>
                      <span style={{ color: tm, fontSize: 13 }}>{d.name}</span>
                    </div>
                  ))}
                  <button onClick={async () => {
                    await addDoc(collection(db, "documents"), { userUid: user.uid, userEmail: user.email, userPrénom: user.prénom, date: new Date().toISOString(), files: docs });
                    setDocs([]);
                    alert("Documents envoyés à Meije !");
                  }} style={{ ...btn("primary"), marginTop: 12, width: "100%" }}>Envoyer à Meije</button>
                </div>
              )}
            </div>
          </div>
        )}

{view === "protocoles" && (
          <div>
            <button onClick={() => setView("home")} style={{ ...btn("ghost"), fontSize: 12, padding: "6px 14px", marginBottom: 20 }}>Retour</button>
            <h2 style={{ fontFamily: "serif", fontSize: 20, color: tx, marginBottom: 20 }}>Mon protocole</h2>
            {[...protocoles].reverse().map(p => (
              <div key={p.id} style={{ background: "rgba(155,140,196,0.08)", border: "1px solid rgba(155,140,196,0.2)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ color: "#9B8EC4", fontWeight: 700, fontSize: 17 }}>{p.titre}</div>
                  <div style={{ color: td, fontSize: 11 }}>{new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
                </div>
                <p style={{ color: tm, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{p.contenu}</p>
              </div>
            ))}
          </div>
        )}

        {view === "history" && (
          <div>
            <button onClick={() => setView("home")} style={{ ...btn("ghost"), fontSize: 12, padding: "6px 14px", marginBottom: 20 }}>Retour</button>
            <h2 style={{ fontFamily: "serif", fontSize: 20, color: tx, marginBottom: 20 }}>Mon historique</h2>
            {[...entries].reverse().map(e => {
              const vs = TI.map(i => e.scores && e.scores[i.key]).filter(Boolean);
              const avg = vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : null;
              return (
                <div key={e.id} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ color: tx, fontWeight: 600 }}>{e.weekLabel}</div>
                      <div style={{ color: td, fontSize: 12 }}>{new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
                    </div>
                    {avg && <SD value={Math.round(avg)} size={40} />}
                  </div>
                  {e.cyclePhase && <div style={{ color: ac, fontSize: 13, marginBottom: 8 }}>Phase : {e.cyclePhase}</div>}
                  {e.confidences && <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10 }}><p style={{ color: tm, fontSize: 13, lineHeight: 1.6 }}>{e.confidences}</p></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("dossier");
  const [protocoles2, setProtocoles2] = useState([]);
  const [newProtocole, setNewProtocole] = useState({ titre: "", contenu: "" });
  const [sendingProtocole, setSendingProtocole] = useState(false);
  const [newComplement, setNewComplement] = useState("");
  const [savingComplements, setSavingComplements] = useState(false);
  const [anamneseMode, setAnamneseMode] = useState("view"); // view | form | upload
  const [anamneseForm, setAnamneseForm] = useState({});
  const [uploadingAnamnese, setUploadingAnamnese] = useState(false);
  const [uploadedAnamnese, setUploadedAnamnese] = useState([]);
  const [savingAnamnese, setSavingAnamnese] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ prenom: "", email: "", password: "" });
  const [creatingClient, setCreatingClient] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "cliente"));
    const u = onSnapshot(q, s => {
      const list = s.docs.map(d => ({ uid: d.id, ...d.data() }));
      list.sort((a, b) => (a.prenom || "").localeCompare(b.prenom || "", "fr"));
      setClients(list);
      setLoading(false);
    });
    return u;
  }, []);

  const clientsFiltres = clients.filter(c =>
    (c.prenom || "").toLowerCase().includes(recherche.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(recherche.toLowerCase())
  );

  const select = c => {
    setSelected(c); setNewMsg(""); setActiveTab("dossier"); setAnamneseMode("view");
    const userRef = doc(db, "users", c.uid);
    onSnapshot(userRef, d => setClientData(d.data()));
    const q = query(collection(db, "entries"), where("userUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q, s => setEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q2 = query(collection(db, "messages"), where("toUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q2, s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q3 = query(collection(db, "anamneses"), where("userUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q3, s => setAnamneses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q4 = query(collection(db, "protocoles"), where("toUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q4, s => setProtocoles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q6 = query(collection(db, "documents"), where("userUid", "==", c.uid), orderBy("date", "asc"));
    onSnapshot(q6, s => setDocuments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  };

  const createClient = async () => {
    if (!newClientForm.prenom || !newClientForm.email || !newClientForm.password) return;
    setCreatingClient(true);
    try {
      const c = await createUserWithEmailAndPassword(auth, newClientForm.email, newClientForm.password);
      await setDoc(doc(db, "users", c.uid), {
        prenom: newClientForm.prenom, email: newClientForm.email,
        role: "cliente", createdAt: new Date().toISOString(), complements: []
      });
      await signInWithEmailAndPassword(auth, PRATICIENNE_EMAIL, "");
      setNewClientForm({ prenom: "", email: "", password: "" });
      setShowNewClient(false);
    } catch (e) {
      // Client created, need to re-auth praticienne
    }
    setCreatingClient(false);
  };

  const addComplement = async () => {
    if (!newComplement.trim()) return;
    setSavingComplements(true);
    const current = clientData && clientData.complements ? clientData.complements : [];
    await updateDoc(doc(db, "users", selected.uid), { complements: [...current, newComplement.trim()] });
    setNewComplement("");
    setSavingComplements(false);
  };

  const removeComplement = async (idx) => {
    const current = clientData && clientData.complements ? clientData.complements : [];
    await updateDoc(doc(db, "users", selected.uid), { complements: current.filter((_, i) => i !== idx) });
  };

  const sendProtocole = async () => {
    if (!newProtocole.titre.trim() || !newProtocole.contenu.trim()) return;
    setSendingProtocole(true);
    await addDoc(collection(db, "protocoles"), {
      toUid: selected.uid, toEmail: selected.email, toPrenom: selected.prenom,
      titre: newProtocole.titre.trim(), contenu: newProtocole.contenu.trim(),
      date: new Date().toISOString(),
    });
    // Envoyer email de notification
    try {
      if (window.emailjs) {
        window.emailjs.init(EMAILJS_PUBLIC);
        await window.emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          prenom: selected.prenom,
          email: selected.email,
          titre: newProtocole.titre.trim(),
        });
      }
    } catch (e) { console.error("Email non envoye:", e); }
    setNewProtocole({ titre: "", contenu: "" });
    setSendingProtocole(false);
  };

  const send = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await addDoc(collection(db, "messages"), {
      toUid: selected.uid, toEmail: selected.email, toPrenom: selected.prenom,
      text: newMsg.trim(), date: new Date().toISOString()
    });
    setNewMsg(""); setSending(false);
  };

  const uploadAnamnesePDF = async (files) => {
    setUploadingAnamnese(true);
    const uploaded = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "meije-naturo/anamneses");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) uploaded.push({ url: data.secure_url, name: file.name, type: file.type });
      } catch (e) { console.error(e); }
    }
    setUploadedAnamnese(prev => [...prev, ...uploaded]);
    setUploadingAnamnese(false);
  };

  const saveAnamnesePDF = async () => {
    if (uploadedAnamnese.length === 0) return;
    setSavingAnamnese(true);
    await addDoc(collection(db, "anamneses"), {
      userUid: selected.uid, userEmail: selected.email, userPrenom: selected.prenom,
      date: new Date().toISOString(), saisieParPraticienne: true,
      bilans: uploadedAnamnese, thyroideScore: 0, thyroideInterpretation: "",
      form: anamneseForm,
    });
    setUploadedAnamnese([]); setSavingAnamnese(false); setAnamneseMode("view");
  };

  if (loading) return <div style={{ color: td, padding: 40, textAlign: "center" }}>Chargement...</div>;

  const TABS = [
    ["dossier", "Dossier"],
    ["suivi", "Suivis"],
    ["complements", "Compléments"],
    ["protocole", "Protocole"],
    ["anamnese", "Questionnaire"],
    ["documents", "Documents"],
    ["message", "Message"],
  ];

  const tabColor = (key) => {
    if (key === "message") return { bg: wd, color: wm };
    if (key === "protocole") return { bg: "rgba(155,140,196,0.15)", color: "#9B8EC4" };
    return { bg: ad, color: ac };
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ color: wm, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Espace praticienne</div>
            <h1 style={{ fontFamily: "serif", fontSize: 26, color: tx, fontWeight: 700 }}>Meije · meije.naturo</h1>
          </div>
          <button onClick={onLogout} style={{ ...btn("ghost"), fontSize: 12, padding: "7px 14px" }}>Déconnexion</button>
        </div>

        {!selected ? (
          <div>
            {/* Recherche + nouvelle cliente */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <input
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                placeholder="Rechercher une consultante..."
                style={{ ...iS, flex: 1 }}
              />
              <button onClick={() => setShowNewClient(!showNewClient)} style={{ ...btn("warm"), padding: "11px 16px", flexShrink: 0 }}>
                + Nouvelle consultante
              </button>
            </div>

            {/* Formulaire nouvelle cliente */}
            {showNewClient && (
              <div style={{ background: wd, border: "1px solid rgba(200,149,108,0.25)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ color: wm, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Créer un espace pour une consultante</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input value={newClientForm.prenom} onChange={e => setNewClientForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" style={{ ...iS, flex: 1, minWidth: 140 }} />
                  <input value={newClientForm.email} onChange={e => setNewClientForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" type="email" style={{ ...iS, flex: 2, minWidth: 200 }} />
                  <input value={newClientForm.password} onChange={e => setNewClientForm(f => ({ ...f, password: e.target.value }))} placeholder="Mot de passe temporaire" type="text" style={{ ...iS, flex: 1, minWidth: 160 }} />
                </div>
                <p style={{ color: td, fontSize: 12, marginTop: 8, marginBottom: 12 }}>Tu enverras ce mot de passe à ta consultante. Elle pourra le changer via "Mot de passe oublié".</p>
                <button onClick={createClient} disabled={creatingClient} style={{ ...btn("warm") }}>
                  {creatingClient ? "Création..." : "Créer son espace"}
                </button>
              </div>
            )}

            {/* Liste clientes */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <h2 style={{ color: tx, fontSize: 15, fontWeight: 600 }}>
                {clients.length === 0 ? "Aucune consultante" : `${clients.length} consultante${clients.length > 1 ? "s" : ""}`}
              </h2>
              {recherche && <span style={{ color: td, fontSize: 13 }}>— {clientsFiltres.length} résultat{clientsFiltres.length > 1 ? "s" : ""}</span>}
            </div>

            {/* Index alphabétique */}
            {!recherche && clients.length > 5 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => {
                  const has = clients.some(c => (c.prenom || "").toUpperCase().startsWith(l));
                  return (
                    <button key={l} onClick={() => setRecherche(l)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + (has ? ab : bd), background: has ? ad : "transparent", color: has ? ac : td, cursor: has ? "pointer" : "default", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600 }}>{l}</button>
                  );
                })}
                {recherche && <button onClick={() => setRecherche("")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + bd, background: sf, color: tm, cursor: "pointer", fontSize: 12, fontFamily: "sans-serif" }}>Tout voir</button>}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clientsFiltres.map(c => (
                <button key={c.uid} onClick={() => select(c)} style={{ background: sf, border: "1px solid " + bd, borderRadius: 12, padding: "14px 20px", cursor: "pointer", textAlign: "left", color: tx, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: ad, border: "1px solid " + ab, display: "flex", alignItems: "center", justifyContent: "center", color: ac, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {(c.prenom || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{c.prenom}</div>
                      <div style={{ color: td, fontSize: 12 }}>{c.email}</div>
                    </div>
                  </div>
                  <span style={{ color: td, fontSize: 18 }}>→</span>
                </button>
              ))}
              {clientsFiltres.length === 0 && recherche && (
                <div style={{ color: td, fontSize: 14, padding: 20, textAlign: "center" }}>Aucune consultante trouvée pour "{recherche}"</div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Header fiche cliente */}
            <button onClick={() => setSelected(null)} style={{ ...btn("ghost"), fontSize: 12, padding: "6px 14px", marginBottom: 20 }}>← Retour</button>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, background: sf, borderRadius: 14, padding: 20, border: "1px solid " + bd }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: ad, border: "1px solid " + ab, display: "flex", alignItems: "center", justifyContent: "center", color: ac, fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                {(selected.prenom || "?")[0].toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontFamily: "serif", fontSize: 22, color: tx, fontWeight: 700 }}>{selected.prenom}</h2>
                <div style={{ color: td, fontSize: 13 }}>{selected.email}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: tm }}>{entries.length} suivi{entries.length > 1 ? "s" : ""}</span>
                  <span style={{ color: td }}>·</span>
                  <span style={{ fontSize: 12, color: anamneses.length > 0 ? ac : td }}>{anamneses.length > 0 ? "Questionnaire rempli" : "Pas de questionnaire"}</span>
                  <span style={{ color: td }}>·</span>
                  <span style={{ fontSize: 12, color: protocoles.length > 0 ? "#9B8EC4" : td }}>{protocoles.length > 0 ? `${protocoles.length} protocole${protocoles.length > 1 ? "s" : ""}` : "Pas de protocole"}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
              {TABS.map(([key, label]) => {
                const tc = tabColor(key);
                return (
                  <button key={key} onClick={() => setActiveTab(key)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "sans-serif", fontSize: 12, fontWeight: 600, background: activeTab === key ? tc.bg : "rgba(255,255,255,0.04)", color: activeTab === key ? tc.color : td, transition: "all 0.2s" }}>{label}</button>
                );
              })}
            </div>

            {/* Dossier résumé */}
            {activeTab === "dossier" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                <div onClick={() => setActiveTab("anamnese")} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, cursor: "pointer" }}>
                  <div style={{ color: ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Questionnaire</div>
                  {anamneses.length > 0
                    ? <div style={{ color: tx, fontSize: 14 }}>Rempli le {new Date(anamneses[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                    : <div style={{ color: td, fontSize: 14 }}>Non rempli</div>
                  }
                </div>
                <div onClick={() => setActiveTab("suivi")} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, cursor: "pointer" }}>
                  <div style={{ color: ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Derniers suivis</div>
                  <div style={{ color: tx, fontSize: 14 }}>{entries.length} semaine{entries.length > 1 ? "s" : ""} enregistrée{entries.length > 1 ? "s" : ""}</div>
                  {entries.length > 0 && <div style={{ color: td, fontSize: 12, marginTop: 4 }}>Dernier : {entries[entries.length-1].weekLabel}</div>}
                </div>
                <div onClick={() => setActiveTab("complements")} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, cursor: "pointer" }}>
                  <div style={{ color: ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Compléments</div>
                  <div style={{ color: tx, fontSize: 14 }}>{clientData?.complements?.length || 0} complément{(clientData?.complements?.length || 0) > 1 ? "s" : ""} prescrit{(clientData?.complements?.length || 0) > 1 ? "s" : ""}</div>
                </div>
                <div onClick={() => setActiveTab("protocole")} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, cursor: "pointer" }}>
                  <div style={{ color: "#9B8EC4", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Protocole</div>
                  <div style={{ color: tx, fontSize: 14 }}>{protocoles.length} protocole{protocoles.length > 1 ? "s" : ""} envoyé{protocoles.length > 1 ? "s" : ""}</div>
                </div>
                <div onClick={() => setActiveTab("message")} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, cursor: "pointer" }}>
                  <div style={{ color: wm, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Messages</div>
                  <div style={{ color: tx, fontSize: 14 }}>{messages.length} message{messages.length > 1 ? "s" : ""}</div>
                </div>
                <div onClick={() => setActiveTab("documents")} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, cursor: "pointer" }}>
                  <div style={{ color: ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Documents</div>
                  <div style={{ color: tx, fontSize: 14 }}>{documents.length} document{documents.length > 1 ? "s" : ""}</div>
                </div>
              </div>
            )}

            {/* Suivis */}
            {activeTab === "suivi" && (
              <div>
                {entries.length === 0
                  ? <div style={{ color: td, background: sf, borderRadius: 12, padding: 20, fontSize: 14 }}>{selected.prenom} n'a pas encore rempli de suivi.</div>
                  : [...entries].reverse().map(e => {
                    const vs = TI.map(i => e.scores && e.scores[i.key]).filter(Boolean);
                    const avg = vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : null;
                    return (
                      <div key={e.id} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                          <div>
                            <div style={{ color: tx, fontWeight: 600 }}>{e.weekLabel}</div>
                            <div style={{ color: td, fontSize: 12 }}>{new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                          </div>
                          {avg && <SD value={Math.round(avg)} size={40} />}
                        </div>
                        {e.complementsPris && Object.keys(e.complementsPris).length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ color: ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Compléments</div>
                            {Object.entries(e.complementsPris).map(([comp, statut]) => (
                              <div key={comp} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 12px", marginBottom: 4 }}>
                                <span style={{ color: tm, fontSize: 13 }}>{comp}</span>
                                <span style={{ fontSize: 12, color: statut === "Pris régulièrement" ? "#7BAF8C" : statut === "Pris irrégulièrement" ? "#C8B86A" : "#C4614A", fontWeight: 600 }}>{statut}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {e.cyclePhase && (
                          <div style={{ background: "rgba(200,149,108,0.07)", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                            <div style={{ color: wm, fontSize: 11, marginBottom: 4 }}>Phase du cycle : {e.cyclePhase}</div>
                            {e.cycleNote && <p style={{ color: tm, fontSize: 13 }}>{e.cycleNote}</p>}
                          </div>
                        )}
                        {TI.filter(i => e.scores && e.scores[i.key]).map(i => {
                          const sc = SC.find(x => x.v === e.scores[i.key]);
                          return (
                            <div key={i.key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: e.notes && e.notes[i.key] ? 4 : 0 }}>
                                <span style={{ color: tm, fontSize: 13 }}>{i.icon} {i.label}</span>
                                <span style={{ fontSize: 12, color: sc ? sc.color : td, fontWeight: 700 }}>{sc ? sc.label : "-"}</span>
                              </div>
                              {e.notes && e.notes[i.key] && <p style={{ color: td, fontSize: 12, fontStyle: "italic" }}>{e.notes[i.key]}</p>}
                            </div>
                          );
                        })}
                        {e.humeur_libre && <div style={{ background: "rgba(126,200,160,0.06)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}><div style={{ color: ac, fontSize: 11, marginBottom: 4 }}>Humeur</div><p style={{ color: tx, fontSize: 14, lineHeight: 1.6 }}>{e.humeur_libre}</p></div>}
                        {e.confidences && <div style={{ background: "rgba(200,149,108,0.07)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}><div style={{ color: wm, fontSize: 11, marginBottom: 4 }}>Ajout</div><p style={{ color: tx, fontSize: 14, lineHeight: 1.6 }}>{e.confidences}</p></div>}
                        {e.documents && e.documents.length > 0 && (
                          <div>
                            <div style={{ color: ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Documents</div>
                            {e.documents.map((d, i) => (
                              <a key={i} href={d.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: ad, border: "1px solid " + ab, borderRadius: 8, padding: "6px 12px", color: ac, fontSize: 12, textDecoration: "none", marginRight: 8, marginBottom: 6 }}>{d.name}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* Compléments */}
            {activeTab === "complements" && (
              <div>
                <div style={{ color: tx, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Compléments de {selected.prenom}</div>
                {clientData?.complements?.length > 0
                  ? clientData.complements.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: sf, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                      <span style={{ color: tx, fontSize: 14 }}>{c}</span>
                      <button onClick={() => removeComplement(i)} style={{ background: "none", border: "none", color: "#C4614A", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                  ))
                  : <div style={{ color: td, fontSize: 14, marginBottom: 16 }}>Aucun complément ajouté.</div>
                }
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <input value={newComplement} onChange={e => setNewComplement(e.target.value)} onKeyDown={e => e.key === "Enter" && addComplement()} placeholder="Ex : Magnésium 300mg/j au dîner" style={{ ...iS, flex: 1 }} />
                  <button onClick={addComplement} disabled={savingComplements} style={{ ...btn("primary"), padding: "11px 16px", flexShrink: 0 }}>Ajouter</button>
                </div>
              </div>
            )}

            {/* Protocole */}
            {activeTab === "protocole" && (
              <div>
                <div style={{ color: tx, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Protocoles de {selected.prenom}</div>
                {protocoles.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    {[...protocoles].reverse().map(p => (
                      <div key={p.id} style={{ background: "rgba(155,140,196,0.08)", border: "1px solid rgba(155,140,196,0.2)", borderRadius: 12, padding: 18, marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ color: "#9B8EC4", fontWeight: 700, fontSize: 15 }}>{p.titre}</div>
                          <div style={{ color: td, fontSize: 11 }}>{new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                        </div>
                        <p style={{ color: tm, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{p.contenu}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18 }}>
                  <div style={{ color: ac, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Nouveau protocole</div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Titre</label>
                    <input value={newProtocole.titre} onChange={e => setNewProtocole(p => ({ ...p, titre: e.target.value }))} placeholder="Ex : Protocole phase 1 - Système nerveux" style={iS} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ color: td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Contenu</label>
                    <textarea value={newProtocole.contenu} onChange={e => setNewProtocole(p => ({ ...p, contenu: e.target.value }))} placeholder="Rédige le protocole complet ici..." rows={12} style={{ ...iS, resize: "vertical" }} />
                  </div>
                  <button onClick={sendProtocole} disabled={sendingProtocole || !newProtocole.titre.trim() || !newProtocole.contenu.trim()} style={{ ...btn("primary"), opacity: !newProtocole.titre.trim() ? 0.5 : 1 }}>
                    {sendingProtocole ? "Envoi..." : `Envoyer à ${selected.prenom}`}
                  </button>
                </div>
              </div>
            )}

            {/* Questionnaire / Anamnèse */}
            {activeTab === "anamnese" && (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  <button onClick={() => setAnamneseMode("view")} style={{ ...btn(anamneseMode === "view" ? "primary" : "ghost"), fontSize: 12, padding: "7px 14px" }}>Voir les réponses</button>
                  <button onClick={() => setAnamneseMode("upload")} style={{ ...btn(anamneseMode === "upload" ? "primary" : "ghost"), fontSize: 12, padding: "7px 14px" }}>Uploader un PDF</button>
                </div>

                {anamneseMode === "view" && (
                  anamneses.length === 0
                    ? <div style={{ color: td, background: sf, borderRadius: 12, padding: 20, fontSize: 14 }}>{selected.prenom} n'a pas encore rempli le questionnaire.</div>
                    : anamneses.map(a => (
                      <div key={a.id}>
                        <div style={{ color: td, fontSize: 12, marginBottom: 16 }}>
                          Rempli le {new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          {a.saisieParPraticienne && <span style={{ color: wm, marginLeft: 8 }}>· Saisi par toi</span>}
                        </div>
                        {a.thyroideScore > 0 && (
                          <div style={{ background: ad, border: "1px solid " + ab, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                            <div style={{ color: ac, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Score thyroïde : {a.thyroideScore} / 23</div>
                            <div style={{ color: tm, fontSize: 13 }}>{a.thyroideInterpretation}</div>
                          </div>
                        )}
                        {a.bilans && a.bilans.length > 0 && (
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ color: wm, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Documents uploadés</div>
                            {a.bilans.map((b, i) => (
                              <a key={i} href={b.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: wd, border: "1px solid rgba(200,149,108,0.2)", borderRadius: 10, padding: "8px 14px", color: wm, fontSize: 13, textDecoration: "none", marginRight: 8, marginBottom: 8 }}>{b.name}</a>
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
                              <div key={label} style={{ display: "flex", gap: 12, background: sf, borderRadius: 8, padding: "10px 14px" }}>
                                <span style={{ color: td, fontSize: 12, minWidth: 180, flexShrink: 0 }}>{label}</span>
                                <span style={{ color: tm, fontSize: 13, lineHeight: 1.5 }}>{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                )}

                {anamneseMode === "upload" && (
                  <div style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 20 }}>
                    <div style={{ color: ac, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Uploader l'anamnèse de {selected.prenom}</div>
                    <p style={{ color: td, fontSize: 13, marginBottom: 14 }}>Uploade le PDF ou la photo de son questionnaire papier.</p>
                    <input type="file" multiple accept="image/*,application/pdf" onChange={e => uploadAnamnesePDF(Array.from(e.target.files))} style={{ color: tm, fontSize: 13, marginBottom: 12 }} />
                    {uploadingAnamnese && <div style={{ color: ac, fontSize: 13, margin: "8px 0" }}>Upload en cours...</div>}
                    {uploadedAnamnese.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        {uploadedAnamnese.map((f, i) => (
                          <div key={i} style={{ color: ac, fontSize: 13, marginBottom: 4 }}>✓ {f.name}</div>
                        ))}
                        <button onClick={saveAnamnesePDF} disabled={savingAnamnese} style={{ ...btn("primary"), marginTop: 10 }}>
                          {savingAnamnese ? "Enregistrement..." : "Enregistrer dans le dossier"}
                        </button>
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
                  ? <div style={{ color: td, background: sf, borderRadius: 12, padding: 20, fontSize: 14 }}>Aucun document partagé par {selected.prenom}.</div>
                  : documents.map(d => (
                    <div key={d.id} style={{ background: sf, borderRadius: 12, border: "1px solid " + bd, padding: 18, marginBottom: 12 }}>
                      <div style={{ color: td, fontSize: 12, marginBottom: 10 }}>{new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {d.files && d.files.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: ad, border: "1px solid " + ab, borderRadius: 8, padding: "8px 14px", color: ac, fontSize: 13, textDecoration: "none" }}>
                            {f.type && f.type.includes("image") ? "🖼 " : "📄 "}{f.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Message */}
            {activeTab === "message" && (
              <div>
                {messages.length === 0 && <div style={{ color: td, fontSize: 14, marginBottom: 16 }}>Aucun message envoyé à {selected.prenom}.</div>}
                {messages.map(m => (
                  <div key={m.id} style={{ background: wd, border: "1px solid rgba(200,149,108,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                    <p style={{ color: tx, fontSize: 14, lineHeight: 1.6 }}>{m.text}</p>
                    <div style={{ color: td, fontSize: 11, marginTop: 6 }}>{new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
                  </div>
                ))}
                <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={`Message pour ${selected.prenom}...`} rows={3} style={{ ...iS, resize: "vertical", marginBottom: 10 }} />
                <button onClick={send} disabled={sending || !newMsg.trim()} style={{ ...btn("warm"), opacity: !newMsg.trim() ? 0.5 : 1 }}>
                  {sending ? "Envoi..." : `Envoyer à ${selected.prenom}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const u = onAuthStateChanged(auth, async fw => {
      if (fw) {
        const d = await getDoc(doc(db, "users", fw.uid));
        setUser({ uid: fw.uid, email: fw.email, prénom: d.data() ? d.data().prénom : "", role: fw.email === PRATICIENNE_EMAIL ? "praticienne" : "cliente" });
      } else { setUser(null); }
      setChecking(false);
    });
    return u;
  }, []);

  const logout = async () => { await signOut(auth); setUser(null); };

  if (checking) return <div style={{ minHeight: "100vh", background: "#0c0f0e", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif" }}>Chargement...</div></div>;

  return (
    <>
      <style>{"* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0c0f0e; } button:hover { opacity: 0.88; }"}</style>
      <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
      {!user ? <Auth onLogin={setUser} /> : user.role === "praticienne" ? <Praticienne user={user} onLogout={logout} /> : <Cliente user={user} onLogout={logout} />}
    </>
  );
}
