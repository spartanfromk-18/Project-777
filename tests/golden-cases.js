'use strict';
// ScamShield — golden cases (binding, SPEC v1.0).
// Single source of truth for: mock tests (rehearsal), live golden run (tests/golden.mjs), TESTS.md.
//
// G1–G4 = SCAM High (trick named), G5 = LOOKS_SAFE Medium (trick null), G6 = SUSPICIOUS Low (trick null).
// Extra language cases: GH = Hinglish scam, GD = Devanagari scam.

module.exports = {
  G1: {
    id: 'G1',
    name: 'Bank KYC scam',
    message: 'Dear Customer, your bank KYC has EXPIRED. Your account will be BLOCKED within 2 hours. Update now at bit.ly/sbi-kyc-9 or call +91 98765 43210. Do not ignore. — SBI Update Desk',
    expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'kyc' },
  },
  G2: {
    id: 'G2',
    name: 'Courier fee scam',
    message: 'Your parcel is HELD at customs. Rs 150 courier charge pending — pay now to release your order and claim the Rs 2,50,000 cash prize attached with it. Pay Rs 150 on UPI: fastship-fees@okaxis. — Courier Team Delhi',
    expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'courier' },
  },
  G3: {
    id: 'G3',
    name: 'Job fee scam',
    message: 'Congratulations! You are selected for a WFH typing job. Salary Rs 30,000 per week. Only one-time Rs 999 registration fee to activate your offer letter. Pay before 5 pm today or your selection will be cancelled. — HR Anjali',
    expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'job' },
  },
  G4: {
    id: 'G4',
    name: 'Digital arrest scam',
    message: 'This is Inspector R.K. Verma, Cyber Crime Branch. A money laundering case is filed against your Aadhaar. Your phone is under monitoring. Do not disconnect. Join the video call for verification and move your funds to the Reserve Bank safe account for checking, else arrest warrant will be issued today evening.',
    expected: { verdict: 'SCAM', confidence: 'High', trickIncludes: 'arrest' },
  },
  G5: {
    id: 'G5',
    name: 'Genuine-style bank alert',
    message: 'Rs 450.00 debited from A/c XX4567 on 26-10-26 via UPI/Netflix India. If this was not you, call the number printed on the back of your card. Bank staff will never ask for your OTP. This is an automated alert, no action needed.',
    expected: { verdict: 'LOOKS_SAFE', confidence: 'Medium', trickNull: true },
  },
  G6: {
    id: 'G6',
    name: 'Vague order note',
    message: 'Ok noted. Send it by tomorrow morning.',
    expected: { verdict: 'SUSPICIOUS', confidence: 'Low', trickNull: true },
  },
  GH: {
    id: 'GH',
    name: 'Hinglish courier scam (language case)',
    message: 'Aapka parcel customs me phasa hai. 150 rupaye ka charge bhejo turant, warna parcel wapas bhej diya jayega. Pay karne ke liye ye number par message karo: 98765 43210.',
    expected: { verdict: 'SCAM', confidence: 'High', trickNull: false },
  },
  GD: {
    id: 'GD',
    name: 'Devanagari KYC scam (language case)',
    message: 'आपका बैंक खाता आज रात बंद हो जाएगा। KYC अपडेट करने के लिए इस लिंक पर क्लिक करें: bitly-kyc.in — जल्दी करें।',
    expected: { verdict: 'SCAM', confidence: 'High', trickNull: false },
  },
};
