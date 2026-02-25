import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import type { UsageSummary } from '../api/client';
import { formatTokenCount } from '../utils/format';

interface TokenUsageCardProps {
  usageSummary: UsageSummary | null;
}

export default function TokenUsageCard({ usageSummary }: TokenUsageCardProps) {
  const navigate = useNavigate();

  if (!usageSummary) {
    return null;
  }

  return (
    <div className="sheet-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Token Usage</h3>
        <button
          onClick={() => navigate('/settings/usage')}
          className="text-sm text-accent hover:underline"
        >
          View Details
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-100">
            {formatTokenCount(usageSummary.totals.totalInputTokens + usageSummary.totals.totalOutputTokens)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total Tokens</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-100">
            {usageSummary.totals.totalRequests}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total Requests</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-100">
            {formatTokenCount(usageSummary.totals.totalInputTokens)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Input Tokens</p>
        </div>
      </div>

      {usageSummary.aggregated.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Last {usageSummary.periodDays} days by provider</p>
          <div className="space-y-2">
            {Object.entries(
              usageSummary.aggregated.reduce<Record<string, { input: number; output: number; count: number }>>((acc, item) => {
                if (!acc[item.provider]) acc[item.provider] = { input: 0, output: 0, count: 0 };
                acc[item.provider].input += Number(item.totalInputTokens);
                acc[item.provider].output += Number(item.totalOutputTokens);
                acc[item.provider].count += Number(item.count);
                return acc;
              }, {})
            ).map(([provider, data]) => (
              <div key={provider} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 capitalize">{provider}</span>
                <span className="text-gray-400">
                  {formatTokenCount(data.input + data.output)} tokens / {data.count} requests
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {usageSummary.totals.totalRequests === 0 && (
        <div className="flex items-center gap-3 text-gray-500">
          <BarChart3 className="w-5 h-5" />
          <p className="text-sm">No usage data yet. Token tracking starts with your next AI request.</p>
        </div>
      )}
    </div>
  );
}
