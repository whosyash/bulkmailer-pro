import React, { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api';
import TemplateEditor from '../components/TemplateEditor';

function TemplateCard({ template, onEdit, onDelete, onDuplicate }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">{template.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 font-mono truncate max-w-xs">{template.subject}</p>
        </div>
        <span className="ml-3 px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full flex-shrink-0">
          {template.niche || 'general'}
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Updated {new Date(template.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(template)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600"
        >
          <PencilIcon className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={() => onDuplicate(template)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600"
        >
          <DocumentDuplicateIcon className="h-3.5 w-3.5" /> Duplicate
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-red-300 hover:text-red-500 ml-auto"
          >
            <TrashIcon className="h-3.5 w-3.5" /> Delete
          </button>
        ) : (
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => { onDelete(template.id); setConfirmDelete(false); }}
              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await getTemplates();
      setTemplates(res.data || []);
    } catch {
      toast.error('Failed to load templates.');
    }
    setLoading(false);
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, form);
        toast.success('Template updated!');
      } else {
        await createTemplate(form);
        toast.success('Template created!');
      }
      await fetchTemplates();
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template.');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    try {
      await deleteTemplate(id);
      toast.success('Template deleted.');
      setTemplates(t => t.filter(x => x.id !== id));
    } catch {
      toast.error('Failed to delete template.');
    }
  }

  async function handleDuplicate(template) {
    setSaving(true);
    try {
      await createTemplate({
        name: `${template.name} (copy)`,
        niche: template.niche,
        subject: template.subject,
        body: template.body
      });
      toast.success('Template duplicated!');
      await fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate template.');
    }
    setSaving(false);
  }

  function handleEdit(template) {
    setEditingTemplate(template);
    setShowEditor(true);
  }

  function handleNew() {
    setEditingTemplate(null);
    setShowEditor(true);
  }

  if (showEditor) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => { setShowEditor(false); setEditingTemplate(null); }} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </h1>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSave}
            onCancel={() => { setShowEditor(false); setEditingTemplate(null); }}
            saving={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your email templates</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Niche info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-700">
        <strong>Tip:</strong> Create a <span className="font-mono bg-blue-100 px-1 rounded">general</span> template
        as a fallback for recipients with no matching niche. Niche-specific templates take priority.
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-3">No templates yet.</p>
          <button onClick={handleNew} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
