import React, { useState, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Cpu,
  Globe,
  FileText,
  X,
} from 'lucide-react';
import { GOLDEN_CASES, GoldenCase } from '../data/goldenCases.ts';
import { analyzeMessageLocally, AnalysisResult } from '../utils/scamEngine.ts';

interface CheckerProps {
  initialCaseId?: string | null;
}

export const Checker: React.FC<CheckerProps> = ({ initialCaseId: _initialCaseId }) => {
  const [inputText, setInputText] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [textExtracted, setTextExtracted] = useState(false);
  const [mode, setMode] = useState<'local' | 'production'>('local');
  const [status, setStatus] = useState<'empty' | 'checking' | 'verdict' | 'error'>('empty');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | any | null>(null);
  const [copiedWarning, setCopiedWarning] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load a golden case
  const loadCase = (goldenCase: GoldenCase) => {
    setInputText(goldenCase.text);
    setUploadedImage(null);
    setImageName(null);
    setTextExtracted(false);
    setSelectedCaseId(goldenCase.id);
    setErrorMessage(null);
    setStatus('empty');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle image upload (Screenshot upload)
  // BUG 2 FIX: No fake pre-fill of sample text; image is stored for OCR in Production Mode
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageName(file.name);
    setTextExtracted(false);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      // BUG 2 FIX: Removed automatic pre-fill of electricity sample text!
    };
    reader.readAsDataURL(file);
  };

  // Perform check
  const handleCheck = async () => {
    const textToCheck = inputText.trim();

    // In Local Mode, OCR is not available, so text is strictly required
    if (mode === 'local') {
      if (!textToCheck) {
        if (uploadedImage) {
          setErrorMessage(
            'Screenshot attached — OCR is not available in Local Mode. Paste the message text to check it.'
          );
        } else {
          setErrorMessage('Please paste a message or select one of the golden cases below.');
        }
        setStatus('error');
        return;
      }
    } else {
      // In Production Mode, either text or screenshot is required
      if (!textToCheck && !uploadedImage) {
        setErrorMessage('Please paste a message or upload a screenshot to check.');
        setStatus('error');
        return;
      }
    }

    setStatus('checking');
    setErrorMessage(null);
    setCopiedWarning(false);

    try {
      if (mode === 'production') {
        try {
          const res = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: textToCheck || undefined,
              mode: 'production',
              image: uploadedImage || undefined,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setErrorMessage(
              data.error || 'Production verification engine encountered an error. Switch to Local Mode below.'
            );
            setStatus('error');
            return;
          }

          // If Vision OCR extracted text, populate the text box and mark as extracted
          if (data.extracted_text) {
            setInputText(data.extracted_text);
            setTextExtracted(true);
          }

          setResult(data);
          setStatus('verdict');
          return;
        } catch {
          setErrorMessage(
            'ENGINE_OFFLINE: Production verification engine could not be reached (/api/check). Switch to Local Mode (rules engine) below to analyze on-device with zero data leaving your browser.'
          );
          setStatus('error');
          return;
        }
      }

      // Local Mode analysis (Runs on-device via local rule engine in scamEngine.ts)
      await new Promise((resolve) => setTimeout(resolve, 300));
      const localResult = analyzeMessageLocally(textToCheck);
      setResult(localResult);
      setStatus('verdict');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please check the text.';
      setErrorMessage(msg);
      setStatus('error');
    }
  };

  // Reset checker
  const handleReset = () => {
    setInputText('');
    setUploadedImage(null);
    setImageName(null);
    setTextExtracted(false);
    setResult(null);
    setSelectedCaseId(null);
    setStatus('empty');
    setErrorMessage(null);
    setCopiedWarning(false);
  };

  // Copy family warning with safe fallback
  const handleCopyWarning = () => {
    const warningText = result?.familyWarning || result?.family_warning;
    if (!warningText) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(warningText).catch(() => {
          fallbackCopyText(warningText);
        });
      } else {
        fallbackCopyText(warningText);
      }
    } catch {
      fallbackCopyText(warningText);
    }
    setCopiedWarning(true);
    setTimeout(() => setCopiedWarning(false), 2500);
  };

  const fallbackCopyText = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {
      // ignore
    }
  };

  // Helper to determine if Check button should be active
  const canCheck =
    status !== 'checking' &&
    (inputText.trim().length > 0 || (mode === 'production' && uploadedImage !== null));

  return (
    <section id="checker" className="relative w-full py-16 md:py-24 bg-[#0A0A0F] border-t border-[#262633]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-full px-3.5 py-1.5 mb-4">
            <ShieldAlert className="w-4 h-4 text-[#A1A1B0]" />
            <span className="text-xs font-medium text-[#F4F4F6]">Live Scam Checker</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F4F4F6] mb-4">
            Check any suspicious message
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1B0]">
            Paste SMS, WhatsApp message, Telegram job offer, or upload a screenshot.
            Instant verdict in simple Hinglish with exact red flags.
          </p>
        </div>

        {/* Dual Mode Switch & Privacy Note */}
        <div className="mb-6 p-4 rounded-2xl bg-[#13131B] border border-[#262633] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#A1A1B0]">Engine Mode:</span>
            <div className="inline-flex p-1 bg-[#1A1A24] rounded-full border border-[#262633]">
              <button
                type="button"
                onClick={() => {
                  setMode('local');
                  setErrorMessage(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  mode === 'local'
                    ? 'bg-[#6366F1]/20 text-[#F4F4F6] border border-[#6366F1]/40'
                    : 'text-[#A1A1B0] hover:text-[#F4F4F6]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-[#A1A1B0]" />
                <span>Local Mode (rules engine)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('production');
                  setErrorMessage(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  mode === 'production'
                    ? 'bg-[#6366F1]/20 text-[#F4F4F6] border border-[#6366F1]/40'
                    : 'text-[#A1A1B0] hover:text-[#F4F4F6]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-[#A1A1B0]" />
                <span>Production Mode</span>
              </button>
            </div>
          </div>

          {/* Exact required dual-mode privacy note */}
          <div className="text-xs text-[#A1A1B0] max-w-md">
            {mode === 'local' ? (
              <span className="text-[#2FA36B] font-medium">
                Local mode: nothing leaves the device.
              </span>
            ) : (
              <span className="text-[#F4F4F6]">
                Production mode: your message is sent only to get the verdict via Gemini API, never stored.
              </span>
            )}
          </div>
        </div>

        {/* Sample Chips for the 6 Golden Cases */}
        <div id="samples" className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-[#A1A1B0] uppercase tracking-wider">
              Try the 6 golden cases:
            </span>
            <span className="text-[11px] text-[#A1A1B0]">Tap any chip to test instantly</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {GOLDEN_CASES.map((gc) => (
              <button
                key={gc.id}
                type="button"
                onClick={() => loadCase(gc)}
                className={`text-xs px-3.5 py-2 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCaseId === gc.id
                    ? 'bg-[#6366F1]/20 text-[#F4F4F6] border-[#6366F1] font-medium shadow-md shadow-[#6366F1]/10'
                    : 'bg-[#13131B] text-[#A1A1B0] border-[#262633] hover:border-[#6366F1]/40 hover:text-[#F4F4F6]'
                }`}
              >
                <span>{gc.tag}</span>
                <span className="opacity-75 hidden sm:inline">· {gc.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Checker Box */}
        <div className="bg-[#13131B] border border-[#262633] rounded-3xl p-4 sm:p-6 shadow-2xl relative">
          {/* Text Area */}
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              rows={4}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setSelectedCaseId(null);
                if (status === 'error') setErrorMessage(null);
              }}
              placeholder="Paste SMS, WhatsApp message, Telegram job offer, or email here..."
              className="w-full bg-[#0A0A0F] border border-[#262633] rounded-2xl p-4 text-[#F4F4F6] text-sm sm:text-base placeholder-[#A1A1B0]/60 focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none leading-relaxed transition-all"
            />

            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-[#1A1A24] text-[#A1A1B0] hover:text-[#F4F4F6] border border-[#262633]"
                title="Clear text"
                aria-label="Clear text"
              >
                <X className="w-3.5 h-3.5 text-[#A1A1B0]" />
              </button>
            )}
          </div>

          {/* Screenshot Upload Preview & Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#262633]">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="screenshot-upload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs sm:text-sm font-medium bg-[#1A1A24] text-[#A1A1B0] hover:text-[#F4F4F6] border border-[#262633] rounded-xl px-3.5 py-2 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#A1A1B0]" />
                <span>Upload screenshot</span>
              </button>

              {imageName && (
                <div className="flex items-center gap-1.5 text-xs text-[#F4F4F6] bg-[#1A1A24] border border-[#262633] px-3 py-1.5 rounded-xl">
                  <FileText className="w-3.5 h-3.5 text-[#A1A1B0]" />
                  <span className="truncate max-w-[140px]">{imageName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setImageName(null);
                      setTextExtracted(false);
                    }}
                    className="text-[#A1A1B0] hover:text-[#F4F4F6] ml-1"
                  >
                    <X className="w-3 h-3 text-[#A1A1B0]" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(inputText || result || uploadedImage) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-[#A1A1B0] hover:text-[#F4F4F6] px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#A1A1B0]" />
                  <span>Reset</span>
                </button>
              )}

              {/* White/Off-white CTA button */}
              <button
                type="button"
                onClick={handleCheck}
                disabled={!canCheck}
                className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-6 py-2.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6366F1] ${
                  !canCheck
                    ? 'bg-[#1A1A24] text-[#A1A1B0]/50 border border-[#262633] cursor-not-allowed'
                    : 'bg-[#F4F4F6] text-[#0A0A0F] hover:bg-[#E2E2E6] shadow-lg shadow-black/40'
                }`}
              >
                {status === 'checking' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0A0A0F]" />
                    <span>CHECK MESSAGE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Screenshot thumbnail if uploaded (BUG 2 FIX: truthful OCR messaging) */}
          {uploadedImage && (
            <div className="mt-4 p-3 bg-[#1A1A24] rounded-xl border border-[#262633] flex items-center gap-3">
              <img
                src={uploadedImage}
                alt="Uploaded message screenshot"
                className="h-16 w-16 object-cover rounded-lg border border-[#262633]"
              />
              <div className="text-xs">
                <p className="font-medium text-[#F4F4F6]">Screenshot attached</p>
                <p className="text-[#A1A1B0]">
                  {mode === 'local'
                    ? 'Screenshot attached — OCR is not available in Local Mode. Paste the message text to check it.'
                    : textExtracted
                    ? 'Screenshot attached — Text extracted via Gemini Vision.'
                    : 'Screenshot attached — Text will be extracted via Gemini Vision on check.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* STATE: Error message */}
        {status === 'error' && errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-[rgba(229,72,77,0.12)] border border-[#E5484D]/40 flex items-start justify-between gap-3 text-[#F4F4F6] text-sm animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-[#E5484D] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#E5484D]">Engine error</p>
                <p className="mt-0.5 text-xs text-[#F4F4F6]/90 leading-relaxed font-mono">
                  {errorMessage}
                </p>
              </div>
            </div>
            {mode === 'production' && (
              <button
                type="button"
                onClick={() => {
                  setMode('local');
                  setErrorMessage(null);
                  if (inputText.trim()) {
                    setTimeout(() => {
                      const res = analyzeMessageLocally(inputText.trim());
                      setResult(res);
                      setStatus('verdict');
                    }, 100);
                  }
                }}
                className="text-xs font-semibold bg-[#13131B] hover:bg-[#1A1A24] text-[#F4F4F6] px-3 py-1.5 rounded-lg border border-[#262633] transition-colors shrink-0"
              >
                Use Local Mode
              </button>
            )}
          </div>
        )}

        {/* STATE: Checking loader */}
        {status === 'checking' && (
          <div className="mt-8 p-8 rounded-3xl bg-[#13131B] border border-[#262633] text-center animate-pulse">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#1A1A24] border border-[#262633] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#A1A1B0] animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-[#F4F4F6] mb-1">
              {mode === 'production' ? 'Gemma is analyzing this message' : 'Local rules engine is analyzing this message'}
            </h3>
            <p className="text-xs text-[#A1A1B0] max-w-sm mx-auto">
              Scanning for urgency triggers, impersonation markers, fake URLs, and known Indian scam patterns...
            </p>
          </div>
        )}

        {/* STATE: Verdict Result */}
        {status === 'verdict' && result && (
          <div className="mt-8 space-y-6 animate-fadeIn">
            {/* Verdict Top Card */}
            <div
              className={`rounded-3xl p-6 sm:p-8 border transition-all ${
                result.verdict === 'SCAM'
                  ? 'bg-[rgba(229,72,77,0.12)] border-[#E5484D]/40'
                  : result.verdict === 'SUSPICIOUS'
                  ? 'bg-[rgba(245,166,35,0.12)] border-[#F5A623]/40'
                  : 'bg-[rgba(47,163,107,0.12)] border-[#2FA36B]/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {/* Verdict icon */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      result.verdict === 'SCAM'
                        ? 'bg-[rgba(229,72,77,0.16)] text-[#E5484D]'
                        : result.verdict === 'SUSPICIOUS'
                        ? 'bg-[rgba(245,166,35,0.16)] text-[#F5A623]'
                        : 'bg-[rgba(47,163,107,0.16)] text-[#2FA36B]'
                    }`}
                  >
                    {result.verdict === 'SCAM' ? (
                      <ShieldAlert className="w-7 h-7 text-[#E5484D]" />
                    ) : result.verdict === 'SUSPICIOUS' ? (
                      <AlertTriangle className="w-7 h-7 text-[#F5A623]" />
                    ) : (
                      <ShieldCheck className="w-7 h-7 text-[#2FA36B]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                          result.verdict === 'SCAM'
                            ? 'text-[#E5484D]'
                            : result.verdict === 'SUSPICIOUS'
                            ? 'text-[#F5A623]'
                            : 'text-[#2FA36B]'
                        }`}
                      >
                        {result.verdict}
                      </span>
                      {/* Confidence label: High / Medium / Low only, never a number */}
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#13131B] border border-[#262633] text-[#F4F4F6]">
                        {typeof result.confidence === 'string'
                          ? `${result.confidence} confidence`
                          : result.verdict === 'SCAM'
                          ? 'High confidence'
                          : result.verdict === 'LOOKS_SAFE'
                          ? 'High confidence'
                          : 'Moderate confidence'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#F4F4F6] mt-0.5">
                      {result.summary}
                    </p>
                  </div>
                </div>

                {/* Plain-text safety rule note */}
                {result.verdict === 'LOOKS_SAFE' && (
                  <div className="bg-[#13131B] border border-[#2FA36B]/40 px-3 py-1.5 rounded-xl text-xs text-[#2FA36B] font-medium">
                    Still verify in the official app
                  </div>
                )}
              </div>

              {/* Exact Red Flags List */}
              <div className="mt-6 pt-5 border-t border-[#262633]/60">
                <h4 className="text-xs font-semibold text-[#A1A1B0] uppercase tracking-wider mb-3">
                  Detected Red Flags:
                </h4>
                <div className="space-y-2">
                  {(result.red_flags || result.redFlags || []).map((flag: any, idx: number) => {
                    const isObj = flag && typeof flag === 'object' && 'quote' in flag;
                    const displayQuote = isObj ? flag.quote : flag;
                    const displayWhy = isObj ? flag.why : null;

                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-[#F4F4F6]"
                      >
                        <span
                          className={`font-bold shrink-0 mt-0.5 ${
                            result.verdict === 'SCAM'
                              ? 'text-[#E5484D]'
                              : result.verdict === 'SUSPICIOUS'
                              ? 'text-[#F5A623]'
                              : 'text-[#2FA36B]'
                          }`}
                        >
                          {result.verdict === 'LOOKS_SAFE' ? '✓' : '✕'}
                        </span>
                        {/* Plain text span */}
                        <span className="font-mono text-xs sm:text-sm select-text">
                          {isObj ? (
                            <>
                              <span className="font-semibold text-[#F4F4F6]">"{displayQuote}"</span>
                              {displayWhy && (
                                <span className="text-[#A1A1B0]"> — {displayWhy}</span>
                              )}
                            </>
                          ) : (
                            displayQuote
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scam Autopsy Card + What They Want Next */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Autopsy breakdown */}
              <div className="bg-[#13131B] border border-[#262633] rounded-3xl p-6">
                <h4 className="text-sm font-semibold text-[#F4F4F6] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5484D]" />
                  <span>Scam Autopsy: How this trick works</span>
                </h4>
                <div className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-[#A1A1B0] block text-xs mb-0.5">
                      Who the scammer pretends to be:
                    </span>
                    <p className="font-medium text-[#F4F4F6]">
                      {result.impersonating || result.impersonation || 'State official / Bank authority'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#A1A1B0] block text-xs mb-0.5">
                      The psychological trick used:
                    </span>
                    <p className="font-medium text-[#F4F4F6]">
                      {result.trick || result.trickUsed}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#A1A1B0] block text-xs mb-0.5">
                      What they want next:
                    </span>
                    <p className="text-[#A1A1B0] leading-relaxed">
                      {result.scammer_wants || result.whatTheyWant}
                    </p>
                  </div>
                </div>
              </div>

              {/* What to do next */}
              <div className="bg-[#13131B] border border-[#262633] rounded-3xl p-6">
                <h4 className="text-sm font-semibold text-[#F4F4F6] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
                  <span>Immediate next steps:</span>
                </h4>
                <div className="space-y-2.5">
                  {(result.next_steps || result.nextSteps || []).map((step: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F4F4F6]"
                    >
                      <span className="text-[#A1A1B0] font-mono shrink-0">
                        0{idx + 1}.
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                {/* National helpline reminder */}
                <div className="mt-5 p-3 rounded-2xl bg-[#1A1A24] border border-[#262633] flex items-center justify-between">
                  <span className="text-xs text-[#A1A1B0]">
                    If money was sent:
                  </span>
                  <a
                    href="tel:1930"
                    className="text-xs font-bold text-[#E5484D] hover:underline transition-colors flex items-center gap-1"
                  >
                    Call 1930 immediately
                  </a>
                </div>
              </div>
            </div>

            {/* Family Warning Card with Copy Button */}
            <div className="bg-[#13131B] border border-[#262633] rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#F4F4F6] flex items-center gap-2">
                    <span>📱 Ready-to-share Family Warning (Hinglish)</span>
                  </h4>
                  <p className="text-xs text-[#A1A1B0] mt-0.5">
                    Copy this note and forward it to your parents or family WhatsApp group:
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWarning}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6366F1] shrink-0 ${
                    copiedWarning
                      ? 'bg-[rgba(47,163,107,0.16)] text-[#2FA36B] border border-[#2FA36B]/40'
                      : 'bg-[#F4F4F6] text-[#0A0A0F] hover:bg-[#E2E2E6]'
                  }`}
                >
                  {copiedWarning ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#2FA36B]" />
                      <span>Copied! Share on WhatsApp</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#0A0A0F]" />
                      <span>Copy Warning for Family</span>
                    </>
                  )}
                </button>
              </div>

              {/* Warning text box */}
              <div className="bg-[#1A1A24] border border-[#262633] rounded-2xl p-4 text-xs sm:text-sm text-[#F4F4F6] leading-relaxed font-sans">
                {result.family_warning || result.familyWarning}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
