import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getConfig, getLimits, updateLimits, resetLimits } from '../services/api';
import SenderConfig from '../components/SenderConfig';

export default function Settings() {
  const [savedConfig, setSavedConfig] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const [customLimit, setCustomLimit] = useState('');
  const [updatingLimit, setUpdatingLimit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getConfig().then(r => { if (r.success) setSavedConfig(r.data); }).catch(() => {}),
      getLimits().then(r => { if (r.success) setLimitInfo(r.data); }).catch(() => {})
    ]).finally(() => setLoading(false));
  }, []);

  async function handleSaved() {
    // Refresh config + limits after save
    try {
      const [cr, lr] = await Promise.all([getConfig(), getLimits()]);
      if (cr.success) setSavedConfig(cr.data);
      if (lr.success) setLimitInfo(lr.data);
    } catch {}
  }

  async function handleUpdateLimit(e) {
    e.preventDefault();
    if (!customLimit) return;
    setUpdatingLimit(true);
    try {
      const res = await updateLimits(Number(customLimit));
      if (res.success) {
        setLimitInfo(res.data);
        toast.success(res.message);
        setCustomLimit('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update limit.');
    }
    setUpdatingLimit(false);
  }

  async function handleResetLimit() {
    try {
      const res = await resetLimits();
      if (res.success) {
        setLimitInfo(res.data);
        toast.success('Daily limit reset to default.');
        setCustomLimit('');
      }
    } catch {
      toast.error('Failed to reset limit.');
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your sender account and sending limits</p>
      </div>

      {/* Sender Config */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-5">Sender Configuration</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <SenderConfig initialConfig={savedConfig || {}} onSaved={handleSaved} />
        )}
      </section>

      {/* Daily Limits */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-2">Daily Sending Limits</h2>
        <p className="text-sm text-gray-500 mb-5">
          Adjust how many emails BulkMailer Pro sends per day to keep your account safe.
        </p>

        {limitInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-lg font-bold text-gray-700">{limitInfo.sentToday}</p>
                <p className="text-xs text-gray-500">Sent today</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-lg font-bold text-blue-600">{limitInfo.dailyLimit}</p>
                <p className="text-xs text-blue-500">Current limit</p>
              </div>
              <div className={`rounded-lg p-3 ${limitInfo.remaining > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-lg font-bold ${limitInfo.remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>{limitInfo.remaining}</p>
                <p className={`text-xs ${limitInfo.remaining > 0 ? 'text-green-500' : 'text-red-500'}`}>Remaining</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">
                Default limit for <strong>{limitInfo.domain}</strong>: {limitInfo.defaultLimit}/day ·
                Provider maximum: {limitInfo.providerMax}/day
                {limitInfo.customLimit ? ` · Custom override: ${limitInfo.customLimit}/day` : ''}
              </p>
            </div>

            <form onSubmit={handleUpdateLimit} className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Daily Limit Override</label>
                <input
                  type="number"
                  min={1}
                  max={limitInfo.providerMax}
                  value={customLimit}
                  onChange={e => setCustomLimit(e.target.value)}
                  placeholder={`1 – ${limitInfo.providerMax} (provider max)`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={updatingLimit || !customLimit}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {updatingLimit ? 'Updating…' : 'Update'}
                </button>
                {limitInfo.customLimit && (
                  <button
                    type="button"
                    onClick={handleResetLimit}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                Gmail's hard server limit is 500/day. <strong>Staying under 400 is strongly recommended</strong> to
                avoid rate limiting and account bans. Overrides above the safe cap are at your own risk.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            {loading ? 'Loading…' : 'Configure a sender account above to see limit info.'}
          </p>
        )}

        {/* Limit table */}
        <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Provider', 'Safe Cap', 'Provider Max'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { provider: 'Gmail / Google', safe: 400, max: 500 },
                { provider: 'Outlook / Hotmail', safe: 250, max: 300 },
                { provider: 'Yahoo Mail', safe: 400, max: 500 },
                { provider: 'iCloud Mail', safe: 200, max: 300 },
                { provider: 'Custom SMTP', safe: 100, max: 200 }
              ].map(row => (
                <tr key={row.provider} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">{row.provider}</td>
                  <td className="px-4 py-2 text-blue-600 font-medium">{row.safe}/day</td>
                  <td className="px-4 py-2 text-gray-500">{row.max}/day</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
