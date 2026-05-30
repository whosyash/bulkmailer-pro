import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaperAirplaneIcon, DocumentTextIcon, Cog6ToothIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getSendHistory, getLimits } from '../services/api';

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600'
  };
  return (
    <div className={`${colors[color]} rounded-xl p-5`}>
      <p className="text-3xl font-bold">{value ?? '—'}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [limitInfo, setLimitInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSendHistory().then(r => setHistory(r.data || [])).catch(() => {}),
      getLimits().then(r => { if (r.success) setLimitInfo(r.data); }).catch(() => {})
    ]).finally(() => setLoading(false));
  }, []);

  const today = history.filter(s => s.date === new Date().toISOString().split('T')[0]);
  const totalSentToday = today.reduce((a, s) => a + (s.sent || 0), 0);
  const totalFailedToday = today.reduce((a, s) => a + (s.failed || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your email campaigns</p>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Sent Today" value={totalSentToday} color="green" />
        <StatCard
          label="Remaining Today"
          value={limitInfo?.remaining ?? (loading ? '…' : '—')}
          sub={limitInfo ? `of ${limitInfo.dailyLimit} daily limit` : ''}
          color={limitInfo?.remaining === 0 ? 'red' : 'blue'}
        />
        <StatCard label="Failed Today" value={totalFailedToday} color={totalFailedToday > 0 ? 'red' : 'green'} />
        <StatCard label="Sessions Today" value={today.length} color="amber" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { to: '/compose', icon: PaperAirplaneIcon, label: 'New Campaign', desc: 'Upload recipients & send' },
          { to: '/templates', icon: DocumentTextIcon, label: 'Templates', desc: 'Create & manage email templates' },
          { to: '/settings', icon: Cog6ToothIcon, label: 'Settings', desc: 'Configure sender & limits' }
        ].map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="bg-blue-50 rounded-lg p-2.5">
              <Icon className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Send history */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-800">Recent Send History</h2>
          <span className="text-xs text-gray-400 ml-auto">Last 10 sessions</span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400 text-sm">No send sessions yet.</p>
            <Link to="/compose" className="text-blue-500 text-sm hover:underline mt-1 inline-block">
              Start your first campaign →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Sender', 'Sent', 'Failed', 'Skipped', 'Duration', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((s, i) => (
                  <tr key={s.id || i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{s.date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.sender}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{s.sent}</td>
                    <td className="px-4 py-3 text-red-500">{s.failed}</td>
                    <td className="px-4 py-3 text-amber-500">{s.skipped}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDuration(s.duration)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'completed' ? 'bg-green-100 text-green-700' :
                        s.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                        s.status === 'limit_reached' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
