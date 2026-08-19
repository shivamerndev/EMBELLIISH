import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Pencil, Ruler, Calendar, CheckCircle2, Paperclip, ClipboardList, Upload, Loader2, Trash2, ExternalLink, Image as ImageIcon, FileText } from 'lucide-react';
import { leadsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { date, getMediaUrl } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';

const SPREADSHEET_SECTIONS = [
    {
        id: 's4',
        title: 'Measurement (Site Details)',
        color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/90 dark:text-teal-200 dark:border-teal-700/80',
        cols: [
            { key: 'actualSiteVisitDateTime', label: 'Actual Visit Time' },
            { key: 'measurement.dueDate', label: 'Measurement Due Date' },
            { key: 'measurement.date', label: 'Measurement Date' },
            { key: 'measurement.measuredBy', label: 'Measured By' },
            { key: 'measurement.status', label: 'Measurement Status' },
            { key: 'measurement.siteAccess', label: 'Site Access' },
            { key: 'measurement.attachments', label: 'Site Photos / Measurement Attachment' },
            { key: 'measurement.roomList', label: 'Room List' },
            { key: 'measurement.drawings', label: 'Drawings / Layouts' },
            { key: 'measurement.pelmetDetails', label: 'Pelmet Details' },
            { key: 'measurement.channelDetails', label: 'Channel Details' },
            { key: 'measurement.motorDetails', label: 'Motor Details' },
            { key: 'measurement.wiringDetails', label: 'Wiring Details' },
            { key: 'measurement.notes', label: 'Measurements' },
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

const resolveUserName = (measuredBy, users = []) => {
    if (!measuredBy) return '—';
    if (typeof measuredBy === 'object' && measuredBy.name) return measuredBy.name;
    if (typeof measuredBy === 'string' && users.length > 0) {
        const found = users.find((u) => u._id === measuredBy || u.id === measuredBy);
        if (found?.name) return found.name;
    }
    return typeof measuredBy === 'string' ? measuredBy : (measuredBy?.name || '—');
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
    actualSiteVisitDateTime: (lead) => {
        const val = lead.actualSiteVisitDateTime;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap">{date(val, { time: true })}</span>;
    },
    'measurement.measuredBy': (lead, { users = [] } = {}) => (
        <span className="truncate block max-w-[130px] text-slate-700 dark:text-slate-300">{resolveUserName(lead.measurement?.measuredBy, users)}</span>
    ),
    'measurement.status': (lead) => {
        const st = lead.measurement?.status || 'PROVISIONAL';
        const tone = (st === 'FINAL' || st === 'Final' || st === 'COMPLETED') ? 'emerald' : (st === 'RE_MEASUREMENT_REQUIRED' || st === 'Re-measurement Required' || st === 'REVISIT_REQUIRED') ? 'rose' : (st === 'PROVISIONAL' || st === 'Provisional' || st === 'IN_PROGRESS' || st === 'PENDING') ? 'amber' : 'slate';
        const displayLabel = st === 'PROVISIONAL' ? 'Provisional' : st === 'FINAL' ? 'Final' : st === 'RE_MEASUREMENT_REQUIRED' ? 'Re-measurement Required' : st;
        return <Badge tone={tone}>{displayLabel}</Badge>;
    },
    'measurement.attachments': (lead) => {
        const atts = lead.measurement?.attachments || [];
        if (!atts.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[220px] py-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-400 font-medium shrink-0">
                    <Paperclip className="w-3 h-3 shrink-0" /> {atts.length} file(s)
                </span>
                {atts.slice(0, 2).map((att, i) => {
                    const src = getMediaUrl(att.url);
                    return (
                        <a
                            key={i}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:underline max-w-[90px] truncate"
                            title={att.filename || `File ${i + 1}`}
                        >
                            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                            <span className="truncate">{att.filename || `File ${i + 1}`}</span>
                        </a>
                    );
                })}
                {atts.length > 2 && (
                    <span className="text-[10px] text-slate-400 shrink-0">+{atts.length - 2} more</span>
                )}
            </div>
        );
    },
    'measurement.roomList': (lead) => {
        const val = lead.measurement?.roomList;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[180px] block" title={val}>{val}</span>;
    },
    'measurement.motorDetails': (lead) => {
        const val = lead.measurement?.motorDetails;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={val}>{val}</span>;
    },
    'measurement.wiringDetails': (lead) => {
        const val = lead.measurement?.wiringDetails;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block" title={val}>{val}</span>;
    },
    'measurement.notes': (lead) => {
        const val = lead.measurement?.notes;
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

/* ------------------------------------------------------------- Edit Measurement Modal */
const EditMeasurementModal = ({ item, onClose, onDone, users = [] }) => {
    const [form, setForm] = useState({
        dueDate: item?.measurement?.dueDate ? new Date(item.measurement.dueDate).toISOString().slice(0, 10) : '',
        date: item?.measurement?.date ? new Date(item.measurement.date).toISOString().slice(0, 10) : '',
        measuredBy: item?.measurement?.measuredBy?._id || item?.measurement?.measuredBy || '',
        status: item?.measurement?.status || 'PROVISIONAL',
        siteAccess: item?.measurement?.siteAccess || '',
        roomList: item?.measurement?.roomList || '',
        pelmetDetails: item?.measurement?.pelmetDetails || '',
        channelDetails: item?.measurement?.channelDetails || '',
        motorDetails: item?.measurement?.motorDetails || '',
        wiringDetails: item?.measurement?.wiringDetails || '',
        notes: item?.measurement?.notes || '',
    });

    const [attachments, setAttachments] = useState(item?.measurement?.attachments || []);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item.id || item._id, { measurement: payload }),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));

            const res = await uploadApi.upload(formData);
            const uploadedFiles = res.data || [];

            const formattedAttachments = uploadedFiles.map((file) => ({
                url: file.url,
                filename: file.filename || file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: file.uploadedAt || new Date().toISOString(),
                storage: file.storage || 's3',
            }));

            setAttachments((prev) => [...prev, ...formattedAttachments]);
        } catch (err) {
            console.error('Failed to upload media to S3:', err);
            setUploadError(err?.message || 'Failed to upload media to S3');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveAttachment = (indexToRemove) => {
        setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const submit = (e) => {
        e.preventDefault();
        execute({
            ...form,
            attachments,
            dueDate: form.dueDate || undefined,
            date: form.date || undefined,
            measuredBy: form.measuredBy || undefined,
        });
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Edit Measurement Details — ${item?.code || ''}`}
            subtitle={`Update site measurement capture details for ${item?.clientName || ''}`}
            size="lg"
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">{error?.message || String(error)}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Measurement Due Date">
                        <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>

                    <Field label="Measurement Date">
                        <Input type="date" value={form.date} onChange={set('date')} />
                    </Field>

                    <Field label="Measured By">
                        <Select
                            value={form.measuredBy}
                            onChange={set('measuredBy')}
                            options={[
                                { value: '', label: 'Select Team Member...' },
                                ...users.map((u) => ({ value: u._id || u.id, label: u.name || u.email }))
                            ]}
                        />
                    </Field>

                    <Field label="Measurement Status">
                        <Select
                            value={form.status}
                            onChange={set('status')}
                            options={[
                                { value: 'PROVISIONAL', label: 'Provisional' },
                                { value: 'FINAL', label: 'Final' },
                                { value: 'RE_MEASUREMENT_REQUIRED', label: 'Re-measurement Required' }
                            ]}
                        />
                    </Field>
                </div>

                <Field label="Site Access Details">
                    <Input value={form.siteAccess} onChange={set('siteAccess')} placeholder="Key contact, timing, security check, access permissions..." />
                </Field>

                <Field label="Room List">
                    <Input value={form.roomList} onChange={set('roomList')} placeholder="Master Bedroom, Living Room, Guest Room 1..." />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Pelmet Details">
                        <Input value={form.pelmetDetails} onChange={set('pelmetDetails')} placeholder="Wooden pelmet, size, profile..." />
                    </Field>

                    <Field label="Channel Details">
                        <Input value={form.channelDetails} onChange={set('channelDetails')} placeholder="Ceiling recessed, top mount..." />
                    </Field>

                    <Field label="Motor Details">
                        <Input value={form.motorDetails} onChange={set('motorDetails')} placeholder="Somfy, AC/DC, RF remote..." />
                    </Field>
                </div>

                <Field label="Wiring Details">
                    <Input value={form.wiringDetails} onChange={set('wiringDetails')} placeholder="Power point position, neutral wire available..." />
                </Field>

                <Field label="Measurements">
                    <Textarea value={form.notes} onChange={set('notes')} placeholder="Add any special site constraints, obstacles, height details, window measurements..." />
                </Field>

                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Paperclip className="w-4 h-4 text-brand-500" />
                            Site Photos / Measurement Attachments ({attachments.length})
                        </label>
                        <div>
                            <label
                                htmlFor="measurement-file-upload"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-600 hover:bg-brand-700 text-white cursor-pointer transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Uploading to S3...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Upload Media to S3</span>
                                    </>
                                )}
                            </label>
                            <input
                                id="measurement-file-upload"
                                type="file"
                                multiple
                                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                        </div>
                    </div>

                    {uploadError && (
                        <div className="p-2.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">
                            {uploadError}
                        </div>
                    )}

                    {attachments.length === 0 ? (
                        <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                No site photos or measurement attachments uploaded yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                            {attachments.map((att, i) => {
                                const mediaUrl = getMediaUrl(att.url);
                                const isImage = att.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename || att.url || '');
                                return (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg group hover:border-brand-500/50 transition"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                                            {isImage ? (
                                                <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                            )}
                                            <div className="truncate">
                                                <a
                                                    href={mediaUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 truncate block"
                                                    title={att.filename || `Attachment ${i + 1}`}
                                                >
                                                    {att.filename || `Attachment ${i + 1}`}
                                                </a>
                                                {att.storage && (
                                                    <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 dark:text-slate-500">
                                                        [{att.storage}]
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <a
                                                href={mediaUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                                                title="View file"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(i)}
                                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                                title="Remove attachment"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" type="submit" loading={pending}>Save Details</Button>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's4', onSectionChange, users = [] }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's4';
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
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} />
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

const MeasurementCapture = ({ items: itemsProp = [] }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);

    const { data: usersData } = useAsync(() => usersApi.list({ limit: 100 }).then((r) => r.data?.items || r.data || []), []);

    const reload = () => {
        setLoading(true);
        setError(null);
        handleFetchLeads()
            .catch((err) => setError(err?.message || 'Failed to fetch measurement data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const selectedSection = searchParams.get('section') || 's4';

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

    const visitedLeads = rawLeads.filter((lead) => Boolean(lead.actualSiteVisitDateTime));

    const filteredLeads = visitedLeads.filter((lead) => {
            console.log(lead.measurement)

        const mStatus = lead.measurement?.status || 'PROVISIONAL';
        if (statusFilter !== 'ALL' && mStatus !== statusFilter) return false;

        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const measuredBy = resolveUserName(lead.measurement?.measuredBy, usersData).toLowerCase();
            const roomList = String(lead.measurement?.roomList || '').toLowerCase();
            const motorDetails = String(lead.measurement?.motorDetails || '').toLowerCase();
            const wiringDetails = String(lead.measurement?.wiringDetails || '').toLowerCase();
            const notes = String(lead.measurement?.notes || '').toLowerCase();


            if (!code.includes(q) && !clientName.includes(q) && !measuredBy.includes(q) && !roomList.includes(q) && !motorDetails.includes(q) && !wiringDetails.includes(q) && !notes.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = visitedLeads.length;
    const completedCount = visitedLeads.filter((l) => l.measurement?.status === 'FINAL' || l.measurement?.status === 'COMPLETED' || l.measurement?.date).length;
    const pendingCount = visitedLeads.filter((l) => l.measurement?.status === 'PROVISIONAL' || l.measurement?.status === 'RE_MEASUREMENT_REQUIRED' || l.measurement?.status === 'PENDING').length;
    const siteAccessReady = visitedLeads.filter((l) => Boolean(l.measurement?.siteAccess)).length;

    return (
        <div>
            <PageHeader
                title="Measurement Capture (Site Details)"
                subtitle="Track on-site measurement schedules, measured-by assignments, site access, pelmet/channel/motor details, and layout drawings"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Measurement Leads" value={totalCount} sub="Active site pipeline" icon={Ruler} tone="teal" />
                <StatTile label="Completed Measurements" value={completedCount} sub="Site data captured" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Schedules" value={pendingCount} sub="Awaiting site visit" icon={Calendar} tone="amber" />
                <StatTile label="Site Access Specified" value={siteAccessReady} sub="Ready for technician" icon={ClipboardList} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client name, measured by..."
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
                                    { value: 'PROVISIONAL', label: 'Provisional' },
                                    { value: 'FINAL', label: 'Final' },
                                    { value: 'RE_MEASUREMENT_REQUIRED', label: 'Re-measurement Required' },
                                ]}
                                className="w-48 text-xs"
                            />
                        </div>

                        {(statusFilter !== 'ALL' || search || selectedSection !== 's4') && (
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
                    <Loading text="Loading Measurement Details..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={Ruler} title="No Measurement Records Found" hint="Try adjusting search or status filters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's4')}
                    users={usersData}
                />
            )}

            {editingLead && (
                <EditMeasurementModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                    users={usersData || []}
                />
            )}
        </div>
    );
};

export default MeasurementCapture;

