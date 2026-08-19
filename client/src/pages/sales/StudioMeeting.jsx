import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Users, Calendar, Sparkles, Paperclip, CheckCircle2, Pen, Upload, Loader2, Trash2, ExternalLink, Image as ImageIcon, FileText } from 'lucide-react';
import { date, getMediaUrl } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, uploadApi } from '../../api';
import { useAction } from '../../hooks/useAsync';


const SPREADSHEET_SECTIONS = [
    {
        id: 's5',
        title: 'Studio Meeting',
        color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/90 dark:text-purple-200 dark:border-purple-700/80',
        cols: [
            { key: 'studioMeeting.dueDate', label: 'Studio Meeting Date' },
            { key: 'studioMeeting.date', label: 'Meeting Date' },
            { key: 'studioMeeting.attendees', label: 'Meeting Attendees' },
            { key: 'studioMeeting.clientDrawings', label: 'Client Drawings' },
            { key: 'studioMeeting.feedback', label: 'Client Feedback/Meeting Outcome' },
            { key: 'studioMeeting.nextAction', label: 'Next Action from the meeting' },
            { key: 'studioMeeting.architectBrief', label: 'Architect Brief' },
            { key: 'studioMeeting.samples', label: 'Samples' },
            { key: 'studioMeeting.projectPictures', label: 'Project Pictures' },
            { key: 'studioMeeting.pricingRange', label: 'Pricing Range' },
            { key: 'readySize.roomReadiness', label: 'Meeting Room Readiness' },
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

const AttachmentUploaderField = ({ label, attachments = [], onUpdate, idPrefix }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

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

            onUpdate([...attachments, ...formattedAttachments]);
        } catch (err) {
            console.error('Failed to upload files:', err);
            setUploadError(err?.message || 'Failed to upload file(s)');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemove = (indexToRemove) => {
        onUpdate(attachments.filter((_, idx) => idx !== indexToRemove));
    };

    return (
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-brand-500" />
                    {label} ({attachments.length})
                </label>
                <div>
                    <label
                        htmlFor={`file-upload-${idPrefix}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-brand-600 hover:bg-brand-700 text-white cursor-pointer transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-3 h-3" />
                                <span>Upload Media</span>
                            </>
                        )}
                    </label>
                    <input
                        id={`file-upload-${idPrefix}`}
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
                <div className="p-2 text-[11px] bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded">
                    {uploadError}
                </div>
            )}

            {attachments.length === 0 ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">No {label.toLowerCase()} uploaded yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {attachments.map((att, i) => {
                        const mediaUrl = getMediaUrl(att.url);
                        const isImage = att.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename || att.url || '');
                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded group hover:border-brand-500/50 transition text-xs"
                            >
                                <div className="flex items-center gap-1.5 overflow-hidden mr-1">
                                    {isImage ? (
                                        <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    ) : (
                                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    )}
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] font-medium text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 truncate"
                                        title={att.filename || `File ${i + 1}`}
                                    >
                                        {att.filename || `File ${i + 1}`}
                                    </a>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 text-slate-400 hover:text-brand-600 transition"
                                        title="View"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(i)}
                                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const EditStudioMeetingModal = ({ item, onClose, onDone }) => {
    const [form, setForm] = useState({
        dueDate: item?.studioMeeting?.dueDate ? new Date(item.studioMeeting.dueDate).toISOString().slice(0, 10) : '',
        date: item?.studioMeeting?.date ? new Date(item.studioMeeting.date).toISOString().slice(0, 10) : '',
        attendees: item?.studioMeeting?.attendees || '',
        feedback: item?.studioMeeting?.feedback || '',
        nextAction: item?.studioMeeting?.nextAction || '',
        architectBrief: item?.studioMeeting?.architectBrief || '',
        pricingRange: item?.studioMeeting?.pricingRange || '',
        roomReadiness: item?.readySize?.roomReadiness || '',
    });

    const [clientDrawings, setClientDrawings] = useState(item?.studioMeeting?.clientDrawings || []);
    const [samples, setSamples] = useState(item?.studioMeeting?.samples || []);
    const [projectPictures, setProjectPictures] = useState(item?.studioMeeting?.projectPictures || []);

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
            studioMeeting: {
                ...(item?.studioMeeting || {}),
                dueDate: form.dueDate || undefined,
                date: form.date || undefined,
                attendees: form.attendees || undefined,
                feedback: form.feedback || undefined,
                nextAction: form.nextAction || undefined,
                architectBrief: form.architectBrief || undefined,
                pricingRange: form.pricingRange || undefined,
                clientDrawings,
                samples,
                projectPictures,
            },
            readySize: {
                ...(item?.readySize || {}),
                roomReadiness: form.roomReadiness || undefined,
            }
        });
    };

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Edit Studio Meeting — ${item?.code || ''}`}
            subtitle={`Update studio meeting details for ${item?.clientName || ''}`}
            size="lg"
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">{error?.message || String(error)}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Studio Meeting Date">
                        <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>

                    <Field label="Meeting Date">
                        <Input type="date" value={form.date} onChange={set('date')} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Meeting Attendees">
                        <Input value={form.attendees} onChange={set('attendees')} placeholder="Client, Architect, DCM..." />
                    </Field>

                    <Field label="Meeting Room Readiness">
                        <Input value={form.roomReadiness} onChange={set('roomReadiness')} placeholder="Ready, In Progress, Pending..." />
                    </Field>

                    <Field label="Pricing Range">
                        <Input value={form.pricingRange} onChange={set('pricingRange')} placeholder="₹2,00,000 - ₹3,50,000" />
                    </Field>
                </div>

                <Field label="Client Feedback / Meeting Outcome">
                    <Textarea value={form.feedback} onChange={set('feedback')} placeholder="Enter client feedback, outcome, notes from the meeting..." />
                </Field>

                <Field label="Next Action from the meeting">
                    <Textarea value={form.nextAction} onChange={set('nextAction')} placeholder="Specify next action items post-meeting..." />
                </Field>

                <Field label="Architect Brief">
                    <Textarea value={form.architectBrief} onChange={set('architectBrief')} placeholder="Architect specifications, layout notes, design preferences..." />
                </Field>

                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <AttachmentUploaderField
                        label="Client Drawings"
                        attachments={clientDrawings}
                        onUpdate={setClientDrawings}
                        idPrefix="drawings"
                    />

                    <AttachmentUploaderField
                        label="Samples"
                        attachments={samples}
                        onUpdate={setSamples}
                        idPrefix="samples"
                    />

                    <AttachmentUploaderField
                        label="Project Pictures"
                        attachments={projectPictures}
                        onUpdate={setProjectPictures}
                        idPrefix="pictures"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" type="submit" loading={pending}>Save Details</Button>
                </div>
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's5', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's5';
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
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} />
                                        <Button size="sm" variant="ghost" icon={Pen} onClick={() => onEdit(lead)} />
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

const StudioMeeting = ({ items: itemsProp = [] }) => {
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
            .catch((err) => setError(err?.message || 'Failed to fetch studio meeting data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's5';

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

    const measuredLeads = rawLeads.filter((lead) => {
        if (!lead?.measurement) return false;
        const m = lead.measurement;
        const status = String(m.status || '').toUpperCase();
        return Boolean(
            m.date ||
            m.measuredBy ||
            (status && status !== 'PENDING' && status !== 'SCHEDULED') ||
            m.roomList ||
            m.notes ||
            m.pelmetDetails ||
            m.channelDetails ||
            m.motorDetails ||
            m.wiringDetails ||
            (Array.isArray(m.attachments) && m.attachments.length > 0) ||
            (Array.isArray(m.drawings) && m.drawings.length > 0)
        );
    });

    const filteredLeads = measuredLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const attendees = String(lead.studioMeeting?.attendees || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !attendees.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = measuredLeads.length;
    const completedMeetings = measuredLeads.filter((l) => l.studioMeeting?.date).length;
    const scheduledMeetings = measuredLeads.filter((l) => l.studioMeeting?.dueDate && !l.studioMeeting?.date).length;
    const samplesShown = measuredLeads.filter((l) => Boolean(l.studioMeeting?.samples)).length;

    return (
        <div>
            <PageHeader
                title="Studio Meeting Management"
                subtitle="Manage client & architect studio sessions, attendees, client drawings, studio feedback, sample presentations, and pricing guidance"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Total Studio Pipeline" value={totalCount} sub="Leads in studio workflow" icon={Users} tone="violet" />
                <StatTile label="Completed Meetings" value={completedMeetings} sub="Sessions held" icon={CheckCircle2} tone="green" />
                <StatTile label="Scheduled Meetings" value={scheduledMeetings} sub="Upcoming studio visits" icon={Calendar} tone="amber" />
                <StatTile label="Samples Presented" value={samplesShown} sub="Material samples shown" icon={Sparkles} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, attendees..."
                            className="pl-9"
                        />
                    </div>


                    {(search || selectedSection !== 's5') && (
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
                    <Loading text="Loading Studio Meetings..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={Users} title="No Studio Meeting Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's5')}
                />
            )}

            {editingLead && (
                <EditStudioMeetingModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default StudioMeeting;

