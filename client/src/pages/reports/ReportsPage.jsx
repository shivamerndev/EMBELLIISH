import React from 'react';
import { TrendingUp, Users, Briefcase } from 'lucide-react';
import { reportsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, number } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, Table, Progress, StatTile,
  Loading, ErrorState, EmptyState,
} from '../../components/ui';

export const ReportsPage = () => {
  const { data: dashboard, loading, error, reload } = useAsync(() => reportsApi.dashboard().then((r) => r.data), []);
  const { data: sales } = useAsync(() => reportsApi.salesPerformance().then((r) => r.data), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const bestConversion = Math.max(1, ...(sales || []).map((row) => row.conversionRate));

  return (
    <div>
      <PageHeader title="Reports" subtitle="The end-to-end view management gets" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Contract value" value={currency(dashboard.money.contractValue, { compact: true })} icon={Briefcase} />
        <StatTile label="Collected" value={currency(dashboard.money.received, { compact: true })} sub={`${dashboard.money.collectionPercent}%`} tone="green" icon={TrendingUp} />
        <StatTile label="Pipeline" value={currency(dashboard.leads.pipelineValue, { compact: true })} sub={`${dashboard.leads.open} open leads`} tone="violet" icon={Users} />
        <StatTile
          label="Conversion"
          value={`${dashboard.leads.total ? Math.round((dashboard.leads.converted / dashboard.leads.total) * 100) : 0}%`}
          sub={`${dashboard.leads.converted} of ${dashboard.leads.total} leads`}
          tone="amber"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader title="Sales performance" subtitle="Leads carried and converted, per DCM" icon={Users} />
          {sales?.length ? (
            <div className="p-5 space-y-4">
              {sales.map((row) => (
                <div key={row.dcm}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-200">{row.dcm}</span>
                    <span className="text-xs numeric text-slate-400">
                      {row.converted}/{row.leads} · {row.conversionRate}% · {currency(row.pipelineValue, { compact: true })}
                    </span>
                  </div>
                  <Progress value={(row.conversionRate / bestConversion) * 100} tone="green" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No assigned leads yet" icon={Users} />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Projects by stage" subtitle="Where the book of work sits" icon={Briefcase} />
          <Table
            keyField="stage"
            columns={[
              { key: 'label', header: 'Stage', render: (row) => row.label },
              { key: 'count', header: 'Projects', align: 'right', render: (row) => row.count },
              {
                key: 'bar',
                header: '',
                render: (row) => (
                  <Progress
                    value={dashboard.projects.total ? (row.count / dashboard.projects.total) * 100 : 0}
                    className="w-32"
                  />
                ),
              },
            ]}
            rows={dashboard.projects.byStage.filter((row) => row.count > 0)}
            empty={<EmptyState title="No projects yet" icon={Briefcase} />}
          />
        </Panel>
      </div>
    </div>
  );
};

export default ReportsPage;
