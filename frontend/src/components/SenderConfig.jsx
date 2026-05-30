import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { saveConfig, verifyConfig } from '../services/api';
import ErrorAlert from './ErrorAlert';

const SMTP_PRESETS = {
  'smtp.gmail.com': { port: 587, encryption: 'TLS', label: 'Gmail' },
  'smtp-mail.outlook.com': { port: 587, encryption: 'TLS', label: 'Outlook' },
  'smtp.mail.yahoo.com': { port: 587, encryption: 'TLS', label: 'Yahoo' },
  'smtp.mail.me.com': { port: 587, encryption: 'TLS', label: 'iCloud' },
  custom: { port: 587, encryption: 'TLS', label: 'Custom' }
};

const HOST_OPTIONS = [
  { value: 'smtp.gmail.com', label: 'Gmail (smtp.gmail.com)' },
  { value: 'smtp-mail.outlook.com', label: 'Outlook (smtp-mail.outlook.com)' },
  { value: 'smtp.mail.yahoo.com', label: 'Yahoo (smtp.mail.yahoo.com)' },
  { value: 'smtp.mail.me.com', label: 'iCloud (smtp.mail.me.com)' },
  { value: 'custom', label: 'Custom SMTP' }
];

export default function SenderConfig({ initialConfig = {}, onSaved }) {
  const [form, setForm] = useState({
    email: initialConfig.email || '',
    appPassword: '',
    senderName: initialConfig.senderName || '',
    smtpHost: initialConfig.smtpHost || 'smtp.gmail.com',
    smtpPort: initialConfig.smtpPort || 587,
    encryption: initialConfig.encryption || 'TLS',
    customHost: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // null | 'ok' | 'fail'
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  function handleHostChange(e) {
    const val = e.target.value;
    if (val === 'custom') {
      setForm(f => ({ ...f, smtpHost: '', customHost: '' }));
    } else {
      const preset = SMTP_PRESETS[val];
      setForm(f => ({
        ...f,
        smtpHost: val,
        smtpPort: preset.port,
        encryption: preset.encryption,
        customHost: ''
      }));
    }
    setVerifyStatus(null);
  }

  function getEffectiveHost() {
    if (form.smtpHost === '' || form.smtpHost === 'custom') return form.customHost;
    return form.smtpHost;
  }

  function isCustomHost() {
    return !Object.keys(SMTP_PRESETS).filter(k => k !== 'custom').includes(form.smtpHost);
  }

  async function handleVerify() {
    setError('');
    const host = getEffectiveHost();
    if (!form.email || !form.appPassword || !host) {
      setError('Fill in email, app password, and SMTP host before verifying.');
      return;
    }
    setVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await verifyConfig({
        email: form.email,
        appPassword: form.appPassword,
        smtpHost: host,
        smtpPort: form.smtpPort,
        encryption: form.encryption
      });
      if (res.success) {
        setVerifyStatus('ok');
        setVerifyMsg(res.message);
        toast.success('SMTP connection verified!');
      } else {
        setVerifyStatus('fail');
        setVerifyMsg(res.message);
      }
    } catch (err) {
      setVerifyStatus('fail');
      setVerifyMsg(err.response?.data?.message || 'Verification failed.');
    }
    setVerifying(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    const host = getEffectiveHost();
    if (!form.email || !host) {
      setError('Email and SMTP host are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!form.appPassword && !initialConfig.appPassword) {
      setError('App password is required.');
      return;
    }
    setSaving(true);
    try {
      await saveConfig({
        email: form.email,
        appPassword: form.appPassword || undefined,
        senderName: form.senderName || form.email,
        smtpHost: host,
        smtpPort: form.smtpPort,
        encryption: form.encryption
      });
      toast.success('Sender configuration saved!');
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save configuration.');
    }
    setSaving(false);
  }

  const selectedPreset = HOST_OPTIONS.find(o => o.value === form.smtpHost) ? form.smtpHost : 'custom';

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email Address</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="yourname@gmail.com"
          required
        />
      </div>

      {/* Sender Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
        <input
          type="text"
          value={form.senderName}
          onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your Name or Business"
        />
      </div>

      {/* App Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">App Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.appPassword}
            onChange={e => setForm(f => ({ ...f, appPassword: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={initialConfig.appPassword ? '(saved — enter new to change)' : 'xxxx xxxx xxxx xxxx'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* SMTP Host */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
        <select
          value={selectedPreset}
          onChange={handleHostChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {HOST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {isCustomHost() && (
          <input
            type="text"
            value={form.customHost}
            onChange={e => setForm(f => ({ ...f, customHost: e.target.value }))}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="smtp.yourdomain.com"
          />
        )}
      </div>

      {/* Port + Encryption */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
          <input
            type="number"
            value={form.smtpPort}
            onChange={e => setForm(f => ({ ...f, smtpPort: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
          <select
            value={form.encryption}
            onChange={e => {
              const enc = e.target.value;
              setForm(f => ({ ...f, encryption: enc, smtpPort: enc === 'SSL' ? 465 : 587 }));
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TLS">TLS (recommended)</option>
            <option value="SSL">SSL (port 465)</option>
          </select>
        </div>
      </div>

      {/* Verify status */}
      {verifyStatus && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${verifyStatus === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {verifyStatus === 'ok'
            ? <CheckCircleIcon className="h-5 w-5 text-green-500" />
            : <XCircleIcon className="h-5 w-5 text-red-500" />}
          {verifyMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying}
          className="flex-1 border border-blue-500 text-blue-500 font-medium py-2 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50 transition-colors"
        >
          {verifying ? 'Verifying...' : 'Test Connection'}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-blue-500 text-white font-medium py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* App Password Help */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHelp(h => !h)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          How to get a Gmail App Password
          <span className="text-gray-400">{showHelp ? '▲' : '▼'}</span>
        </button>
        {showHelp && (
          <div className="px-4 py-3 space-y-2 text-sm text-gray-600">
            <div className="flex gap-2"><span className="font-bold text-blue-500">1.</span><span>Go to <strong>myaccount.google.com</strong></span></div>
            <div className="flex gap-2"><span className="font-bold text-blue-500">2.</span><span>Click <strong>Security</strong> → enable <strong>2-Step Verification</strong> (required)</span></div>
            <div className="flex gap-2"><span className="font-bold text-blue-500">3.</span><span>Search for <strong>"App Passwords"</strong> in the search bar</span></div>
            <div className="flex gap-2"><span className="font-bold text-blue-500">4.</span><span>Select app: <strong>Mail</strong>, device: <strong>Other</strong> → click <strong>Generate</strong></span></div>
            <div className="flex gap-2"><span className="font-bold text-blue-500">5.</span><span>Copy the 16-character password and paste it above</span></div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2 text-xs text-yellow-800">
              Never use your regular Gmail password — App Passwords are required for SMTP access.
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
