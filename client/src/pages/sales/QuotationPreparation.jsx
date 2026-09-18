import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, FileSpreadsheet, Calendar, CheckCircle2, Paperclip,
    DollarSign, Edit2, ShieldCheck, AlertTriangle, Check
} from 'lucide-react';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Loading, ErrorState, EmptyState, StatTile, Modal, Field, DelayBadge, ViewSwitcher } from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import SalesStageCard from '../../components/cards/SalesStageCard';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';

import DetailedDrawer from '../../components/sales/DetailedDrawer';
import EditQuotationModal from "../../components/quotation/EditQuotationModal";
import { calculateQuotationTotals } from '../../utils/salesPipeline';

const SPREADSHEET_SECTIONS = [
    {
        id: 's11',
        title: 'Quotation Preparation & Master Fields',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
        // All fields : shown in DetailedDrawer
        cols: [
            { key: 'quotation.dueDate', label: 'Quotation Due Date' },
            { key: 'delayStatus', label: 'Delay / SLA Status' },
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
        ],
        // Subset shown in table : prevents horizontal scrolling
        tableCols: [
            { key: 'quotation.dueDate', label: 'Due Date' },
            { key: 'delayStatus', label: 'SLA Status' },
            { key: 'quotation.no', label: 'Quotation No.' },
            { key: 'quotation.finalQuotedValue', label: 'Final Value' },
            { key: 'quotation.discountApprovalStatus', label: 'Discount Approval' },
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
    delayStatus: (lead) => (
        <DelayBadge
            dueDate={lead.quotation?.dueDate}
            isCompleted={Boolean(['Approved', 'Completed', 'Sent', 'Issued'].includes(lead.quotation?.status) || lead.quotation?.date)}
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


const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's11', onSectionChange }) => {
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


    const approvedLeads = rawLeads
    // This comment is temperory 
    // .filter((lead) => {
    //     const status = String(lead.costing?.hiteshApprovalStatus || lead.hiteshApprovalStatus || '').toUpperCase();
    //     return status === 'APPROVED';
    // });

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

                    <ViewSwitcher view={viewMode} onViewChange={setViewMode} />

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
            ) : viewMode === 'cards' ? (
                <CardGridView
                    items={filteredLeads}
                    renderCard={(lead) => (
                        <SalesStageCard
                            lead={lead}
                            stageKey="quotation"
                            onView={handleViewLead}
                            onEdit={(l) => setEditingLead(l)}
                            onRowClick={(l) => setDrawerLead(l)}
                        />
                    )}
                    empty={
                        <Panel className="p-8 text-center">
                            <EmptyState icon={FileSpreadsheet} title="No Approved Quotation Records Found" hint="Only leads with Hitesh-approved pricing appear here." />
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

export default QuotationPreparation;

