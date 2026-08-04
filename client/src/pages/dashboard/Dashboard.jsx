import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users, Briefcase, IndianRupee, Factory, AlertTriangle, Phone, PackageX } from 'lucide-react';
import { reportsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, number } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, StatTile, Loading, ErrorState, Progress, Badge,
} from '../../components/ui';

/** Horizontal bar chart — the pipeline reads better as position than as a list. */
const StageBars = ({ rows, total, tone = 'bg-brand-500' }) => {
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="space-y-2.5 p-5">
      {rows.map((row) => (
        <div key={row.stage || row.status} className="flex items-center gap-3">
          <span className="w-44 shrink-0 text-xs text-stone-400 truncate">
            {row.label || String(row.stage || row.status).replace(/_/g, ' ')}
          </span>
          <div className="flex-1 h-5 rounded overflow-hidden border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div
              className={`h-full ${tone} rounded transition-all duration-500`}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-semibold text-stone-300 numeric">{row.count}</span>
        </div>
      ))}
      {total !== undefined && (
        <p className="text-[11px] text-stone-500 pt-1">{total} total</p>
      )}
    </div>
  );
};

export const Dashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const { data, loading, error, reload } = useAsync(() => reportsApi.dashboard().then((r) => r.data), []);

  if (loading) return <Loading label="Loading the dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { leads, projects, money, production, alerts } = data;
  const activeStages = projects.byStage.filter((stage) => stage.count > 0);

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="Every department on the same project record"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Open leads"
          value={number(leads.open, 0)}
          sub={`${currency(leads.pipelineValue, { compact: true })} in pipeline`}
          icon={Users}
          tone="brand"
        />
        <StatTile
          label="Active projects"
          value={number(projects.active, 0)}
          sub={`${projects.total} total · ${projects.closed} closed`}
          icon={Briefcase}
          tone="amber"
        />
        <StatTile
          label="Collected"
          value={currency(money.received, { compact: true })}
          sub={`${money.collectionPercent}% of ${currency(money.contractValue, { compact: true })}`}
          icon={IndianRupee}
          tone="green"
        />
        <StatTile
          label="Outstanding"
          value={currency(money.outstanding, { compact: true })}
          sub="Invoiced but unpaid"
          icon={IndianRupee}
          tone={money.outstanding > 0 ? 'amber' : 'green'}
        />
      </div>

      {(alerts.openSnags > 0 || alerts.overdueFollowUps > 0 || alerts.lowStockItems > 0) && (
        <Panel className="mb-6 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-amber-500/30 bg-amber-500/[0.05]">
          <span className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4" /> Needs attention
          </span>
          {alerts.overdueFollowUps > 0 && (
            <Link to="/crm/leads" className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-brand-400">
              <Phone className="w-3.5 h-3.5" /> {alerts.overdueFollowUps} overdue follow-up(s)
            </Link>
          )}
          {alerts.openSnags > 0 && (
            <Link to="/projects" className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-brand-400">
              <AlertTriangle className="w-3.5 h-3.5" /> {alerts.openSnags} open snag(s)
            </Link>
          )}
          {alerts.lowStockItems > 0 && (
            <Link to="/inventory" className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-brand-400">
              <PackageX className="w-3.5 h-3.5" /> {alerts.lowStockItems} item(s) below reorder level
            </Link>
          )}
        </Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <PanelHeader
            title="Projects across the spine"
            subtitle="Where every live project currently sits"
            icon={Briefcase}
            actions={<Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300">View all</Link>}
          />
          {activeStages.length ? (
            <StageBars rows={activeStages} total={projects.total} tone="bg-brand-500" />
          ) : (
            <p className="p-5 text-sm text-stone-500">No projects yet.</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Lead pipeline"
            subtitle="From first call to conversion"
            icon={Users}
            actions={<Link to="/crm/leads" className="text-xs text-brand-400 hover:text-brand-300">View all</Link>}
          />
          <StageBars rows={leads.byStatus} total={leads.total} tone="bg-amber-600" />
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Factory floor"
            subtitle="Work orders by production stage"
            icon={Factory}
            actions={
              <Badge tone="brand">{production.total} work orders</Badge>
            }
          />
          {production.total ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px" style={{ backgroundColor: 'var(--border)' }}>
              {production.byStage.map((stage) => (
                <div key={stage.stage} className="p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2 leading-tight h-6">
                    {stage.stage.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xl font-bold text-stone-100 numeric">{stage.count}</p>
                  <Progress
                    value={production.total ? (stage.count / production.total) * 100 : 0}
                    className="mt-2"
                    tone="brand"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-stone-500">Nothing on the factory floor right now.</p>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
