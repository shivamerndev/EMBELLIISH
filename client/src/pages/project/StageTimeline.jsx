import React from 'react';
import { Check, Circle, Lock, ChevronRight, Clock } from 'lucide-react';
import { Panel, PanelHeader, Badge } from '../../components/ui';
import { dateTime, humanise } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * The 21-step spine, with the gate conditions that are holding each future stage
 * shut. This is the screen that answers "why can't I move on?" — the ERP explains
 * its own refusals rather than just greying out a button.
 */

const STATUS_STYLES = {
  DONE: { icon: Check, ring: 'bg-emerald-500 border-emerald-500 text-white', text: 'text-slate-400' },
  CURRENT: { icon: Circle, ring: 'bg-blue-600 border-blue-500 text-white', text: 'text-slate-100 font-semibold' },
  READY: { icon: ChevronRight, ring: 'bg-[ #836444] 800 border-blue-500/50 text-blue-400', text: 'text-slate-300' },
  BLOCKED: { icon: Lock, ring: 'bg-[ #836444] 900 border-slate-700 text-slate-600', text: 'text-slate-600' },
};

export const StageTimeline = ({ timeline, project }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Workflow"
        subtitle="Lead to closure — and what each remaining stage is waiting on"
      />

      <div className="p-5">
        <ol className="relative">
          {timeline.map((entry, index) => {
            const style = STATUS_STYLES[entry.status] || STATUS_STYLES.BLOCKED;
            const Icon = style.icon;
            const isLast = index === timeline.length - 1;
            const unmet = entry.gates.filter((gate) => !gate.passed);

            return (
              <li key={entry.stage} className="relative flex gap-3 pb-4 last:pb-0">
                {!isLast && (
                  <span
                    className={cn(
                      'absolute left-[11px] top-6 bottom-0 w-px',
                      entry.status === 'DONE' ? 'bg-emerald-500/40' : 'bg-[ #836444] 800'
                    )}
                  />
                )}

                <span
                  className={cn(
                    'relative z-10 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center',
                    style.ring
                  )}
                >
                  <Icon className="w-3 h-3" />
                </span>

                <div className="min-w-0 flex-1 -mt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-sm', style.text)}>{entry.label}</span>
                    {entry.status === 'CURRENT' && <Badge tone="blue">Current</Badge>}
                    {entry.status === 'READY' && <Badge tone="green">Ready</Badge>}
                  </div>

                  {entry.status === 'BLOCKED' && unmet.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {unmet.map((gate) => (
                        <li key={gate.key} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                          <Lock className="w-3 h-3 mt-0.5 shrink-0 text-slate-700" />
                          <span>{gate.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {entry.status === 'READY' && entry.gates.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {entry.gates.map((gate) => (
                        <li key={gate.key} className="text-[11px] text-emerald-400/70 flex items-start gap-1.5">
                          <Check className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{gate.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>

    <Panel className="h-fit">
      <PanelHeader title="Activity" subtitle="Everything that has happened on this record" icon={Clock} />
      <div className="p-5 max-h-[36rem] overflow-y-auto">
        {project.history?.length ? (
          <ol className="space-y-3">
            {[...project.history].reverse().map((entry, index) => (
              <li key={index} className="text-xs">
                <p className="text-slate-300 font-medium">{humanise(entry.action)}</p>
                {entry.note && <p className="text-slate-500 mt-0.5">{entry.note}</p>}
                {entry.from && entry.to && (
                  <p className="text-slate-600 mt-0.5">
                    {String(entry.from).replace(/_/g, ' ')} → {String(entry.to).replace(/_/g, ' ')}
                  </p>
                )}
                <p className="text-slate-600 mt-0.5">{dateTime(entry.at)}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">Nothing recorded yet.</p>
        )}
      </div>
    </Panel>
  </div>
);

export default StageTimeline;
