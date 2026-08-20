import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, FileSpreadsheet, Calendar, CheckCircle2, Paperclip, DollarSign, Edit2 } from 'lucide-react';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's11',
        title: ' Quotation',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
        cols: [
            { key: 'quotation.dueDate', label: 'Quotation Due Date' },
            { key: 'quotation.no', label: 'Quotation No.' },
            { key: 'quotation.version', label: 'Quotation Version' },
            { key: 'quotation.date', label: 'Quotation Date' },
            { key: 'quotation.finalQuotedValue', label: 'Final Quoted Value' },
            { key: 'quotation.taxes', label: 'Taxes' },
            { key: 'quotation.addSubtotal', label: 'Add Subtotal' },
            { key: 'quotation.validity', label: 'Quotation Validity' },
            { key: 'quotation.discountApprovalStatus', label: 'Discount Approval Status' },
            { key: 'quotation.boq', label: 'BOQ Attachment' },
            { key: 'quotation.fabricSelection', label: 'Fabric Selection' },
            { key: 'quotation.cataloguePrice', label: 'Catalogue Price' },
            { key: 'quotation.labourPrice', label: 'Labour Price' },
            { key: 'quotation.samplePrice', label: 'Sample Price' },
            { key: 'quotation.discount', label: 'Discount' },
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
    'quotation.discountApprovalStatus': (lead) => {
        const st = lead.quotation?.discountApprovalStatus || 'NOT_REQUIRED';
        const tone = st === 'APPROVED' ? 'emerald' : st === 'PENDING' ? 'amber' : 'slate';
        return <Badge tone={tone}>{st}</Badge>;
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
const EditQuotationModal = ({ item, onClose, onDone }) => {
    const q = item?.quotation || {};

    const [form, setForm] = useState({
        dueDate: q.dueDate ? String(q.dueDate).slice(0, 10) : '',
        no: q.no || '',
        version: q.version || 'v1.0',
        date: q.date ? String(q.date).slice(0, 10) : '',
        finalQuotedValue: q.finalQuotedValue ?? '',
        taxes: q.taxes ?? '',
        addSubtotal: q.addSubtotal ?? '',
        validity: q.validity || '',
        discountApprovalStatus: q.discountApprovalStatus || 'NOT_REQUIRED',
        fabricSelection: q.fabricSelection || '',
        cataloguePrice: q.cataloguePrice ?? '',
        labourPrice: q.labourPrice ?? '',
        samplePrice: q.samplePrice ?? '',
        discount: q.discount ?? '',
        marginRules: q.marginRules || '',
    });

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

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
        const payload = {
            dueDate: form.dueDate || undefined,
            no: form.no || undefined,
            version: form.version || undefined,
            date: form.date || undefined,
            finalQuotedValue: form.finalQuotedValue === '' ? undefined : Number(form.finalQuotedValue),
            taxes: form.taxes === '' ? undefined : Number(form.taxes),
            addSubtotal: form.addSubtotal === '' ? undefined : Number(form.addSubtotal),
            validity: form.validity || undefined,
            discountApprovalStatus: form.discountApprovalStatus,
            fabricSelection: form.fabricSelection || undefined,
            cataloguePrice: form.cataloguePrice === '' ? undefined : Number(form.cataloguePrice),
            labourPrice: form.labourPrice === '' ? undefined : Number(form.labourPrice),
            samplePrice: form.samplePrice === '' ? undefined : Number(form.samplePrice),
            discount: form.discount === '' ? undefined : Number(form.discount),
            marginRules: form.marginRules || undefined,
            boq: q.boq || [],
        };
        execute(payload);
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={`Edit Quotation Details — ${item.code || ''}`}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-md">{error}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Quotation Due Date">
                        <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>

                    <Field label="Quotation No.">
                        <Input value={form.no} onChange={set('no')} placeholder="e.g. Q-2026-001" />
                    </Field>

                    <Field label="Quotation Version">
                        <Input value={form.version} onChange={set('version')} placeholder="e.g. v1.0" />
                    </Field>

                    <Field label="Quotation Date">
                        <Input type="date" value={form.date} onChange={set('date')} />
                    </Field>

                    <Field label="Final Quoted Value (₹)">
                        <Input type="number" value={form.finalQuotedValue} onChange={set('finalQuotedValue')} placeholder="0.00" step="any" />
                    </Field>

                    <Field label="Taxes (₹ / %)">
                        <Input type="number" value={form.taxes} onChange={set('taxes')} placeholder="0.00" step="any" />
                    </Field>

                    <Field label="Add Subtotal (₹)">
                        <Input type="number" value={form.addSubtotal} onChange={set('addSubtotal')} placeholder="0.00" step="any" />
                    </Field>

                    <Field label="Quotation Validity">
                        <Input value={form.validity} onChange={set('validity')} placeholder="e.g. 30 Days" />
                    </Field>

                    <Field label="Discount Approval Status">
                        <Select value={form.discountApprovalStatus} onChange={set('discountApprovalStatus')}>
                            <option value="NOT_REQUIRED">Not Required</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </Select>
                    </Field>

                    <Field label="Fabric Selection">
                        <Input value={form.fabricSelection} onChange={set('fabricSelection')} placeholder="Fabric details/code" />
                    </Field>

                    <Field label="Catalogue Price (₹)">
                        <Input type="number" value={form.cataloguePrice} onChange={set('cataloguePrice')} placeholder="0.00" step="any" />
                    </Field>

                    <Field label="Labour Price (₹)">
                        <Input type="number" value={form.labourPrice} onChange={set('labourPrice')} placeholder="0.00" step="any" />
                    </Field>

                    <Field label="Sample Price (₹)">
                        <Input type="number" value={form.samplePrice} onChange={set('samplePrice')} placeholder="0.00" step="any" />
                    </Field>

                    <Field label="Discount (₹ / %)">
                        <Input type="number" value={form.discount} onChange={set('discount')} placeholder="0" step="any" />
                    </Field>

                    <Field label="Margin Rules" className="sm:col-span-2 md:col-span-3">
                        <Textarea value={form.marginRules} onChange={set('marginRules')} placeholder="Enter margin rules or pricing notes..." rows={2} />
                    </Field>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>

                    <Button type="submit" loading={pending}>
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
    const totalQuotedValue = approvedLeads.reduce((acc, l) => acc + Number(l.quotation?.finalQuotedValue || 0), 0);
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

