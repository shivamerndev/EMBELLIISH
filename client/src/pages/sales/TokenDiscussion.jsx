import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, BadgeDollarSign, Calendar, CheckCircle2, Paperclip, Wallet, Pencil,
    AlertTriangle, FileText, Layers, Clock, Sparkles, Check, X, ShieldAlert
} from 'lucide-react';
import { currency, date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's9',
        title: 'Token / Advance Discussion',
        color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-700/80',
        cols: [
            { key: 'token.discussionDueDate', label: 'Token Discussion Due' },
            { key: 'token.amount', label: 'Token Amount (₹)' },
            { key: 'token.status', label: 'Token Status' },
            { key: 'token.receivedDate', label: 'Token Received Date' },
            { key: 'token.clientBudgetResponse', label: 'Client Budget Response' },
            { key: 'token.proposal', label: 'Proposal' },
            { key: 'token.budgetEstimate', label: 'Budget Estimate (₹)' },
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

const COMMERCIAL_MASTER_TEMPLATES = [
    {
        id: 'standard',
        name: 'Standard Terms (50-40-10)',
        terms: '50% Advance Token upon sign-off, 40% prior to dispatch, 10% post-installation sign-off.'
    },
    {
        id: 'corporate',
        name: 'Corporate Terms (30-60-10)',
        terms: '30% Advance Token, 60% upon site delivery, 10% net 30 days post completion.'
    },
    {
        id: 'premium_res',
        name: 'High-Value Residential (40-50-10)',
        terms: '40% Advance Token on design approval, 50% upon site readiness confirmation, 10% upon final hand-over.'
    },
    {
        id: 'custom',
        name: 'Custom / Negotiated Terms',
        terms: 'Custom commercial terms negotiated with client.'
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
    'token.discussionDueDate': (lead) => {
        const val = lead.token?.discussionDueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.token?.receivedDate && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Overdue" />}
            </div>
        );
    },
    'token.amount': (lead) => {
        const val = lead.token?.amount;
        if (val === undefined || val === null || val === '') return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="font-mono text-slate-900 dark:text-slate-100 text-xs font-bold">{currency(val)}</span>;
    },
    'token.status': (lead) => {
        const raw = lead.token?.status;
        const st = normalizeTokenStatus(raw);
        const opt = TOKEN_STATUS_OPTIONS.find((o) => o.value.toLowerCase() === st.toLowerCase()) || { tone: 'slate' };
        return <Badge tone={opt.tone}>{st}</Badge>;
    },
    'token.receivedDate': (lead) => {
        const st = normalizeTokenStatus(lead.token?.status);
        const val = lead.token?.receivedDate;
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
    'token.clientBudgetResponse': (lead) => {
        const val = lead.token?.clientBudgetResponse;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const opt = CLIENT_BUDGET_RESPONSE_OPTIONS.find((o) => o.value === val);
        return <Badge tone={opt ? opt.tone : 'slate'}>{val}</Badge>;
    },
    'token.proposal': (lead) => {
        const val = lead.token?.proposal || lead.proposal?.noVersion || lead.proposal?.selectedBoqVersion;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                <FileText className="w-3 h-3 text-purple-500 shrink-0" />
                {val}
            </span>
        );
    },
    'token.budgetEstimate': (lead) => {
        const val = lead.token?.budgetEstimate;
        if (val === undefined || val === null || val === '') return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="font-mono text-slate-900 dark:text-slate-100 text-xs font-semibold">{currency(val)}</span>;
    },
    'token.clientResponse': (lead) => {
        const val = lead.token?.clientResponse;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={val}>
                {val}
            </span>
        );
    },
    'token.projectTimeline': (lead) => {
        const start = lead.token?.projectTimelineStart;
        const end = lead.token?.projectTimelineEnd;
        const str = lead.token?.projectTimeline;

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
    'token.commercialTerms': (lead) => {
        const terms = lead.token?.commercialTerms;
        const template = lead.token?.masterTemplate;
        const notes = lead.token?.commercialTermsNotes;

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

/* ------------------------------------------------------------- Edit Token Discussion Modal */
import { getLocalDate } from '../../utils/format';

const EditTokenModal = ({ item, onClose, onDone }) => {
    const tok = item?.token || {};

    const initialStatus = normalizeTokenStatus(tok.status);

    const [form, setForm] = useState({
        discussionDueDate: tok.discussionDueDate ? String(tok.discussionDueDate).slice(0, 10) : getLocalDate(),
        amount: tok.amount ?? '',
        status: initialStatus,
        receivedDate: tok.receivedDate ? String(tok.receivedDate).slice(0, 10) : '',
        clientBudgetResponse: tok.clientBudgetResponse || '',
        proposal: tok.proposal || item?.proposal?.noVersion || item?.proposal?.selectedBoqVersion || '',
        budgetEstimate: tok.budgetEstimate ?? item?.budget ?? '',
        clientResponse: tok.clientResponse || '',
        projectTimelineStart: tok.projectTimelineStart ? String(tok.projectTimelineStart).slice(0, 10) : '',
        projectTimelineEnd: tok.projectTimelineEnd ? String(tok.projectTimelineEnd).slice(0, 10) : '',
        projectTimeline: tok.projectTimeline || '',
        masterTemplate: tok.masterTemplate || '',
        commercialTerms: tok.commercialTerms || '',
        commercialTermsNotes: tok.commercialTermsNotes || '',
    });

    const [validationError, setValidationError] = useState('');

    const set = (key) => (e) => {
        const val = e.target.value;
        setForm((p) => {
            const next = { ...p, [key]: val };

            // Dynamic master template selection
            if (key === 'masterTemplate') {
                const tmpl = COMMERCIAL_MASTER_TEMPLATES.find((t) => t.name === val);
                if (tmpl && tmpl.id !== 'custom') {
                    next.commercialTerms = tmpl.terms;
                }
            }

            // Dynamic project timeline update
            if (key === 'projectTimelineStart' || key === 'projectTimelineEnd') {
                const start = key === 'projectTimelineStart' ? val : p.projectTimelineStart;
                const end = key === 'projectTimelineEnd' ? val : p.projectTimelineEnd;
                if (start && end) {
                    next.projectTimeline = `${start} to ${end}`;
                }
            }

            return next;
        });
    };

    const { execute, pending, error: apiError } = useAction(
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
        setValidationError('');

        // Configuration / Validation rule: Token Received Date is Mandatory when Token Status is Received
        if (form.status === 'Received' && !form.receivedDate) {
            setValidationError('Token Received Date is mandatory when Token Status is Received.');
            return;
        }

        const payload = {
            ...form,
            amount: form.amount === '' ? undefined : Number(form.amount),
            budgetEstimate: form.budgetEstimate === '' ? undefined : Number(form.budgetEstimate),
            discussionDueDate: form.discussionDueDate || undefined,
            receivedDate: form.receivedDate || undefined,
            projectTimelineStart: form.projectTimelineStart || undefined,
            projectTimelineEnd: form.projectTimelineEnd || undefined,
        };

        execute(payload);
    };

    // Proposal version choices candidate list
    const availableProposals = Array.from(new Set([
        item?.proposal?.noVersion,
        item?.proposal?.selectedBoqVersion,
        ...(item?.proposal?.revisionHistory || []).map((r) => r.version),
        'v1.0', 'v1.1', 'v2.0'
    ].filter(Boolean)));

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Edit Token Discussion & Commercial Details — ${item?.clientName || item?.code}`}
            subtitle="Configure token discussion due dates, amounts, status, proposal version, budget response, date ranges, and commercial terms."
            size="xl"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} loading={pending}>Save Token Details</Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {(validationError || apiError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError || (apiError?.message || String(apiError))}</span>
                    </div>
                )}

                {/* Section 1: Token & Advance Status */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <Wallet className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Token & Advance Setup
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Field label="Token Status" required hint="Current status of the token discussion">
                            <Select value={form.status} onChange={set('status')}>
                                {TOKEN_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Token Discussion Due" hint="Due date for completing the discussion">
                            <Input type="date" value={form.discussionDueDate} onChange={set('discussionDueDate')} />
                        </Field>

                        <Field label="Token Amount (₹)" hint="Numeric value in ₹">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                <Input
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={form.amount}
                                    onChange={set('amount')}
                                    className="pl-7 font-mono"
                                />
                            </div>
                        </Field>

                        <Field
                            label="Token Received Date"
                            required={form.status === 'Received'}
                            hint={form.status === 'Received' ? 'Mandatory when Token Status is Received' : 'Date when token was received'}
                        >
                            <Input
                                type="date"
                                value={form.receivedDate}
                                onChange={set('receivedDate')}
                                className={form.status === 'Received' && !form.receivedDate ? 'border-rose-400 focus:ring-rose-500' : ''}
                            />
                        </Field>
                    </div>
                </div>

                {/* Section 2: Budget & Proposal Integration */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Proposal & Budget Response
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Proposal Version" hint="Select the proposal version discussed">
                            <div className="space-y-1.5">
                                <Select value={form.proposal} onChange={set('proposal')}>
                                    <option value="">-- Select Proposal Version --</option>
                                    {availableProposals.map((ver) => (
                                        <option key={ver} value={ver}>{ver}</option>
                                    ))}
                                </Select>
                                <Input
                                    size="sm"
                                    placeholder="Or specify proposal version code..."
                                    value={form.proposal}
                                    onChange={set('proposal')}
                                    className="text-xs font-mono"
                                />
                            </div>
                        </Field>

                        <Field label="Client Budget Response" hint="Select client's budget feedback status">
                            <Select value={form.clientBudgetResponse} onChange={set('clientBudgetResponse')}>
                                <option value="">-- Select Response --</option>
                                {CLIENT_BUDGET_RESPONSE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Budget Estimate (₹)" hint="Numeric value in ₹">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                <Input
                                    type="number"
                                    placeholder="e.g. 500000"
                                    value={form.budgetEstimate}
                                    onChange={set('budgetEstimate')}
                                    className="pl-7 font-mono"
                                />
                            </div>
                        </Field>
                    </div>
                </div>

                {/* Section 3: Project Timeline (Date-range field) */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Project Timeline (Proposed Start & Completion Dates)
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Proposed Start Date" hint="Proposed start date for project execution">
                            <Input type="date" value={form.projectTimelineStart} onChange={set('projectTimelineStart')} />
                        </Field>

                        <Field label="Proposed Completion Date" hint="Proposed target completion date">
                            <Input type="date" value={form.projectTimelineEnd} onChange={set('projectTimelineEnd')} />
                        </Field>
                    </div>

                    {form.projectTimelineStart && form.projectTimelineEnd && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                            <span className="text-emerald-800 dark:text-emerald-300 font-medium">Proposed Date Range:</span>
                            <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">
                                {date(form.projectTimelineStart)} → {date(form.projectTimelineEnd)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Section 4: Commercial Terms (Master-template lookup plus notes) */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <Layers className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Commercial Terms (Master Template & Authorised Overrides)
                        </h4>
                    </div>

                    <Field label="Commercial Master Template" hint="Pull approved standard terms template">
                        <Select value={form.masterTemplate} onChange={set('masterTemplate')}>
                            <option value="">-- Select Master Terms Template --</option>
                            {COMMERCIAL_MASTER_TEMPLATES.map((tmpl) => (
                                <option key={tmpl.id} value={tmpl.name}>{tmpl.name}</option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Approved Commercial Terms" hint="Pulled from template or specified terms">
                        <Textarea
                            rows={2}
                            placeholder="Approved payment milestones and terms..."
                            value={form.commercialTerms}
                            onChange={set('commercialTerms')}
                        />
                    </Field>

                    <Field label="Authorised Overrides & Notes" hint="Document special management overrides or customized terms">
                        <Textarea
                            rows={2}
                            placeholder="Authorised overrides, special exceptions, or discount clauses..."
                            value={form.commercialTermsNotes}
                            onChange={set('commercialTermsNotes')}
                        />
                    </Field>
                </div>

                {/* Section 5: Client Response (Long Free Text) */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Client Response & Discussion Comments (Long Free Text)
                        </h4>
                    </div>

                    <Field label="Client Response / Feedback" hint="Capture comments, discussion points, and special conditions">
                        <Textarea
                            rows={3}
                            placeholder="Capture detailed client feedback, verbal commitments, or conditions requested during token discussion..."
                            value={form.clientResponse}
                            onChange={set('clientResponse')}
                        />
                    </Field>
                </div>
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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=token-discussion`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const approvedLeads = rawLeads.filter((lead) => lead.proposal?.approvalStatus === 'APPROVED' || lead.proposalApprovalStatus === 'APPROVED' || lead.token);

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
    const tokenReceivedCount = approvedLeads.filter((l) => normalizeTokenStatus(l.token?.status) === 'Received' || l.token?.receivedDate).length;
    const totalTokenValue = approvedLeads.reduce((acc, l) => acc + Number(l.token?.amount || 0), 0);
    const pendingDiscussions = approvedLeads.filter((l) => l.token?.discussionDueDate && !l.token?.receivedDate).length;

    return (
        <div>
            <PageHeader
                title="Budgeting / Token Discussion"
                subtitle="Track token advance discussions, token amounts received, mandatory receive validation, proposal versions, client budget responses, project timeline date ranges, and commercial master terms"
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
