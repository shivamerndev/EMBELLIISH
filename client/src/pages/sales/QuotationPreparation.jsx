import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, FileSpreadsheet, Calendar, CheckCircle2, Paperclip,
    DollarSign, Edit2, Plus, Trash2, ShieldCheck, AlertTriangle, RefreshCw, Layers, Check
} from 'lucide-react';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's11',
        title: 'Quotation Preparation & Master Fields',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
        cols: [
            { key: 'quotation.dueDate', label: 'Quotation Due Date' },
            { key: 'quotation.no', label: 'Quotation No.' },
            { key: 'quotation.version', label: 'Quotation Version' },
            { key: 'quotation.date', label: 'Quotation Date' },
            { key: 'quotation.cataloguePrice', label: 'Catalogue Price' },
            { key: 'quotation.labourPrice', label: 'Labour Price' },
            { key: 'quotation.samplePrice', label: 'Sample Price' },
            { key: 'quotation.discount', label: 'Discount (%)' },
            { key: 'quotation.taxes', label: 'Taxes (GST Rate)' },
            { key: 'quotation.finalQuotedValue', label: 'Final Quoted Value' },
            { key: 'quotation.addSubtotal', label: 'Add Subtotal' },
            { key: 'quotation.validity', label: 'Quotation Validity' },
            { key: 'quotation.discountApprovalStatus', label: 'Discount Approval' },
            { key: 'quotation.boq', label: 'BOQ Record' },
            { key: 'quotation.fabricSelection', label: 'Fabric Selection' },
            { key: 'quotation.marginRules', label: 'Margin Rules' },
        ]
    }
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

// Calculate pricing details from quotation values
const calculateQuotationTotals = (q) => {
    const cataloguePrice = Number(q.cataloguePrice || 0);
    const labourPrice = Number(q.labourPrice || 0);
    const samplePrice = Number(q.samplePrice || 0);
    const subtotal = cataloguePrice + labourPrice + samplePrice;

    const discountPercent = Number(q.discount || 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const taxableAmount = Math.max(0, subtotal - discountAmount);

    const taxRate = Number(q.taxes ?? 18);
    const taxAmount = (taxableAmount * taxRate) / 100;
    const finalQuotedValue = taxableAmount + taxAmount;

    return {
        subtotal,
        discountPercent,
        discountAmount,
        taxableAmount,
        taxRate,
        taxAmount,
        finalQuotedValue,
    };
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
    'quotation.no': (lead) => (
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            {lead.quotation?.no || 'Pending Gen'}
        </span>
    ),
    'quotation.version': (lead) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {lead.quotation?.version || 'v1.0'}
        </span>
    ),
    'quotation.taxes': (lead) => {
        const rate = lead.quotation?.taxes ?? 18;
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                GST @ {rate}%
            </span>
        );
    },
    'quotation.addSubtotal': (lead) => {
        const isYes = lead.quotation?.addSubtotal === true || String(lead.quotation?.addSubtotal).toLowerCase() === 'true' || lead.quotation?.addSubtotal === 1;
        return isYes ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
    },
    'quotation.discountApprovalStatus': (lead) => {
        const st = lead.quotation?.discountApprovalStatus || 'NOT_REQUIRED';
        const tone = st === 'APPROVED' ? 'emerald' : st === 'PENDING' ? 'amber' : st === 'REJECTED' ? 'rose' : 'slate';
        return <Badge tone={tone}>{st.replace('_', ' ')}</Badge>;
    },
    'quotation.discount': (lead) => {
        const disc = Number(lead.quotation?.discount || 0);
        if (disc === 0) return <span className="text-slate-400 dark:text-slate-600">0%</span>;
        return (
            <span className={`font-semibold text-xs px-2 py-0.5 rounded ${disc > 10 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'text-slate-700 dark:text-slate-300'}`}>
                {disc}% {disc > 10 ? '(High)' : ''}
            </span>
        );
    },
    'quotation.finalQuotedValue': (lead) => {
        const q = lead.quotation || {};
        const computed = q.finalQuotedValue ?? calculateQuotationTotals(q).finalQuotedValue;
        return (
            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {currency(computed)}
            </span>
        );
    },
    'quotation.marginRules': (lead) => {
        const q = lead.quotation || {};
        const totals = calculateQuotationTotals(q);
        const totalCost = Number(lead.costing?.totalCost || lead.costing?.landedCost || 0);
        
        if (!totalCost || totals.taxableAmount === 0) {
            return <span className="text-slate-500 dark:text-slate-400 text-xs italic">{q.marginRules || 'Rule Pending'}</span>;
        }

        const marginPct = ((totals.taxableAmount - totalCost) / totals.taxableAmount) * 100;
        const isCompliant = marginPct >= 20;

        return (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${isCompliant ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'}`}>
                {isCompliant ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {marginPct.toFixed(1)}% ({isCompliant ? 'Pass' : 'Low'})
            </span>
        );
    },
    'quotation.fabricSelection': (lead) => {
        const raw = lead.quotation?.fabricSelection;
        if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-medium">
                        <Layers className="w-3 h-3 shrink-0" /> {parsed.length} Fabric(s)
                    </span>
                );
            }
        } catch (e) {
            // String fallback
        }
        return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px] block" title={String(raw)}>{String(raw)}</span>;
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

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};

/* ------------------------------------------------------------- Edit Quotation Modal */
import { getLocalDate } from '../../utils/format';

const EditQuotationModal = ({ item, onClose, onDone }) => {
    const q = item?.quotation || {};

    // Parse existing fabric selections (array of { room, fabric }) or string
    const parseFabrics = (raw) => {
        if (!raw) return [{ room: 'Living Room', fabric: '' }];
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            return [{ room: 'General', fabric: String(raw) }];
        }
        return [{ room: 'Living Room', fabric: String(raw) }];
    };

    const [form, setForm] = useState({
        dueDate: q.dueDate ? String(q.dueDate).slice(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        no: q.no || `QT-${new Date().getFullYear()}-${item.code || '001'}`,
        version: q.version || 'v1.0',
        date: q.date ? String(q.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        taxes: q.taxes ?? 18,
        addSubtotal: q.addSubtotal ?? true,
        validity: q.validity || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        discountApprovalStatus: q.discountApprovalStatus || 'NOT_REQUIRED',
        cataloguePrice: q.cataloguePrice ?? '',
        labourPrice: q.labourPrice ?? '',
        samplePrice: q.samplePrice ?? '',
        discount: q.discount ?? 0,
        marginRules: q.marginRules || 'Standard 20% Gross Margin Policy',
        boqVersion: q.boqVersion || 'BOQ-v1.0 (Approved)',
    });

    const [fabrics, setFabrics] = useState(parseFabrics(q.fabricSelection));
    const [validationError, setValidationError] = useState('');

    const set = (key) => (e) => {
        const val = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value;
        setForm((p) => {
            const next = { ...p, [key]: val };

            // Automated Trigger: If Discount % > 10%, auto-set status to PENDING
            if (key === 'discount') {
                const discVal = Number(val || 0);
                if (discVal > 10 && next.discountApprovalStatus !== 'APPROVED') {
                    next.discountApprovalStatus = 'PENDING';
                } else if (discVal <= 10 && next.discountApprovalStatus === 'PENDING') {
                    next.discountApprovalStatus = 'NOT_REQUIRED';
                }
            }

            return next;
        });
    };

    // Calculate live totals
    const totals = calculateQuotationTotals({
        cataloguePrice: form.cataloguePrice,
        labourPrice: form.labourPrice,
        samplePrice: form.samplePrice,
        discount: form.discount,
        taxes: form.taxes,
    });

    // Margin rule calculation
    const leadTotalCost = Number(item.costing?.totalCost || item.costing?.landedCost || 0);
    const estimatedMarginPct = totals.taxableAmount > 0 && leadTotalCost > 0
        ? (((totals.taxableAmount - leadTotalCost) / totals.taxableAmount) * 100)
        : null;
    const isMarginCompliant = estimatedMarginPct === null || estimatedMarginPct >= 20;

    // Handle repeatable fabric updates
    const addFabricRow = () => {
        setFabrics([...fabrics, { room: '', fabric: '' }]);
    };

    const removeFabricRow = (idx) => {
        if (fabrics.length <= 1) return;
        setFabrics(fabrics.filter((_, i) => i !== idx));
    };

    const updateFabricRow = (idx, field, val) => {
        const next = [...fabrics];
        next[idx] = { ...next[idx], [field]: val };
        setFabrics(next);
    };

    // Quick validity period calculator
    const applyValidityDays = (days) => {
        const baseDate = form.date ? new Date(form.date) : new Date();
        const validDate = new Date(baseDate.getTime() + days * 86400000);
        setForm((p) => ({ ...p, validity: validDate.toISOString().slice(0, 10) }));
    };

    // Auto increment version
    const bumpVersion = () => {
        const curr = form.version || 'v1.0';
        const match = curr.match(/v(\d+)\.(\d+)/i);
        if (match) {
            const major = match[1];
            const minor = parseInt(match[2], 10) + 1;
            setForm((p) => ({ ...p, version: `v${major}.${minor}` }));
        } else {
            setForm((p) => ({ ...p, version: 'v1.1' }));
        }
    };

    // Auto generate quotation number
    const generateQuotationNo = () => {
        const seq = Math.floor(1000 + Math.random() * 9000);
        setForm((p) => ({ ...p, no: `QT-${new Date().getFullYear()}-${item.code || 'LEAD'}-${seq}` }));
    };

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item._id || item.id, { quotation: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            },
        }
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError('');

        // Required validation: Quotation Due Date required once preparation begins
        if (!form.dueDate) {
            setValidationError('Quotation Due Date is required once quotation preparation begins.');
            return;
        }

        const validFabrics = fabrics.filter((f) => f.fabric.trim() !== '');

        const payload = {
            dueDate: form.dueDate || undefined,
            no: form.no || undefined,
            version: form.version || undefined,
            date: form.date || undefined,
            finalQuotedValue: totals.finalQuotedValue,
            taxes: Number(form.taxes),
            addSubtotal: form.addSubtotal === true || String(form.addSubtotal) === 'true',
            validity: form.validity || undefined,
            discountApprovalStatus: form.discountApprovalStatus,
            fabricSelection: JSON.stringify(validFabrics.length > 0 ? validFabrics : fabrics),
            cataloguePrice: form.cataloguePrice === '' ? 0 : Number(form.cataloguePrice),
            labourPrice: form.labourPrice === '' ? 0 : Number(form.labourPrice),
            samplePrice: form.samplePrice === '' ? 0 : Number(form.samplePrice),
            discount: Number(form.discount || 0),
            marginRules: form.marginRules || undefined,
            boqVersion: form.boqVersion || undefined,
            boq: q.boq || [],
        };

        execute(payload);
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={`Prepare & Edit Quotation — ${item.code || ''}`}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {(error || validationError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-md font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{validationError || error}</span>
                    </div>
                )}

                {/* Section 1: Primary System & Master Header Details */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>1. System Header & Configuration</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">* Required once quotation preparation begins</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <Field label="Quotation Due Date *">
                            <Input
                                type="date"
                                value={form.dueDate}
                                onChange={set('dueDate')}
                                required
                                className="border-amber-500/40 focus:border-amber-500"
                            />
                        </Field>

                        <Field label="Quotation No. (System ID)">
                            <div className="relative flex items-center">
                                <Input value={form.no} onChange={set('no')} placeholder="System-generated ID" className="pr-8 font-mono text-xs font-bold" />
                                <button
                                    type="button"
                                    onClick={generateQuotationNo}
                                    className="absolute right-1.5 p-1 text-slate-400 hover:text-brand-600"
                                    title="Auto-generate sequential ID"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </Field>

                        <Field label="Quotation Version">
                            <div className="flex items-center gap-1">
                                <Input value={form.version} onChange={set('version')} className="font-mono text-xs font-bold" />
                                <Button type="button" size="sm" variant="outline" onClick={bumpVersion} title="Increment version revision" className="shrink-0 text-xs px-2">
                                    + Revise
                                </Button>
                            </div>
                        </Field>

                        <Field label="Quotation Date (Issued)">
                            <Input type="date" value={form.date} onChange={set('date')} />
                        </Field>
                    </div>
                </div>

                {/* Section 2: Pricing Breakdown & Taxes */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        2. Line Prices, Taxes & Calculated Values
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Catalogue Price (₹)">
                            <Input type="number" value={form.cataloguePrice} onChange={set('cataloguePrice')} placeholder="0.00" step="any" min="0" />
                        </Field>

                        <Field label="Labour Price (₹)">
                            <Input type="number" value={form.labourPrice} onChange={set('labourPrice')} placeholder="0.00" step="any" min="0" />
                        </Field>

                        <Field label="Sample Price (₹)">
                            <Input type="number" value={form.samplePrice} onChange={set('samplePrice')} placeholder="0.00" step="any" min="0" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <Field label="Discount (%)">
                            <div className="relative">
                                <Input type="number" value={form.discount} onChange={set('discount')} placeholder="0" step="any" min="0" max="100" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                            </div>
                        </Field>

                        <Field label="Taxes (Tax-Master GST Lookup)">
                            <Select value={form.taxes} onChange={set('taxes')}>
                                <option value="0">GST 0% (Exempt)</option>
                                <option value="5">GST 5% (Concessional)</option>
                                <option value="12">GST 12% (Standard Low)</option>
                                <option value="18">GST 18% (Standard)</option>
                                <option value="28">GST 28% (Luxury Rate)</option>
                            </Select>
                        </Field>

                        <Field label="Add Subtotal (Section Totals)">
                            <Select value={String(form.addSubtotal)} onChange={(e) => setForm((p) => ({ ...p, addSubtotal: e.target.value === 'true' }))}>
                                <option value="true">Yes (Show Subtotals)</option>
                                <option value="false">No (Hide Subtotals)</option>
                            </Select>
                        </Field>
                    </div>

                    {/* Calculated Summary Box */}
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                            <span className="text-slate-500">Gross Subtotal:</span> <strong className="text-slate-800 dark:text-slate-200">{currency(totals.subtotal)}</strong>
                        </div>
                        <div>
                            <span className="text-slate-500">Discount ({totals.discountPercent}%):</span> <strong className="text-amber-600">- {currency(totals.discountAmount)}</strong>
                        </div>
                        <div>
                            <span className="text-slate-500">Taxable Value:</span> <strong className="text-slate-800 dark:text-slate-200">{currency(totals.taxableAmount)}</strong>
                        </div>
                        <div>
                            <span className="text-slate-500">GST @ {totals.taxRate}%:</span> <strong className="text-purple-600">+ {currency(totals.taxAmount)}</strong>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded border border-emerald-500/30">
                            <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Final Quoted Value:</span>{' '}
                            <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm font-bold">{currency(totals.finalQuotedValue)}</strong>
                        </div>
                    </div>
                </div>

                {/* Section 3: Workflow, Validity & Margin Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            3. Validity & Discount Approval
                        </div>

                        <Field label="Quotation Validity (Date)">
                            <div className="space-y-1.5">
                                <Input type="date" value={form.validity} onChange={set('validity')} />
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400">Quick set:</span>
                                    {[15, 30, 45, 60].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => applyValidityDays(d)}
                                            className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 dark:bg-slate-800 hover:bg-brand-500 hover:text-white transition"
                                        >
                                            +{d} Days
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Field>

                        <Field label="Discount Approval Status">
                            <Select value={form.discountApprovalStatus} onChange={set('discountApprovalStatus')}>
                                <option value="NOT_REQUIRED">Not Required</option>
                                <option value="PENDING">Pending (Requires Approval)</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </Select>
                            {Number(form.discount || 0) > 10 && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" /> Discount &gt; 10% automatically triggers Pending Approval threshold.
                                </p>
                            )}
                        </Field>

                        <Field label="BOQ Linked Record & Version">
                            <Input value={form.boqVersion} onChange={set('boqVersion')} placeholder="e.g. BOQ-v1.2 (Approved)" />
                        </Field>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                            <span>4. System Margin Validation Rules</span>
                            {estimatedMarginPct !== null && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isMarginCompliant ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}`}>
                                    {isMarginCompliant ? 'POLICY COMPLIANT' : 'MARGIN VIOLATION'}
                                </span>
                            )}
                        </div>

                        {leadTotalCost > 0 ? (
                            <div className="p-2.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Estimated Lead Cost:</span>
                                    <span className="font-mono">{currency(leadTotalCost)}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span className="text-slate-500">Projected Margin %:</span>
                                    <span className={isMarginCompliant ? 'text-emerald-600' : 'text-rose-600'}>
                                        {estimatedMarginPct !== null ? `${estimatedMarginPct.toFixed(1)}%` : 'N/A'} (Min target: 20%)
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px]">
                                Costing data pending. Margin will validate against approved lead cost.
                            </div>
                        )}

                        <Field label="Margin Master Rule & Exception Notes">
                            <Textarea
                                value={form.marginRules}
                                onChange={set('marginRules')}
                                placeholder="Validation notes or margin exception justifications..."
                                rows={3}
                            />
                        </Field>
                    </div>
                </div>

                {/* Section 4: Repeatable Fabric Selection Lookup by Room / BOQ Line */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-brand-500" />
                            <span>Repeatable Fabric Selection (by Room / BOQ Line)</span>
                        </div>
                        <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addFabricRow}>
                            Add Room / Line
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {fabrics.map((row, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <Input
                                    value={row.room}
                                    onChange={(e) => updateFabricRow(idx, 'room', e.target.value)}
                                    placeholder="Room / Area (e.g. Master Bedroom)"
                                    className="w-1/3 text-xs"
                                />
                                <Input
                                    value={row.fabric}
                                    onChange={(e) => updateFabricRow(idx, 'fabric', e.target.value)}
                                    placeholder="Fabric Code / Details (e.g. Velvet Ocean Blue #402)"
                                    className="flex-1 text-xs"
                                />
                                {fabrics.length > 1 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        icon={Trash2}
                                        onClick={() => removeFabricRow(idx)}
                                        className="text-rose-500 hover:text-rose-700"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>

                    <Button type="submit" loading={pending} icon={Check}>
                        Save Quotation Details
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's11', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's11';
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
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View Lead Details" />
                                        <Button size="sm" variant="ghost" icon={Edit2} onClick={(e) => { e.stopPropagation(); onEdit && onEdit(lead); }} title="Edit Quotation Details" />
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

const QuotationPreparation = ({ items: itemsProp = [] }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch quotation data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's11';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=quotation`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const approvedLeads = rawLeads.filter((lead) => {
        const status = String(lead.costing?.hiteshApprovalStatus || lead.hiteshApprovalStatus || '').toUpperCase();
        return status === 'APPROVED';
    });

    const filteredLeads = approvedLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const quotNo = String(lead.quotation?.no || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !quotNo.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = approvedLeads.length;
    const quotationsIssued = approvedLeads.filter((l) => Boolean(l.quotation?.no || l.quotation?.finalQuotedValue)).length;
    const totalQuotedValue = approvedLeads.reduce((acc, l) => {
        const q = l.quotation || {};
        const val = q.finalQuotedValue ?? calculateQuotationTotals(q).finalQuotedValue;
        return acc + Number(val || 0);
    }, 0);
    const discountsApproved = approvedLeads.filter((l) => l.quotation?.discountApprovalStatus === 'APPROVED').length;

    return (
        <div>
            <PageHeader
                title="Quotation Preparation & Management"
                subtitle="Prepare formal client quotations, track quotation numbers & versions, taxes, sub-totals, discounts, and validity periods"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Quotation Pipeline" value={totalCount} sub="Leads with Hitesh-approved pricing" icon={FileSpreadsheet} tone="emerald" />
                <StatTile label="Quotations Issued" value={quotationsIssued} sub="Quotes generated" icon={CheckCircle2} tone="green" />
                <StatTile label="Total Quoted Value" value={currency(totalQuotedValue, { compact: true })} sub="Cumulative quote value" icon={DollarSign} tone="blue" />
                <StatTile label="Approved Discounts" value={discountsApproved} sub="Discount approvals granted" icon={Calendar} tone="amber" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, quotation no..."
                            className="pl-9"
                        />
                    </div>

                    {(search || selectedSection !== 's11') && (
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
                    <Loading text="Loading Quotation Details..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={FileSpreadsheet} title="No Approved Quotation Records Found" hint="Only leads with Hitesh-approved pricing appear here. Try adjusting search parameters or approving pricing in Pricing & Costing." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's11')}
                />
            )}

            {editingLead && (
                <EditQuotationModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default QuotationPreparation;
