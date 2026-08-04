import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, PauseCircle, PlayCircle } from 'lucide-react';
import { projectsApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { currency, date } from '../../utils/format';
import {
  Panel, Button, Badge, StatusBadge, Progress, Tabs, Loading, ErrorState,
} from '../../components/ui';

import StageTimeline from './StageTimeline';
import MeasurementsTab from './tabs/MeasurementsTab';
import ReadySizeTab from './tabs/ReadySizeTab';
import ConsumptionTab from './tabs/ConsumptionTab';
import QuotationTab from './tabs/QuotationTab';
import PaymentsTab from './tabs/PaymentsTab';
import DesignTab from './tabs/DesignTab';
import ProductionTab from './tabs/ProductionTab';
import DeliveryTab from './tabs/DeliveryTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'measurements', label: 'Rooms & Windows' },
  { key: 'readysize', label: 'Ready Size' },
  { key: 'consumption', label: 'Consumption Sheet' },
  { key: 'design', label: 'Design & Drawings' },
  { key: 'quotation', label: 'Quotation' },
  { key: 'payments', label: 'Payments' },
  { key: 'production', label: 'Production & QC' },
  { key: 'delivery', label: 'Packing & Installation' },
];

export const ProjectWorkspace = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const initialTab = queryTab && TABS.some((t) => t.key === queryTab) ? queryTab : 'overview';
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (queryTab && TABS.some((t) => t.key === queryTab)) {
      setTab(queryTab);
    }
  }, [queryTab]);

  const { data, loading, error, reload } = useAsync(
    () => projectsApi.workspace(id).then((r) => r.data),
    [id]
  );

  const advance = useAction((payload) => projectsApi.advance(id, payload), { onSuccess: reload });
  const hold = useAction((payload) => projectsApi.hold(id, payload), { onSuccess: reload });

  if (loading) return <Loading label="Opening the project…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { project, progress, stageLabel, timeline, nextStageLabel, canAdvance, blockedBy } = data;

  const tabProps = { project, projectId: id, onChange: reload, workspace: data };

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> All projects
      </Link>

      {/* Header: who, what, where on the spine, and the one action that moves it. */}
      <Panel className="mb-4">
        <div className="p-5 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-500 tracking-tight">{project.name}</h1>
              <Badge tone="slate">{project.code}</Badge>
              {project.isActivated && <Badge tone="green">Active</Badge>}
              {project.isOnHold && (
                <Badge tone="amber">
                  <PauseCircle className="w-3 h-3 mr-1" /> On hold
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-500">
              <span>{project.client?.name}{project.client?.phone ? ` · ${project.client.phone}` : ''}</span>
              {project.architect && <span>Architect: {project.architect.name}</span>}
              {project.assignedDCM && <span>DCM: {project.assignedDCM.name}</span>}
              {project.projectCoordinator && <span>PC: {project.projectCoordinator.name}</span>}
              {project.expectedDeliveryDate && <span>Delivery: {date(project.expectedDeliveryDate)}</span>}
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                {project.contractValue ? 'Contract value' : 'Estimated value'}
              </p>
              <p className="text-xl font-bold text-slate-100 numeric">
                {currency(project.contractValue || project.estimatedValue, { compact: true })}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={project.stage} label={stageLabel} />
              {project.stage !== 'CLOSED' && (
                <Button
                  size="sm"
                  disabled={!canAdvance}
                  loading={advance.pending}
                  onClick={() => advance.execute({})}
                  title={canAdvance ? '' : blockedBy.map((g) => g.detail).join(' · ')}
                >
                  {nextStageLabel ? `Move to ${nextStageLabel}` : 'Advance'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon={project.isOnHold ? PlayCircle : PauseCircle}
                loading={hold.pending}
                onClick={() =>
                  hold.execute({ isOnHold: !project.isOnHold, reason: project.isOnHold ? undefined : 'Put on hold from workspace' })
                }
              >
                {project.isOnHold ? 'Resume' : 'Hold'}
              </Button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span>Lead</span>
            <span className="font-semibold text-slate-400">{progress}% complete</span>
            <span>Closure</span>
          </div>
          <Progress value={progress} tone={project.stage === 'CLOSED' ? 'green' : 'blue'} />
        </div>

        {(advance.error || hold.error) && (
          <div className="mx-5 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs font-semibold text-amber-300">
              {(advance.error || hold.error).message}
            </p>
            {(advance.error || hold.error).errors?.map((item, index) => (
              <p key={index} className="text-[11px] text-amber-200/70 mt-0.5">— {item.message}</p>
            ))}
          </div>
        )}

        <div className="px-4">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </Panel>

      {tab === 'overview' && <StageTimeline timeline={timeline} blockedBy={blockedBy} project={project} />}
      {tab === 'measurements' && <MeasurementsTab {...tabProps} />}
      {tab === 'readysize' && <ReadySizeTab {...tabProps} />}
      {tab === 'consumption' && <ConsumptionTab {...tabProps} />}
      {tab === 'design' && <DesignTab {...tabProps} />}
      {tab === 'quotation' && <QuotationTab {...tabProps} />}
      {tab === 'payments' && <PaymentsTab {...tabProps} />}
      {tab === 'production' && <ProductionTab {...tabProps} />}
      {tab === 'delivery' && <DeliveryTab {...tabProps} />}
    </div>
  );
};

export default ProjectWorkspace;
