import { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

const CLOUD_NAME = "di45b4ymc";
const UPLOAD_PRESET = "meije_naturo";

const C = {
  bg: "#0c0f0e", sf: "rgba(255,255,255,0.04)", bd: "rgba(255,255,255,0.08)",
  ac: "#7EC8A0", ad: "rgba(126,200,160,0.15)", ab: "rgba(126,200,160,0.3)",
  wm: "#C8956C", wd: "rgba(200,149,108,0.12)",
  tx: "rgba(255,255,255,0.88)", tm: "rgba(255,255,255,0.45)", td: "rgba(255,255,255,0.22)",
};

const iS = { width: "100%", background: C.sf, border: "1px solid " + C.bd, borderRadius: 10, padding: "11px 14px", color: C.tx, fontFamily: "sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };

function Section({ title, number, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.ad, border: "1px solid " + C.ab, display: "flex", alignItems: "center", justifyContent: "center", color: C.ac, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{number}</div>
        <h2 style={{ color: C.ac, fontSize: 16, fontWeight: 700, fontFamily: "serif" }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color: C.td, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>{label}</label>
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
        <button key={v} onClick={() => onChange(v)} style={{ width: 38, height: 38, borderRadius: "50%", border: "2px solid " + (value === v ? C.ac : C.bd), background: value === v ? C.ad : "transparent", color: value === v ? C.ac : C.td, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "sans-serif" }}>{v}</button>
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
        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.tm, fontSize: 14 }}>
          <div onClick={() => toggle(opt)} style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (value.includes(opt) ? C.ac : C.bd), background: value.includes(opt) ? C.ad : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {value.includes(opt) && <span style={{ color: C.ac, fontSize: 12 }}>✓</span>}
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
        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.tm, fontSize: 14 }}>
          <div onClick={() => onChange(opt)} style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid " + (value === opt ? C.ac : C.bd), background: value === opt ? C.ad : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {value === opt && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.ac }} />}
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
      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 20px", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={onDone} style={{ background: "none", border: "1px solid " + C.bd, borderRadius: 8, padding: "6px 14px", color: C.tm, cursor: "pointer", fontFamily: "sans-serif", fontSize: 12 }}>Retour</button>
            <h1 style={{ fontFamily: "serif", fontSize: 22, color: C.tx, fontWeight: 700 }}>Mon questionnaire de sante</h1>
          </div>
          <div style={{ background: C.ad, border: "1px solid " + C.ab, borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ color: C.ac, fontSize: 13 }}>Soumis le {new Date(existingData.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          {existingData.form && Object.entries({
            "Problematique principale": existingData.form.problematique,
            "Duree du probleme": existingData.form.dureeProbleme,
            "Objectifs 3 mois": existingData.form.objectifs3mois,
            "Antecedents medicaux": existingData.form.maladiesChroniques,
            "Medicaments": existingData.form.medicaments,
            "Complements actuels": existingData.form.complementsActuels,
            "Heure coucher": existingData.form.heureCoucher,
            "Heure lever": existingData.form.heureLever,
            "Qualite sommeil": existingData.form.qualiteSommeil && (existingData.form.qualiteSommeil + " /10"),
            "Niveau stress": existingData.form.niveauStress && (existingData.form.niveauStress + " /10"),
            "Sources de stress": existingData.form.sourcesStress,
            "Age premieres regles": existingData.form.ageRegles,
            "Duree cycle": existingData.form.dureeCycle,
            "Intensite douleurs": existingData.form.intensiteDouleurs && (existingData.form.intensiteDouleurs + " /10"),
          }).filter(([_, v]) => v).map(([label, val]) => (
            <div key={label} style={{ display: "flex", gap: 12, background: C.sf, borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
              <span style={{ color: C.td, fontSize: 12, minWidth: 160, flexShrink: 0 }}>{label}</span>
              <span style={{ color: C.tm, fontSize: 13 }}>{val}</span>
            </div>
          ))}
          {existingData.thyroideScore !== undefined && (
            <div style={{ background: C.ad, border: "1px solid " + C.ab, borderRadius: 12, padding: 14, marginTop: 16 }}>
              <div style={{ color: C.ac, fontWeight: 700 }}>Score thyroide : {existingData.thyroideScore} / 23</div>
              <div style={{ color: C.tm, fontSize: 13 }}>{existingData.thyroideInterpretation}</div>
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
    // Section 1
    nom: "", dateNaissance: "", age: "", taille: "", poids: "",
    adresse: "", telephone: "", profession: "", situationFamiliale: "",
    // Section 2
    problematique: "", dureeProbleme: "", impactVieQuotidienne: "",
    dejaEssaye: "", objectifs3mois: "",
    // Section 3
    maladiesChroniques: "", chirurgies: "", hospitalisations: "",
    allergies: "", antecedentsFamiliaux: "",
    // Section 4
    medicaments: "", complementsActuels: "", plantes: "", autresTherapies: "",
    suiviMedical: "",
    // Section 5
    heureCoucher: "", heureLever: "", nbHeuresSommeil: "",
    qualiteSommeil: null, difficultésSommeil: [], reveil: "",
    energieMatin: null, energieApresMidi: null, energieSoir: null,
    baissesEnergie: "", stimulants: "", autresSommeil: [],
    // Section 6
    niveauStress: null, sourcesStress: "", symptomesStress: [],
    humeurGenerale: [], anxiete: "", suiviPsy: [], relaxation: "", activitesRessourcantes: "",
    // Section 7
    ageRegles: "", regulariteCycle: [], dureeCycle: "", dureeRegles: "",
    abondanceRegles: "", spm: [], intensiteDouleurs: null, descriptionDouleurs: "",
    contraception: [], dureeContraception: "", menopause: [],
    symptomesHormonaux: [], grossesses: "", accouchements: "", fausseCouches: "",
    problemeFertilite: [], problemesThyroidiens: [],
    // Section 7bis
    symptomesThyroide: [],
    // Section 8
    transit: [], frequenceSelles: "", consistanceSelles: [],
    problemesDigestifs: [], momentSymptomes: "", intolerances: [],
    alimentsCauses: "", testsIntolerances: "", antecedentsDigestifs: [], antibiotiques: [],
    // Section 9
    foisMalade: "", tempsRecuperation: "", infectionsRecurrentes: [],
    maladiesAutoImmunes: [], inflammations: [], problemesPeau: [], allergiesEnv: [],
    // Section 10
    regime: [], dureRegime: "", nbRepas: "", nbCollations: "",
    petitDejeuner: "", petitDejeunerType: "", dejeunerType: "", dinerType: "",
    collationsType: "", dernierRepas: "",
    sucre: null, typesSucres: "", laitier: null, typesLaitiers: "",
    gluten: null, produitsGluten: "", portions_fruits: "", portions_legumes: "",
    proteinesAnimales: [], proteinesVegetales: "", quantiteEau: "",
    autresBoissons: [], habitudesAlimentaires: [], appetit: null, envieFoods: "", contextRepas: [],
    // Section 11
    niveauActivite: [], typeSport: "", frequenceSport: "", dureeSport: "",
    intensiteSport: "", heuresAssis: "", apresExercice: [], limitationsPhysiques: "", souhaitSport: [],
    // Section 12
    typeHabitation: [], qualiteEnv: [], tempsExterieur: "", heuresEcrans: "",
    expositionPro: [], tabac: [], produitsCosmetiques: [], contenantsPlastique: "",
    // Section 13
    vision: [], audition: [], santeDentaire: [], problemesORL: [],
    cardiovasculaire: [], urinaire: [], temperature: [], autresSymptomes: "",
    // Section 14
    analysesSanguines: [], dateBilan: "", elementsBilan: "", analysesSpecifiques: [],
    autresExamens: "",
    // Section 15
    vision6mois: "", motivation: null, freins: "", attentes: "", pret: [],
    // Section 16
    infosSup: "", questions: "",
  });

  const update = (key, val) => { setForm(f => { const nf = { ...f, [key]: val }; try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nf)); } catch {} return nf; }); };

  // Sauvegarde automatique toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [form, STORAGE_KEY]);

  const thyroideScore = form.symptomesThyroide.length;
  const thyroideInterpretation = thyroideScore <= 5 ? "Risque faible" :
    thyroideScore <= 10 ? "Suspicion d hypothyroïdie modérée - Bilan thyroïdien recommandé" :
    "Suspicion forte d hypothyroïdie - Consultation médicale et bilan complet recommandés";

  const uploadFiles = async (files) => {
    setUploadingFiles(true);
    const uploaded = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "meije-naturo/bilans");
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) uploaded.push({ url: data.secure_url, name: file.name, type: file.type });
      } catch (e) { console.error(e); }
    }
    setUploadedFiles(prev => [...prev, ...uploaded]);
    setUploadingFiles(false);
  };

  const submit = async () => {
    setSaving(true);
    await addDoc(collection(db, "anamneses"), {
      userUid: user.uid,
      userEmail: user.email,
      userPrenom: user.prenom,
      date: new Date().toISOString(),
      form,
      thyroideScore,
      thyroideInterpretation,
      bilans: uploadedFiles,
    });
    setSaved(true);
    setSaving(false);
    try { sessionStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(STEP_KEY); } catch {}
    setTimeout(() => onDone(), 2000);
  };

  const STEPS = [
    // Step 0: Sections 1-2
    <div key={0}>
      <Section number="1" title="Informations générales">
        <Field label="Nom et prénom"><TextInput value={form.nom} onChange={e => update("nom", e.target.value)} placeholder="Votre nom complet" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date de naissance"><TextInput value={form.dateNaissance} onChange={e => update("dateNaissance", e.target.value)} placeholder="JJ/MM/AAAA" /></Field>
          <Field label="Âge"><TextInput value={form.age} onChange={e => update("age", e.target.value)} placeholder="Âge" /></Field>
          <Field label="Taille"><TextInput value={form.taille} onChange={e => update("taille", e.target.value)} placeholder="cm" /></Field>
          <Field label="Poids"><TextInput value={form.poids} onChange={e => update("poids", e.target.value)} placeholder="kg" /></Field>
        </div>
        <Field label="Adresse complète"><TextInput value={form.adresse} onChange={e => update("adresse", e.target.value)} placeholder="Votre adresse" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Téléphone"><TextInput value={form.telephone} onChange={e => update("telephone", e.target.value)} placeholder="Téléphone" /></Field>
        </div>
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

    // Step 1: Sections 3-4
    <div key={1}>
      <Section number="3" title="Antécédents médicaux">
        <Field label="Maladies chroniques diagnostiquées"><TextInput value={form.maladiesChroniques} onChange={e => update("maladiesChroniques", e.target.value)} placeholder="Diabète, hypertension, thyroïde, auto-immunes..." rows={2} /></Field>
        <Field label="Chirurgies passées (date et type)"><TextInput value={form.chirurgies} onChange={e => update("chirurgies", e.target.value)} placeholder="..." rows={2} /></Field>
        <Field label="Hospitalisations importantes"><TextInput value={form.hospitalisations} onChange={e => update("hospitalisations", e.target.value)} placeholder="..." /></Field>
        <Field label="Allergies connues"><TextInput value={form.allergies} onChange={e => update("allergies", e.target.value)} placeholder="Médicaments, aliments, environnementales..." /></Field>
        <Field label="Antécédents familiaux importants"><TextInput value={form.antecedentsFamiliaux} onChange={e => update("antecedentsFamiliaux", e.target.value)} placeholder="Maladies chez parents, frères/sœurs..." rows={2} /></Field>
      </Section>
      <Section number="4" title="Traitements et compléments actuels">
        <Field label="Médicaments actuels (nom, posologie, depuis quand)"><TextInput value={form.medicaments} onChange={e => update("medicaments", e.target.value)} placeholder="..." rows={3} /></Field>
        <Field label="Compléments alimentaires actuels"><TextInput value={form.complementsActuels} onChange={e => update("complementsActuels", e.target.value)} placeholder="..." rows={2} /></Field>
        <Field label="Plantes, tisanes, remèdes naturels"><TextInput value={form.plantes} onChange={e => update("plantes", e.target.value)} placeholder="..." /></Field>
        <Field label="Autres thérapies en cours"><TextInput value={form.autresTherapies} onChange={e => update("autresTherapies", e.target.value)} placeholder="Ostéopathie, psychothérapie, acupuncture..." /></Field>
        <Field label="Suivi médical régulier">
          <RadioList options={["Oui, médecin généraliste", "Oui, spécialiste", "Non"]} value={form.suiviMedical} onChange={v => update("suiviMedical", v)} />
        </Field>
      </Section>
    </div>,

    // Step 2: Sections 5-6
    <div key={2}>
      <Section number="5" title="Sommeil et énergie">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Heure de coucher"><TextInput value={form.heureCoucher} onChange={e => update("heureCoucher", e.target.value)} placeholder="22h30..." /></Field>
          <Field label="Heure de lever"><TextInput value={form.heureLever} onChange={e => update("heureLever", e.target.value)} placeholder="7h00..." /></Field>
        </div>
        <Field label="Nombre d'heures de sommeil"><TextInput value={form.nbHeuresSommeil} onChange={e => update("nbHeuresSommeil", e.target.value)} placeholder="7h..." /></Field>
        <Field label="Qualité globale du sommeil (1-10)"><Scale value={form.qualiteSommeil} onChange={v => update("qualiteSommeil", v)} /></Field>
        <Field label="Difficultés liées au sommeil">
          <CheckList options={["Difficulté d'endormissement (>30 min)", "Réveils nocturnes fréquents", "Réveil trop matinal", "Sommeil léger / non réparateur", "Cauchemars fréquents", "Ronflements / Apnées du sommeil", "Aucune difficulté particulière"]} value={form.difficultésSommeil} onChange={v => update("difficultésSommeil", v)} />
        </Field>
        <Field label="Comment vous sentez-vous au réveil ?">
          <RadioList options={["En forme et reposée", "Fatiguée mais ça va", "Épuisée, besoin de beaucoup de temps pour émerger"]} value={form.reveil} onChange={v => update("reveil", v)} />
        </Field>
        <Field label="Énergie le matin (1-10)"><Scale value={form.energieMatin} onChange={v => update("energieMatin", v)} /></Field>
        <Field label="Énergie l'après-midi vers 14h-16h (1-10)"><Scale value={form.energieApresMidi} onChange={v => update("energieApresMidi", v)} /></Field>
        <Field label="Énergie le soir vers 20h (1-10)"><Scale value={form.energieSoir} onChange={v => update("energieSoir", v)} /></Field>
        <Field label="Baisses d'énergie - quand ?"><TextInput value={form.baissesEnergie} onChange={e => update("baissesEnergie", e.target.value)} placeholder="..." /></Field>
        <Field label="Consommation de stimulants (café, thé, énergie)"><TextInput value={form.stimulants} onChange={e => update("stimulants", e.target.value)} placeholder="Quantité et horaires..." /></Field>
        <Field label="Autres symptômes">
          <CheckList options={["Besoin de faire des siestes", "Difficulté à me concentrer par fatigue", "Épuisement après un effort léger", "Aucun de ces symptômes"]} value={form.autresSommeil} onChange={v => update("autresSommeil", v)} />
        </Field>
      </Section>
      <Section number="6" title="Stress et santé mentale">
        <Field label="Niveau de stress actuel (1-10)"><Scale value={form.niveauStress} onChange={v => update("niveauStress", v)} /></Field>
        <Field label="Principales sources de stress"><TextInput value={form.sourcesStress} onChange={e => update("sourcesStress", e.target.value)} placeholder="Travail, famille, finances, santé..." rows={2} /></Field>
        <Field label="Symptômes de stress ressentis">
          <CheckList options={["Tensions musculaires (nuque, épaules, mâchoire)", "Maux de tête fréquents", "Troubles digestifs liés au stress", "Palpitations / Oppression thoracique", "Irritabilité, impatience", "Difficultés de concentration", "Ruminations mentales", "Troubles du sommeil", "Aucun symptôme particulier"]} value={form.symptomesStress} onChange={v => update("symptomesStress", v)} />
        </Field>
        <Field label="Humeur générale">
          <CheckList options={["Stable et positive", "Variable (hauts et bas)", "Plutôt anxieuse", "Plutôt dépressive / tristesse", "Irritable", "Apathique / manque de motivation"]} value={form.humeurGenerale} onChange={v => update("humeurGenerale", v)} />
        </Field>
        <Field label="Anxiété, angoisses ou attaques de panique ?"><TextInput value={form.anxiete} onChange={e => update("anxiete", e.target.value)} placeholder="Si oui, dans quelles situations..." rows={2} /></Field>
        <Field label="Déjà suivi(e) pour">
          <CheckList options={["Anxiété", "Dépression", "Burn-out", "Troubles de l'attention (TDAH)", "Non, jamais"]} value={form.suiviPsy} onChange={v => update("suiviPsy", v)} />
        </Field>
        <Field label="Techniques de relaxation pratiquées"><TextInput value={form.relaxation} onChange={e => update("relaxation", e.target.value)} placeholder="Méditation, yoga, respiration, sport..." /></Field>
        <Field label="Activités qui vous ressourcent"><TextInput value={form.activitesRessourcantes} onChange={e => update("activitesRessourcantes", e.target.value)} placeholder="..." /></Field>
      </Section>
    </div>,

    // Step 3: Sections 7-7bis
    <div key={3}>
      <Section number="7" title="Système hormonal">
        <Field label="Âge des premières règles"><TextInput value={form.ageRegles} onChange={e => update("ageRegles", e.target.value)} placeholder="..." /></Field>
        <Field label="Régularité du cycle">
          <CheckList options={["Cycle régulier (26-32 jours)", "Cycle irrégulier", "Absence de règles (aménorrhée)", "Règles très espacées (>35 jours)", "Règles trop fréquentes (<25 jours)", "Ménopausée"]} value={form.regulariteCycle} onChange={v => update("regulariteCycle", v)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Durée du cycle (jours)"><TextInput value={form.dureeCycle} onChange={e => update("dureeCycle", e.target.value)} placeholder="28 jours..." /></Field>
          <Field label="Durée des règles (jours)"><TextInput value={form.dureeRegles} onChange={e => update("dureeRegles", e.target.value)} placeholder="5 jours..." /></Field>
        </div>
        <Field label="Abondance des règles">
          <RadioList options={["Légères", "Normales", "Abondantes", "Très abondantes (avec caillots)"]} value={form.abondanceRegles} onChange={v => update("abondanceRegles", v)} />
        </Field>
        <Field label="Symptômes prémenstruels (SPM)">
          <CheckList options={["Irritabilité, changements d'humeur", "Anxiété, tristesse", "Fringales (sucre, sel)", "Ballonnements, rétention d'eau", "Seins douloureux ou gonflés", "Fatigue intense", "Maux de tête / Migraines", "Douleurs abdominales", "Acné", "Insomnie", "Aucun symptôme particulier"]} value={form.spm} onChange={v => update("spm", v)} />
        </Field>
        <Field label="Intensité des douleurs menstruelles (1-10)"><Scale value={form.intensiteDouleurs} onChange={v => update("intensiteDouleurs", v)} /></Field>
        <Field label="Description des douleurs"><TextInput value={form.descriptionDouleurs} onChange={e => update("descriptionDouleurs", e.target.value)} placeholder="Localisation, type, moment..." rows={2} /></Field>
        <Field label="Contraception actuelle">
          <CheckList options={["Pilule contraceptive", "Stérilet hormonal", "Stérilet au cuivre", "Implant", "Anneau vaginal", "Préservatifs uniquement", "Méthodes naturelles", "Aucune contraception"]} value={form.contraception} onChange={v => update("contraception", v)} />
        </Field>
        <Field label="Depuis combien de temps cette contraception ?"><TextInput value={form.dureeContraception} onChange={e => update("dureeContraception", e.target.value)} placeholder="..." /></Field>
        <Field label="Périménopause / Ménopause">
          <CheckList options={["Périménopause", "Ménopause", "Ni l'une ni l'autre"]} value={form.menopause} onChange={v => update("menopause", v)} />
        </Field>
        <Field label="Symptômes hormonaux observés">
          <CheckList options={["Acné (visage, dos, poitrine)", "Pilosité excessive (visage, corps)", "Chute de cheveux", "Peau très sèche ou très grasse", "Bouffées de chaleur", "Sueurs nocturnes", "Sécheresse vaginale", "Baisse de libido", "Prise de poids", "Seins fibrokystiques", "Aucun de ces symptômes"]} value={form.symptomesHormonaux} onChange={v => update("symptomesHormonaux", v)} />
        </Field>
        <Field label="Grossesses (nombre et dates)"><TextInput value={form.grossesses} onChange={e => update("grossesses", e.target.value)} placeholder="..." /></Field>
        <Field label="Accouchements (nombre et type)"><TextInput value={form.accouchements} onChange={e => update("accouchements", e.target.value)} placeholder="Voie basse / césarienne..." /></Field>
        <Field label="Fausses couches ou IVG"><TextInput value={form.fausseCouches} onChange={e => update("fausseCouches", e.target.value)} placeholder="..." /></Field>
        <Field label="Problèmes de fertilité">
          <CheckList options={["Difficulté à concevoir", "SOPK diagnostiqué", "Endométriose", "Non"]} value={form.problemeFertilite} onChange={v => update("problemeFertilite", v)} />
        </Field>
        <Field label="Problèmes thyroïdiens diagnostiqués">
          <CheckList options={["Hypothyroïdie", "Hyperthyroïdie", "Hashimoto", "Nodules thyroïdiens", "Suspicion non diagnostiquée", "Non"]} value={form.problemesThyroidiens} onChange={v => update("problemesThyroidiens", v)} />
        </Field>
      </Section>

      <Section number="7bis" title="Dépistage hypothyroïdie">
        <p style={{ color: C.tm, fontSize: 13, marginBottom: 16 }}>Cochez tous les symptômes que vous présentez actuellement :</p>
        <CheckList options={THYROIDE_SYMPTOMS} value={form.symptomesThyroide} onChange={v => update("symptomesThyroide", v)} />
        <div style={{ marginTop: 20, background: C.ad, border: "1px solid " + C.ab, borderRadius: 12, padding: 16 }}>
          <div style={{ color: C.ac, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Score : {thyroideScore} / 23</div>
          <div style={{ color: C.tm, fontSize: 13 }}>{thyroideInterpretation}</div>
        </div>
      </Section>
    </div>,

    // Step 4: Sections 8-9
    <div key={4}>
      <Section number="8" title="Système digestif">
        <Field label="Transit intestinal">
          <CheckList options={["Normal, régulier (1 fois/jour)", "Constipation (moins de 3 fois/semaine)", "Diarrhées fréquentes", "Alternance constipation/diarrhée", "Selles urgentes après les repas"]} value={form.transit} onChange={v => update("transit", v)} />
        </Field>
        <Field label="Fréquence des selles"><TextInput value={form.frequenceSelles} onChange={e => update("frequenceSelles", e.target.value)} placeholder="X fois par jour / semaine..." /></Field>
        <Field label="Consistance des selles">
          <CheckList options={["Type 1-2 : Dures, difficiles à évacuer", "Type 3-4 : Normales, bien formées", "Type 5-6 : Molles, pâteuses", "Type 7 : Liquides"]} value={form.consistanceSelles} onChange={v => update("consistanceSelles", v)} />
        </Field>
        <Field label="Problèmes digestifs ressentis">
          <CheckList options={["Ballonnements", "Gaz intestinaux importants", "Douleurs / crampes abdominales", "Brûlures d'estomac / Reflux", "Nausées", "Sensation de digestion lente", "Sensation de lourdeur après les repas", "Éructations fréquentes", "Aucun problème particulier"]} value={form.problemesDigestifs} onChange={v => update("problemesDigestifs", v)} />
        </Field>
        <Field label="Moment des symptômes digestifs"><TextInput value={form.momentSymptomes} onChange={e => update("momentSymptomes", e.target.value)} placeholder="Matin, après repas..." /></Field>
        <Field label="Intolérances ou sensibilités alimentaires">
          <CheckList options={["Gluten", "Lactose / Produits laitiers", "Oeufs", "Fruits à coque", "FODMAPs", "Histamine", "Aucune connue"]} value={form.intolerances} onChange={v => update("intolerances", v)} />
        </Field>
        <Field label="Aliments qui causent des problèmes"><TextInput value={form.alimentsCauses} onChange={e => update("alimentsCauses", e.target.value)} placeholder="Lesquels et quels symptômes..." rows={2} /></Field>
        <Field label="Tests d'intolérances faits ?"><TextInput value={form.testsIntolerances} onChange={e => update("testsIntolerances", e.target.value)} placeholder="Si oui, résultats..." /></Field>
        <Field label="Antécédents digestifs">
          <CheckList options={["Côlon irritable / SII", "Maladie de Crohn ou RCH", "SIBO", "Candidose intestinale", "Ulcère gastrique", "Calculs biliaires", "Aucun"]} value={form.antecedentsDigestifs} onChange={v => update("antecedentsDigestifs", v)} />
        </Field>
        <Field label="Antibiotiques récemment ?">
          <RadioList options={["Oui, dans les 3 derniers mois", "Oui, dans les 6-12 derniers mois", "Non"]} value={form.antibiotiques[0]} onChange={v => update("antibiotiques", [v])} />
        </Field>
      </Section>
      <Section number="9" title="Immunité et inflammation">
        <Field label="Combien de fois par an tombez-vous malade ?"><TextInput value={form.foisMalade} onChange={e => update("foisMalade", e.target.value)} placeholder="..." /></Field>
        <Field label="Temps de récupération d'une infection"><TextInput value={form.tempsRecuperation} onChange={e => update("tempsRecuperation", e.target.value)} placeholder="..." /></Field>
        <Field label="Infections récurrentes">
          <CheckList options={["Rhumes / Sinusites fréquentes", "Angines à répétition", "Infections urinaires", "Mycoses (vaginales, cutanées)", "Herpès labial", "Infections ORL", "Aucune infection particulière"]} value={form.infectionsRecurrentes} onChange={v => update("infectionsRecurrentes", v)} />
        </Field>
        <Field label="Maladies auto-immunes">
          <CheckList options={["Hashimoto", "Polyarthrite rhumatoïde", "Lupus", "Maladie de Crohn", "Psoriasis", "Vitiligo", "Aucune"]} value={form.maladiesAutoImmunes} onChange={v => update("maladiesAutoImmunes", v)} />
        </Field>
        <Field label="Inflammations chroniques ou douleurs">
          <CheckList options={["Douleurs articulaires", "Douleurs musculaires chroniques", "Tendinites récurrentes", "Fibromyalgie", "Gonflement / Raideur matinale", "Aucune douleur particulière"]} value={form.inflammations} onChange={v => update("inflammations", v)} />
        </Field>
        <Field label="Problèmes de peau">
          <CheckList options={["Eczéma", "Psoriasis", "Acné", "Rosacée", "Urticaire", "Peau très sèche", "Démangeaisons fréquentes", "Cicatrisation lente", "Aucun problème cutané"]} value={form.problemesPeau} onChange={v => update("problemesPeau", v)} />
        </Field>
        <Field label="Allergies environnementales">
          <CheckList options={["Pollens / Rhume des foins", "Acariens", "Animaux", "Médicaments", "Produits cosmétiques", "Aucune allergie connue"]} value={form.allergiesEnv} onChange={v => update("allergiesEnv", v)} />
        </Field>
      </Section>
    </div>,

    // Step 5: Sections 10-11
    <div key={5}>
      <Section number="10" title="Alimentation et hydratation">
        <Field label="Régime alimentaire">
          <CheckList options={["Omnivore", "Végétarien", "Végétalien / Vegan", "Pescétarien", "Sans gluten", "Sans lactose", "Paléo", "Cétogène", "Jeûne intermittent"]} value={form.regime} onChange={v => update("regime", v)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nb repas/jour"><TextInput value={form.nbRepas} onChange={e => update("nbRepas", e.target.value)} placeholder="3..." /></Field>
          <Field label="Nb collations"><TextInput value={form.nbCollations} onChange={e => update("nbCollations", e.target.value)} placeholder="1..." /></Field>
        </div>
        <Field label="Prenez-vous un petit-déjeuner ?">
          <RadioList options={["Oui, tous les jours", "Parfois", "Rarement", "Jamais"]} value={form.petitDejeuner} onChange={v => update("petitDejeuner", v)} />
        </Field>
        <Field label="Petit-déjeuner type"><TextInput value={form.petitDejeunerType} onChange={e => update("petitDejeunerType", e.target.value)} placeholder="Ce que vous mangez habituellement..." /></Field>
        <Field label="Déjeuner type"><TextInput value={form.dejeunerType} onChange={e => update("dejeunerType", e.target.value)} placeholder="..." /></Field>
        <Field label="Dîner type"><TextInput value={form.dinerType} onChange={e => update("dinerType", e.target.value)} placeholder="..." /></Field>
        <Field label="Collations habituelles"><TextInput value={form.collationsType} onChange={e => update("collationsType", e.target.value)} placeholder="..." /></Field>
        <Field label="Heure du dernier repas"><TextInput value={form.dernierRepas} onChange={e => update("dernierRepas", e.target.value)} placeholder="21h00..." /></Field>
        <Field label="Consommation de sucre (1-10)"><Scale value={form.sucre} onChange={v => update("sucre", v)} /></Field>
        <Field label="Types de sucres consommés"><TextInput value={form.typesSucres} onChange={e => update("typesSucres", e.target.value)} placeholder="Sucre blanc, miel, pâtisseries, sodas..." /></Field>
        <Field label="Consommation de laitiers (1-10)"><Scale value={form.laitier} onChange={v => update("laitier", v)} /></Field>
        <Field label="Consommation de gluten (1-10)"><Scale value={form.gluten} onChange={v => update("gluten", v)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Portions de fruits/jour"><TextInput value={form.portions_fruits} onChange={e => update("portions_fruits", e.target.value)} placeholder="2..." /></Field>
          <Field label="Portions de légumes/jour"><TextInput value={form.portions_legumes} onChange={e => update("portions_legumes", e.target.value)} placeholder="3..." /></Field>
        </div>
        <Field label="Protéines animales">
          <CheckList options={["Viande rouge", "Volaille", "Poisson", "Oeufs", "Fruits de mer", "Aucune protéine animale"]} value={form.proteinesAnimales} onChange={v => update("proteinesAnimales", v)} />
        </Field>
        <Field label="Protéines végétales"><TextInput value={form.proteinesVegetales} onChange={e => update("proteinesVegetales", e.target.value)} placeholder="Légumineuses, tofu, tempeh..." /></Field>
        <Field label="Quantité d'eau par jour"><TextInput value={form.quantiteEau} onChange={e => update("quantiteEau", e.target.value)} placeholder="1.5L..." /></Field>
        <Field label="Autres boissons">
          <CheckList options={["Café", "Thé", "Tisanes", "Jus de fruits", "Sodas / Boissons sucrées", "Boissons énergisantes", "Alcool", "Eau uniquement"]} value={form.autresBoissons} onChange={v => update("autresBoissons", v)} />
        </Field>
        <Field label="Habitudes alimentaires">
          <CheckList options={["Je mange rapidement", "Je mange devant un écran", "Je grignote entre les repas", "J'ai des fringales", "Je saute des repas régulièrement", "Je mange tard le soir", "Je mange mes émotions"]} value={form.habitudesAlimentaires} onChange={v => update("habitudesAlimentaires", v)} />
        </Field>
        <Field label="Appétit général (1-10)"><Scale value={form.appetit} onChange={v => update("appetit", v)} /></Field>
        <Field label="Aliments consommés en excès"><TextInput value={form.envieFoods} onChange={e => update("envieFoods", e.target.value)} placeholder="..." /></Field>
      </Section>
      <Section number="11" title="Activité physique">
        <Field label="Niveau d'activité physique actuel">
          <RadioList options={["Sédentaire (peu ou pas d'activité)", "Légèrement actif (marche occasionnelle)", "Modérément actif (sport 2-3 fois/semaine)", "Très actif (sport 4-5 fois/semaine)", "Extrêmement actif (sport intense quotidien)"]} value={form.niveauActivite[0]} onChange={v => update("niveauActivite", [v])} />
        </Field>
        <Field label="Type(s) d'activité physique"><TextInput value={form.typeSport} onChange={e => update("typeSport", e.target.value)} placeholder="Marche, yoga, musculation..." /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Fréquence/semaine"><TextInput value={form.frequenceSport} onChange={e => update("frequenceSport", e.target.value)} placeholder="3 fois..." /></Field>
          <Field label="Durée des séances"><TextInput value={form.dureeSport} onChange={e => update("dureeSport", e.target.value)} placeholder="45 min..." /></Field>
        </div>
        <Field label="Heures assis par jour"><TextInput value={form.heuresAssis} onChange={e => update("heuresAssis", e.target.value)} placeholder="8h..." /></Field>
        <Field label="Après une activité physique, vous vous sentez">
          <RadioList options={["Énergisée et bien", "Normalement fatiguée mais récupère rapidement", "Très fatiguée, récupération difficile", "Épuisée pendant plusieurs jours"]} value={form.apresExercice[0]} onChange={v => update("apresExercice", [v])} />
        </Field>
        <Field label="Limitations physiques ou douleurs"><TextInput value={form.limitationsPhysiques} onChange={e => update("limitationsPhysiques", e.target.value)} placeholder="..." /></Field>
      </Section>
    </div>,

    // Step 6: Sections 12-16 + upload
    <div key={6}>
      <Section number="12" title="Environnement et hygiène de vie">
        <Field label="Type d'habitation">
          <RadioList options={["Appartement en ville", "Maison en ville", "Maison à la campagne"]} value={form.typeHabitation[0]} onChange={v => update("typeHabitation", [v])} />
        </Field>
        <Field label="Qualité de l'environnement">
          <CheckList options={["Exposition au bruit", "Pollution atmosphérique", "Moisissures dans le logement", "Humidité excessive", "Mauvaise ventilation", "Aucun problème particulier"]} value={form.qualiteEnv} onChange={v => update("qualiteEnv", v)} />
        </Field>
        <Field label="Temps à l'extérieur par jour"><TextInput value={form.tempsExterieur} onChange={e => update("tempsExterieur", e.target.value)} placeholder="..." /></Field>
        <Field label="Heures d'écrans par jour"><TextInput value={form.heuresEcrans} onChange={e => update("heuresEcrans", e.target.value)} placeholder="..." /></Field>
        <Field label="Tabac">
          <RadioList options={["Non-fumeur", "Fumeur actif", "Ex-fumeur", "Tabagisme passif"]} value={form.tabac[0]} onChange={v => update("tabac", [v])} />
        </Field>
        <Field label="Produits cosmétiques utilisés">
          <CheckList options={["Cosmétiques conventionnels", "Cosmétiques bio/naturels", "Produits ménagers chimiques", "Produits ménagers écologiques", "Teintures capillaires régulières"]} value={form.produitsCosmetiques} onChange={v => update("produitsCosmetiques", v)} />
        </Field>
      </Section>

      <Section number="13" title="Autres systèmes et symptômes">
        <Field label="Vision">
          <CheckList options={["Bonne vision", "Port de lunettes/lentilles", "Fatigue oculaire", "Sécheresse oculaire"]} value={form.vision} onChange={v => update("vision", v)} />
        </Field>
        <Field label="Santé bucco-dentaire">
          <CheckList options={["Bonne santé dentaire", "Problèmes de gencives", "Caries fréquentes", "Bruxisme", "Aphtes récurrents"]} value={form.santeDentaire} onChange={v => update("santeDentaire", v)} />
        </Field>
        <Field label="Système cardiovasculaire">
          <CheckList options={["Palpitations", "Essoufflement à l'effort", "Douleurs thoraciques", "Hypertension", "Hypotension", "Jambes lourdes", "Mains/pieds froids", "Aucun problème"]} value={form.cardiovasculaire} onChange={v => update("cardiovasculaire", v)} />
        </Field>
        <Field label="Température corporelle">
          <CheckList options={["Frileuse (mains/pieds froids)", "Sensation de chaleur excessive", "Transpiration excessive", "Sueurs nocturnes", "Température normale"]} value={form.temperature} onChange={v => update("temperature", v)} />
        </Field>
        <Field label="Autres symptômes non mentionnés"><TextInput value={form.autresSymptomes} onChange={e => update("autresSymptomes", e.target.value)} placeholder="..." rows={3} /></Field>
      </Section>

      <Section number="14" title="Examens et analyses">
        <Field label="Analyses sanguines récentes ?">
          <RadioList options={["Oui, je les uploade ci-dessous", "Oui, mais ne peux pas les joindre maintenant", "Non, pas d'analyse récente"]} value={form.analysesSanguines[0]} onChange={v => update("analysesSanguines", [v])} />
        </Field>
        <Field label="Date du dernier bilan sanguin"><TextInput value={form.dateBilan} onChange={e => update("dateBilan", e.target.value)} placeholder="MM/AAAA..." /></Field>
        <Field label="Éléments remarquables dans vos analyses"><TextInput value={form.elementsBilan} onChange={e => update("elementsBilan", e.target.value)} placeholder="Carences, anomalies..." rows={2} /></Field>
        <Field label="Analyses spécifiques déjà faites">
          <CheckList options={["Bilan hormonal complet", "Analyse des selles (microbiote)", "Test d'intolérances alimentaires", "Dosage de la vitamine D", "Dosage du fer et ferritine", "Bilan thyroïdien complet", "Glycémie / HbA1c", "Profil lipidique"]} value={form.analysesSpecifiques} onChange={v => update("analysesSpecifiques", v)} />
        </Field>

        {/* Upload bilans */}
        <div style={{ background: C.ad, border: "1px solid " + C.ab, borderRadius: 12, padding: 16 }}>
          <div style={{ color: C.ac, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Uploader vos bilans sanguins</div>
          <p style={{ color: C.tm, fontSize: 12, marginBottom: 12 }}>Photos ou PDF acceptés</p>
          <input type="file" multiple accept="image/*,application/pdf" onChange={e => uploadFiles(Array.from(e.target.files))} style={{ color: C.tm, fontSize: 13 }} />
          {uploadingFiles && <div style={{ color: C.ac, fontSize: 13, marginTop: 8 }}>Upload en cours...</div>}
          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", color: C.tm, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.ac }}>✓</span> {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section number="15" title="Vision et motivation">
        <Field label="Comment vous voyez-vous dans 6 mois ?"><TextInput value={form.vision6mois} onChange={e => update("vision6mois", e.target.value)} placeholder="..." rows={3} /></Field>
        <Field label="Motivation à changer vos habitudes (1-10)"><Scale value={form.motivation} onChange={v => update("motivation", v)} /></Field>
        <Field label="Ce qui pourrait vous freiner"><TextInput value={form.freins} onChange={e => update("freins", e.target.value)} placeholder="..." rows={2} /></Field>
        <Field label="Ce que vous attendez de moi"><TextInput value={form.attentes} onChange={e => update("attentes", e.target.value)} placeholder="..." rows={2} /></Field>
        <Field label="Êtes-vous prête à">
          <CheckList options={["Modifier votre alimentation", "Intégrer des compléments alimentaires", "Changer certaines habitudes de vie", "Prendre du temps pour vous", "Investir dans votre santé", "Être patiente (les changements prennent du temps)"]} value={form.pret} onChange={v => update("pret", v)} />
        </Field>
      </Section>

      <Section number="16" title="Informations supplémentaires">
        <Field label="Y a-t-il autre chose d'important que je devrais savoir ?"><TextInput value={form.infosSup} onChange={e => update("infosSup", e.target.value)} placeholder="..." rows={4} /></Field>
        <Field label="Avez-vous des questions avant notre consultation ?"><TextInput value={form.questions} onChange={e => update("questions", e.target.value)} placeholder="..." rows={3} /></Field>
      </Section>

      {saved
        ? <div style={{ background: C.ad, border: "1px solid " + C.ab, borderRadius: 12, padding: 20, textAlign: "center", color: C.ac, fontWeight: 700 }}>Questionnaire envoyé à Meije ! Merci.</div>
        : <button onClick={submit} disabled={saving} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: C.ac, color: "#0c0f0e", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "sans-serif" }}>
          {saving ? "Envoi en cours..." : "Envoyer mon questionnaire à Meije"}
        </button>
      }
    </div>
  ];

  const STEP_LABELS = ["Identité & Motif", "Antécédents & Traitements", "Sommeil & Stress", "Hormones & Thyroïde", "Digestion & Immunité", "Alimentation & Sport", "Environnement & Bilan"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: C.ac, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>meije.naturo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <button onClick={onDone} style={{ background: "none", border: "1px solid " + C.bd, borderRadius: 8, padding: "6px 14px", color: C.tm, cursor: "pointer", fontFamily: "sans-serif", fontSize: 12 }}>Retour</button>
            <h1 style={{ fontFamily: "serif", fontSize: 24, color: C.tx, fontWeight: 700 }}>Questionnaire de sante</h1>
          </div>
          <p style={{ color: C.tm, fontSize: 13 }}>Merci de remplir ce questionnaire avant notre rendez-vous. Vos reponses restent strictement confidentielles.</p>
          <div style={{ background: C.sf, borderRadius: 8, padding: "8px 14px", marginTop: 10, color: C.ac, fontSize: 12 }}>Vos reponses sont sauvegardees automatiquement. Vous pouvez revenir plus tard sans perdre vos donnees.</div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, overflowX: "auto" }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} onClick={() => i < step && setStep(i)} style={{ flex: 1, minWidth: 60, textAlign: "center", cursor: i < step ? "pointer" : "default" }}>
              <div style={{ height: 4, borderRadius: 2, background: i <= step ? C.ac : C.sf, marginBottom: 4, transition: "all 0.3s" }} />
              <div style={{ fontSize: 9, color: i === step ? C.ac : C.td }}>{label}</div>
            </div>
          ))}
        </div>

        {STEPS[step]}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: "1px solid " + C.bd }}>
          {step > 0
            ? <button onClick={() => { setStep(s => { const ns = s - 1; try { sessionStorage.setItem(STEP_KEY, ns); } catch {} return ns; }); window.scrollTo(0,0); }} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid " + C.bd, background: C.sf, color: C.tm, cursor: "pointer", fontFamily: "sans-serif", fontSize: 14 }}>Precedent</button>
            : <div />
          }
          {step < STEPS.length - 1
            ? <button onClick={() => { setStep(s => { const ns = s + 1; try { sessionStorage.setItem(STEP_KEY, ns); } catch {} return ns; }); window.scrollTo(0,0); }} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: C.ac, color: "#0c0f0e", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600, fontSize: 14 }}>Suivant</button>
            : null
          }
        </div>
      </div>
    </div>
  );
}
