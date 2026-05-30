import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

import DailyLimitBanner from '../components/DailyLimitBanner';
import FileUploader from '../components/FileUploader';
import RecipientPreview from '../components/RecipientPreview';
import SendControls from '../components/SendControls';
import ProgressBar from '../components/ProgressBar';
import ErrorAlert from '../components/ErrorAlert';

import { getTemplates, getConfig, startSend, pauseSend, cancelSend, openSendStream } from '../services/api';

const STEPS = [
  { id: 1, label: 'Upload File' },
  { id: 2, label: 'Choose Template' },
  { id: 3, label: 'Configure Send' },
  { id: 4, label: 'Sending…' },
  { id: 5, label: 'Report' }
];

function StepIndicator({ current }) {
  return (
    <div className="mb-6">
      {/* Mobile: simple text indicator */}
      <div className="sm:hidden flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-blue-600">
          Step {current} of {STEPS.length}: {STEPS[current - 1]?.label}
        </span>
        <span className="text-xs text-gray-400">{Math.round(((current - 1) / (STEPS.length - 1)) * 100)}%</span>
      </div>
      <div className="sm:hidden w-full h-1.5 bg-gray-200 rounded-full">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>

      {/* Desktop: full step row */}
      <div className="hidden sm:flex items-center">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                step.id < current ? 'bg-green-500 border-green-500 text-white' :
                step.id === current ? 'bg-blue-500 border-blue-500 text-white' :
                'bg-white border-gray-300 text-gray-400'
              }`}>
                {step.id < current ? '✓' : step.id}
              </div>
              <span className={`text-xs mt-1 font-medium ${step.id === current ? 'text-blue-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${step.id < current ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function downloadReportCSV(results) {
  const header = 'Email,Name,Niche,Status,Reason,Timestamp\n';
  const rows = results.map(r =>
    `"${r.email}","${r.name || ''}","${r.niche || ''}","${r.status}","${(r.reason || '').replace(/"/g, '""')}","${r.timestamp || ''}"`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `send-report-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Compose() {
  const [step, setStep] = useState(1);
  const [parsedData, setParsedData] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [sendStatus, setSendStatus] = useState('idle');
  const [sendReport, setSendReport] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [batchMsg, setBatchMsg] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState('');
  const esRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getTemplates().then(r => setTemplates(r.data || [])).catch(() => {}),
      getConfig().then(r => { if (r.success && r.data?.email) { setConfig(r.data); setConfigLoaded(true); } }).catch(() => {})
    ]);
  }, []);

  // SSE event handlers
  const handleSSEEvent = useCallback((data) => {
    switch (data.event) {
      case 'progress':
        setProgress(data);
        setSendStatus('running');
        setBatchMsg('');
        setCountdown(null);
        break;
      case 'batch_pause':
        setBatchMsg(data.message);
        break;
      case 'countdown':
        setCountdown(data.seconds);
        break;
      case 'completed':
        setSendStatus('completed');
        setSendReport(data.summary);
        setProgress(p => ({ ...p, percentage: 100 }));
        if (esRef.current) { esRef.current.close(); esRef.current = null; }
        setStep(5);
        toast.success(`Done! Sent ${data.summary?.sent} emails.`);
        break;
      case 'cancelled':
        setSendStatus('cancelled');
        if (esRef.current) { esRef.current.close(); esRef.current = null; }
        toast('Send cancelled.');
        setStep(5);
        break;
      case 'limit_reached':
        setSendStatus('limit_reached');
        if (esRef.current) { esRef.current.close(); esRef.current = null; }
        toast.error(data.message);
        setStep(5);
        break;
      case 'error':
        setSendStatus('error');
        setError(data.message);
        if (esRef.current) { esRef.current.close(); esRef.current = null; }
        toast.error(data.message);
        break;
      default:
        break;
    }
  }, []);

  function handleFileParsed(data, name) {
    setParsedData(data);
    setFileName(name);
    if (data) {
      toast.success(`Parsed ${data.validCount} valid recipients.`);
    }
  }

  function handleGoStep2() {
    if (!parsedData || parsedData.validCount === 0) {
      toast.error('Upload a file with valid recipients first.');
      return;
    }
    setStep(2);
  }

  function handleGoStep3() {
    setStep(3);
  }

  async function handleStartSend({ count, randomize, addUnsubscribe }) {
    setError('');
    try {
      const res = await startSend({
        recipients: parsedData.valid,
        count,
        randomize,
        addUnsubscribe
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const sid = res.data.sessionId;
      setSessionId(sid);
      setStartTime(Date.now());
      setSendStatus('running');
      setProgress(null);
      setBatchMsg('');
      setCountdown(null);
      setStep(4);

      // Open SSE stream — each event name maps directly to handleSSEEvent;
      // do NOT add `any: handleSSEEvent` or every event fires the handler twice.
      esRef.current = openSendStream(sid, {
        connected: () => {},
        progress: handleSSEEvent,
        batch_pause: handleSSEEvent,
        countdown: handleSSEEvent,
        completed: handleSSEEvent,
        cancelled: handleSSEEvent,
        limit_reached: handleSSEEvent,
        error: handleSSEEvent,
        streamError: () => {
          toast.error('Lost connection to send stream. Use the status tab to check progress.');
        }
      });

    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to start send.';
      toast.error(msg);
      setError(msg);
    }
  }

  async function handlePause() {
    try {
      const res = await pauseSend(sessionId);
      setSendStatus(res.data?.paused ? 'paused' : 'running');
      toast(res.data?.paused ? 'Paused.' : 'Resumed.');
    } catch {
      toast.error('Failed to pause.');
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel the current send session? Emails already sent will not be retracted.')) return;
    try {
      await cancelSend(sessionId);
      setSendStatus('cancelled');
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    } catch {
      toast.error('Failed to cancel.');
    }
  }

  function handleReset() {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setStep(1);
    setParsedData(null);
    setFileName(null);
    setSelectedTemplateId(null);
    setSessionId(null);
    setProgress(null);
    setSendStatus('idle');
    setSendReport(null);
    setStartTime(null);
    setBatchMsg('');
    setCountdown(null);
    setError('');
  }

  // Niche → template mapping for step 2 display
  const niches = parsedData?.niches || [];
  const nicheTemplateMap = niches.map(niche => {
    const matched = templates.find(t => t.niche?.toLowerCase() === niche.toLowerCase());
    const fallback = matched ? null : templates.find(t => !t.niche || t.niche.toLowerCase() === 'general' || t.niche === '');
    return { niche, template: matched || fallback, exact: !!matched };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compose Campaign</h1>
        <p className="text-gray-500 text-sm mt-1">Send personalized bulk emails in 5 steps</p>
      </div>

      <DailyLimitBanner />
      <StepIndicator current={step} />
      <ErrorAlert message={error} onDismiss={() => setError('')} className="mb-4" />

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Step 1: Upload Recipient File</h2>
          <FileUploader onParsed={handleFileParsed} />
          {parsedData && (
            <div className="mt-6">
              <RecipientPreview parsedData={parsedData} />
              <button
                onClick={handleGoStep2}
                className="mt-4 w-full bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                Continue with {parsedData.validCount} valid recipients →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Choose Template */}
      {step === 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-2">Step 2: Template Assignment</h2>
          <p className="text-sm text-gray-500 mb-5">
            Review which templates will be used for each recipient niche detected in your file.
          </p>

          {templates.length === 0 ? (
            <div className="py-8 text-center bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-amber-700 font-medium">No templates created yet.</p>
              <p className="text-sm text-amber-500 mt-1">Go to Templates to create at least one before sending.</p>
            </div>
          ) : (
            <>
              {niches.length > 0 ? (
                <div className="space-y-3 mb-6">
                  <p className="text-sm font-medium text-gray-700">Detected niches in your file:</p>
                  {nicheTemplateMap.map(({ niche, template, exact }) => (
                    <div key={niche} className={`flex items-center gap-3 p-3 rounded-lg border ${template ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">{niche}</span>
                      <span className="flex-1 text-sm">
                        {template ? (
                          <span className="text-green-700">
                            → <strong>{template.name}</strong>
                            {!exact && <span className="text-xs text-green-500 ml-1">(using general fallback)</span>}
                          </span>
                        ) : (
                          <span className="text-red-600">⚠️ No matching template — recipients with this niche will be skipped</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                  <p className="text-sm text-blue-700">No niche column detected — all recipients will use your general template.</p>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Available Templates:</p>
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <span className="font-medium text-sm text-gray-800">{t.name}</span>
                        <span className="ml-2 px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full">{t.niche || 'general'}</span>
                      </div>
                      <span className="text-xs text-gray-400 truncate max-w-xs ml-3">{t.subject}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50">
              ← Back
            </button>
            <button
              onClick={handleGoStep3}
              disabled={templates.length === 0}
              className="flex-1 bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configure Send */}
      {step === 3 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h2 className="font-semibold text-gray-800">Step 3: Configure Send</h2>
          </div>
          <SendControls
            parsedData={parsedData}
            templates={templates}
            configSaved={configLoaded}
            onStart={handleStartSend}
          />
        </div>
      )}

      {/* Step 4: Sending Progress */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Step 4: Sending…</h2>

          {batchMsg && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              {batchMsg}
              {countdown !== null && (
                <span className="font-bold ml-2 text-blue-800">{countdown}s remaining</span>
              )}
            </div>
          )}

          <ProgressBar
            progress={progress}
            status={sendStatus}
            sessionId={sessionId}
            startTime={startTime}
            onPause={handlePause}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Step 5: Send Report */}
      {step === 5 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-center mb-6">
            {sendStatus === 'completed' ? (
              <CheckCircleIcon className="h-14 w-14 text-green-500 mx-auto mb-3" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-2xl">
                {sendStatus === 'cancelled' ? '🛑' : sendStatus === 'limit_reached' ? '⛔' : '⚠️'}
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {sendStatus === 'completed' ? 'Campaign Complete!' :
               sendStatus === 'cancelled' ? 'Campaign Cancelled' :
               sendStatus === 'limit_reached' ? 'Daily Limit Reached' : 'Send Report'}
            </h2>
          </div>

          {progress && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-6">
              {[
                { label: 'Sent', value: progress.sent, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Failed', value: progress.failed, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Skipped', value: progress.skipped, color: 'text-amber-600', bg: 'bg-amber-50' },
                {
                  label: 'Duration',
                  value: startTime ? `${Math.round((Date.now() - startTime) / 1000)}s` : '—',
                  color: 'text-blue-600',
                  bg: 'bg-blue-50'
                }
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl py-4`}>
                  <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
                  <p className={`text-xs ${color} opacity-80`}>{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {progress?.results?.length > 0 && (
              <button
                onClick={() => {
                  // We pull results from the session state via the SSE progress accumulation
                  // Since we don't accumulate results client-side, just download what we have
                  toast('Download the full report from the backend session.');
                }}
                className="flex items-center gap-2 flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 justify-center"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download Report
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex-1 bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Start New Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
