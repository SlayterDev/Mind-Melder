import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenUsageAPI, type UsageSummary, type UsageDetails } from '../api/client';
import { ArrowLeft } from 'lucide-react';
import { formatTokenCount } from '../utils/format';

const PER_PAGE = 25;

const PERIOD_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const METHOD_LABELS: Record<string, string> = {
  organize: 'Organize',
  today_sheet: 'Today Sheet',
  weekly_review: 'Weekly Review',
  chat: 'Chat',
  refine_note: 'Refine Note',
  generate_title: 'Generate Chat Title',
  transcribe: 'Transcribe',
  template_suggestions: 'Template Suggestions',
  extract_tasks: 'Extract Tasks',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TokenUsagePage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(30);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [details, setDetails] = useState<UsageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    Promise.all([
      tokenUsageAPI.getSummary(period),
      tokenUsageAPI.getDetails({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        provider: filterProvider || undefined,
        method: filterMethod || undefined,
        page,
        perPage: PER_PAGE,
      }),
    ])
      .then(([summaryData, detailsData]) => {
        setSummary(summaryData);
        setDetails(detailsData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [period, filterProvider, filterMethod, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [period, filterProvider, filterMethod]);

  const uniqueProviders = summary
    ? [...new Set(summary.aggregated.map((a) => a.provider))]
    : [];
  const uniqueMethods = summary
    ? [...new Set(summary.aggregated.map((a) => a.method))]
    : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold">Token Usage</h2>
          <p className="text-gray-400">Detailed AI token consumption</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setPeriod(opt.days)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === opt.days
                ? 'bg-accent text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="sheet-card p-4 text-center">
                <p className="text-2xl font-bold">
                  {formatTokenCount(
                    summary.totals.totalInputTokens + summary.totals.totalOutputTokens
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">Total Tokens</p>
              </div>
              <div className="sheet-card p-4 text-center">
                <p className="text-2xl font-bold">{summary.totals.totalRequests}</p>
                <p className="text-xs text-gray-400 mt-1">Requests</p>
              </div>
              <div className="sheet-card p-4 text-center">
                <p className="text-2xl font-bold">
                  {formatTokenCount(summary.totals.totalInputTokens)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Input Tokens</p>
              </div>
              <div className="sheet-card p-4 text-center">
                <p className="text-2xl font-bold">
                  {formatTokenCount(summary.totals.totalOutputTokens)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Output Tokens</p>
              </div>
            </div>
          )}

          {/* Breakdown by Method */}
          {summary && summary.aggregated.length > 0 && (
            <div className="sheet-card p-6">
              <h3 className="text-lg font-semibold mb-4">Usage by Method</h3>
              <div className="space-y-3">
                {Object.entries(
                  summary.aggregated.reduce<
                    Record<string, { input: number; output: number; count: number }>
                  >((acc, item) => {
                    const key = item.method;
                    if (!acc[key]) acc[key] = { input: 0, output: 0, count: 0 };
                    acc[key].input += Number(item.totalInputTokens);
                    acc[key].output += Number(item.totalOutputTokens);
                    acc[key].count += Number(item.count);
                    return acc;
                  }, {})
                )
                  .sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output))
                  .map(([method, data]) => {
                    const total = data.input + data.output;
                    const grandTotal =
                      summary.totals.totalInputTokens + summary.totals.totalOutputTokens;
                    const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;

                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-300">
                            {METHOD_LABELS[method] || method}
                          </span>
                          <span className="text-gray-400">
                            {formatTokenCount(total)} ({data.count} calls)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="input-accent"
            >
              <option value="">All Providers</option>
              {uniqueProviders.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="input-accent"
            >
              <option value="">All Methods</option>
              {uniqueMethods.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m] || m}
                </option>
              ))}
            </select>
          </div>

          {/* Detail Table */}
          {details && details.records.length > 0 && (
            <div className="sheet-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">Provider</th>
                    <th className="text-left p-3 font-medium">Model</th>
                    <th className="text-left p-3 font-medium">Method</th>
                    <th className="text-right p-3 font-medium">Input</th>
                    <th className="text-right p-3 font-medium">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {details.records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-800 hover:bg-gray-800/30"
                    >
                      <td className="p-3 text-gray-300">{formatDate(record.createdAt)}</td>
                      <td className="p-3 text-gray-300 capitalize">{record.provider}</td>
                      <td className="p-3 text-gray-400 text-xs">{record.model}</td>
                      <td className="p-3 text-gray-300">
                        {METHOD_LABELS[record.method] || record.method}
                      </td>
                      <td className="p-3 text-right text-gray-300">
                        {record.inputTokens != null
                          ? formatTokenCount(record.inputTokens)
                          : '-'}
                      </td>
                      <td className="p-3 text-right text-gray-300">
                        {record.outputTokens != null
                          ? formatTokenCount(record.outputTokens)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {details.total > PER_PAGE && (
                <div className="flex items-center justify-between p-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Showing {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, details.total)} of{' '}
                    {details.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * PER_PAGE >= details.total}
                      className="px-3 py-1 text-sm bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {details && details.records.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No usage records found for the selected period and filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
