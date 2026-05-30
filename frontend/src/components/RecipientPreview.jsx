import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const PAGE_SIZE = 10;

function downloadInvalidCSV(invalidRows) {
  const header = 'Row,Email,Error\n';
  const rows = invalidRows.map(r => `${r.rowNum},"${r.email || ''}","${r.error || ''}"`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'invalid_recipients.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function RecipientPreview({ parsedData }) {
  const [page, setPage] = useState(1);
  const [showInvalid, setShowInvalid] = useState(false);

  if (!parsedData) return null;

  const { valid, invalid, validCount, invalidCount, totalRows } = parsedData;
  const displayRows = showInvalid ? invalid : valid;
  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const pageRows = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goTo(p) {
    setPage(Math.max(1, Math.min(totalPages, p)));
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm font-medium text-gray-700">
          Total: <strong>{totalRows}</strong> rows
        </span>
        <button
          onClick={() => { setShowInvalid(false); setPage(1); }}
          className={`px-3 py-1 rounded-full text-xs font-medium ${!showInvalid ? 'bg-green-100 text-green-700 ring-2 ring-green-400' : 'bg-green-50 text-green-700 hover:ring-2 hover:ring-green-300'}`}
        >
          ✅ {validCount} valid
        </button>
        {invalidCount > 0 && (
          <button
            onClick={() => { setShowInvalid(true); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium ${showInvalid ? 'bg-red-100 text-red-700 ring-2 ring-red-400' : 'bg-red-50 text-red-700 hover:ring-2 hover:ring-red-300'}`}
          >
            ❌ {invalidCount} invalid (will be skipped)
          </button>
        )}
        {invalidCount > 0 && (
          <button
            onClick={() => downloadInvalidCSV(invalid)}
            className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download invalid
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#', 'Name', 'Email', 'Niche', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-sm">No records</td></tr>
              ) : (
                pageRows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 last:border-0 ${!row.isValid ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    title={row.error || ''}
                  >
                    <td className="px-4 py-2.5 text-gray-500">{row.rowNum}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{row.email || <span className="text-red-400 text-xs">(empty)</span>}</td>
                    <td className="px-4 py-2.5">
                      {row.niche ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{row.niche}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.isValid
                        ? <span className="text-green-600 text-xs font-medium">Valid</span>
                        : <span className="text-red-500 text-xs font-medium" title={row.error}>Invalid</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages} ({displayRows.length} records)
          </p>
          <div className="flex gap-1">
            <button onClick={() => goTo(page - 1)} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  className={`w-7 h-7 rounded text-xs ${p === page ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  {p}
                </button>
              );
            })}
            <button onClick={() => goTo(page + 1)} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
