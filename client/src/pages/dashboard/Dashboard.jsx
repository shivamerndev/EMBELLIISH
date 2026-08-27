import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users,
  UserPlus,
  PhoneCall,
  CalendarCheck,
  FileText,
  Trophy,
  XCircle,
  TrendingUp,
  Briefcase,
  IndianRupee,
  Factory,
  AlertTriangle,
  Phone,
  PackageX,
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
  Progress,
  Badge,
  StatusBadge,
} from '../../components/ui';

/** Horizontal bar chart — the pipeline reads better as position than as a list. */
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

  const { kpis, recentActivities, leads, projects, money, production, alerts } = data;
  const activeStages = projects.byStage.filter((stage) => stage.count > 0);

  // Fallback calculations for maximum compatibility
  const kpiData = {
    totalLeads: kpis?.totalLeads ?? leads?.total ?? 0,
    newLeads: kpis?.newLeads ?? 0,
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
        subtitle="Every department on the same project record"
      />

      {/* --- Core Metric KPI Cards arranged in responsive 4-column layout --- */}
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
        <Link to="/crm/follow-ups?tab=OVERDUE" className="block transition-transform hover:-translate-y-0.5">
          <StatTile
            label="Overdue Actions"
            value={number(kpiData.overdueActions, 0)}
            sub="Click to view late actions"
            icon={Clock}
            tone="rose"
          />
        </Link>
        <StatTile
          label="Meeting Today"
          value={number(kpiData.meetingToday, 0)}
          sub="Meetings & site visits"
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
      {(alerts?.openSnags > 0 || alerts?.overdueFollowUps > 0 || alerts?.lowStockItems > 0) && (
        <Panel className="mb-6 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-amber-500/30 bg-amber-500/[0.05]">
          <span className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4" /> Needs attention
          </span>
          {alerts.overdueFollowUps > 0 && (
            <Link to="/crm/follow-ups?tab=OVERDUE" className="flex items-center gap-1.5 text-xs hover:text-brand-400 font-medium" style={{ color: 'var(--text-secondary)' }}>
              <Phone className="w-3.5 h-3.5 text-rose-400" /> {alerts.overdueFollowUps} overdue action(s)
            </Link>
          )}
          {alerts.openSnags > 0 && (
            <Link to="/projects" className="flex items-center gap-1.5 text-xs hover:text-brand-400" style={{ color: 'var(--text-secondary)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> {alerts.openSnags} open snag(s)
            </Link>
          )}
          {alerts.lowStockItems > 0 && (
            <Link to="/inventory" className="flex items-center gap-1.5 text-xs hover:text-brand-400" style={{ color: 'var(--text-secondary)' }}>
              <PackageX className="w-3.5 h-3.5 text-amber-400" /> {alerts.lowStockItems} item(s) below reorder level
            </Link>
          )}
        </Panel>
      )}

      {/* --- Pipeline Charts & Recent Activities Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Panel>
          <PanelHeader
            title="Projects across the spine"
            subtitle="Where every live project currently sits"
            icon={Briefcase}
            actions={<Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300 font-medium">View all</Link>}
          />
          {activeStages.length ? (
            <StageBars rows={activeStages} total={projects.total} tone="bg-brand-500" />
          ) : (
            <p className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>No active projects yet.</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Lead pipeline"
            subtitle="From first call to conversion"
            icon={Users}
            actions={<Link to="/crm/leads" className="text-xs text-brand-400 hover:text-brand-300 font-medium">View all</Link>}
          />
          <StageBars rows={leads.byStatus} total={leads.total} tone="bg-amber-600" />
        </Panel>
      </div>

      {/* --- 9th Feature: Recent Activities Widget & Factory Floor --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activities Section */}
        <Panel className="lg:col-span-1">
          <PanelHeader
            title="Recent Activities"
            subtitle="Latest follow-ups & CRM events"
            icon={Activity}
            actions={
              <Link to="/crm/leads" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                All follow-ups
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
                        {act.lead?.clientName || act.project?.name || 'CRM Event'}
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

        {/* Factory Floor Section */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Factory floor"
            subtitle="Work orders by production stage"
            icon={Factory}
            actions={<Badge tone="brand">{production.total} work orders</Badge>}
          />
          {production.total ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px" style={{ backgroundColor: 'var(--border)' }}>
              {production.byStage.map((stage) => (
                <div key={stage.stage} className="p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-2 leading-tight h-6 truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {stage.stage.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xl font-bold numeric" style={{ color: 'var(--text-primary)' }}>
                    {stage.count}
                  </p>
                  <Progress
                    value={production.total ? (stage.count / production.total) * 100 : 0}
                    className="mt-2"
                    tone="brand"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Nothing on the factory floor right now.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;

