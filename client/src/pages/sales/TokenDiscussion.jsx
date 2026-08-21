import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, BadgeDollarSign, Calendar, CheckCircle2, Paperclip, Wallet, Pencil } from 'lucide-react';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's9',
        title: 'Token / Advance',
        color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-700/80',
        cols: [
            { key: 'token.discussionDueDate', label: 'Token Discussion Due Date' },
            { key: 'token.amount', label: 'Token Amount' },
            { key: 'token.status', label: 'Token Status' },
            { key: 'token.receivedDate', label: 'Received Date' },
            { key: 'token.clientBudgetResponse', label: 'Client Budget Response' },
            { key: 'token.proposalAttachment', label: 'Proposal Attachment' },
            { key: 'token.budgetEstimate', label: 'Budget Estimate' },
            { key: 'token.clientResponse', label: 'Client Response' },
            { key: 'token.projectTimeline', label: 'Project Timeline' },
            { key: 'token.commercialTerms', label: 'Commercial Terms' },
        ]
    },
    {
        id: 's1',
        title: 'Lead & Contact Details',
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
    'token.status': (lead) => {
        const st = lead.token?.status || 'PENDING';
        const tone = st === 'RECEIVED' || st === 'PAID' ? 'emerald' : st === 'DISCUSSED' ? 'amber' : 'slate';
        return <Badge tone={tone}>{st}</Badge>;
    },
    'token.clientBudgetResponse': (lead) => {
        const val = lead.token?.clientBudgetResponse;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const toneMap = {
            'Accepted': 'emerald',
            'Revision Required': 'amber',
            'On Hold': 'blue',
            'Declined': 'rose',
        };
        return <Badge tone={toneMap[val] || 'slate'}>{val}</Badge>;
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

/* ------------------------------------------------------------- Edit Token Discussion Modal */
import { getLocalDate } from '../../utils/format';

const EditTokenModal = ({ item, onClose, onDone }) => {
    const tok = item?.token || {};

    const [form, setForm] = useState({
        discussionDueDate: tok.discussionDueDate ? String(tok.discussionDueDate).slice(0, 10) : getLocalDate(),
        amount: tok.amount ?? '',
        status: tok.status || 'PENDING',
        receivedDate: tok.receivedDate ? String(tok.receivedDate).slice(0, 10) : getLocalDate(),
        clientBudgetResponse: tok.clientBudgetResponse || '',
        budgetEstimate: tok.budgetEstimate ?? '',
        clientResponse: tok.clientResponse || '',
        projectTimeline: tok.projectTimeline || '',
        commercialTerms: tok.commercialTerms || '',
    });

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item._id || item.id, { token: payload }),
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
            ...form,
            amount: form.amount === '' ? undefined : Number(form.amount),
            budgetEstimate: form.budgetEstimate === '' ? undefined : Number(form.budgetEstimate),
        };
        execute(payload);
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Edit Token & Advance Details — ${item?.clientName || item?.code}`}
            subtitle="Manage token discussion dates, advance amounts received, client budget responses, and commercial terms."
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={pending}>Save Token Details</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 rounded-md border border-rose-200 dark:border-rose-800">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Token Status">
                        <Select value={form.status} onChange={set('status')}>
                            <option value="NOT_DISCUSSED">NOT DISCUSSED</option>
                            <option value="DISCUSSED">DISCUSSED</option>
                            <option value="PENDING">PENDING</option>
                            <option value="RECEIVED">RECEIVED</option>
                            <option value="WAIVED">WAIVED</option>
                        </Select>
                    </Field>

                    <Field label="Token Discussion Due Date">
                        <Input type="date" value={form.discussionDueDate} onChange={set('discussionDueDate')} />
                    </Field>

                    <Field label="Token Amount (₹)">
                        <Input type="number" placeholder="e.g. 50000" value={form.amount} onChange={set('amount')} />
                    </Field>

                    <Field label="Token Received Date">
                        <Input type="date" value={form.receivedDate} onChange={set('receivedDate')} />
                    </Field>

                    <Field label="Budget Estimate (₹)">
                        <Input type="number" placeholder="e.g. 500000" value={form.budgetEstimate} onChange={set('budgetEstimate')} />
                    </Field>

                    <Field label="Project Timeline">
                        <Input placeholder="e.g. 4-6 weeks from token receive" value={form.projectTimeline} onChange={set('projectTimeline')} />
                    </Field>
                </div>

                <Field label="Client Budget Response">
                    <Select value={form.clientBudgetResponse} onChange={set('clientBudgetResponse')}>
                        <option value="">-- Select Response --</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Revision Required">Revision Required</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Declined">Declined</option>
                    </Select>
                </Field>

                <Field label="Client Response / Notes">
                    <Textarea rows={2} placeholder="General client response during token meeting..." value={form.clientResponse} onChange={set('clientResponse')} />
                </Field>

                <Field label="Commercial Terms & Conditions">
                    <Textarea rows={3} placeholder="Special commercial terms negotiated..." value={form.commercialTerms} onChange={set('commercialTerms')} />
                </Field>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's9', onSectionChange }) => {
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
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit Token Details" />
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
            .catch((err) => setError(err?.message || 'Failed to fetch token discussion data'))
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
            navigate(`/crm/sales-commercials/leads/${lead.code}`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const approvedLeads = rawLeads.filter((lead) => lead.proposal?.approvalStatus === 'APPROVED' || lead.proposalApprovalStatus === 'APPROVED');

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
    const tokenReceivedCount = approvedLeads.filter((l) => l.token?.status === 'RECEIVED' || l.token?.receivedDate).length;
    const totalTokenValue = approvedLeads.reduce((acc, l) => acc + Number(l.token?.amount || 0), 0);
    const pendingDiscussions = approvedLeads.filter((l) => l.token?.discussionDueDate && !l.token?.receivedDate).length;

    return (
        <div>
            <PageHeader
                title="Budgeting / Token Discussion"
                subtitle="Track token advance discussions, token amounts received, client budget responses, proposal attachments, and project commercial timelines"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Token Pipeline" value={totalCount} sub="Active commercial leads" icon={BadgeDollarSign} tone="amber" />
                <StatTile label="Token Received" value={tokenReceivedCount} sub="Advances secured" icon={CheckCircle2} tone="green" />
                <StatTile label="Total Token Amount" value={currency(totalTokenValue, { compact: true })} sub="Cumulative token value" icon={Wallet} tone="emerald" />
                <StatTile label="Pending Discussions" value={pendingDiscussions} sub="Token meetings due" icon={Calendar} tone="blue" />
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
                    <Loading text="Loading Token & Advance Data..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={BadgeDollarSign} title="No Token Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
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
        </div>
    );
};

export default TokenDiscussion;
