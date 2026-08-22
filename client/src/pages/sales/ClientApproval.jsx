import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search,
    Eye,
    CheckCircle2,
    Calendar,
    Paperclip,
    ShieldCheck,
    Pencil,
    History,
    RotateCcw,
    AlertTriangle,
    Clock,
    Plus,
    Trash2,
    ExternalLink,
    Link as LinkIcon,
    Lock,
    Layers,
    X,
    FileText,
    Check
} from 'lucide-react';
import { date } from '../../utils/format';
import { PageHeader, Panel, Button, Badge, Input, Select, Textarea, Loading, ErrorState, EmptyState, StatTile, Modal, Field } from '../../components/ui';
import { useSelector } from 'react-redux';
import useSales from '../../hooks/useSales';
import { leadsApi, uploadApi, fabricsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';

const SPREADSHEET_SECTIONS = [
    {
        id: 's12',
        title: 'Client Approval',
        color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/90 dark:text-orange-200 dark:border-orange-700/80',
        cols: [
            { key: 'approval.planned', label: 'Approval Due Date' },
            { key: 'approval.clientApprovalDate', label: 'Client Approval Date' },
            { key: 'approval.clientApprovalStatus', label: 'Client Approval Status' },
            { key: 'approval.proofAttachment', label: 'Approval Proof / Attachment' },
            { key: 'approval.finalApprovedVersion', label: 'Final Approved Version' },
            { key: 'presentation.link', label: 'Presentation Link' },
            { key: 'presentation.attachment', label: 'Presentation Deck' },
            { key: 'presentation.clientSelection', label: 'Client Selection' },
            { key: 'presentation.fabricSelection', label: 'Fabric Selection' },
            { key: 'presentation.designDirection', label: 'Design Direction' },
            { key: 'presentation.revisionNotes', label: 'Revision Notes' },
            { key: 'approval.revisions', label: 'Revision History Log' },
        ]
    }
];

const ROOM_OPTIONS = [
    'Living Room',
    'Master Bedroom',
    'Bedroom 2',
    'Bedroom 3',
    'Dining Room',
    'Balcony',
    'Study Room',
    'Home Theater',
    'Guest Room',
    'General / Whole Site'
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

// Safe parsers for subforms stored as JSON or strings
const parseClientSelections = (raw) => {
    if (!raw) return [{ item: '', quantity: 1, room: 'Living Room', remarks: '' }];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
        // string fallback
    }
    return [{ item: String(raw), quantity: 1, room: 'General', remarks: '' }];
};

const parseFabricSelections = (raw) => {
    if (!raw) return [{ room: 'Living Room', fabric: '', code: '' }];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
        // string fallback
    }
    return [{ room: 'Living Room', fabric: String(raw), code: '' }];
};

const formatDateTime = (raw) => {
    if (!raw) return null;
    try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return String(raw);
        return d.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return String(raw);
    }
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
    'approval.planned': (lead) => {
        const planned = lead.approval?.planned;
        if (!planned) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap">{date(planned)}</span>;
    },
    'approval.clientApprovalDate': (lead) => {
        const appDate = lead.approval?.clientApprovalDate;
        if (!appDate) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap">{formatDateTime(appDate)}</span>;
    },
    'approval.clientApprovalStatus': (lead) => {
        const st = lead.approval?.clientApprovalStatus || 'PENDING';
        const revCount = lead.approval?.revisions?.length || 0;
        let tone = 'slate';
        let label = 'PENDING';

        switch (st) {
            case 'APPROVED':
                tone = 'emerald';
                label = 'APPROVED';
                break;
            case 'REVISION_REQUESTED':
                tone = 'amber';
                label = 'REVISION REQ';
                break;
            case 'ON_HOLD':
                tone = 'blue';
                label = 'ON HOLD';
                break;
            case 'DECLINED':
            case 'REJECTED':
                tone = 'rose';
                label = 'DECLINED';
                break;
            default:
                tone = 'slate';
                label = 'PENDING';
        }

        return (
            <div className="flex items-center justify-center gap-1">
                <Badge tone={tone}>{label}</Badge>
                {revCount > 0 && (
                    <Badge tone="amber">
                        <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" /> Rev {revCount}
                    </Badge>
                )}
            </div>
        );
    },
    'approval.proofAttachment': (lead) => {
        const proofs = lead.approval?.proofAttachment || [];
        if (!proofs.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium">
                <Paperclip className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" /> {proofs.length} Proof File(s)
            </span>
        );
    },
    'approval.finalApprovedVersion': (lead) => {
        const ver = lead.approval?.finalApprovedVersion || lead.quotation?.version || lead.quotationNo;
        const isApproved = lead.approval?.clientApprovalStatus === 'APPROVED';
        if (!ver) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                isApproved
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
                {isApproved && <Lock className="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                {ver}
            </span>
        );
    },
    'presentation.link': (lead) => {
        const link = lead.presentation?.link || lead.presentation?.url;
        if (!link) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
                <LinkIcon className="w-3 h-3 shrink-0" /> Open Link <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
            </a>
        );
    },
    'presentation.attachment': (lead) => {
        const files = lead.presentation?.attachment || [];
        if (!files.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-medium">
                <FileText className="w-3 h-3 shrink-0 text-indigo-500" /> {files.length} Deck(s)
            </span>
        );
    },
    'presentation.clientSelection': (lead) => {
        const sel = parseClientSelections(lead.presentation?.clientSelection);
        const valid = sel.filter((s) => s.item && s.item.trim());
        if (!valid.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-col gap-0.5 text-left max-w-[200px]">
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {valid.length} Item(s) Selected
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {valid.map((v) => `${v.item} (${v.quantity || 1})`).join(', ')}
                </span>
            </div>
        );
    },
    'presentation.fabricSelection': (lead) => {
        const fabs = parseFabricSelections(lead.presentation?.fabricSelection);
        const valid = fabs.filter((f) => f.fabric && f.fabric.trim());
        if (!valid.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
                {valid.slice(0, 2).map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                        <strong className="font-semibold">{f.room || 'General'}:</strong> {f.fabric}
                    </span>
                ))}
                {valid.length > 2 && (
                    <span className="text-[10px] text-slate-400 font-semibold">+{valid.length - 2} more</span>
                )}
            </div>
        );
    },
    'presentation.designDirection': (lead) => {
        const dd = lead.presentation?.designDirection;
        if (!dd) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block text-xs" title={dd}>{dd}</span>;
    },
    'presentation.revisionNotes': (lead) => {
        const notes = lead.presentation?.revisionNotes;
        if (!notes) return <span className="text-slate-400 dark:text-slate-600">—</span>;
        return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block text-xs" title={notes}>{notes}</span>;
    },
    'approval.revisions': (lead) => {
        const revs = lead.approval?.revisions || [];
        if (revs.length === 0) return <span className="text-slate-400 dark:text-slate-600">Base (0)</span>;
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold">
                <RotateCcw className="w-3 h-3 shrink-0" /> {revs.length} Change(s)
            </span>
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

    if (!raw && raw !== 0) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] block text-xs" title={String(raw)}>{String(raw)}</span>;
};

// Fabric Searchable Combobox Component
const SearchableFabricSelector = ({ value, onChange, fabricCatalog = [] }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || '');

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    const filtered = useMemo(() => {
        if (!query) return fabricCatalog.slice(0, 30);
        const q = query.toLowerCase();
        return fabricCatalog.filter((f) => {
            const name = String(f.name || f.title || f.fabricName || '').toLowerCase();
            const code = String(f.code || f.itemCode || '').toLowerCase();
            const composition = String(f.composition || f.category || '').toLowerCase();
            return name.includes(q) || code.includes(q) || composition.includes(q);
        }).slice(0, 30);
    }, [query, fabricCatalog]);

    const handleSelect = (fab) => {
        const displayStr = fab.code ? `${fab.name || fab.title} (${fab.code})` : (fab.name || fab.title || String(fab));
        onChange(displayStr, fab.code || '');
        setQuery(displayStr);
        setOpen(false);
    };

    return (
        <div className="relative w-full">
            <div className="relative flex items-center">
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value, '');
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search fabric catalogue or type name..."
                    className="pr-8 text-xs"
                />
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="absolute right-2 text-slate-400 hover:text-slate-600"
                >
                    <Layers className="w-3.5 h-3.5" />
                </button>
            </div>

            {open && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
                    <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {filtered.length > 0 ? (
                            filtered.map((fab, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelect(fab)}
                                    className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                                >
                                    <div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                                            {fab.name || fab.title || fab.fabricName || fab}
                                        </div>
                                        {fab.composition && (
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                {fab.composition} {fab.color ? `• ${fab.color}` : ''}
                                            </div>
                                        )}
                                    </div>
                                    {fab.code && (
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {fab.code}
                                        </span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="p-3 text-slate-500 text-center italic text-xs">
                                No matching catalog fabric. Press enter or leave text as custom entry.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const ClientApprovalEditModal = ({ item, onClose, onDone }) => {
    const wasApproved = item?.approval?.clientApprovalStatus === 'APPROVED';

    // Format ISO string to datetime-local format YYYY-MM-DDTHH:mm
    const toDatetimeLocal = (raw) => {
        if (!raw) return '';
        try {
            const d = new Date(raw);
            if (isNaN(d.getTime())) return '';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (e) {
            return '';
        }
    };

    const [form, setForm] = useState({
        planned: item?.approval?.planned || '',
        clientApprovalDate: toDatetimeLocal(item?.approval?.clientApprovalDate) || '',
        clientApprovalStatus: item?.approval?.clientApprovalStatus || 'PENDING',
        finalApprovedVersion: item?.approval?.finalApprovedVersion || item?.quotation?.version || (item?.quotationNo ? `QUOT-${item.quotationNo}` : 'v1.0'),
        presentationLink: item?.presentation?.link || item?.presentation?.url || '',
        designDirection: item?.presentation?.designDirection || '',
        revisionNotes: item?.presentation?.revisionNotes || '',
    });

    // Subforms state
    const [clientSelections, setClientSelections] = useState(parseClientSelections(item?.presentation?.clientSelection));
    const [fabricSelections, setFabricSelections] = useState(parseFabricSelections(item?.presentation?.fabricSelection));

    // File attachments state
    const [proofAttachments, setProofAttachments] = useState(item?.approval?.proofAttachment || []);
    const [presentationAttachments, setPresentationAttachments] = useState(item?.presentation?.attachment || []);
    const [uploading, setUploading] = useState(null);

    // Master Fabrics Catalogue list
    const [fabricCatalog, setFabricCatalog] = useState([]);

    // Revision / Change-Control state
    const [revisionReason, setRevisionReason] = useState('');
    const [validationError, setValidationError] = useState('');
    const [showRevisionsHistory, setShowRevisionsHistory] = useState(false);

    useEffect(() => {
        fabricsApi
            .list({ limit: 100 })
            .then((res) => {
                const itemsList = res.data?.items || res.data || [];
                setFabricCatalog(itemsList);
            })
            .catch(() => {
                // Fallback catalogue items
                setFabricCatalog([
                    { name: 'Linen Sheer White', code: 'FAB-LIN-01', composition: '100% Linen Sheer', color: 'White' },
                    { name: 'Silk Velvet Navy', code: 'FAB-VEL-02', composition: 'Premium Velvet', color: 'Navy Blue' },
                    { name: 'Motorized Blackout Sheer', code: 'FAB-[#836444]-03', composition: 'Poly-Blackout', color: 'Charcoal' },
                    { name: 'Cotton Satin Beige', code: 'FAB-SAT-04', composition: 'Cotton Satin Blend', color: 'Beige' },
                    { name: 'Jacquard Floral Weave', code: 'FAB-JAC-05', composition: 'Jacquard Brocade', color: 'Gold/Champagne' }
                ]);
            });
    }, []);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    // Client Selection Subform Handlers
    const addClientSelectionRow = () => {
        setClientSelections([...clientSelections, { item: '', quantity: 1, room: 'Living Room', remarks: '' }]);
    };

    const removeClientSelectionRow = (index) => {
        if (clientSelections.length <= 1) {
            setClientSelections([{ item: '', quantity: 1, room: 'Living Room', remarks: '' }]);
            return;
        }
        setClientSelections(clientSelections.filter((_, i) => i !== index));
    };

    const updateClientSelectionRow = (index, field, value) => {
        const updated = [...clientSelections];
        updated[index] = { ...updated[index], [field]: value };
        setClientSelections(updated);
    };

    // Fabric Selection Subform Handlers
    const addFabricSelectionRow = () => {
        setFabricSelections([...fabricSelections, { room: 'Living Room', fabric: '', code: '' }]);
    };

    const removeFabricSelectionRow = (index) => {
        if (fabricSelections.length <= 1) {
            setFabricSelections([{ room: 'Living Room', fabric: '', code: '' }]);
            return;
        }
        setFabricSelections(fabricSelections.filter((_, i) => i !== index));
    };

    const updateFabricSelectionRow = (index, fabricName, code) => {
        const updated = [...fabricSelections];
        updated[index] = { ...updated[index], fabric: fabricName, code: code || updated[index].code };
        setFabricSelections(updated);
    };

    const updateFabricRoom = (index, roomName) => {
        const updated = [...fabricSelections];
        updated[index] = { ...updated[index], room: roomName };
        setFabricSelections(updated);
    };

    // Available quotation / proposal version options for Linked Record selection
    const availableVersions = useMemo(() => {
        const setOfVersions = new Set();
        if (item?.quotation?.version) setOfVersions.add(item.quotation.version);
        if (item?.quotation?.no) setOfVersions.add(item.quotation.no);
        if (item?.quotationNo) setOfVersions.add(`QUOT-${item.quotationNo}`);
        setOfVersions.add('v1.0 (Initial Proposal)');
        setOfVersions.add('v2.0 (Revised BOQ)');
        setOfVersions.add('v3.0 (Final Approved Proposal)');
        return Array.from(setOfVersions);
    }, [item]);

    // Check if selection/approval fields have been modified compared to initial state
    const isSelectionAltered = () => {
        if (!wasApproved) return false;
        const initPlanned = item?.approval?.planned || '';
        const initDate = toDatetimeLocal(item?.approval?.clientApprovalDate) || '';
        const initStatus = item?.approval?.clientApprovalStatus || 'PENDING';
        const initVersion = item?.approval?.finalApprovedVersion || '';
        const initClientSel = JSON.stringify(parseClientSelections(item?.presentation?.clientSelection));
        const initFabricSel = JSON.stringify(parseFabricSelections(item?.presentation?.fabricSelection));
        const initDesignDir = item?.presentation?.designDirection || '';
        const initProofStr = JSON.stringify(item?.approval?.proofAttachment || []);

        return (
            form.planned !== initPlanned ||
            form.clientApprovalDate !== initDate ||
            form.clientApprovalStatus !== initStatus ||
            form.finalApprovedVersion !== initVersion ||
            JSON.stringify(clientSelections) !== initClientSel ||
            JSON.stringify(fabricSelections) !== initFabricSel ||
            form.designDirection !== initDesignDir ||
            JSON.stringify(proofAttachments) !== initProofStr
        );
    };

    const changesInEffect = isSelectionAltered();

    const handleFileUpload = async (e, type) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploading(type);
        try {
            const formData = new FormData();
            files.forEach((f) => formData.append('files', f));

            const res = await uploadApi.upload(formData);
            const uploadedFiles = (res.data || []).map((file) => ({
                url: file.url,
                filename: file.filename || file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: file.uploadedAt || new Date().toISOString(),
                storage: file.storage || 's3',
            }));

            if (type === 'proof') {
                setProofAttachments((prev) => [...prev, ...uploadedFiles]);
            } else {
                setPresentationAttachments((prev) => [...prev, ...uploadedFiles]);
            }
        } catch (err) {
            console.error('Failed to upload file:', err);
        } finally {
            setUploading(null);
            e.target.value = '';
        }
    };

    const handleRemoveAttachment = (type, index) => {
        if (type === 'proof') {
            setProofAttachments((prev) => prev.filter((_, i) => i !== index));
        } else {
            setPresentationAttachments((prev) => prev.filter((_, i) => i !== index));
        }
    };

    const { execute, pending, error } = useAction(
        (payload) => leadsApi.update(item._id || item.id, payload),
        {
            onSuccess: () => {
                onDone();
                onClose();
            },
        }
    );

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        // Mandatory revision notes / reason check if modifying an approved selection
        if (wasApproved && changesInEffect) {
            if (!revisionReason.trim()) {
                setValidationError('Mandatory: A Revision Reason / Change-Control Description is required when modifying an approved client selection.');
                return;
            }
        }

        setValidationError('');

        // Sanitize subform data before storing
        const validClientSelections = clientSelections.filter((s) => s.item && s.item.trim() !== '');
        const validFabricSelections = fabricSelections.filter((f) => f.fabric && f.fabric.trim() !== '');

        const formattedClientSelStr = JSON.stringify(validClientSelections.length > 0 ? validClientSelections : clientSelections);
        const formattedFabricSelStr = JSON.stringify(validFabricSelections.length > 0 ? validFabricSelections : fabricSelections);

        const existingRevisions = Array.isArray(item?.approval?.revisions) ? item.approval.revisions : [];
        let updatedRevisions = existingRevisions;
        let finalStatus = form.clientApprovalStatus;
        let finalNotes = form.revisionNotes;

        if (wasApproved && changesInEffect) {
            const revNum = existingRevisions.length + 1;
            const revisionSnapshot = {
                revisionNumber: revNum,
                clientApprovalStatus: item?.approval?.clientApprovalStatus || 'APPROVED',
                finalApprovedVersion: item?.approval?.finalApprovedVersion || 'v1.0',
                clientSelection: formattedClientSelStr,
                fabricSelection: formattedFabricSelStr,
                designDirection: item?.presentation?.designDirection || '',
                revisionNotes: item?.presentation?.revisionNotes || '',
                changeReason: revisionReason.trim(),
                revisedAt: new Date().toISOString(),
                proofAttachment: item?.approval?.proofAttachment || [],
            };

            updatedRevisions = [...existingRevisions, revisionSnapshot];

            // Auto-transition status if modification was made while status was APPROVED
            if (finalStatus === 'APPROVED') {
                finalStatus = 'REVISION_REQUESTED';
            }

            const revHeader = `[Rev #${revNum} - ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}]: ${revisionReason.trim()}`;
            finalNotes = form.revisionNotes ? `${revHeader}\n\n${form.revisionNotes}` : revHeader;
        }

        execute({
            approval: {
                ...(item?.approval || {}),
                planned: form.planned || undefined,
                clientApprovalDate: form.clientApprovalDate ? new Date(form.clientApprovalDate).toISOString() : undefined,
                clientApprovalStatus: finalStatus,
                proofAttachment: proofAttachments,
                finalApprovedVersion: form.finalApprovedVersion || undefined,
                revisions: updatedRevisions,
            },
            presentation: {
                ...(item?.presentation || {}),
                link: form.presentationLink || undefined,
                url: form.presentationLink || undefined,
                clientSelection: formattedClientSelStr,
                fabricSelection: formattedFabricSelStr,
                designDirection: form.designDirection || undefined,
                revisionNotes: finalNotes || undefined,
                attachment: presentationAttachments,
            },
        });
    };

    const revisionsList = item?.approval?.revisions || [];

    return (
        <Modal
            open={Boolean(item)}
            onClose={onClose}
            title={`Client Approval & Presentation — ${item?.clientName || item?.code}`}
            subtitle="Configure approval dates, status, attachments, approved versions, presentations, dynamic selections, fabrics & revision controls."
            size="xl"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        loading={pending}
                        onClick={handleSubmit}
                    >
                        {wasApproved && changesInEffect ? 'Trigger Revision & Save' : 'Save Approval Details'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {(error || validationError) && (
                    <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error?.message || validationError}
                    </div>
                )}

                {/* Change Control Warning Banner */}
                {wasApproved && (
                    <div className={`p-4 rounded-xl border transition-all space-y-3 ${changesInEffect
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-xs">
                                {changesInEffect ? (
                                    <>
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
                                        <span className="text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                                            Approved Record Under Change-Control Review
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider text-[11px]">
                                            Client Approval Secured & Selection Locked
                                        </span>
                                    </>
                                )}
                            </div>
                            <Badge tone={changesInEffect ? 'amber' : 'emerald'}>
                                {changesInEffect ? 'REVISION PENDING' : 'LOCKED'}
                            </Badge>
                        </div>

                        <p className="text-xs opacity-90 leading-relaxed">
                            {changesInEffect
                                ? 'Modifications to an approved selection will log a formal revision entry into the audit trail and update the approval state.'
                                : 'This proposal was previously approved. Any changes made below require a mandatory revision note.'}
                        </p>

                        {changesInEffect && (
                            <Field label="Revision Reason / Change-Control Note *" hint="Mandatory requirement for auditing post-approval modifications">
                                <Input
                                    value={revisionReason}
                                    onChange={(e) => {
                                        setRevisionReason(e.target.value);
                                        if (validationError) setValidationError('');
                                    }}
                                    placeholder="e.g. Client requested modification of sheer fabric from Linen White to Satin Velvet after initial signoff..."
                                    className="border-amber-400 dark:border-amber-600 focus:border-amber-500 bg-white/80 dark:bg-slate-900/90 text-xs"
                                />
                            </Field>
                        )}
                    </div>
                )}

                {/* 1. Approval Schedule & Status Section */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> 1. Client Approval & Version Status
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Approval Due Date" hint="Date picker for obtaining approval">
                        <Input type="date" value={form.planned} onChange={set('planned')} />
                    </Field>
                    <Field label="Client Approval Date & Time" hint="Actual approval date & time picker">
                        <Input type="datetime-local" value={form.clientApprovalDate} onChange={set('clientApprovalDate')} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Client Approval Status" hint="Dropdown status configuration">
                        <Select
                            value={form.clientApprovalStatus}
                            onChange={set('clientApprovalStatus')}
                            options={[
                                { value: 'PENDING', label: 'Pending Approval' },
                                { value: 'APPROVED', label: 'Approved' },
                                { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
                                { value: 'ON_HOLD', label: 'On Hold' },
                                { value: 'DECLINED', label: 'Declined' },
                            ]}
                        />
                    </Field>

                    <Field label="Final Quotation / Proposal Version Approved" hint="Linked record / version lock selector">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Select
                                    value={form.finalApprovedVersion}
                                    onChange={set('finalApprovedVersion')}
                                    options={[
                                        ...availableVersions.map((v) => ({ value: v, label: v })),
                                        { value: form.finalApprovedVersion, label: `Custom: ${form.finalApprovedVersion}` }
                                    ].filter((v, idx, self) => self.findIndex((t) => t.value === v.value) === idx)}
                                />
                            </div>
                            <Input
                                value={form.finalApprovedVersion}
                                onChange={set('finalApprovedVersion')}
                                placeholder="Or enter version..."
                                className="w-1/2 text-xs font-mono"
                            />
                        </div>
                    </Field>
                </div>

                {/* 2. Attachments & Presentations Section */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4" /> 2. Approval Proof & Presentation Attachments
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Approval Proof / Attachment" hint="Signed quotation, email, message screenshot or approval document">
                        <div className="space-y-2">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors w-full justify-center">
                                <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                {uploading === 'proof' ? 'Uploading Proof File...' : 'Upload Approval Proof Document'}
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    disabled={uploading === 'proof'}
                                    onChange={(e) => handleFileUpload(e, 'proof')}
                                />
                            </label>
                            {proofAttachments.length > 0 && (
                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                    {proofAttachments.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/5 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                <a href={file.url} target="_blank" rel="noreferrer" className="truncate hover:underline font-medium">
                                                    {file.filename || file.name || `Proof File ${i + 1}`}
                                                </a>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment('proof', i)}
                                                className="text-slate-400 hover:text-rose-500 font-bold ml-2 p-0.5"
                                                title="Remove File"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Field>

                    <Field label="Presentation Link & Attachments" hint="Link (Canva/Figma URL) or upload final presentation deck">
                        <div className="space-y-2">
                            <div className="relative">
                                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    value={form.presentationLink}
                                    onChange={set('presentationLink')}
                                    placeholder="https://canva.com/design/... or https://figma.com/..."
                                    className="pl-9 text-xs"
                                />
                            </div>

                            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors w-full justify-center">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                {uploading === 'presentation' ? 'Uploading Presentation...' : 'Upload Presentation Deck (PDF/PPT)'}
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    disabled={uploading === 'presentation'}
                                    onChange={(e) => handleFileUpload(e, 'presentation')}
                                />
                            </label>

                            {presentationAttachments.length > 0 && (
                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                    {presentationAttachments.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-indigo-500/5 dark:bg-indigo-950/30 border border-indigo-500/20 text-indigo-900 dark:text-indigo-300">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                                <a href={file.url} target="_blank" rel="noreferrer" className="truncate hover:underline font-medium">
                                                    {file.filename || file.name || `Presentation Deck ${i + 1}`}
                                                </a>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment('presentation', i)}
                                                className="text-slate-400 hover:text-rose-500 font-bold ml-2 p-0.5"
                                                title="Remove File"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Field>
                </div>

                {/* 3. Client Selection Repeatable Subform */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 pt-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> 3. Client Selection Subform (Approved items, quantities, rooms & remarks)
                        </h4>
                        <Button type="button" size="sm" variant="ghost" icon={Plus} onClick={addClientSelectionRow} className="text-xs">
                            Add Selection Item
                        </Button>
                    </div>
                </div>

                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {clientSelections.map((row, idx) => (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="w-full sm:w-1/3">
                                <Input
                                    value={row.item || ''}
                                    onChange={(e) => updateClientSelectionRow(idx, 'item', e.target.value)}
                                    placeholder="Approved Item (e.g. Motorized Drapes)"
                                    className="text-xs"
                                />
                            </div>
                            <div className="w-24">
                                <Input
                                    type="number"
                                    min="1"
                                    value={row.quantity || 1}
                                    onChange={(e) => updateClientSelectionRow(idx, 'quantity', Number(e.target.value))}
                                    placeholder="Qty"
                                    className="text-xs"
                                />
                            </div>
                            <div className="w-full sm:w-1/4">
                                <Select
                                    value={row.room || 'Living Room'}
                                    onChange={(e) => updateClientSelectionRow(idx, 'room', e.target.value)}
                                    options={ROOM_OPTIONS.map((r) => ({ value: r, label: r }))}
                                />
                            </div>
                            <div className="flex-1 min-w-[140px]">
                                <Input
                                    value={row.remarks || ''}
                                    onChange={(e) => updateClientSelectionRow(idx, 'remarks', e.target.value)}
                                    placeholder="Remarks / specs..."
                                    className="text-xs"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                icon={Trash2}
                                onClick={() => removeClientSelectionRow(idx)}
                                className="text-slate-400 hover:text-rose-500 shrink-0"
                            />
                        </div>
                    ))}
                </div>

                {/* 4. Searchable Fabric Selection Subform */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 pt-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Layers className="w-4 h-4" /> 4. Fabric Selection (Searchable fabric lookup per room/item)
                        </h4>
                        <Button type="button" size="sm" variant="ghost" icon={Plus} onClick={addFabricSelectionRow} className="text-xs">
                            Add Fabric Selection
                        </Button>
                    </div>
                </div>

                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {fabricSelections.map((row, idx) => (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="w-full sm:w-1/3">
                                <Select
                                    value={row.room || 'Living Room'}
                                    onChange={(e) => updateFabricRoom(idx, e.target.value)}
                                    options={ROOM_OPTIONS.map((r) => ({ value: r, label: r }))}
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <SearchableFabricSelector
                                    value={row.fabric || ''}
                                    onChange={(fabName, code) => updateFabricSelectionRow(idx, fabName, code)}
                                    fabricCatalog={fabricCatalog}
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                icon={Trash2}
                                onClick={() => removeFabricSelectionRow(idx)}
                                className="text-slate-400 hover:text-rose-500 shrink-0"
                            />
                        </div>
                    ))}
                </div>

                {/* 5. Design Direction & Revision Notes (Long Free Text) */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> 5. Design Direction & Revision Notes (Long Free Text)
                    </h4>
                </div>

                <Field label="Design Direction" hint="Final approved design direction & aesthetic instructions">
                    <Textarea
                        rows={3}
                        value={form.designDirection}
                        onChange={set('designDirection')}
                        placeholder="e.g. Modern minimalist floor-to-ceiling motorized sheer drapes with concealed ceiling recess tracks..."
                        className="text-xs"
                    />
                </Field>

                <Field label="Revision Notes" hint="Mandatory for changes after approval; retained in revision history">
                    <Textarea
                        rows={3}
                        value={form.revisionNotes}
                        onChange={set('revisionNotes')}
                        placeholder="Enter revision notes, change logs, or client feedback details..."
                        className="text-xs"
                    />
                </Field>

                {/* Revision & Change Control Audit Log */}
                {revisionsList.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowRevisionsHistory(!showRevisionsHistory)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 py-1"
                        >
                            <span className="flex items-center gap-1.5">
                                <History className="w-4 h-4 text-amber-500" />
                                Revision & Change-Control Audit Trail ({revisionsList.length} revision(s))
                            </span>
                            <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium hover:underline">
                                {showRevisionsHistory ? 'Hide Audit Log' : 'Show Audit Log'}
                            </span>
                        </button>

                        {showRevisionsHistory && (
                            <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                                {revisionsList.slice().reverse().map((rev, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                                        <div className="flex items-center justify-between font-medium">
                                            <div className="flex items-center gap-2">
                                                <Badge tone="amber">
                                                    Rev #{rev.revisionNumber || (revisionsList.length - idx)}
                                                </Badge>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {formatDateTime(rev.revisedAt)}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                                {rev.finalApprovedVersion ? `Version: ${rev.finalApprovedVersion}` : 'No version tag'}
                                            </span>
                                        </div>

                                        {rev.changeReason && (
                                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                                                <strong className="font-semibold">Reason for Revision:</strong> {rev.changeReason}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                                            <div><strong className="text-slate-700 dark:text-slate-300">Design Direction:</strong> {rev.designDirection || '—'}</div>
                                            <div><strong className="text-slate-700 dark:text-slate-300">Prior Status:</strong> {rev.clientApprovalStatus || 'APPROVED'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    );
};

const SpreadsheetGridView = ({ items, onView, onEdit, selectedSection = 's12', onSectionChange }) => {
    const currentSection = (selectedSection && SPREADSHEET_SECTIONS.some((s) => s.id === selectedSection)) ? selectedSection : 's12';
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

            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto select-none relative">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="sticky top-0 z-20 text-center shadow-sm bg-[#836444] text-white font-bold border-b border-amber-300 dark:border-amber-500/30">
                            <th className="bg-[#6b5240] dark:bg-slate-950 border-b border-r border-amber-300/40 dark:border-slate-800 p-4 text-[10px] uppercase text-center font-semibold text-amber-100 dark:text-slate-400 z-30">
                                Code
                            </th>
                            {visibleSections.map((sec) =>
                                sec.cols.filter((c) => c.key !== 'sno' && c.key !== 'code').map((col) => (
                                    <th key={col.key} className="border-b border-r border-amber-300/40 dark:border-slate-800/80 p-3 text-[10px] uppercase font-semibold text-amber-50 dark:text-slate-300 whitespace-nowrap min-w-[140px] bg-[#836444] dark:bg-slate-900/90">
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
                                        <td key={col.key} className="p-3 border-r border-slate-200 dark:border-slate-800/60 whitespace-nowrap">
                                            {renderSpreadsheetCell(lead, col.key, idx + 1, onView, onEdit)}
                                        </td>
                                    ))
                                )}
                                <td className="p-2 bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 text-right sticky right-0 z-10 border-l border-slate-200 dark:border-slate-800/80">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => onView(lead)} title="View Details" />
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(lead)} title="Edit Approval & Presentation" />
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

const ClientApproval = ({ items: itemsProp = [] }) => {
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
            .catch((err) => setError(err?.message || 'Failed to fetch client approval data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const search = searchParams.get('search') || '';
    const selectedSection = searchParams.get('section') || 's12';

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
            navigate(`/crm/sales-commercials/leads/${lead.code}?tab=client-approval`);
        }
    };

    const rawLeads = (itemsProp && itemsProp.length > 0) ? itemsProp : (Array.isArray(salesLeads) ? salesLeads : []);

    const quotationReadyLeads = rawLeads.filter((lead) => {
        const q = lead.quotation || {};
        return Boolean(
            q.no ||
            q.finalQuotedValue ||
            q.date ||
            q.dueDate ||
            q.version ||
            (Array.isArray(q.boq) && q.boq.length > 0) ||
            q.discountApprovalStatus === 'APPROVED' ||
            lead.approval?.finalApprovedVersion ||
            lead.quotationNo ||
            lead.approval?.clientApprovalStatus
        );
    });

    const filteredLeads = quotationReadyLeads.filter((lead) => {
        if (search) {
            const q = search.toLowerCase();
            const code = String(lead.code || '').toLowerCase();
            const clientName = String(lead.clientName || '').toLowerCase();
            const version = String(lead.approval?.finalApprovedVersion || '').toLowerCase();
            const status = String(lead.approval?.clientApprovalStatus || '').toLowerCase();
            if (!code.includes(q) && !clientName.includes(q) && !version.includes(q) && !status.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalCount = quotationReadyLeads.length;
    const approvedCount = quotationReadyLeads.filter((l) => l.approval?.clientApprovalStatus === 'APPROVED').length;
    const pendingCount = quotationReadyLeads.filter((l) => l.approval?.clientApprovalStatus === 'PENDING' || (l.approval?.planned && l.approval?.clientApprovalStatus !== 'APPROVED')).length;
    const revisionsLoggedCount = quotationReadyLeads.filter((l) => (l.approval?.revisions?.length || 0) > 0).length;

    return (
        <div>
            <PageHeader
                title="Client Approval Workspace"
                subtitle="Manage approval due dates, client approval statuses, proof of signoff documents, linked approved versions, presentations, dynamic client selections & searchable fabric lookups"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile label="Approval Pipeline" value={totalCount} sub="Leads awaiting signoff" icon={ShieldCheck} tone="orange" />
                <StatTile label="Approved Quotes" value={approvedCount} sub="Client signoffs secured" icon={CheckCircle2} tone="green" />
                <StatTile label="Pending Approvals" value={pendingCount} sub="Due for client decision" icon={Calendar} tone="amber" />
                <StatTile label="Revisions Logged" value={revisionsLoggedCount} sub="Under change control" icon={RotateCcw} tone="blue" />
            </div>

            <Panel className="mb-4">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => updateParam('search', e.target.value, '')}
                            placeholder="Search code, client, version, or status..."
                            className="pl-9 text-xs"
                        />
                    </div>

                    {(search || selectedSection !== 's12') && (
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
                    <Loading text="Loading Client Approval Details..." />
                </Panel>
            ) : error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : filteredLeads.length === 0 ? (
                <Panel className="p-8 text-center">
                    <EmptyState icon={ShieldCheck} title="No Client Approval Records Found" hint="Try adjusting search parameters." />
                </Panel>
            ) : (
                <SpreadsheetGridView
                    items={filteredLeads}
                    onView={handleViewLead}
                    onEdit={(lead) => setEditingLead(lead)}
                    selectedSection={selectedSection}
                    onSectionChange={(sec) => updateParam('section', sec, 's12')}
                />
            )}

            {editingLead && (
                <ClientApprovalEditModal
                    item={editingLead}
                    onClose={() => setEditingLead(null)}
                    onDone={reload}
                />
            )}
        </div>
    );
};

export default ClientApproval;
