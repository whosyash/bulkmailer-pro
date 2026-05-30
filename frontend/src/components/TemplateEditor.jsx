import React, { useState } from 'react';
import ErrorAlert from './ErrorAlert';

const PLACEHOLDER_VARS = ['{{name}}', '{{email}}', '{{company}}', '{{niche}}'];

const DEFAULT_BODY = `<p>Hi {{name}},</p>

<p>I hope this message finds you well! I wanted to reach out because I specialise in building
visually stunning, fully functional websites tailored to your specific requirements.</p>

<p>Whether you need a brand-new site or a redesign, I can help you create a professional
online presence that drives results.</p>

<p>Would you be open to a quick chat to discuss your goals?</p>

<p>Best regards,<br/>
<strong>Your Name</strong></p>`;

export default function TemplateEditor({ template = null, onSave, onCancel, saving = false }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    niche: template?.niche || 'general',
    subject: template?.subject || 'Hi {{name}}, let\'s build something great together',
    body: template?.body || DEFAULT_BODY
  });
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  function renderPreview(html) {
    return html
      .replace(/\{\{name\}\}/gi, 'Alex')
      .replace(/\{\{email\}\}/gi, 'alex@example.com')
      .replace(/\{\{company\}\}/gi, 'Acme Corp')
      .replace(/\{\{niche\}\}/gi, form.niche || 'general');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Template name is required.'); return; }
    if (!form.subject.trim()) { setError('Subject line is required.'); return; }
    if (!form.body.trim()) { setError('Template body cannot be empty.'); return; }
    onSave(form);
  }

  function insertPlaceholder(ph) {
    const ta = document.getElementById('template-body');
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newBody = form.body.slice(0, start) + ph + form.body.slice(end);
    setForm(f => ({ ...f, body: newBody }));
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + ph.length;
      ta.focus();
    }, 0);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Fitness Outreach Template"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Niche</label>
          <input
            type="text"
            value={form.niche}
            onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="general, fitness, ecommerce…"
          />
          <p className="text-xs text-gray-400 mt-1">Use "general" to match all recipients with no niche-specific template.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line *</label>
        <input
          type="text"
          value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Email Body (HTML) *</label>
          <button type="button" onClick={() => setPreview(p => !p)} className="text-xs text-blue-500 hover:text-blue-700">
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {/* Placeholder insert buttons */}
        <div className="flex flex-wrap gap-1 mb-2">
          {PLACEHOLDER_VARS.map(ph => (
            <button
              key={ph}
              type="button"
              onClick={() => insertPlaceholder(ph)}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 font-mono"
            >
              {ph}
            </button>
          ))}
          <span className="text-xs text-gray-400 self-center ml-1">Click to insert at cursor</span>
        </div>

        {preview ? (
          <div
            className="border border-gray-200 rounded-lg p-4 min-h-[200px] text-sm text-gray-700 bg-white"
            dangerouslySetInnerHTML={{ __html: renderPreview(form.body) }}
          />
        ) : (
          <textarea
            id="template-body"
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={12}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="<p>Hi {{name}},</p><p>...</p>"
            required
          />
        )}
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-blue-500 text-white font-medium py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : template ? 'Update Template' : 'Save Template'}
        </button>
      </div>
    </form>
  );
}
