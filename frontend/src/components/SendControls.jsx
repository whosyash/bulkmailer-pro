import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { checkSpam, getLimits } from '../services/api';

export default function SendControls({ parsedData, templates, onStart, configSaved }) {
  const [count, setCount] = useState('');
  const [randomize, setRandomize] = useState(false);
  const [addUnsubscribe, setAddUnsubscribe] = useState(true);
  const [limitInfo, setLimitInfo] = useState(null);
  const [spamWords, setSpamWords] = useState([]);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validCount = parsedData?.validCount || 0;
  const maxSend = Math.min(validCount, limitInfo?.remaining || 0);

  useEffect(() => {
    if (configSaved) {
      setLoadingLimits(true);
      getLimits()
        .then(r => { if (r.success) setLimitInfo(r.data); })
        .catch(() => {})
        .finally(() => setLoadingLimits(false));
    }
  }, [configSaved]);

  // Check spam words when a template subject changes
  useEffect(() => {
    const allSubjects = templates.map(t => t.subject).join(' ');
    if (!allSubjects.trim()) return;
    checkSpam(allSubjects).then(r => {
      if (r.success) setSpamWords(r.data.words);
    }).catch(() => {});
  }, [templates]);

  const numCount = Number(count);
  const validCount_ = numCount >= 1 && numCount <= maxSend;

  // Build checklist items
  const checklist = [
    {
      ok: configSaved,
      label: 'Sender email configured',
      warn: !configSaved ? 'Configure sender in Settings first.' : null
    },
    {
      ok: validCount > 0,
      label: `${validCount} valid recipients loaded`,
      warn: !validCount ? 'Upload a recipient file.' : null
    },
    {
      ok: templates.length > 0,
      label: templates.length > 0 ? `${templates.length} template(s) available` : 'No templates created',
      warn: !templates.length ? 'Create at least one template.' : null
    },
    {
      ok: limitInfo !== null,
      label: limitInfo ? `Daily limit: ${limitInfo.sentToday}/${limitInfo.dailyLimit} used, ${limitInfo.remaining} remaining` : 'Loading limit info...',
      warn: limitInfo?.limitReached ? `Daily limit reached (${limitInfo.sentToday}/${limitInfo.dailyLimit}). Resets at midnight.` : null
    },
    {
      ok: validCount_ ,
      label: numCount ? `Will send to ${Math.min(numCount, maxSend)} of ${validCount} valid recipients` : 'Select how many to send',
      warn: !validCount_ && count !== '' ? `Enter a number between 1 and ${maxSend}` : null,
      isWarning: numCount > maxSend
    }
  ];

  const hasBlocker = !configSaved || !validCount || !templates.length || limitInfo?.limitReached || !validCount_;
  const hasWarning = spamWords.length > 0 || parsedData?.invalidCount > 0;

  async function handleStart() {
    setShowConfirm(false);
    setStarting(true);
    await onStart({
      count: Math.min(numCount, maxSend),
      randomize,
      addUnsubscribe
    });
    setStarting(false);
  }

  return (
    <div className="space-y-6">
      {/* Recipient count selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-800 mb-4">How many emails to send?</h3>
        {loadingLimits ? (
          <p className="text-sm text-gray-400">Loading daily limit info...</p>
        ) : limitInfo ? (
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-600">{validCount}</p>
              <p className="text-xs text-blue-500">Valid recipients</p>
            </div>
            <div className={`rounded-lg p-3 ${limitInfo.remaining > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-2xl font-bold ${limitInfo.remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>{limitInfo.remaining}</p>
              <p className={`text-xs ${limitInfo.remaining > 0 ? 'text-green-500' : 'text-red-500'}`}>Remaining today</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-600">{maxSend}</p>
              <p className="text-xs text-gray-500">Max sendable now</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number to send (max {maxSend})
            </label>
            <input
              type="number"
              min={1}
              max={maxSend}
              value={count}
              onChange={e => {
                let v = Number(e.target.value);
                if (v > maxSend) v = maxSend;
                setCount(String(v));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`1 – ${maxSend}`}
            />
          </div>
          {maxSend > 0 && (
            <input
              type="range"
              min={1}
              max={maxSend}
              value={numCount || 1}
              onChange={e => setCount(e.target.value)}
              className="w-full accent-blue-500"
            />
          )}
        </div>

        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={randomize}
              onChange={e => setRandomize(e.target.checked)}
              className="rounded accent-blue-500"
            />
            Randomize recipient order
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={addUnsubscribe}
              onChange={e => setAddUnsubscribe(e.target.checked)}
              className="rounded accent-blue-500"
            />
            Append unsubscribe footer
          </label>
        </div>
      </div>

      {/* Pre-send checklist */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Pre-send Checklist</h3>
        <ul className="space-y-2.5">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {item.warn ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className={item.warn ? 'text-amber-700' : 'text-gray-700'}>{item.label}</span>
                {item.warn && <p className="text-xs text-amber-500 mt-0.5">{item.warn}</p>}
              </div>
            </li>
          ))}
          {spamWords.length > 0 && (
            <li className="flex items-start gap-2 text-sm">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-amber-700">Subject may trigger spam filters</span>
                <p className="text-xs text-amber-500 mt-0.5">
                  Found words: {spamWords.map(w => `"${w}"`).join(', ')}
                </p>
              </div>
            </li>
          )}
          {parsedData?.invalidCount > 0 && (
            <li className="flex items-start gap-2 text-sm">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <span className="text-amber-700">{parsedData.invalidCount} invalid rows will be skipped</span>
            </li>
          )}
        </ul>
      </div>

      {/* Start button */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={hasBlocker || starting}
          className="w-full bg-blue-500 text-white font-semibold py-3 rounded-xl text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {starting ? 'Starting...' : `Start Sending ${numCount ? numCount : ''} Emails`}
        </button>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <p className="font-medium text-gray-800 mb-1">Ready to send?</p>
          <p className="text-sm text-gray-500 mb-4">
            You are about to send <strong>{Math.min(numCount, maxSend)}</strong> emails.
            {randomize ? ' Recipients will be selected randomly.' : ' Recipients will be selected in order.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex-1 bg-blue-500 text-white font-semibold py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {starting ? 'Starting...' : 'Confirm & Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
