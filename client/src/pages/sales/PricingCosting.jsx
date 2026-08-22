import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search,
    Eye,
    Calculator,
    Calendar,
    CheckCircle2,
    Paperclip,
    DollarSign,
    Pencil,
    ShieldAlert,
    ShieldCheck,
    History,
    Plus,
    Trash2,
    Layers
} from 'lucide-react';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const APPROVED_MARGIN_MODELS = [
    { value: 'Standard Margin', label: 'Standard Margin (25% - 35% Target)' },
    { value: 'Cost Plus', label: 'Cost Plus Fixed Fee Model' },
    { value: 'Target Margin', label: 'Target Return / Value-Based Margin' },
    { value: 'Volume Discount', label: 'Volume Discount / Bulk Project Pricing' },
    { value: 'High Margin Luxury', label: 'High-Margin Luxury (40%+ Target)' },
    { value: 'Custom Pricing', label: 'Custom Commercial Pricing Model' },
];

const SPREADSHEET_SECTIONS = [
    {
        id: 's10',
        title: 'Material & Labor Costing Overview',
        color: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700/80',
        cols: [
            { key: 'costing.dueDate', label: 'Pricing Due Date', type: 'date' },
            { key: 'costing.catalogueCost', label: 'Catalogue Cost (₹)', type: 'currency' },
            { key: 'costing.version', label: 'Costing Version / Revision', type: 'version' },
            { key: 'costing.landedCost', label: 'Landed Cost (₹)', type: 'currency' },
            { key: 'costing.localFabricCost', label: 'Local Fabric Cost (₹)', type: 'currency' },
            { key: 'costing.labourCost', label: 'Labour / Custom Cost (₹)', type: 'currency' },
            { key: 'costing.totalCost', label: 'Total Cost (₹)', type: 'calculated_currency' },
            { key: 'costing.calculatedMargin', label: 'Calculated Margin %', type: 'formula_percent' },
            { key: 'costing.sampleCost', label: 'Sample Cost (₹)', type: 'currency' },
            { key: 'costing.marginModel', label: 'Margin Model', type: 'lookup' },
            { key: 'costing.hiteshApprovalStatus', label: 'Hitesh Approval Status', type: 'status' },
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
    'costing.dueDate': (lead) => {
        const raw = lead.costing?.dueDate;
        if (!raw) return <span className="text-slate-400 dark:text-slate-600 italic">Not set</span>;

        const d = new Date(raw);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDue = d < today && !lead.costing?.totalCost;

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
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
    'costing.totalCost': (lead) => {
        const total = getNestedVal(lead, 'costing.totalCost');
        if (!total && total !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-col items-center">
                <span className="font-mono text-slate-900 dark:text-slate-100 text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    {currency(total)}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-sans">Sum of all costs</span>
            </div>
        );
    },
    'costing.calculatedMargin': (lead) => {
        const margin = getNestedVal(lead, 'costing.calculatedMargin');
        if (margin === undefined || margin === null) return <span className="text-slate-400 dark:text-slate-600 italic">Auto-calculated</span>;

        const num = Number(margin);
        const minThresh = lead.costing?.minMarginThreshold ?? 25;
        const isHealthy = num >= minThresh;

        return (
            <div className="flex flex-col items-center gap-0.5">
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                    isHealthy
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                }`}>
                    {num.toFixed(1)}%
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Formula Margin</span>
            </div>
        );
    },
    'costing.marginModel': (lead) => {
        const model = lead.costing?.marginModel || 'Standard Margin';
        return (
            <span className="text-slate-700 dark:text-slate-300 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded truncate max-w-[140px] inline-block" title={model}>
                {model}
            </span>
        );
    },
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
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">⚠️ Needs Sign-off</span>
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

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'lineItems' | 'history'

    const initialSellingPrice = Number(q.finalQuotedValue || item?.token?.budgetEstimate || 0);

    const [form, setForm] = useState({
        dueDate: c.dueDate ? String(c.dueDate).slice(0, 10) : getLocalDate(),
        version: c.version || 'v1.0',
        catalogueCost: c.catalogueCost ?? '',
        landedCost: c.landedCost ?? '',
        localFabricCost: c.localFabricCost ?? '',
        labourCost: c.labourCost ?? '',
        sampleCost: c.sampleCost ?? '',
        totalCost: c.totalCost ?? '',
        sellingPrice: initialSellingPrice || '',
        calculatedMargin: c.calculatedMargin ?? '',
        marginModel: c.marginModel || 'Standard Margin',
        minMarginThreshold: c.minMarginThreshold ?? 25,
        maxDiscountThreshold: c.maxDiscountThreshold ?? 15,
        discount: q.discount ?? 0,
        hiteshApprovalStatus: c.hiteshApprovalStatus || 'NOT_REQUIRED',
        hiteshApprovalNotes: c.hiteshApprovalNotes || '',
        revisionNote: '',
    });

    const [lineItems, setLineItems] = useState(
        Array.isArray(c.lineItems) && c.lineItems.length > 0
            ? c.lineItems
            : [{ description: 'Main Fabric & Materials', quantity: 1, catalogueCost: c.catalogueCost || '', landedCost: c.landedCost || '', localFabricCost: c.localFabricCost || '', labourCost: c.labourCost || '' }]
    );

    const history = Array.isArray(c.costingHistory) ? c.costingHistory : [];

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

    // Auto-calculate sum of costs per line items if line item tab is used
    const lineItemCatalogueSum = lineItems.reduce((sum, item) => sum + (Number(item.catalogueCost) || 0), 0);
    const lineItemLandedSum = lineItems.reduce((sum, item) => sum + (Number(item.landedCost) || 0), 0);
    const lineItemLocalFabricSum = lineItems.reduce((sum, item) => sum + (Number(item.localFabricCost) || 0), 0);
    const lineItemLabourSum = lineItems.reduce((sum, item) => sum + (Number(item.labourCost) || 0), 0);

    // Apply line item sums if line item inputs are filled
    const effectiveCatalogueCost = lineItemCatalogueSum > 0 ? lineItemCatalogueSum : (Number(form.catalogueCost) || 0);
    const effectiveLandedCost = lineItemLandedSum > 0 ? lineItemLandedSum : (Number(form.landedCost) || 0);
    const effectiveLocalFabricCost = lineItemLocalFabricSum > 0 ? lineItemLocalFabricSum : (Number(form.localFabricCost) || 0);
    const effectiveLabourCost = lineItemLabourSum > 0 ? lineItemLabourSum : (Number(form.labourCost) || 0);
    const effectiveSampleCost = Number(form.sampleCost) || 0;

    // Total Cost = Sum of material, labour and related costs
    const calculatedSumTotalCost = effectiveCatalogueCost + effectiveLandedCost + effectiveLocalFabricCost + effectiveLabourCost + effectiveSampleCost;

    // Formula Percentage Calculation for Margin % = ((Selling Price - Total Cost) / Selling Price) * 100
    const sellingPriceVal = Number(form.sellingPrice) || initialSellingPrice;
    let formulaMarginPercent = undefined;
    if (sellingPriceVal > 0 && calculatedSumTotalCost > 0) {
        const m = ((sellingPriceVal - calculatedSumTotalCost) / sellingPriceVal) * 100;
        formulaMarginPercent = Math.round(m * 10) / 10;
    }
    const currentMargin = form.calculatedMargin !== '' ? Number(form.calculatedMargin) : formulaMarginPercent;

    // Threshold logic check:
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

    const handleAddLineItem = () => {
        setLineItems((prev) => [
            ...prev,
            { description: '', quantity: 1, catalogueCost: '', landedCost: '', localFabricCost: '', labourCost: '' }
        ]);
    };

    const handleRemoveLineItem = (index) => {
        setLineItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleLineItemChange = (index, field, value) => {
        setLineItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleIncrementVersion = () => {
        const currentVer = form.version || 'v1.0';
        const match = currentVer.match(/v?(\d+)\.(\d+)/);
        let nextVer = 'v1.1';
        if (match) {
            const major = parseInt(match[1], 10);
            const minor = parseInt(match[2], 10) + 1;
            nextVer = `v${major}.${minor}`;
        }
        setForm((prev) => ({
            ...prev,
            version: nextVer,
            revisionNote: `Version incremented to ${nextVer}`,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Create snapshot for history retention
        const currentSnapshot = {
            version: form.version || 'v1.0',
            dueDate: form.dueDate || undefined,
            catalogueCost: effectiveCatalogueCost,
            landedCost: effectiveLandedCost,
            localFabricCost: effectiveLocalFabricCost,
            labourCost: effectiveLabourCost,
            sampleCost: effectiveSampleCost,
            totalCost: calculatedSumTotalCost,
            sellingPrice: sellingPriceVal,
            calculatedMargin: currentMargin,
            marginModel: form.marginModel,
            savedAt: new Date(),
            notes: form.revisionNote || 'Costing updated',
        };

        const updatedHistory = [...history, currentSnapshot];

        const payload = {
            dueDate: form.dueDate || undefined,
            version: form.version || 'v1.0',
            catalogueCost: effectiveCatalogueCost,
            landedCost: effectiveLandedCost,
            localFabricCost: effectiveLocalFabricCost,
            labourCost: effectiveLabourCost,
            sampleCost: effectiveSampleCost,
            totalCost: calculatedSumTotalCost,
            calculatedMargin: currentMargin,
            marginModel: form.marginModel,
            minMarginThreshold: minMarginThresh,
            maxDiscountThreshold: maxDiscThresh,
            hiteshApprovalRequired: requiresHiteshApproval,
            hiteshApprovalStatus: requiresHiteshApproval
                ? (form.hiteshApprovalStatus === 'NOT_REQUIRED' ? 'PENDING' : form.hiteshApprovalStatus)
                : form.hiteshApprovalStatus,
            hiteshApprovalNotes: form.hiteshApprovalNotes || undefined,
            lineItems: lineItems.map((li) => ({
                description: li.description,
                quantity: Number(li.quantity) || 1,
                catalogueCost: Number(li.catalogueCost) || 0,
                landedCost: Number(li.landedCost) || 0,
                localFabricCost: Number(li.localFabricCost) || 0,
                labourCost: Number(li.labourCost) || 0,
                totalCost: (Number(li.catalogueCost) || 0) + (Number(li.landedCost) || 0) + (Number(li.localFabricCost) || 0) + (Number(li.labourCost) || 0),
            })),
            costingHistory: updatedHistory,
        };

        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Pricing & Material Costing — ${item?.clientName || item?.code}`}
            subtitle="Configure catalogue, landed, fabric, and labour costs with real-time formula margins and version history retention."
            size="xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={Plus}
                            onClick={handleIncrementVersion}
                            title="Auto-generate next revision version string"
                        >
                            Increment Version ({form.version})
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={pending}>Save Costing & Retain Version</Button>
                    </div>
                </div>
            }
        >
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4 gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
                        activeTab === 'overview'
                            ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    Costing Parameters & Margins
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('lineItems')}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                        activeTab === 'lineItems'
                            ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" /> Line-Item Cost Breakdown ({lineItems.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                        activeTab === 'history'
                            ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <History className="w-3.5 h-3.5" /> Retained Version History ({history.length})
                </button>
            </div>

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
                                {isBelowMargin && `Calculated Margin (${currentMargin}%) is below minimum threshold of ${minMarginThresh}%. `}
                                {isAboveDiscount && `Discount (${currentDiscount}%) exceeds maximum threshold of ${maxDiscThresh}%. `}
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

                {activeTab === 'overview' && (
                    <>
                        {/* Live Calculated Summary Header */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Calculated Cost</span>
                                <span className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {currency(calculatedSumTotalCost)}
                                </span>
                                <span className="text-[10px] text-slate-400">Sum of material, labour & sample</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Selling / Quoted Value</span>
                                <span className="text-lg font-mono font-bold text-brand-600 dark:text-brand-400">
                                    {sellingPriceVal > 0 ? currency(sellingPriceVal) : 'Not specified'}
                                </span>
                                <span className="text-[10px] text-slate-400">Base for margin formula</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Formula Calculated Margin</span>
                                <span className={`text-lg font-mono font-bold ${
                                    formulaMarginPercent !== undefined && formulaMarginPercent >= minMarginThresh
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                    {formulaMarginPercent !== undefined ? `${formulaMarginPercent}%` : 'N/A'}
                                </span>
                                <span className="text-[10px] text-slate-400">Formula: ((Quoted - Cost) / Quoted)*100</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Pricing Due Date" hint="Due date for completing costing">
                                <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                            </Field>

                            <Field label="Costing Version / Revision" hint="System-generated version tag">
                                <div className="flex gap-2">
                                    <Input placeholder="e.g. v1.0, v1.1" value={form.version} onChange={set('version')} />
                                    <Button type="button" variant="secondary" size="sm" onClick={handleIncrementVersion}>+ Rev</Button>
                                </div>
                            </Field>

                            <Field label="Catalogue Cost (₹)" hint="Numeric value in ₹ (material base)">
                                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.catalogueCost} onChange={set('catalogueCost')} />
                            </Field>

                            <Field label="Landed Cost (₹)" hint="Numeric value in ₹ (freight, duties)">
                                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.landedCost} onChange={set('landedCost')} />
                            </Field>

                            <Field label="Local Fabric Cost (₹)" hint="Numeric value in ₹ (local fabric additions)">
                                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.localFabricCost} onChange={set('localFabricCost')} />
                            </Field>

                            <Field label="Labour Cost / Custom Cost (₹)" hint="Numeric value in ₹ (stitching, custom tailoring)">
                                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.labourCost} onChange={set('labourCost')} />
                            </Field>

                            <Field label="Sample Cost (₹)" hint="Numeric value in ₹ (sampling expense)">
                                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.sampleCost} onChange={set('sampleCost')} />
                            </Field>

                            <Field label="Total Cost (₹)" hint={`Calculated Sum: ₹${calculatedSumTotalCost.toLocaleString('en-IN')}`}>
                                <Input
                                    type="number"
                                    readOnly
                                    placeholder={String(calculatedSumTotalCost)}
                                    value={form.totalCost !== '' ? form.totalCost : calculatedSumTotalCost}
                                    onChange={set('totalCost')}
                                    className="bg-slate-100 dark:bg-slate-900 font-mono font-bold cursor-not-allowed"
                                />
                            </Field>

                            <Field label="Selling / Quoted Price (₹)" hint="Base price used to calculate margin %">
                                <Input type="number" min="0" placeholder="0.00" value={form.sellingPrice} onChange={set('sellingPrice')} />
                            </Field>

                            <Field label="Calculated Margin (%)" hint={formulaMarginPercent !== undefined ? `Formula Result: ${formulaMarginPercent}%` : "Calculated from cost & selling price"}>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder={formulaMarginPercent !== undefined ? String(formulaMarginPercent) : "35.0"}
                                    value={form.calculatedMargin}
                                    onChange={set('calculatedMargin')}
                                    className="font-mono font-semibold"
                                />
                            </Field>

                            <Field label="Margin Model" hint="Select from approved margin lookup models" className="sm:col-span-2">
                                <Select value={form.marginModel} onChange={set('marginModel')}>
                                    {APPROVED_MARGIN_MODELS.map((model) => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        {/* Threshold Rules & Hitesh Approval Settings */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                            <h4 className="text-xs font-semibold uppercase text-brand-600 dark:text-brand-400 mb-3 tracking-wider flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5" /> Approval Threshold Controls
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Min Margin Threshold (%)" hint="Trigger Hitesh sign-off below this margin">
                                    <Input type="number" step="1" value={form.minMarginThreshold} onChange={set('minMarginThreshold')} />
                                </Field>

                                <Field label="Max Discount Threshold (%)" hint="Trigger Hitesh sign-off above this discount">
                                    <Input type="number" step="1" value={form.maxDiscountThreshold} onChange={set('maxDiscountThreshold')} />
                                </Field>

                                <Field label="Hitesh Approval Status">
                                    <Select value={form.hiteshApprovalStatus} onChange={set('hiteshApprovalStatus')}>
                                        <option value="NOT_REQUIRED">NOT REQUIRED</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="APPROVED">APPROVED</option>
                                        <option value="REJECTED">REJECTED</option>
                                    </Select>
                                </Field>

                                <Field label="Revision Log Note" hint="Note retained in version history">
                                    <Input placeholder="Reason for this costing update..." value={form.revisionNote} onChange={set('revisionNote')} />
                                </Field>
                            </div>

                            <div className="mt-3">
                                <Field label="Hitesh Approval Notes / Overriding Justification">
                                    <Textarea
                                        rows={2}
                                        placeholder="Enter justification notes if submitting for Hitesh approval..."
                                        value={form.hiteshApprovalNotes}
                                        onChange={set('hiteshApprovalNotes')}
                                    />
                                </Field>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'lineItems' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Per Line Item Cost Breakdown</h4>
                                <p className="text-[11px] text-slate-500">Break down catalogue, landed, fabric, and labour costs item-by-item.</p>
                            </div>
                            <Button type="button" size="sm" icon={Plus} onClick={handleAddLineItem}>
                                Add Item Row
                            </Button>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                        <th className="p-2">Item Description</th>
                                        <th className="p-2 w-20">Qty</th>
                                        <th className="p-2 w-28">Catalogue (₹)</th>
                                        <th className="p-2 w-28">Landed (₹)</th>
                                        <th className="p-2 w-28">Local Fabric (₹)</th>
                                        <th className="p-2 w-28">Labour (₹)</th>
                                        <th className="p-2 w-28 text-right">Line Total</th>
                                        <th className="p-2 w-12 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {lineItems.map((itemRow, idx) => {
                                        const catVal = Number(itemRow.catalogueCost) || 0;
                                        const landVal = Number(itemRow.landedCost) || 0;
                                        const fabVal = Number(itemRow.localFabricCost) || 0;
                                        const labVal = Number(itemRow.labourCost) || 0;
                                        const lineSum = catVal + landVal + fabVal + labVal;

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="p-2">
                                                    <Input
                                                        size="sm"
                                                        placeholder="Fabric / Item Name"
                                                        value={itemRow.description}
                                                        onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        size="sm"
                                                        min="1"
                                                        value={itemRow.quantity}
                                                        onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        size="sm"
                                                        placeholder="0.00"
                                                        value={itemRow.catalogueCost}
                                                        onChange={(e) => handleLineItemChange(idx, 'catalogueCost', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        size="sm"
                                                        placeholder="0.00"
                                                        value={itemRow.landedCost}
                                                        onChange={(e) => handleLineItemChange(idx, 'landedCost', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        size="sm"
                                                        placeholder="0.00"
                                                        value={itemRow.localFabricCost}
                                                        onChange={(e) => handleLineItemChange(idx, 'localFabricCost', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        size="sm"
                                                        placeholder="0.00"
                                                        value={itemRow.labourCost}
                                                        onChange={(e) => handleLineItemChange(idx, 'labourCost', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                    {currency(lineSum)}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveLineItem(idx)}
                                                        className="text-slate-400 hover:text-rose-500 transition p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-100/70 dark:bg-slate-900/70 font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-300 dark:border-slate-700">
                                        <td colSpan="2" className="p-2 text-right">Aggregated Sums:</td>
                                        <td className="p-2 font-mono">{currency(lineItemCatalogueSum)}</td>
                                        <td className="p-2 font-mono">{currency(lineItemLandedSum)}</td>
                                        <td className="p-2 font-mono">{currency(lineItemLocalFabricSum)}</td>
                                        <td className="p-2 font-mono">{currency(lineItemLabourSum)}</td>
                                        <td className="p-2 font-mono text-right text-brand-600 dark:text-brand-400 font-bold">
                                            {currency(lineItemCatalogueSum + lineItemLandedSum + lineItemLocalFabricSum + lineItemLabourSum)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Retained Costing Version History</h4>
                                <p className="text-[11px] text-slate-500">System retains all past revisions and snapshots of costing details.</p>
                            </div>
                            <Badge tone="indigo">{history.length} Saved Version(s)</Badge>
                        </div>

                        {history.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                                <History className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">No previous versions retained yet.</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Subsequent updates will automatically save historical versions here.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                                {history.map((rev, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800">
                                                    {rev.version || `v1.${idx}`}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    {rev.savedAt ? date(rev.savedAt, { time: true }) : 'Previous Version'}
                                                </span>
                                            </div>
                                            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                Total: {currency(rev.totalCost || 0)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                                            <div>Catalogue: <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{currency(rev.catalogueCost || 0)}</span></div>
                                            <div>Landed: <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{currency(rev.landedCost || 0)}</span></div>
                                            <div>Local Fabric: <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{currency(rev.localFabricCost || 0)}</span></div>
                                            <div>Labour: <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{currency(rev.labourCost || 0)}</span></div>
                                        </div>
                                        {rev.notes && (
                                            <p className="text-[11px] italic text-slate-500">Note: "{rev.notes}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} title="View lead details" />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit costing parameters" />
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
            const model = String(lead.costing?.marginModel || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !model.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = tokenReceivedLeads.length;
    const costedCount = tokenReceivedLeads.filter((l) => Boolean(l.costing?.version || l.costing?.landedCost || l.costing?.totalCost)).length;
    const pendingCosting = tokenReceivedLeads.filter((l) => l.costing?.dueDate && !l.costing?.landedCost && !l.costing?.totalCost).length;
    const totalLandedCost = tokenReceivedLeads.reduce((acc, l) => acc + Number(getNestedVal(l, 'costing.totalCost') || 0), 0);

    return (
        <div>
            <PageHeader
                title="Pricing / Material Costing"
                subtitle="Evaluate catalogue costs, landed costs, local fabric & labour expenses, costing versions, formula margins, and margin models"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Costing Projects" value={totalCount} sub="Leads in costing stage" icon={Calculator} tone="slate" />
                <StatTile label="Costings Completed" value={costedCount} sub="Evaluated costing baseline" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Costings" value={pendingCosting} sub="Due for calculation" icon={Calendar} tone="amber" />
                <StatTile label="Total Evaluated Cost" value={currency(totalLandedCost, { compact: true })} sub="Cumulative cost baseline" icon={DollarSign} tone="blue" />
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

