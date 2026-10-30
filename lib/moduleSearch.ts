import { agentModules } from "./consultAgent";

export type SearchScope = "all" | "topics" | "treatment" | "tests";
// Curated discovery keywords, not retrieved module content or treatment advice.
const keywords: Record<string, [string, string, string]> = {
  "Fever guide": [
    "fever pyrexia rash dengue malaria typhoid FUO",
    "antipyretic",
    "CBC blood culture"
  ],
  "Headache guide": [
    "headache migraine tension cluster",
    "analgesia prophylaxis",
    "CT MRI"
  ],
  "Pain management": [
    "pain acute chronic",
    "analgesia analgesic NSAID",
    "pain assessment"
  ],
  "Health screening advisor": [
    "health checkup check up prevention vaccination screening",
    "prevention lifestyle",
    "screening lipid HbA1c mammography"
  ],
  "Vertigo/Syncope": [
    "vertigo dizziness syncope fainting",
    "management",
    "ECG orthostatic blood pressure"
  ],
  "Eye": [
    "eye vision conjunctivitis",
    "management",
    "visual acuity examination"
  ],
  "Sore throat, sinus, Earache": [
    "sore throat sinusitis earache otitis URI",
    "management",
    "throat examination"
  ],
  "Cough": [
    "cough respiratory",
    "management",
    "chest xray spirometry"
  ],
  "Palpitation": [
    "palpitation arrhythmia",
    "management",
    "ECG Holter"
  ],
  "Jaundice": [
    "jaundice bilirubin liver hepatitis",
    "management",
    "LFT liver function ultrasound"
  ],
  "Anemia": [
    "anemia anaemia iron deficiency",
    "iron replacement",
    "CBC ferritin B12"
  ],
  "Hyperthyroid": [
    "hyperthyroid thyrotoxicosis graves",
    "antithyroid",
    "TSH T3 T4 thyroid function"
  ],
  "Hypothyroid": [
    "hypothyroid thyroid",
    "levothyroxine",
    "TSH T4 thyroid function"
  ],
  "Gastroenterology": [
    "gastroenterology abdominal pain diarrhea constipation",
    "management",
    "endoscopy liver function"
  ],
  "Rheumatoid Arthritis": [
    "rheumatoid arthritis RA joint inflammatory",
    "DMARD",
    "RF anti CCP ESR CRP"
  ],
  "Osteoarthritis": [
    "osteoarthritis OA joint degenerative",
    "analgesia physiotherapy",
    "xray"
  ],
  "Fibromyalgia": [
    "fibromyalgia widespread pain fatigue",
    "exercise management",
    "clinical assessment"
  ],
  "Piles/Haemorrhoids/fissure": [
    "piles hemorrhoids haemorrhoids fissure rectal bleeding",
    "management",
    "anorectal examination"
  ],
  "Skin (common conditions)": [
    "skin rash dermatitis eczema fungal",
    "topical management",
    "skin examination"
  ],
  "Antibiotics guide": [
    "infection bacterial antimicrobial",
    "antibiotics antibiotic antifungal",
    "culture sensitivity"
  ],
  "Sepsis": [
    "sepsis septic shock infection",
    "antibiotics fluids vasopressor",
    "lactate blood culture"
  ],
  "Sexually Transmitted Infections": [
    "STI STD sexually transmitted infection",
    "antibiotics management",
    "HIV syphilis screening NAAT"
  ],
  "Diabetes in admitted patients": [
    "diabetes inpatient hyperglycemia hypoglycemia",
    "insulin inpatient treatment",
    "glucose HbA1c ketones"
  ],
  "Diabetes pharma treatment": [
    "diabetes mellitus DM",
    "metformin insulin SGLT2 GLP1 treatment medication",
    "glucose HbA1c renal function"
  ],
  "Hypertension in Emergency": [
    "hypertension HTN hypertensive emergency blood pressure",
    "antihypertensive",
    "blood pressure renal function ECG"
  ],
  "Hypertension assessment in ER": [
    "hypertension HTN hypertensive emergency blood pressure",
    "antihypertensive",
    "blood pressure renal function ECG"
  ],
  "Acute coronary syndrome": [
    "ACS chest pain myocardial infarction STEMI NSTEMI",
    "antiplatelet reperfusion",
    "ECG troponin coronary angiography"
  ],
  "Perioperative risk assessment": [
    "perioperative preoperative surgery risk",
    "bridging perioperative management",
    "DSE stress test echo"
  ],
  "Ventricular tachycardia origin": [
    "VT PVC ventricular tachycardia origin RVOT LVOT",
    "ablation",
    "ECG localization"
  ],
  "Ventricular Tachycardia": [
    "VT ventricular tachycardia wide QRS",
    "cardioversion antiarrhythmic",
    "ECG"
  ],
  "Tachycardia & Holter Hub": [
    "tachycardia arrhythmia palpitations",
    "management",
    "Holter ECG ambulatory monitoring"
  ],
  "Atrial fibrillation advisor": [
    "AF atrial fibrillation",
    "anticoagulation rate rhythm control",
    "ECG echo stroke risk"
  ],
  "Pacemaker and device care": [
    "pacemaker bradycardia heart block",
    "pacing device care",
    "device interrogation ECG"
  ],
  "Cardiac devices": [
    "cardiac devices ICD CRT pacemaker",
    "device therapy",
    "echo ejection fraction"
  ],
  "Lifestyle guide in CVD": [
    "cardiovascular prevention CVD",
    "lifestyle diet exercise smoking",
    "risk assessment"
  ],
  "Warfarin guide": [
    "warfarin anticoagulation",
    "warfarin bridging dose",
    "INR coagulation"
  ],
  "HFpEF": [
    "HFpEF heart failure preserved ejection fraction breathlessness",
    "diuretic SGLT2",
    "echo BNP NTproBNP"
  ],
  "Heart failure": [
    "HF HFrEF heart failure breathlessness edema",
    "diuretic GDMT SGLT2 ARNI beta blocker",
    "echo BNP NTproBNP renal function"
  ],
  "ECG in ER": [
    "ECG emergency electrocardiogram",
    "emergency management",
    "ECG electrocardiography"
  ],
  "COPD assessment": [
    "COPD chronic obstructive pulmonary disease breathlessness",
    "bronchodilator inhaler oxygen",
    "spirometry PFT pulmonary function"
  ],
  "Stroke localiser and treatment": [
    "stroke CVA weakness neurology",
    "thrombolysis thrombectomy",
    "CT MRI brain imaging"
  ],
  "Infusion Drug dose calculator": [
    "infusion ICU critical care",
    "infusion drug dose calculator",
    "dose calculation"
  ],
  "ABG (Arterial Blood Gas)": [
    "ABG acid base acidosis alkalosis",
    "management",
    "arterial blood gas ABG interpretation"
  ],
  "Cardiogenic shock": [
    "cardiogenic shock hypotension",
    "inotrope vasopressor noradrenaline dobutamine",
    "echo lactate hemodynamics"
  ],
  "IV Fluids Guide": [
    "IV fluid dehydration volume",
    "intravenous fluids crystalloid saline",
    "electrolytes fluid assessment"
  ],
  "Poisoning": [
    "poisoning overdose toxicology",
    "antidote decontamination",
    "ECG toxicology"
  ],
  "ECG": [
    "ECG electrocardiogram learning",
    "learning",
    "ECG electrocardiography"
  ],
  "C-XRAY": [
    "CXR chest xray radiograph pneumonia imaging",
    "learning",
    "chest xray reporting"
  ],
  "Strain echo": [
    "strain echocardiography GLS",
    "learning",
    "echo global longitudinal strain"
  ],
  "Volume assessment": [
    "volume overload congestion fluid status",
    "fluid management",
    "POCUS ultrasound VTI IVC volume assessment"
  ]
};
const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const ignored = new Set(["a", "an", "the", "for", "of", "in", "and", "or", "to", "find", "search", "show", "me", "please", "module", "modules", "topic", "topics", "condition", "conditions", "disease", "diseases", "treatment", "treatments", "investigation", "investigations", "test", "tests"]);
export const searchCategories = Array.from(new Set(agentModules.map(m => m.category)));
export function searchModules(query: string, scope: SearchScope = "all", category = "") {
  const tokens = normalize(query.slice(0, 300)).split(" ").filter(t => t && !ignored.has(t));
  return agentModules.flatMap(module => {
    if (category && module.category !== category) return [];
    const [topics = "", treatment = "", tests = ""] = keywords[module.id] ?? [];
    const detail = scope === "topics" ? topics : scope === "treatment" ? treatment : scope === "tests" ? tests : `${topics} ${treatment} ${tests}`;
    const title = normalize(`${module.label} ${module.category}`);
    const words = normalize(`${title} ${detail}`).split(" ");
    // AND matching avoids unrelated results for multiword queries. Prefixes support plurals.
    if (!tokens.every(t => words.some(w => w === t || (t.length > 3 && w.startsWith(t))))) return [];
    const score = tokens.reduce((n, t) => n + (title.includes(t) ? 3 : 1), 0);
    return [{ ...module, topics, treatment, tests, score }];
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}
