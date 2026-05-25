import { useState, useMemo } from "react";

const C = {
  bg: "#E8DDD0", surface: "#F5EDE2", surface2: "#DDD0C0",
  border: "rgba(139,100,60,0.15)", border2: "rgba(139,100,60,0.25)",
  text: "#1C1008", textMid: "rgba(28,16,8,0.65)", textDim: "rgba(28,16,8,0.38)",
  terra: "#B5583A", terraDim: "rgba(181,88,58,0.1)", terraBorder: "rgba(181,88,58,0.25)",
  accent: "#8A5A2A", accentDim: "rgba(138,90,42,0.1)",
  sage: "#4A7A5A", sageDim: "rgba(74,122,90,0.12)",
  orange: "#C4784A", orangeDim: "rgba(196,120,74,0.1)",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const hasArr = (arr, ...vals) => vals.some(v => (arr||[]).includes(v));
const numVal = v => parseInt(v) || 0;

const getInterp = (score, seuils) => {
  if (score >= seuils[1]) return { label: seuils[3], color: C.terra, bg: C.terraDim, border: C.terraBorder };
  if (score >= seuils[0]) return { label: seuils[2], color: C.orange, bg: C.orangeDim, border: "rgba(196,120,74,0.25)" };
  return { label: "Peu probable", color: C.sage, bg: C.sageDim, border: "rgba(74,122,90,0.25)" };
};

// ─── COMPOSANTS UI ────────────────────────────────────────────────────────────
const SectionTitle = ({ children, color }) => (
  <h3 style={{ color: color || C.terra, fontSize: 13, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", margin: "20px 0 12px", fontFamily: "DM Sans, sans-serif",
    borderBottom: `1px solid ${C.terraBorder}`, paddingBottom: 6 }}>
    {children}
  </h3>
);

const ScoreBadge = ({ score, max, interp }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, background: interp.bg,
    border: `1px solid ${interp.border}`, borderRadius: 12, padding: "12px 16px", marginTop: 12 }}>
    <div style={{ width: 52, height: 52, borderRadius: "50%", background: interp.color + "22",
      border: `2px solid ${interp.color}`, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: interp.color, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{score}</span>
      <span style={{ color: interp.color, fontSize: 10, opacity: 0.7 }}>/{max}</span>
    </div>
    <div>
      <p style={{ color: interp.color, fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{interp.label}</p>
      <p style={{ color: C.textDim, fontSize: 11, lineHeight: 1.5 }}>{interp.bilans}</p>
    </div>
  </div>
);

const ItemCheck = ({ label, points, checked, onChange }) => (
  <button onClick={() => onChange(!checked)} type="button" style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${checked ? C.terra : C.border}`,
    background: checked ? C.terraDim : C.surface,
    cursor: "pointer", marginBottom: 6, transition: "all 0.15s",
  }}>
    <span style={{ color: checked ? C.terra : C.textMid, fontSize: 13, fontFamily: "DM Sans, sans-serif",
      fontWeight: checked ? 500 : 400, flex: 1, textAlign: "left" }}>
      {checked ? "✓ " : ""}{label}
    </span>
    <span style={{ color: checked ? C.terra : C.textDim, fontSize: 11,
      background: checked ? C.terra + "22" : C.surface2,
      borderRadius: 20, padding: "2px 8px", marginLeft: 8, flexShrink: 0, fontFamily: "DM Sans, sans-serif" }}>
      +{points}
    </span>
  </button>
);

const QuestCard = ({ title, icon, children, score, max, interp, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border2}`,
      marginBottom: 16, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} type="button" style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}>{title}</p>
            <p style={{ color: interp.color, fontSize: 11, marginTop: 2, fontFamily: "DM Sans, sans-serif" }}>
              Score : {score}/{max} — {interp.label}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: interp.color + "22",
            border: `2px solid ${interp.color}`, display: "flex", alignItems: "center",
            justifyContent: "center", color: interp.color, fontWeight: 700, fontSize: 14,
            fontFamily: "DM Sans, sans-serif" }}>{score}</div>
          <span style={{ color: C.textDim, fontSize: 18, transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s" }}>▾</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
          {children}
          <ScoreBadge score={score} max={max} interp={interp} />
        </div>
      )}
    </div>
  );
};

// ─── LOGIQUE DE DÉCLENCHEMENT ─────────────────────────────────────────────────
export const getBilansDeclenchesFemme = (form) => {
  const declenchees = [];
  // SOPK
  if (hasArr(form.regulariteCycle, "Cycle irrégulier", "Absence de règles (aménorrhée)", "Règles très espacées (>35 jours)")
    || hasArr(form.symptomesHormonaux, "Acné (visage, dos, poitrine)", "Pilosité excessive (visage, corps)", "Chute de cheveux")
    || hasArr(form.habitudesAlimentaires, "J'ai des fringales")
    || hasArr(form.symptomesSPM, "Fringales (sucre, sel)"))
    declenchees.push("sopk");
  // Endométriose
  if (numVal(form.intensiteDouleurs) >= 6
    || hasArr(form.inflammationsChroniques, "Douleurs articulaires")
    || hasArr(form.symptomesSPM, "Douleurs abdominales"))
    declenchees.push("endometriose");
  // Dominance oestrogénique
  if (hasArr(form.symptomesSPM, "Seins douloureux ou gonflés", "Ballonnements, rétention d'eau", "Irritabilité, changements d'humeur")
    || hasArr(form.abondanceRegles, "Abondantes", "Très abondantes (avec caillots)")
    || hasArr(form.symptomesHormonaux, "Seins fibrokystiques"))
    declenchees.push("domEstro");
  // Déficit progestérone
  if (hasArr(form.regulariteCycle, "Cycle irrégulier", "Règles trop fréquentes (<25 jours)")
    || hasArr(form.symptomesSPM, "Anxiété, tristesse", "Insomnie")
    || (form.faussesCouches && form.faussesCouches.length > 1))
    declenchees.push("defProgeste");
  // Déficit androgènes femme
  if (hasArr(form.symptomesHormonaux, "Baisse de libido", "Chute de cheveux")
    || hasArr(form.humeurGenerale, "Apathique / manque de motivation", "Plutôt dépressif(ve) / tristesse")
    || (numVal(form.energieMatin) <= 4 && numVal(form.energieMatin) > 0))
    declenchees.push("defAndroFemme");
  // Fatigue surrénalienne
  if ((numVal(form.energieMatin) <= 4 && numVal(form.energieMatin) > 0)
    || hasArr(form.symptomesFatigue, "Épuisement après un effort léger", "Un besoin de faire des siestes")
    || hasArr(form.difficulteSommeil, "Sommeil léger / non réparateur"))
    declenchees.push("fatigueSurr");
  // Résistance insuline
  if (hasArr(form.symptomesHormonaux, "Prise de poids", "Acné (visage, dos, poitrine)")
    || hasArr(form.habitudesAlimentaires, "J'ai des fringales")
    || hasArr(form.problemeFertilite, "Oui, SOPK diagnostiqué"))
    declenchees.push("resistInsul");
  // SIBO
  if (hasArr(form.problemesDigestifs, "Ballonnements", "Gaz intestinaux importants", "Alternance constipation/diarrhée")
    || hasArr(form.antibiotiquesRecents, "Oui, dans les 3 derniers mois", "Oui, dans les 6-12 derniers mois")
    || hasArr(form.antecedentsDigestifs, "SIBO (prolifération bactérienne)", "Colopathie / Intestin irritable"))
    declenchees.push("sibo");
  // Hyperperméabilité
  if (hasArr(form.maladiesAutoImmunes, "Hashimoto", "Polyarthrite rhumatoïde", "Lupus", "Psoriasis")
    || hasArr(form.intolerancesAlimentaires, "Gluten", "Lactose / Produits laitiers", "Œufs", "Fruits à coque")
    || form.infect_candidose === "Oui")
    declenchees.push("hyperPerm");
  // Déficit fer
  if (hasArr(form.abondanceRegles, "Abondantes", "Très abondantes (avec caillots)")
    || hasArr(form.symptomesHormonaux, "Chute de cheveux")
    || hasArr(form.symptomesFatigue, "Épuisement après un effort léger"))
    declenchees.push("defFer");
  // Histamine
  if (hasArr(form.allergies, "Pollens / Rhume des foins")
    || hasArr(form.symptomesSPM, "Maux de tête / Migraines")
    || hasArr(form.intolerancesAlimentaires, "Histamine")
    || hasArr(form.problemesPeau, "Rosacée", "Urticaire")
    || hasArr(form.problemesORL, "Rhinites allergiques"))
    declenchees.push("histamine");
  return declenchees;
};

export const getBilansDeclenchesHomme = (form) => {
  const declenchees = [];
  // Déficit testostérone
  if ((numVal(form.libido) <= 4 && numVal(form.libido) > 0)
    || (numVal(form.vitaliteGenerale) <= 4 && numVal(form.vitaliteGenerale) > 0)
    || form.masseMuscuDifficulte?.includes("Oui"))
    declenchees.push("defTesto");
  // Dominance oestrogénique homme
  if (hasArr(form.humeurHomme, "Irritabilité ou agressivité accrue", "Anxiété ou nervosité inhabituelle")
    || hasArr(form.symptomesFatigue, "Épuisement après un effort léger"))
    declenchees.push("domEstroH");
  // Fatigue surrénalienne
  if ((numVal(form.energieMatin) <= 4 && numVal(form.energieMatin) > 0)
    || hasArr(form.symptomesFatigue, "Épuisement après un effort léger", "Un besoin de faire des siestes"))
    declenchees.push("fatigueSurr");
  // Résistance insuline
  if (hasArr(form.habitudesAlimentaires, "J'ai des fringales")
    || hasArr(form.symptomesFatigue, "Difficulté à te concentrer par fatigue"))
    declenchees.push("resistInsul");
  // SIBO
  if (hasArr(form.problemesDigestifs, "Ballonnements", "Gaz intestinaux importants")
    || hasArr(form.antibiotiquesRecents, "Oui, dans les 3 derniers mois", "Oui, dans les 6-12 derniers mois"))
    declenchees.push("sibo");
  // Hyperperméabilité
  if (hasArr(form.maladiesAutoImmunes, "Hashimoto", "Polyarthrite rhumatoïde", "Lupus", "Psoriasis")
    || hasArr(form.intolerancesAlimentaires, "Gluten", "Lactose / Produits laitiers"))
    declenchees.push("hyperPerm");
  // Déficit fer
  if (hasArr(form.symptomesFatigue, "Épuisement après un effort léger")
    || hasArr(form.regimeAlimentaire, "Végétarien", "Végétalien / Vegan"))
    declenchees.push("defFer");
  // Histamine
  if (hasArr(form.allergies, "Pollens / Rhume des foins")
    || hasArr(form.intolerancesAlimentaires, "Histamine")
    || hasArr(form.problemesPeau, "Rosacée", "Urticaire")
    || hasArr(form.problemesORL, "Rhinites allergiques"))
    declenchees.push("histamine");
  return declenchees;
};

// ─── QUESTIONNAIRES ───────────────────────────────────────────────────────────

function QuestSopk({ scores, setScores }) {
  const items = [
    { key: "sopk_cycleIrreg", label: "Cycles irréguliers ou absents", pts: 2 },
    { key: "sopk_acne", label: "Acné (visage, dos, poitrine)", pts: 1 },
    { key: "sopk_pilosite", label: "Pilosité excessive (visage, menton, ventre)", pts: 2 },
    { key: "sopk_cheveux", label: "Chute de cheveux / calvitie féminine", pts: 1 },
    { key: "sopk_poids", label: "Prise de poids abdominale difficile à perdre", pts: 2 },
    { key: "sopk_fringales", label: "Fringales de sucre intenses", pts: 1 },
    { key: "sopk_fatigueRepas", label: "Fatigue après les repas", pts: 1 },
    { key: "sopk_libido", label: "Baisse de libido", pts: 1 },
    { key: "sopk_douleurs", label: "Règles douloureuses ET abondantes", pts: 1 },
    { key: "sopk_fertilite", label: "Difficulté à concevoir", pts: 2 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 8, "Suspicion modérée — bilan hormonal recommandé", "Suspicion forte — LH/FSH, testostérone, HOMA-IR"]);
  interp.bilans = score < 4 ? "" : score < 8 ? "Bilan recommandé : LH/FSH, testostérone libre, AMH, HOMA-IR" : "Bilan urgent : LH/FSH, testostérone, AMH, HOMA-IR, échographie pelvienne";
  return (
    <QuestCard title="SOPK" icon="🌸" score={score} max={14} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestEndometriose({ scores, setScores }) {
  const items = [
    { key: "endo_douleurs", label: "Douleurs menstruelles intenses (≥ 6/10)", pts: 2 },
    { key: "endo_ovulation", label: "Douleurs à l'ovulation", pts: 2 },
    { key: "endo_rapports", label: "Douleurs pendant les rapports sexuels", pts: 2 },
    { key: "endo_selles", label: "Douleurs à la selle pendant les règles", pts: 2 },
    { key: "endo_pelviens", label: "Douleurs pelviennes en dehors des règles", pts: 2 },
    { key: "endo_abondance", label: "Règles très abondantes avec caillots", pts: 1 },
    { key: "endo_fatigue", label: "Fatigue intense pendant les règles", pts: 1 },
    { key: "endo_ballons", label: "Ballonnements importants pendant les règles", pts: 1 },
    { key: "endo_urinaire", label: "Symptômes urinaires pendant les règles", pts: 1 },
    { key: "endo_fertilite", label: "Difficulté à concevoir", pts: 2 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 9, "Suspicion modérée — suivi gynécologique recommandé", "Suspicion forte — consultation spécialisée"]);
  interp.bilans = score < 4 ? "" : score < 9 ? "Suivi gynécologique recommandé + échographie pelvienne" : "Consultation spécialisée — IRM pelvienne + laparoscopie diagnostique à envisager";
  return (
    <QuestCard title="Endométriose" icon="🔴" score={score} max={16} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestDomEstroFemme({ scores, setScores }) {
  const items = [
    { key: "de_seins", label: "Seins gonflés / fibrokystiques avant les règles", pts: 2 },
    { key: "de_spm", label: "SPM intense (irritabilité, pleurs, anxiété)", pts: 2 },
    { key: "de_regles", label: "Règles abondantes avec caillots", pts: 2 },
    { key: "de_retention", label: "Rétention d'eau importante", pts: 1 },
    { key: "de_poids", label: "Prise de poids hanches / cuisses", pts: 1 },
    { key: "de_migraines", label: "Migraines liées au cycle", pts: 2 },
    { key: "de_humeur", label: "Sautes d'humeur importantes", pts: 1 },
    { key: "de_sommeil", label: "Difficultés à dormir en 2ème partie de cycle", pts: 1 },
    { key: "de_fibrome", label: "Antécédents fibromes ou kystes ovariens", pts: 2 },
    { key: "de_pilule", label: "Contraception hormonale longue durée (> 5 ans)", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 9, "Suspicion modérée — dosage hormonal recommandé", "Suspicion forte — bilan hormonal complet"));
  interp.bilans = score < 4 ? "" : score < 9 ? "Dosage E2 + progestérone J21 + prolactine" : "Bilan complet : E2, progestérone, LH, FSH, prolactine, SHBG";
  return (
    <QuestCard title="Dominance œstrogénique" icon="🌊" score={score} max={15} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestDefProgeste({ scores, setScores }) {
  const items = [
    { key: "dp_anxiete", label: "Anxiété / irritabilité en 2ème partie de cycle", pts: 2 },
    { key: "dp_insomnie", label: "Insomnie ou sommeil perturbé avant les règles", pts: 2 },
    { key: "dp_cycle", label: "Cycles courts (< 25 jours)", pts: 2 },
    { key: "dp_spotting", label: "Spottings avant les règles", pts: 2 },
    { key: "dp_fc", label: "Fausses couches répétées", pts: 2 },
    { key: "dp_fertilite", label: "Difficultés à concevoir", pts: 1 },
    { key: "dp_deprime", label: "Déprime / larmes faciles avant les règles", pts: 1 },
    { key: "dp_brutal", label: "Règles qui arrivent brutalement sans transition", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 8, "Suspicion modérée — dosage progestérone J21", "Suspicion forte — bilan complet + consultation"));
  interp.bilans = score < 4 ? "" : score < 8 ? "Dosage progestérone J21 + courbe de température" : "Bilan complet : progestérone J21, LH, FSH, E2 + consultation";
  return (
    <QuestCard title="Déficit en progestérone" icon="🌙" score={score} max={13} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestDefAndroFemme({ scores, setScores }) {
  const items = [
    { key: "da_libido", label: "Libido très basse ou absente", pts: 2 },
    { key: "da_fatigue", label: "Fatigue profonde malgré sommeil suffisant", pts: 2 },
    { key: "da_muscle", label: "Perte de tonus musculaire sans raison", pts: 2 },
    { key: "da_deprime", label: "Dépression / humeur basse chronique", pts: 1 },
    { key: "da_secheresse", label: "Sécheresse vaginale (hors ménopause)", pts: 1 },
    { key: "da_apathie", label: "Manque de motivation / apathie", pts: 1 },
    { key: "da_poils", label: "Perte de poils pubiens / axillaires", pts: 2 },
    { key: "da_pilule", label: "Pilule combinée en cours ou arrêt récent (< 1 an)", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 8, "Suspicion modérée — dosage testostérone libre + DHEA-S", "Suspicion forte — bilan androgènes complet"));
  interp.bilans = score < 4 ? "" : score < 8 ? "Dosage testostérone libre, DHEA-S, SHBG" : "Bilan androgènes complet : testostérone totale + libre, DHEA-S, SHBG, delta-4-androstènedione";
  return (
    <QuestCard title="Déficit en androgènes (femme)" icon="⚡" score={score} max={12} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestDefTesto({ scores, setScores }) {
  const items = [
    { key: "dt_libido", label: "Baisse de libido", pts: 2 },
    { key: "dt_erection", label: "Dysfonction érectile", pts: 2 },
    { key: "dt_fatigue", label: "Fatigue chronique / manque d'énergie", pts: 2 },
    { key: "dt_muscle", label: "Perte de masse musculaire malgré l'effort", pts: 2 },
    { key: "dt_poids", label: "Prise de poids abdominale", pts: 1 },
    { key: "dt_irritable", label: "Irritabilité / humeur instable", pts: 1 },
    { key: "dt_deprime", label: "Dépression / manque de motivation", pts: 1 },
    { key: "dt_calvitie", label: "Calvitie accélérée", pts: 1 },
    { key: "dt_sommeil", label: "Troubles du sommeil", pts: 1 },
    { key: "dt_bouffees", label: "Bouffées de chaleur (homme)", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 9, "Suspicion modérée — dosage testostérone recommandé", "Suspicion forte — bilan hormonal complet homme"));
  interp.bilans = score < 4 ? "" : score < 9 ? "Dosage testostérone totale + SHBG (matin, à jeun)" : "Bilan hormonal complet : testostérone totale + libre, SHBG, LH, FSH, prolactine, E2";
  return (
    <QuestCard title="Déficit en testostérone" icon="💪" score={score} max={14} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestDomEstroHomme({ scores, setScores }) {
  const items = [
    { key: "deh_gyneco", label: "Gynécomastie (sensibilité / gonflement poitrine)", pts: 3 },
    { key: "deh_retention", label: "Rétention d'eau / gonflement", pts: 1 },
    { key: "deh_poids", label: "Prise de poids hanches / cuisses", pts: 2 },
    { key: "deh_fatigue", label: "Fatigue chronique inexpliquée", pts: 1 },
    { key: "deh_libido", label: "Baisse de libido", pts: 1 },
    { key: "deh_humeur", label: "Humeur instable / émotivité accrue", pts: 1 },
    { key: "deh_muscle", label: "Difficultés à prendre du muscle", pts: 1 },
    { key: "deh_alcool", label: "Consommation d'alcool régulière", pts: 1 },
    { key: "deh_surpoids", label: "Surpoids / obésité abdominale", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 8, "Suspicion modérée — ratio testostérone / estradiol", "Suspicion forte — bilan hormonal complet"));
  interp.bilans = score < 4 ? "" : score < 8 ? "Dosage estradiol + testostérone + SHBG" : "Bilan complet : E2, testostérone totale + libre, SHBG, prolactine, LH, FSH";
  return (
    <QuestCard title="Dominance œstrogénique (homme)" icon="⚖️" score={score} max={12} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestFatigueSurr({ scores, setScores }) {
  const items = [
    { key: "fs_matin", label: "Fatigue intense au réveil malgré sommeil suffisant", pts: 2 },
    { key: "fs_15h", label: "Coup de barre systématique vers 15h-16h", pts: 2 },
    { key: "fs_stimulants", label: "Besoin de café / sucre pour fonctionner", pts: 1 },
    { key: "fs_soir", label: "Énergie qui remonte le soir (inversion du rythme)", pts: 2 },
    { key: "fs_sensibilite", label: "Hypersensibilité au bruit / à la lumière", pts: 1 },
    { key: "fs_stress", label: "Difficultés à gérer le stress", pts: 1 },
    { key: "fs_infections", label: "Infections fréquentes / lente récupération", pts: 1 },
    { key: "fs_sel", label: "Envie de sel intense / nourriture salée", pts: 2 },
    { key: "fs_palpi", label: "Palpitations sous stress", pts: 1 },
    { key: "fs_chronique", label: "Stress chronique depuis plusieurs mois / années", pts: 1 },
    { key: "fs_emotionnel", label: "Sensation d'être à plat après un effort émotionnel", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [5, 10, "Suspicion modérée — cortisol salivaire recommandé", "Suspicion forte — bilan surrénalien complet"));
  interp.bilans = score < 5 ? "" : score < 10 ? "Cortisol salivaire x4/jour + DHEA-S" : "Bilan surrénalien complet : cortisol x4, DHEA-S, test ACTH, NFS";
  return (
    <QuestCard title="Fatigue surrénalienne" icon="🔋" score={score} max={15} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestResistInsul({ scores, setScores }) {
  const items = [
    { key: "ri_fringales", label: "Fringales intenses après les repas", pts: 2 },
    { key: "ri_fatigue", label: "Fatigue / somnolence post-repas", pts: 2 },
    { key: "ri_poids", label: "Prise de poids abdominale résistante", pts: 2 },
    { key: "ri_regime", label: "Difficulté à perdre du poids malgré régime", pts: 2 },
    { key: "ri_envies", label: "Envies de sucre / glucides constants", pts: 2 },
    { key: "ri_acne", label: "Acné hormonale", pts: 1 },
    { key: "ri_taches", label: "Taches sombres (cou, aisselles, plis)", pts: 2 },
    { key: "ri_trigly", label: "Triglycérides élevés (si connus)", pts: 2 },
    { key: "ri_sopk", label: "SOPK diagnostiqué", pts: 2 },
    { key: "ri_atcd", label: "Antécédents familiaux de diabète type 2", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [5, 11, "Suspicion modérée — glycémie à jeun + insulinémie", "Suspicion forte — bilan métabolique complet"));
  interp.bilans = score < 5 ? "" : score < 11 ? "Glycémie à jeun + insulinémie à jeun + HOMA-IR" : "Bilan complet : glycémie + insuline + HOMA-IR + HbA1c + bilan lipidique";
  return (
    <QuestCard title="Résistance à l'insuline" icon="🍬" score={score} max={18} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestSibo({ scores, setScores, form }) {
  // Score antibio basé sur les champs histoire infectieuse
  const antibioTotal = form?.infect_antibio_total || "";
  const antibioRecente = form?.infect_antibio_derniere || "";
  const antibioPoints = (antibioTotal === "Plus de 10" || antibioTotal === "4 à 10") ? 2 : 0;
  // Antibio récente < 12 mois — on check si la date contient l'année en cours ou l'année passée
  const now = new Date();
  const recentYear = antibioRecente && (antibioRecente.includes(String(now.getFullYear())) || antibioRecente.includes(String(now.getFullYear() - 1)));
  const antibioRecentePoints = recentYear ? 2 : 0;

  const items = [
    { key: "sb_ballons", label: "Ballonnements importants après les repas", pts: 2 },
    { key: "sb_gaz", label: "Gaz intestinaux excessifs", pts: 2 },
    { key: "sb_alternance", label: "Alternance constipation / diarrhée", pts: 2 },
    { key: "sb_fibres", label: "Symptômes qui empirent avec fibres / légumineuses", pts: 2 },
    { key: "sb_brouillard", label: "Brouillard mental après les repas", pts: 2 },
    { key: "sb_fatigue", label: "Fatigue post-prandiale importante", pts: 1 },
    { key: "sb_intolerances", label: "Intolérances à plusieurs aliments", pts: 1 },
    { key: "sb_colop", label: "Antécédents colopathie / intestin irritable", pts: 2 },
    { key: "sb_jeune", label: "Amélioration des symptômes en jeûnant", pts: 1 },
  ];
  const scoreItems = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const score = scoreItems + antibioPoints + antibioRecentePoints;
  const max = 17 + 4;
  const interp = getInterp(score, [5, 11, "Suspicion modérée — test respiratoire recommandé", "Suspicion forte — consultation gastro + test SIBO"));
  interp.bilans = score < 5 ? "" : score < 11 ? "Test respiratoire au lactulose ou glucose" : "Consultation gastro + test SIBO + analyse de selles (microbiote)";
  return (
    <QuestCard title="SIBO / Dysbiose intestinale" icon="🦠" score={score} max={max} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
        <div style={{ background: antibioPoints > 0 || antibioRecentePoints > 0 ? C.terraDim : C.surface2,
          border: `1px solid ${antibioPoints > 0 || antibioRecentePoints > 0 ? C.terraBorder : C.border}`,
          borderRadius: 10, padding: "10px 14px", marginTop: 8 }}>
          <p style={{ color: C.textMid, fontSize: 12, fontFamily: "DM Sans, sans-serif" }}>
            🔗 Points automatiques depuis ton historique infectieux :
          </p>
          <p style={{ color: C.textDim, fontSize: 11, marginTop: 4, fontFamily: "DM Sans, sans-serif" }}>
            Cures antibiotiques sur la vie ({antibioTotal || "non renseigné"}) : <strong>+{antibioPoints}</strong><br />
            Antibiotiques récents (&lt; 12 mois) : <strong>+{antibioRecentePoints}</strong>
          </p>
        </div>
      </div>
    </QuestCard>
  );
}

function QuestHyperPerm({ scores, setScores }) {
  const items = [
    { key: "hp_intolerances", label: "Intolérances alimentaires multiples (≥ 3)", pts: 2 },
    { key: "hp_autoimmun", label: "Maladie auto-immune diagnostiquée", pts: 2 },
    { key: "hp_peau", label: "Problèmes de peau réactifs (eczéma, urticaire, psoriasis)", pts: 1 },
    { key: "hp_brouillard", label: "Brouillard mental chronique", pts: 1 },
    { key: "hp_fatigue", label: "Fatigue inexpliquée persistante", pts: 1 },
    { key: "hp_articul", label: "Douleurs articulaires diffuses", pts: 1 },
    { key: "hp_ains", label: "Prise régulière d'anti-inflammatoires (ibuprofène, aspirine)", pts: 1 },
    { key: "hp_antibio", label: "Antécédents d'antibiothérapies répétées", pts: 1 },
    { key: "hp_stress", label: "Stress chronique intense et prolongé", pts: 1 },
    { key: "hp_candidose", label: "Candidose récurrente", pts: 2 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 8, "Suspicion modérée — zonuline + calprotectine", "Suspicion forte — bilan intestinal complet"));
  interp.bilans = score < 4 ? "" : score < 8 ? "Zonuline sérique + calprotectine fécale" : "Bilan intestinal complet : zonuline, calprotectine, LPS, analyse microbiote";
  return (
    <QuestCard title="Hyperperméabilité intestinale" icon="🔓" score={score} max={13} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

function QuestDefFer({ scores, setScores }) {
  const items = [
    { key: "df_fatigue", label: "Fatigue persistante inexpliquée", pts: 2 },
    { key: "df_cheveux", label: "Chute de cheveux importante", pts: 2 },
    { key: "df_ongles", label: "Ongles cassants / striés / en cuillère", pts: 1 },
    { key: "df_paleur", label: "Pâleur du teint / des muqueuses", pts: 2 },
    { key: "df_essouf", label: "Essoufflement à l'effort", pts: 1 },
    { key: "df_palpi", label: "Palpitations", pts: 1 },
    { key: "df_jambes", label: "Syndrome des jambes sans repos", pts: 2 },
    { key: "df_concentration", label: "Difficultés de concentration / mémoire", pts: 1 },
    { key: "df_regles", label: "Règles abondantes (femme)", pts: 2 },
    { key: "df_regime", label: "Régime végétarien / vegan", pts: 1 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [4, 9, "Suspicion modérée — NFS + ferritine recommandés", "Suspicion forte — bilan martial complet urgent"));
  interp.bilans = score < 4 ? "" : score < 9 ? "NFS + ferritine + fer sérique + transferrine" : "Bilan martial urgent : NFS, ferritine, fer sérique, transferrine, saturation transferrine, réticulocytes";
  return (
    <QuestCard title="Déficit en fer / Anémie" icon="🩸" score={score} max={15} interp={interp}>
      <div style={{ marginTop: 14 }}>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

function QuestHistamine({ scores, setScores }) {
  const items = [
    { key: "hi_migraines", label: "Maux de tête / migraines après certains aliments", pts: 2 },
    { key: "hi_rougeurs", label: "Rougeurs du visage après alcool ou repas riches", pts: 2 },
    { key: "hi_urticaire", label: "Urticaire / démangeaisons sans cause allergique connue", pts: 2 },
    { key: "hi_rosacee", label: "Rosacée ou peau très réactive / flush", pts: 1 },
    { key: "hi_rhinite", label: "Congestion nasale / rhinite sans allergie identifiée", pts: 2 },
    { key: "hi_palpi", label: "Palpitations après les repas", pts: 2 },
    { key: "hi_digestif", label: "Diarrhées / crampes après vin rouge, fromage, charcuterie", pts: 2 },
    { key: "hi_fatigue", label: "Fatigue intense après certains repas", pts: 1 },
    { key: "hi_ferments", label: "Symptômes qui empirent avec alcool, fermentés, conserves", pts: 2 },
    { key: "hi_regles", label: "Règles très douloureuses (pic histamine en phase folliculaire)", pts: 1 },
    { key: "hi_antihistam", label: "Amélioration notable avec antihistaminiques", pts: 2 },
  ];
  const score = items.reduce((s, i) => s + (scores[i.key] ? i.pts : 0), 0);
  const interp = getInterp(score, [5, 11, "Suspicion modérée — éviction test recommandée", "Suspicion forte — dosage DAO + test d'éviction strict"]);
  interp.bilans = score < 5 ? "" : score < 11
    ? "Test d'éviction histamine 4 semaines + journal alimentaire"
    : "Dosage DAO sérique + histaminémie + test d'éviction strict 4 semaines";
  return (
    <QuestCard title="Intolérance à l'histamine" icon="🌡️" score={score} max={19} interp={interp}>
      <div style={{ marginTop: 14 }}>
        <div style={{ background: "rgba(138,90,42,0.06)", border: "1px solid rgba(138,90,42,0.15)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <p style={{ color: C.accent, fontSize: 12, fontFamily: "DM Sans, sans-serif", lineHeight: 1.6 }}>
            💡 Aliments riches en histamine : vin rouge, fromages affinés, charcuteries, poisson fumé,
            conserves, tomates, épinards, aubergines, avocats, fraises, chocolat, alcool.
          </p>
        </div>
        {items.map(i => <ItemCheck key={i.key} label={i.label} points={i.pts} checked={!!scores[i.key]} onChange={v => setScores(p => ({ ...p, [i.key]: v }))} />)}
      </div>
    </QuestCard>
  );
}

// ─── COMPOSANT PRINCIPAL (export) ─────────────────────────────────────────────
export default function BilansFonctionnels({ form, bilanScores, setBilanScores }) {
  const estHomme = form?.genre === "Homme";
  const declenchees = useMemo(() =>
    estHomme ? getBilansDeclenchesHomme(form) : getBilansDeclenchesFemme(form),
    [form, estHomme]
  );


  if (declenchees.length === 0) {
    return (
      <div style={{ background: C.sageDim, border: "1px solid rgba(74,122,90,0.25)", borderRadius: 14,
        padding: "24px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 24, marginBottom: 10 }}>🌿</p>
        <p style={{ color: C.sage, fontSize: 14, fontWeight: 600, marginBottom: 6,
          fontFamily: "DM Sans, sans-serif" }}>Aucun bilan fonctionnel ciblé</p>
        <p style={{ color: C.textDim, fontSize: 13, lineHeight: 1.6, fontFamily: "DM Sans, sans-serif" }}>
          D'après tes réponses précédentes, aucun bilan spécifique n'est déclenché pour l'instant. C'est une bonne nouvelle 🌿
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: C.textMid, fontSize: 13, marginBottom: 20, lineHeight: 1.7,
        fontFamily: "DM Sans, sans-serif" }}>
        Ces bilans fonctionnels ont été sélectionnés automatiquement d'après tes réponses précédentes.
        Coche les symptômes qui te correspondent pour affiner le score.
      </p>
      {!estHomme && declenchees.includes("sopk") && <QuestSopk scores={bilanScores} setScores={setBilanScores} />}
      {!estHomme && declenchees.includes("endometriose") && <QuestEndometriose scores={bilanScores} setScores={setBilanScores} />}
      {!estHomme && declenchees.includes("domEstro") && <QuestDomEstroFemme scores={bilanScores} setScores={setBilanScores} />}
      {!estHomme && declenchees.includes("defProgeste") && <QuestDefProgeste scores={bilanScores} setScores={setBilanScores} />}
      {!estHomme && declenchees.includes("defAndroFemme") && <QuestDefAndroFemme scores={bilanScores} setScores={setBilanScores} />}
      {estHomme && declenchees.includes("defTesto") && <QuestDefTesto scores={bilanScores} setScores={setBilanScores} />}
      {estHomme && declenchees.includes("domEstroH") && <QuestDomEstroHomme scores={bilanScores} setScores={setBilanScores} />}
      {declenchees.includes("fatigueSurr") && <QuestFatigueSurr scores={bilanScores} setScores={setBilanScores} />}
      {declenchees.includes("resistInsul") && <QuestResistInsul scores={bilanScores} setScores={setBilanScores} />}
      {declenchees.includes("sibo") && <QuestSibo scores={bilanScores} setScores={setBilanScores} form={form} />}
      {declenchees.includes("hyperPerm") && <QuestHyperPerm scores={bilanScores} setScores={setBilanScores} />}
      {declenchees.includes("defFer") && <QuestDefFer scores={bilanScores} setScores={setBilanScores} />}
      {declenchees.includes("histamine") && <QuestHistamine scores={bilanScores} setScores={setBilanScores} />}
    </div>
  );
}
