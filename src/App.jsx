import { useState, useEffect } from “react”;
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from “firebase/auth”;
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, where, onSnapshot } from “firebase/firestore”;
import { auth, db } from “./firebase”;

const PRATICIENNE_EMAIL = “lamenaturo@gmail.com”;

const TI = [
{ key: “complements”, label: “Complements”, question: “Tu as pris tes complements cette semaine ?” },
{ key: “sommeil”, label: “Sommeil”, question: “Comment tu as dormi ?” },
{ key: “cycle”, label: “Cycle”, question: “Ou en es-tu dans ton cycle ?” },
{ key: “digestion”, label: “Digestion”, question: “Comment etait ta digestion ?” },
{ key: “energie”, label: “Energie”, question: “Ton niveau d energie ?” },
{ key: “douleurs”, label: “Douleurs”, question: “Des douleurs cette semaine ?” },
{ key: “humeur”, label: “Humeur”, question: “Tu etais comment emotionnellement ?” },
{ key: “alimentation”, label: “Alimentation”, question: “Tu as mange comment cette semaine ?” },
];

const SC = [
{ v: 1, label: “Pas top”, color: “#C4614A” },
{ v: 2, label: “Difficile”, color: “#D4906A” },
{ v: 3, label: “Moyen”, color: “#C8B86A” },
{ v: 4, label: “Bien”, color: “#7BAF8C” },
{ v: 5, label: “Super bien”, color: “#5BA08A” },
];

const bg = “#0c0f0e”;
const sf = “rgba(255,255,255,0.04)”;
const bd = “rgba(255,255,255,0.08)”;
const ac = “#7EC8A0”;
const ad = “rgba(126,200,160,0.15)”;
const ab = “rgba(126,200,160,0.3)”;
const wm = “#C8956C”;
const wd = “rgba(200,149,108,0.12)”;
const tx = “rgba(255,255,255,0.88)”;
const tm = “rgba(255,255,255,0.45)”;
const td = “rgba(255,255,255,0.22)”;

const iS = { width: “100%”, background: sf, border: “1px solid “ + bd, borderRadius: 10, padding: “11px 14px”, color: tx, fontFamily: “sans-serif”, fontSize: 14, outline: “none”, boxSizing: “border-box” };

function btn(v) {
const base = { padding: “11px 22px”, borderRadius: 10, border: “none”, cursor: “pointer”, fontFamily: “sans-serif”, fontWeight: 600, fontSize: 14 };
if (v === “primary”) return { …base, background: ac, color: “#0c0f0e” };
if (v === “warm”) return { …base, background: wm, color: “#0c0f0e” };
return { …base, background: sf, color: tm, border: “1px solid “ + bd };
}

function SD({ value, size }) {
size = size || 36;
const s = SC.find(x => x.v === value);
return (
<div style={{ width: size, height: size, borderRadius: “50%”, background: s ? s.color : sf, display: “flex”, alignItems: “center”, justifyContent: “center”, color: s ? “#0c0f0e” : td, fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
{value || “-”}
</div>
);
}

function Auth({ onLogin }) {
const [mode, setMode] = useState(“login”);
const [email, setEmail] = useState(””);
const [password, setPassword] = useState(””);
const [prenom, setPrenom] = useState(””);
const [error, setError] = useState(””);
const [loading, setLoading] = useState(false);
const [resetSent, setResetSent] = useState(false);

const login = async () => {
setError(””); setLoading(true);
try {
const c = await signInWithEmailAndPassword(auth, email, password);
const d = await getDoc(doc(db, “users”, c.user.uid));
onLogin({ uid: c.user.uid, email, prenom: d.data() ? d.data().prenom : “”, role: email === PRATICIENNE_EMAIL ? “praticienne” : “cliente” });
} catch (e) {
setError(“Email ou mot de passe incorrect.”);
}
setLoading(false);
};

const register = async () => {
setError(””); setLoading(true);
if (!email || !password || !prenom) { setError(“Remplis tous les champs.”); setLoading(false); return; }
try {
const c = await createUserWithEmailAndPassword(auth, email, password);
await setDoc(doc(db, “users”, c.user.uid), { prenom, email, role: “cliente”, createdAt: new Date().toISOString() });
onLogin({ uid: c.user.uid, email, prenom, role: “cliente” });
} catch (e) {
if (e.code === “auth/email-already-in-use”) setError(“Compte deja existant.”);
else if (e.code === “auth/weak-password”) setError(“Mot de passe trop court (6 min).”);
else setError(“Erreur creation compte.”);
}
setLoading(false);
};

const reset = async () => {
if (!email) { setError(“Entre ton email d abord.”); return; }
setError(””); setLoading(true);
try { await sendPasswordResetEmail(auth, email); setResetSent(true); }
catch (e) { setError(“Email introuvable.”); }
setLoading(false);
};

return (
<div style={{ minHeight: “100vh”, display: “flex”, alignItems: “center”, justifyContent: “center”, padding: 20, background: bg }}>
<div style={{ width: “100%”, maxWidth: 400 }}>
<div style={{ textAlign: “center”, marginBottom: 36 }}>
<p style={{ color: tx, fontSize: 24, fontWeight: 700, fontFamily: “serif” }}>meije.naturo</p>
<p style={{ color: td, fontSize: 13 }}>Ton espace de suivi personnalise</p>
</div>
<div style={{ background: sf, borderRadius: 16, border: “1px solid “ + bd, padding: 28 }}>
<div style={{ display: “flex”, gap: 4, background: “rgba(255,255,255,0.04)”, borderRadius: 8, padding: 3, marginBottom: 24 }}>
<button onClick={() => { setMode(“login”); setError(””); }} style={{ flex: 1, padding: “8px 0”, borderRadius: 6, border: “none”, cursor: “pointer”, fontFamily: “sans-serif”, fontSize: 13, fontWeight: 600, background: mode === “login” ? ac : “transparent”, color: mode === “login” ? “#0c0f0e” : tm }}>Se connecter</button>
<button onClick={() => { setMode(“register”); setError(””); }} style={{ flex: 1, padding: “8px 0”, borderRadius: 6, border: “none”, cursor: “pointer”, fontFamily: “sans-serif”, fontSize: 13, fontWeight: 600, background: mode === “register” ? ac : “transparent”, color: mode === “register” ? “#0c0f0e” : tm }}>Creer un compte</button>
</div>
<div style={{ display: “flex”, flexDirection: “column”, gap: 12 }}>
{mode === “register” && (
<div>
<label style={{ color: td, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1, display: “block”, marginBottom: 5 }}>Prenom</label>
<input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder=“Ton prenom” style={iS} />
</div>
)}
<div>
<label style={{ color: td, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1, display: “block”, marginBottom: 5 }}>Email</label>
<input value={email} onChange={e => setEmail(e.target.value)} placeholder=“ton@email.fr” type=“email” style={iS} />
</div>
<div>
<label style={{ color: td, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1, display: “block”, marginBottom: 5 }}>Mot de passe</label>
<input value={password} onChange={e => setPassword(e.target.value)} placeholder=”……..” type=“password” style={iS} />
</div>
{error && <div style={{ color: “#D4826A”, fontSize: 13, background: “rgba(212,130,106,0.1)”, borderRadius: 8, padding: “8px 12px” }}>{error}</div>}
{resetSent && <div style={{ color: ac, fontSize: 13, background: ad, borderRadius: 8, padding: “8px 12px” }}>Email envoye ! Verifie ta boite mail.</div>}
<button onClick={mode === “login” ? login : register} disabled={loading} style={{ …btn(“primary”), marginTop: 4 }}>{loading ? “…” : mode === “login” ? “Se connecter” : “Creer mon compte”}</button>
{mode === “login” && <button onClick={reset} style={{ background: “none”, border: “none”, color: td, fontSize: 12, cursor: “pointer”, textDecoration: “underline”, fontFamily: “sans-serif”, padding: 0, textAlign: “center” }}>Mot de passe oublie ?</button>}
</div>
</div>
</div>
</div>
);
}

function Cliente({ user, onLogout }) {
const [entries, setEntries] = useState([]);
const [messages, setMessages] = useState([]);
const [view, setView] = useState(“home”);
const [form, setForm] = useState({ scores: {}, humeur: “”, confidences: “” });
const [saved, setSaved] = useState(false);
const [loading, setLoading] = useState(true);

useEffect(() => {
const q = query(collection(db, “entries”), where(“userUid”, “==”, user.uid), orderBy(“date”, “asc”));
const u = onSnapshot(q, s => { setEntries(s.docs.map(d => ({ id: d.id, …d.data() }))); setLoading(false); });
const q2 = query(collection(db, “messages”), where(“toUid”, “==”, user.uid), orderBy(“date”, “asc”));
const u2 = onSnapshot(q2, s => setMessages(s.docs.map(d => ({ id: d.id, …d.data() }))));
return () => { u(); u2(); };
}, [user.uid]);

const wk = () => {
const n = new Date();
const s = new Date(n);
s.setDate(n.getDate() - n.getDay() + 1);
const mois = [“jan”, “fev”, “mar”, “avr”, “mai”, “jun”, “jul”, “aou”, “sep”, “oct”, “nov”, “dec”];
return “Semaine du “ + s.getDate() + “ “ + mois[s.getMonth()];
};

const submit = async () => {
await addDoc(collection(db, “entries”), { userUid: user.uid, userEmail: user.email, userPrenom: user.prenom, weekLabel: wk(), date: new Date().toISOString(), scores: form.scores, humeur_libre: form.humeur, confidences: form.confidences });
setForm({ scores: {}, humeur: “”, confidences: “” });
setSaved(true);
setTimeout(() => { setSaved(false); setView(“home”); }, 1800);
};

const lm = messages[messages.length - 1];
if (loading) return <div style={{ color: td, padding: 40, textAlign: “center” }}>Chargement…</div>;

return (
<div style={{ minHeight: “100vh”, background: bg, padding: “28px 20px”, fontFamily: “sans-serif” }}>
<div style={{ maxWidth: 600, margin: “0 auto” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “flex-start”, marginBottom: 28 }}>
<div>
<div style={{ color: ac, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1.5, marginBottom: 4 }}>meije.naturo</div>
<h1 style={{ fontFamily: “serif”, fontSize: 26, color: tx, fontWeight: 700 }}>Bonjour {user.prenom}</h1>
</div>
<button onClick={onLogout} style={{ …btn(“ghost”), fontSize: 12, padding: “7px 14px” }}>Deconnexion</button>
</div>
{lm && (
<div style={{ background: wd, border: “1px solid rgba(200,149,108,0.25)”, borderRadius: 14, padding: 18, marginBottom: 20 }}>
<div style={{ color: wm, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1, marginBottom: 8 }}>Message de Meije</div>
<p style={{ color: tx, fontSize: 15, lineHeight: 1.6 }}>{lm.text}</p>
</div>
)}
{view === “home” && (
<div style={{ display: “flex”, flexDirection: “column”, gap: 12 }}>
<button onClick={() => setView(“new”)} style={{ background: ad, border: “1px solid “ + ab, borderRadius: 14, padding: “20px 22px”, cursor: “pointer”, textAlign: “left”, color: tx, display: “flex”, alignItems: “center”, justifyContent: “space-between” }}>
<div>
<div style={{ color: ac, fontWeight: 700, fontSize: 16, marginBottom: 3 }}>Remplir mon suivi</div>
<div style={{ color: tm, fontSize: 13 }}>{wk()}</div>
</div>
<span style={{ fontSize: 22 }}>{”>”}</span>
</button>
{entries.length > 0 && (
<button onClick={() => setView(“history”)} style={{ background: sf, border: “1px solid “ + bd, borderRadius: 14, padding: “18px 22px”, cursor: “pointer”, textAlign: “left”, color: tx, display: “flex”, alignItems: “center”, justifyContent: “space-between” }}>
<div>
<div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>Mon historique</div>
<div style={{ color: tm, fontSize: 13 }}>{entries.length} semaine{entries.length > 1 ? “s” : “”}</div>
</div>
<span style={{ fontSize: 20 }}>{”>”}</span>
</button>
)}
</div>
)}
{view === “new” && (
<div>
<button onClick={() => setView(“home”)} style={{ …btn(“ghost”), fontSize: 12, padding: “6px 14px”, marginBottom: 20 }}>Retour</button>
<h2 style={{ fontFamily: “serif”, fontSize: 20, color: tx, marginBottom: 6 }}>Ton suivi de la semaine</h2>
<p style={{ color: tm, fontSize: 13, marginBottom: 24 }}>{wk()}</p>
{TI.map(item => (
<div key={item.key} style={{ marginBottom: 20 }}>
<div style={{ color: tx, fontWeight: 600, fontSize: 15, marginBottom: 10 }}>{item.question}</div>
<div style={{ display: “flex”, gap: 8, flexWrap: “wrap” }}>
{SC.map(s => (
<button key={s.v} onClick={() => setForm(f => ({ …f, scores: { …f.scores, [item.key]: s.v } }))} style={{ padding: “8px 14px”, borderRadius: 20, border: “2px solid “ + (form.scores[item.key] === s.v ? s.color : bd), background: form.scores[item.key] === s.v ? s.color + “22” : “transparent”, color: form.scores[item.key] === s.v ? s.color : tm, cursor: “pointer”, fontSize: 13, fontWeight: form.scores[item.key] === s.v ? 700 : 400, fontFamily: “sans-serif” }}>{s.v} - {s.label}</button>
))}
</div>
</div>
))}
<div style={{ marginBottom: 16 }}>
<label style={{ color: td, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1, display: “block”, marginBottom: 6 }}>Comment tu te sens ?</label>
<textarea value={form.humeur} onChange={e => setForm(f => ({ …f, humeur: e.target.value }))} placeholder=“Fatiguee, stressee, plutot bien…” rows={3} style={{ …iS, resize: “vertical” }} />
</div>
<div style={{ marginBottom: 24 }}>
<label style={{ color: td, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1, display: “block”, marginBottom: 6 }}>Confidences pour Meije</label>
<textarea value={form.confidences} onChange={e => setForm(f => ({ …f, confidences: e.target.value }))} placeholder=“Tout ce que tu veux partager…” rows={4} style={{ …iS, resize: “vertical” }} />
</div>
{saved ? <div style={{ background: ad, border: “1px solid “ + ab, borderRadius: 10, padding: 14, color: ac, fontWeight: 600, textAlign: “center” }}>Suivi enregistre !</div> : <button onClick={submit} style={{ …btn(“primary”), width: “100%” }}>Envoyer a Meije</button>}
</div>
)}
{view === “history” && (
<div>
<button onClick={() => setView(“home”)} style={{ …btn(“ghost”), fontSize: 12, padding: “6px 14px”, marginBottom: 20 }}>Retour</button>
<h2 style={{ fontFamily: “serif”, fontSize: 20, color: tx, marginBottom: 20 }}>Mon historique</h2>
{[…entries].reverse().map(e => {
const vs = TI.map(i => e.scores && e.scores[i.key]).filter(Boolean);
const avg = vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : null;
return (
<div key={e.id} style={{ background: sf, borderRadius: 12, border: “1px solid “ + bd, padding: 18, marginBottom: 12 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 12 }}>
<div>
<div style={{ color: tx, fontWeight: 600 }}>{e.weekLabel}</div>
<div style={{ color: td, fontSize: 12 }}>{new Date(e.date).toLocaleDateString(“fr-FR”, { day: “numeric”, month: “long” })}</div>
</div>
{avg && <SD value={Math.round(avg)} size={40} />}
</div>
{e.confidences && <div style={{ background: “rgba(255,255,255,0.03)”, borderRadius: 8, padding: 10 }}><div style={{ color: td, fontSize: 11, marginBottom: 4 }}>Confidences</div><p style={{ color: tm, fontSize: 13, lineHeight: 1.6 }}>{e.confidences}</p></div>}
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
const [selected, setSelected] = useState(null);
const [entries, setEntries] = useState([]);
const [messages, setMessages] = useState([]);
const [newMsg, setNewMsg] = useState(””);
const [loading, setLoading] = useState(true);
const [sending, setSending] = useState(false);

useEffect(() => {
const q = query(collection(db, “users”), where(“role”, “==”, “cliente”));
const u = onSnapshot(q, s => { setClients(s.docs.map(d => ({ uid: d.id, …d.data() }))); setLoading(false); });
return u;
}, []);

const select = c => {
setSelected(c); setNewMsg(””);
const q = query(collection(db, “entries”), where(“userUid”, “==”, c.uid), orderBy(“date”, “asc”));
onSnapshot(q, s => setEntries(s.docs.map(d => ({ id: d.id, …d.data() }))));
const q2 = query(collection(db, “messages”), where(“toUid”, “==”, c.uid), orderBy(“date”, “asc”));
onSnapshot(q2, s => setMessages(s.docs.map(d => ({ id: d.id, …d.data() }))));
};

const send = async () => {
if (!newMsg.trim()) return;
setSending(true);
await addDoc(collection(db, “messages”), { toUid: selected.uid, toEmail: selected.email, toPrenom: selected.prenom, text: newMsg.trim(), date: new Date().toISOString() });
setNewMsg(””); setSending(false);
};

if (loading) return <div style={{ color: td, padding: 40, textAlign: “center” }}>Chargement…</div>;

return (
<div style={{ minHeight: “100vh”, background: bg, fontFamily: “sans-serif” }}>
<div style={{ maxWidth: 900, margin: “0 auto”, padding: “28px 20px” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “flex-start”, marginBottom: 28 }}>
<div>
<div style={{ color: wm, fontSize: 11, textTransform: “uppercase”, letterSpacing: 1.5, marginBottom: 4 }}>Espace praticienne</div>
<h1 style={{ fontFamily: “serif”, fontSize: 26, color: tx, fontWeight: 700 }}>Meije - meije.naturo</h1>
</div>
<button onClick={onLogout} style={{ …btn(“ghost”), fontSize: 12, padding: “7px 14px” }}>Deconnexion</button>
</div>
{!selected ? (
<div>
<h2 style={{ color: tx, fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{clients.length === 0 ? “Aucune consultante pour l instant.” : clients.length + “ consultante” + (clients.length > 1 ? “s” : “”)}</h2>
<div style={{ display: “flex”, flexDirection: “column”, gap: 10 }}>
{clients.map(c => (
<button key={c.uid} onClick={() => select(c)} style={{ background: sf, border: “1px solid “ + bd, borderRadius: 12, padding: “16px 20px”, cursor: “pointer”, textAlign: “left”, color: tx, display: “flex”, alignItems: “center”, justifyContent: “space-between” }}>
<div>
<div style={{ fontWeight: 600, fontSize: 15 }}>{c.prenom}</div>
<div style={{ color: td, fontSize: 12 }}>{c.email}</div>
</div>
<span style={{ color: td, fontSize: 20 }}>{”>”}</span>
</button>
))}
</div>
</div>
) : (
<div>
<button onClick={() => setSelected(null)} style={{ …btn(“ghost”), fontSize: 12, padding: “6px 14px”, marginBottom: 20 }}>Retour</button>
<h2 style={{ fontFamily: “serif”, fontSize: 22, color: tx, fontWeight: 700, marginBottom: 4 }}>{selected.prenom}</h2>
<div style={{ color: td, fontSize: 13, marginBottom: 24 }}>{selected.email} - {entries.length} suivi{entries.length > 1 ? “s” : “”}</div>
<h3 style={{ color: tm, fontSize: 12, textTransform: “uppercase”, letterSpacing: 1, marginBottom: 14 }}>Suivis de semaine</h3>
{entries.length === 0
? <div style={{ color: td, background: sf, borderRadius: 12, padding: 20, marginBottom: 20, fontSize: 14 }}>{selected.prenom} n a pas encore rempli de suivi.</div>
: […entries].reverse().map(e => {
const vs = TI.map(i => e.scores && e.scores[i.key]).filter(Boolean);
const avg = vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : null;
return (
<div key={e.id} style={{ background: sf, borderRadius: 12, border: “1px solid “ + bd, padding: 18, marginBottom: 12 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 14 }}>
<div>
<div style={{ color: tx, fontWeight: 600 }}>{e.weekLabel}</div>
<div style={{ color: td, fontSize: 12 }}>{new Date(e.date).toLocaleDateString(“fr-FR”, { day: “numeric”, month: “long”, year: “numeric” })}</div>
</div>
{avg && <SD value={Math.round(avg)} size={40} />}
</div>
{e.humeur_libre && <div style={{ background: “rgba(126,200,160,0.06)”, borderRadius: 8, padding: “10px 14px”, marginBottom: 8 }}><div style={{ color: ac, fontSize: 11, marginBottom: 4 }}>Humeur</div><p style={{ color: tx, fontSize: 14, lineHeight: 1.6 }}>{e.humeur_libre}</p></div>}
{e.confidences && <div style={{ background: “rgba(200,149,108,0.07)”, borderRadius: 8, padding: “10px 14px” }}><div style={{ color: wm, fontSize: 11, marginBottom: 4 }}>Confidences</div><p style={{ color: tx, fontSize: 14, lineHeight: 1.6 }}>{e.confidences}</p></div>}
</div>
);
})
}
<h3 style={{ color: tm, fontSize: 12, textTransform: “uppercase”, letterSpacing: 1, marginBottom: 14, marginTop: 28 }}>Message a {selected.prenom}</h3>
{messages.map(m => (
<div key={m.id} style={{ background: wd, border: “1px solid rgba(200,149,108,0.2)”, borderRadius: 10, padding: “12px 16px”, marginBottom: 8 }}>
<p style={{ color: tx, fontSize: 14, lineHeight: 1.6 }}>{m.text}</p>
<div style={{ color: td, fontSize: 11, marginTop: 6 }}>{new Date(m.date).toLocaleDateString(“fr-FR”, { day: “numeric”, month: “long” })}</div>
</div>
))}
<textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={“Message pour “ + selected.prenom + “…”} rows={3} style={{ …iS, resize: “vertical”, marginBottom: 10 }} />
<button onClick={send} disabled={sending || !newMsg.trim()} style={{ …btn(“warm”), opacity: !newMsg.trim() ? 0.5 : 1 }}>{sending ? “Envoi…” : “Envoyer”}</button>
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
const d = await getDoc(doc(db, “users”, fw.uid));
setUser({ uid: fw.uid, email: fw.email, prenom: d.data() ? d.data().prenom : “”, role: fw.email === PRATICIENNE_EMAIL ? “praticienne” : “cliente” });
} else {
setUser(null);
}
setChecking(false);
});
return u;
}, []);

const logout = async () => { await signOut(auth); setUser(null); };

if (checking) return <div style={{ minHeight: “100vh”, background: “#0c0f0e”, display: “flex”, alignItems: “center”, justifyContent: “center” }}><div style={{ color: “rgba(255,255,255,0.3)”, fontFamily: “sans-serif” }}>Chargement…</div></div>;

return (
<>
<style>{”* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0c0f0e; } button:hover { opacity: 0.88; }”}</style>
{!user ? <Auth onLogin={setUser} /> : user.role === “praticienne” ? <Praticienne user={user} onLogout={logout} /> : <Cliente user={user} onLogout={logout} />}
</>
);
}
