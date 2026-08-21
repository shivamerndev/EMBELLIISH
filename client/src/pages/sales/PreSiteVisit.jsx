import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Pencil, MapPin, Calendar, UserCheck, Paperclip, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { leadsApi, usersApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';

const SPREADSHEET_SECTIONS = [
    {
        id: 's3',
        title: 'Site Visit (Req. Details)',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/90 dark:text-indigo-200 dark:border-indigo-700/80',
        cols: [
            { key: 'siteVisitDueDate', label: 'Site Visit Due Date' },
            { key: 'siteAddress', label: 'Site Address' },
            { key: 'actualSiteVisitDateTime', label: 'Actual Visit Time' },
            { key: 'assignedInstaller', label: 'Assigned Installer' },
            { key: 'clientArchitectAvailability', label: 'Client/Architect Availablity' },
            { key: 'scope', label: 'Scope' },
            { key: 'rooms', label: 'Rooms' },
            { key: 'drawingsRenders', label: 'Drawings & Renders' },
            { key: 'installerAvailability', label: 'Installer Availability' },
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
    siteVisitRequired: (lead) => (
        lead.siteVisitRequired ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>
    ),
    siteVisitDueDate: (lead) => {
        const val = lead.siteVisitDueDate || lead.measurement?.dueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap">{date(val)}</span>;
    },
    actualSiteVisitDateTime: (lead) => {
        const val = lead.actualSiteVisitDateTime;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap">{date(val, { time: true })}</span>;
    },
    architectName: (lead) => (
        <span className="truncate block max-w-[140px] text-slate-700 dark:text-slate-300" title={lead.architect?.name || lead.architectName}>
            {lead.architect?.name || lead.architectName || '—'}
        </span>
    ),
    assignedInstaller: (lead) => (
        <span className="truncate block max-w-[130px] font-medium text-slate-800 dark:text-slate-200">
            {lead.assignedInstaller?.name || lead.assignedInstallerName || lead.installerName || 'Unassigned'}
        </span>
    ),
    installerAvailability: (lead) => {
        const val = lead.installerAvailability || 'AVAILABLE';
        const tone = val === 'AVAILABLE' ? 'emerald' : val === 'BUSY' ? 'amber' : val === 'ON_SITE' ? 'blue' : val === 'UNAVAILABLE' ? 'rose' : 'slate';
        return <Badge tone={tone}>{val}</Badge>;
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

    if (typeof raw === 'boolean') {
        return raw ? <Badge tone="emerald">YES</Badge> : <Badge tone="slate">NO</Badge>;
    }

    if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={String(raw)}>{String(raw)}</span>;
};

import { getLocalDate, getLocalDateTime } from '../../utils/format';

/* ------------------------------------------------------------- Edit Site Visit Modal */
const EditSiteVisitModal = ({ item, onClose, onDone, installers = [] }) => {
    const [form, setForm] = useState({
        siteVisitRequired: item?.siteVisitRequired ?? true,
        siteVisitDueDate: item?.siteVisitDueDate ? new Date(item.siteVisitDueDate).toISOString().slice(0, 10) : getLocalDate(),
        actualSiteVisitDateTime: item?.actualSiteVisitDateTime ? new Date(item.actualSiteVisitDateTime).toISOString().slice(0, 16) : getLocalDateTime(),
        siteAddress: item?.siteAddress || item?.location || '',
        assignedInstaller: item?.assignedInstaller?._id || item?.assignedInstaller || '',
        clientArchitectAvailability: item?.clientArchitectAvailability || '',
        scope: item?.scope || '',
        rooms: item?.rooms || '',
        drawingsRenders: item?.drawingsRenders || '',
        installerAvailability: item?.installerAvailability || 'AVAILABLE',
    });

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, payload),
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
            ...form,
            siteVisitRequired: Boolean(form.siteVisitRequired),
            siteVisitDueDate: form.siteVisitDueDate || undefined,
            actualSiteVisitDateTime: form.actualSiteVisitDateTime || undefined,
            assignedInstaller: form.assignedInstaller || undefined,
        });
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Site Visit Details — ${item?.code || ''}`}
            subtitle={`Configure pre-site visit information for ${item?.clientName || ''}`}
            size="lg"
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">{error}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Site Visit Requirement">
                        <Select
                            value={form.siteVisitRequired ? 'YES' : 'NO'}
                            onChange={(e) => setForm((prev) => ({ ...prev, siteVisitRequired: e.target.value === 'YES' }))}
                            options={[
                                { value: 'YES', label: 'Yes - Site Visit Needed' },
                                { value: 'NO', label: 'No - Not Required' }
                            ]}
                        />
                    </Field>

                    <Field label="Site Visit Due Date">
                        <Input
                            type="date"
                            value={form.siteVisitDueDate}
                            onChange={set('siteVisitDueDate')}
                        />
                    </Field>

                    <Field label="Actual Site Visit Date & Time">
                        <Input
                            type="datetime-local"
                            value={form.actualSiteVisitDateTime}
                            onChange={set('actualSiteVisitDateTime')}
                        />
                    </Field>

                    <Field label="Assigned Installer">
                        <Select
                            value={form.assignedInstaller}
                            onChange={set('assignedInstaller')}
                            options={[
                                { value: '', label: 'Select Installer…' },
                                ...installers.map((u) => ({ value: u._id || u.id, label: `${u.name} (${u.role || 'Team'})` }))
                            ]}
                        />
                    </Field>

                    <Field label="Installer Availability">
                        <Select
                            value={form.installerAvailability}
                            onChange={set('installerAvailability')}
                            options={[
                                { value: 'AVAILABLE', label: 'Available' },
                                { value: 'BUSY', label: 'Busy' },
                                { value: 'ON_SITE', label: 'On Site' },
                                { value: 'UNAVAILABLE', label: 'Unavailable' }
                            ]}
                        />
                    </Field>

                    <Field label="Client / Architect Availability">
                        <Input
                            placeholder="e.g. Sat-Sun 10am to 2pm"
                            value={form.clientArchitectAvailability}
                            onChange={set('clientArchitectAvailability')}
                        />
                    </Field>

                    <Field label="Scope">
                        <Input
                            placeholder="e.g. Curtains & Blinds for whole villa"
                            value={form.scope}
                            onChange={set('scope')}
                        />
                    </Field>

                    <Field label="Rooms">
                        <Input
                            placeholder="e.g. Living, Dining, 3 Bedrooms"
                            value={form.rooms}
                            onChange={set('rooms')}
                        />
                    </Field>
                </div>

                <Field label="Site Address">
                    <Textarea
                        rows={2}
                        placeholder="Enter full site location address"
                        value={form.siteAddress}
                        onChange={set('siteAddress')}
                    />
                </Field>

                <Field label="Drawings & Renders Notes">
                    <Input
                        placeholder="e.g. CAD layout received, 3D renders attached"
                        value={form.drawingsRenders}
                        onChange={set('drawingsRenders')}
                    />
                </Field>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button type="submit" loading={pending}>Save Site Visit Details</Button>
                </div>
            </form>
        </Modal>
    );
};

/* ------------------------------------------------------------- Matrix Grid View Component */
const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's3', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's3';
    const visibleSections = SPREADSHEET_SECTIONS.filter((s) => s.id === currentSection);
    const visibleItems = items.filter((lead) => Boolean(lead.siteVisitDueDate || lead.measurement?.dueDate || lead.dueDate));

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

            {/* Matrix Table Container */}
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
                        {visibleItems.map((lead, idx) => (
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
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit && onEdit(lead)} />
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

/* ------------------------------------------------------------- Main PreSiteVisit Component */
const PreSiteVisit = ({ items: itemsProp = [] }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);

    const { data: usersData } = useAsync(() => usersApi.list({ limit: 100 }).then((r) => r.data?.items || r.data || []), []);
    const installersList = Array.isArray(usersData) ? usersData : [];

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch site visit leads'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const visitFilter = searchParams.get('visitFilter') || 'ALL';
    const selectedSection = searchParams.get('section') || 's3';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=pre-site`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const filteredLeads = rawLeads.filter((lead) => {
        const hasDueDate = Boolean(lead.siteVisitDueDate || lead.measurement?.dueDate || lead.dueDate);
        if (!hasDueDate) return false;

        if (visitFilter === 'REQUIRED' && !lead.siteVisitRequired) return false;
        if (visitFilter === 'SCHEDULED' && (!lead.siteVisitDueDate || lead.actualSiteVisitDateTime)) return false;
        if (visitFilter === 'COMPLETED' && !lead.actualSiteVisitDateTime) return false;

        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const address = String(lead.siteAddress || lead.location || '').toLowerCase();
            const installer = String(lead.assignedInstaller?.name || lead.assignedInstallerName || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !address.includes(q) && !installer.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalVisitRequired = rawLeads.filter((l) => l.siteVisitRequired).length;
    const totalScheduled = rawLeads.filter((l) => l.siteVisitDueDate && !l.actualSiteVisitDateTime).length;
    const totalCompleted = rawLeads.filter((l) => l.actualSiteVisitDateTime).length;
    const unassignedInstallers = rawLeads.filter((l) => l.siteVisitRequired && !l.assignedInstaller).length;

    return (
        <div>
            <PageHeader
                title="Pre Site Visit Management"
                subtitle="Track site visit requirement details, visit schedules, site addresses, assigned installers, and readiness specs"
            />

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Visits Required" value={totalVisitRequired} sub="Leads requiring site visit" icon={MapPin} tone="blue" />
                <StatTile label="Scheduled Visits" value={totalScheduled} sub="Pending site execution" icon={Calendar} tone="amber" />
                <StatTile label="Completed Visits" value={totalCompleted} sub="Site data captured" icon={CheckCircle2} tone="green" />
                <StatTile label="Unassigned Installers" value={unassignedInstallers} sub="Action required" icon={UserCheck} tone="rose" />
            </div>

            {/* Filters Bar */}
            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, address, installer..."
                            className="pl-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Visit Status:</span>
                            <Select
                                value={visitFilter}
                                onChange={(e) => updateParam('visitFilter', e.target.value, 'ALL')}
                                options={[
                                    { value: 'ALL', label: 'All Site Visit Leads' },
                                    { value: 'REQUIRED', label: 'Site Visit Required' },
                                    { value: 'SCHEDULED', label: 'Scheduled Visits' },
                                    { value: 'COMPLETED', label: 'Completed Visits' },
                                ]}
                                className="w-44 text-xs"
                            />
                        </div>

                        {(visitFilter !== 'ALL' || search || selectedSection !== 's3') && (
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

            {/* Main Grid Content */}
            {loading ? (
                <Panel className="p-12 text-center">
                    <Loading text="Loading Pre Site Visit Sheet..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState
                        icon={MapPin}
                        title="No Site Visit Records Found"
                        hint="Try adjusting search or status filters."
                    />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(l) => setEditingLead(l)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's3')}
                />
            )}

            {/* Edit Modal */}
            {editingLead && (
                <EditSiteVisitModal
                    item={editingLead}
                    installers={installersList}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default PreSiteVisit;