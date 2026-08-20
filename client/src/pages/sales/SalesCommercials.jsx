import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Paperclip, Eye, Pencil, UserCheck, Building2, BadgeDollarSign, Sparkles, ClipboardList, Users } from 'lucide-react';
import { leadsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Loading, ErrorState, EmptyState, Tabs, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';


const BUDGET_CLASSIFICATIONS = [
    { value: 'ECONOMY', label: 'Economy (Under ₹15L)' },
    { value: 'MID_RANGE', label: 'Mid-Range (₹15L - ₹35L)' },
    { value: 'PREMIUM', label: 'Premium (₹35L - ₹75L)' },
    { value: 'LUXURY', label: 'Luxury (₹75L - ₹1.5Cr)' },
    { value: 'ULTRA_LUXURY', label: 'Ultra Luxury (₹1.5Cr+)' },
];

const BUDGET_TONES = {
    ECONOMY: 'slate',
    MID_RANGE: 'blue',
    PREMIUM: 'violet',
    LUXURY: 'amber',
    ULTRA_LUXURY: 'brand',
};

const LEAD_SOURCES = [
    { value: 'DCM', label: 'DCM' },
    { value: 'ARCHITECT', label: 'Architect' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'WALK_IN', label: 'Walk-In' },
    { value: 'WEBSITE', label: 'Website' },
    { value: 'EXHIBITION', label: 'Exhibition' },
    { value: 'SOCIAL', label: 'Social Media' },
    { value: 'DIRECT_VISIT', label: 'Direct Visit' },
    { value: 'DIRECT_CLIENT', label: 'Direct Client' },
    { value: 'EXISTING_CLIENT', label: 'Existing Client' },
    { value: 'OTHER', label: 'Other' },
];

const SPREADSHEET_SECTIONS = [
    {
        id: 's1',
        title: 'Lead & Contact Details (Mandatory Details)',
        color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/90 dark:text-purple-200 dark:border-purple-700/80',
        cols: [
            { key: 'sno', label: 'S.No.' },
            { key: 'code', label: 'Lead Code' },
            { key: 'clientName', label: 'Client Name' },
            { key: 'architectName', label: 'Architect/Designer Name' },
            { key: 'location', label: 'Location' },
            { key: 'siteVisitRequired', label: 'Site Visit Required' }
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
    budgetClassification: (lead) => {
        const val = lead.budgetClassification || 'MID_RANGE';
        return <Badge tone={BUDGET_TONES[val] || 'blue'}>{val}</Badge>;
    },
    priority: (lead) => {
        const p = lead.priority || 'MEDIUM';
        return <Badge tone={p === 'HIGH' ? 'rose' : p === 'MEDIUM' ? 'amber' : 'slate'}>{p}</Badge>;
    },
    siteVisitRequired: (lead) => (
        lead.siteVisitRequired ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>
    ),
    previousClientRelationship: (lead) => (
        lead.previousClientRelationship ? <Badge tone="violet">YES</Badge> : <Badge tone="slate">NO</Badge>
    ),
    architectInvolved: (lead) => {
        const val = lead.architectInvolved || (lead.architectInvolvedDetails ? 'YES' : 'NO');
        return <Badge tone={val === 'YES' || val === 'Yes' ? 'blue' : 'slate'}>{val}</Badge>;
    },
    architectName: (lead) => (
        <span className="truncate block max-w-[140px] text-slate-700 dark:text-slate-300" title={lead.architect?.name || lead.architectName}>
            {lead.architect?.name || lead.architectName || '—'}
        </span>
    ),
    existingRelationshipOwner: (lead) => (
        <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300">
            {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || lead.assignedDCM?.name || '—'}
        </span>
    ),
    assignedInstaller: (lead) => (
        <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300">{lead.assignedInstaller?.name || lead.assignedInstallerName || '—'}</span>
    ),
    'measurement.measuredBy': (lead) => (
        <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300">{lead.measurement?.measuredBy?.name || '—'}</span>
    ),
    'readySize.confirmedBy': (lead) => (
        <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300">{lead.readySize?.confirmedBy?.name || '—'}</span>
    ),
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
                <Paperclip className="w-3 h-3 shrink-0" /> {raw.length} file(s)
            </span>
        );
    }

    if (raw instanceof Date || (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw))) {
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">{date(raw, { time: String(raw).includes('T') })}</span>;
    }

    if (typeof raw === 'number') {
        const kLower = key.toLowerCase();
        if (kLower.includes('cost') || kLower.includes('budget') || kLower.includes('price') || kLower.includes('value') || kLower.includes('amount') || kLower.includes('taxes') || kLower.includes('subtotal') || kLower.includes('discount')) {
            return <span className="font-mono text-slate-900 dark:text-slate-200 text-xs font-semibold">{currency(raw)}</span>;
        }
        return <span className="font-mono text-slate-900 dark:text-slate-200 text-xs">{raw}</span>;
    }

    if (typeof raw === 'boolean') {
        return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
    }

    if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};

const SiteVisitModal = ({ lead, onClose, onSave }) => {
    const [dueDate, setDueDate] = useState(
        lead?.siteVisitDueDate ? new Date(lead.siteVisitDueDate).toISOString().slice(0, 10) : ''
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (lead) {
            setDueDate(lead.siteVisitDueDate ? new Date(lead.siteVisitDueDate).toISOString().slice(0, 10) : '');
            setError(null);
        }
    }, [lead]);

    if (!lead) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await leadsApi.update(lead.id || lead._id, {
                siteVisitDueDate: dueDate || undefined,
                siteVisitRequired: true
            });
            onSave();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Failed to update site visit due date');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(lead)}
            onClose={onClose}
            title={`Schedule Site Visit — ${lead.code || ''}`}
            subtitle={lead.clientName ? `Client: ${lead.clientName}` : ''}
            size="sm"
            footer={(
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" loading={saving} onClick={handleSubmit} type="button">Save Due Date</Button>
                </div>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        {error}
                    </div>
                )}
                <Field label="Site Visit Due Date" required hint="Select the target date for conducting the site visit">
                    <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                        className="w-full"
                    />
                </Field>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, onSiteVisit, selectedSection = 's1', onSectionChange }) => {

    const navigate = useNavigate();
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's1';
    const visibleSections = SPREADSHEET_SECTIONS.filter((s) => s.id === currentSection);

    return (
        <Panel className="overflow-hidden border border-slate-200 dark:border-slate-800">

            {/* Section Tabs Selector */}
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

            {/* Excel Sheet Matrix Table Container */}
            <div className="overflow-x-auto max-h-[55vh] overflow-y-auto select-none relative">
                <table className="w-full text-left border-collapse text-xs">


                    <thead>

                        {/* Header Row: Sub-Column Field Names */}
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
                                        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 text-xs" onClick={() => onSiteVisit && onSiteVisit(lead)}>Site Visit</Button>
                                     </div> 
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}


const SalesCommercials = ({ budgetFilter: budgetProp = "", resetFilters: resetProp = "", error: errorProp = "", items: itemsProp = [] }) => {

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(errorProp || null);
    const [editingLead, setEditingLead] = useState(null);
    const [siteVisitLead, setSiteVisitLead] = useState(null);

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch sales leads'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const budgetFilter = searchParams.get('budget') || budgetProp || 'ALL';
    const selectedSection = searchParams.get('section') || 's1';
    const viewMode = searchParams.get('view') || 'SPREADSHEET';
    const activeTab = searchParams.get('tab') || 'LEADS';

    const updateParam = (key, value, defaultValue) => {
        const newParams = new URLSearchParams(searchParams);
        if (!value || value === defaultValue) {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        setSearchParams(newParams);
    };

    const handleSearchChange = (val) => {
        updateParam('search', val, '');
    };

    const handleResetFilters = () => {
        setSearchParams({});
    };

    const handleViewLead = (lead) => {
        if (lead?.code) {
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=leads`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const filteredLeads = rawLeads.filter((lead) => {
        if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
            return false;
        }
        if (budgetFilter !== 'ALL' && lead.budgetClassification !== budgetFilter) {
            return false;
        }
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const phone = String(lead.phone || '').toLowerCase();
            const location = String(lead.location || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !phone.includes(q) && !location.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalLeadsCount = filteredLeads.length;
    const totalBudgetedValue = rawLeads.reduce((acc, l) => acc + (Number(l.budgetEstimate || l.estimatedBudget || 0)), 0);
    const luxuryLeadsCount = rawLeads.filter((l) => l.budgetClassification === 'LUXURY' || l.budgetClassification === 'ULTRA_LUXURY').length;
    const leadSourcesCount = new Set(rawLeads.map((l) => l.source).filter(Boolean)).size || LEAD_SOURCES.length;

    return (
        <div>
            <PageHeader title="Sales & Commercials Workspace" subtitle="End-to-end management of sales leads, budget classifications, relationship owners, and commercial quotes" />

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Sales Leads" value={totalLeadsCount} sub="In current view" icon={UserCheck} tone="blue" />
                <StatTile label="Pipeline Budget Value" value={currency(totalBudgetedValue, { compact: true })} sub="Cumulative indicative budget" icon={BadgeDollarSign} tone="green" />
                <StatTile label="Luxury / Premium Leads" value={luxuryLeadsCount} sub="Luxury & Ultra Luxury Segment" icon={Sparkles} tone="brand" />
                <StatTile label="Lead Sources" value={leadSourcesCount} sub="Active acquisition channels" icon={Building2} tone="violet" />
            </div>

            {/* Workspace Controls & Tabs */}
            <Panel className="mb-4">
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <Tabs syncQuery={true} active={activeTab} onChange={(t) => updateParam('tab', t, 'LEADS')}
                        tabs={[{ key: 'LEADS', label: 'Sales Leads Directory', count: rawLeads.length },]} />

                    <div className="flex items-center gap-2">

                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">

                            <button type="button" onClick={() => updateParam('view', 'SPREADSHEET', 'SPREADSHEET')}
                                className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${viewMode === 'SPREADSHEET' ? 'bg-brand-500 text-white dark:text-slate-950 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                <ClipboardList className="w-3.5 h-3.5" /> Sheet Matrix
                            </button>

                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search lead code, client name, phone or location..."
                            className="pl-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Status:</span>
                            <Select
                                value={statusFilter}
                                onChange={(e) => updateParam('status', e.target.value, 'ALL')}
                                options={[
                                    { value: 'ALL', label: 'All Statuses' },
                                    { value: 'NEW', label: 'New' },
                                    { value: 'CONTACTED', label: 'Contacted' },
                                    { value: 'QUALIFIED', label: 'Qualified' },
                                    { value: 'CONVERTED', label: 'Converted' },
                                    { value: 'LOST', label: 'Lost' },
                                ]}
                                className="w-36 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Budget:</span>
                            <Select
                                value={budgetFilter}
                                onChange={(e) => updateParam('budget', e.target.value, 'ALL')}
                                options={[
                                    { value: 'ALL', label: 'All Budget Tiers' },
                                    ...BUDGET_CLASSIFICATIONS,
                                ]}
                                className="w-44 text-xs"
                            />
                        </div>

                        {(statusFilter !== 'ALL' || budgetFilter !== 'ALL' || search || (selectedSection && selectedSection !== 's1')) && (
                            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                                Reset Filters
                            </Button>
                        )}
                    </div>
                </div>

            </Panel>


            {/* Main Content Area */}
            {loading ? (
                <Panel className="p-12 text-center">
                    <Loading text="Loading Sales & Commercials Sheet..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={Users} title="No Sales Leads Found" hint="Try adjusting search or status filters, or capture a new lead."
                        action={<Button icon={Plus} onClick={() => navigate('/crm/leads')} >Capture Sales Lead</Button>} />
                </Panel>
            ) : (
                <SpreadsheetGridView items={filteredLeads} onView={handleViewLead}
                    onEdit={(l) => setEditingLead(l)} onSiteVisit={(l) => setSiteVisitLead(l)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's1')} />
            )}

            <SiteVisitModal
                lead={siteVisitLead}
                onClose={() => setSiteVisitLead(null)}
                onSave={reload}
            />
        </div>
    );
}

export default SalesCommercials
