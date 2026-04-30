import{useState,useEffect}from"react";
import{createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged,sendPasswordResetEmail}from"firebase/auth";
import{collection,addDoc,doc,setDoc,getDoc,query,orderBy,where,onSnapshot}from"firebase/firestore";
import{auth,db}from"./firebase";
const PE="lamenaturo@gmail.com";
const TI=[{key:"complements",label:"Compléments",icon:"💊",question:"Tu as pris tes compléments ?"},{key:"sommeil",label:"Sommeil",icon:"🌙",question:"Comment tu as dormi ?"},{key:"cycle",label:"Cycle",icon:"🌸",question:"Où en es-tu dans ton cycle ?"},{key:"digestion",label:"Digestion",icon:"🌿",question:"Comment était ta digestion ?"},{key:"energie",label:"Énergie",icon:"⚡",question:"Ton niveau d'énergie ?"},{key:"douleurs",label:"Douleurs",icon:"🔥",question:"Des douleurs ?"},{key:"humeur",label:"Humeur",icon:"🌊",question:"Comment tu te sens ?"},{key:"alimentation",label:"Alimentation",icon:"🥗",question:"Tu as mangé comment ?"}];
const SC=[{v:1,label:"Pas top",color:"#C4614A"},{v:2,label:"Difficile",color:"#D4906A"},{v:3,label:"Moyen",color:"#C8B86A"},{v:4,label:"Bien",color:"#7BAF8C"},{v:5,label:"Super",color:"#5BA08A"}];
const C={bg:"#0c0f0e",sf:"rgba(255,255,255,0.04)",bd:"rgba(255,255,255,0.08)",ac:"#7EC8A0",ad:"rgba(126,200,160,0.15)",ab:"rgba(126,200,160,0.3)",wm:"#C8956C",wd:"rgba(200,149,108,0.12)",tx:"rgba(255,255,255,0.88)",tm:"rgba(255,255,255,0.45)",td:"rgba(255,255,255,0.22)"};
const iS={width:"100%",background:C.sf,border:`1px solid ${C.bd}`,borderRadius:10,padding:"11px 14px",color:C.tx,fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box"};
const bn=(v="primary")=>({padding:"11px 22px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,background:v==="primary"?C.ac:v==="warm"?C.wm:C.sf,color:v==="ghost"?C.tm:"#0c0f0e"});
function SD({value,size=36}){const s=SC.find(x=>x.v===value);return <div style={{width:size,height:size,borderRadius:"50%",background:s?s.color:C.sf,display:"flex",alignItems:"center",justifyContent:"center",color:s?"#0c0f0e":C.td,fontWeight:800,fontSize:size*0.38,flexShrink:0}}>{value||"–"}</div>}
function Auth({onLogin}){
const[mode,setMode]=useState("login");
const[email,setEmail]=useState("");
const[password,setPassword]=useState("");
const[prenom,setPrenom]=useState("");
const[error,setError]=useState("");
const[loading,setLoading]=useState(false);
const[resetSent,setResetSent]=useState(false);
const login=async()=>{setError("");setLoading(true);try{const c=await signInWithEmailAndPassword(auth,email,password);const d=await getDoc(doc(db,"users",c.user.uid));onLogin({uid:c.user.uid,email,prenom:d.data()?.prenom||"",role:email===PE?"praticienne":"cliente"});}catch{setError("Email ou mot de passe incorrect.");}setLoading(false);};
const register=async()=>{setError("");setLoading(true);if(!email||!password||!prenom){setError("Remplis tous les champs.");setLoading(false);return;}try{const c=await createUserWithEmailAndPassword(auth,email,password);await setDoc(doc(db,"users",c.user.uid),{prenom,email,role:"cliente",createdAt:new Date().toISOString()});onLogin({uid:c.user.uid,email,prenom,role:"cliente"});}catch(e){if(e.code==="auth/email-already-in-use")setError("Compte déjà existant.");else if(e.code==="auth/weak-password")setError("Mot de passe trop court (6 min).");else setError("Erreur création compte.");}setLoading(false);};
const reset=async()=>{if(!email){setError("Entre ton email d'abord.");return;}setError("");setLoading(true);try{await sendPasswordResetEmail(auth,email);setResetSent(true);}catch{setError("Email introuvable.");}setLoading(false);};
return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:`radial-gradient(ellipse at 30% 20%,rgba(126,200,160,0.07) 0%,transparent 55%),${C.bg}`}}><div style={{width:"100%",maxWidth:400}}><div style={{textAlign:"center",marginBottom:36}}><div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:40,height:40,borderRadius:12,background:C.ad,border:`1px solid ${C.ab}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌿</div><span style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,color:C.tx,fontWeight:700}}>meije.naturo</span></div><p style={{color:C.td,fontSize:13}}>Ton espace de suivi personnalisé</p></div><div style={{background:C.sf,borderRadius:16,border:`1px solid ${C.bd}`,padding:28}}><div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:3,marginBottom:24}}>{["login","register"].map(m=><button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,background:mode===m?C.ac:"transparent",color:mode===m?"#0c0f0e":C.tm}}>{m==="login"?"Se connecter":"Créer un compte"}</button>)}</div><div style={{display:"flex",flexDirection:"column",gap:12}}>{mode==="register"&&<div><label style={{color:C.td,fontSize:11,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5}}>Prénom</label><input value={prenom} onChange={e=>setPrenom(e.target.value)} placeholder="Ton prénom" style={iS}/></div>}<div><label style={{color:C.td,fontSize:11​​​​​​​​​​​​​​​​
function Cliente({user,onLogout}){
const[entries,setEntries]=useState([]);
const[messages,setMessages]=useState([]);
const[view,setView]=useState("home");
const[form,setForm]=useState({scores:{},humeur:"",confidences:""});
const[saved,setSaved]=useState(false);
const[loading,setLoading]=useState(true);
useEffect(()=>{const q=query(collection(db,"entries"),where("userUid","==",user.uid),orderBy("date","asc"));const u=onSnapshot(q,s=>{setEntries(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);});const q2=query(collection(db,"messages"),where("toUid","==",user.uid),orderBy("date","asc"));const u2=onSnapshot(q2,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))));return()=>{u();u2();};},[user.uid]);
const wk=()=>{const n=new Date();const s=new Date(n);s.setDate(n.getDate()-n.getDay()+1);return`Semaine du ${s.getDate()} ${["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"][s.getMonth()]}`;};
const submit=async()=>{await addDoc(collection(db,"entries"),{userUid:user.uid,userEmail:user.email,userPrenom:user.prenom,weekLabel:wk(),date:new Date().toISOString(),scores:form.scores,humeur_libre:form.humeur,confidences:form.confidences});setForm({scores:{},humeur:"",confidences:""});setSaved(true);setTimeout(()=>{setSaved(false);setView("home");},1800);};
const lm=messages[messages.length-1];
if(loading)return <div style={{color:C.td,padding:40,textAlign:"center"}}>Chargement...</div>;
return(<div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 0%,rgba(126,200,160,0.06) 0%,transparent 55%),${C.bg}`,padding:"28px 20px",fontFamily:"'DM Sans',sans-serif"}}><div style={{maxWidth:600,margin:"0 auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}><div><div style={{color:C.ac,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>meije.naturo</div><h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,color:C.tx,fontWeight:700}}>Bonjour {user.prenom} 🌿</h1></div><button onClick={onLogout} style={{...bn("ghost"),fontSize:12,padding:"7px 14px"}}>Dé​​​​​​​​​​​​​​​​
function Praticienne({user,onLogout}){
const[clients,setClients]=useState([]);
const[selected,setSelected]=useState(null);
const[entries,setEntries]=useState([]);
const[messages,setMessages]=useState([]);
const[newMsg,setNewMsg]=useState("");
const[loading,setLoading]=useState(true);
const[sending,setSending]=useState(false);
useEffect(()=>{const q=query(collection(db,"users"),where("role","==","cliente"));const u=onSnapshot(q,s=>{setClients(s.docs.map(d=>({uid:d.id,...d.data()})));setLoading(false);});return u;},[]);
const select=c=>{setSelected(c);setNewMsg("");const q=query(collection(db,"entries"),where("userUid","==",c.uid),orderBy("date","asc"));onSnapshot(q,s=>setEntries(s.docs.map(d=>({id:d.id,...d.data()}))));const q2=query(collection(db,"messages"),where("toUid","==",c.uid),orderBy("date","asc"));onSnapshot(q2,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))));};
const send=async()=>{if(!newMsg.trim())return;setSending(true);await addDoc(collection(db,"messages"),{toUid:selected.uid,toEmail:selected.email,toPrenom:selected.prenom,text:newMsg.trim(),date:new Date().toISOString()});setNewMsg("");setSending(false);};
if(loading)return <div style={{color:C.td,padding:40,textAlign:"center"}}>Chargement...</div>;
return(<div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 80% 10%,rgba(200,149,108,0.07) 0%,transparent 50%),${C.bg}`,fontFamily:"'DM Sans',sans-serif"}}><div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}><div><div style={{color:C.wm,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Espace praticienne</div><h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,color:C.tx,fontWeight:700}}>Meije · meije.naturo</h1></div><button onClick={onLogout} style={{...bn("ghost"),fontSize:12,padding:"7px 14px"}}>Déconnexion</button></div>{!selected?<><h2 style={{color:C.tx,fontSize:16,fontWeight:600,marginBottom:16}}>{clients.length===0?"Aucune consultante pour l'instant.":`${clients.length} consultante${clients.length>1?"s":""}`}</h2><div style={{display:"flex",flexDirection:"column",gap:10}}>{clients.map(c=><button key={c.uid} onClick={​​​​​​​​​​​​​​​​
export default function App(){
const[user,setUser]=useState(null);
const[checking,setChecking]=useState(true);
useEffect(()=>{const u=onAuthStateChanged(auth,async fw=>{if(fw){const d=await getDoc(doc(db,"users",fw.uid));setUser({uid:fw.uid,email:fw.email,prenom:d.data()?.prenom||"",role:fw.email===PE?"praticienne":"cliente"});}else setUser(null);setChecking(false);});return u;},[]);
const logout=async()=>{await signOut(auth);setUser(null);};
if(checking)return <div style={{minHeight:"100vh",background:"#0c0f0e",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"rgba(255,255,255,0.3)",fontFamily:"'DM Sans',sans-serif"}}>Chargement...</div></div>;
return(<><style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#0c0f0e;}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2);}input:focus,textarea:focus{border-color:rgba(126,200,160,0.4)!important;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(126,200,160,0.2);border-radius:2px;}button:hover{opacity:0.88;}`}</style>{!user?<Auth onLogin={setUser}/>:user.role==="praticienne"?<Praticienne user={user} onLogout={logout}/>:<Cliente user={user} onLogout={logout}/>}</>);}
