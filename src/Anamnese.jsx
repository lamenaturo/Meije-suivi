import { useState, useEffect } from "react";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// ─── PALETTE CLIENTE ─────────────────────────────────────────────────────────
const C = {
  bg: "#E8DDD0", surface: "#F5EDE2", surface2: "#DDD0C0",
  border: "rgba(139,100,60,0.15)", border2: "rgba(139,100,60,0.25)",
  text: "#1C1008", textMid: "rgba(28,16,8,0.65)", textDim: "rgba(28,16,8,0.38)",
  terra: "#B5583A", terraDim: "rgba(181,88,58,0.1)", terraBorder: "rgba(181,88,58,0.25)",
  accent: "#8A5A2A", accentDim: "rgba(138,90,42,0.1)",
  sage: "#4A7A5A", sageDim: "rgba(74,122,90,0.12)",
};

// ─── ÉTAPES ──────────────────────────────────────────────────────────────────
const ETAPES = [
  { num: 1, label: "Infos générales & Motif" },
  { num: 2, label: "Antécédents & Traitements" },
  { num: 3, label: "Sommeil & Énergie" },
  { num: 4, label: "Stress & Santé mentale" },
  { num: 5, label: "Hormones & Cycle" },
  { num: 6, label: "Digestion & Immunité" },
  { num: 7, label: "Alimentation & Hydratation" },
  { num: 8, label: "Activité physique & Environnement" },
  { num: 9, label: "Autres systèmes & Examens" },
  { num: 10, label: "Motivation & Conclusion" },
];

// ─── ÉTAT INITIAL ─────────────────────────────────────────────────────────────
const initForm = () => ({
  // Étape 1 — Infos générales
  profession: "", situationFamiliale: "",
  // Motif
  pourquoiNaturo: "", problematique: "", dureeProbleme: "", impactVieQuotidienne: "",
  dejaTente: "", objectifs3mois: "",
  // Étape 2 — Antécédents
  maladiesChroniques: "", chirurgies: "", hospitalisations: "",
  allergiesConnues: "", antecedentsFamiliaux: "",
  // Traitements
  medicaments: "", complementsActuels: "", plantesRemedes: "",
  autresTherapies: "", suiviMedical: [],
  // Étape 3 — Sommeil
  heureCoucher: "", heureLever: "", nbreHeuresSommeil: "",
  qualiteSommeil: "", difficulteSommeil: [],
  etatReveil: "", energieMatin: "", energieApresMidi: "", energieSoir: "",
  baisseEnergieMoment: "", consommationStimulants: "", symptomesFatigue: [],
  // Étape 4 — Stress
  niveauStress: "", sourceStress: "", symptomesStress: [],
  humeurGenerale: [], anxieteAngoisses: "", suiviPsy: [],
  techniquesRelaxation: "", activitesRessourcantes: "",
  // Étape 5 — Hormones
  agePremieresRegles: "", regulariteCycle: [], dureeCycle: "",
  dureeRegles: "", abondanceRegles: "", symptomesSPM: [],
  intensiteDouleurs: "", descriptionDouleurs: "",
  contraception: [], dureeContraception: "",
  perimenopause: "", symptomesHormonaux: [],
  grossesses: "", accouchements: "", faussesCouches: "",
  problemeFertilite: [], problemesThyroidiens: [],
  // Étape 6 — Digestion
  transit: [], frequenceSelles: "", consistanceSelles: [],
  problemesDigestifs: [], momentSymptomesDigestifs: "",
  intolerancesAlimentaires: [], alimentsProblematiques: "",
  testsIntolerances: "", antecedentsDigestifs: [], antibiotiquesRecents: [],
  // Immunité
  nbFoisMaladeAn: "", dureeRecuperationInfection: "",
  infectionsRecurrentes: [], maladiesAutoImmunes: [],
  inflammationsChroniques: [], problemesPeau: [], allergies: [],
  // Étape 7 — Alimentation
  regimeAlimentaire: [], dureeRegime: "",
  nbRepasJour: "", nbCollations: "", petitDejeuner: "",
  petitDejType: "", dejeunerType: "", dinerType: "", collationsType: "",
  heureDernierRepas: "",
  consommationSucre: "", typesSucres: "",
  consommationLaitiers: "", typesLaitiers: "",
  consommationGluten: "", produitsGluten: "",
  portionsFruits: "", portionsLegumes: "",
  proteinesAnimales: [], proteinesVegetales: "",
  quantiteEau: "", autresBoissons: [],
  habitudesAlimentaires: [], niveauAppetit: "",
  enviesAliments: "", contextRepas: [],
  // Étape 8 — Activité physique
  niveauActivite: "", typesActivite: "",
  frequenceActivite: "", dureeSeance: "", intensiteActivite: "",
  heuresAssis: "", ressentiApresActivite: [],
  limitationsPhysiques: "", souhaitActivite: [],
  // Environnement
  typeHabitation: [], qualiteEnvironnement: [],
  tempsExterieur: "", heuresEcrans: "",
  expositionPro: [], tabac: [],
  produitsQuotidiens: [], plastiqueAliments: "",
  // Étape 9 — Autres systèmes
  vision: [], audition: [], santeBuccoDentaire: [],
  problemesORL: [], systemCardioVasculaire: [],
  systemeUrinaire: [], temperatureCorporelle: [],
  autresSymptomes: "",
  // Examens
  analysesSanguinesRecentes: "", dateLastBilan: "",
  elementsRemarquables: "", analysesSpecifiques: [],
  autresExamens: "",
  // Étape 10 — Motivation
  visionDans6Mois: "", motivationChangement: "",
  freins: "", attentesNaturopathe: "",
  pret: [],
  infosSup: "", questions: "",
});

// ─── HELPERS UI ───────────────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <p style={{ color: C.textMid, fontSize: 13, fontWeight: 500, marginBottom: 6, fontFamily: "DM Sans, sans-serif" }}>
    {children}{required && <span style={{ color: C.terra, marginLeft: 3 }}>*</span>}
  </p>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%", background: C.surface2, border: `1px solid ${C.border2}`,
      borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14,
      fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box",
      ...style
    }}
  />
);

const Textarea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    style={{
      width: "100%", background: C.surface2, border: `1px solid ${C.border2}`,
      borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14,
      fontFamily: "DM Sans, sans-serif", outline: "none", resize: "vertical",
      boxSizing: "border-box",
    }}
  />
);

const Scale = ({ value, onChange, label }) => (
  <div style={{ marginTop: 4 }}>
    {label && <Label>{label}</Label>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button
          key={n}
          onClick={() => onChange(String(n))}
          style={{
            width: 38, height: 38, borderRadius: 8,
            border: `1px solid ${value === String(n) ? C.terra : C.border2}`,
            background: value === String(n) ? C.terraDim : C.surface2,
            color: value === String(n) ? C.terra : C.textMid,
            fontSize: 14, fontWeight: value === String(n) ? 700 : 400,
            cursor: "pointer", fontFamily: "DM Sans, sans-serif",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

const CheckGroup = ({ options, value = [], onChange, columns = 1 }) => {
  const toggle = (opt) => {
    const cur = Array.isArray(value) ? value : [];
    onChange(cur.includes(opt) ? cur.filter(v => v !== opt) : [...cur, opt]);
  };
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 6
    }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          style={{
            textAlign: "left", padding: "8px 12px", borderRadius: 8,
            border: `1px solid ${(value || []).includes(opt) ? C.terra : C.border}`,
            background: (value || []).includes(opt) ? C.terraDim : C.surface,
            color: (value || []).includes(opt) ? C.terra : C.textMid,
            fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.4,
          }}
        >
          {(value || []).includes(opt) ? "✓ " : ""}{opt}
        </button>
      ))}
    </div>
  );
};

const RadioGroup = ({ options, value, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        style={{
          textAlign: "left", padding: "9px 14px", borderRadius: 8,
          border: `1px solid ${value === opt ? C.terra : C.border}`,
          background: value === opt ? C.terraDim : C.surface,
          color: value === opt ? C.terra : C.textMid,
          fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
        }}
      >
        {value === opt ? "● " : "○ "}{opt}
      </button>
    ))}
  </div>
);

const Field = ({ label, required, children }) => (
  <div style={{ marginBottom: 18 }}>
    {label && <Label required={required}>{label}</Label>}
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{
    color: C.terra, fontSize: 14, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", margin: "24px 0 14px",
    fontFamily: "DM Sans, sans-serif", borderBottom: `1px solid ${C.terraBorder}`,
    paddingBottom: 8,
  }}>
    {children}
  </h3>
);

// ─── GENERATE PDF TEXT ────────────────────────────────────────────────────────
function generatePdfText(form, user) {
  const arr = (v) => Array.isArray(v) ? v.join(", ") : (v || "—");
  const val = (v) => v || "—";

  return `
QUESTIONNAIRE DE SANTÉ — ${user?.displayName || user?.email || ""}
Date : ${new Date().toLocaleDateString("fr-FR")}

══════════════════════════════════════════
1. INFORMATIONS GÉNÉRALES
══════════════════════════════════════════
Email : ${user?.email || "—"}
Profession : ${val(form.profession)}
Situation familiale : ${val(form.situationFamiliale)}

MOTIF DE CONSULTATION
─────────────────────
Pourquoi une naturopathe : ${val(form.pourquoiNaturo)}
Problématique principale : ${val(form.problematique)}
Depuis combien de temps : ${val(form.dureeProbleme)}
Impact vie quotidienne : ${val(form.impactVieQuotidienne)}
Déjà essayé : ${val(form.dejaTente)}
Objectifs 3 mois : ${val(form.objectifs3mois)}

══════════════════════════════════════════
2. ANTÉCÉDENTS MÉDICAUX
══════════════════════════════════════════
Maladies chroniques : ${val(form.maladiesChroniques)}
Chirurgies : ${val(form.chirurgies)}
Hospitalisations : ${val(form.hospitalisations)}
Allergies connues : ${val(form.allergiesConnues)}
Antécédents familiaux : ${val(form.antecedentsFamiliaux)}

TRAITEMENTS ACTUELS
────────────────────
Médicaments : ${val(form.medicaments)}
Compléments actuels : ${val(form.complementsActuels)}
Plantes / remèdes : ${val(form.plantesRemedes)}
Autres thérapies : ${val(form.autresTherapies)}
Suivi médical : ${arr(form.suiviMedical)}

══════════════════════════════════════════
3. SOMMEIL & ÉNERGIE
══════════════════════════════════════════
Coucher / Lever : ${val(form.heureCoucher)} — ${val(form.heureLever)}
Heures de sommeil : ${val(form.nbreHeuresSommeil)}h
Qualité sommeil : ${val(form.qualiteSommeil)}/10
Difficultés : ${arr(form.difficulteSommeil)}
État au réveil : ${val(form.etatReveil)}
Énergie matin : ${val(form.energieMatin)}/10 | Après-midi : ${val(form.energieApresMidi)}/10 | Soir : ${val(form.energieSoir)}/10
Baisses d'énergie : ${val(form.baisseEnergieMoment)}
Stimulants : ${val(form.consommationStimulants)}
Symptômes fatigue : ${arr(form.symptomesFatigue)}

══════════════════════════════════════════
4. STRESS & SANTÉ MENTALE
══════════════════════════════════════════
Niveau stress : ${val(form.niveauStress)}/10
Sources de stress : ${val(form.sourceStress)}
Symptômes stress : ${arr(form.symptomesStress)}
Humeur générale : ${arr(form.humeurGenerale)}
Anxiété / angoisses : ${val(form.anxieteAngoisses)}
Suivi psy : ${arr(form.suiviPsy)}
Techniques relaxation : ${val(form.techniquesRelaxation)}
Activités ressourçantes : ${val(form.activitesRessourcantes)}

══════════════════════════════════════════
5. HORMONES & CYCLE
══════════════════════════════════════════
Âge 1ères règles : ${val(form.agePremieresRegles)}
Régularité cycle : ${arr(form.regulariteCycle)}
Durée cycle : ${val(form.dureeCycle)} jours
Durée règles : ${val(form.dureeRegles)} jours
Abondance : ${val(form.abondanceRegles)}
Symptômes SPM : ${arr(form.symptomesSPM)}
Intensité douleurs : ${val(form.intensiteDouleurs)}/10
Description douleurs : ${val(form.descriptionDouleurs)}
Contraception : ${arr(form.contraception)} (depuis ${val(form.dureeContraception)})
Périménopause/Ménopause : ${val(form.perimenopause)}
Symptômes hormonaux : ${arr(form.symptomesHormonaux)}
Grossesses : ${val(form.grossesses)}
Accouchements : ${val(form.accouchements)}
Fausses couches/IVG : ${val(form.faussesCouches)}
Problème fertilité : ${arr(form.problemeFertilite)}
Problèmes thyroïdiens : ${arr(form.problemesThyroidiens)}

══════════════════════════════════════════
6. DIGESTION & IMMUNITÉ
══════════════════════════════════════════
Transit : ${arr(form.transit)}
Fréquence selles : ${val(form.frequenceSelles)}
Consistance (Bristol) : ${arr(form.consistanceSelles)}
Problèmes digestifs : ${arr(form.problemesDigestifs)}
Moment symptômes : ${val(form.momentSymptomesDigestifs)}
Intolérances : ${arr(form.intolerancesAlimentaires)}
Aliments problématiques : ${val(form.alimentsProblematiques)}
Tests intolérances : ${val(form.testsIntolerances)}
Antécédents digestifs : ${arr(form.antecedentsDigestifs)}
Antibiotiques récents : ${arr(form.antibiotiquesRecents)}

IMMUNITÉ & INFLAMMATION
Nb maladies/an : ${val(form.nbFoisMaladeAn)}
Durée récupération : ${val(form.dureeRecuperationInfection)}
Infections récurrentes : ${arr(form.infectionsRecurrentes)}
Maladies auto-immunes : ${arr(form.maladiesAutoImmunes)}
Inflammations chroniques : ${arr(form.inflammationsChroniques)}
Problèmes de peau : ${arr(form.problemesPeau)}
Allergies : ${arr(form.allergies)}

══════════════════════════════════════════
7. ALIMENTATION & HYDRATATION
══════════════════════════════════════════
Régime : ${arr(form.regimeAlimentaire)} (depuis ${val(form.dureeRegime)})
Repas/jour : ${val(form.nbRepasJour)} | Collations : ${val(form.nbCollations)}
Petit-déjeuner : ${val(form.petitDejeuner)} — Type : ${val(form.petitDejType)}
Déjeuner type : ${val(form.dejeunerType)}
Dîner type : ${val(form.dinerType)}
Collations : ${val(form.collationsType)}
Dernier repas à : ${val(form.heureDernierRepas)}
Sucre : ${val(form.consommationSucre)}/10 — Types : ${val(form.typesSucres)}
Laitiers : ${val(form.consommationLaitiers)}/10 — Types : ${val(form.typesLaitiers)}
Gluten : ${val(form.consommationGluten)}/10 — Produits : ${val(form.produitsGluten)}
Fruits/jour : ${val(form.portionsFruits)} | Légumes/jour : ${val(form.portionsLegumes)}
Protéines animales : ${arr(form.proteinesAnimales)}
Protéines végétales : ${val(form.proteinesVegetales)}
Eau/jour : ${val(form.quantiteEau)}
Autres boissons : ${arr(form.autresBoissons)}
Habitudes alimentaires : ${arr(form.habitudesAlimentaires)}
Appétit : ${val(form.niveauAppetit)}/10
Envies / excès : ${val(form.enviesAliments)}
Contexte repas : ${arr(form.contextRepas)}

══════════════════════════════════════════
8. ACTIVITÉ PHYSIQUE & ENVIRONNEMENT
══════════════════════════════════════════
Niveau activité : ${val(form.niveauActivite)}
Type(s) : ${val(form.typesActivite)}
Fréquence/semaine : ${val(form.frequenceActivite)} | Durée séance : ${val(form.dureeSeance)}
Intensité : ${val(form.intensiteActivite)}
Heures assis/jour : ${val(form.heuresAssis)}
Ressenti après sport : ${arr(form.ressentiApresActivite)}
Limitations : ${val(form.limitationsPhysiques)}
Souhait activité : ${arr(form.souhaitActivite)}

ENVIRONNEMENT
Habitation : ${arr(form.typeHabitation)}
Qualité environnement : ${arr(form.qualiteEnvironnement)}
Temps extérieur/jour : ${val(form.tempsExterieur)}
Heures écrans/jour : ${val(form.heuresEcrans)}
Exposition pro : ${arr(form.expositionPro)}
Tabac : ${arr(form.tabac)}
Produits quotidiens : ${arr(form.produitsQuotidiens)}
Plastique aliments : ${val(form.plastiqueAliments)}

══════════════════════════════════════════
9. AUTRES SYSTÈMES & EXAMENS
══════════════════════════════════════════
Vision : ${arr(form.vision)}
Audition : ${arr(form.audition)}
Santé bucco-dentaire : ${arr(form.santeBuccoDentaire)}
Problèmes ORL : ${arr(form.problemesORL)}
Cardio-vasculaire : ${arr(form.systemCardioVasculaire)}
Urinaire : ${arr(form.systemeUrinaire)}
Température corporelle : ${arr(form.temperatureCorporelle)}
Autres symptômes : ${val(form.autresSymptomes)}

EXAMENS COMPLÉMENTAIRES
Analyses sanguines récentes : ${val(form.analysesSanguinesRecentes)}
Date dernier bilan : ${val(form.dateLastBilan)}
Éléments remarquables : ${val(form.elementsRemarquables)}
Analyses spécifiques réalisées : ${arr(form.analysesSpecifiques)}
Autres examens : ${val(form.autresExamens)}

══════════════════════════════════════════
10. MOTIVATION & CONCLUSION
══════════════════════════════════════════
Vision dans 6 mois : ${val(form.visionDans6Mois)}
Motivation changement : ${val(form.motivationChangement)}/10
Freins : ${val(form.freins)}
Attentes naturopathe : ${val(form.attentesNaturopathe)}
Prêt(e) à : ${arr(form.pret)}
Infos supplémentaires : ${val(form.infosSup)}
Questions : ${val(form.questions)}
`.trim();
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function Anamnese({ user, onDone, readonly = false, existingData = null }) {
  const [etape, setEtape] = useState(1);
  const [form, setForm] = useState(() => existingData?.form ? { ...initForm(), ...existingData.form } : initForm());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingData?.id);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docs, setDocs] = useState(existingData?.bilans || []);

  const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "di45b4ymc";
  const UPLOAD_PRESET = "meije_naturo_public";

  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "meije-naturo/bilans");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
    const data = await res.json();
    return { url: data.secure_url, name: file.name, type: file.type };
  };

  const handleUploadDocs = async (files) => {
    setUploadingDocs(true);
    const uploaded = [];
    for (const f of files) {
      try { uploaded.push(await uploadToCloudinary(f)); } catch (e) { console.error(e); }
    }
    setDocs(prev => [...prev, ...uploaded]);
    setUploadingDocs(false);
  };

  const removeDoc = (idx) => setDocs(prev => prev.filter((_, i) => i !== idx));

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const pdfText = generatePdfText(form, user);
      const data = {
        userUid: user.uid,
        userEmail: user.email,
        userPrenom: user.displayName || user.email?.split("@")[0] || "",
        date: new Date().toISOString(),
        form,
        pdfText,
        bilans: docs,
      };
      if (existingData?.id) {
        await updateDoc(doc(db, "anamneses", existingData.id), data);
      } else {
        await addDoc(collection(db, "anamneses"), data);
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (readonly && existingData) {
    const pdfText = generatePdfText(existingData.form || {}, { email: existingData.userEmail });
    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: 24, fontFamily: "DM Sans, sans-serif" }}>
        <pre style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pdfText}</pre>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border2}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <p style={{ color: C.terra, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Questionnaire de santé</p>
          <p style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>Étape {etape} / {ETAPES.length} — {ETAPES[etape - 1].label}</p>
        </div>
        <button onClick={onDone} style={{ background: "none", border: "none", color: C.textMid, fontSize: 22, cursor: "pointer", padding: 4 }}>×</button>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 3, background: C.border2 }}>
        <div style={{ height: "100%", background: C.terra, width: `${(etape / ETAPES.length) * 100}%`, transition: "width 0.3s ease", borderRadius: "0 4px 4px 0" }} />
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px 100px" }}>

        {/* ── ÉTAPE 1 ── */}
        {etape === 1 && (
          <div>
            <SectionTitle>1. Informations générales</SectionTitle>
            <Field label="Profession / Activité actuelle">
              <Input value={form.profession} onChange={set("profession")} placeholder="Ex : infirmière, enseignante, freelance..." />
            </Field>
            <Field label="Situation familiale">
              <Input value={form.situationFamiliale} onChange={set("situationFamiliale")} placeholder="Ex : en couple, 2 enfants, célibataire..." />
            </Field>

            <SectionTitle>2. Motif de consultation</SectionTitle>
            <Field label="Pourquoi consultes-tu une naturopathe ? Qu'est-ce qui t'a décidée à franchir le pas ?" required>
              <Textarea value={form.pourquoiNaturo} onChange={set("pourquoiNaturo")} placeholder="Ex : j'en ai assez des traitements classiques, une amie me l'a recommandé, j'ai l'impression que mon corps essaie de me dire quelque chose..." rows={3} />
            </Field>
            <Field label="Quelle est ta problématique principale aujourd'hui ?" required>
              <Textarea value={form.problematique} onChange={set("problematique")} placeholder="Décris-la librement..." rows={3} />
            </Field>
            <Field label="Depuis combien de temps vis-tu avec ce problème ?">
              <Input value={form.dureeProbleme} onChange={set("dureeProbleme")} placeholder="Ex : 2 ans, depuis l'accouchement..." />
            </Field>
            <Field label="Comment cela impacte-t-il ta vie quotidienne ?">
              <Textarea value={form.impactVieQuotidienne} onChange={set("impactVieQuotidienne")} placeholder="Travail, relations, énergie, moral..." rows={2} />
            </Field>
            <Field label="Qu'as-tu déjà essayé pour améliorer la situation ?">
              <Textarea value={form.dejaTente} onChange={set("dejaTente")} placeholder="Traitements, thérapies, changements alimentaires..." rows={2} />
            </Field>
            <Field label="Quels sont tes objectifs pour cet accompagnement ? (dans 3 mois)" required>
              <Textarea value={form.objectifs3mois} onChange={set("objectifs3mois")} placeholder="Ex : me sentir moins fatiguée, retrouver un cycle régulier..." rows={2} />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 2 ── */}
        {etape === 2 && (
          <div>
            <SectionTitle>3. Antécédents médicaux</SectionTitle>
            <Field label="Maladies chroniques diagnostiquées ?">
              <Textarea value={form.maladiesChroniques} onChange={set("maladiesChroniques")} placeholder="Ex : diabète, Hashimoto, endométriose, SOPK... ou Aucune" rows={2} />
            </Field>
            <Field label="Chirurgies passées (date et type)">
              <Input value={form.chirurgies} onChange={set("chirurgies")} placeholder="Ex : appendicectomie 2018, césarienne 2022..." />
            </Field>
            <Field label="Hospitalisations importantes">
              <Input value={form.hospitalisations} onChange={set("hospitalisations")} placeholder="Précise si pertinent" />
            </Field>
            <Field label="Allergies connues (médicaments, aliments, environnementales...)">
              <Input value={form.allergiesConnues} onChange={set("allergiesConnues")} placeholder="Ex : pénicilline, arachides, pollens..." />
            </Field>
            <Field label="Antécédents familiaux importants">
              <Textarea value={form.antecedentsFamiliaux} onChange={set("antecedentsFamiliaux")} placeholder="Maladies chez parents, frères/sœurs..." rows={2} />
            </Field>

            <SectionTitle>4. Traitements & compléments actuels</SectionTitle>
            <Field label="Médicaments actuels (nom, posologie, depuis quand)">
              <Textarea value={form.medicaments} onChange={set("medicaments")} placeholder="Ex : Lévothyrox 50µg matin depuis 2021..." rows={2} />
            </Field>
            <Field label="Compléments alimentaires que tu prends actuellement">
              <Textarea value={form.complementsActuels} onChange={set("complementsActuels")} placeholder="Ex : magnésium, vitamine D, oméga 3..." rows={2} />
            </Field>
            <Field label="Plantes, tisanes ou remèdes naturels utilisés régulièrement">
              <Input value={form.plantesRemedes} onChange={set("plantesRemedes")} placeholder="Ex : valériane, gingembre, huiles essentielles..." />
            </Field>
            <Field label="Autres thérapies en cours">
              <Input value={form.autresTherapies} onChange={set("autresTherapies")} placeholder="Ex : ostéopathie, psychothérapie, acupuncture..." />
            </Field>
            <Field label="Suivi médical régulier ?">
              <CheckGroup
                options={["Oui, médecin généraliste", "Oui, spécialiste (endocrinologue, gynéco...)", "Non"]}
                value={form.suiviMedical} onChange={set("suiviMedical")}
              />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 3 ── */}
        {etape === 3 && (
          <div>
            <SectionTitle>5. Sommeil</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <Field label="Heure habituelle de coucher">
                <Input value={form.heureCoucher} onChange={set("heureCoucher")} placeholder="Ex : 23h30" />
              </Field>
              <Field label="Heure de lever">
                <Input value={form.heureLever} onChange={set("heureLever")} placeholder="Ex : 7h00" />
              </Field>
            </div>
            <Field label="Nombre d'heures de sommeil par nuit">
              <Input value={form.nbreHeuresSommeil} onChange={set("nbreHeuresSommeil")} placeholder="Ex : 7h" />
            </Field>
            <Scale label="Qualité globale du sommeil (1 = très mauvais, 10 = excellent)" value={form.qualiteSommeil} onChange={set("qualiteSommeil")} />
            <div style={{ marginTop: 16 }}>
              <Field label="Difficultés liées au sommeil (plusieurs choix possibles)">
                <CheckGroup
                  options={[
                    "Difficultés d'endormissement (>30 min)",
                    "Réveils nocturnes fréquents",
                    "Réveil trop matinal",
                    "Sommeil léger / non réparateur",
                    "Cauchemars fréquents",
                    "Ronflements / Apnées du sommeil",
                    "Aucune difficulté particulière"
                  ]}
                  value={form.difficulteSommeil} onChange={set("difficulteSommeil")} columns={1}
                />
              </Field>
            </div>
            <Field label="Comment tu te sens au réveil ?">
              <RadioGroup
                options={["En forme et reposée", "Fatiguée mais ça va", "Épuisée, besoin de beaucoup de temps pour émerger"]}
                value={form.etatReveil} onChange={set("etatReveil")}
              />
            </Field>
            <Scale label="Niveau d'énergie le matin (au réveil) — 1 à 10" value={form.energieMatin} onChange={set("energieMatin")} />
            <div style={{ marginTop: 12 }}>
              <Scale label="Niveau d'énergie l'après-midi (14h-16h)" value={form.energieApresMidi} onChange={set("energieApresMidi")} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Scale label="Niveau d'énergie le soir (vers 20h)" value={form.energieSoir} onChange={set("energieSoir")} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="À quel(s) moment(s) de la journée ressens-tu des baisses d'énergie ?">
                <Input value={form.baisseEnergieMoment} onChange={set("baisseEnergieMoment")} placeholder="Ex : après le déjeuner, en milieu d'après-midi..." />
              </Field>
            </div>
            <Field label="Consommation de stimulants (café, thé, boissons énergisantes) — quantité et horaires">
              <Input value={form.consommationStimulants} onChange={set("consommationStimulants")} placeholder="Ex : 2 cafés avant 14h, 1 thé le soir..." />
            </Field>
            <Field label="Tu ressens (plusieurs choix) :">
              <CheckGroup
                options={["Un besoin de faire des siestes", "Difficulté à te concentrer par fatigue", "Épuisement après un effort léger", "Aucun de ces symptômes"]}
                value={form.symptomesFatigue} onChange={set("symptomesFatigue")}
              />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 4 ── */}
        {etape === 4 && (
          <div>
            <SectionTitle>6. Stress & Santé mentale</SectionTitle>
            <Scale label="Niveau de stress actuel (1 = aucun, 10 = maximal)" value={form.niveauStress} onChange={set("niveauStress")} />
            <div style={{ marginTop: 16 }}>
              <Field label="Quelles sont tes principales sources de stress ?">
                <Textarea value={form.sourceStress} onChange={set("sourceStress")} placeholder="Travail, famille, finances, santé, relations..." rows={2} />
              </Field>
            </div>
            <Field label="Symptômes de stress que tu ressens">
              <CheckGroup
                options={[
                  "Tensions musculaires (nuque, épaules, mâchoire)",
                  "Maux de tête fréquents",
                  "Troubles digestifs liés au stress",
                  "Palpitations / Oppression thoracique",
                  "Irritabilité, impatience",
                  "Difficultés de concentration",
                  "Ruminations mentales",
                  "Troubles du sommeil",
                  "Aucun symptôme particulier"
                ]}
                value={form.symptomesStress} onChange={set("symptomesStress")} columns={1}
              />
            </Field>
            <Field label="Comment décrirais-tu ton humeur générale ? (plusieurs choix)">
              <CheckGroup
                options={["Stable et positive", "Variable (hauts et bas)", "Plutôt anxieuse", "Plutôt dépressive / tristesse", "Irritable", "Apathique / manque de motivation"]}
                value={form.humeurGenerale} onChange={set("humeurGenerale")} columns={2}
              />
            </Field>
            <Field label="Ressens-tu de l'anxiété, des angoisses ou des attaques de panique ?">
              <Textarea value={form.anxieteAngoisses} onChange={set("anxieteAngoisses")} placeholder="Si oui, dans quelles situations ?..." rows={2} />
            </Field>
            <Field label="As-tu déjà consulté ou es-tu suivie pour ?">
              <CheckGroup
                options={["Anxiété", "Dépression", "Burn-out", "Troubles de l'attention (TDAH)", "Autre trouble psychologique", "Non, jamais"]}
                value={form.suiviPsy} onChange={set("suiviPsy")} columns={2}
              />
            </Field>
            <Field label="Pratiques-tu des techniques de relaxation ou de gestion du stress ?">
              <Input value={form.techniquesRelaxation} onChange={set("techniquesRelaxation")} placeholder="Ex : méditation, yoga, respiration, sport... et fréquence" />
            </Field>
            <Field label="Quelles activités te ressourcent et te font du bien ?">
              <Input value={form.activitesRessourcantes} onChange={set("activitesRessourcantes")} placeholder="Nature, lecture, amis, musique, cuisine..." />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 5 ── */}
        {etape === 5 && (
          <div>
            <SectionTitle>7. Système hormonal</SectionTitle>
            <Field label="Âge de tes premières règles">
              <Input value={form.agePremieresRegles} onChange={set("agePremieresRegles")} placeholder="Ex : 13 ans" />
            </Field>
            <Field label="Régularité de ton cycle menstruel">
              <CheckGroup
                options={["Cycle régulier (26-32 jours)", "Cycle irrégulier", "Absence de règles (aménorrhée)", "Règles très espacées (>35 jours)", "Règles trop fréquentes (<25 jours)", "Ménopausée"]}
                value={form.regulariteCycle} onChange={set("regulariteCycle")} columns={1}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Durée du cycle (jours)">
                <Input value={form.dureeCycle} onChange={set("dureeCycle")} placeholder="Ex : 28" />
              </Field>
              <Field label="Durée des règles (jours)">
                <Input value={form.dureeRegles} onChange={set("dureeRegles")} placeholder="Ex : 5" />
              </Field>
            </div>
            <Field label="Abondance des règles">
              <RadioGroup
                options={["Légères", "Normales", "Abondantes", "Très abondantes (avec caillots)"]}
                value={form.abondanceRegles} onChange={set("abondanceRegles")}
              />
            </Field>
            <Field label="Symptômes prémenstruels (SPM) — ce que tu ressens avant tes règles">
              <CheckGroup
                options={[
                  "Irritabilité, changements d'humeur", "Anxiété, tristesse",
                  "Fringales (sucre, sel)", "Ballonnements, rétention d'eau",
                  "Seins douloureux ou gonflés", "Fatigue intense",
                  "Maux de tête / Migraines", "Douleurs abdominales",
                  "Acné", "Insomnie", "Aucun symptôme particulier"
                ]}
                value={form.symptomesSPM} onChange={set("symptomesSPM")} columns={2}
              />
            </Field>
            <Scale label="Intensité de tes douleurs menstruelles (1 = aucune, 10 = insupportable)" value={form.intensiteDouleurs} onChange={set("intensiteDouleurs")} />
            <div style={{ marginTop: 12 }}>
              <Field label="Décris tes douleurs menstruelles (localisation, type, moment)">
                <Textarea value={form.descriptionDouleurs} onChange={set("descriptionDouleurs")} placeholder="Ex : crampes basses ventre J1-J2, irradiant dans le dos..." rows={2} />
              </Field>
            </div>
            <Field label="Contraception actuelle">
              <CheckGroup
                options={[
                  "Pilule contraceptive", "Stérilet hormonal", "Stérilet au cuivre",
                  "Implant", "Anneau vaginal", "Préservatifs uniquement",
                  "Méthodes naturelles", "Aucune contraception", "Autre"
                ]}
                value={form.contraception} onChange={set("contraception")} columns={2}
              />
            </Field>
            <Field label="Depuis combien de temps utilises-tu cette contraception ?">
              <Input value={form.dureeContraception} onChange={set("dureeContraception")} placeholder="Ex : 3 ans" />
            </Field>
            <Field label="Tes-tu concernée par ?">
              <RadioGroup
                options={["Périménopause", "Ménopause", "Ni l'une ni l'autre"]}
                value={form.perimenopause} onChange={set("perimenopause")}
              />
            </Field>
            <Field label="Symptômes hormonaux que tu observes">
              <CheckGroup
                options={[
                  "Acné (visage, dos, poitrine)", "Pilosité excessive (visage, corps)",
                  "Chute de cheveux", "Peau très sèche ou très grasse",
                  "Bouffées de chaleur", "Sueurs nocturnes",
                  "Sécheresse vaginale", "Baisse de libido",
                  "Prise de poids", "Seins fibrokystiques",
                  "Aucun de ces symptômes"
                ]}
                value={form.symptomesHormonaux} onChange={set("symptomesHormonaux")} columns={2}
              />
            </Field>
            <Field label="Grossesses (nombre et dates)">
              <Input value={form.grossesses} onChange={set("grossesses")} placeholder="Ex : 2 grossesses — 2018, 2021" />
            </Field>
            <Field label="Accouchements (nombre et type — voie basse / césarienne)">
              <Input value={form.accouchements} onChange={set("accouchements")} placeholder="Ex : 1 voie basse, 1 césarienne" />
            </Field>
            <Field label="Fausses couches ou IVG">
              <Input value={form.faussesCouches} onChange={set("faussesCouches")} placeholder="Si oui, combien et quand" />
            </Field>
            <Field label="Problèmes de fertilité ?">
              <CheckGroup
                options={["Oui, difficulté à concevoir", "Oui, SOPK diagnostiqué", "Oui, endométriose", "Oui, autre", "Non"]}
                value={form.problemeFertilite} onChange={set("problemeFertilite")}
              />
            </Field>
            <Field label="Problèmes thyroïdiens diagnostiqués ?">
              <CheckGroup
                options={["Hypothyroïdie", "Hyperthyroïdie", "Hashimoto", "Nodules thyroïdiens", "Suspicion mais non diagnostiqué", "Non"]}
                value={form.problemesThyroidiens} onChange={set("problemesThyroidiens")} columns={2}
              />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 6 ── */}
        {etape === 6 && (
          <div>
            <SectionTitle>8. Système digestif</SectionTitle>
            <Field label="Transit intestinal">
              <CheckGroup
                options={["Normal, régulier (1 fois/jour)", "Constipation (moins de 3 fois/semaine)", "Diarrhées fréquentes", "Alternance constipation/diarrhée", "Selles urgentes après les repas"]}
                value={form.transit} onChange={set("transit")} columns={1}
              />
            </Field>
            <Field label="Fréquence des selles">
              <Input value={form.frequenceSelles} onChange={set("frequenceSelles")} placeholder="Ex : 1x/jour, 3x/semaine..." />
            </Field>
            <Field label="Consistance de tes selles (échelle de Bristol)">
              <CheckGroup
                options={["Type 1-2 : Dures, difficiles à évacuer", "Type 3-4 : Normales, bien formées", "Type 5-6 : Molles, pâteuses", "Type 7 : Liquides"]}
                value={form.consistanceSelles} onChange={set("consistanceSelles")} columns={1}
              />
            </Field>
            <Field label="Problèmes digestifs que tu ressens">
              <CheckGroup
                options={[
                  "Ballonnements", "Gaz intestinaux importants",
                  "Douleurs / crampes abdominales", "Brûlures d'estomac / Reflux",
                  "Nausées", "Sensation de digestion lente",
                  "Lourdeur après les repas", "Éructations fréquentes",
                  "Aucun problème particulier"
                ]}
                value={form.problemesDigestifs} onChange={set("problemesDigestifs")} columns={2}
              />
            </Field>
            <Field label="À quel moment de la journée tes symptômes digestifs sont-ils les plus présents ?">
              <Input value={form.momentSymptomesDigestifs} onChange={set("momentSymptomesDigestifs")} placeholder="Ex : après le déjeuner, le soir..." />
            </Field>
            <Field label="Intolérances ou sensibilités alimentaires connues">
              <CheckGroup
                options={["Gluten", "Lactose / Produits laitiers", "Œufs", "Fruits à coque", "FODMAPs", "Histamine", "Autres", "Aucune connue"]}
                value={form.intolerancesAlimentaires} onChange={set("intolerancesAlimentaires")} columns={3}
              />
            </Field>
            <Field label="Y a-t-il des aliments qui te causent systématiquement des problèmes ?">
              <Textarea value={form.alimentsProblematiques} onChange={set("alimentsProblematiques")} placeholder="Lesquels et quels symptômes ?" rows={2} />
            </Field>
            <Field label="As-tu déjà fait des tests d'intolérances alimentaires ?">
              <Input value={form.testsIntolerances} onChange={set("testsIntolerances")} placeholder="Si oui, résultats..." />
            </Field>
            <Field label="Antécédents digestifs">
              <CheckGroup
                options={[
                  "Colopathie / Intestin irritable", "Maladie de Crohn / RCH",
                  "SIBO (prolifération bactérienne)", "Candidose intestinale",
                  "Ulcère gastrique / duodénal", "Calculs biliaires",
                  "Autre", "Aucun"
                ]}
                value={form.antecedentsDigestifs} onChange={set("antecedentsDigestifs")} columns={2}
              />
            </Field>
            <Field label="As-tu pris des antibiotiques récemment ?">
              <CheckGroup
                options={["Oui, dans les 3 derniers mois", "Oui, dans les 6-12 derniers mois", "Non"]}
                value={form.antibiotiquesRecents} onChange={set("antibiotiquesRecents")}
              />
            </Field>

            <SectionTitle>9. Immunité & Inflammation</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Combien de fois tombes-tu malade par an ?">
                <Input value={form.nbFoisMaladeAn} onChange={set("nbFoisMaladeAn")} placeholder="Ex : 3-4 fois" />
              </Field>
              <Field label="Durée de récupération après infection">
                <Input value={form.dureeRecuperationInfection} onChange={set("dureeRecuperationInfection")} placeholder="Ex : 1 semaine, 2 semaines..." />
              </Field>
            </div>
            <Field label="Infections récurrentes">
              <CheckGroup
                options={["Rhumes / Sinusites fréquentes", "Angines à répétition", "Infections urinaires", "Mycoses (vaginales, cutanées)", "Herpès labial", "Infections ORL", "Aucune infection particulière"]}
                value={form.infectionsRecurrentes} onChange={set("infectionsRecurrentes")} columns={2}
              />
            </Field>
            <Field label="Maladies auto-immunes diagnostiquées">
              <CheckGroup
                options={["Hashimoto", "Polyarthrite rhumatoïde", "Lupus", "Maladie de Crohn", "Psoriasis", "Vitiligo", "Autre", "Aucune"]}
                value={form.maladiesAutoImmunes} onChange={set("maladiesAutoImmunes")} columns={3}
              />
            </Field>
            <Field label="Inflammations chroniques ou douleurs">
              <CheckGroup
                options={["Douleurs articulaires", "Douleurs musculaires chroniques", "Tendinites récurrentes", "Fibromyalgie / douleurs chroniques", "Gonflement / Raideur matinale", "Aucune douleur particulière"]}
                value={form.inflammationsChroniques} onChange={set("inflammationsChroniques")} columns={2}
              />
            </Field>
            <Field label="Problèmes de peau">
              <CheckGroup
                options={["Eczéma", "Psoriasis", "Acné", "Rosacée", "Urticaire", "Peau très sèche", "Démangeaisons fréquentes", "Cicatrisation lente", "Aucun problème cutané"]}
                value={form.problemesPeau} onChange={set("problemesPeau")} columns={3}
              />
            </Field>
            <Field label="Allergies">
              <CheckGroup
                options={["Pollens / Rhume des foins", "Acariens", "Animaux", "Aliments", "Médicaments", "Produits cosmétiques", "Aucune allergie connue"]}
                value={form.allergies} onChange={set("allergies")} columns={2}
              />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 7 ── */}
        {etape === 7 && (
          <div>
            <SectionTitle>10. Alimentation & Hydratation</SectionTitle>
            <Field label="Régime alimentaire suivi">
              <CheckGroup
                options={["Omnivore (tout)", "Végétarien", "Végétalien / Vegan", "Pescétarien", "Sans gluten", "Sans lactose", "Paléo", "Cétogène", "Jeûne intermittent", "Autre"]}
                value={form.regimeAlimentaire} onChange={set("regimeAlimentaire")} columns={2}
              />
            </Field>
            <Field label="Si régime particulier, depuis combien de temps ?">
              <Input value={form.dureeRegime} onChange={set("dureeRegime")} placeholder="Ex : 2 ans" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nombre de repas par jour">
                <Input value={form.nbRepasJour} onChange={set("nbRepasJour")} placeholder="Ex : 3" />
              </Field>
              <Field label="Nombre de collations">
                <Input value={form.nbCollations} onChange={set("nbCollations")} placeholder="Ex : 1" />
              </Field>
            </div>
            <Field label="Prends-tu un petit-déjeuner ?">
              <RadioGroup
                options={["Oui, tous les jours", "Parfois", "Rarement", "Jamais"]}
                value={form.petitDejeuner} onChange={set("petitDejeuner")}
              />
            </Field>
            <Field label="Petit-déjeuner type">
              <Input value={form.petitDejType} onChange={set("petitDejType")} placeholder="Ex : avoine + fruits, œufs + pain..." />
            </Field>
            <Field label="Déjeuner type">
              <Textarea value={form.dejeunerType} onChange={set("dejeunerType")} placeholder="Ex : salade poulet + quinoa + légumes..." rows={2} />
            </Field>
            <Field label="Dîner type">
              <Textarea value={form.dinerType} onChange={set("dinerType")} placeholder="Ex : soupe maison + riz..." rows={2} />
            </Field>
            <Field label="Collations habituelles">
              <Input value={form.collationsType} onChange={set("collationsType")} placeholder="Ex : fruit + amandes, yaourt..." />
            </Field>
            <Field label="Heure du dernier repas de la journée">
              <Input value={form.heureDernierRepas} onChange={set("heureDernierRepas")} placeholder="Ex : 20h" />
            </Field>
            <Scale label="Consommation de sucre (1 = très peu, 10 = beaucoup)" value={form.consommationSucre} onChange={set("consommationSucre")} />
            <div style={{ marginTop: 12 }}>
              <Field label="Types de sucres consommés et fréquence">
                <Input value={form.typesSucres} onChange={set("typesSucres")} placeholder="Ex : miel quotidien, chocolat 3x/sem, sodas rarement..." />
              </Field>
            </div>
            <Scale label="Consommation de produits laitiers (1 = jamais, 10 = plusieurs fois/jour)" value={form.consommationLaitiers} onChange={set("consommationLaitiers")} />
            <div style={{ marginTop: 12 }}>
              <Field label="Types de laitiers et fréquence">
                <Input value={form.typesLaitiers} onChange={set("typesLaitiers")} placeholder="Ex : yaourt quotidien, fromage 2x/sem..." />
              </Field>
            </div>
            <Scale label="Consommation de gluten (1 = jamais, 10 = à chaque repas)" value={form.consommationGluten} onChange={set("consommationGluten")} />
            <div style={{ marginTop: 12 }}>
              <Field label="Produits avec gluten et fréquence">
                <Input value={form.produitsGluten} onChange={set("produitsGluten")} placeholder="Ex : pain tous les jours, pâtes 3x/sem..." />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Portions de fruits / jour">
                <Input value={form.portionsFruits} onChange={set("portionsFruits")} placeholder="Ex : 2" />
              </Field>
              <Field label="Portions de légumes / jour">
                <Input value={form.portionsLegumes} onChange={set("portionsLegumes")} placeholder="Ex : 3" />
              </Field>
            </div>
            <Field label="Protéines animales consommées">
              <CheckGroup
                options={["Viande rouge", "Volaille", "Poisson", "Œufs", "Fruits de mer", "Aucune protéine animale"]}
                value={form.proteinesAnimales} onChange={set("proteinesAnimales")} columns={3}
              />
            </Field>
            <Field label="Protéines végétales (légumineuses, tofu, tempeh...)">
              <Input value={form.proteinesVegetales} onChange={set("proteinesVegetales")} placeholder="Ex : lentilles 2x/sem, tofu 1x/sem..." />
            </Field>
            <Field label="Quantité d'eau bue par jour">
              <Input value={form.quantiteEau} onChange={set("quantiteEau")} placeholder="Ex : 1,5L, 6 verres..." />
            </Field>
            <Field label="Autres boissons consommées régulièrement">
              <CheckGroup
                options={["Café", "Thé", "Tisanes", "Jus de fruits", "Sodas / Boissons sucrées", "Boissons énergisantes", "Alcool", "Eau uniquement"]}
                value={form.autresBoissons} onChange={set("autresBoissons")} columns={3}
              />
            </Field>
            <Field label="Habitudes alimentaires">
              <CheckGroup
                options={[
                  "Je mange rapidement", "Je mange devant un écran",
                  "Je grignote entre les repas", "J'ai des fringales",
                  "Je saute des repas régulièrement", "Je mange tard le soir",
                  "Je mange mes émotions (stress, tristesse, ennui)"
                ]}
                value={form.habitudesAlimentaires} onChange={set("habitudesAlimentaires")} columns={2}
              />
            </Field>
            <Scale label="Appétit général (1 = aucun appétit, 10 = faim constante)" value={form.niveauAppetit} onChange={set("niveauAppetit")} />
            <div style={{ marginTop: 12 }}>
              <Field label="Aliments dont tu as particulièrement envie ou que tu consommes en excès ?">
                <Input value={form.enviesAliments} onChange={set("enviesAliments")} placeholder="Ex : chocolat, sel, pain..." />
              </Field>
            </div>
            <Field label="Contexte des repas">
              <CheckGroup
                options={["Je cuisine moi-même la plupart du temps", "J'achète des plats préparés / surgelés", "Je mange souvent au restaurant / dehors", "Livraison de repas", "Cantines / Restaurants d'entreprise"]}
                value={form.contextRepas} onChange={set("contextRepas")} columns={1}
              />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 8 ── */}
        {etape === 8 && (
          <div>
            <SectionTitle>11. Activité physique & Mouvement</SectionTitle>
            <Field label="Niveau d'activité physique actuel">
              <RadioGroup
                options={[
                  "Sédentaire (peu ou pas d'activité)",
                  "Légèrement actif (marche occasionnelle)",
                  "Modérément actif (sport 2-3 fois/semaine)",
                  "Très actif (sport 4-5 fois/semaine)",
                  "Extrêmement actif (sport intense quotidien)"
                ]}
                value={form.niveauActivite} onChange={set("niveauActivite")}
              />
            </Field>
            <Field label="Type(s) d'activité physique pratiquée(s)">
              <Input value={form.typesActivite} onChange={set("typesActivite")} placeholder="Ex : yoga, marche, natation, musculation..." />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Fréquence hebdomadaire">
                <Input value={form.frequenceActivite} onChange={set("frequenceActivite")} placeholder="Ex : 3x/semaine" />
              </Field>
              <Field label="Durée moyenne des séances">
                <Input value={form.dureeSeance} onChange={set("dureeSeance")} placeholder="Ex : 45 min" />
              </Field>
            </div>
            <Field label="Intensité des entraînements">
              <RadioGroup
                options={["Légère", "Modérée", "Intense"]}
                value={form.intensiteActivite} onChange={set("intensiteActivite")}
              />
            </Field>
            <Field label="Heures par jour passées assis(e) (travail, transports, loisirs)">
              <Input value={form.heuresAssis} onChange={set("heuresAssis")} placeholder="Ex : 8h" />
            </Field>
            <Field label="Après une activité physique, tu te sens :">
              <CheckGroup
                options={["Énergisée et bien", "Normalement fatiguée mais récupères rapidement", "Très fatiguée, récupération difficile", "Épuisée pendant plusieurs jours"]}
                value={form.ressentiApresActivite} onChange={set("ressentiApresActivite")} columns={1}
              />
            </Field>
            <Field label="Y a-t-il des limitations physiques ou des douleurs qui t'empêchent de bouger ?">
              <Textarea value={form.limitationsPhysiques} onChange={set("limitationsPhysiques")} placeholder="Ex : douleurs de dos, genou opéré..." rows={2} />
            </Field>
            <Field label="Tu aimerais :">
              <CheckGroup
                options={["Commencer une activité physique", "Augmenter ton niveau d'activité", "Trouver une activité adaptée", "Diminuer ton niveau d'activité (surmenage)", "Tu te sens bien avec ton niveau actuel"]}
                value={form.souhaitActivite} onChange={set("souhaitActivite")} columns={1}
              />
            </Field>

            <SectionTitle>12. Environnement & Hygiène de vie</SectionTitle>
            <Field label="Type d'habitation">
              <CheckGroup
                options={["Appartement en ville", "Appartement à la campagne", "Maison en ville", "Maison à la campagne", "Autre"]}
                value={form.typeHabitation} onChange={set("typeHabitation")} columns={2}
              />
            </Field>
            <Field label="Qualité de ton environnement de vie">
              <CheckGroup
                options={["Exposition au bruit", "Pollution atmosphérique", "Moisissures dans le logement", "Humidité excessive", "Air sec", "Mauvaise ventilation", "Aucun problème particulier"]}
                value={form.qualiteEnvironnement} onChange={set("qualiteEnvironnement")} columns={2}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Temps à l'extérieur / jour">
                <Input value={form.tempsExterieur} onChange={set("tempsExterieur")} placeholder="Ex : 30 min, 2h..." />
              </Field>
              <Field label="Heures devant les écrans / jour">
                <Input value={form.heuresEcrans} onChange={set("heuresEcrans")} placeholder="Ex : 8h, 10h..." />
              </Field>
            </div>
            <Field label="Exposition professionnelle à des toxiques ou conditions particulières">
              <CheckGroup
                options={["Produits chimiques", "Métaux lourds", "Solvants", "Poussières", "Ondes électromagnétiques importantes", "Travail de nuit / horaires décalés", "Station debout prolongée", "Port de charges lourdes", "Aucune exposition particulière"]}
                value={form.expositionPro} onChange={set("expositionPro")} columns={2}
              />
            </Field>
            <Field label="Tabac">
              <CheckGroup
                options={["Non-fumeuse", "Fumeuse active", "Ex-fumeuse", "Exposition au tabagisme passif"]}
                value={form.tabac} onChange={set("tabac")} columns={2}
              />
            </Field>
            <Field label="Types de produits utilisés au quotidien">
              <CheckGroup
                options={["Cosmétiques conventionnels", "Cosmétiques bio/naturels", "Produits ménagers chimiques", "Produits ménagers écologiques", "Parfums / Déodorants", "Teintures capillaires régulières", "Vernis à ongles / Gels"]}
                value={form.produitsQuotidiens} onChange={set("produitsQuotidiens")} columns={2}
              />
            </Field>
            <Field label="Utilises-tu des contenants en plastique pour stocker ou réchauffer tes aliments ?">
              <RadioGroup
                options={["Oui, régulièrement", "Parfois", "Non, je l'évite"]}
                value={form.plastiqueAliments} onChange={set("plastiqueAliments")}
              />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 9 ── */}
        {etape === 9 && (
          <div>
            <SectionTitle>13. Autres systèmes & Symptômes</SectionTitle>
            <Field label="Vision">
              <CheckGroup
                options={["Bonne vision", "Port de lunettes/lentilles", "Fatigue oculaire", "Vision floue", "Sécheresse oculaire"]}
                value={form.vision} onChange={set("vision")} columns={2}
              />
            </Field>
            <Field label="Audition">
              <CheckGroup
                options={["Bonne audition", "Diminution de l'audition", "Acouphènes", "Sensibilité au bruit"]}
                value={form.audition} onChange={set("audition")} columns={2}
              />
            </Field>
            <Field label="Santé bucco-dentaire">
              <CheckGroup
                options={["Bonne santé dentaire", "Problèmes de gencives", "Saignements des gencives", "Caries fréquentes", "Sensibilité dentaire", "Bruxisme (grincement des dents)", "Aphtes récurrents"]}
                value={form.santeBuccoDentaire} onChange={set("santeBuccoDentaire")} columns={2}
              />
            </Field>
            <Field label="Problèmes ORL récurrents">
              <CheckGroup
                options={["Sinusites", "Otites", "Maux de gorge", "Rhinites allergiques", "Aucun"]}
                value={form.problemesORL} onChange={set("problemesORL")} columns={2}
              />
            </Field>
            <Field label="Système cardiovasculaire">
              <CheckGroup
                options={["Palpitations", "Essoufflement à l'effort", "Essoufflement au repos", "Douleurs thoraciques", "Hypertension", "Hypotension", "Varices", "Jambes lourdes", "Mains/pieds froids", "Aucun problème"]}
                value={form.systemCardioVasculaire} onChange={set("systemCardioVasculaire")} columns={2}
              />
            </Field>
            <Field label="Système urinaire">
              <CheckGroup
                options={["Infections urinaires fréquentes", "Mictions fréquentes", "Envies urgentes d'uriner", "Difficulté à uriner", "Incontinence", "Douleurs en urinant", "Aucun problème"]}
                value={form.systemeUrinaire} onChange={set("systemeUrinaire")} columns={2}
              />
            </Field>
            <Field label="Température corporelle">
              <CheckGroup
                options={["Frileuse (mains/pieds froids)", "Sensation de chaleur excessive", "Transpiration excessive", "Sueurs nocturnes", "Température normale"]}
                value={form.temperatureCorporelle} onChange={set("temperatureCorporelle")} columns={2}
              />
            </Field>
            <Field label="Autres symptômes ou problèmes de santé non mentionnés">
              <Textarea value={form.autresSymptomes} onChange={set("autresSymptomes")} placeholder="Tout ce qui te semble important de préciser..." rows={3} />
            </Field>

            <SectionTitle>14. Examens complémentaires & Analyses</SectionTitle>
            <Field label="As-tu des analyses sanguines récentes (moins d'un an) ?">
              <RadioGroup
                options={["Oui, je les joindrai au questionnaire", "Oui, je les ai mais ne peux pas les joindre maintenant", "Non, pas d'analyse récente"]}
                value={form.analysesSanguinesRecentes} onChange={set("analysesSanguinesRecentes")}
              />
            </Field>
            <Field label="Date du dernier bilan sanguin complet">
              <Input value={form.dateLastBilan} onChange={set("dateLastBilan")} placeholder="Ex : mars 2025" />
            </Field>
            <Field label="Éléments remarquables dans tes dernières analyses (carences, anomalies...)">
              <Textarea value={form.elementsRemarquables} onChange={set("elementsRemarquables")} placeholder="Ex : ferritine basse, TSH élevée, vitamine D insuffisante..." rows={2} />
            </Field>
            <Field label="As-tu déjà fait des analyses spécifiques ?">
              <CheckGroup
                options={[
                  "Bilan hormonal complet", "Analyse des selles (microbiote)",
                  "Test d'intolérances alimentaires", "Dosage vitamine D",
                  "Dosage fer et ferritine", "Bilan thyroïdien complet (TSH, T3, T4)",
                  "Glycémie / HbA1c", "Profil lipidique (cholestérol)", "Autre"
                ]}
                value={form.analysesSpecifiques} onChange={set("analysesSpecifiques")} columns={2}
              />
            </Field>
            <Field label="Autres examens importants (IRM, scanner, échographies...) et résultats">
              <Textarea value={form.autresExamens} onChange={set("autresExamens")} placeholder="Ex : échographie thyroïde 2024 — nodule bénin..." rows={2} />
            </Field>
          </div>
        )}

        {/* ── ÉTAPE 10 ── */}
        {etape === 10 && (
          <div>
            <SectionTitle>15. Vision & Motivation</SectionTitle>
            <Field label="Comment tu te vois dans 6 mois si tout se passe bien ?">
              <Textarea value={form.visionDans6Mois} onChange={set("visionDans6Mois")} placeholder="Décris ton idéal santé dans 6 mois..." rows={3} />
            </Field>
            <Scale label="Motivation actuelle à changer tes habitudes (1 = pas motivée, 10 = très motivée)" value={form.motivationChangement} onChange={set("motivationChangement")} />
            <div style={{ marginTop: 16 }}>
              <Field label="Qu'est-ce qui pourrait t'empêcher ou te freiner dans ta démarche ?">
                <Textarea value={form.freins} onChange={set("freins")} placeholder="Temps, finances, peur du changement, soutien de l'entourage..." rows={2} />
              </Field>
            </div>
            <Field label="Qu'attends-tu de moi en tant que naturopathe ?">
              <Textarea value={form.attentesNaturopathe} onChange={set("attentesNaturopathe")} placeholder="Ex : des conseils praticos-pratiques, être guidée pas à pas, comprendre mon corps..." rows={2} />
            </Field>
            <Field label="Tu es prête à :">
              <CheckGroup
                options={[
                  "Modifier ton alimentation",
                  "Intégrer des compléments alimentaires",
                  "Changer certaines habitudes de vie",
                  "Prendre du temps pour toi",
                  "Investir dans ta santé",
                  "Être patiente (les changements prennent du temps)"
                ]}
                value={form.pret} onChange={set("pret")} columns={2}
              />
            </Field>

            <SectionTitle>16. Informations supplémentaires</SectionTitle>
            <Field label="Y a-t-il autre chose d'important que je devrais savoir pour mieux t'accompagner ?">
              <Textarea value={form.infosSup} onChange={set("infosSup")} placeholder="Tout ce qui ne rentrait pas dans les cases précédentes..." rows={3} />
            </Field>
            <Field label="As-tu des questions avant notre première consultation ?">
              <Textarea value={form.questions} onChange={set("questions")} placeholder="N'hésite pas !" rows={2} />
            </Field>

            {/* Upload de documents */}
            <SectionTitle>📎 Tes documents & bilans</SectionTitle>
            <p style={{ color: C.textMid, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
              Tu peux joindre tes bilans sanguins, analyses, ordonnances ou tout autre document utile directement ici.
            </p>
            {docs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {docs.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                    <a href={d.url} target="_blank" rel="noreferrer" style={{ color: C.terra, fontSize: 13, textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📄 {d.name}
                    </a>
                    <button onClick={() => removeDoc(i)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16, marginLeft: 8, padding: 2 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: "block", background: C.surface, border: `1px dashed ${C.terraBorder}`, borderRadius: 10, padding: "14px 18px", textAlign: "center", cursor: "pointer", color: C.textMid, fontSize: 13 }}>
              {uploadingDocs ? "Upload en cours…" : "＋ Ajouter un document (PDF, image)"}
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                onChange={e => handleUploadDocs(Array.from(e.target.files))}
                disabled={uploadingDocs}
              />
            </label>

            {/* Bouton de soumission */}
            <div style={{ marginTop: 28, background: saved ? C.sageDim : C.terraDim, border: `1px solid ${saved ? "rgba(74,122,90,0.3)" : C.terraBorder}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
              {saved && (
                <p style={{ color: C.sage, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  ✓ Questionnaire enregistré — tu peux le modifier à tout moment.
                </p>
              )}
              <p style={{ color: C.textMid, fontSize: 12, marginBottom: 16 }}>
                🔒 Tes réponses sont confidentielles et partagées uniquement avec Meije.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 2, background: C.terra, color: "white", border: "none",
                    borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600,
                    cursor: saving ? "default" : "pointer",
                    fontFamily: "DM Sans, sans-serif", opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Enregistrement…" : saved ? "💾 Mettre à jour" : "Envoyer mon questionnaire →"}
                </button>
                {saved && (
                  <button
                    onClick={onDone}
                    style={{
                      flex: 1, background: C.surface, color: C.textMid,
                      border: `1px solid ${C.border2}`, borderRadius: 12,
                      padding: "14px 20px", fontSize: 14, cursor: "pointer",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          {etape > 1 && (
            <button
              onClick={() => setEtape(e => e - 1)}
              style={{
                flex: 1, padding: "13px 20px", borderRadius: 12,
                border: `1px solid ${C.border2}`, background: C.surface,
                color: C.textMid, fontSize: 14, cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              ← Précédent
            </button>
          )}
          {etape < ETAPES.length && (
            <button
              onClick={() => { setEtape(e => e + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                flex: 2, padding: "13px 20px", borderRadius: 12,
                border: "none", background: C.terra,
                color: "white", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "DM Sans, sans-serif",
              }}
            >
              Suivant →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
