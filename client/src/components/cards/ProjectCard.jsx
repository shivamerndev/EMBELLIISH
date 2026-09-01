import React from 'react';
import { PauseCircle, Briefcase, Calendar, User, DollarSign } from 'lucide-react';
import { StatusBadge, Badge, Progress } from '../ui';
import { currency, date } from '../../utils/format';

export const ProjectCard = ({ project, stages = [], onClick }) => {
  const stageLabel = (key) => stages.find((s) => s.stage === key)?.label || String(key).replace(/_/g, ' ');
  const stageIndex = (key) => stages.findIndex((s) => s.stage === key);
  const progressOf = (key) => (stages.length > 1 ? (stageIndex(key) / (stages.length - 1)) * 100 : 0);

  const val = project.contractValue || project.estimatedValue || 0;

  return (
    <div
      onClick={() => onClick && onClick(project)}
      className="group relative flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all cursor-pointer"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                {project.code || 'PRJ'}
              </span>
              {project.isOnHold && (
                <Badge tone="amber">
                  <PauseCircle className="w-3 h-3 mr-1" /> On hold
                </Badge>
              )}
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {project.name}
            </h4>
          </div>
        </div>

        {/* Client & DCM info */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Client:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{project.client?.name || '—'}</span>
          </div>

          {project.architect && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Architect:</span>
              <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{project.architect.name}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Assigned DCM:</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">{project.assignedDCM?.name || '—'}</span>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400">Current Stage:</span>
              <StatusBadge status={project.stage} label={stageLabel(project.stage)} />
            </div>
            <Progress
              value={progressOf(project.stage)}
              tone={project.stage === 'CLOSED' ? 'green' : 'blue'}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Value</p>
          <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
            {currency(val, { compact: true })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Delivery</p>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
            {date(project.expectedDeliveryDate) || '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
