import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, Users, Calendar, Sparkles, Paperclip, CheckCircle2, Pen, Upload, Loader2,
    Trash2, ExternalLink, Image as ImageIcon, FileText, Link as LinkIcon, Plus, X, AlertTriangle, Check, DollarSign, Tag, Clock
} from 'lucide-react';
import { date, getMediaUrl } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, uploadApi, usersApi, architectsApi, fabricsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';
import DetailedDrawer from '../../components/sales/DetailedDrawer';

const SPREADSHEET_SECTIONS = [
    {
        id: 's5',
        title: 'Studio Meeting',
        color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/90 dark:text-purple-200 dark:border-purple-700/80',
        cols: [
            { key: 'studioMeeting.dueDate', label: 'Studio Meeting Due Date' },
            { key: 'studioMeeting.date', label: 'Actual Meeting Date & Time' },
            { key: 'studioMeeting.attendees', label: 'Meeting Attendees' },
            { key: 'studioMeeting.clientDrawings', label: 'Client Drawings' },
            { key: 'studioMeeting.feedback', label: 'Client Feedback / Outcome' },
            { key: 'studioMeeting.nextAction', label: 'Next Action from Meeting' },
            { key: 'studioMeeting.architectBrief', label: 'Architect Brief' },
            { key: 'studioMeeting.samples', label: 'Samples' },
            { key: 'studioMeeting.projectPictures', label: 'Project Pictures' },
            { key: 'studioMeeting.pricingRange', label: 'Pricing Range' },
            { key: 'readySize.roomReadiness', label: 'Meeting Room Readiness' },
        ]
    }
];

const NEXT_ACTION_MASTER = [
    'Send Revised Proposal & BOQ',
    'Sample Approval & Fabric Sign-off',
    'Schedule Site Re-visit / Final Measurement',
    'Token Amount Collection',
    'Client Review & Decision Pending',
    'Architect Technical Discussion',
    'Final Commercial Negotiation',
    'No Further Action / Lead On Hold',
    'Other'
];

const ROOM_READINESS_OPTIONS = [
    { value: 'Ready', label: 'Ready', tone: 'emerald' },
    { value: 'Partially Ready', label: 'Partially Ready', tone: 'amber' },
    { value: 'Not Ready', label: 'Not Ready', tone: 'rose' }
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

const parseAttachmentsOrLinks = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    if (typeof raw === 'string' && raw.trim()) {
        return raw.split(',').map((s, idx) => ({
            url: s.trim(),
            filename: s.trim(),
            mimetype: s.includes('http') || s.includes('www.') ? 'link' : 'file'
        }));
    }
    return [];
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
    'studioMeeting.dueDate': (lead) => {
        const val = lead.studioMeeting?.dueDate;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const isOverdue = !lead.studioMeeting?.date && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Overdue" />}
            </div>
        );
    },
    'studioMeeting.date': (lead) => {
        const val = lead.studioMeeting?.date;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                {date(val, { time: true })}
            </span>
        );
    },
    'studioMeeting.attendees': (lead) => {
        const val = lead.studioMeeting?.attendees;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const list = typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(val) ? val : [];
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-center" title={list.join(', ')}>
                {list.slice(0, 2).map((item, idx) => (
                    <Badge key={idx} tone="purple" className="text-[10px] max-w-[100px] truncate">
                        {item}
                    </Badge>
                ))}
                {list.length > 2 && <Badge tone="slate" className="text-[9px]">+{list.length - 2}</Badge>}
            </div>
        );
    },
    'studioMeeting.clientDrawings': (lead) => {
        const list = parseAttachmentsOrLinks(lead.studioMeeting?.clientDrawings);
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-400 font-medium">
                <Paperclip className="w-3 h-3 shrink-0" /> {list.length} file/link(s)
            </span>
        );
    },
    'studioMeeting.feedback': (lead) => {
        const val = lead.studioMeeting?.feedback;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={val}>
                {val}
            </span>
        );
    },
    'studioMeeting.nextAction': (lead) => {
        const val = lead.studioMeeting?.nextAction;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <Badge tone="indigo" className="max-w-[160px] truncate" title={val}>
                {val}
            </Badge>
        );
    },
    'studioMeeting.architectBrief': (lead) => {
        const val = lead.studioMeeting?.architectBrief;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={val}>
                {val}
            </span>
        );
    },
    'studioMeeting.samples': (lead) => {
        const val = lead.studioMeeting?.samples;
        const list = parseAttachmentsOrLinks(val);
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium">
                <Sparkles className="w-3 h-3 shrink-0" /> {list.length} item(s)
            </span>
        );
    },
    'studioMeeting.projectPictures': (lead) => {
        const list = parseAttachmentsOrLinks(lead.studioMeeting?.projectPictures);
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium">
                <ImageIcon className="w-3 h-3 shrink-0" /> {list.length} image(s)
            </span>
        );
    },
    'studioMeeting.pricingRange': (lead) => {
        const val = lead.studioMeeting?.pricingRange;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                {val}
            </span>
        );
    },
    'readySize.roomReadiness': (lead) => {
        const val = lead.readySize?.roomReadiness || lead.studioMeeting?.roomReadiness;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        let tone = 'slate';
        if (val === 'Ready') tone = 'emerald';
        else if (val === 'Partially Ready') tone = 'amber';
        else if (val === 'Not Ready') tone = 'rose';
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

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto text-xs" title={String(raw)}>{String(raw)}</span>;
};

/* ------------------------------------------------------------- File & Link Uploader Component */
const AttachmentAndLinkUploader = ({ label, allowLinks = true, allowImagesOnly = false, attachments = [], onUpdate, idPrefix }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');

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

    const handleAddLink = () => {
        if (!linkUrl.trim()) return;
        const title = linkTitle.trim() || linkUrl.trim();
        const newLink = {
            url: linkUrl.trim(),
            filename: title,
            mimetype: 'link/url',
            uploadedAt: new Date().toISOString(),
            isLink: true
        };
        onUpdate([...attachments, newLink]);
        setLinkUrl('');
        setLinkTitle('');
        setShowLinkInput(false);
    };

    const handleRemove = (indexToRemove) => {
        onUpdate(attachments.filter((_, idx) => idx !== indexToRemove));
    };

    return (
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {allowImagesOnly ? (
                        <ImageIcon className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <Paperclip className="w-4 h-4 text-brand-500" />
                    )}
                    {label} ({attachments.length})
                </label>
                <div className="flex items-center gap-1.5">
                    {allowLinks && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            icon={LinkIcon}
                            onClick={() => setShowLinkInput(!showLinkInput)}
                            className="text-xs"
                        >
                            Add Link
                        </Button>
                    )}
                    <label
                        htmlFor={`file-upload-${idPrefix}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-brand-600 hover:bg-brand-700 text-white cursor-pointer transition shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>{allowImagesOnly ? 'Upload Images' : 'Upload Files'}</span>
                            </>
                        )}
                    </label>
                    <input
                        id={`file-upload-${idPrefix}`}
                        type="file"
                        multiple
                        accept={allowImagesOnly ? 'image/*' : 'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx'}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </div>
            </div>

            {showLinkInput && allowLinks && (
                <div className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                            size="sm"
                            placeholder="Link Title (e.g. Google Drive, Figma, Render)"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                        />
                        <Input
                            size="sm"
                            placeholder="https://drive.google.com/..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" type="button" onClick={() => setShowLinkInput(false)}>Cancel</Button>
                        <Button size="sm" variant="secondary" type="button" icon={Plus} onClick={handleAddLink}>Attach Link</Button>
                    </div>
                </div>
            )}

            {uploadError && (
                <div className="p-2 text-[11px] bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-md">
                    {uploadError}
                </div>
            )}

            {attachments.length === 0 ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">No {label.toLowerCase()} added yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {attachments.map((att, i) => {
                        const isLink = att.isLink || att.mimetype === 'link/url' || (att.url && (att.url.startsWith('http') || att.url.startsWith('www')));
                        const mediaUrl = isLink ? att.url : getMediaUrl(att.url);
                        const isImage = !isLink && (att.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename || att.url || ''));

                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg group hover:border-brand-500/50 transition text-xs"
                            >
                                <div className="flex items-center gap-2 overflow-hidden mr-1">
                                    {isLink ? (
                                        <LinkIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    ) : isImage ? (
                                        <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    ) : (
                                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    )}
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] font-medium text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 truncate"
                                        title={att.filename || `Item ${i + 1}`}
                                    >
                                        {att.filename || `Item ${i + 1}`}
                                    </a>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 text-slate-400 hover:text-brand-600 transition"
                                        title="View/Open"
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

/* ------------------------------------------------------------- Edit Studio Meeting Modal */
const EditStudioMeetingModal = ({ item, onClose, onDone, usersList = [], architectsList = [], fabricsList = [] }) => {
    const isMeetingInitiallyPlanned = Boolean(item?.studioMeeting?.dueDate);

    // Initial Attendees parse
    const initialAttendees = (() => {
        const raw = item?.studioMeeting?.attendees;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    })();

    // Initial Next Action parse
    const initialNextAction = item?.studioMeeting?.nextAction || '';
    const isCustomNextAction = Boolean(initialNextAction && !NEXT_ACTION_MASTER.includes(initialNextAction));

    // Initial Pricing Range parse (e.g. "₹2,00,000 - ₹3,50,000" or "200000 - 350000")
    const initialPricing = (() => {
        const raw = item?.studioMeeting?.pricingRange || '';
        if (!raw) return { min: '', max: '' };
        const cleaned = raw.replace(/₹/g, '').replace(/,/g, '');
        const parts = cleaned.split('-').map((s) => s.trim());
        return {
            min: parts[0] || '',
            max: parts[1] || ''
        };
    })();

    const [isPlanned, setIsPlanned] = useState(isMeetingInitiallyPlanned || true);
    const [dueDate, setDueDate] = useState(item?.studioMeeting?.dueDate ? new Date(item.studioMeeting.dueDate).toISOString().slice(0, 10) : '');
    const [actualDate, setActualDate] = useState(item?.studioMeeting?.date ? new Date(item.studioMeeting.date).toISOString().slice(0, 16) : '');
    const [attendees, setAttendees] = useState(initialAttendees);
    const [customAttendeeInput, setCustomAttendeeInput] = useState('');
    const [attendeeSearch, setAttendeeSearch] = useState('');

    const [clientDrawings, setClientDrawings] = useState(parseAttachmentsOrLinks(item?.studioMeeting?.clientDrawings));
    const [feedback, setFeedback] = useState(item?.studioMeeting?.feedback || '');

    const [nextActionSelected, setNextActionSelected] = useState(isCustomNextAction ? 'Other' : (initialNextAction || 'Send Revised Proposal & BOQ'));
    const [nextActionCustom, setNextActionCustom] = useState(isCustomNextAction ? initialNextAction : '');

    const [architectBrief, setArchitectBrief] = useState(item?.studioMeeting?.architectBrief || '');

    // Samples Lookup & Attachments
    const [samples, setSamples] = useState(parseAttachmentsOrLinks(item?.studioMeeting?.samples));
    const [sampleSearch, setSampleSearch] = useState('');
    const [customSampleInput, setCustomSampleInput] = useState('');

    const [projectPictures, setProjectPictures] = useState(parseAttachmentsOrLinks(item?.studioMeeting?.projectPictures));
    const [pricingMin, setPricingMin] = useState(initialPricing.min);
    const [pricingMax, setPricingMax] = useState(initialPricing.max);

    const [roomReadiness, setRoomReadiness] = useState(item?.readySize?.roomReadiness || item?.studioMeeting?.roomReadiness || 'Ready');

    const [validationError, setValidationError] = useState('');

    const { execute, pending, error: apiError } = useAction(
        (payload) => leadsApi.update(item.id || item._id, payload),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    // Toggle Attendee
    const toggleAttendee = (name) => {
        setAttendees((prev) => {
            if (prev.includes(name)) return prev.filter((x) => x !== name);
            return [...prev, name];
        });
    };

    const handleAddCustomAttendee = () => {
        const val = customAttendeeInput.trim();
        if (!val) return;
        if (!attendees.includes(val)) {
            setAttendees((prev) => [...prev, val]);
        }
        setCustomAttendeeInput('');
    };

    const handleAddSampleTag = (sampleName) => {
        const title = sampleName.trim();
        if (!title) return;
        const exists = samples.some((s) => (s.filename || s.url) === title);
        if (!exists) {
            setSamples((prev) => [...prev, { filename: title, url: title, mimetype: 'sample/text' }]);
        }
        setCustomSampleInput('');
    };

    const submit = (e) => {
        e.preventDefault();
        setValidationError('');

        // 1. Studio Meeting Due Date: Required once a studio meeting is planned
        if (isPlanned && !dueDate) {
            setValidationError('Studio Meeting Due Date is required once a studio meeting is planned.');
            return;
        }

        // Pricing range formatting
        let formattedPricingRange = undefined;
        if (pricingMin || pricingMax) {
            const minStr = pricingMin ? `₹${Number(pricingMin).toLocaleString('en-IN')}` : '';
            const maxStr = pricingMax ? `₹${Number(pricingMax).toLocaleString('en-IN')}` : '';
            if (minStr && maxStr) formattedPricingRange = `${minStr} - ${maxStr}`;
            else formattedPricingRange = minStr || maxStr;
        }

        // Next Action calculation
        const finalNextAction = nextActionSelected === 'Other' ? nextActionCustom.trim() : nextActionSelected;

        // Attendees string
        const attendeesString = attendees.join(', ');

        execute({
            studioMeeting: {
                ...(item?.studioMeeting || {}),
                dueDate: isPlanned ? (dueDate || undefined) : undefined,
                date: actualDate || undefined,
                attendees: attendeesString || undefined,
                feedback: feedback || undefined,
                nextAction: finalNextAction || undefined,
                architectBrief: architectBrief || undefined,
                pricingRange: formattedPricingRange || undefined,
                roomReadiness: roomReadiness || undefined,
                clientDrawings,
                samples,
                projectPictures,
            },
            readySize: {
                ...(item?.readySize || {}),
                roomReadiness: roomReadiness || undefined,
            }
        });
    };

    // Candidate attendees list
    const defaultAttendees = [
        item?.clientName ? `${item.clientName} (Client)` : null,
        item?.contactPerson ? `${item.contactPerson} (Contact)` : null,
        item?.architectName ? `${item.architectName} (Architect)` : null,
    ].filter(Boolean);

    const userAttendees = usersList.map((u) => `${u.name || u.email} (${u.role || 'Internal'})`);
    const architectAttendees = architectsList.map((a) => `${a.name} (Architect)`);
    const allCandidateAttendees = Array.from(new Set([...defaultAttendees, ...userAttendees, ...architectAttendees]));

    const filteredAttendees = allCandidateAttendees.filter((name) => {
        if (!attendeeSearch) return true;
        return name.toLowerCase().includes(attendeeSearch.toLowerCase());
    });

    // Sample lookup candidate options
    const fabricOptions = (fabricsList || []).map((f) => f.name || f.code || f.title).filter(Boolean);
    const candidateSamples = Array.from(new Set([...fabricOptions, 'Silk Velvet Swatch', 'Motorized Sheer Track', 'Blackout Roller Blind', 'Linen Sheer Sample', 'Acoustic Panel Sample']));

    const filteredCandidateSamples = candidateSamples.filter((s) => {
        if (!sampleSearch) return true;
        return s.toLowerCase().includes(sampleSearch.toLowerCase());
    });

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Studio Meeting Details — ${item?.code || ''}`}
            subtitle={`Configure studio meeting details & specifications for ${item?.clientName || ''}`}
            size="xl"
        >
            <form onSubmit={submit} className="space-y-6">
                {(validationError || apiError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError || (apiError?.message || String(apiError))}</span>
                    </div>
                )}

                {/* Section 1: Dates & Readiness */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <div className="md:col-span-3 flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPlanned}
                                onChange={(e) => setIsPlanned(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>Studio Meeting Planned</span>
                        </label>
                    </div>

                    <Field label="Studio Meeting Due Date" required={isPlanned}>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            disabled={!isPlanned}
                        />
                    </Field>

                    <Field label="Actual Meeting Date & Time">
                        <Input
                            type="datetime-local"
                            value={actualDate}
                            onChange={(e) => setActualDate(e.target.value)}
                        />
                    </Field>

                    <Field label="Meeting Room Readiness">
                        <Select
                            value={roomReadiness}
                            onChange={(e) => setRoomReadiness(e.target.value)}
                            options={ROOM_READINESS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                        />
                    </Field>
                </div>

                {/* Section 2: Meeting Attendees (Multi-select) */}
                <Field label="Meeting Attendees" >
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        {/* Selected Attendees Badges */}
                        {attendees.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                {attendees.map((name) => (
                                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                        <Users className="w-3 h-3 text-purple-500 shrink-0" />
                                        <span>{name}</span>
                                        <button type="button" onClick={() => toggleAttendee(name)} className="text-purple-400 hover:text-rose-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <Input
                                    size="sm"
                                    value={attendeeSearch}
                                    onChange={(e) => setAttendeeSearch(e.target.value)}
                                    placeholder="Search attendees (client, architect, team)..."
                                    className="pl-8 text-xs"
                                />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Input
                                    size="sm"
                                    value={customAttendeeInput}
                                    onChange={(e) => setCustomAttendeeInput(e.target.value)}
                                    placeholder="Add custom attendee..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCustomAttendee();
                                        }
                                    }}
                                />
                                <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={handleAddCustomAttendee}>Add</Button>
                            </div>
                        </div>

                        {/* Searchable Options Checklist */}
                        <div className="max-h-36 overflow-y-auto p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                            {filteredAttendees.length === 0 ? (
                                <div className="text-xs text-slate-400 py-2 text-center">No matching attendees found</div>
                            ) : (
                                filteredAttendees.map((name) => {
                                    const isSelected = attendees.includes(name);
                                    return (
                                        <label key={name} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs">
                                            <span className="text-slate-700 dark:text-slate-200 font-medium">{name}</span>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleAttendee(name)}
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                            />
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </Field>

                {/* Section 3: Next Action & Pricing Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Next Action */}
                    <Field label="Next Action from the Meeting">
                        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                            <Select
                                value={nextActionSelected}
                                onChange={(e) => setNextActionSelected(e.target.value)}
                                options={NEXT_ACTION_MASTER.map((act) => ({ value: act, label: act }))}
                            />
                            {nextActionSelected === 'Other' && (
                                <Input
                                    size="sm"
                                    placeholder="Specify custom next action details..."
                                    value={nextActionCustom}
                                    onChange={(e) => setNextActionCustom(e.target.value)}
                                />
                            )}
                        </div>
                    </Field>

                    {/* Pricing Range */}
                    <Field label="Pricing Range (₹)">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Min Price (₹)</label>
                                    <Input
                                        type="number"
                                        size="sm"
                                        placeholder="e.g. 200000"
                                        value={pricingMin}
                                        onChange={(e) => setPricingMin(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Max Price (₹)</label>
                                    <Input
                                        type="number"
                                        size="sm"
                                        placeholder="e.g. 350000"
                                        value={pricingMax}
                                        onChange={(e) => setPricingMax(e.target.value)}
                                    />
                                </div>
                            </div>
                            {(pricingMin || pricingMax) && (
                                <div className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 pt-1">
                                    Range: {pricingMin ? `₹${Number(pricingMin).toLocaleString('en-IN')}` : '₹0'} – {pricingMax ? `₹${Number(pricingMax).toLocaleString('en-IN')}` : 'Open'}
                                </div>
                            )}
                        </div>
                    </Field>
                </div>

                {/* Section 4: Samples Searchable Multi-Select Lookup */}
                <Field label="Samples Presented">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <Input
                                    size="sm"
                                    value={sampleSearch}
                                    onChange={(e) => setSampleSearch(e.target.value)}
                                    placeholder="Search sample / fabric catalogue..."
                                    className="pl-8 text-xs"
                                />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Input
                                    size="sm"
                                    value={customSampleInput}
                                    onChange={(e) => setCustomSampleInput(e.target.value)}
                                    placeholder="Add custom sample tag..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSampleTag(customSampleInput);
                                        }
                                    }}
                                />
                                <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => handleAddSampleTag(customSampleInput)}>Add</Button>
                            </div>
                        </div>

{/* Samples	Searchable => multi-select lookup => Select from sample/catalogue master */}

                        {/* Catalogue Master Lookup Badges */}
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            {filteredCandidateSamples.map((samp) => {
                                const isSelected = samples.some((s) => (s.filename || s.url) === samp);
                                return (
                                    <button
                                        key={samp}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                setSamples((prev) => prev.filter((s) => (s.filename || s.url) !== samp));
                                            } else {
                                                handleAddSampleTag(samp);
                                            }
                                        }}
                                        className={`px-2 py-1 rounded text-xs font-medium transition ${isSelected
                                            ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                        {samp}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Samples Attachments */}
                        <AttachmentAndLinkUploader
                            label="Sample Swatches & Photos"
                            attachments={samples}
                            onUpdate={setSamples}
                            idPrefix="samples-upload"
                            allowLinks={true}
                        />
                    </div>
                </Field>

                {/* Section 5: Long Free Text Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Client Feedback / Meeting Outcome">
                        <Textarea
                            rows={4}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Enter detailed client feedback, meeting outcomes, product preferences, decisions reached..."
                        />
                    </Field>

                    <Field label="Architect Brief">
                        <Textarea
                            rows={4}
                            value={architectBrief}
                            onChange={(e) => setArchitectBrief(e.target.value)}
                            placeholder="Enter detailed architect specifications, drawing notes, design guidance, structural constraints..."
                        />
                    </Field>
                </div>

                {/* Section 6: File & Image Uploaders */}
                <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <AttachmentAndLinkUploader
                        label="Client Drawings"
                        attachments={clientDrawings}
                        onUpdate={setClientDrawings}
                        idPrefix="drawings"
                        allowLinks={true}
                    />

                    <AttachmentAndLinkUploader
                        label="Project Pictures"
                        allowImagesOnly={true}
                        attachments={projectPictures}
                        onUpdate={setProjectPictures}
                        idPrefix="pictures"
                        allowLinks={true}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button variant="primary" type="submit" loading={pending}>Save Studio Meeting</Button>
                </div>
            </form>
        </Modal>
    );
};

/* ------------------------------------------------------------- Spreadsheet Grid View */
const SpreadsheetGridView = ({ items, onView, onEdit, onRowClick, selectedSection = 's5', onSectionChange }) => {
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
                                    <th key={col.key} className="border-b border-r border-amber-300/40 dark:border-slate-800/80 p-2 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[140px] bg-[#836444] dark:bg-slate-900/90">
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
                                    sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                        <td key={col.key} className="p-4 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); onView(lead); }} title="View Details" />
                                        <Button size="sm" variant="ghost" icon={Pen} onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Edit Studio Meeting" />
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

/* ------------------------------------------------------------- Main Component */
const StudioMeeting = ({ items: itemsProp = [] }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleFetchLeads } = useSales();
    const salesLeads = useSelector((state) => state.sales?.leads);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [drawerLead, setDrawerLead] = useState(null);

    const [usersList, setUsersList] = useState([]);
    const [architectsList, setArchitectsList] = useState([]);
    const [fabricsList, setFabricsList] = useState([]);

    const reload = () => {
        setLoading(true);
        setError(null);

        Promise.all([
            handleFetchLeads(),
            usersApi.list({ limit: 100 }).then((res) => res.data?.items || res.data || []).catch(() => []),
            architectsApi.list({ limit: 100 }).then((res) => res.data?.items || res.data || []).catch(() => []),
            fabricsApi.list({ limit: 100 }).then((res) => res.data?.items || res.data || []).catch(() => [])
        ])
            .then(([_, users, architects, fabrics]) => {
                setUsersList(users);
                setArchitectsList(architects);
                setFabricsList(fabrics);
            })
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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=studio-meeting`);
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
            (Array.isArray(m.drawings) && m.drawings.length > 0) ||
            lead.studioMeeting?.dueDate ||
            lead.studioMeeting?.date
        );
    });

    const filteredLeads = measuredLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const attendees = String(lead.studioMeeting?.attendees || '').toLowerCase();
            const nextAction = String(lead.studioMeeting?.nextAction || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !attendees.includes(q) && !nextAction.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = measuredLeads.length;
    const completedMeetings = measuredLeads.filter((l) => l.studioMeeting?.date).length;
    const scheduledMeetings = measuredLeads.filter((l) => l.studioMeeting?.dueDate && !l.studioMeeting?.date).length;
    const samplesShown = measuredLeads.filter((l) => parseAttachmentsOrLinks(l.studioMeeting?.samples).length > 0).length;

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
                            placeholder="Search code, client, attendees, next action..."
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
                    onRowClick={(lead) => setDrawerLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's5')}
                />
            )}

            {editingLead && (
                <EditStudioMeetingModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                    usersList={usersList}
                    architectsList={architectsList}
                    fabricsList={fabricsList}
                />
            )}

            <DetailedDrawer
                open={Boolean(drawerLead)}
                lead={drawerLead}
                onClose={() => setDrawerLead(null)}
                onViewFull={handleViewLead}
            />
        </div>
    );
};

export default StudioMeeting;


