'use strict';
// ScamShield — TEST-ONLY mock engine. Enabled with SCAMSHIELD_MOCK=1.
// Deterministic scripted replies so the FULL pipeline (validation, repair
// retry, fallbacks, OCR, sanitization) can be tested keyless and offline.
// Never used in production. Live verdicts come only from the real engines.

const golden = require('../../tests/golden-cases');

function j(obj) {
  return JSON.stringify(obj);
}
function fenced(obj) {
  return '```json\n' + j(obj) + '\n```';
}

// --- scripted golden-style replies (quotes are verbatim substrings of the case text) ---

const REPLIES = [
  {
    match: /KYC has EXPIRED|KYC करने के लिए|KYC update karo/i,
    reply: () => fenced({
      verdict: 'SCAM',
      confidence: 'High',
      red_flags: [
        { quote: 'bank KYC has EXPIRED', why: 'Bank aise darane wale message me KYC expire nahi bolti — sirf official app batati hai.' },
        { quote: 'account will be BLOCKED within 2 hours', why: 'Ghanton ka deadline — darana hai taaki aap bina soche click kar jao.' },
        { quote: 'bit.ly/sbi-kyc-9', why: 'Short link — asli bank KYC ke liye kabhi link nahi bhejti.' },
        { quote: '+91 98765 43210', why: 'Message ke saath personal number — bank ka official helpline aise nahi aata.' },
      ],
      trick: 'Fake KYC / account-block bank scam',
      scammer_wants: 'Aapko darakar fake link par click karana ya number par call karana — phir OTP ya card details maangna.',
      next_steps: [
        'Link par click mat karo, us number par call bhi mat karo.',
        'Seedha official bank app ya branch se apna account khud check karo.',
        'Number block karke 1930 (cybercrime.gov.in) par report karo.',
      ],
      family_warning: 'SBI ke naam par "KYC expired" wala message ghoom raha hai — iska link aur number dono fake hain. Bank kabhi is tarah message me link ya number nahi bhejta. Ghar walon ko bata do.',
      summary: 'Yeh message bank ka nahi, scammer ka hai — fake KYC-expiry ka dar dikhakar link par le jana chahta hai.',
    }),
  },
  {
    match: /parcel is HELD|customs me phasa|parcel customs/i,
    reply: () => fenced({
      verdict: 'SCAM',
      confidence: 'High',
      red_flags: [
        { quote: 'parcel is HELD at customs', why: 'Asli courier kabhi customs ka dar SMS se nahi dilata.' },
        { quote: 'Rs 150 courier charge', why: 'Pehle chhoti fee — iske baad bade demand ka rasta.' },
        { quote: 'Rs 2,50,000 cash prize', why: 'Parcel ke saath prize — classic lalach trap.' },
        { quote: 'fastship-fees@okaxis', why: 'Unknown UPI id — paisa seedhe scammer ke paas.' },
      ],
      trick: 'Fake courier/customs fee scam',
      scammer_wants: 'Pehle chhota Rs 150 charge le lena, phir "prize" ke naam par bara paisa ya personal details maangna.',
      next_steps: [
        'Kisi unknown courier message par UPI se paisa mat bhejo.',
        'Apna asli order official shopping app me khud check karo.',
        'UPI id report karke 1930 (cybercrime.gov.in) par complaint karo.',
      ],
      family_warning: '"Parcel customs me fase hai, Rs 150 fee do" — yeh courier scam hai. Asli courier pehle kaam karata hai, paisa message se nahi maangta. Ghar walon ko batao: aise message par payment bilkul nahi.',
      summary: 'Fake courier + customs fee ka message — chhoti fee, bada lalach. Yeh classic Indian courier scam hai.',
    }),
  },
  {
    match: /WFH typing job|registration fee/i,
    reply: () => fenced({
      verdict: 'SCAM',
      confidence: 'High',
      red_flags: [
        { quote: 'WFH typing job', why: 'Ghar baithe aaram se bade paise wali job ka lalach.' },
        { quote: 'Salary Rs 30,000 per week', why: 'Bahut zyada salary ka lalach — asli data-entry itna nahi deti.' },
        { quote: 'Rs 999 registration fee', why: 'Job ke liye pehle fee — asli job offer me kabhi nahi hota.' },
        { quote: 'Pay before 5 pm today', why: 'Deadline ka pressure — sochne ka time hi na mile.' },
      ],
      trick: 'Fake job offer / advance registration fee scam',
      scammer_wants: '"Registration fee" ke naam par aapse Rs 999 — uske baad ya to gayab, ya aur paisa maangna.',
      next_steps: [
        'Job ke liye pehle kabhi koi fee mat bhejo.',
        'Company ka naam ho to uski official website se khud vacancy check karo.',
        'Sender block karke 1930 (cybercrime.gov.in) par report karo.',
      ],
      family_warning: '"Ghar baithe job, pehle Rs 999 registration fee" — yeh advance-fee scam hai. Asli job offer me paisa pehle nahi lagta. Ghar walon ko batao ki aise message par reply ya payment na karein.',
      summary: 'Fake WFH job offer — salary ka lalach, Rs 999 fee ka trap.',
    }),
  },
  {
    match: /money laundering case|safe account|Cyber Crime Branch/i,
    reply: () => fenced({
      verdict: 'SCAM',
      confidence: 'High',
      red_flags: [
        { quote: 'money laundering case is filed against your Aadhaar', why: 'Fake case ka dar — asli police phone par aise case notice nahi deti.' },
        { quote: 'Your phone is under monitoring', why: 'Darana aur akela mehna — taaki aap kisi se na poochho.' },
        { quote: 'move your funds to the Reserve Bank safe account', why: '"Safe account" ka concept hi jhooth hai — RBI kabhi aisa karwati nahi.' },
        { quote: 'arrest warrant will be issued today evening', why: 'Ghanton ka deadline aur arrest ka dar — digital arrest ka trait.' },
      ],
      trick: 'Digital arrest / fake police scam',
      scammer_wants: 'Video call par dara kar aapka paisa "safe account" me transfer karana — jise scammer khud chura lega.',
      next_steps: [
        'Video call join mat karo — asli police summons kabhi WhatsApp/call se nahi aata.',
        'Kisi bhi "safe account" me ek rupaya transfer mat karo — yeh hamesha scam hai.',
        'Apne local police station ya 1930 (cybercrime.gov.in) par khud seedha report karo.',
      ],
      family_warning: '"Cyber police" video call par bulakar "safe account" me paisa transfer karwana — yeh DIGITAL ARREST scam hai. Police kabhi phone par paisa transfer nahi karati. Aise call aaye to phone kaat do aur 1930 par report karo.',
      summary: 'Fake police ka digital-arrest scam — video call ka dar, "safe account" ka jaal.',
    }),
  },
  {
    match: /debited from A\/c XX/i,
    reply: () => fenced({
      verdict: 'LOOKS_SAFE',
      confidence: 'Medium',
      red_flags: [],
      trick: null,
      scammer_wants: null,
      next_steps: [
        'Transaction apne official bank app me khud dekh lo.',
        'Agar yeh debit aapka nahi hai to card ke peeche likhe number par hi call karo.',
        'Still verify in the official app.',
      ],
      family_warning: 'Yeh ek normal bank debit alert lagta hai — isme koi link ya OTP ka demand nahi hai. Bank aise alerts har transaction par bhejta hai. Ghar walon ko yaad dilao: OTP kisi ko bhi dena nahi.',
      summary: 'Yeh genuine debit alert lag raha hai — sirf jaankari hai, koi link ya paisa ka demand nahi.',
    }),
  },
  {
    match: /Send it by tomorrow/i,
    reply: () => 'Here is my analysis: ' + j({
      verdict: 'SUSPICIOUS',
      confidence: 'Low',
      red_flags: [],
      trick: null,
      scammer_wants: 'Pata nahi — message me context bahut kam hai.',
      next_steps: [
        'Reply karne se pehle sender ka number aur context khud confirm karo.',
        'Koi link ya payment ki baat aaye to wahin ruk jao.',
        'Aisa unclear message family group me pooch kar aage badho.',
      ],
      family_warning: 'Is message par pura bharosa mat karo — context nahi hai, sender confirm karo. Paise ya personal details ka koi sawal aaye to seedha mana kar do.',
      summary: 'Message bahut vague hai — na koi scam ka proof, na safe ka proof. Isliye "suspicious" hai.',
    }),
  },
  {
    match: /आपका बैंक खाता|ब्लॉक/i,
    reply: () => j({
      verdict: 'SCAM',
      confidence: 'High',
      red_flags: [
        { quote: 'आपका बैंक खाता आज रात बंद हो जाएगा', why: 'Bank aise darane wala message nahi bhejti — yeh fake urgency hai.' },
        { quote: 'bitly-kyc.in', why: 'Asli bank apni official website ke alawa kisi link par KYC nahi karwati.' },
      ],
      trick: 'Fake KYC / bank scam',
      scammer_wants: 'Darake aapko fake link par le jana — phir OTP ya bank details maangna.',
      next_steps: [
        'Link par click mat karo.',
        'Apna account official bank app se khud check karo.',
        'Message report karke 1930 par complaint karo.',
      ],
      family_warning: 'Bank ke naam par aisa darane wala message aa raha hai — isme link bilkul click na karein. Bank ghar baithe KYC ke liye link nahi bhejta. Sabko bata dein.',
      summary: 'Yeh fake bank-KYC scam hai — dar + link ka purana formula.',
    }),
  },
];

// --- edge-case triggers (each rehearses one validation rule) ---

const TRIGGERS = [
  { match: /MOCK_GARBAGE/, reply: (isRepair) => isRepair ? 'Mujhe samajh nahi aaya, main sochta hoon.' : 'Hmm, yeh message interesting hai, par main format bhool gaya.' },
  { match: /MOCK_MALFORM/, reply: (isRepair) => isRepair ? j({ verdict: 'SUSPICIOUS', confidence: 'Low', red_flags: [], trick: null, scammer_wants: 'Reply format theek nahi tha.', next_steps: ['Dobara analyze karva lo.', 'Click ya payment mat karo.', '1930 par report karo agar pakka scam lage.'], family_warning: 'Is message par bina verify ke click ya payment mat karo.', summary: 'Pehla jawab saaf nahi mila tha, ab yeh suspicious hai.' }) : 'Sorry, main isko JSON me likh nahi paya.' },
  { match: /MOCK_UNTRACEABLE/, reply: () => j({
      verdict: 'SCAM', confidence: 'High',
      red_flags: [
        { quote: 'MOCK_UNTRACEABLE test message', why: 'Yeh line message me hai.' },
        { quote: 'OTP turant bhejo', why: 'Yeh quote maine mana bana liya — input me nahi hai.' },
      ],
      trick: 'Fake OTP scam',
      scammer_wants: 'OTP maangna.',
      next_steps: ['Click mat karo.', 'Verify officially.', '1930 par report karo.'],
      family_warning: 'OTP kabhi kisi ko nahi — official app se verify karo.',
      summary: 'SCAM — par ek flag trace nahi hua.',
    }) },
  { match: /MOCK_DIRTYWARNING/, reply: () => j({
      verdict: 'SCAM', confidence: 'High',
      red_flags: [{ quote: 'MOCK_DIRTYWARNING test', why: 'Trigger flag.' }],
      trick: 'Test scam',
      scammer_wants: 'Test.',
      next_steps: ['Click mat karo.', 'Verify officially.', '1930 par report karo.'],
      family_warning: 'Bachke raho — 98765 43210 par call mat karna aur http://bit.ly/xx par click mat karna. OTP 456789 kisi ko mat dena.',
      summary: 'Dirty warning test case.',
    }) },
  { match: /MOCK_LOOKSAFE_HIGH/, reply: () => j({
      verdict: 'LOOKS_SAFE', confidence: 'High', red_flags: [], trick: null, scammer_wants: null,
      next_steps: ['Sab theek lagta hai.', 'Balance khud check karo.'],
      family_warning: 'Message gentle hai.',
      summary: 'Safe lagta hai.',
    }) },
  { match: /MOCK_SCAM_NOFLAGS/, reply: () => j({
      verdict: 'SCAM', confidence: 'High', red_flags: [], trick: 'Fake something scam',
      scammer_wants: 'Paisa.', next_steps: ['Ruko.', 'Verify karo.', '1930 report.'],
      family_warning: 'Dhyan rakhna.', summary: 'SCAM but no proof.',
    }) },
  { match: /MOCK_SCAM_NOTRICK/, reply: () => j({
      verdict: 'SCAM', confidence: 'High',
      red_flags: [{ quote: 'MOCK_SCAM_NOTRICK test', why: 'Present.' }],
      trick: null, scammer_wants: 'Paisa.',
      next_steps: ['Ruko.', 'Verify karo.', '1930 report.'],
      family_warning: 'Dhyan rakhna.', summary: 'SCAM but no trick name.',
    }) },
  { match: /MOCK_LOOKSAFE_FLAGS/, reply: () => j({
      verdict: 'LOOKS_SAFE', confidence: 'Medium',
      red_flags: [{ quote: 'MOCK_LOOKSAFE_FLAGS test', why: 'Yeh flag trace hota hai.' }],
      trick: null, scammer_wants: null,
      next_steps: ['Check karo.', 'Balance dekho.', '1930 yaad rakho.'],
      family_warning: 'Theek hai.', summary: 'Mixed signals.',
    }) },
];

const DEFAULT_REPLY = () => j({
  verdict: 'SUSPICIOUS',
  confidence: 'Low',
  red_flags: [],
  trick: null,
  scammer_wants: 'Message ka pattern samajh nahi aaya.',
  next_steps: ['Click ya payment mat karo.', 'Sender verify karo.', '1930 par report karo.'],
  family_warning: 'Is message par bina verify ke bharosa mat karo.',
  summary: 'Unknown message type — suspicious.',
});

// Partially readable transcript for the blurry-screenshot case.
const BLURRY_TRANSCRIPT = 'Dear Customer, your bank KYC has EX???ED. Your ac??? will be BLOCKED in 2 hours. bit.ly/sbi-???-9 par update karo.';

const BLURRY_REPLY = j({
  verdict: 'SCAM',
  confidence: 'High',
  red_flags: [
    { quote: 'bank KYC has EX???ED', why: 'KYC expiry ka dar — standard bank scam.' },
    { quote: 'BLOCKED in 2 hours', why: 'Ghanton ka deadline — fake urgency.' },
    { quote: 'aapka OTP bhejo', why: 'Yeh line transcript me nahi hai — droppable.' },
  ],
  trick: 'Fake KYC / bank scam',
  scammer_wants: 'Fake link par click karana.',
  next_steps: ['Click mat karo.', 'Official app se verify karo.', '1930 par report karo.'],
  family_warning: 'Bank ke naam par KYC wala dar-message — link par click mat karna.',
  summary: 'Blurry screenshot bhi scam dikhata hai.',
});

// --- PNG tEXt marker reading (fixtures carry MOCK:KYC / MOCK:BLANK / MOCK:BLURRY) ---
function pngTextMarkers(buffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const out = [];
  if (!buffer || buffer.length < 8 + 12 || !buffer.subarray(0, 8).equals(sig)) return out;
  let off = 8;
  while (off + 8 <= buffer.length) {
    const len = buffer.readUInt32BE(off);
    const type = buffer.subarray(off + 4, off + 8).toString('latin1');
    if (type === 'tEXt') {
      const data = buffer.subarray(off + 8, off + 8 + len);
      const nul = data.indexOf(0);
      if (nul > 0) out.push(data.subarray(nul + 1).toString('utf8').trim());
    }
    if (type === 'IEND') break;
    off += 8 + len + 4;
  }
  return out;
}

function replyFor(text, isRepair) {
  for (const t of TRIGGERS) if (t.match.test(text)) return t.reply(isRepair);
  for (const r of REPLIES) if (r.match.test(text)) return r.reply();
  if (/MOCK:KYC/.test(text)) return REPLIES[0].reply();
  if (/EX\?\?\?ED/.test(text)) return BLURRY_REPLY;
  return DEFAULT_REPLY();
}

function createMockEngine(opts) {
  const o = opts || {};
  const latencyMs = o.latencyMs != null ? o.latencyMs : 15;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function judgeText(payload) {
    const text = String((payload && payload.text) || '');
    await sleep(latencyMs);
    if (/MOCK_TIMEOUT/.test(text)) return new Promise(() => {}); // hangs — pipeline must time it out
    if (/MOCK_EMPTY/.test(text)) return '';
    return replyFor(text, Boolean(payload && payload.extraInstruction));
  }

  async function transcribeImage(payload) {
    await sleep(latencyMs);
    const markers = pngTextMarkers(Buffer.from((payload && payload.base64) || '', 'base64'));
    if (markers.includes('MOCK:KYC')) return j({ text: golden.G1.message });
    if (markers.includes('MOCK:BLURRY')) return j({ text: BLURRY_TRANSCRIPT });
    return j({ text: null });
  }

  return {
    id: 'mock',
    model: 'scamshield-mock (TEST-ONLY)',
    hasKey: true,
    judgeText,
    transcribeImage,
  };
}

module.exports = { createMockEngine, pngTextMarkers };
