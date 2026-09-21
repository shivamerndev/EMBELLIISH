import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, BadgeDollarSign, Calendar, CheckCircle2, Paperclip, Wallet, Pencil,
    AlertTriangle, FileText, ArrowRight
} from 'lucide-react';
import { currency, date, formatBudgetValue } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import { getNextStageUrl } from '../../utils/salesPipeline';
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
        id: 's9',
        title: 'Advance Discussion',
        color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-700/80',
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'advance.discussionDueDate', label: 'Advance Discussion Due' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
            { key: 'advance.amount', label: 'Advance Amount (₹)' },
            { key: 'advance.status', label: 'Advance Status' },
            { key: 'advance.receivedDate', label: 'Advance Received Date' },
            { key: 'advance.clientBudgetResponse', label: 'Client Budget Response' },
            { key: 'advance.proposal', label: 'Proposal' },
            { key: 'advance.budgetEstimate', label: 'Budget Estimate (₹)' },
            { key: 'advance.clientResponse', label: 'Client Response' },
            { key: 'advance.projectTimeline', label: 'Project Timeline' },
            { key: 'advance.commercialTerms', label: 'Commercial Terms' },
        ],
        // Subset shown in table : prevents horizontal scrolling
        tableCols: [
            { key: 'advance.discussionDueDate', label: 'Due Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'advance.amount', label: 'Advance Amount' },
            { key: 'advance.status', label: 'Status' },
            { key: 'advance.clientResponse', label: 'Client Response' },
        ]
    }
];


const TOKEN_STATUS_OPTIONS = [
    { value: 'Not Discussed', label: 'Not Discussed', tone: 'slate' },
    { value: 'Pending', label: 'Pending', tone: 'amber' },
    { value: 'Committed', label: 'Committed', tone: 'indigo' },
    { value: 'Received', label: 'Received', tone: 'emerald' },
    { value: 'Waived', label: 'Waived', tone: 'purple' },
    { value: 'Refunded', label: 'Refunded', tone: 'rose' }
];

const CLIENT_BUDGET_RESPONSE_OPTIONS = [
    { value: 'Accepted', label: 'Accepted', tone: 'emerald' },
    { value: 'Revision Required', label: 'Revision Required', tone: 'amber' },
    { value: 'On Hold', label: 'On Hold', tone: 'blue' },
    { value: 'Declined', label: 'Declined', tone: 'rose' }
];

const getNestedVal = (obj, path) => {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
        if (curr === null || curr === undefined) return undefined;
        curr = curr[p];
    }
    return curr;
};

const normalizeTokenStatus = (st) => {
    if (!st) return 'Not Discussed';
    const s = String(st).toUpperCase().replace(/_/g, ' ');
    if (s.includes('RECEIVED')) return 'Received';
    if (s.includes('COMMITTED')) return 'Committed';
    if (s.includes('WAIVED')) return 'Waived';
    if (s.includes('REFUNDED')) return 'Refunded';
    if (s.includes('PENDING')) return 'Pending';
    if (s.includes('NOT DISCUSSED')) return 'Not Discussed';
    if (s.includes('DISCUSSED')) return 'Pending';
    return st;
};

const SPREADSHEET_CELL_RENDERERS = {
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.advance?.discussionDueDate}
            isCompleted={Boolean(lead.advance?.receivedDate || lead.advance?.status === 'Received')}
        />
    ),
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
    'advance.discussionDueDate': (lead) => {
        const val = lead.advance?.discussionDueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.advance?.receivedDate && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Overdue" />}
            </div>
        );
    },
    'advance.amount': (lead) => {
        const val = lead.advance?.amount;
        if (val === undefined || val === null || val === '') return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="font-mono text-slate-900 dark:text-slate-100 text-xs font-bold">{currency(val)}</span>;
    },
    'advance.status': (lead) => {
        const raw = lead.advance?.status;
        const st = normalizeTokenStatus(raw);
        const opt = TOKEN_STATUS_OPTIONS.find((o) => o.value.toLowerCase() === st.toLowerCase()) || { tone: 'slate' };
        return <Badge tone={opt.tone}>{st}</Badge>;
    },
    'advance.receivedDate': (lead) => {
        const st = normalizeTokenStatus(lead.advance?.status);
        const val = lead.advance?.receivedDate;
        if (!val) {
            if (st === 'Received') {
                return (
                    <Badge tone="rose" className="text-[10px] animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-0.5 inline" /> Required
                    </Badge>
                );
            }
            return <span className="text-slate-400 dark:text-slate-600">—</span>;
        }
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                {date(val)}
            </span>
        );
    },
    'advance.clientBudgetResponse': (lead) => {
        const val = lead.advance?.clientBudgetResponse;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const opt = CLIENT_BUDGET_RESPONSE_OPTIONS.find((o) => o.value === val);
        return <Badge tone={opt ? opt.tone : 'slate'}>{val}</Badge>;
    },
    'advance.proposal': (lead) => {
        const val = lead.advance?.proposal || lead.proposal?.noVersion || lead.proposal?.selectedBoqVersion;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                <FileText className="w-3 h-3 text-purple-500 shrink-0" />
                {val}
            </span>
        );
    },
    'advance.budgetEstimate': (lead) => {
        const val = lead.advance?.budgetEstimate;
        if (val === undefined || val === null || val === '') return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="font-mono text-slate-900 dark:text-slate-100 text-xs font-semibold">{currency(val)}</span>;
    },
    'advance.clientResponse': (lead) => {
        const val = lead.advance?.clientResponse;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={val}>
                {val}
            </span>
        );
    },
    'advance.projectTimeline': (lead) => {
        const start = lead.advance?.projectTimelineStart;
        const end = lead.advance?.projectTimelineEnd;
        const str = lead.advance?.projectTimeline;

        if (start || end) {
            return (
                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-nowrap font-medium">
                    {start ? date(start) : 'TBD'} → {end ? date(end) : 'TBD'}
                </span>
            );
        }

        if (!str) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-xs truncate max-w-[160px] block mx-auto" title={str}>{str}</span>;
    },
    'advance.commercialTerms': (lead) => {
        const terms = lead.advance?.commercialTerms;
        const template = lead.advance?.masterTemplate;
        const notes = lead.advance?.commercialTermsNotes;

        if (!terms && !template && !notes) return <span className="text-slate-400 dark:text-slate-600">—</span>;

        return (
            <div className="max-w-[180px] mx-auto text-left space-y-0.5" title={terms || notes || template}>
                {template && (
                    <Badge tone="blue" className="text-[9px] truncate max-w-[170px] block">
                        {template}
                    </Badge>
                )}
                {(terms || notes) && (
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                        {terms || notes}
                    </span>
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
        return <span className="font-mono text-slate-900 dark:text-slate-200 text-xs font-semibold">{currency(raw)}</span>;
    }

    if (typeof raw === 'boolean') {
        return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
    }

    if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={String(raw)}>{String(raw)}</span>;
};

const formatDatetimeLocal = (val) => {
    if (!val) return '';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val).slice(0, 16);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return '';
    }
};

/* ------------------------------------------------------------- Edit Advance Discussion Modal */


const EditTokenModal = ({ item, onClose, onDone }) => {
    const navigate = useNavigate();
    const tok = item?.advance || {};
    const [redirectOnSave, setRedirectOnSave] = useState(false);
    const redirectRef = useRef(false);

    const initialStatus = normalizeTokenStatus(tok.status);

    const [form, setForm] = useState({
        budgetEstimate: tok.budgetEstimate !== undefined && tok.budgetEstimate !== null && tok.budgetEstimate !== '' ? formatBudgetValue(tok.budgetEstimate) : (item?.budget ? formatBudgetValue(item.budget) : ''),
        amount: tok.amount !== undefined && tok.amount !== null && tok.amount !== '' ? formatBudgetValue(tok.amount) : '',
        status: initialStatus,
        receivedDate: tok.receivedDate ? formatDatetimeLocal(tok.receivedDate) : '',
    });

    const [validationError, setValidationError] = useState('');

    const set = (key) => (e) => {
        const val = e.target.value;
        setForm((p) => ({ ...p, [key]: val }));
    };

    const { execute, pending, error: apiError } = useAction(
        async ({ payload, shouldRedirect }) => {
            const res = await leadsApi.update(item._id || item.id, { advance: payload });
            return { res, shouldRedirect };
        },
        {
            onSuccess: (data) => {
                const shouldRedirect = data?.shouldRedirect ?? redirectRef.current;
                onDone();
                onClose();
                if (shouldRedirect) {
                    const { url } = getNextStageUrl('token', item?.code);
                    navigate(url);
                }
            },
        }
    );

    const handleSubmit = (e, shouldRedirect = false) => {
        if (e) e.preventDefault();
        setValidationError('');

        // Configuration / Validation rule: ADVANCE RECIEVED DATE&TIME is Mandatory when ADVANCE COLLECTED STATUS is Received
        if (form.status === 'Received' && !form.receivedDate) {
            setValidationError('ADVANCE RECIEVED DATE&TIME is mandatory when ADVANCE COLLECTED STATUS is Received.');
            return;
        }

        const payload = {
            ...tok,
            budgetEstimate: form.budgetEstimate === '' || form.budgetEstimate === undefined || form.budgetEstimate === null ? undefined : Number(String(form.budgetEstimate).replace(/[^0-9.]/g, '')) || undefined,
            amount: form.amount === '' || form.amount === undefined || form.amount === null ? undefined : Number(String(form.amount).replace(/[^0-9.]/g, '')) || undefined,
            status: form.status,
            receivedDate: form.receivedDate || undefined,
        };

        redirectRef.current = shouldRedirect;
        setRedirectOnSave(shouldRedirect);
        execute({ payload, shouldRedirect });
    };

    const handleSaveAndRedirect = (e) => {
        handleSubmit(e, true);
    };

    const handleDirectRedirect = () => {
        onClose();
        const { url } = getNextStageUrl('token', item?.code);
        navigate(url);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Advance Received Details : ${item?.clientName || item?.code}`}
            size="lg"
            footer={
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                   
                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={(e) => handleSubmit(e, false)} loading={pending && !redirectOnSave}>Save Advance Detail</Button>
                    </div>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {(validationError || apiError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError || (apiError?.message || String(apiError))}</span>
                    </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="1. VALUE OF PROJECT (MONEY)">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 5,00,000"
                                    value={form.budgetEstimate}
                                    onChange={(e) => setForm((p) => ({ ...p, budgetEstimate: formatBudgetValue(e.target.value) }))}
                                    className="pl-7 font-mono"
                                />
                            </div>
                        </Field>

                        <Field label="2. ADVANCE COLLECTED AMOUNT">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 50,000"
                                    value={form.amount}
                                    onChange={(e) => setForm((p) => ({ ...p, amount: formatBudgetValue(e.target.value) }))}
                                    className="pl-7 font-mono"
                                />
                            </div>
                        </Field>

                        <Field label="3. ADVANCE COLLECTED STATUS" required>
                            <Select value={form.status} onChange={set('status')}>
                                {TOKEN_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label="4. ADVANCE RECIEVED DATE&TIME"
                            required={form.status === 'Received'}
                        >
                            <Input
                                type="datetime-local"
                                value={form.receivedDate}
                                onChange={set('receivedDate')}
                                className={form.status === 'Received' && !form.receivedDate ? 'border-rose-400 focus:ring-rose-500' : ''}
                            />
                        </Field>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's9', onSectionChange }) => {
    const navigate = useNavigate();
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's9';
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
                            <tr onClick={() => onRowClick ? onRowClick(lead) : onView(lead)} key={lead.id || lead._id || idx} className="hover:bg-amber-500/5 dark:hover:bg-slate-900/80 transition group cursor-pointer">
                                <td className="border-r border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 z-10 font-mono text-brand-600 dark:text-brand-400 font-semibold">
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
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View Details" />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Edit Advance Details" />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            icon={ArrowRight}
                                            className="text-[11px] h-7 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const { url } = getNextStageUrl('token', lead.code);
                                                navigate(url);
                                            }}
                                            title="Move & Redirect to Next Step (Pricing & Costing)"
                                        >
                                            Next Step
                                        </Button>
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

const TokenDiscussion = ({ items: itemsProp = [] }) => {
    const [viewMode, setViewMode] = useViewMode('table');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [drawerLead, setDrawerLead] = useState(null);

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch advance discussion data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's9';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=token-discussion`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const approvedLeads = rawLeads.filter((lead) => {
        const propApproval = String(lead.proposal?.approvalStatus || lead.proposalApprovalStatus || lead.proposal?.status || '').toUpperCase();
        const isProposalApproved = propApproval === 'APPROVED' || propApproval === 'COMPLETED' || propApproval === 'SUBMITTED' || propApproval === 'SENT';

        const isAdvanceStage = Boolean(
            lead.stage && ['advance', 'advance discussion', 'budgeting', 'budgeting / advance discussion'].includes(String(lead.stage).toLowerCase())
        );

        const hasProposalData = Boolean(
            lead.proposal?.noVersion ||
            lead.proposal?.date ||
            lead.proposal?.selectedBoqVersion
        );

        const hasAdvanceActivity = Boolean(
            lead.advance?.discussionDueDate ||
            lead.advance?.amount ||
            lead.advance?.receivedDate ||
            (lead.advance?.status && !['NOT_DISCUSSED', 'Not Discussed', 'not_discussed'].includes(lead.advance.status)) ||
            lead.advance?.clientBudgetResponse ||
            lead.advance?.clientResponse
        );

        return isProposalApproved || isAdvanceStage || hasAdvanceActivity || hasProposalData;
    });

    const filteredLeads = approvedLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = approvedLeads.length;
    const advanceReceivedCount = approvedLeads.filter((l) => normalizeTokenStatus(l.advance?.status) === 'Received' || l.advance?.receivedDate).length;
    const totalAdvanceValue = approvedLeads.reduce((acc, l) => acc + Number(l.advance?.amount || 0), 0);
    const pendingDiscussions = approvedLeads.filter((l) => l.advance?.discussionDueDate && !l.advance?.receivedDate).length;

    return (
        <div>
            <PageHeader
                title="Advance Receiving"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Advance Pipeline" value={totalCount} sub="Active commercial leads" icon={BadgeDollarSign} tone="amber" />
                <StatTile label="Advance Received" value={advanceReceivedCount} sub="Advances secured" icon={CheckCircle2} tone="green" />
                <StatTile label="Total Advance Amount" value={currency(totalAdvanceValue, { compact: true })} sub="Cumulative advance value" icon={Wallet} tone="emerald" />
                <StatTile label="Pending Discussions" value={pendingDiscussions} sub="Advance meetings due" icon={Calendar} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client name..."
                            className="pl-9"
                        />
                    </div>

                    <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

                    {(search || selectedSection !== 's9') && (
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
                    <Loading text="Loading Advance Data..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState
                        icon={BadgeDollarSign}
                        title="No Advance Records Found"
                        hint={search ? "Try adjusting your search query." : "Leads appear here once a Proposal is created/approved or advance activity is updated."}
                    />
                </Panel>
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="token"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingLead(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={BadgeDollarSign} title="No Advance Records Found" hint="Try adjusting search parameters." />
                        </Panel>
                    }
                />
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    onRowClick={(lead) => setDrawerLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's9')}
                />
            )}

            {editingLead && (
                <EditTokenModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
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

export default TokenDiscussion;
