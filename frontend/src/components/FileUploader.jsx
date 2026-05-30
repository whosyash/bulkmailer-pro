import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { uploadFile } from '../services/api';
import ErrorAlert from './ErrorAlert';

export default function FileUploader({ onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  async function handleFile(f) {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Only .csv and .xlsx files are supported.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File exceeds 5MB limit. Split into smaller files.');
      return;
    }
    setFile(f);
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await uploadFile(fd);
      if (res.success) {
        onParsed(res.data, f.name);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse file.');
    }
    setLoading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }

  function handleRemove() {
    setFile(null);
    setError('');
    onParsed(null, null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <ErrorAlert message={error} onDismiss={() => setError('')} className="mb-3" />

      {file && !error ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <DocumentIcon className="h-8 w-8 text-green-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
            <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={handleRemove} className="text-gray-400 hover:text-red-500">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Parsing file...</p>
            </div>
          ) : (
            <>
              <CloudArrowUpIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Drag & drop your file here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse · CSV or XLSX · Max 5MB</p>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  );
}
