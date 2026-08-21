import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Calculator, Calendar, CheckCircle2, Paperclip, DollarSign, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's10',
        title: ' Costing',
        color: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700/80',
        cols: [
            { key: 'costing.dueDate', label: 'Pricing Due Date' },
            { key: 'costing.catalogueCost', label: 'Catalogue Cost' },
            { key: 'costing.version', label: 'Costing Version / Revision' },
            { key: 'costing.landedCost', label: 'Landed Cost' },
            { key: 'costing.localFabricCost', label: 'Local Fabric Cost' },
            { key: 'costing.labourCost', label: 'Labour Cost / Custom Cost' },
            { key: 'costing.totalCost', label: 'Total Cost' },
            { key: 'costing.calculatedMargin', label: 'Calculated Margin %' },
            { key: 'costing.sampleCost', label: 'Sample Cost' },
            { key: 'costing.marginModel', label: 'Margin Model' },
            { key: 'costing.minMarginThreshold', label: 'Min Margin Threshold %' },
            { key: 'costing.maxDiscountThreshold', label: 'Max Discount Threshold %' },
            { key: 'costing.hiteshApprovalStatus', label: 'Hitesh Approval Status' },
        ]
    }
];

const getNestedVal = (obj, path) => {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
        if (curr === null || curr === undefined) break;
        curr = curr[p];
    }
    if (curr !== undefined && curr !== null) return curr;

    if (path === 'costing.totalCost' && obj?.costing) {
        const c = obj.costing;
        const total = (Number(c.catalogueCost) || 0) +
                      (Number(c.landedCost) || 0) +
                      (Number(c.localFabricCost) || 0) +
                      (Number(c.labourCost) || 0) +
                      (Number(c.sampleCost) || 0);
        return total > 0 ? total : undefined;
    }

    if (path === 'costing.calculatedMargin' && obj?.costing) {
        const c = obj.costing;
        if (c.calculatedMargin !== undefined && c.calculatedMargin !== null) return c.calculatedMargin;
        if (c.calculatedMarginPercent !== undefined && c.calculatedMarginPercent !== null) return c.calculatedMarginPercent;

        const totalCost = getNestedVal(obj, 'costing.totalCost');
        const quotedVal = Number(obj.quotation?.finalQuotedValue || obj.token?.budgetEstimate || 0);
        if (quotedVal > 0 && totalCost > 0) {
            const margin = ((quotedVal - totalCost) / quotedVal) * 100;
            return Math.round(margin * 10) / 10;
        }
    }

    return undefined;
};

const SPREADSHEET_CELL_RENDERERS = {
    sno: (lead, { sno }) => <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{sno}</span>,
    code: (lead, { onView }) => (
        <button
            type="button"
            onClick={() => onView(lead)}
            className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
        >
            {lead.code}
        </button>
    ),
    clientName: (lead, { onView }) => (
        <button
            type="button"
            onClick={() => onView(lead)}
            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-300 text-left truncate block max-w-[160px]"
            title={lead.clientName}
        >
            {lead.clientName}
        </button>
    ),
    'costing.hiteshApprovalStatus': (lead) => {
        const c = lead.costing || {};
        const req = c.hiteshApprovalRequired;
        const st = c.hiteshApprovalStatus || (req ? 'PENDING' : 'NOT_REQUIRED');
        let tone = 'slate';
        if (st === 'APPROVED') tone = 'green';
        else if (st === 'PENDING') tone = 'amber';
        else if (st === 'REJECTED') tone = 'rose';

        return (
            <div className="flex flex-col items-center gap-0.5">
                <Badge tone={tone}>{st.replace(/_/g, ' ')}</Badge>
                {req && st === 'PENDING' && (
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">⚠️ Needs Hitesh Sign-off</span>
                )}
            </div>
        );
    }
};

const renderSpreadsheetCell = (lead, key, sno, onView, onEdit) => {
    if (SPREADSHEET_CELL_RENDERERS[key]) {
        return SPREADSHEET_CELL_RENDERERS[key](lead, { sno, onView, onEdit });
    }

    const raw = getNestedVal(lead, key);

    if (Array.isArray(raw)) {
        if (raw.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-400 font-medium">
                <Paperclip className="w-3 h-3 shrink-0" /> {raw.length} item(s)
            </span>
        );
    }

    if (raw instanceof Date || (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw))) {
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">{date(raw, { time: String(raw).includes('T') })}</span>;
    }

    if (typeof raw === 'number') {
        if (key.toLowerCase().includes('margin') || key.toLowerCase().includes('percent') || key.toLowerCase().includes('threshold')) {
            return <span className="font-mono text-slate-900 dark:text-slate-200 text-xs font-semibold">{raw}%</span>;
        }
        return <span className="font-mono text-slate-900 dark:text-slate-200 text-xs font-semibold">{currency(raw)}</span>;
    }

    if (key.toLowerCase().includes('margin') && typeof raw === 'string') {
        const formatted = raw.endsWith('%') ? raw : `${raw}%`;
        return <span className="font-mono text-slate-900 dark:text-slate-200 text-xs font-semibold">{formatted}</span>;
    }

    if (typeof raw === 'boolean') {
        return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
    }

    if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};

import { getLocalDate } from '../../utils/format';

/* ------------------------------------------------------------- Edit Costing Modal */
const EditCostingModal = ({ item, onClose, onDone }) => {
    const c = item?.costing || {};
    const q = item?.quotation || {};

    const [form, setForm] = useState({
        dueDate: c.dueDate ? String(c.dueDate).slice(0, 10) : getLocalDate(),
        version: c.version || 'v1.0',
        catalogueCost: c.catalogueCost ?? '',
        landedCost: c.landedCost ?? '',
        localFabricCost: c.localFabricCost ?? '',
        labourCost: c.labourCost ?? '',
        sampleCost: c.sampleCost ?? '',
        totalCost: c.totalCost ?? '',
        calculatedMargin: c.calculatedMargin ?? '',
        marginModel: c.marginModel || 'Standard Margin',
        minMarginThreshold: c.minMarginThreshold ?? 25,
        maxDiscountThreshold: c.maxDiscountThreshold ?? 15,
        discount: q.discount ?? 0,
        hiteshApprovalStatus: c.hiteshApprovalStatus || 'NOT_REQUIRED',
        hiteshApprovalNotes: c.hiteshApprovalNotes || '',
    });

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

    // Auto-calculate sum of costs if total cost field is blank
    const catCost = Number(form.catalogueCost) || 0;
    const landCost = Number(form.landedCost) || 0;
    const locCost = Number(form.localFabricCost) || 0;
    const labCost = Number(form.labourCost) || 0;
    const smpCost = Number(form.sampleCost) || 0;
    const sumTotalCost = catCost + landCost + locCost + labCost + smpCost;

    // Threshold logic check:
    const currentMargin = form.calculatedMargin === '' ? undefined : Number(form.calculatedMargin);
    const currentDiscount = form.discount === '' ? 0 : Number(form.discount);
    const minMarginThresh = Number(form.minMarginThreshold) ?? 25;
    const maxDiscThresh = Number(form.maxDiscountThreshold) ?? 15;

    const isBelowMargin = currentMargin !== undefined && currentMargin < minMarginThresh;
    const isAboveDiscount = currentDiscount > maxDiscThresh;
    const requiresHiteshApproval = isBelowMargin || isAboveDiscount;

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item._id || item.id, { costing: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            },
        }
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        const effectiveTotalCost = form.totalCost !== '' ? Number(form.totalCost) : (sumTotalCost > 0 ? sumTotalCost : undefined);
        const payload = {
            dueDate: form.dueDate || undefined,
            version: form.version || undefined,
            catalogueCost: form.catalogueCost === '' ? undefined : Number(form.catalogueCost),
            landedCost: form.landedCost === '' ? undefined : Number(form.landedCost),
            localFabricCost: form.localFabricCost === '' ? undefined : Number(form.localFabricCost),
            labourCost: form.labourCost === '' ? undefined : Number(form.labourCost),
            sampleCost: form.sampleCost === '' ? undefined : Number(form.sampleCost),
            totalCost: effectiveTotalCost,
            calculatedMargin: form.calculatedMargin === '' ? undefined : Number(form.calculatedMargin),
            marginModel: form.marginModel,
            minMarginThreshold: minMarginThresh,
            maxDiscountThreshold: maxDiscThresh,
            hiteshApprovalRequired: requiresHiteshApproval,
            hiteshApprovalStatus: requiresHiteshApproval
                ? (form.hiteshApprovalStatus === 'NOT_REQUIRED' ? 'PENDING' : form.hiteshApprovalStatus)
                : form.hiteshApprovalStatus,
            hiteshApprovalNotes: form.hiteshApprovalNotes || undefined,
        };
        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Edit Pricing & Material Costing — ${item?.clientName || item?.code}`}
            subtitle="Fill costing details, set margin models, and define margin/discount thresholds for Hitesh approval."
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={pending}>Save Costing Details</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 rounded-md border border-rose-200 dark:border-rose-800">
                        {error}
                    </div>
                )}

                {/* Hitesh Approval Dynamic Banner */}
                {requiresHiteshApproval ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                ⚠️ Hitesh Approval Required
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                {isBelowMargin && `Margin (${currentMargin}%) is below the minimum threshold of ${minMarginThresh}%. `}
                                {isAboveDiscount && `Discount (${currentDiscount}%) exceeds the maximum threshold of ${maxDiscThresh}%. `}
                                Sign-off from Hitesh (Admin) is required before final quotation release.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                            ✓ Within Standard Threshold Bounds. Hitesh approval not strictly required.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Pricing Due Date">
                        <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>

                    <Field label="Costing Version / Revision">
                        <Input placeholder="e.g. v1.0, Rev A" value={form.version} onChange={set('version')} />
                    </Field>

                    <Field label="Catalogue Cost (₹)">
                        <Input type="number" placeholder="0.00" value={form.catalogueCost} onChange={set('catalogueCost')} />
                    </Field>

                    <Field label="Landed Cost (₹)">
                        <Input type="number" placeholder="0.00" value={form.landedCost} onChange={set('landedCost')} />
                    </Field>

                    <Field label="Local Fabric Cost (₹)">
                        <Input type="number" placeholder="0.00" value={form.localFabricCost} onChange={set('localFabricCost')} />
                    </Field>

                    <Field label="Labour / Custom Cost (₹)">
                        <Input type="number" placeholder="0.00" value={form.labourCost} onChange={set('labourCost')} />
                    </Field>

                    <Field label="Sample Cost (₹)">
                        <Input type="number" placeholder="0.00" value={form.sampleCost} onChange={set('sampleCost')} />
                    </Field>

                    <Field label="Total Cost (₹)" hint={sumTotalCost > 0 ? `Calculated sum: ₹${sumTotalCost.toLocaleString('en-IN')}` : undefined}>
                        <Input type="number" placeholder={sumTotalCost > 0 ? String(sumTotalCost) : "0.00"} value={form.totalCost} onChange={set('totalCost')} />
                    </Field>

                    <Field label="Calculated Margin (%)">
                        <Input type="number" step="0.1" placeholder="e.g. 35.0" value={form.calculatedMargin} onChange={set('calculatedMargin')} />
                    </Field>

                    <Field label="Margin Model">
                        <Select value={form.marginModel} onChange={set('marginModel')}>
                            <option value="Standard Margin">Standard Margin</option>
                            <option value="Cost Plus">Cost Plus</option>
                            <option value="Target Margin">Target Margin</option>
                            <option value="Volume Discount">Volume Discount</option>
                            <option value="Custom Pricing">Custom Pricing</option>
                            <option value="High Margin Luxury">High Margin Luxury</option>
                        </Select>
                    </Field>
                </div>

                {/* Threshold Rules & Hitesh Approval Settings */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-semibold uppercase text-brand-600 dark:text-brand-400 mb-3 tracking-wider">
                        Client Approval Thresholds & Hitesh Sign-off
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Min Margin Threshold (%)" hint="Hitesh approval triggered below this margin %">
                            <Input type="number" step="1" value={form.minMarginThreshold} onChange={set('minMarginThreshold')} />
                        </Field>

                        <Field label="Max Discount Threshold (%)" hint="Hitesh approval triggered above this discount %">
                            <Input type="number" step="1" value={form.maxDiscountThreshold} onChange={set('maxDiscountThreshold')} />
                        </Field>

                        <Field label="Applied Discount (%)">
                            <Input type="number" step="0.5" value={form.discount} onChange={set('discount')} placeholder="0.0" />
                        </Field>

                        <Field label="Hitesh Approval Status">
                            <Select value={form.hiteshApprovalStatus} onChange={set('hiteshApprovalStatus')}>
                                <option value="NOT_REQUIRED">NOT REQUIRED</option>
                                <option value="PENDING">PENDING</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="REJECTED">REJECTED</option>
                            </Select>
                        </Field>
                    </div>

                    <div className="mt-3">
                        <Field label="Hitesh Approval Notes / Exception Justification">
                            <Textarea
                                rows={2}
                                placeholder="Enter notes or justification if overriding thresholds or requesting Hitesh sign-off..."
                                value={form.hiteshApprovalNotes}
                                onChange={set('hiteshApprovalNotes')}
                            />
                        </Field>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's10', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's10';
    const visibleSections = SPREADSHEET_SECTIONS.filter((s) => s.id === currentSection);

    return (
        <Panel className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
                {SPREADSHEET_SECTIONS.map((sec) => (
                    <button
                        key={sec.id}
                        type="button"
                        onClick={() => onSectionChange && onSectionChange(sec.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${currentSection === sec.id
                                ? `${sec.color} font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10`
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-200/50 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                    >
                        {sec.title}
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto max-h-[55vh] overflow-y-auto select-none relative">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="sticky top-0 z-20 text-center shadow-sm bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30">
                            <th className="bg-[#6b5240] dark:bg-slate-950 border-b border-r border-amber-300/40 dark:border-slate-800 p-4 text-[10px] uppercase text-center font-semibold text-amber-100 dark:text-slate-400 z-30">
                                Code
                            </th>
                            {visibleSections.map((sec) =>
                                sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                    <th key={col.key} className="border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[130px] bg-[#836444] dark:bg-slate-900/90">
                                        {col.label}
                                    </th>
                                ))
                            )}
                            <th className="bg-[#6b5240] dark:bg-slate-950 border-b border-amber-300/40 dark:border-slate-800 p-2 text-[10px] uppercase font-semibold text-amber-100 dark:text-slate-400 text-center sticky right-0 z-30">
                                Manage
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-center divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-200">
                        {items.map((lead, idx) => (
                            <tr key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group">
                                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10 font-mono text-brand-600 dark:text-brand-400 font-semibold">
                                    <button type="button" onClick={() => onView(lead)} className="hover:underline truncate px-2">
                                        {lead.code}
                                    </button>
                                </td>
                                {visibleSections.map((sec) =>
                                    sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                        <td key={col.key} className="p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
};

const PricingCosting = ({ items: itemsProp = [] }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch pricing costing data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's10';

    const updateParam = (key, value, defaultValue) => {
        const newParams = new URLSearchParams(searchParams);
        if (!value || value === defaultValue) {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        setSearchParams(newParams);
    };

    const handleViewLead = (lead) => {
        if (lead?.code) {
            navigate(`/crm/sales-commercials/leads/${lead.code}`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const tokenReceivedLeads = rawLeads.filter(
        (lead) => lead.token?.status === 'RECEIVED' || lead.token?.status === 'PAID' || Boolean(lead.token?.receivedDate)
    );

    const filteredLeads = tokenReceivedLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const model = String(lead.costing?.marginModel || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !model.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = tokenReceivedLeads.length;
    const costedCount = tokenReceivedLeads.filter((l) => Boolean(l.costing?.version || l.costing?.landedCost)).length;
    const pendingCosting = tokenReceivedLeads.filter((l) => l.costing?.dueDate && !l.costing?.landedCost).length;
    const totalLandedCost = tokenReceivedLeads.reduce((acc, l) => acc + Number(l.costing?.landedCost || 0), 0);

    return (
        <div>
            <PageHeader
                title="Pricing / Material Costing"
                subtitle="Evaluate catalogue costs, landed costs, local fabric & labour expenses, costing versions, and margin models"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Costing Projects" value={totalCount} sub="Leads in costing stage" icon={Calculator} tone="slate" />
                <StatTile label="Costings Completed" value={costedCount} sub="Landed costs evaluated" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Costings" value={pendingCosting} sub="Due for calculation" icon={Calendar} tone="amber" />
                <StatTile label="Total Landed Cost" value={currency(totalLandedCost, { compact: true })} sub="Cumulative cost baseline" icon={DollarSign} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, margin model..."
                            className="pl-9"
                        />
                    </div>

                    {(search || selectedSection !== 's10') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchParams({})}
                            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>
            </Panel>

            {loading ? (
                <Panel className="p-12 text-center">
                    <Loading text="Loading Material Costing Details..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={Calculator} title="No Costing Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingItem(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's10')}
                />
            )}

            {editingItem && (
                <EditCostingModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default PricingCosting;
