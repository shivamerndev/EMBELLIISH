import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, FileText, Calendar, CheckCircle2, Paperclip, Send, Pencil, Sparkles, ShieldCheck } from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, settingsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's8',
        title: 'Proposal',
        color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/90 dark:text-sky-200 dark:border-sky-700/80',
        cols: [
            { key: 'proposal.dueDate', label: 'Proposal Due Date' },
            { key: 'proposal.noVersion', label: 'Proposal No. / Version' },
            { key: 'proposal.date', label: 'Proposal Date' },
            { key: 'proposal.approvalStatus', label: 'Approval Status' },
            { key: 'proposal.approvedBy', label: 'Approved By' },
            { key: 'proposal.clientBrief', label: 'Client Brief' },
            { key: 'proposal.consumptionSheet', label: 'Consumption Sheet' },
            { key: 'proposal.designDirection', label: 'Design Direction' },
            { key: 'proposal.pricingRange', label: 'Pricing Range' },
            { key: 'proposal.terms', label: 'Terms' },
            { key: 'proposal.refundRevisionClause', label: 'Refund/Revision clause' },
        ]
    }
];

const DEFAULT_MASTER_TERMS = `1. Validity: Proposal pricing is valid for 15 days from issue date.
2. Payment Split: 10% token on order confirmation, 60% advance before production, 30% balance before site installation.
3. Custom Orders: Made-to-measure drapes & blinds cannot be cancelled once fabric cutting commences.
4. Measurements: Final dimensions confirmed via site measurement sign-off by Project Coordinator (PC) / Senior DCM.`;

const DEFAULT_MASTER_REFUND_CLAUSE = `1. Revision Policy: Up to 2 minor design & fabric revision rounds are included prior to BOQ freeze. Further revisions incur standard re-drafting fees.
2. Refund Policy: Token deposit is refundable within 7 days of payment prior to site measurement. Post-measurement or upon custom fabric procurement, advance is non-refundable.
3. Approval Requirement: All proposals require PC / Senior DCM review and Hitesh (Admin) approval sign-off.`;

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
    'proposal.approvalStatus': (lead) => {
        const st = lead.proposal?.approvalStatus || 'PENDING';
        switch (st) {
            case 'APPROVED':
                return <Badge tone="emerald">APPROVED</Badge>;
            case 'REVISION_REQUESTED':
                return <Badge tone="sky">REVISION REQ</Badge>;
            case 'REJECTED':
                return <Badge tone="rose">REJECTED</Badge>;
            default:
                return <Badge tone="amber">PENDING APPROVAL</Badge>;
        }
    },
    'proposal.approvedBy': (lead) => {
        const by = lead.proposal?.approvedBy || '—';
        return <span className="truncate block max-w-[140px] text-slate-700 dark:text-slate-300 font-medium" title={by}>{by}</span>;
    },
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

    if (typeof raw === 'boolean') {
        return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
    }

    if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's8', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's8';
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
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} title="View Details" />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit Proposal & Terms" />
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

const EditProposalModal = ({ item, onClose, onDone }) => {
    const prop = item?.proposal || {};

    const [form, setForm] = useState({
        dueDate: prop.dueDate ? String(prop.dueDate).slice(0, 10) : '',
        noVersion: prop.noVersion || '',
        date: prop.date ? String(prop.date).slice(0, 10) : '',
        clientBrief: prop.clientBrief || '',
        designDirection: prop.designDirection || '',
        pricingRange: prop.pricingRange || '',
        terms: prop.terms || '',
        refundRevisionClause: prop.refundRevisionClause || '',
        approvalStatus: prop.approvalStatus || 'PENDING',
        approvedBy: prop.approvedBy || 'Hitesh / Senior DCM',
    });

    const [loadingMasters, setLoadingMasters] = useState(false);
    const [masterTerms, setMasterTerms] = useState(DEFAULT_MASTER_TERMS);
    const [masterRefundClause, setMasterRefundClause] = useState(DEFAULT_MASTER_REFUND_CLAUSE);

    useEffect(() => {
        setLoadingMasters(true);
        settingsApi.get()
            .then((res) => {
                const comp = res?.data?.company || {};
                if (comp.termsAndConditions) {
                    setMasterTerms(comp.termsAndConditions);
                }
                if (comp.refundRevisionClause) {
                    setMasterRefundClause(comp.refundRevisionClause);
                }

                // If lead proposal terms / refund clause are empty, auto-fill from approved masters!
                setForm((prev) => ({
                    ...prev,
                    terms: prev.terms || comp.termsAndConditions || DEFAULT_MASTER_TERMS,
                    refundRevisionClause: prev.refundRevisionClause || comp.refundRevisionClause || DEFAULT_MASTER_REFUND_CLAUSE,
                }));
            })
            .catch(() => {
                setForm((prev) => ({
                    ...prev,
                    terms: prev.terms || DEFAULT_MASTER_TERMS,
                    refundRevisionClause: prev.refundRevisionClause || DEFAULT_MASTER_REFUND_CLAUSE,
                }));
            })
            .finally(() => setLoadingMasters(false));
    }, []);

    const handlePullMasters = () => {
        setForm((prev) => ({
            ...prev,
            terms: masterTerms,
            refundRevisionClause: masterRefundClause,
        }));
    };

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item._id || item.id, { proposal: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            },
        }
    );

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Edit Proposal & Commercial Terms — ${item?.clientName || item?.code}`}
            subtitle="Draft proposal details, set approval status (PC + Senior DCM; Hitesh), and pull standard terms from approved masters."
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        icon={Send}
                        loading={pending}
                        onClick={() => execute(form)}
                    >
                        Save Proposal
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {error && <p className="text-xs text-rose-400">{error.message}</p>}

                <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Approved Masters Integration</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">Pull standard terms and refund/revision policies automatically from approved company masters.</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={Sparkles}
                        loading={loadingMasters}
                        onClick={handlePullMasters}
                        className="text-xs"
                    >
                        Auto-Fill from Approved Masters
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Proposal Due Date">
                        <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>
                    <Field label="Proposal No. / Version" hint="e.g. PROP-2026-v1.0">
                        <Input value={form.noVersion} onChange={set('noVersion')} placeholder="e.g. PROP-2026-v1.0" />
                    </Field>
                    <Field label="Proposal Date">
                        <Input type="date" value={form.date} onChange={set('date')} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Approval Status (PC / Sr DCM / Hitesh)">
                        <Select
                            value={form.approvalStatus}
                            onChange={set('approvalStatus')}
                            options={[
                                { value: 'PENDING', label: 'Pending Approval' },
                                { value: 'APPROVED', label: 'Approved (PC / Senior DCM / Hitesh)' },
                                { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
                                { value: 'REJECTED', label: 'Rejected' },
                            ]}
                        />
                    </Field>
                    <Field label="Approved By (Approver Name / Role)">
                        <Input value={form.approvedBy} onChange={set('approvedBy')} placeholder="e.g. Hitesh Sharma / Senior DCM" />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Design Direction">
                        <Input value={form.designDirection} onChange={set('designDirection')} placeholder="e.g. Modern Minimalist Sheers with Motorized Tracks" />
                    </Field>
                    <Field label="Indicative Pricing Range">
                        <Input value={form.pricingRange} onChange={set('pricingRange')} placeholder="e.g. ₹2.5L - ₹3.5L" />
                    </Field>
                </div>

                <Field label="Client Brief / Notes">
                    <Textarea rows={2} value={form.clientBrief} onChange={set('clientBrief')} placeholder="Enter key client requirements and preferences..." />
                </Field>

                <Field label="Standard Terms (Pulled from Approved Masters)" hint="Appears on proposal document footer">
                    <Textarea rows={4} value={form.terms} onChange={set('terms')} placeholder="Standard terms..." />
                </Field>

                <Field label="Refund / Revision Clause (Pulled from Approved Masters)" hint="Appears on proposal document footer">
                    <Textarea rows={4} value={form.refundRevisionClause} onChange={set('refundRevisionClause')} placeholder="Refund and revision terms..." />
                </Field>
            </div>
        </Modal>
    );
};

const ProposalCreation = ({ items: itemsProp = [] }) => {
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
            .catch((err) => setError(err?.message || 'Failed to fetch proposal data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's8';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=proposal`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const consumptionReadyLeads = rawLeads.filter((lead) =>
        Boolean(
            lead.consumption?.boqVersion ||
            lead.consumption?.boqPreparedDate ||
            lead.consumption?.quantity ||
            lead.consumption?.fabricDesignSelection ||
            lead.consumption?.measurements ||
            (Array.isArray(lead.proposal?.consumptionSheet) && lead.proposal.consumptionSheet.length > 0)
        )
    );

    const filteredLeads = consumptionReadyLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const propNo = String(lead.proposal?.noVersion || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !propNo.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = consumptionReadyLeads.length;
    const generatedProposals = consumptionReadyLeads.filter((l) => Boolean(l.proposal?.noVersion || l.proposal?.date)).length;
    const approvedProposals = consumptionReadyLeads.filter((l) => l.proposal?.approvalStatus === 'APPROVED').length;
    const termsDefined = consumptionReadyLeads.filter((l) => Boolean(l.proposal?.terms && l.proposal?.refundRevisionClause)).length;

    return (
        <div>
            <PageHeader
                title="Proposal Creation & Management"
                subtitle="Draft, version, and manage commercial proposals, client briefs, design direction, terms, and refund clauses with Hitesh / PC / Senior DCM sign-off"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Proposal Pipeline" value={totalCount} sub="Consumption sheet ready" icon={FileText} tone="sky" />
                <StatTile label="Proposals Generated" value={generatedProposals} sub="Active proposal versions" icon={CheckCircle2} tone="blue" />
                <StatTile label="Approved Proposals" value={approvedProposals} sub="Hitesh / Sr DCM approved" icon={ShieldCheck} tone="green" />
                <StatTile label="Terms & Clauses Set" value={termsDefined} sub="Pulled from Approved Masters" icon={Send} tone="indigo" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, proposal no..."
                            className="pl-9"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Consumption Sheet Ready Only ({consumptionReadyLeads.length})
                        </span>
                        {(search || selectedSection !== 's8') && (
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
                </div>
            </Panel>

            {loading ? (
                <Panel className="p-12 text-center">
                    <Loading text="Loading Proposal Data..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={FileText} title="No Proposal Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's8')}
                />
            )}

            {editingLead && (
                <EditProposalModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default ProposalCreation;
