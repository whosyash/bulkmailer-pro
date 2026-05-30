import React from 'react';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ErrorAlert({ message, onDismiss, className = '' }) {
  if (!message) return null;
  return (
    <div className={`flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 flex-shrink-0">
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
