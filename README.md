# ScamShield — Landing Page & Live Scam Checker

> **Is this message a scam? Find out in 10 seconds.**
>
> ScamShield is a fast, privacy-first landing page and verification engine designed to protect families in India from electricity disconnection threats, fake bank KYC/PAN blocks, work-from-home tasks, digital arrests, and lottery frauds.

## Quickstart (Run on Localhost)

To run this application locally:

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The frontend live checker connects to the `/api/check` backend (running via Express in `server.ts`), and also features a 100% on-device Local Mode that functions completely offline without any data leaving the device.

## Key Features & Highlights

1. **Live Checker with 6 Golden Cases**:
   - ⚡ Electricity power cut tonight at 9:30 PM (Bijli bill scam)
   - 🏦 Bank KYC / PAN expired & account blocked threat
   - 💼 YouTube like & subscribe earn ₹3,000/day task scam
   - 📦 FedEx Customs narcotics / Digital arrest scam
   - 🎟️ KBC ₹25 Lakh WhatsApp lottery scam
   - 🛡️ Legitimate authentication OTP (Control sample with mandatory "still verify in the official app" disclaimer)

2. **Scam Autopsy & Next Steps**:
   - Dissects who the scammer pretends to be, what psychological trap they use, and what they actually want next.
   - Provides concrete safety actions: don't click, don't pay, block sender, report on 1930.

3. **Family Warning Card**:
   - 1-click copyable warning message in conversational Hinglish tailored for WhatsApp family groups.

4. **Honest Privacy (Dual-Mode)**:
   - "Local mode: nothing leaves the device. Production mode: your message is sent only to get the verdict via Gemini API, never stored."
   - Never claims 100% safe. Always reminds users to verify in the official app.

5. **Safety & Emergency Response**:
   - Immediate advisory: If money was already sent, your first step is call 1930 immediately to freeze fraudulent transfers.

## GitHub Repository

Source code is structured for integration into `spartanfromk-18/Project-777` in the `landing-page` directory.
