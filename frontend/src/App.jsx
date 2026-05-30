import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import {
  HomeIcon, PaperAirplaneIcon, DocumentTextIcon, Cog6ToothIcon,
  EnvelopeIcon, Bars3Icon, XMarkIcon, LockClosedIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';

import Dashboard from './pages/Dashboard';
import Compose from './pages/Compose';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import SenderConfig from './components/SenderConfig';
import { checkAuth, login, getConfig } from './services/api';

const DISCLAIMER_KEY = 'bmp_disclaimer_accepted';

// ─── Password gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlocked }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(password);
      if (res.success) onUnlocked();
      else setError('Incorrect password.');
    } catch {
      setError('Incorrect password.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#1e293b] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-50 rounded-full p-4 mb-3">
            <LockClosedIcon className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">BulkMailer Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the access password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Access password"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Mandatory email setup screen ─────────────────────────────────────────────
function SetupRequired({ onConfigured }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <EnvelopeIcon className="h-7 w-7 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">BulkMailer Pro</span>
          </div>
          <p className="text-gray-500 text-sm">One-time setup required before you can send emails</p>
        </div>

        {/* Steps overview */}
        <div className="flex items-center justify-center gap-4 mb-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
            <span className="font-medium text-blue-600">Set up email</span>
          </div>
          <div className="h-px w-8 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs font-bold">2</div>
            <span>Create templates</span>
          </div>
          <div className="h-px w-8 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs font-bold">3</div>
            <span>Send emails</span>
          </div>
        </div>

        {/* Config card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1">Connect Your Email Account</h2>
          <p className="text-sm text-gray-500 mb-5">
            Enter your own Gmail (or other SMTP) credentials. This app never uses a shared or default email —
            every email you send will come from your own account.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-700">
            <strong>Gmail users:</strong> You must use an <strong>App Password</strong>, not your regular Gmail password.
            Enable 2-Step Verification first, then generate an App Password at myaccount.google.com → Security → App Passwords.
          </div>

          <SenderConfig initialConfig={{}} onSaved={onConfigured} />
        </div>
      </div>
    </div>
  );
}

// ─── Disclaimer modal ──────────────────────────────────────────────────────────
function DisclaimerModal({ onAccept }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <EnvelopeIcon className="h-7 w-7 text-blue-500" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">BulkMailer Pro</h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Important Notice:</strong> BulkMailer Pro is for legitimate outreach only.
            Sending unsolicited emails may violate <strong>CAN-SPAM</strong>, <strong>GDPR</strong>, and your
            provider's Terms of Service. Exceeding daily limits may result in <strong>account suspension</strong>.
            Use responsibly.
          </p>
        </div>
        <ul className="text-sm text-gray-600 space-y-1 mb-5">
          <li>✅ Emails are sent from YOUR own account only</li>
          <li>✅ Gmail App Passwords — not your regular password</li>
          <li>✅ Automated rate limiting protects your account</li>
          <li>❌ Spam or unsolicited bulk email is prohibited</li>
        </ul>
        <button
          onClick={onAccept}
          className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          I Understand — Continue
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
const navItems = [
  { to: '/', label: 'Dashboard', Icon: HomeIcon, exact: true },
  { to: '/compose', label: 'Compose', Icon: PaperAirplaneIcon },
  { to: '/templates', label: 'Templates', Icon: DocumentTextIcon },
  { to: '/settings', label: 'Settings', Icon: Cog6ToothIcon }
];

function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
      <aside className={`
        fixed left-0 top-0 bottom-0 z-40 w-64 bg-[#1e293b] flex flex-col
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="h-6 w-6 text-blue-400" />
            <span className="text-white font-bold text-base">BulkMailer Pro</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3">
          {navItems.map(({ to, label, Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <p className="text-slate-500 text-xs text-center">v1.0.0 · Gmail safe cap: 400/day</p>
        </div>
      </aside>
    </>
  );
}

function MobileTopBar({ onMenuOpen }) {
  return (
    <header className="md:hidden sticky top-0 z-20 bg-[#1e293b] px-4 py-3 flex items-center gap-3">
      <button onClick={onMenuOpen} className="text-slate-300 hover:text-white">
        <Bars3Icon className="h-6 w-6" />
      </button>
      <EnvelopeIcon className="h-5 w-5 text-blue-400" />
      <span className="text-white font-bold text-base">BulkMailer Pro</span>
    </header>
  );
}

function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex">
      {navItems.map(({ to, label, Icon, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          <Icon className="h-5 w-5 mb-0.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// ─── Main app shell ────────────────────────────────────────────────────────────
function AppShell({ onSignOut }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(!localStorage.getItem(DISCLAIMER_KEY));

  return (
    <>
      {showDisclaimer && (
        <DisclaimerModal onAccept={() => {
          localStorage.setItem(DISCLAIMER_KEY, 'true');
          setShowDisclaimer(false);
        }} />
      )}
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col md:ml-64 min-w-0">
          <MobileTopBar onMenuOpen={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/compose" element={<Compose />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/settings" element={<Settings onConfigCleared={onSignOut} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  // 'checking' | 'locked' | 'setup' | 'ready'
  const [stage, setStage] = useState('checking');

  async function checkStage() {
    try {
      // 1. Check password gate
      const auth = await checkAuth();
      if (auth.passwordRequired && !auth.authenticated) {
        setStage('locked');
        return;
      }
      // 2. Check if email has been configured
      const cfg = await getConfig();
      if (!cfg.data?.email) {
        setStage('setup');
      } else {
        setStage('ready');
      }
    } catch {
      setStage('setup'); // default to setup if API unreachable
    }
  }

  useEffect(() => { checkStage(); }, []);

  if (stage === 'checking') {
    return (
      <div className="min-h-screen bg-[#1e293b] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (stage === 'locked') {
    return (
      <>
        <PasswordGate onUnlocked={checkStage} />
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      </>
    );
  }

  if (stage === 'setup') {
    return (
      <>
        <SetupRequired onConfigured={() => {
          toast.success('Email configured! Welcome to BulkMailer Pro.');
          setStage('ready');
        }} />
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      </>
    );
  }

  return (
    <BrowserRouter>
      <AppShell onSignOut={() => setStage('setup')} />
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontSize: '14px' } }} />
    </BrowserRouter>
  );
}
