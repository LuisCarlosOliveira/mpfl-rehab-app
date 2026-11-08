// The sources table of the protocol generator.
// Every entry is copied from research/citation-audit.md, research/rehab-rules.md and
// research/source-audit.md. Every quote is findable in citation-audit.md or rehab-rules.md.
// A test reads both files and checks each quote.
// `verified` is true only when the audit verdict of every row used is EXACT.
// A PARAPHRASED source uses the corrected wording of the audit. A WRONG row is not used.

export const AUDIT_DATE = '2026-11-08';

export const GRADES = ['CONSENSUS', 'REVIEW', 'STUDY', 'OPINION', 'NONE', 'ENGINEERING'] as const;
export type Grade = (typeof GRADES)[number];

export type AuditVerdict = 'EXACT' | 'PARAPHRASED' | 'NOT AUDITED';

export interface Source {
  id: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
  url: string;
  studyType: string;
  population: string;
  claim: string;
  /** Exact text, as the two research files print it. */
  quotes: readonly string[];
  grade: Grade;
  audit: AuditVerdict;
  /** Rows of research/citation-audit.md that cover the quotes. */
  auditRows: readonly string[];
  checked: string;
  verified: boolean;
}

type Draft<I extends string> = Omit<Source, 'checked' | 'verified' | 'id'> & { id: I };

const entry = <const I extends string>(d: Draft<I>): Source & { id: I } => ({
  ...d,
  checked: AUDIT_DATE,
  verified: d.audit === 'EXACT',
});

const list = [
  entry({
    id: 'S1',
    authors: 'Hsu CJ, Lee C, Christensen RS, Liu TY',
    year: 2025,
    title: 'Current concept review: MPFLR from rehabilitation to return to sport',
    venue: 'Int J Sports Phys Ther 2025;20(7):1074-1090',
    url: 'https://doi.org/10.26603/001c.141128 (PMC12222034)',
    studyType: 'Clinical commentary, level of evidence 5',
    population: 'Isolated and combined MPFL reconstruction, no age limit stated',
    claim: 'Phase weeks, straight leg raise from day 0, progression by criteria, phase 1 exit checks',
    quotes: [
      '0 to 6 weeks',
      '6-12 weeks',
      '12-16 weeks',
      'progress through phases based on meeting clinical criteria',
      'should be started immediately after the surgery',
      'Full knee extension',
      'Straight leg raise without extension lag',
      'Walking without crutches',
      "ROM should be initiated within the first two weeks of surgery and progressed per surgeons' protocol",
      'Typically, patients start 0°-30° in the first or second week and progress by 20°- 30° per week',
    ],
    grade: 'OPINION',
    audit: 'EXACT',
    auditRows: ['V3', 'V5', 'V7', 'V10', 'V38', 'V63'],
  }),
  entry({
    id: 'P1',
    authors: 'Hospital for Special Surgery',
    year: 2024,
    title: 'MPFL reconstruction post-operative guideline (created 6/2020, revised 8/2024)',
    venue: 'Hospital for Special Surgery, institution guideline',
    url: 'https://www.hss.edu/globalassets/files/rehab/guidelines/hssrehabilitationclinicalguidelines-knee-medialpatellofemoralligament-mpfl-reconstruction-post-operative.pdf',
    studyType: 'Institution guideline, no evidence grades',
    population: 'MPFL reconstruction, no age limit stated',
    claim: 'Phase weeks 0-6 and 7-11. No active open chain knee extension. Heel slides start in phase 2. Surgeon sets the range',
    quotes: [
      'Phase 1 (weeks 0-6)',
      'Phase 2 (weeks 7-11)',
      'Do not perform AROM open chain KE',
      'unless cleared by surgeon',
      'Avoid KF ROM beyond surgeon guidelines',
      'heel slides once KF >120',
      'Follow most conservative guideline',
    ],
    grade: 'OPINION',
    // V47 and V14 are PARAPHRASED. V37 is WRONG for the old claim, so only its corrected wording is used.
    audit: 'PARAPHRASED',
    auditRows: ['V12', 'V14', 'V34', 'V37', 'V47'],
  }),
  entry({
    id: 'P2',
    authors: "Cincinnati Children's Hospital Medical Center",
    year: 2015,
    title: 'Evidence-Based Care Guideline 46, Post-Operative Management of Lateral Patellar Dislocations and Instability',
    venue: "Cincinnati Children's Hospital Medical Center, January 2015",
    url: 'https://www.cincinnatichildrens.org/-/media/cincinnati%20childrens/home/service/j/anderson-center/evidence-based-care/recommendations/type/lateral%20pattelar%20-%20post%20operative%20guideline%2046',
    studyType: 'Institution guideline. Level 5 items, weak strength ("It is recommended")',
    population: 'Ages 8 to 25, MPFL repair, reconstruction or revision, isolated soft tissue surgery. Excludes realignment',
    claim: 'Strengthening dose, terminal extension avoided, red flags, exclusion of combined surgery',
    quotes: [
      'strengthening exercises are initiated in2 sets of 10-15 repetitions of exercises as appropriate, with progression to 3 sets of each exercise as tolerated',
      'This recommendation applies for all strengthening exercises for all phases',
      'short arc quadriceps exercises (knee extension from 30° to 0°) and long arc quadriceps exercises in the terminal range of 30° to 0° are avoided',
      'Signs of deep vein thrombosis (DVT)',
      'Persistent or recurrent effusion',
      'Unexpected loss or minimal progression of ROM',
      'Catching, locking, or persistent pathological end feel with passive ROM',
      'Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation',
      'Achieve ≥ 120º by 6 weeks post- operation',
      'With patellofemoral re-alignment techniques as part of the surgical procedure (e.g. lateral retinacular release, tibial tubercle re-alignment)',
    ],
    grade: 'OPINION',
    audit: 'EXACT',
    auditRows: ['V11', 'V33', 'V45', 'V49', 'V55'],
  }),
  entry({
    id: 'P3',
    authors: 'NHS Lothian Physiotherapy Orthopaedic Guidelines',
    year: 2022,
    title: 'MPFL Reconstruction guidelines (May 2022, review May 2027)',
    venue: 'NHS Lothian, regional guideline',
    url: 'https://apps.nhslothian.scot/files/sites/2/MPFL-Guidelines-2022-1-1.pdf',
    studyType: 'Regional guideline. Literature search 2012 to 2021, mostly expert opinion',
    population: 'MPFL reconstruction, no age limit stated',
    claim: 'Heel slides in phase 1. Mini squats and open chain work from week 2. Timescales are approximate',
    quotes: [
      'Commence heel slides',
      '2 weeks to 12 weeks approximately',
      '12 weeks to discharge',
      'mini squats, leg press, heel raises, step ups',
      'OKC quadriceps exercises should be progressed as able',
      'timescales are approximate, and rehabilitation should be guided, at each stage, by minimal swelling, resolution of pain, good muscle recruitment',
    ],
    grade: 'OPINION',
    audit: 'EXACT',
    auditRows: ['V4', 'V6', 'V36', 'V41'],
  }),
  entry({
    id: 'N1',
    authors: 'Hurley ET et al',
    year: 2023,
    title: 'A modified Delphi consensus statement on patellar instability: part II',
    venue: 'Bone Joint J 2023;105-B(12):1265-1270',
    url: 'https://doi.org/10.1302/0301-620X.105B12.BJJ-2023-0110.R1',
    studyType: 'Modified Delphi, 60 surgeons, 11 countries. Abstract only',
    population: 'Patellar instability, surgeons',
    claim: 'No consensus on immobilization or weight-bearing',
    quotes: ['no consensus on postoperative immobilization or weightbearing'],
    grade: 'CONSENSUS',
    audit: 'EXACT',
    auditRows: ['V23'],
  }),
  entry({
    id: 'N3',
    authors: 'Hysing-Dahl T, Inderhaug E',
    year: 2024,
    title: 'Rehabilitation after surgery for patellar instability',
    venue: 'J Exp Orthop 2024;11(3):e12062 (PMC11180699)',
    url: 'https://doi.org/10.1002/jeo2.12062',
    studyType: 'Editorial with a suggested protocol. Read in full by the citation audit (finding M1)',
    population: 'MPFL reconstruction, isolated and with bony procedures',
    claim: 'A disagreeing source. Passive flexion above 125 degrees in weeks 0 to 6. Open chain limited after bony procedures',
    quotes: [
      'Passive knee flexion of >125°',
      'Mini squats range 0–50° knee flexion',
      'Avoid open chain quadriceps exercises to avoid pull at osteotomy site through patellar tendon',
    ],
    grade: 'OPINION',
    audit: 'NOT AUDITED',
    auditRows: ['M1'],
  }),
  entry({
    id: 'S10',
    authors: 'Vidra M et al',
    year: 2026,
    title: 'Rehabilitation protocols after patellar instability surgery',
    venue: 'Curr Rev Musculoskelet Med 2026;19(1):45 (PMC13247021)',
    url: 'https://doi.org/10.1007/s12178-026-10036-9',
    studyType: 'Structured review of 63 protocol entries',
    population: 'Isolated MPFL reconstruction and tibial tubercle osteotomy protocols',
    claim: 'Practice after a bone procedure is more protective than after isolated surgery',
    quotes: ['delayed or non weight bearing (56%)'],
    grade: 'REVIEW',
    audit: 'EXACT',
    auditRows: ['V31'],
  }),
  entry({
    id: 'G2',
    authors: 'Greenberg E et al, PRiSM Patellofemoral Research Interest Group',
    year: 2024,
    title: 'Variable Guidelines for Pediatric MPFL Reconstruction Rehabilitation Exists Across PRiSM Member Organizations',
    venue: 'HSS J 2024;20(3):365-',
    url: 'https://doi.org/10.1177/15563316241233254',
    studyType: 'Review of 11 pediatric institution guidelines. Abstract',
    population: 'Pediatric MPFL reconstruction',
    claim: 'Guidelines for young patients vary a lot',
    quotes: ['highly variable agreement among guideline parameters at each treatment stage'],
    grade: 'REVIEW',
    audit: 'EXACT',
    auditRows: ['V67'],
  }),
  entry({
    id: 'S13',
    authors: 'Parikh SN et al',
    year: 2013,
    title: 'Complications of MPFLR in young patients',
    venue: 'Am J Sports Med 2013;41(5):1030-1038',
    url: 'https://doi.org/10.1177/0363546513482085',
    studyType: 'Retrospective case series, level of evidence 4, 179 knees. Abstract',
    population: 'Young patients, MPFL reconstruction',
    claim: 'Bilateral surgery is a risk factor for complications',
    quotes: ['Female sex and bilateral MPFL reconstructions were risk factors associated with postoperative complications'],
    grade: 'STUDY',
    audit: 'EXACT',
    auditRows: ['V79'],
  }),
  entry({
    id: 'R5',
    authors: 'Chatterji R et al',
    year: 2020,
    title: 'Return-to-Play Guidelines After Patellar Instability Surgery Requiring Bony Realignment: A Systematic Review',
    venue: 'Orthop J Sports Med 2020;8(12):2325967120966134',
    url: 'https://doi.org/10.1177/2325967120966134',
    studyType: 'Systematic review, 39 studies, 1598 knees. Full text',
    population: 'Patellar instability surgery with bony realignment',
    claim: 'No adequate rehabilitation or return guideline after a bone procedure',
    quotes: ['100% of papers evaluated lacked adequate return-to-play guidelines'],
    grade: 'REVIEW',
    audit: 'EXACT',
    auditRows: ['V35'],
  }),
  entry({
    id: 'N10',
    authors: 'Dandu N et al',
    year: 2025,
    title: '(title not recorded in the knowledge base) Meta-analysis of recurrence risk factors after MPFL reconstruction',
    venue: 'Am J Sports Med 2025',
    url: 'https://doi.org/10.1177/03635465241266594',
    studyType: 'Meta-analysis, 9 studies. Abstract',
    population: 'MPFL reconstruction',
    claim: 'Knee anatomy such as a high Caton-Deschamps index raises the risk of recurrence',
    quotes: ['CDI >1.3 (OR, 2.72; P = .02)'],
    grade: 'REVIEW',
    audit: 'EXACT',
    auditRows: ['V78'],
  }),
  entry({
    id: 'F1',
    authors: 'Okuno H et al',
    year: 2026,
    title: '(title not recorded in the knowledge base) Knee angle with MediaPipe against a goniometer',
    venue: 'Sensors 2026;26(18):5890 (PMC13611076)',
    url: 'https://doi.org/10.3390/s26185890',
    studyType: 'Validation study. Still photos, highest complexity model, tablet',
    population: '20 healthy adults, two flexibility test positions. Not a moving exercise and not the lite model (audit C13)',
    claim: 'The camera error of a knee angle in the best case',
    quotes: ['±8.73', '±8.80'],
    grade: 'STUDY',
    audit: 'EXACT',
    auditRows: ['V85'],
  }),
  entry({
    id: 'F3',
    authors: 'Rode D et al',
    year: 2025,
    title: '(title not recorded in the knowledge base) 2D pose models for knee flexion on exercise video',
    venue: 'Sci Rep 2025;15(1):38767 (PMC12589393)',
    url: 'https://doi.org/10.1038/s41598-025-22626-7',
    studyType: 'Validation study, 11 models, Vicon reference',
    population: '25 healthy adults',
    claim: 'On exercise video the 2D knee flexion error is larger than in still photos',
    quotes: ['9.3-21.9°'],
    grade: 'STUDY',
    audit: 'EXACT',
    auditRows: ['V84'],
  }),
  entry({
    id: 'RR',
    authors: 'Project knowledge base',
    year: 2026,
    title: 'Rehab rules for the app, with sources (rows marked NONE)',
    venue: 'research/rehab-rules.md',
    url: 'research/rehab-rules.md',
    studyType: 'Project file. It records where the literature gives no rule',
    population: 'Not applicable',
    claim: 'No source gives a value for the rows that this file marks NONE',
    quotes: [
      'No guideline or review read in this pass gives a session frequency for exercise after MPFLR',
      'No MPFLR source gives a tempo',
      'It is a test goal, not a dose',
      'No MPFLR source read gives a numeric pain or swelling level that stops an exercise',
      'No number exists',
      'No rehab source for revision surgery was found',
    ],
    grade: 'NONE',
    audit: 'NOT AUDITED',
    auditRows: [],
  }),
  entry({
    id: 'DESIGN',
    authors: 'Project design',
    year: 2026,
    title: 'Protocol generator: design, section 4 (referral cases and fail closed)',
    venue: 'docs/protocol-generator-design.md',
    url: 'docs/protocol-generator-design.md',
    studyType: 'Project design file',
    population: 'Not applicable',
    claim: 'The generator refuses when its output fails the schema or when any exception occurs',
    quotes: [],
    grade: 'NONE',
    audit: 'NOT AUDITED',
    auditRows: [],
  }),
];

export type SourceId = (typeof list)[number]['id'];

export const SOURCES = Object.fromEntries(list.map((s) => [s.id, s])) as Record<SourceId, Source>;
