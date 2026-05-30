import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function DailyLimitBanner() {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 flex gap-3">
      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800 mb-1">Important Notice</p>
        <p className="text-sm text-amber-700">
          Sending emails above the recommended daily limit significantly increases the risk of your email
          account being flagged, rate-limited, or permanently banned by your email provider.
          BulkMailer Pro automatically enforces safe limits, but exceeding them via manual overrides
          is entirely at your own risk. We are not responsible for any account suspension or ban.
        </p>
      </div>
    </div>
  );
}
