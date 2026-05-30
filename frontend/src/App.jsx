import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  HomeIcon, PaperAirplaneIcon, DocumentTextIcon, Cog6ToothIcon, EnvelopeIcon
} from '@heroicons/react/24/outline';

import Dashboard from './pages/Dashboard';
import Compose from './pages/Compose';
import Templates from './pages/Templates';
import Settings from './pages/Settings';

const DISCLAIMER_KEY = 'bmp_disclaimer_accepted';

function DisclaimerModal({ onAccept }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        <div className="flex items-center gap-3 mb-4">
          <EnvelopeIcon className="h-8 w-8 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">BulkMailer Pro</h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Important Notice:</strong> BulkMailer Pro is intended for legitimate email outreach only.
            Sending unsolicited emails may violate <strong>CAN-SPAM</strong>, <strong>GDPR</strong>, and your
            email provider's Terms of Service. Daily limits are enforced to protect your account.
            Exceeding override limits may result in <strong>permanent account suspension</strong>.
            Use responsibly.
          </p>
        </div>
        <ul className="text-sm text-gray-600 space-y-1 mb-6">
          <li>✅ Legitimate outreach to opted-in recipients</li>
          <li>✅ Gmail App Passwords — not your regular password</li>
          <li>✅ Automated rate limiting to protect your account</li>
          <li>❌ Spam or unsolicited bulk email is prohibited</li>
        </ul>
        <button
          onClick={onAccept}
          className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          I Understand — Continue to BulkMailer Pro
        </button>
      </div>
    </div>
  );
}

const navItems = [
  { to: '/', label: 'Dashboard', Icon: HomeIcon, exact: true },
  { to: '/compose', label: 'Compose', Icon: PaperAirplaneIcon },
  { to: '/templates', label: 'Templates', Icon: DocumentTextIcon },
  { to: '/settings', label: 'Settings', Icon: Cog6ToothIcon }
];

function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-[#1e293b] flex flex-col fixed left-0 top-0 bottom-0 z-40">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <EnvelopeIcon className="h-7 w-7 text-blue-400" />
          <span className="text-white font-bold text-lg">BulkMailer Pro</span>
        </div>
        <p className="text-slate-400 text-xs mt-1">Bulk email made easy</p>
      </div>
      <nav className="flex-1 py-4 px-3">
        {navItems.map(({ to, label, Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
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
  );
}

export default function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISCLAIMER_KEY)) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setShowDisclaimer(false);
  };

  return (
    <BrowserRouter>
      {showDisclaimer && <DisclaimerModal onAccept={handleAccept} />}
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-64 overflow-auto">
          <div className="max-w-6xl mx-auto p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </BrowserRouter>
  );
}
