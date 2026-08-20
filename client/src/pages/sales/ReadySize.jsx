import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, CheckSquare, Calendar, CheckCircle2, Paperclip, Home, Pencil } from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's6',
        title: 'Ready Size (Window/Site Details)',
        color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/90 dark:text-blue-200 dark:border-blue-700/80',
        cols: [
            { key: 'readySize.dueDate', label: 'Ready Size Due' },
            { key: 'readySize.confirmedBy', label: 'Ready Size Confirmed By' },
            { key: 'readySize.confirmationDate', label: 'Confirmation Date' },
            { key: 'readySize.windowSize', label: 'Window Size' },
            { key: 'readySize.siteCondition', label: 'Site Condition' },
            { key: 'readySize.pelmetDetails', label: 'Pelmet Details' },
            { key: 'readySize.channelDetails', label: 'Channel Details' },
            { key: 'readySize.readyHeight', label: 'Ready Height' },
            { key: 'readySize.finalMeasurements', label: 'Final Measurements' },
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

const resolveUserName = (userRef, users = []) => {
    if (!userRef) return '—';
    if (typeof userRef === 'object' && userRef.name) return userRef.name;
    if (typeof userRef === 'string' && users.length > 0) {
        const found = users.find((u) => u._id === userRef || u.id === userRef);
        if (found?.name) return found.name;
    }
    return typeof userRef === 'string' ? userRef : (userRef?.name || '—');
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
    'readySize.confirmedBy': (lead, { users = [] } = {}) => (
        <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300">
            {resolveUserName(lead.readySize?.confirmedBy, users)}
        </span>
    ),
    'readySize.finalMeasurements': (lead) => {
        const val = lead.readySize?.finalMeasurements;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px] block italic" title={val}>{val}</span>;
    }
};

const renderSpreadsheetCell = (lead, key, sno, onView, onEdit, users = []) => {
    if (SPREADSHEET_CELL_RENDERERS[key]) {
        return SPREADSHEET_CELL_RENDERERS[key](lead, { sno, onView, onEdit, users });
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

const EditReadySizeModal = ({ item, onClose, onDone, users = [] }) => {
    const initialMeasurement = item?.measurement || {};
    const existingReadySize = item?.readySize || {};

    const [form, setForm] = useState({
        dueDate: existingReadySize.dueDate ? new Date(existingReadySize.dueDate).toISOString().slice(0, 10) : '',
        confirmedBy: existingReadySize.confirmedBy?._id || existingReadySize.confirmedBy || '',
        confirmationDate: existingReadySize.confirmationDate ? new Date(existingReadySize.confirmationDate).toISOString().slice(0, 10) : '',
        windowSize: existingReadySize.windowSize || initialMeasurement.roomList || initialMeasurement.notes || '',
        siteCondition: existingReadySize.siteCondition || initialMeasurement.siteAccess || '',
        pelmetDetails: existingReadySize.pelmetDetails || initialMeasurement.pelmetDetails || '',
        channelDetails: existingReadySize.channelDetails || initialMeasurement.channelDetails || '',
        readyHeight: existingReadySize.readyHeight || '',
        finalMeasurements: existingReadySize.finalMeasurements || initialMeasurement.notes || '',
    });

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, { readySize: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        execute({
            ...(item?.readySize || {}),
            dueDate: form.dueDate || undefined,
            confirmedBy: form.confirmedBy || undefined,
            confirmationDate: form.confirmationDate || undefined,
            windowSize: form.windowSize || undefined,
            siteCondition: form.siteCondition || undefined,
            pelmetDetails: form.pelmetDetails || undefined,
            channelDetails: form.channelDetails || undefined,
            readyHeight: form.readyHeight || undefined,
            finalMeasurements: form.finalMeasurements || undefined,
        });
    };

    const eligibleUsers = users.filter((u) => {
        const userId = String(u._id || u.id || '');
        const role = String(u.role || '').toUpperCase();
        const name = String(u.name || '').toLowerCase();

        const isAllowedRole =
            role === 'PROJECT_COORDINATOR' ||
            role.includes('COORDINATOR') ||
            role === 'DCM' ||
            role === 'SENIOR_DCM' ||
            role === 'INSTALLER';

        const isAffectedNamedUser = name.includes('ishani') || name.includes('rucha');
        const isCurrentlySelected = form.confirmedBy && String(form.confirmedBy) === userId;

        return isAllowedRole || isAffectedNamedUser || isCurrentlySelected;
    });

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Ready Size Details — ${item?.code || ''}`}
            subtitle={`Capture & confirm final ready sizes for ${item?.clientName || ''}`}
            size="lg"
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">{error?.message || String(error)}</div>}

                <div className="p-3 text-xs bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 rounded-lg flex items-center gap-2">
                    <span className="font-semibold">Note:</span> Measurement capture data has been pulled forward automatically. Edit only confirmed final sizes & changes.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Ready Size Due">
                        <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>

                    <Field label="Ready Size Confirmed By">
                        <Select
                            value={form.confirmedBy}
                            onChange={set('confirmedBy')}
                            options={[
                                { value: '', label: 'Select User…' },
                                ...eligibleUsers.map((u) => ({ value: u._id || u.id, label: `${u.name} (${u.role || 'Staff'})` }))
                            ]}
                        />
                    </Field>

                    <Field label="Confirmation Date">
                        <Input type="date" value={form.confirmationDate} onChange={set('confirmationDate')} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Window Size">
                        <Input value={form.windowSize} onChange={set('windowSize')} placeholder="e.g. 1200 x 2100 mm / Main Window" />
                    </Field>

                    <Field label="Ready Height">
                        <Input value={form.readyHeight} onChange={set('readyHeight')} placeholder="e.g. 2100 mm / Floor to Ceiling" />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Site Condition">
                        <Input value={form.siteCondition} onChange={set('siteCondition')} placeholder="e.g. Ready for installation / Plastering complete" />
                    </Field>

                    <Field label="Pelmet Details">
                        <Input value={form.pelmetDetails} onChange={set('pelmetDetails')} placeholder="e.g. Wooden pelmet 150mm" />
                    </Field>

                    <Field label="Channel Details">
                        <Input value={form.channelDetails} onChange={set('channelDetails')} placeholder="e.g. Recessed ceiling track" />
                    </Field>
                </div>

                <Field label="Final Measurements">
                    <Textarea
                        rows={3}
                        value={form.finalMeasurements}
                        onChange={set('finalMeasurements')}
                        placeholder="Confirmed final dimensions, allowances, and site adjustments..."
                    />
                </Field>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" type="submit" loading={pending}>Save Ready Size</Button>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's6', onSectionChange, users = [] }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's6';
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
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit, users)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit Ready Size" />
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} title="View Lead Details" />
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

const ReadySize = ({ items: itemsProp = [] }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);

    const { data: usersData } = useAsync(() => usersApi.list({ limit: 100 }).then((r) => r.data?.items || r.data || []), []);
    const users = Array.isArray(usersData) ? usersData : [];

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch ready size data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's6';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=ready-size`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const studioCompletedLeads = rawLeads.filter((lead) =>
        Boolean(
            lead.studioMeeting?.date ||
            lead.studioMeeting?.feedback ||
            lead.studioMeeting?.nextAction ||
            lead.studioMeeting?.attendees ||
            lead.studioMeeting?.pricingRange
        )
    );

    const filteredLeads = studioCompletedLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const confirmedBy = String(lead.readySize?.confirmedBy?.name || lead.readySize?.confirmedBy || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !confirmedBy.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = studioCompletedLeads.length;
    const confirmedCount = studioCompletedLeads.filter((l) => l.readySize?.confirmationDate).length;
    const pendingConfirmation = studioCompletedLeads.filter((l) => l.readySize?.dueDate && !l.readySize?.confirmationDate).length;
    const roomsReadyCount = studioCompletedLeads.filter((l) => Boolean(l.readySize?.readyHeight || l.readySize?.siteCondition)).length;

    return (
        <div>
            <PageHeader
                title="Ready Size Confirmation (Window & Site Details)"
                subtitle="Track site & window details, ready heights, final measurement confirmations, pelmets, and channel specifications"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Window Leads" value={totalCount} sub="Active site windows" icon={CheckSquare} tone="blue" />
                <StatTile label="Confirmed Sizes" value={confirmedCount} sub="Ready for production" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Confirmations" value={pendingConfirmation} sub="Awaiting site verification" icon={Calendar} tone="amber" />
                <StatTile label="Rooms / Heights Ready" value={roomsReadyCount} sub="Site conditions met" icon={Home} tone="violet" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, confirmed by..."
                            className="pl-9"
                        />
                    </div>

                    {(search || selectedSection !== 's6') && (
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
                    <Loading text="Loading Ready Size Details..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={CheckSquare} title="No Ready Size Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's6')}
                    users={users}
                />
            )}

            {editingLead && (
                <EditReadySizeModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                    users={users}
                />
            )}
        </div>
    );
};

export default ReadySize;
