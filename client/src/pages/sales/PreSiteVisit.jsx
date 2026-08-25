import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Eye, Pencil, MapPin, Calendar, UserCheck, Paperclip, ClipboardList, CheckCircle2, Clock,
    Plus, Trash2, Upload, Link as LinkIcon, X, AlertTriangle, FileText, Check, Layers, Home, Loader2
} from 'lucide-react';
import { leadsApi, usersApi, uploadApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { date, getMediaUrl } from '../../utils/format';
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
            { key: 'actualSiteVisitDateTime', label: 'Actual Site Visit Date & Time' },
            { key: 'assignedInstaller', label: 'Assigned Installer / Measurement Person' },
            { key: 'clientArchitectAvailability', label: 'Client / Architect Availability' },
            { key: 'scope', label: 'Scope' },
            { key: 'rooms', label: 'Rooms' },
            { key: 'drawingsRenders', label: 'Drawings / Renders' },
            { key: 'installerAvailability', label: 'Installer Availability' },
        ]
    }
];

const APPROVED_SCOPE_MASTER = [
    'Curtains',
    'Blinds',
    'Motorization',
    'Wallpapers',
    'Upholstery',
    'Mattresses',
    'Shutters',
    'Awnings',
    'Acoustic Panels',
    'Other'
];

const INITIAL_ROOM_MASTER = [
    'Living Room',
    'Master Bedroom',
    'Bedroom 2',
    'Bedroom 3',
    'Guest Bedroom',
    'Dining Room',
    'Kitchen',
    'Home Theatre',
    'Balcony',
    'Study / Office'
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

const parseAvailabilitySlots = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    const str = String(raw);
    const parts = str.split(';').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
        return parts.map((p, idx) => {
            if (p.includes(':')) {
                const [d, t] = p.split(':');
                return { id: String(idx + 1), date: d ? d.trim() : '', timeSlot: t ? t.trim() : '' };
            }
            return { id: String(idx + 1), date: '', timeSlot: p };
        });
    }
    return [{ id: '1', date: '', timeSlot: str }];
};

const parseAttachments = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    if (typeof raw === 'string' && raw.trim()) {
        return raw.split(',').map((s, idx) => ({
            id: String(idx + 1),
            name: s.trim(),
            url: s.trim(),
            type: s.includes('http') || s.includes('www.') ? 'link' : 'file'
        }));
    }
    return [];
};

const parseAddressParts = (addr) => {
    if (!addr) return { addressLine1: '', postalCode: '', state: '', city: '' };
    if (typeof addr === 'object') {
        return {
            addressLine1: addr.line1 || addr.addressLine1 || addr.street || '',
            postalCode: addr.pincode || addr.postalCode || addr.zip || '',
            state: addr.state || '',
            city: addr.city || ''
        };
    }
    const str = String(addr).trim();
    if (!str) return { addressLine1: '', postalCode: '', state: '', city: '' };

    const parts = str.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) {
        return { addressLine1: str, postalCode: '', state: '', city: '' };
    }

    let postalCode = '';
    let state = '';
    let city = '';
    let remaining = [...parts];

    const lastPart = remaining[remaining.length - 1];
    if (lastPart && (/^\d{3,8}$/.test(lastPart) || (/^[A-Z0-9\s-]{3,10}$/i.test(lastPart) && /\d/.test(lastPart)))) {
        postalCode = remaining.pop();
    }

    if (remaining.length >= 3) {
        state = remaining.pop();
        city = remaining.pop();
    } else if (remaining.length === 2) {
        city = remaining.pop();
    }

    const addressLine1 = remaining.join(', ');

    return { addressLine1, postalCode, state, city };
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
        const isOverdue = lead.siteVisitRequired && !lead.actualSiteVisitDateTime && new Date(val) < new Date();
        return (
            <div className="flex items-center gap-1 justify-center">
                <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {date(val)}
                </span>
                {isOverdue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Overdue" />}
            </div>
        );
    },
    actualSiteVisitDateTime: (lead) => {
        const val = lead.actualSiteVisitDateTime;
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap justify-center">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                {date(val, { time: true })}
            </span>
        );
    },
    siteAddress: (lead) => {
        const val = lead.siteAddress || lead.location || '';
        if (!val) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-start gap-1 max-w-[200px] mx-auto" title={val}>
                <MapPin className="w-3 h-3 text-brand-500 mt-0.5 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2 text-left whitespace-normal">
                    {val}
                </span>
            </div>
        );
    },
    assignedInstaller: (lead) => {
        const installers = Array.isArray(lead.assignedInstallers) && lead.assignedInstallers.length > 0
            ? lead.assignedInstallers
            : lead.assignedInstaller
                ? [lead.assignedInstaller]
                : [];

        if (installers.length === 0 && !lead.assignedInstallerName) {
            return <span className="text-slate-400 dark:text-slate-600 text-xs italic">— Unassigned —</span>;
        }

        const names = installers.map((u) => typeof u === 'object' ? u.name : (lead.assignedInstallerName || 'Installer'));
        const primary = names[0] || lead.assignedInstallerName || 'Installer';
        const extraCount = names.length > 1 ? names.length - 1 : 0;

        return (
            <div className="flex items-center gap-1 justify-center" title={names.join(', ')}>
                <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate max-w-[120px] font-medium text-slate-800 dark:text-slate-200">
                    {primary}
                </span>
                {extraCount > 0 && (
                    <Badge tone="blue" className="text-[9px] px-1 py-0 font-mono">
                        +{extraCount}
                    </Badge>
                )}
            </div>
        );
    },
    clientArchitectAvailability: (lead) => {
        const slots = parseAvailabilitySlots(lead.clientArchitectAvailability);
        if (slots.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-col gap-0.5 text-left max-w-[180px] mx-auto">
                {slots.slice(0, 2).map((slot, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate" title={`${slot.date} ${slot.timeSlot}`}>
                        <Clock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span className="truncate">{slot.date ? `${slot.date}: ${slot.timeSlot}` : slot.timeSlot}</span>
                    </span>
                ))}
                {slots.length > 2 && (
                    <span className="text-[9px] text-slate-500 font-medium">+{slots.length - 2} more slot(s)</span>
                )}
            </div>
        );
    },
    scope: (lead) => {
        const raw = lead.scope;
        if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const items = typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(raw) ? raw : [];
        if (items.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-center">
                {items.slice(0, 2).map((item, idx) => (
                    <Badge key={idx} tone="violet" className="text-[10px]">
                        {item}
                    </Badge>
                ))}
                {items.length > 2 && <Badge tone="slate" className="text-[9px]">+{items.length - 2}</Badge>}
            </div>
        );
    },
    rooms: (lead) => {
        const raw = lead.rooms;
        if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        const items = typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(raw) ? raw : [];
        if (items.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-center">
                {items.slice(0, 2).map((item, idx) => (
                    <Badge key={idx} tone="brand" className="text-[10px]">
                        {item}
                    </Badge>
                ))}
                {items.length > 2 && <Badge tone="slate" className="text-[9px]">+{items.length - 2}</Badge>}
            </div>
        );
    },
    drawingsRenders: (lead) => {
        const list = parseAttachments(lead.drawingsRenders);
        if (list.length === 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center justify-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-400 font-semibold">
                    <Paperclip className="w-3 h-3 shrink-0" /> {list.length} file(s)/link(s)
                </span>
            </div>
        );
    },
    installerAvailability: (lead) => {
        const val = lead.installerAvailability || 'AVAILABLE';
        let tone = 'emerald';
        let label = 'Available';
        if (val === 'PARTIALLY_AVAILABLE') {
            tone = 'amber';
            label = 'Partially Available';
        } else if (val === 'UNAVAILABLE') {
            tone = 'rose';
            label = 'Unavailable';
        } else if (val === 'BUSY') {
            tone = 'amber';
            label = 'Busy';
        } else if (val === 'ON_SITE') {
            tone = 'blue';
            label = 'On Site';
        }
        return <Badge tone={tone}>{label}</Badge>;
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

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block mx-auto" title={String(raw)}>{String(raw)}</span>;
};


/* ------------------------------------------------------------- Edit Site Visit Modal */
const EditSiteVisitModal = ({ item, onClose, onDone, installers = [] }) => {
    const initialInstallers = (() => {
        if (!item) return [];
        if (Array.isArray(item.assignedInstallers) && item.assignedInstallers.length > 0) {
            return item.assignedInstallers.map((u) => typeof u === 'object' ? (u._id || u.id) : u);
        }
        if (item.assignedInstaller) {
            const id = typeof item.assignedInstaller === 'object' ? (item.assignedInstaller._id || item.assignedInstaller.id) : item.assignedInstaller;
            return id ? [id] : [];
        }
        return [];
    })();

    const initialScope = (() => {
        if (!item?.scope) return { selected: [], customOther: '' };
        const raw = item.scope;
        const items = typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(raw) ? raw : [];
        const approvedSet = new Set(APPROVED_SCOPE_MASTER);
        const selected = [];
        const customParts = [];
        items.forEach((it) => {
            if (approvedSet.has(it)) {
                selected.push(it);
            } else {
                customParts.push(it);
            }
        });
        if (customParts.length > 0 && !selected.includes('Other')) {
            selected.push('Other');
        }
        return { selected, customOther: customParts.join(', ') };
    })();

    const initialRooms = (() => {
        if (!item?.rooms) return [];
        const raw = item.rooms;
        return typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(raw) ? raw : [];
    })();

    const initialSlots = parseAvailabilitySlots(item?.clientArchitectAvailability);
    const initialAttachments = parseAttachments(item?.drawingsRenders);
    const initialAddress = parseAddressParts(item?.siteAddress || item?.location);

    const [form, setForm] = useState({
        siteVisitRequired: item?.siteVisitRequired ?? true,
        siteVisitDueDate: item?.siteVisitDueDate ? new Date(item.siteVisitDueDate).toISOString().slice(0, 10) : '',
        isCompleted: Boolean(item?.actualSiteVisitDateTime),
        actualSiteVisitDateTime: item?.actualSiteVisitDateTime ? new Date(item.actualSiteVisitDateTime).toISOString().slice(0, 16) : '',
        addressLine1: initialAddress.addressLine1,
        postalCode: initialAddress.postalCode,
        state: initialAddress.state,
        city: initialAddress.city,
        assignedInstallers: initialInstallers,
        availabilitySlots: initialSlots.length > 0 ? initialSlots : [{ id: '1', date: '', timeSlot: '10:00 AM - 01:00 PM' }],
        scopeSelected: initialScope.selected,
        scopeCustomOther: initialScope.customOther,
        roomsSelected: initialRooms,
        roomMaster: Array.from(new Set([...INITIAL_ROOM_MASTER, ...initialRooms])),
        newRoomInput: '',
        attachments: initialAttachments,
        newLinkUrl: '',
        newLinkName: '',
        installerAvailability: item?.installerAvailability || 'AVAILABLE',
    });

    const [installerSearch, setInstallerSearch] = useState('');
    const [validationError, setValidationError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const { execute, pending, error: apiError } = useAction(
        (payload) => leadsApi.update(item.id || item._id, payload),
        {
            onSuccess: () => {
                onDone();
                onClose();
            }
        }
    );

    const toggleScopeOption = (opt) => {
        setForm((prev) => {
            const exists = prev.scopeSelected.includes(opt);
            const next = exists ? prev.scopeSelected.filter((x) => x !== opt) : [...prev.scopeSelected, opt];
            return { ...prev, scopeSelected: next };
        });
    };

    const toggleRoomOption = (opt) => {
        setForm((prev) => {
            const exists = prev.roomsSelected.includes(opt);
            const next = exists ? prev.roomsSelected.filter((x) => x !== opt) : [...prev.roomsSelected, opt];
            return { ...prev, roomsSelected: next };
        });
    };

    const handleAddCustomRoom = () => {
        const val = form.newRoomInput.trim();
        if (!val) return;
        setForm((prev) => ({
            ...prev,
            roomMaster: Array.from(new Set([...prev.roomMaster, val])),
            roomsSelected: Array.from(new Set([...prev.roomsSelected, val])),
            newRoomInput: ''
        }));
    };

    const toggleInstaller = (userId) => {
        setForm((prev) => {
            const exists = prev.assignedInstallers.includes(userId);
            const next = exists ? prev.assignedInstallers.filter((id) => id !== userId) : [...prev.assignedInstallers, userId];
            return { ...prev, assignedInstallers: next };
        });
    };

    const handleAddSlot = () => {
        setForm((prev) => ({
            ...prev,
            availabilitySlots: [
                ...prev.availabilitySlots,
                { id: String(Date.now()), date: '', timeSlot: '10:00 AM - 01:00 PM' }
            ]
        }));
    };

    const handleUpdateSlot = (id, key, value) => {
        setForm((prev) => ({
            ...prev,
            availabilitySlots: prev.availabilitySlots.map((s) => (s.id === id ? { ...s, [key]: value } : s))
        }));
    };

    const handleRemoveSlot = (id) => {
        setForm((prev) => ({
            ...prev,
            availabilitySlots: prev.availabilitySlots.filter((s) => s.id !== id)
        }));
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));

            const res = await uploadApi.upload(formData);
            const uploadedFiles = res.data || [];

            const newItems = uploadedFiles.map((file) => ({
                id: String(Date.now() + Math.random()),
                name: file.filename || file.originalname || 'Uploaded File',
                url: file.url,
                size: file.size ? `${(file.size / 1024).toFixed(1)} KB` : '',
                type: file.mimetype?.includes('image') ? 'image' : (file.filename || file.originalname || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'cad',
                uploadedAt: file.uploadedAt || new Date().toISOString()
            }));

            setForm((prev) => ({
                ...prev,
                attachments: [...prev.attachments, ...newItems]
            }));
        } catch (err) {
            console.error('Failed to upload files:', err);
            setUploadError(err?.message || 'Failed to upload file(s)');
        } finally {
            setUploading(false);
        }
    };

    const handleAddLink = () => {
        if (!form.newLinkUrl.trim()) return;
        const name = form.newLinkName.trim() || form.newLinkUrl.trim();
        const linkItem = {
            id: String(Date.now()),
            name,
            url: form.newLinkUrl.trim(),
            type: 'link'
        };
        setForm((prev) => ({
            ...prev,
            attachments: [...prev.attachments, linkItem],
            newLinkUrl: '',
            newLinkName: ''
        }));
    };

    const handleRemoveAttachment = (id) => {
        setForm((prev) => ({
            ...prev,
            attachments: prev.attachments.filter((a) => a.id !== id)
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        setValidationError('');

        if (form.siteVisitRequired && !form.siteVisitDueDate) {
            setValidationError('Site Visit Due Date is mandatory when Site Visit Required is Yes.');
            return;
        }

        if (form.isCompleted && !form.actualSiteVisitDateTime) {
            setValidationError('Actual Site Visit Date & Time is mandatory when the site visit is marked completed.');
            return;
        }

        const scopeParts = [...form.scopeSelected.filter((s) => s !== 'Other')];
        if (form.scopeSelected.includes('Other') && form.scopeCustomOther.trim()) {
            scopeParts.push(form.scopeCustomOther.trim());
        }

        const availabilityString = form.availabilitySlots
            .filter((s) => s.date || s.timeSlot)
            .map((s) => (s.date ? `${s.date}: ${s.timeSlot}` : s.timeSlot))
            .join('; ');

        const drawingsString = form.attachments.length > 0 ? JSON.stringify(form.attachments) : '';

        const primaryInstallerId = form.assignedInstallers.length > 0 ? form.assignedInstallers[0] : undefined;

        const addressParts = [
            form.addressLine1,
            form.city,
            form.state,
            form.postalCode
        ].map((s) => (s || '').trim()).filter(Boolean);
        const formattedSiteAddress = addressParts.join(', ');

        execute({
            siteVisitRequired: Boolean(form.siteVisitRequired),
            siteVisitDueDate: form.siteVisitRequired ? (form.siteVisitDueDate || undefined) : undefined,
            actualSiteVisitDateTime: form.actualSiteVisitDateTime || undefined,
            siteAddress: formattedSiteAddress || undefined,
            assignedInstaller: primaryInstallerId || null,
            assignedInstallers: form.assignedInstallers,
            clientArchitectAvailability: availabilityString || undefined,
            scope: scopeParts,
            rooms: form.roomsSelected,
            drawingsRenders: drawingsString || undefined,
            installerAvailability: form.installerAvailability
        });
    };

    const filteredInstallers = installers.filter((u) => {
        if (!installerSearch) return true;
        const q = installerSearch.toLowerCase();
        return (u.name || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
    });

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Site Visit Details — ${item?.code || ''}`}
            subtitle={`Configure pre-site visit information for ${item?.clientName || ''}`}
            size="xl"
        >
            <form onSubmit={submit} className="space-y-6">
                {(validationError || apiError) && (
                    <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError || apiError}</span>
                    </div>
                )}

                {/* Grid Section 1: Requirement & Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <Field label="Site Visit Requirement" required>
                        <Select
                            value={form.siteVisitRequired ? 'YES' : 'NO'}
                            onChange={(e) => setForm((prev) => ({ ...prev, siteVisitRequired: e.target.value === 'YES' }))}
                            options={[
                                { value: 'YES', label: 'Yes - Site Visit Required' },
                                { value: 'NO', label: 'No - Not Required' }
                            ]}
                        />
                    </Field>

                    <Field label="Site Visit Due Date" required={form.siteVisitRequired} hint={form.siteVisitRequired ? 'Mandatory when Site Visit Required is Yes' : ''}>
                        <Input
                            type="date"
                            value={form.siteVisitDueDate}
                            onChange={(e) => setForm((prev) => ({ ...prev, siteVisitDueDate: e.target.value }))}
                        />
                    </Field>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer mb-1.5">
                                <input
                                    type="checkbox"
                                    checked={form.isCompleted}
                                    onChange={(e) => setForm((prev) => ({ ...prev, isCompleted: e.target.checked }))}
                                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                />
                                <span>Mark Site Visit as Completed</span>
                            </label>
                            <p className="text-[11px] text-slate-500">Enable when the physical site visit has been completed.</p>
                        </div>

                        <Field label="Actual Site Visit Date & Time" required={form.isCompleted} hint={form.isCompleted ? 'Mandatory when marked completed' : ''}>
                            <Input
                                type="datetime-local"
                                value={form.actualSiteVisitDateTime}
                                onChange={(e) => setForm((prev) => ({ ...prev, actualSiteVisitDateTime: e.target.value }))}
                            />
                        </Field>
                    </div>
                </div>

                {/* Grid Section 2: Site Address Inputs */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-brand-500" />
                        <span>Site Address</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <Field label="Address Line 1" hint="Building, street, flat no., or landmark">
                                <Input
                                    placeholder="Enter address line 1 (building, street, landmark)..."
                                    value={form.addressLine1}
                                    onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
                                />
                            </Field>
                        </div>
                        <Field label="City">
                            <Input
                                placeholder="Enter city..."
                                value={form.city}
                                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                            />
                        </Field>
                        <Field label="State">
                            <Input
                                placeholder="Enter state..."
                                value={form.state}
                                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                            />
                        </Field>
                        <Field label="Postal Code" hint="ZIP / Pincode">
                            <Input
                                placeholder="Enter postal code..."
                                value={form.postalCode}
                                onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                            />
                        </Field>
                    </div>
                </div>

                {/* Grid Section 3: Installers & System Availability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <Field label="Assigned Installer / Measurement Person">
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <Input
                                    size="sm"
                                    value={installerSearch}
                                    onChange={(e) => setInstallerSearch(e.target.value)}
                                    placeholder="Search installers by name or role..."
                                    className="pl-8 text-xs"
                                />
                            </div>

                            {form.assignedInstallers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                    {form.assignedInstallers.map((id) => {
                                        const u = installers.find((inst) => (inst._id || inst.id) === id);
                                        return (
                                            <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                <UserCheck className="w-3 h-3 shrink-0" />
                                                <span>{u ? u.name : 'Selected User'}</span>
                                                <button type="button" onClick={() => toggleInstaller(id)} className="text-slate-400 hover:text-rose-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="max-h-36 overflow-y-auto p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                                {filteredInstallers.length === 0 ? (
                                    <div className="text-xs text-slate-400 py-2 text-center">No installers found</div>
                                ) : (
                                    filteredInstallers.map((u) => {
                                        const userId = u._id || u.id;
                                        const isSelected = form.assignedInstallers.includes(userId);
                                        return (
                                            <label key={userId} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs">
                                                <span className="text-slate-700 dark:text-slate-200 font-medium">
                                                    {u.name} <span className="text-slate-400 text-[10px] px-1">- {u.role.split("_").join("  ") || 'Team'}</span>
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleInstaller(userId)}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </Field>

                    <Field label="Installer Availability">
                        <Select
                            value={form.installerAvailability}
                            onChange={(e) => setForm((prev) => ({ ...prev, installerAvailability: e.target.value }))}
                            options={[
                                { value: 'AVAILABLE', label: 'Available' },
                                { value: 'PARTIALLY_AVAILABLE', label: 'Partially Available' },
                                { value: 'UNAVAILABLE', label: 'Unavailable' }
                            ]}
                        />
                        <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Current System Status:</span>
                            {form.installerAvailability === 'AVAILABLE' && <Badge tone="emerald">Available</Badge>}
                            {form.installerAvailability === 'PARTIALLY_AVAILABLE' && <Badge tone="amber">Partially Available</Badge>}
                            {form.installerAvailability === 'UNAVAILABLE' && <Badge tone="rose">Unavailable</Badge>}
                        </div>
                    </Field>
                </div>

                {/* Grid Section 4: Client / Architect Availability Slots */}
                <Field label="Client / Architect Availability">
                    <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                        {form.availabilitySlots.map((slot, index) => (
                            <div key={slot.id || index} className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                                <div className="flex-1 min-w-[140px]">
                                    <Input
                                        type="date"
                                        size="sm"
                                        value={slot.date}
                                        onChange={(e) => handleUpdateSlot(slot.id, 'date', e.target.value)}
                                        placeholder="Availability Date"
                                    />
                                </div>
                                <div className="flex-1 min-w-[160px]">
                                    <Input
                                        size="sm"
                                        value={slot.timeSlot}
                                        onChange={(e) => handleUpdateSlot(slot.id, 'timeSlot', e.target.value)}
                                        placeholder="e.g. 10:00 AM - 01:00 PM"
                                    />
                                </div>
                                {form.availabilitySlots.length > 1 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveSlot(slot.id)}
                                        className="text-rose-500 hover:text-rose-700"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" icon={Plus} onClick={handleAddSlot}>
                            Add Availability Slot
                        </Button>
                    </div>
                </Field>

                {/* Grid Section 5: Scope & Rooms Multi-select */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Scope */}
                    <Field label="Scope">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                                {APPROVED_SCOPE_MASTER.map((opt) => {
                                    const isSelected = form.scopeSelected.includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => toggleScopeOption(opt)}
                                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${isSelected
                                                    ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-400'
                                                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {form.scopeSelected.includes('Other') && (
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <Input
                                        size="sm"
                                        placeholder="Specify custom scope requirements..."
                                        value={form.scopeCustomOther}
                                        onChange={(e) => setForm((prev) => ({ ...prev, scopeCustomOther: e.target.value }))}
                                    />
                                </div>
                            )}
                        </div>
                    </Field>

                    {/* Rooms */}
                    <Field label="Rooms">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                                {form.roomMaster.map((rm) => {
                                    const isSelected = form.roomsSelected.includes(rm);
                                    return (
                                        <button
                                            key={rm}
                                            type="button"
                                            onClick={() => toggleRoomOption(rm)}
                                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${isSelected
                                                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                                                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                            {rm}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <Input
                                    size="sm"
                                    placeholder="Add custom room name..."
                                    value={form.newRoomInput}
                                    onChange={(e) => setForm((prev) => ({ ...prev, newRoomInput: e.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCustomRoom();
                                        }
                                    }}
                                />
                                <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={handleAddCustomRoom}>
                                    Add Room
                                </Button>
                            </div>
                        </div>
                    </Field>
                </div>

                {/* Grid Section 6: Drawings & Renders Upload & Links */}
                <Field label="Drawings / Renders">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 cursor-pointer bg-white dark:bg-slate-950 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 text-brand-500 mb-1 animate-spin" />
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-brand-500 mb-1" />
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Upload Files</span>
                                    </>
                                )}
                                <span className="text-[10px] text-slate-400">PDFs, Images, CAD DWG/DXF</span>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>

                            <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">Add Web Link</span>
                                <Input
                                    size="sm"
                                    placeholder="Link Title"
                                    value={form.newLinkName}
                                    onChange={(e) => setForm((prev) => ({ ...prev, newLinkName: e.target.value }))}
                                />
                                <div className="flex gap-1.5">
                                    <Input
                                        size="sm"
                                        placeholder="https://..."
                                        value={form.newLinkUrl}
                                        onChange={(e) => setForm((prev) => ({ ...prev, newLinkUrl: e.target.value }))}
                                    />
                                    <Button type="button" size="sm" variant="secondary" icon={LinkIcon} onClick={handleAddLink}>
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {uploadError && (
                            <div className="p-2 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-lg">
                                {uploadError}
                            </div>
                        )}

                        {form.attachments.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                                    Attached Files & Links ({form.attachments.length}):
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                    {form.attachments.map((att) => (
                                        <div key={att.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                                            <div className="flex items-center gap-2 truncate">
                                                {att.type === 'link' ? (
                                                    <LinkIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                                ) : (
                                                    <Paperclip className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                )}
                                                <a href={getMediaUrl(att.url)} target="_blank" rel="noreferrer" className="truncate text-brand-600 dark:text-brand-400 hover:underline" title={att.name}>
                                                    {att.name}
                                                </a>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemoveAttachment(att.id)}
                                                className="text-slate-400 hover:text-rose-500 p-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Field>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
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