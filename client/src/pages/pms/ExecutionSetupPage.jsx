import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Settings } from 'lucide-react';
import { PageHeader, Panel, Loading, ErrorState, EmptyState } from '../../components/ui';
import usePms from '../../hooks/usePms';

const STAGE = 'executionSetup';

const ExecutionSetupPage = () => {
  const { handleFetchStage, pmsState } = usePms();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const stageItems = pmsState?.items?.[STAGE] || [];

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      await handleFetchStage(STAGE);
    } catch (err) {
      setError(err?.message || 'Failed to load execution setup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoad();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Execution Setup / Project Context"
        subtitle="Configure project context, team setup, execution parameters, and resource allocation"
      />

      {loading ? (
        <Panel className="p-12 text-center">
          <Loading text="Loading execution setup data..." />
        </Panel>
      ) : error ? (
        <ErrorState error={error} onRetry={handleLoad} />
      ) : stageItems.length === 0 ? (
        <Panel className="p-8 text-center">
          <EmptyState
            icon={Settings}
            title="No Execution Setup Records Found"
            hint="Setup records will appear here once execution context is configured."
          />
        </Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Project ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stageItems.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.id || item._id || `Item ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.status || 'Pending'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default ExecutionSetupPage;
