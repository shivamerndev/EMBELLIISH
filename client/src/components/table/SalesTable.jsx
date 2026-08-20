import { Eye, Pencil } from 'lucide-react';
import { currency } from '../../utils/format';
import { Panel, Button, Badge } from '../../components/ui';


const BUDGET_TONES = {
    ECONOMY: 'slate',
    MID_RANGE: 'blue',
    PREMIUM: 'violet',
    LUXURY: 'amber',
    ULTRA_LUXURY: 'brand',
};

const SalesCommercialsTable = ({ items, onView, onEdit }) => {
    return (
        <Panel className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[10px]">
                            <th className="p-3">S.No</th>
                            <th className="p-3">Lead Code</th>
                            <th className="p-3">Client Name</th>
                            <th className="p-3">Location</th>
                            <th className="p-3">Budget Tier</th>
                            <th className="p-3">Priority</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Estimated Value</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-200">
                        {items.map((lead, idx) => {
                            const val = lead.budgetClassification || 'MID_RANGE';
                            const p = lead.priority || 'MEDIUM';
                            return (
                                <tr key={lead.id || lead._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                                    <td className="p-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                                        <button type="button" onClick={() => onView(lead)} className="hover:underline">
                                            {lead.code}
                                        </button>
                                    </td>
                                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{lead.clientName || '—'}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400">{lead.location || '—'}</td>
                                    <td className="p-3">
                                        <Badge tone={BUDGET_TONES[val] || 'blue'}>{val}</Badge>
                                    </td>
                                    <td className="p-3">
                                        <Badge tone={p === 'HIGH' ? 'rose' : p === 'MEDIUM' ? 'amber' : 'slate'}>{p}</Badge>
                                    </td>
                                    <td className="p-3">
                                        <Badge tone={lead.status === 'CONVERTED' ? 'emerald' : lead.status === 'QUALIFIED' ? 'blue' : lead.status === 'LOST' ? 'rose' : 'slate'}>
                                            {lead.status || 'NEW'}
                                        </Badge>
                                    </td>
                                    <td className="p-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-200">
                                        {currency(Number(lead.budgetEstimate || lead.estimatedBudget || 0))}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} />
                                         Move to site visit<Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit && onEdit(lead)} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
};


export default SalesCommercialsTable;