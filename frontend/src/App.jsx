import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  HomeIcon, PaperAirplaneIcon, DocumentTextIcon, Cog6ToothIcon,
  EnvelopeIcon, Bars3Icon, XMarkIcon
} from '@heroicons/react/24/outline';

import Dashboard from './pages/Dashboard';
import Compose from './pages/Compose';
import Templates from './pages/Templates';
import Settings from './pages/Settings';

const DISCLAIMER_KEY = 'bmp_disclaimer_accepted';

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
          <li>✅ Legitimate outreach to opted-in recipients</li>
          <li>✅ Gmail App Passwords — not your regular password</li>
          <li>✅ Automated rate limiting to protect your account</li>
          <li>❌ Spam or unsolicited bulk email is prohibited</li>
        </ul>
        <button
          onClick={onAccept}
          className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
        >
          I Understand — Continue
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

function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed left-0 top-0 bottom-0 z-40 w-64 bg-[#1e293b] flex flex-col
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
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

/* Bottom nav for mobile */
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

export default function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISCLAIMER_KEY)) {
      setShowDisclaimer(true);
    }
  }, []);

  return (
    <BrowserRouter>
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
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>

        <MobileBottomNav />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{ duration: 4000, style: { fontSize: '14px' } }}
      />
    </BrowserRouter>
  );
}
