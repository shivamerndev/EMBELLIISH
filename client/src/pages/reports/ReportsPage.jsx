import React from 'react';
import {
  TrendingUp, Users, Briefcase, Target, Building2, BarChart3,
  AlertCircle, DollarSign, PieChart, Award, Layers, ChevronRight,
} from 'lucide-react';
import { reportsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency } from '../../utils/format';
import {
  PageHeader, Panel, PanelHeader, Table, Progress, StatTile,
  Badge, StatusBadge, Loading, ErrorState, EmptyState,
} from '../../components/ui';

export const ReportsPage = () => {
  const { data: dashboard, loading: dashLoading, error: dashError, reload: reloadDash } = useAsync(
    () => reportsApi.dashboard().then((r) => r.data),
    []
  );

  const { data: analytics, loading: analyticsLoading, error: analyticsError, reload: reloadAnalytics } = useAsync(
    () => reportsApi.analytics().then((r) => r.data),
    []
  );

  const loading = dashLoading || analyticsLoading;
  const error = dashError || analyticsError;

  if (loading) return <Loading label="Compiling report analytics..." />;
  if (error) return <ErrorState error={error} onRetry={() => { reloadDash(); reloadAnalytics(); }} />;

  const conversion = analytics?.conversion || {};
  const monthlySales = analytics?.monthlySales || [];
  const leadSourceWise = analytics?.leadSourceWise || [];
  const architectWise = analytics?.architectWiseRevenue || [];
  const dcmPerformance = analytics?.dcmWisePerformance || [];
  const lostReasons = analytics?.lostReasons || [];
  const upcomingRevenue = analytics?.upcomingRevenue || { totalValue: 0, byStage: [] };

  const maxConversionDCM = Math.max(1, ...(dcmPerformance || []).map((r) => r.conversionRate));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comprehensive Business Reports"
        subtitle="End-to-end performance analytics across Sales, DCMs, Architects, and Revenue forecasting"
      />

      {/* Top Level Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Lead Conversion Rate"
          value={`${conversion.conversionRate || 0}%`}
          sub={`${conversion.convertedLeads || 0} converted out of ${conversion.totalLeads || 0} total leads`}
          tone="amber"
          icon={Target}
        />
        <StatTile
          label="Total Contract Value"
          value={currency(dashboard?.money?.contractValue || 0, { compact: true })}
          sub={`Collected: ${currency(dashboard?.money?.received || 0, { compact: true })} (${dashboard?.money?.collectionPercent || 0}%)`}
          tone="green"
          icon={TrendingUp}
        />
        <StatTile
          label="Upcoming Revenue Pipeline"
          value={currency(upcomingRevenue.totalValue || 0, { compact: true })}
          sub={`${upcomingRevenue.byStage?.reduce((sum, r) => sum + r.count, 0) || 0} active projects in execution`}
          tone="violet"
          icon={DollarSign}
        />
        <StatTile
          label="Pipeline Value"
          value={currency(dashboard?.leads?.pipelineValue || 0, { compact: true })}
          sub={`${conversion.openLeads || 0} open leads active`}
          tone="blue"
          icon={Users}
        />
      </div>

      {/* Row 1: Lead Conversion % & Monthly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Lead Conversion % */}
        <Panel>
          <PanelHeader
            title="1. Lead Conversion %"
            subtitle="Overall conversion funnel and status breakdown"
            icon={Target}
          />
          <div className="p-5 space-y-5">
            <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-alt)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Funnel Efficiency Rate
                </span>
                <span className="text-sm font-bold numeric text-amber-400">
                  {conversion.conversionRate}%
                </span>
              </div>
              <Progress value={conversion.conversionRate} tone="amber" className="h-2" />
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Converted</p>
                  <p className="text-base font-bold numeric text-emerald-400">{conversion.convertedLeads || 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Open Leads</p>
                  <p className="text-base font-bold numeric text-brand-400">{conversion.openLeads || 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lost Leads</p>
                  <p className="text-base font-bold numeric text-rose-400">{conversion.lostLeads || 0}</p>
                </div>
              </div>
            </div>

            <Table
              keyField="status"
              columns={[
                {
                  key: 'status',
                  header: 'Lead Status',
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'count',
                  header: 'Leads',
                  align: 'right',
                  render: (row) => <span className="font-semibold">{row.count}</span>,
                },
                {
                  key: 'value',
                  header: 'Pipeline Value',
                  align: 'right',
                  render: (row) => currency(row.value, { compact: true }),
                },
                {
                  key: 'share',
                  header: 'Share',
                  render: (row) => (
                    <Progress
                      value={conversion.totalLeads ? (row.count / conversion.totalLeads) * 100 : 0}
                      tone={row.status === 'CONVERTED' ? 'green' : row.status === 'LOST' ? 'rose' : 'blue'}
                      className="w-24"
                    />
                  ),
                },
              ]}
              rows={conversion.byStatus || []}
              empty={<EmptyState title="No status data available" icon={Target} />}
            />
          </div>
        </Panel>

        {/* 2. Monthly Sales */}
        <Panel>
          <PanelHeader
            title="2. Monthly Sales"
            subtitle="Month-over-month projects signed & revenue performance"
            icon={BarChart3}
          />
          <Table
            keyField="month"
            columns={[
              {
                key: 'month',
                header: 'Month',
                render: (row) => <span className="font-semibold">{row.month}</span>,
              },
              {
                key: 'projectsCount',
                header: 'Projects',
                align: 'right',
                render: (row) => row.projectsCount,
              },
              {
                key: 'contractValue',
                header: 'Contract Signed',
                align: 'right',
                render: (row) => currency(row.contractValue, { compact: true }),
              },
              {
                key: 'receivedAmount',
                header: 'Collected',
                align: 'right',
                render: (row) => (
                  <span className="text-emerald-400 font-medium">
                    {currency(row.receivedAmount, { compact: true })}
                  </span>
                ),
              },
              {
                key: 'ratio',
                header: 'Collection %',
                render: (row) => (
                  <Progress
                    value={row.contractValue ? (row.receivedAmount / row.contractValue) * 100 : 0}
                    tone="green"
                    className="w-20"
                  />
                ),
              },
            ]}
            rows={monthlySales}
            empty={<EmptyState title="No sales record for past months" icon={BarChart3} />}
          />
        </Panel>
      </div>

      {/* Row 2: Lead Source Wise & Architect Wise Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Lead Source Wise */}
        <Panel>
          <PanelHeader
            title="3. Lead Source Wise"
            subtitle="Conversion efficiency & revenue pipeline by lead origin"
            icon={PieChart}
          />
          <Table
            keyField="source"
            columns={[
              {
                key: 'source',
                header: 'Source Channel',
                render: (row) => (
                  <Badge tone="brand">
                    {String(row.source).replace(/_/g, ' ')}
                  </Badge>
                ),
              },
              {
                key: 'totalLeads',
                header: 'Total Leads',
                align: 'right',
                render: (row) => row.totalLeads,
              },
              {
                key: 'converted',
                header: 'Converted',
                align: 'right',
                render: (row) => <span className="text-emerald-400 font-semibold">{row.converted}</span>,
              },
              {
                key: 'conversionRate',
                header: 'Conv. %',
                align: 'right',
                render: (row) => `${row.conversionRate}%`,
              },
              {
                key: 'pipelineValue',
                header: 'Pipeline Value',
                align: 'right',
                render: (row) => currency(row.pipelineValue, { compact: true }),
              },
            ]}
            rows={leadSourceWise}
            empty={<EmptyState title="No lead source data available" icon={PieChart} />}
          />
        </Panel>

        {/* 4. Architect Wise Revenue */}
        <Panel>
          <PanelHeader
            title="4. Architect Wise Revenue"
            subtitle="Revenue introduced by architects & partner firms"
            icon={Building2}
          />
          <Table
            keyField="id"
            columns={[
              {
                key: 'name',
                header: 'Architect / Firm',
                render: (row) => (
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{row.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.firm}</p>
                  </div>
                ),
              },
              {
                key: 'leadsCount',
                header: 'Leads (Conv)',
                align: 'right',
                render: (row) => `${row.leadsCount} (${row.convertedCount})`,
              },
              {
                key: 'contractValue',
                header: 'Contract Revenue',
                align: 'right',
                render: (row) => (
                  <span className="text-emerald-400 font-semibold">
                    {currency(row.contractValue, { compact: true })}
                  </span>
                ),
              },
              {
                key: 'commission',
                header: 'Commission',
                align: 'right',
                render: (row) => (
                  <div className="text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>{row.commissionPercent}%</span>
                    <p className="text-amber-400 font-medium">{currency(row.estimatedCommission, { compact: true })}</p>
                  </div>
                ),
              },
            ]}
            rows={architectWise}
            empty={<EmptyState title="No architect referral revenue recorded yet" icon={Building2} />}
          />
        </Panel>
      </div>

      {/* Row 3: DCM Wise Performance & Lost Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. DCM Wise Performance */}
        <Panel>
          <PanelHeader
            title="5. DCM Wise Performance"
            subtitle="Design & Client Managers conversion efficiency and book of work"
            icon={Award}
          />
          {dcmPerformance?.length ? (
            <div className="p-5 space-y-4">
              {dcmPerformance.map((row) => (
                <div
                  key={row.dcm}
                  className="p-3.5 rounded-lg border transition-colors"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-alt)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {row.dcm}
                      </span>
                      <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                        ({row.role || 'DCM'})
                      </span>
                    </div>
                    <span className="text-xs font-semibold numeric text-emerald-400">
                      {row.conversionRate}% Conversion
                    </span>
                  </div>
                  <Progress value={(row.conversionRate / maxConversionDCM) * 100} tone="green" className="mb-2" />
                  <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'var(--text-secondary)' }}>
                    <span>Converted: {row.converted} / {row.leads} leads</span>
                    <span>Signed: <strong className="text-amber-400">{currency(row.contractValue, { compact: true })}</strong></span>
                    <span>Pipeline: <strong>{currency(row.pipelineValue, { compact: true })}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No DCM performance records available" icon={Users} />
          )}
        </Panel>

        {/* 6. Lost Reasons */}
        <Panel>
          <PanelHeader
            title="6. Lost Reasons"
            subtitle="Analysis of reasons for lost deals & lost pipeline value impact"
            icon={AlertCircle}
          />
          <Table
            keyField="reason"
            columns={[
              {
                key: 'reason',
                header: 'Reason',
                render: (row) => (
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {row.reason}
                  </span>
                ),
              },
              {
                key: 'count',
                header: 'Lost Count',
                align: 'right',
                render: (row) => <span className="text-rose-400 font-semibold">{row.count}</span>,
              },
              {
                key: 'percentage',
                header: 'Share %',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Progress value={row.percentage} tone="rose" className="w-20" />
                    <span className="text-xs numeric" style={{ color: 'var(--text-muted)' }}>{row.percentage}%</span>
                  </div>
                ),
              },
              {
                key: 'lostValue',
                header: 'Lost Value Impact',
                align: 'right',
                render: (row) => (
                  <span className="text-rose-400 font-medium">
                    {currency(row.lostValue, { compact: true })}
                  </span>
                ),
              },
            ]}
            rows={lostReasons}
            empty={<EmptyState title="No lost leads recorded" icon={AlertCircle} />}
          />
        </Panel>
      </div>

      {/* Row 4: Upcoming Revenue */}
      <Panel>
        <PanelHeader
          title="7. Upcoming Revenue"
          subtitle="Expected stage-wise project contract revenue waiting to be realized"
          icon={DollarSign}
          actions={
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Forecast Pipeline: </span>
              <span className="text-base font-bold numeric text-emerald-400 ml-1">
                {currency(upcomingRevenue.totalValue, { compact: true })}
              </span>
            </div>
          }
        />
        <Table
          keyField="stage"
          columns={[
            {
              key: 'label',
              header: 'Project Execution Stage',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <Badge tone="blue">{row.stage}</Badge>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{row.label}</span>
                </div>
              ),
            },
            {
              key: 'count',
              header: 'Active Projects',
              align: 'right',
              render: (row) => <span className="font-bold">{row.count}</span>,
            },
            {
              key: 'contractValue',
              header: 'Contract Value',
              align: 'right',
              render: (row) => (
                <span className="text-emerald-400 font-semibold">
                  {currency(row.contractValue, { compact: true })}
                </span>
              ),
            },
            {
              key: 'share',
              header: 'Stage Share',
              render: (row) => (
                <Progress
                  value={upcomingRevenue.totalValue ? (row.contractValue / upcomingRevenue.totalValue) * 100 : 0}
                  tone="violet"
                  className="w-48"
                />
              ),
            },
          ]}
          rows={upcomingRevenue.byStage || []}
          empty={<EmptyState title="No active projects in pipeline" icon={DollarSign} />}
        />
      </Panel>
    </div>
  );
};

export default ReportsPage;
