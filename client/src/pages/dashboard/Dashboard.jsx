import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users,
  PhoneCall,
  CalendarCheck,
  FileText,
  Trophy,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Phone,
  Activity,
  Clock,
} from 'lucide-react';
import { reportsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, number } from '../../utils/format';
import {
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  Loading,
  ErrorState,
  StatusBadge,
} from '../../components/ui';

/** Horizontal bar chart : the pipeline reads better as position than as a list. */
const StageBars = ({ rows, total, tone = 'bg-brand-500' }) => {
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="space-y-2.5 p-5">
      {rows.map((row) => (
        <div key={row.stage || row.status} className="flex items-center gap-3">
          <span className="w-28 sm:w-44 shrink-0 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {row.label || String(row.stage || row.status).replace(/_/g, ' ')}
          </span>
          <div
            className="flex-1 h-5 rounded overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
          >
            <div
              className={`h-full ${tone} rounded transition-all duration-500`}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-semibold numeric" style={{ color: 'var(--text-primary)' }}>
            {row.count}
          </span>
        </div>
      ))}
      {total !== undefined && (
        <p className="text-[11px] pt-1" style={{ color: 'var(--text-muted)' }}>
          {total} total
        </p>
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

  const { kpis, recentActivities, leads, alerts } = data;

  // Fallback calculations for maximum compatibility
  const kpiData = {
    totalLeads: kpis?.totalLeads ?? leads?.total ?? 0,
    followupToday: kpis?.followupToday ?? 0,
    overdueActions: alerts?.overdueFollowUps ?? kpis?.overdueFollowUps ?? 0,
    meetingToday: kpis?.meetingToday ?? 0,
    pendingQuotations: kpis?.pendingQuotations ?? 0,
    wonProjects: kpis?.wonProjects ?? leads?.converted ?? 0,
    lostProjects: kpis?.lostProjects ?? 0,
    revenuePipeline: kpis?.revenuePipeline ?? leads?.pipelineValue ?? 0,
  };

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="CRM & Sales pipeline at a glance"
      />

      {/* --- Core Metric KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Total Leads"
          value={number(kpiData.totalLeads, 0)}
          sub={`${number(leads?.open || 0, 0)} open in pipeline`}
          icon={Users}
          tone="brand"
        />
        <StatTile
          label="Follow-up Today"
          value={number(kpiData.followupToday, 0)}
          sub="Calls & tasks scheduled"
          icon={PhoneCall}
          tone="blue"
        />
        <StatTile
          label="Overdue Actions"
          value={number(kpiData.overdueActions, 0)}
          sub="Delayed leads & follow-ups"
          icon={Clock}
          tone="rose"
        />
        <StatTile
          label="Meeting Today"
          value={number(kpiData.meetingToday, 0)}
          sub="Studio meetings & site visits"
          icon={CalendarCheck}
          tone="violet"
        />
        <StatTile
          label="Pending Quotations"
          value={number(kpiData.pendingQuotations, 0)}
          sub="Draft & pending approval"
          icon={FileText}
          tone="amber"
        />
        <StatTile
          label="Won Projects"
          value={number(kpiData.wonProjects, 0)}
          sub="Converted lead accounts"
          icon={Trophy}
          tone="green"
        />
        <StatTile
          label="Lost Projects"
          value={number(kpiData.lostProjects, 0)}
          sub="Unqualified or lost"
          icon={XCircle}
          tone="rose"
        />
        <StatTile
          label="Revenue Pipeline"
          value={currency(kpiData.revenuePipeline, { compact: true })}
          sub="Total open pipeline value"
          icon={TrendingUp}
          tone="green"
        />
      </div>

      {/* --- Alerts Banner --- */}
      {alerts?.overdueFollowUps > 0 && (
        <Panel className="mb-6 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-amber-500/30 bg-amber-500/[0.05]">
          <span className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4" /> Needs attention
          </span>
          <Link to="/crm/delayed-leads" className="flex items-center gap-1.5 text-xs hover:text-brand-400 font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Phone className="w-3.5 h-3.5 text-rose-400" /> {alerts.overdueFollowUps} overdue lead action(s)
          </Link>
        </Panel>
      )}

      {/* --- Lead Pipeline & Recent Activities --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Panel>
          <PanelHeader
            title="Lead pipeline"
            subtitle="From first call to conversion"
            icon={Users}
            actions={<Link to="/crm/leads" className="text-xs text-brand-400 hover:text-brand-300 font-medium">View all</Link>}
          />
          <StageBars rows={leads?.byStatus || []} total={leads?.total} tone="bg-amber-600" />
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent Activities"
            subtitle="Latest CRM events & lead updates"
            icon={Activity}
            actions={
              <Link to="/crm/leads" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                View all leads
              </Link>
            }
          />
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.map((act) => (
                <div key={act._id} className="p-3.5 flex items-start gap-3 hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="mt-0.5 p-1.5 rounded-lg border bg-[var(--bg-input)] shrink-0" style={{ borderColor: 'var(--border)' }}>
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {act.subject || act.type}
                      </p>
                      <StatusBadge status={act.status} />
                    </div>
                    {act.notes && (
                      <p className="text-xs truncate mb-1" style={{ color: 'var(--text-muted)' }}>
                        {act.notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-medium truncate">
                        {act.lead?.clientName || 'CRM Event'}
                      </span>
                      <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(act.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                No recent activity recorded.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
