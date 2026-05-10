import { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

const CLOUD_NAME = "di45b4ymc";
const UPLOAD_PRESET = "meije_naturo";

// ─── PALETTE AUTOMNE DOUX — cohérente avec l'espace cliente ──────────────────
const C = {
  bg: "#E8DDD0",
  surface: "#F5EDE2",
  surface2: "#DDD0C0",
  border: "rgba(28,16,8,0.12)",
  border2: "rgba(28,16,8,0.22)",
  text: "#1C1008",
  textMid: "rgba(28,16,8,0.6)",
  textDim: "rgba(28,16,8,0.38)",
  accent: "#8A5A2A",
  accentDim: "rgba(138,90,42,0.12)",
  accentBorder: "rgba(138,90,42,0.25)",
  green: "#5A8A6A",
  greenDim: "rgba(90,138,106,0.15)",
  greenBorder: "rgba(90,138,106,0.3)",
  terra: "#B5583A",
  terraDim: "rgba(181,88,58,0.1)",
  sans: "'DM Sans', sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
};

const iS = {
  width: "100%",
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "12px 14px",
  color: C.text,
  fontFamily: C.sans,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  WebkitAppearance: "none",
};

function Section({ title, number, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentDim, border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{number}</div>
        <h2 style={{ color: C.accent, fontSize: 16, fontWeight: 500, fontFamily: C.serif }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color: C.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6, fontFamily: C.sans }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, rows }) {
  if (rows) return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{ ...iS, resize: "vertical" }} />;
  return <input value={value} onChange={onChange} placeholder={placeholder} style={iS} />;
}

function Scale({ value, onChange, min = 1, max = 10 }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          width: 38, height: 38, borderRadius: "50%",
          border: `2px solid ${value === v ? C.accent : C.border}`,
          background: value === v ? C.accentDim : C.surface,
          color: value === v ? C.accent : C.textDim,
          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: C.sans,
        }}>{v}</button>
      ))}
    </div>
  );
}

function CheckList({ options, value = [], onChange }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(x => x !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map(opt => (
        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.textMid, fontSize: 14, fontFamily: C.sans }}>
          <div onClick={() => toggle(opt)} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${value.includes(opt) ? C.accent : C.border}`, background: value.includes(opt) ? C.accentDim : C.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {value.includes(opt) && <span style={{ color: C.accent, fontSize: 12 }}>✓</span>}
          </div>
          {opt}
        </label>
      ))}
    </div>
  );
}

function RadioList({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map(opt => (
        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.textMid, fontSize: 14, fontFamily: C.sans }}>
          <div onClick={() => onChange(opt)} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${value === opt ? C.accent : C.border}`, background: value === opt ? C.accentDim : C.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {value === opt && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent }} />}
          </div>
          {opt}
        </label>
      ))}
    </div>
  );
}

const THYROIDE_SYMPTOMS = [
  "Marbrures de la peau", "Frilosité", "Extrémités froides, voir Raynaud",
  "Raucité de voix", "Prise de poids ou difficile à gérer", "Fatigue dès le matin",
  "Oedème le matin (yeux, doigts, orteils)", "Température matinale basse",
  "Courbatures musculaires", "Rigidité articulaire le matin (Fibromyalgie)",
  "Peau sèche, talons, coudes et tibias", "Perte de cheveux - ongles fragiles",
  "Cholestérol élevé avec LDL élevés", "Bradypsychie : cerveau au ralenti",
  "Gastroparésie : lourdeur d'estomac après repas",
  "Infections respiratoires ORL à répétition",
  "Migraine réfractaire à tout traitement préventif", "Constipation",
  "Homocystéine élevée", "GOT / GPT élevés", "HTA diastolique",
  "Vit. A basse / bêtacarotène normale", "Moral up and down (dépression)"
];

export default function Anamnese({ user, onDone, readonly, existingData }) {
  if (readonly && existingData) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 20px", fontFamily: C.sans }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={onDone} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "7px 16px", color: C.textMid, cursor: "pointer", fontFamily: C.sans, fontSize: 12 }}>← Retour</button>
            <h1 style={{ fontFamily: C.serif, fontSize: 22, color: C.text, fontWeight: 300 }}>Mon questionnaire de santé</h1>
          </div>
          <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ color: C.green, fontSize: 13 }}>Soumis le {new Date(existingData.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          {existingData.form && Object.entries({
            "Problématique principale": existingData.form.problematique,
            "Durée du problème": existingData.form.dureeProbleme,
            "Objectifs 3 mois": existingData.form.objectifs3mois,
            "Antécédents médicaux": existingData.form.maladiesChroniques,
            "Médicaments": existingData.form.medicaments,
            "Compléments actuels": existingData.form.complementsActuels,
            "Heure coucher": existingData.form.heureCoucher,
            "Heure lever": existingData.form.heureLever,
            "Qualité sommeil": existingData.form.qualiteSommeil && (existingData.form.qualiteSommeil + " /10"),
            "Niveau stress": existingData.form.niveauStress && (existingData.form.niveauStress + " /10"),
            "Sources de stress": existingData.form.sourcesStress,
            "Âge premières règles": existingData.form.ageRegles,
            "Durée cycle": existingData.form.dureeCycle,
            "Intensité douleurs": existingData.form.intensiteDouleurs && (existingData.form.intensiteDouleurs + " /10"),
          }).filter(([_, v]) => v).map(([label, val]) => (
            <div key={label} style={{ display: "flex", gap: 12, background: C.surface, borderRadius: 8, padding: "10px 14px", marginBottom: 6, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.textDim, fontSize: 12, minWidth: 180, flexShrink: 0 }}>{label}</span>
              <span style={{ color: C.textMid, fontSize: 13 }}>{val}</span>
            </div>
          ))}
          {existingData.thyroideScore !== undefined && (
            <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: 14, marginTop: 16 }}>
              <div style={{ color: C.accent, fontWeight: 500 }}>Score thyroïde : {existingData.thyroideScore} / 23</div>
              <div style={{ color: C.textMid, fontSize: 13 }}>{existingData.thyroideInterpretation}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const STORAGE_KEY = "anamnese_" + user.uid;
  const STEP_KEY = "anamnese_step_" + user.uid;
  const [step, setStep] = useState(() => { try { return parseInt(sessionStorage.getItem(STEP_KEY) || "0"); } catch { return 0; } });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [form, setForm] = useState({
    nom: "", dateNaissance: "", age: "", taille: "", poids: "",
    adresse: "", telephone: "", profession: "", situationFamiliale: "",
    problematique: "", dureeProbleme: "", impactVieQuotidienne: "",
    dejaEssaye: "", objectifs3mois: "",
    maladiesChroniques: "", chirurgies: "", hospitalisations: "",
    allergies: "", antecedentsFamiliaux: "",
    medicaments: "", complementsActuels: "", plantes: "", autresTherapies: "",
    suiviMedical: "",
    heureCoucher: "", heureLever: "", nbHeuresSommeil: "",
    qualiteSommeil: null, difficultésSommeil: [], reveil: "",
    energieMatin: null, energieApresMidi: null, energieSoir: null,
    baissesEnergie: "", stimulants: "", autresSommeil: [],
    niveauStress: null, sourcesStress: "", symptomesStress: [],
    humeurGenerale: [], anxiete: "", suiviPsy: [], relaxation: "", activitesRessourcantes: "",
    ageRegles: "", regulariteCycle: [], dureeCycle: "", dureeRegles: "",
    abondanceRegles: "", spm: [], intensiteDouleurs: null, descriptionDouleurs: "",
    contraception: [], dureeContraception: "", menopause: [],
    symptomesHormonaux: [], grossesses: "", accouchements: "", fausseCouches: "",
    problemeFertilite: [], problemesThyroidiens: [],
    symptomesThyroide: [],
    transit: [], frequenceSelles: "", consistanceSelles: [],
    problemesDigestifs: [], momentSymptomes: "", intolerances: [],
    alimentsCauses: "", testsIntolerances: "", antecedentsDigestifs: [], antibiotiques: [],
    foisMalade: "", tempsRecuperation: "", infectionsRecurrentes: [],
    maladiesAutoImmunes: [], inflammations: [], problemesPeau: [], allergiesEnv: [],
    regime: [], dureRegime: "", nbRepas: "", nbCollations: "",
    petitDejeuner: "", petitDejeunerType: "", dejeunerType: "", dinerType: "",
    collationsType: "", dernierRepas: "",
    sucre: null, typesSucres: "", laitier: null, typesLaitiers: "",
    gluten: null, produitsGluten: "", portions_fruits: "", portions_legumes: "",
    proteinesAnimales: [], proteinesVegetales: "", quantiteEau: "",
    autresBoissons: [], habitudesAlimentaires: [], appetit: null, envieFoods: "", contextRepas: [],
    niveauActivite: [], typeSport: "", frequenceSport: "", dureeSport: "",
    intensiteSport: "", heuresAssis: "", apresExercice: [], limitationsPhysiques: "", souhaitSport: [],
    typeHabitation: [], qualiteEnv: [], tempsExterieur: "", heuresEcrans: "",
    expositionPro: [], tabac: [], produitsCosmetiques: [], contenantsPlastique: "",
    vision: [], audition: [], santeDentaire: [], problemesORL: [],
    cardiovasculaire: [], urinaire: [], temperature: [], autresSymptomes: "",
    analysesSanguines: [], dateBilan: "", elementsBilan: "", analysesSpecifiques: [],
    autresExamens: "",
    vision6mois: "", motivation: null, freins: "", attentes: "", pret: [],
    infosSup: "", questions: "",
  });

  const update = (key, val) => {
    setForm(f => {
      const nf = { ...f, [key]: val };
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nf)); } catch {}
      return nf;
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [form, STORAGE_KEY]);

  const thyroideScore = form.symptomesThyroide.length;
  const thyroideInterpretation = thyroideScore <= 5 ? "Risque faible" :
    thyroideScore <= 10 ? "Suspicion d'hypothyroïdie modérée — Bilan thyroïdien recommandé" :
    "Suspicion forte d'hypothyroïdie — Consultation médicale et bilan complet recommandés";

  const uploadFiles = async (files) => {
    setUploadingFiles(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("folder", "meije-naturo/bilans");
      try {
        const isPDF = file.type === "application/pdf"; const endpoint = isPDF ? "raw" : "image"; const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.secure_url) uploaded.push({ url: data.secure_url, name: file.name, type: file.type });
        else console.error("Upload error:", data.error);
      } catch (e) { console.error(e); }
    }
    setUploadedFiles(prev => [...prev, ...uploaded]);
    setUploadingFiles(false);
  };

  const generatePDF = async (data) => {
    // Génération d'un PDF texte via Cloudinary
    const lines = [
      "ANAMNÈSE — " + (data.form?.nom || user.email),
      "Date : " + new Date(data.date).toLocaleDateString("fr-FR"),
      "Email : " + user.email,
      "",
      "=== MOTIF DE CONSULTATION ===",
      "Problématique : " + (data.form?.problematique || "—"),
      "Durée : " + (data.form?.dureeProbleme || "—"),
      "",
      "=== INFORMATIONS GÉNÉRALES ===",
      "Né(e) le : " + (data.form?.dateNaissance || "—"),
      "Taille : " + (data.form?.taille || "—") + " cm",
      "Poids : " + (data.form?.poids || "—") + " kg",
      "Profession : " + (data.form?.profession || "—"),
      "Situation familiale : " + (data.form?.situationFamiliale || "—"),
      "",
      "=== ANTÉCÉDENTS ===",
      "Médicaux : " + (data.form?.antecedentsMedicaux || "—"),
      "Chirurgicaux : " + (data.form?.antecedentsChirurgicaux || "—"),
      "Familiaux : " + (data.form?.antecedentsFamiliaux || "—"),
      "",
      "=== HYGIÈNE DE VIE ===",
      "Alimentation : " + (data.form?.alimentation || "—"),
      "Activité physique : " + (data.form?.activitePhysique || "—"),
      "Sommeil : " + (data.form?.sommeil || "—"),
      "Stress : " + (data.form?.stress || "—"),
      "",
      "=== SCORE THYROÏDE ===",
      "Score : " + (data.thyroideScore || 0) + "/10",
      "Interprétation : " + (data.thyroideInterpretation || "—"),
    ].join("\n");

    // Stocker comme texte dans Firestore (l'IA le lira directement)
    return lines;
  };

  const submit = async () => {
    setSaving(true);
    const docData = {
      userUid: user.uid, userEmail: user.email, userPrenom: user.prénom || user.prenom || "",
      date: new Date().toISOString(), form, thyroideScore, thyroideInterpretation,
      bilans: uploadedFiles,
    };
    const pdfText = await generatePDF({ ...docData, date: new Date().toISOString() });
    await addDoc(collection(db, "anamneses"), { ...docData, pdfText });
    setSaved(true); setSaving(false);
    try { sessionStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(STEP_KEY); } catch {}
    setTimeout(() => onDone(), 2500);
  };

  const STEPS = [
    <div key={0}>
      <Section number="1" title="Informations générales">
        <Field label="Nom et prénom"><TextInput value={form.nom} onChange={e => update("nom", e.target.value)} placeholder="Votre nom complet" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date de naissance"><TextInput value={form.dateNaissance} onChange={e => update("dateNaissance", e.target.value)} placeholder="JJ/MM/AAAA" /></Field>
          <Field label="Âge"><TextInput value={form.age} onChange={e => update("age", e.target.value)} placeholder="Âge" /></Field>
          <Field label="Taille (cm)"><TextInput value={form.taille} onChange={e => update("taille", e.target.value)} placeholder="cm" /></Field>
          <Field label="Poids (kg)"><TextInput value={form.poids} onChange={e => update("poids", e.target.value)} placeholder="kg" /></Field>
        </div>
        <Field label="Adresse complète"><TextInput value={form.adresse} onChange={e => update("adresse", e.target.value)} placeholder="Votre adresse" /></Field>
        <Field label="Téléphone"><TextInput value={form.telephone} onChange={e => update("telephone", e.target.value)} placeholder="Téléphone" /></Field>
        <Field label="Profession / Activité actuelle"><TextInput value={form.profession} onChange={e => update("profession", e.target.value)} placeholder="Votre profession" /></Field>
        <Field label="Situation familiale"><TextInput value={form.situationFamiliale} onChange={e => update("situationFamiliale", e.target.value)} placeholder="Célibataire, en couple, enfants..." /></Field>
      </Section>
      <Section number="2" title="Motif de consultation">
        <Field label="Quelle est votre problématique principale ?"><TextInput value={form.problematique} onChange={e => update("problematique", e.target.value)} placeholder="Décrivez votre problème principal..." rows={3} /></Field>
        <Field label="Depuis combien de temps ?"><TextInput value={form.dureeProbleme} onChange={e => update("dureeProbleme", e.target.value)} placeholder="Durée..." /></Field>
        <Field label="Comment cela impacte-t-il votre vie quotidienne ?"><TextInput value={form.impactVieQuotidienne} onChange={e => update("impactVieQuotidienne", e.target.value)} placeholder="Impact sur votre vie..." rows={3} /></Field>
        <Field label="Qu'avez-vous déjà essayé ?"><TextInput value={form.dejaEssaye} onChange={e => update("dejaEssaye", e.target.value)} placeholder="Traitements, thérapies, changements..." rows={3} /></Field>
        <Field label="Objectifs dans 3 mois ?"><TextInput value={form.objectifs3mois} onChange={e => update("objectifs3mois", e.target.value)} placeholder="Ce que vous aimeriez avoir résolu..." rows={3} /></Field>
      </Section>
    </div>,

    <div key={1}>
      <Section number="3" title="Antécédents médicaux">
        <Field label="Maladies chroniques diagnostiquées"><TextInput value={form.maladiesChroniques} onChange={e => update("maladiesChroniques", e.target.value)} placeholder="Diabète, hypertension, thyroïde..." rows={2} /></Field>
        <Field label="Chirurgies passées"><TextInput value={form.chirurgies} onChange={e => update("chirurgies", e.target.value)} placeholder="Date et type..." rows={2} /></Field>
        <Field label="Hospitalisations importantes"><TextInput value={form.hospitalisations} onChange={e => update("hospitalisations", e.target.value)} placeholder="..." /></Field>
        <Field label="Allergies connues"><TextInput value={form.allergies} onChange={e => update("allergies", e.target.value)} placeholder="Médicaments, aliments, environnementales..." /></Field>
        <Field label="Antécédents familiaux importants"><TextInput value={form.antecedentsFamiliaux} onChange={e => update("antecedentsFamiliaux", e.target.value)} placeholder="Maladies chez parents, frères/sœurs..." rows={2} /></Field>
      </Section>
      <Section number="4" title="Traitements et compléments actuels">
        <Field label="Médicaments actuels (nom, posologie, depuis quand)"><TextInput value={form.medicaments} onChange={e => update("medicaments", e.target.value)} placeholder="..." rows={3} /></Field>
        <Field label="Compléments alimentaires actuels"><TextInput value={form.complementsActuels} onChange={e => update("complementsActuels", e.target.value)} placeholder="..." rows={2} /></Field>
        <Field label="Plantes, tisanes, remèdes naturels"><TextInput value={form.plantes} onChange={e => update("plantes", e.target.value)} placeholder="..." /></Field>
        <Field label="Autres thérapies en cours"><TextInput value={form.autresTherapies} onChange={e => update("autresTherapies", e.target.value)} placeholder="Ostéopathie, psychothérapie, acupuncture..." /></Field>
        <Field label="Suivi médical régulier"><RadioList options={["Oui, médecin généraliste", "Oui, spécialiste", "Non"]} value={form.suiviMedical} onChange={v => update("suiviMedical", v)} /></Field>
      </Section>
    </div>,

    <div key={2}>
      <Section number="5" title="Sommeil et énergie">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Heure de coucher"><TextInput value={form.heureCoucher} onChange={e => update("heureCoucher", e.target.value)} placeholder="22h30..." /></Field>
          <Field label="Heure de lever"><TextInput value={form.heureLever} onChange={e => update("heureLever", e.target.value)} placeholder="7h00..." /></Field>
        </div>
        <Field label="Nombre d'heures de sommeil"><TextInput value={form.nbHeuresSommeil} onChange={e => update("nbHeuresSommeil", e.target.value)} placeholder="7h..." /></Field>
        <Field label="Qualité globale du sommeil (1-10)"><Scale value={form.qualiteSommeil} onChange={v => update("qualiteSommeil", v)} /></Field>
        <Field label="Difficultés liées au sommeil"><CheckList options={["Difficulté d'endormissement (>30 min)", "Réveils nocturnes fréquents", "Réveil trop matinal", "Sommeil léger / non réparateur", "Cauchemars fréquents", "Ronflements / Apnées du sommeil", "Aucune difficulté particulière"]} value={form.difficultésSommeil} onChange={v => update("difficultésSommeil", v)} /></Field>
        <Field label="Comment vous sentez-vous au réveil ?"><RadioList options={["En forme et reposée", "Fatiguée mais ça va", "Épuisée, besoin de beaucoup de temps pour émerger"]} value={form.reveil} onChange={v => update("reveil", v)} /></Field>
        <Field label="Énergie le matin (1-10)"><Scale value={form.energieMatin} onChange={v => update("energieMatin", v)} /></Field>
        <Field label="Énergie l'après-midi vers 14h-16h (1-10)"><Scale value={form.energieApresMidi} onChange={v => update("energieApresMidi", v)} /></Field>
        <Field label="Énergie le soir vers 20h (1-10)"><Scale value={form.energieSoir} onChange={v => update("energieSoir", v)} /></Field>
        <Field label="Baisses d'énergie - quand ?"><TextInput value={form.baissesEnergie} onChange={e => update("baissesEnergie", e.target.value)} placeholder="..." /></Field>
        <Field label="Consommation de stimulants (café, thé...)"><TextInput value={form.stimulants} onChange={e => update("stimulants", e.target.value)} placeholder="Quantité et horaires..." /></Field>
      </Section>
      <Section number="6" title="Stress et santé mentale">
        <Field label="Niveau de stress actuel (1-10)"><Scale value={form.niveauStress} onChange={v => update("niveauStress", v)} /></Field>
        <Field label="Principales sources de stress"><TextInput value={form.sourcesStress} onChange={e => update("sourcesStress", e.target.value)} placeholder="Travail, famille, finances, santé..." rows={2} /></Field>
        <Field label="Symptômes de stress ressentis"><CheckList options={["Tensions musculaires", "Maux de tête fréquents", "Troubles digestifs liés au stress", "Palpitations", "Irritabilité", "Difficultés de concentration", "Ruminations mentales", "Troubles du sommeil", "Aucun symptôme particulier"]} value={form.symptomesStress} onChange={v => update("symptomesStress", v)} /></Field>
        <Field label="Humeur générale"><CheckList options={["Stable et positive", "Variable (hauts et bas)", "Plutôt anxieuse", "Plutôt dépressive", "Irritable", "Apathique"]} value={form.humeurGenerale} onChange={v => update("humeurGenerale", v)} /></Field>
        <Field label="Anxiété, angoisses ou attaques de panique ?"><TextInput value={form.anxiete} onChange={e => update("anxiete", e.target.value)} placeholder="Si oui, dans quelles situations..." rows={2} /></Field>
        <Field label="Techniques de relaxation pratiquées"><TextInput value={form.relaxation} onChange={e => update("relaxation", e.target.value)} placeholder="Méditation, yoga, respiration, sport..." /></Field>
        <Field label="Activités qui vous ressourcent"><TextInput value={form.activitesRessourcantes} onChange={e => update("activitesRessourcantes", e.target.value)} placeholder="..." /></Field>
      </Section>
    </div>,

    <div key={3}>
      <Section number="7" title="Système hormonal">
        <Field label="Âge des premières règles"><TextInput value={form.ageRegles} onChange={e => update("ageRegles", e.target.value)} placeholder="..." /></Field>
        <Field label="Régularité du cycle"><CheckList options={["Cycle régulier (26-32 jours)", "Cycle irrégulier", "Absence de règles (aménorrhée)", "Règles très espacées (>35 jours)", "Règles trop fréquentes (<25 jours)", "Ménopausée"]} value={form.regulariteCycle} onChange={v => update("regulariteCycle", v)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Durée du cycle (jours)"><TextInput value={form.dureeCycle} onChange={e => update("dureeCycle", e.target.value)} placeholder="28 jours..." /></Field>
          <Field label="Durée des règles (jours)"><TextInput value={form.dureeRegles} onChange={e => update("dureeRegles", e.target.value)} placeholder="5 jours..." /></Field>
        </div>
        <Field label="Abondance des règles"><RadioList options={["Légères", "Normales", "Abondantes", "Très abondantes (avec caillots)"]} value={form.abondanceRegles} onChange={v => update("abondanceRegles", v)} /></Field>
        <Field label="Symptômes prémenstruels (SPM)"><CheckList options={["Irritabilité, changements d'humeur", "Anxiété, tristesse", "Fringales (sucre, sel)", "Ballonnements, rétention d'eau", "Seins douloureux ou gonflés", "Fatigue intense", "Maux de tête / Migraines", "Douleurs abdominales", "Acné", "Insomnie", "Aucun symptôme particulier"]} value={form.spm} onChange={v => update("spm", v)} /></Field>
        <Field label="Intensité des douleurs menstruelles (1-10)"><Scale value={form.intensiteDouleurs} onChange={v => update("intensiteDouleurs", v)} /></Field>
        <Field label="Description des douleurs"><TextInput value={form.descriptionDouleurs} onChange={e => update("descriptionDouleurs", e.target.value)} placeholder="Localisation, type, moment..." rows={2} /></Field>
        <Field label="Contraception actuelle"><CheckList options={["Pilule contraceptive", "Stérilet hormonal", "Stérilet au cuivre", "Implant", "Anneau vaginal", "Préservatifs uniquement", "Méthodes naturelles", "Aucune contraception"]} value={form.contraception} onChange={v => update("contraception", v)} /></Field>
        <Field label="Problèmes thyroïdiens diagnostiqués"><CheckList options={["Hypothyroïdie", "Hyperthyroïdie", "Hashimoto", "Nodules thyroïdiens", "Suspicion non diagnostiquée", "Non"]} value={form.problemesThyroidiens} onChange={v => update("problemesThyroidiens", v)} /></Field>
      </Section>
      <Section number="7bis" title="Dépistage hypothyroïdie">
        <p style={{ color: C.textMid, fontSize: 13, marginBottom: 16 }}>Cochez tous les symptômes que vous présentez actuellement :</p>
        <CheckList options={THYROIDE_SYMPTOMS} value={form.symptomesThyroide} onChange={v => update("symptomesThyroide", v)} />
        <div style={{ marginTop: 20, background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: 16 }}>
          <div style={{ color: C.accent, fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Score : {thyroideScore} / 23</div>
          <div style={{ color: C.textMid, fontSize: 13 }}>{thyroideInterpretation}</div>
        </div>
      </Section>
    </div>,

    <div key={4}>
      <Section number="8" title="Système digestif">
        <Field label="Transit intestinal"><CheckList options={["Normal, régulier (1 fois/jour)", "Constipation (moins de 3 fois/semaine)", "Diarrhées fréquentes", "Alternance constipation/diarrhée", "Selles urgentes après les repas"]} value={form.transit} onChange={v => update("transit", v)} /></Field>
        <Field label="Fréquence des selles"><TextInput value={form.frequenceSelles} onChange={e => update("frequenceSelles", e.target.value)} placeholder="X fois par jour / semaine..." /></Field>
        <Field label="Problèmes digestifs ressentis"><CheckList options={["Ballonnements", "Gaz intestinaux importants", "Douleurs / crampes abdominales", "Brûlures d'estomac / Reflux", "Nausées", "Sensation de digestion lente", "Sensation de lourdeur après les repas", "Aucun problème particulier"]} value={form.problemesDigestifs} onChange={v => update("problemesDigestifs", v)} /></Field>
        <Field label="Intolérances ou sensibilités alimentaires"><CheckList options={["Gluten", "Lactose / Produits laitiers", "Oeufs", "Fruits à coque", "FODMAPs", "Histamine", "Aucune connue"]} value={form.intolerances} onChange={v => update("intolerances", v)} /></Field>
        <Field label="Aliments qui causent des problèmes"><TextInput value={form.alimentsCauses} onChange={e => update("alimentsCauses", e.target.value)} placeholder="Lesquels et quels symptômes..." rows={2} /></Field>
      </Section>
      <Section number="9" title="Immunité et inflammation">
        <Field label="Combien de fois par an tombez-vous malade ?"><TextInput value={form.foisMalade} onChange={e => update("foisMalade", e.target.value)} placeholder="..." /></Field>
        <Field label="Infections récurrentes"><CheckList options={["Rhumes / Sinusites fréquentes", "Angines à répétition", "Infections urinaires", "Mycoses", "Herpès labial", "Aucune infection particulière"]} value={form.infectionsRecurrentes} onChange={v => update("infectionsRecurrentes", v)} /></Field>
        <Field label="Inflammations chroniques ou douleurs"><CheckList options={["Douleurs articulaires", "Douleurs musculaires chroniques", "Tendinites récurrentes", "Fibromyalgie", "Gonflement / Raideur matinale", "Aucune douleur particulière"]} value={form.inflammations} onChange={v => update("inflammations", v)} /></Field>
        <Field label="Problèmes de peau"><CheckList options={["Eczéma", "Psoriasis", "Acné", "Rosacée", "Urticaire", "Peau très sèche", "Démangeaisons fréquentes", "Aucun problème cutané"]} value={form.problemesPeau} onChange={v => update("problemesPeau", v)} /></Field>
      </Section>
    </div>,

    <div key={5}>
      <Section number="10" title="Alimentation et hydratation">
        <Field label="Régime alimentaire"><CheckList options={["Omnivore", "Végétarien", "Végétalien / Vegan", "Pescétarien", "Sans gluten", "Sans lactose", "Jeûne intermittent"]} value={form.regime} onChange={v => update("regime", v)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nb repas/jour"><TextInput value={form.nbRepas} onChange={e => update("nbRepas", e.target.value)} placeholder="3..." /></Field>
          <Field label="Nb collations"><TextInput value={form.nbCollations} onChange={e => update("nbCollations", e.target.value)} placeholder="1..." /></Field>
        </div>
        <Field label="Petit-déjeuner type"><TextInput value={form.petitDejeunerType} onChange={e => update("petitDejeunerType", e.target.value)} placeholder="Ce que vous mangez habituellement..." /></Field>
        <Field label="Déjeuner type"><TextInput value={form.dejeunerType} onChange={e => update("dejeunerType", e.target.value)} placeholder="..." /></Field>
        <Field label="Dîner type"><TextInput value={form.dinerType} onChange={e => update("dinerType", e.target.value)} placeholder="..." /></Field>
        <Field label="Quantité d'eau par jour"><TextInput value={form.quantiteEau} onChange={e => update("quantiteEau", e.target.value)} placeholder="1.5L..." /></Field>
        <Field label="Autres boissons"><CheckList options={["Café", "Thé", "Tisanes", "Jus de fruits", "Sodas / Boissons sucrées", "Alcool", "Eau uniquement"]} value={form.autresBoissons} onChange={v => update("autresBoissons", v)} /></Field>
        <Field label="Appétit général (1-10)"><Scale value={form.appetit} onChange={v => update("appetit", v)} /></Field>
      </Section>
      <Section number="11" title="Activité physique">
        <Field label="Niveau d'activité physique actuel"><RadioList options={["Sédentaire", "Légèrement actif (marche occasionnelle)", "Modérément actif (sport 2-3 fois/semaine)", "Très actif (sport 4-5 fois/semaine)"]} value={form.niveauActivite[0]} onChange={v => update("niveauActivite", [v])} /></Field>
        <Field label="Type(s) d'activité physique"><TextInput value={form.typeSport} onChange={e => update("typeSport", e.target.value)} placeholder="Marche, yoga, musculation..." /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Fréquence/semaine"><TextInput value={form.frequenceSport} onChange={e => update("frequenceSport", e.target.value)} placeholder="3 fois..." /></Field>
          <Field label="Durée des séances"><TextInput value={form.dureeSport} onChange={e => update("dureeSport", e.target.value)} placeholder="45 min..." /></Field>
        </div>
        <Field label="Limitations physiques ou douleurs"><TextInput value={form.limitationsPhysiques} onChange={e => update("limitationsPhysiques", e.target.value)} placeholder="..." /></Field>
      </Section>
    </div>,

    <div key={6}>
      <Section number="12" title="Environnement et hygiène de vie">
        <Field label="Type d'habitation"><RadioList options={["Appartement en ville", "Maison en ville", "Maison à la campagne"]} value={form.typeHabitation[0]} onChange={v => update("typeHabitation", [v])} /></Field>
        <Field label="Heures d'écrans par jour"><TextInput value={form.heuresEcrans} onChange={e => update("heuresEcrans", e.target.value)} placeholder="..." /></Field>
        <Field label="Tabac"><RadioList options={["Non-fumeur", "Fumeur actif", "Ex-fumeur", "Tabagisme passif"]} value={form.tabac[0]} onChange={v => update("tabac", [v])} /></Field>
        <Field label="Produits cosmétiques utilisés"><CheckList options={["Cosmétiques conventionnels", "Cosmétiques bio/naturels", "Produits ménagers chimiques", "Produits ménagers écologiques"]} value={form.produitsCosmetiques} onChange={v => update("produitsCosmetiques", v)} /></Field>
      </Section>

      <Section number="13" title="Examens et analyses">
        <Field label="Analyses sanguines récentes ?"><RadioList options={["Oui, je les uploade ci-dessous", "Oui, mais ne peux pas les joindre maintenant", "Non, pas d'analyse récente"]} value={form.analysesSanguines[0]} onChange={v => update("analysesSanguines", [v])} /></Field>
        <Field label="Date du dernier bilan sanguin"><TextInput value={form.dateBilan} onChange={e => update("dateBilan", e.target.value)} placeholder="MM/AAAA..." /></Field>
        <Field label="Éléments remarquables dans vos analyses"><TextInput value={form.elementsBilan} onChange={e => update("elementsBilan", e.target.value)} placeholder="Carences, anomalies..." rows={2} /></Field>
        <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: 16 }}>
          <p style={{ color: C.green, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Uploader vos bilans sanguins</p>
          <p style={{ color: C.textMid, fontSize: 12, marginBottom: 10 }}>Photos ou PDF acceptés · Max 10 MB · Si trop lourd → ilovepdf.com</p>
          <input type="file" multiple accept="image/*,application/pdf" onChange={e => uploadFiles(Array.from(e.target.files))} style={{ color: C.textMid, fontSize: 13, display: "block" }} />
          {uploadingFiles && <p style={{ color: C.green, fontSize: 13, marginTop: 8 }}>Upload en cours…</p>}
          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{ background: C.surface, borderRadius: 8, padding: "8px 12px", color: C.textMid, fontSize: 12, display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ color: C.green }}>✓</span> {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section number="14" title="Vision et motivation">
        <Field label="Comment vous voyez-vous dans 6 mois ?"><TextInput value={form.vision6mois} onChange={e => update("vision6mois", e.target.value)} placeholder="..." rows={3} /></Field>
        <Field label="Motivation à changer vos habitudes (1-10)"><Scale value={form.motivation} onChange={v => update("motivation", v)} /></Field>
        <Field label="Ce qui pourrait vous freiner"><TextInput value={form.freins} onChange={e => update("freins", e.target.value)} placeholder="..." rows={2} /></Field>
        <Field label="Ce que vous attendez de Meije"><TextInput value={form.attentes} onChange={e => update("attentes", e.target.value)} placeholder="..." rows={2} /></Field>
      </Section>

      <Section number="15" title="Informations supplémentaires">
        <Field label="Y a-t-il autre chose d'important que je devrais savoir ?"><TextInput value={form.infosSup} onChange={e => update("infosSup", e.target.value)} placeholder="..." rows={4} /></Field>
        <Field label="Avez-vous des questions avant notre consultation ?"><TextInput value={form.questions} onChange={e => update("questions", e.target.value)} placeholder="..." rows={3} /></Field>
      </Section>

      {saved
        ? <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: 20, textAlign: "center", color: C.green, fontWeight: 500, fontFamily: C.sans }}>Questionnaire envoyé à Meije ! Merci 🌿</div>
        : <button onClick={submit} disabled={saving} style={{ width: "100%", padding: "14px", borderRadius: 30, border: "none", background: C.accent, color: "#FAF4EC", fontWeight: 500, fontSize: 15, cursor: "pointer", fontFamily: C.sans, boxShadow: "0 4px 14px rgba(138,90,42,0.25)" }}>
          {saving ? "Envoi en cours…" : "Envoyer mon questionnaire à Meije 🌿"}
        </button>
      }
    </div>
  ];

  const STEP_LABELS = ["Identité & Motif", "Antécédents & Traitements", "Sommeil & Stress", "Hormones & Thyroïde", "Digestion & Immunité", "Alimentation & Sport", "Environnement & Bilan"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 20px 100px", fontFamily: C.sans }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: C.accent, fontSize: 10, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>meije.naturo</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <button onClick={onDone} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "7px 16px", color: C.textMid, cursor: "pointer", fontFamily: C.sans, fontSize: 12 }}>← Retour</button>
            <h1 style={{ fontFamily: C.serif, fontSize: 24, color: C.text, fontWeight: 300 }}>Questionnaire de santé</h1>
          </div>
          <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.6 }}>Merci de remplir ce questionnaire avant notre rendez-vous. Vos réponses restent strictement confidentielles.</p>
          <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: "8px 14px", marginTop: 10, color: C.green, fontSize: 12 }}>Vos réponses sont sauvegardées automatiquement.</div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, overflowX: "auto" }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} onClick={() => i < step && setStep(i)} style={{ flex: 1, minWidth: 60, textAlign: "center", cursor: i < step ? "pointer" : "default" }}>
              <div style={{ height: 4, borderRadius: 2, background: i <= step ? C.accent : C.border, marginBottom: 4, transition: "all 0.3s" }} />
              <div style={{ fontSize: 9, color: i === step ? C.accent : C.textDim }}>{label}</div>
            </div>
          ))}
        </div>

        {STEPS[step]}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          {step > 0
            ? <button onClick={() => { setStep(s => { const ns = s - 1; try { sessionStorage.setItem(STEP_KEY, ns); } catch {} return ns; }); window.scrollTo(0, 0); }} style={{ padding: "10px 20px", borderRadius: 30, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, cursor: "pointer", fontFamily: C.sans, fontSize: 14 }}>← Précédent</button>
            : <div />
          }
          {step < STEPS.length - 1
            ? <button onClick={() => { setStep(s => { const ns = s + 1; try { sessionStorage.setItem(STEP_KEY, ns); } catch {} return ns; }); window.scrollTo(0, 0); }} style={{ padding: "10px 24px", borderRadius: 30, border: "none", background: C.accent, color: "#FAF4EC", cursor: "pointer", fontFamily: C.sans, fontWeight: 500, fontSize: 14, boxShadow: "0 3px 10px rgba(138,90,42,0.25)" }}>Suivant →</button>
            : null
          }
        </div>
      </div>
    </div>
  );
}
