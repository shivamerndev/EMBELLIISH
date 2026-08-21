import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, FileSpreadsheet, Calendar, CheckCircle2, Paperclip, Layers, Pencil } from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's7',
        title: 'Consumption / BOQ',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-700/80',
        cols: [
            { key: 'consumption.sheetDueDate', label: 'Consumption Sheet Due' },
            { key: 'consumption.measurements', label: 'Measurements' },
            { key: 'consumption.quantity', label: 'Consumption Quantity' },
            { key: 'consumption.unit', label: 'Unit' },
            { key: 'consumption.wastageAllowance', label: 'Wastage Allowance' },
            { key: 'consumption.boqVersion', label: 'BOQ / Consumption Sheet Version' },
            { key: 'consumption.roomList', label: 'Room List' },
            { key: 'consumption.boqPreparedBy', label: 'BOQ Prepared By' },
            { key: 'consumption.boqPreparedDate', label: 'BOQ Prepared Date' },
            { key: 'consumption.fabricDesignSelection', label: 'Fabric / Design Selection' },
            { key: 'consumption.panelCount', label: 'Panel Count' },
            { key: 'consumption.liningAccessoryAssumptions', label: 'Lining / accessory assumptions' },
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
    'consumption.boqPreparedBy': (lead) => {
        const val = lead.consumption?.boqPreparedBy;
        const name = typeof val === 'object' ? val?.name : val;
        return <span className="truncate block max-w-[140px] text-slate-700 dark:text-slate-300" title={name || '—'}>{name || '—'}</span>;
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

import { getLocalDate } from '../../utils/format';

const EditConsumptionModal = ({ item, onClose, onDone }) => {
    const existingConsumption = item?.consumption || {};

    const [form, setForm] = useState({
        sheetDueDate: existingConsumption.sheetDueDate ? new Date(existingConsumption.sheetDueDate).toISOString().slice(0, 10) : getLocalDate(),
        measurements: existingConsumption.measurements || '',
        quantity: existingConsumption.quantity ?? '',
        unit: existingConsumption.unit || 'meters',
        wastageAllowance: existingConsumption.wastageAllowance || '',
        boqVersion: existingConsumption.boqVersion || '',
        roomList: existingConsumption.roomList || '',
        boqPreparedBy: typeof existingConsumption.boqPreparedBy === 'object' ? existingConsumption.boqPreparedBy?.name || '' : (existingConsumption.boqPreparedBy || ''),
        boqPreparedDate: existingConsumption.boqPreparedDate ? new Date(existingConsumption.boqPreparedDate).toISOString().slice(0, 10) : getLocalDate(),
        fabricDesignSelection: existingConsumption.fabricDesignSelection || '',
        panelCount: existingConsumption.panelCount ?? '',
        liningAccessoryAssumptions: existingConsumption.liningAccessoryAssumptions || '',
    });

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, { consumption: payload }),
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
            ...existingConsumption,
            sheetDueDate: form.sheetDueDate || undefined,
            measurements: form.measurements || undefined,
            quantity: form.quantity !== '' ? Number(form.quantity) : undefined,
            unit: form.unit || undefined,
            wastageAllowance: form.wastageAllowance || undefined,
            boqVersion: form.boqVersion || undefined,
            roomList: form.roomList || undefined,
            boqPreparedBy: form.boqPreparedBy || undefined,
            boqPreparedDate: form.boqPreparedDate || undefined,
            fabricDesignSelection: form.fabricDesignSelection || undefined,
            panelCount: form.panelCount !== '' ? Number(form.panelCount) : undefined,
            liningAccessoryAssumptions: form.liningAccessoryAssumptions || undefined,
        });
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Consumption & BOQ Details — ${item?.code || ''}`}
            subtitle={`Edit consumption sheet and BOQ details for ${item?.clientName || ''}`}
            size="lg"
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">{error?.message || String(error)}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Consumption Sheet Due">
                        <Input type="date" value={form.sheetDueDate} onChange={set('sheetDueDate')} />
                    </Field>

                    <Field label="BOQ / Consumption Sheet Version">
                        <Input value={form.boqVersion} onChange={set('boqVersion')} placeholder="e.g. v1.0, Final Draft" />
                    </Field>

                    <Field label="Consumption Quantity">
                        <Input type="number" step="any" value={form.quantity} onChange={set('quantity')} placeholder="e.g. 150" />
                    </Field>

                    <Field label="Unit">
                        <Input value={form.unit} onChange={set('unit')} placeholder="e.g. meters, sqft, pcs" />
                    </Field>

                    <Field label="Wastage Allowance">
                        <Input value={form.wastageAllowance} onChange={set('wastageAllowance')} placeholder="e.g. 10%, 2.5 meters" />
                    </Field>

                    <Field label="Panel Count">
                        <Input type="number" value={form.panelCount} onChange={set('panelCount')} placeholder="e.g. 12" />
                    </Field>

                    <Field label="BOQ Prepared By">
                        <Input value={form.boqPreparedBy} onChange={set('boqPreparedBy')} placeholder="e.g. Designer Name" />
                    </Field>

                    <Field label="BOQ Prepared Date">
                        <Input type="date" value={form.boqPreparedDate} onChange={set('boqPreparedDate')} />
                    </Field>

                    <div className="md:col-span-2">
                        <Field label="Fabric / Design Selection">
                            <Input value={form.fabricDesignSelection} onChange={set('fabricDesignSelection')} placeholder="e.g. Velvet Charcoal - Curtains & Sheers" />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field label="Room List">
                            <Textarea rows={2} value={form.roomList} onChange={set('roomList')} placeholder="Master Bedroom, Living Room, Dining..." />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field label="Measurements">
                            <Textarea rows={2} value={form.measurements} onChange={set('measurements')} placeholder="Width x Height details per window..." />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field label="Lining / Accessory Assumptions">
                            <Textarea rows={2} value={form.liningAccessoryAssumptions} onChange={set('liningAccessoryAssumptions')} placeholder="Blackout lining, motor tracks included..." />
                        </Field>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={pending}>Save Consumption / BOQ</Button>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's7', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's7';
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
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView)}
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

const ConsumptionBoq = ({ items: itemsProp = [] }) => {
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
            .catch((err) => setError(err?.message || 'Failed to fetch consumption BOQ data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's7';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=consumption-boq`);
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
            const version = String(lead.consumption?.boqVersion || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !version.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = studioCompletedLeads.length;
    const activeBoqCount = studioCompletedLeads.filter((l) => Boolean(l.consumption?.boqVersion)).length;
    const fabricSelectedCount = studioCompletedLeads.filter((l) => Boolean(l.consumption?.fabricDesignSelection)).length;
    const pendingSheets = studioCompletedLeads.filter((l) => l.consumption?.sheetDueDate && !l.consumption?.boqVersion).length;

    return (
        <div>
            <PageHeader
                title="Consumption Sheet / BOQ Dashboard"
                subtitle="Calculate fabric requirements, quantities, wastage allowances, BOQ versions, room lists, panel counts, and lining accessories"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total BOQ Projects" value={totalCount} sub="Leads requiring BOQ" icon={FileSpreadsheet} tone="emerald" />
                <StatTile label="Active BOQs" value={activeBoqCount} sub="BOQ versions created" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending BOQ Sheets" value={pendingSheets} sub="Awaiting BOQ calculation" icon={Calendar} tone="amber" />
                <StatTile label="Fabric Selections" value={fabricSelectedCount} sub="Design & fabrics specified" icon={Layers} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, BOQ version..."
                            className="pl-9"
                        />
                    </div>

                    {(search || selectedSection !== 's7') && (
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
                    <Loading text="Loading Consumption Sheet & BOQ..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={FileSpreadsheet} title="No BOQ Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingItem(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's7')}
                />
            )}

            {editingItem && (
                <EditConsumptionModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default ConsumptionBoq;
