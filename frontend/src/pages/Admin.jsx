import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon, ClipboardDocumentIcon, NoSymbolIcon,
  CheckCircleIcon, TrashIcon, ArrowRightStartOnRectangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { adminListCodes, adminCreateCode, adminRevokeCode, adminDeleteCode, logout } from '../services/api';

function CodeRow({ entry, onRevoke, onDelete, onCopy }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={`border rounded-xl p-4 transition-all ${entry.active ? 'border-gray-200 bg-white' : 'border-red-100 bg-red-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{entry.clientName}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {entry.active ? 'Active' : 'Revoked'}
            </span>
          </div>
          {entry.notes && <p className="text-xs text-gray-400 mt-0.5">{entry.notes}</p>}
          <div className="flex items-center gap-1.5 mt-2">
            <code className="text-sm font-mono font-bold tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {entry.code}
            </code>
            <button
              onClick={() => onCopy(entry.code)}
              className="text-gray-400 hover:text-blue-500 p-1"
              title="Copy code"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
            <span>Created {new Date(entry.createdAt).toLocaleDateString()}</span>
            {entry.lastUsed && <span>Last used {new Date(entry.lastUsed).toLocaleDateString()}</span>}
            {entry.useCount > 0 && <span>{entry.useCount} login{entry.useCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={() => onRevoke(entry.code)}
            title={entry.active ? 'Revoke access' : 'Restore access'}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              entry.active
                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                : 'border-green-200 text-green-600 hover:bg-green-50'
            }`}
          >
            {entry.active
              ? <NoSymbolIcon className="h-4 w-4" />
              : <CheckCircleIcon className="h-4 w-4" />}
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50"
              title="Delete permanently"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => { onDelete(entry.code); setConfirmDelete(false); }}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg">
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin({ onLogout }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchCodes(); }, []);

  async function fetchCodes() {
    setLoading(true);
    try {
      const res = await adminListCodes();
      setCodes(res.data || []);
    } catch {
      toast.error('Failed to load access codes.');
    }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setCreating(true);
    try {
      const res = await adminCreateCode({ clientName, notes });
      setCodes(c => [...c, res.data]);
      toast.success(`Code created for ${clientName}!`);
      setClientName('');
      setNotes('');
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create code.');
    }
    setCreating(false);
  }

  async function handleRevoke(code) {
    try {
      const res = await adminRevokeCode(code);
      setCodes(c => c.map(e => e.code === code ? res.data : e));
      toast(res.message);
    } catch {
      toast.error('Failed to update code.');
    }
  }

  async function handleDelete(code) {
    try {
      await adminDeleteCode(code);
      setCodes(c => c.filter(e => e.code !== code));
      toast.success('Code deleted.');
    } catch {
      toast.error('Failed to delete code.');
    }
  }

  function handleCopy(code) {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  const active = codes.filter(c => c.active).length;
  const revoked = codes.filter(c => !c.active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e293b] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
          <span className="text-white font-bold">BulkMailer Pro — Admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm"
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          Sign out
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Codes', value: codes.length, color: 'text-blue-600 bg-blue-50' },
            { label: 'Active', value: active, color: 'text-green-600 bg-green-50' },
            { label: 'Revoked', value: revoked, color: 'text-red-600 bg-red-50' }
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-xl p-3 text-center`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* New code button / form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-semibold py-3 rounded-xl hover:bg-blue-600 transition-colors mb-6"
          >
            <PlusIcon className="h-5 w-5" />
            Generate New Access Code
          </button>
        ) : (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">New Access Code</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. John Smith / Acme Corp"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Paid ₹2000 on 30 May"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={creating || !clientName.trim()}
                className="flex-1 bg-blue-500 text-white font-medium py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
                {creating ? 'Generating…' : 'Generate Code'}
              </button>
            </div>
          </form>
        )}

        {/* Code list */}
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <ShieldCheckIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No access codes yet.</p>
            <p className="text-gray-400 text-xs mt-1">Generate one above for your first paying client.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Access Codes</p>
            {[...codes].reverse().map(entry => (
              <CodeRow
                key={entry.code}
                entry={entry}
                onRevoke={handleRevoke}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
