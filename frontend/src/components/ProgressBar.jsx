import React from 'react';
import { PauseIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid';

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatEta(secs) {
  if (!secs || secs <= 0) return '—';
  if (secs < 60) return `~${secs}s`;
  return `~${Math.ceil(secs / 60)}m`;
}

export default function ProgressBar({
  progress,
  status,
  onPause,
  onCancel,
  sessionId,
  startTime
}) {
  if (!progress && !status) return null;

  const pct = progress?.percentage || 0;
  const sent = progress?.sent || 0;
  const failed = progress?.failed || 0;
  const skipped = progress?.skipped || 0;
  const total = progress?.total || 0;
  const currentEmail = progress?.currentEmail || '';
  const eta = progress?.eta;
  const rate = progress?.rate;
  const elapsed = startTime ? Date.now() - startTime : 0;

  const isPaused = status === 'paused';
  const isRunning = status === 'running';
  const isDone = ['completed', 'cancelled', 'limit_reached', 'error'].includes(status);

  const statusLabels = {
    running: '⏳ Sending…',
    paused: '⏸ Paused',
    completed: '✅ Completed',
    cancelled: '🛑 Cancelled',
    limit_reached: '⛔ Limit Reached',
    error: '❌ Error'
  };

  const barColor = isDone
    ? (status === 'completed' ? 'bg-green-500' : 'bg-amber-500')
    : isPaused
    ? 'bg-yellow-400'
    : 'bg-blue-500';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{statusLabels[status] || 'Sending…'}</h3>
        {!isDone && (
          <div className="flex gap-2">
            <button
              onClick={onPause}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
            >
              {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-500 rounded-lg text-xs hover:bg-red-50"
            >
              <StopIcon className="h-4 w-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress: {pct}%</span>
          <span>{progress?.current || 0} / {total}</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500 rounded-full`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {[
          { label: 'Sent', value: sent, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Failed', value: failed, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Skipped', value: skipped, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Remaining', value: Math.max(0, total - (progress?.current || 0)), color: 'text-blue-600', bg: 'bg-blue-50' }
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg py-2`}>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className={`text-xs ${color} opacity-80`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Current email + ETA */}
      <div className="grid grid-cols-3 gap-2 text-sm text-gray-500">
        {currentEmail && (
          <div className="col-span-3 bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-400 mr-2">Current:</span>
            <span className="font-mono text-gray-700">{currentEmail}</span>
          </div>
        )}
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
          <p className="font-medium text-gray-700">{formatEta(eta)}</p>
          <p className="text-xs text-gray-400">ETA</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
          <p className="font-medium text-gray-700">{rate ? `${rate}/min` : '—'}</p>
          <p className="text-xs text-gray-400">Rate</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
          <p className="font-medium text-gray-700">{elapsed ? formatDuration(elapsed) : '—'}</p>
          <p className="text-xs text-gray-400">Elapsed</p>
        </div>
      </div>
    </div>
  );
}
