import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Calculator, Calendar, CheckCircle2, Paperclip, DollarSign, Pencil, History } from 'lucide-react';
import { currency, date, getLocalDate } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';
import DetailedDrawer from '../../components/sales/DetailedDrawer';

const SPREADSHEET_SECTIONS = [
    {
        id: 's10',
        title: 'Material & Labor Costing Overview',
        color: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700/80',
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'costing.dueDate', label: 'Pricing Due Date', type: 'date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'costing.version', label: 'Costing Version / Revision', type: 'version' },
            { key: 'costing.category', label: 'Costing Category', type: 'category' },
            { key: 'costing.price', label: 'Price (₹)', type: 'currency' },
        ],
        // Subset shown in table : prevents horizontal scrolling
        tableCols: [
            { key: 'costing.dueDate', label: 'Due Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'costing.version', label: 'Version' },
            { key: 'costing.category', label: 'Category' },
            { key: 'costing.price', label: 'Price' },
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
    return curr;
};

const SPREADSHEET_CELL_RENDERERS = {
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.costing?.dueDate}
            isCompleted={Boolean(lead.costing?.category || lead.costing?.version || (lead.costing?.price !== undefined && lead.costing?.price > 0))}
        />
    ),
    sno: (lead, { sno }) => <span className="  text-slate-500 dark:text-slate-400 font-medium">{sno}</span>,
    code: (lead, { onView }) => (
        <button
            type="button"
            onClick={() => onView(lead)}
            className="  text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
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
    'costing.dueDate': (lead) => {
        const raw = lead.costing?.dueDate;
        if (!raw) return <span className="text-slate-400 dark:text-slate-600 italic">Not set</span>;

        const d = new Date(raw);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDue = d < today && !(lead.costing?.price !== undefined && lead.costing?.price > 0);

        return (
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium whitespace-nowrap">
                    {date(raw, { time: false })}
                </span>
                {isPastDue ? (
                    <Badge tone="rose" className="text-[9px] px-1 py-0">Overdue</Badge>
                ) : (
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">Target Due</span>
                )}
            </div>
        );
    },
    'costing.version': (lead) => {
        const ver = lead.costing?.version || 'v1.0';
        const historyCount = lead.costing?.costingHistory?.length || 0;
        return (
            <div className="flex items-center justify-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[11px]   font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {ver}
                </span>
                {historyCount > 0 && (
                    <span className="inline-flex items-center text-[10px] font-medium text-brand-600 dark:text-brand-400" title={`${historyCount} previous revision(s) saved`}>
                        <History className="w-3 h-3 mr-0.5" /> ({historyCount})
                    </span>
                )}
            </div>
        );
    },
    'costing.category': (lead) => {
        const raw = lead.costing?.category;
        if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const cat = String(raw).toLowerCase();
        let tone = 'slate';
        if (cat === 'a') tone = 'brand';
        else if (cat === 'b') tone = 'blue';
        else if (cat === 'c') tone = 'violet';
        return (
            <Badge tone={tone} className="uppercase font-bold tracking-wider text-[11px] px-2 py-0.5">
                Category {cat.toUpperCase()}
            </Badge>
        );
    },
    'costing.price': (lead) => {
        const raw = lead.costing?.price;
        const price = (raw !== undefined && raw !== null && !isNaN(Number(raw))) ? Number(raw) : 0;
        return (
            <div className="flex flex-col items-center">
                <span className="text-slate-900 dark:text-slate-100 text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {currency(price)}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-sans">Base Price</span>
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
            return <span className="  text-slate-900 dark:text-slate-200 text-xs font-semibold">{raw}%</span>;
        }
        return <span className="  text-slate-900 dark:text-slate-200 text-xs font-semibold">{currency(raw)}</span>;
    }

    if (key.toLowerCase().includes('margin') && typeof raw === 'string') {
        const formatted = raw.endsWith('%') ? raw : `${raw}%`;
        return <span className="  text-slate-900 dark:text-slate-200 text-xs font-semibold">{formatted}</span>;
    }

    if (typeof raw === 'boolean') {
        return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
    }

    if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};


/* ------------------------------------------------------------- Edit Costing Modal */
const EditCostingModal = ({ item, onClose, onDone }) => {
    const c = item?.costing || {};

    const initialCategory = ['a', 'b', 'c'].includes(String(c.category || '').toLowerCase())
        ? String(c.category).toLowerCase()
        : 'a';
    const initialPrice = c.price !== undefined && c.price !== null && !isNaN(Number(c.price))
        ? Number(c.price)
        : 0;
    const initialDueDate = c.dueDate ? String(c.dueDate).slice(0, 10) : getLocalDate();
    const initialVersion = c.version || 'v1.0';

    const [form, setForm] = useState({
        dueDate: initialDueDate,
        version: initialVersion,
        category: initialCategory,
        price: initialPrice,
    });
    const [clientError, setClientError] = useState('');

    const { execute, pending, error: apiError } = useAction(
        (payload) => leadsApi.update(item._id || item.id, payload),
        {
            onSuccess: () => {
                if (onDone) onDone();
                onClose();
            },
        }
    );

    const handleBumpVersion = () => {
        const current = String(form.version || 'v1.0').trim();
        const match = current.match(/^v?(\d+)(?:\.(\d+))?$/i);
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = match[2] !== undefined ? parseInt(match[2], 10) : 0;
            setForm((p) => ({ ...p, version: `v${major}.${minor + 1}` }));
        } else {
            setForm((p) => ({ ...p, version: `${current}-rev` }));
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setClientError('');

        if (!form.dueDate) {
            setClientError('Pricing Due Date is required.');
            return;
        }
        if (!form.version || !form.version.trim()) {
            setClientError('Costing Version is required (e.g. v1.0).');
            return;
        }
        const trimmedCat = String(form.category || '').trim().toLowerCase();
        if (!['a', 'b', 'c'].includes(trimmedCat)) {
            setClientError('Costing Category must be one of: "a", "b", or "c".');
            return;
        }
        const numPrice = Number(form.price);
        if (isNaN(numPrice) || numPrice < 0) {
            setClientError('Price must be a valid non-negative number.');
            return;
        }

        // Archive previous revision snapshot into costingHistory
        const existingHistory = Array.isArray(c.costingHistory) ? [...c.costingHistory] : [];
        let updatedHistory = existingHistory;

        if (c.version || c.dueDate || c.category || c.price !== undefined) {
            const snapshot = {
                version: c.version || 'v1.0',
                dueDate: c.dueDate,
                category: c.category || 'a',
                price: c.price !== undefined && c.price !== null ? Number(c.price) : 0,
                savedAt: new Date().toISOString(),
            };
            const lastHistory = existingHistory[existingHistory.length - 1];
            if (!lastHistory || lastHistory.version !== snapshot.version || lastHistory.price !== snapshot.price || lastHistory.category !== snapshot.category) {
                updatedHistory = [...existingHistory, snapshot];
            }
        }

        const payload = {
            costing: {
                dueDate: form.dueDate,
                version: form.version.trim(),
                category: trimmedCat,
                price: numPrice,
                costingHistory: updatedHistory,
            },
        };

        execute(payload);
    };

    const displayError = clientError || apiError;

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Pricing & Material Costing : ${item?.clientName || item?.code}`}
            subtitle="Configure material costing parameters, versioning, category, and base price"
            size="lg"
            footer={
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Lead: <strong className="text-slate-800 dark:text-slate-200">{item?.code}</strong> • Stage: Material Costing
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={pending}>Save Costing & Retain Version</Button>
                    </div>
                </div>
            }>

            <form onSubmit={handleSubmit} className="space-y-4">
                {displayError && (
                    <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 rounded-md border border-rose-200 dark:border-rose-800 font-medium">
                        {displayError}
                    </div>
                )}

                {/* Lead Summary Header Card */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client / Project</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{item?.clientName || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Lead Code</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{item?.code || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Priority</span>
                        <Badge tone={item?.priority === 'HIGH' ? 'rose' : item?.priority === 'MEDIUM' ? 'amber' : 'slate'}>
                            {item?.priority || 'MEDIUM'}
                        </Badge>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">₹ Advance</span>
                        <Badge tone={item?.token?.status === 'RECEIVED' ? 'green' : 'blue'}>
                            {item?.token?.status || 'RECEIVED'}
                        </Badge>
                    </div>
                </div>

                {/* Core Costing Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Due Date */}
                    <Field label="Pricing Due Date" required hint="Costing evaluation target completion date">
                        <Input
                            type="date"
                            value={form.dueDate}
                            onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                            required
                        />
                    </Field>

                    {/* 2. Version */}
                    <Field
                        label="Costing Version / Revision"
                        required
                        hint="Current costing revision tag (e.g. v1.0, v1.1)"
                    >
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="text"
                                value={form.version}
                                onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                                placeholder="v1.0"
                                className="flex-1"
                                required
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleBumpVersion}
                                title="Auto-increment version (e.g. v1.0 → v1.1)"
                                className="shrink-0 text-xs px-2.5"
                            >
                                +0.1 Rev
                            </Button>
                        </div>
                    </Field>

                    {/* 3. Category */}
                    <Field
                        label="Costing Category"
                        required
                        hint="Material category tier (allowed: a, b, or c)"
                    >
                        <Select
                            value={form.category}
                            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                            options={[
                                { value: 'a', label: 'Category A (Tier A — Standard / High-Volume)' },
                                { value: 'b', label: 'Category B (Tier B — Premium / Curated)' },
                                { value: 'c', label: 'Category C (Tier C — Luxury / Bespoke)' },
                            ]}
                            required
                        />
                    </Field>

                    {/* 4. Price */}
                    <Field
                        label="Material Costing Price (₹)"
                        required
                        hint="Base material costing price (numeric, default: 0)"
                    >
                        <Input
                            type="number"
                            min="0"
                            step="any"
                            value={form.price}
                            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value === '' ? '' : e.target.value }))}
                            placeholder="0"
                            required
                        />
                    </Field>
                </div>

                {/* Costing Summary Preview Banner */}
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">Configured Material Costing:</span>
                        <Badge tone={form.category === 'a' ? 'brand' : form.category === 'b' ? 'blue' : 'violet'}>
                            Category {String(form.category).toUpperCase()}
                        </Badge>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                            {currency(Number(form.price) || 0)}
                        </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        Target: {form.dueDate || '—'} ({form.version || 'v1.0'})
                    </span>
                </div>

                {/* History of Previous Versions */}
                {Array.isArray(c.costingHistory) && c.costingHistory.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <History className="w-3.5 h-3.5" /> Previous Saved Revisions ({c.costingHistory.length})
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-1 rounded border border-slate-200 dark:border-slate-800 p-1.5 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
                            {c.costingHistory.map((h, i) => (
                                <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-white dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{h.version || 'v1.0'}</span>
                                        {h.category && (
                                            <Badge tone="slate" className="text-[10px] py-0 px-1">
                                                Cat {String(h.category).toUpperCase()}
                                            </Badge>
                                        )}
                                        {h.price !== undefined && (
                                            <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                                                {currency(h.price)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {h.savedAt ? date(h.savedAt, { time: true }) : 'Previous'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's10', onSectionChange }) => {
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
                                (sec.tableCols || sec.cols).filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                    <th key={col.key} className="border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[140px] bg-[#836444] dark:bg-slate-900/90">
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
                            <tr onClick={() => onRowClick ? onRowClick(lead) : onView(lead)} key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group cursor-pointer">
                                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10   text-brand-600 dark:text-brand-400 font-semibold">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); onView(lead); }} className="hover:underline truncate px-2">
                                        {lead.code}
                                    </button>
                                </td>
                                {visibleSections.map((sec) =>
                                    (sec.tableCols || sec.cols).filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                        <td key={col.key} className="p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View lead details" />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Edit costing parameters" />
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
    const [viewMode, setViewMode] = useViewMode('table');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [drawerLead, setDrawerLead] = useState(null);

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=pricing-costing`);
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
            const category = String(lead.costing?.category || '').toLowerCase();
            const version = String(lead.costing?.version || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !category.includes(q) && !version.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = tokenReceivedLeads.length;
    const costedCount = tokenReceivedLeads.filter((l) => Boolean(l.costing?.category || l.costing?.version || (l.costing?.price !== undefined && l.costing?.price > 0))).length;
    const pendingCosting = tokenReceivedLeads.filter((l) => l.costing?.dueDate && !(l.costing?.price !== undefined && l.costing?.price > 0)).length;
    const totalCostValue = tokenReceivedLeads.reduce((acc, l) => acc + Number(l.costing?.price || 0), 0);

    return (
        <div>
            <PageHeader
                title="Pricing / Material Costing"
                subtitle="Evaluate material costing versions, category tiers (A, B, C), and base prices"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Costing Projects" value={totalCount} sub="Leads in costing stage" icon={Calculator} tone="slate" />
                <StatTile label="Costings Completed" value={costedCount} sub="Evaluated costing baseline" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Costings" value={pendingCosting} sub="Due for calculation" icon={Calendar} tone="amber" />
                <StatTile label="Total Material Cost" value={currency(totalCostValue, { compact: true })} sub="Cumulative material cost baseline" icon={DollarSign} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, category, version..."
                            className="pl-9"
                        />
                    </div>

                    <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

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
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="pricing"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingItem(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={Calculator} title="No Costing Records Found" hint="Try adjusting search parameters." />
                        </Panel>
                    }
                />
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingItem(lead)}
                    onRowClick={(lead) => setDrawerLead(lead)}
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

            <DetailedDrawer
                open={Boolean(drawerLead)}
                lead={drawerLead}
                onClose={() => setDrawerLead(null)}
                onViewFull={handleViewLead}
                pageName={SPREADSHEET_SECTIONS[0].title}
                pageFields={SPREADSHEET_SECTIONS[0].cols}
            />
        </div>
    );
};

export default PricingCosting;

