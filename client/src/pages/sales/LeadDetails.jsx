import { useEffect } from "react";
import { Paperclip, BadgeDollarSign, MapPin, User, FileText, Download, Ruler, ClipboardList, Wallet, ReceiptText, ShieldCheck, Presentation as PresentationIcon, CalendarCheck2, ExternalLink } from 'lucide-react';
import { Badge, StatusBadge, Loading } from '../../components/ui';
import { currency, date, humanise, getMediaUrl } from '../../utils/format';
import { useSelector } from "react-redux";
import useSales from "../../hooks/useSales";
import { useParams, useSearchParams } from "react-router-dom";


/** Compact label/value tile used across the Sales & Commercials detail panels. */
const InfoTile = ({ label, value }) => (
    <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors">
        <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold tracking-wider">{label}</span>
        <span className="text-slate-900 dark:text-slate-200 text-xs font-medium leading-relaxed">{value || value === 0 ? value : '—'}</span>
    </div>
);

/** Downloadable file badges used across the Sales & Commercials detail panels. */
const AttachmentLinks = ({ label, files }) => {
    let raw = files;
    if (typeof files === 'string' && files.trim() !== '') {
        try {
            raw = JSON.parse(files);
        } catch (e) {
            if (files.includes(',')) {
                raw = files.split(',').map((s) => s.trim()).filter(Boolean);
            } else {
                raw = files.trim();
            }
        }
    }

    let fileList = [];
    if (Array.isArray(raw)) {
        fileList = raw;
    } else if (raw && typeof raw === 'object') {
        fileList = (raw.url || raw.filename || raw.name || raw.path) ? [raw] : Object.values(raw);
    } else if (typeof raw === 'string' && raw.trim() !== '') {
        fileList = [{ url: raw, filename: raw.split('/').pop() || 'Attachment' }];
    }

    return (
        <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> {label} ({fileList.length})
            </span>
            {fileList.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">None attached.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fileList.map((att, i) => {
                        const rawHref = typeof att === 'string' ? att : (att?.url || att?.path || '#');
                        const href = getMediaUrl(rawHref);
                        const isLink = att?.type === 'link' || (typeof rawHref === 'string' && (rawHref.startsWith('http://') || rawHref.startsWith('https://')));
                        const rawName = typeof att === 'object' ? (att?.name || att?.filename || att?.originalName) : (typeof att === 'string' ? att.split('/').pop() : null);
                        const filename = rawName || `File ${i + 1}`;

                        return (
                            <a
                                key={i}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-400/50 rounded-lg text-xs transition group shadow-xs"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {isLink ? (
                                        <ExternalLink className="w-4 h-4 text-sky-500 shrink-0" />
                                    ) : (
                                        <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                                    )}
                                    <span className="truncate text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-300 font-medium">{filename}</span>
                                </div>
                                <Download className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 ml-2" />
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const DETAIL_TABS = [
    { id: 'leads', label: '1. Leads (Qualified)', icon: User },
    { id: 'pre-site', label: '2. Pre Site Visit', icon: MapPin },
    { id: 'measurement', label: '3. Measurement Capture', icon: Ruler },
    { id: 'studio-meeting', label: '4. Studio Meeting', icon: CalendarCheck2 },
    { id: 'ready-size', label: '5. Ready Size Confirmation', icon: ClipboardList },
    { id: 'consumption-boq', label: '6. Consumption / BOQ', icon: FileText },
    { id: 'proposal', label: '7. Proposal Creation', icon: ReceiptText },
    { id: 'token-discussion', label: '8. Token Discussion', icon: Wallet },
    { id: 'pricing-costing', label: '9. Pricing & Costing', icon: BadgeDollarSign },
    { id: 'quotation', label: '10. Quotation Prep', icon: ReceiptText },
    { id: 'client-approval', label: '11. Client Approval', icon: ShieldCheck },
    { id: 'kyc', label: '12. KYC & Conversion', icon: PresentationIcon },
];

const LeadDetails = () => {

    const { LeadCode, code } = useParams();
    const targetCode = LeadCode || code;

    const [searchParams, setSearchParams] = useSearchParams();
    const activeDetailTab = searchParams.get('tab') && DETAIL_TABS.some(t => t.id === searchParams.get('tab'))
        ? searchParams.get('tab')
        : 'leads';

  const handleTabChange = (tabId) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set('tab', tabId);
                return next;
            },
            { replace: true }
        );
    };

    const { handleGetLead } = useSales();
    const lead = useSelector((state) => state.sales?.currentLead);

    useEffect(() => {
        if (targetCode) {
            handleGetLead(targetCode);
        }
    }, [targetCode]);


    const BUDGET_TONES = {
        ECONOMY: 'slate',
        MID_RANGE: 'blue',
        PREMIUM: 'violet',
        LUXURY: 'amber',
        ULTRA_LUXURY: 'brand',
    };

    if (!lead || (!lead._id && !lead.code)) {
        return (
            <div className="p-8 text-center">
                <Loading label="Loading lead details..." />
            </div>
        );
    }

    return <div className="space-y-4 text-sm overflow-y-auto overflow-x-hidden pr-2">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Lead Status</p>
                <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={lead.status} />
                    <Badge tone={lead.priority === 'HOT' ? 'rose' : lead.priority === 'MEDIUM' ? 'amber' : 'slate'}>
                        {lead.priority} PRIORITY
                    </Badge>
                </div>
            </div>

            <div className="text-right flex items-center gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Indicative Budget</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 numeric">
                    {lead.budget ? currency(lead.budget) : 'Unspecified'}
                </p>
                <Badge tone={BUDGET_TONES[lead.budgetClassification] || 'blue'}>
                    {lead.budgetClassification || 'MID_RANGE'}
                </Badge>
            </div>
        </div>

        {/* Section Tabs */}
        <div className="p-2.5 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sales & Commercial Stages
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Active: {DETAIL_TABS.find(t => t.id === activeDetailTab)?.label}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
                {DETAIL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeDetailTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                                isActive
                                    ? 'bg-brand-600 dark:bg-brand-500 text-white font-semibold shadow-xs'
                                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-brand-600 dark:text-brand-400'}`} />
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* STAGE 1: LEADS - (QUALIFIED DECISION) */}
        {activeDetailTab === 'leads' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <User className="w-3.5 h-3.5" /> 1. Leads - (Qualified Decision)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Contact & Capture</p>
                            <div className="space-y-1.5 text-xs">
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Lead ID:</strong> <span className="font-mono text-brand-600 dark:text-brand-300 font-semibold">{lead.code}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Capture Date & Time:</strong> <span className="text-slate-800 dark:text-slate-200">{date(lead.captureDateTime || lead.createdAt, { time: true })}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Client Name:</strong> <span className="text-slate-900 dark:text-slate-100 font-medium">{lead.clientName}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Contact Person:</strong> <span className="text-slate-800 dark:text-slate-200">{lead.contactPerson || '—'}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Mobile Number:</strong> <span className="text-slate-900 dark:text-slate-200 font-mono">{lead.phone}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Email:</strong> <span className="text-slate-800 dark:text-slate-200">{lead.email || '—'}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Location:</strong> <span className="text-slate-800 dark:text-slate-200">{lead.location || '—'}</span></p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Source & Relationships</p>
                            <div className="space-y-1.5 text-xs">
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Lead Source:</strong> <span className="text-slate-800 dark:text-slate-200">{humanise(lead.source)}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Architect / Designer:</strong> <span className="text-slate-800 dark:text-slate-200">{lead.architect?.name || lead.architectName || '—'}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Architect Involved:</strong> <span className="text-slate-800 dark:text-slate-200">{lead.architectInvolved ? 'Yes' : 'No'} {lead.architectInvolvedDetails ? `(${lead.architectInvolvedDetails})` : ''}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Previous Relationship:</strong> <span className="text-slate-800 dark:text-slate-200">{lead.previousClientRelationship ? 'Yes' : 'No'} {lead.previousClientRelationshipDetails ? `(${lead.previousClientRelationshipDetails})` : ''}</span></p>
                                <p><strong className="text-slate-500 dark:text-slate-400 font-medium">Relationship Owner:</strong> <span className="text-slate-800 dark:text-slate-200">{lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || lead.assignedDCM?.name || 'Unassigned'}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Requirement Summary</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {lead.requirementSummary || lead.requirement || 'No specific requirement details recorded yet.'}
                        </p>
                    </div>

                    <AttachmentLinks label="General Attachments" files={lead.attachments} />
                </div>
            </div>
        )}

        {/* STAGE 2: PRE SITE VISIT */}
        {activeDetailTab === 'pre-site' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <MapPin className="w-3.5 h-3.5" /> 2. Pre Site Visit
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Site Visit Due Date</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">{lead.siteVisitDueDate ? date(lead.siteVisitDueDate) : 'Not scheduled'}</span>
                        </div>

                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Actual Site Visit Date & Time</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">{lead.actualSiteVisitDateTime ? date(lead.actualSiteVisitDateTime, { time: true }) : 'Pending visit'}</span>
                        </div>

                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Client / Architect Availability</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{lead.clientArchitectAvailability || '—'}</span>
                        </div>

                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Assigned Installer / Measurement</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">{lead.assignedInstaller?.name || lead.assignedInstallerName || 'Unassigned'}</span>
                        </div>

                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Installer Availability</span>
                            <Badge tone={lead.installerAvailability === 'AVAILABLE' ? 'emerald' : lead.installerAvailability === 'BUSY' ? 'amber' : lead.installerAvailability === 'ON_SITE' ? 'blue' : lead.installerAvailability === 'UNAVAILABLE' ? 'rose' : 'slate'}>
                                {lead.installerAvailability || 'AVAILABLE'}
                            </Badge>
                        </div>

                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Rooms</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{lead.rooms || '—'}</span>
                        </div>
                    </div>

                    {lead.siteAddress && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Site Address</span>
                            <p className="text-slate-700 dark:text-slate-200">{lead.siteAddress}</p>
                        </div>
                    )}

                    {lead.scope && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Scope</span>
                            <p className="text-slate-700 dark:text-slate-200">{lead.scope}</p>
                        </div>
                    )}

                    <AttachmentLinks label="Drawings / Renders" files={lead.drawingsRenders} />
                </div>
            </div>
        )}

        {/* STAGE 3: MEASUREMENT CAPTURE */}
        {activeDetailTab === 'measurement' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <Ruler className="w-3.5 h-3.5" /> 3. Measurement Capture
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Measurement Due Date" value={lead.measurement?.dueDate ? date(lead.measurement.dueDate) : null} />
                        <InfoTile label="Measurement Date" value={lead.measurement?.date ? date(lead.measurement.date) : null} />
                        <InfoTile label="Measured By" value={lead.measurement?.measuredBy?.name} />
                        <InfoTile label="Measurement Status" value={lead.measurement?.status ? humanise(lead.measurement.status) : null} />
                        <InfoTile label="Site Access" value={lead.measurement?.siteAccess} />
                        <InfoTile label="Room List" value={lead.measurement?.roomList} />
                        <InfoTile label="Pelmet Details" value={lead.measurement?.pelmetDetails} />
                        <InfoTile label="Channel Details" value={lead.measurement?.channelDetails} />
                        <InfoTile label="Motor Details" value={lead.measurement?.motorDetails} />
                        <InfoTile label="Wiring Details" value={lead.measurement?.wiringDetails} />
                    </div>
                    {lead.measurement?.notes && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Measurements</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.measurement.notes}</p>
                        </div>
                    )}
                    <AttachmentLinks label="Site Photos / Measurement Attachments" files={lead.measurement?.attachments} />
                    <AttachmentLinks label="Measurement Drawings" files={lead.measurement?.drawings} />
                </div>
            </div>
        )}

        {/* STAGE 4: STUDIO MEETING */}
        {activeDetailTab === 'studio-meeting' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <CalendarCheck2 className="w-3.5 h-3.5" /> 4. Studio Meeting
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Studio Meeting Due Date" value={lead.studioMeeting?.dueDate ? date(lead.studioMeeting.dueDate) : null} />
                        <InfoTile label="Meeting Date" value={lead.studioMeeting?.date ? date(lead.studioMeeting.date) : null} />
                        <InfoTile label="Meeting Attendees" value={lead.studioMeeting?.attendees} />
                        <InfoTile label="Pricing Range" value={lead.studioMeeting?.pricingRange} />
                    </div>
                    {lead.studioMeeting?.feedback && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Client Feedback / Meeting Outcome</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.feedback}</p>
                        </div>
                    )}
                    {lead.studioMeeting?.nextAction && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Next Action from the Meeting</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.nextAction}</p>
                        </div>
                    )}
                    {lead.studioMeeting?.architectBrief && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Architect Brief</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.architectBrief}</p>
                        </div>
                    )}
                    <AttachmentLinks label="Client Drawings" files={lead.studioMeeting?.clientDrawings} />
                    <AttachmentLinks label="Samples" files={lead.studioMeeting?.samples} />
                    <AttachmentLinks label="Project Pictures" files={lead.studioMeeting?.projectPictures} />
                </div>
            </div>
        )}

        {/* STAGE 5: READY SIZE CONFIRMATION */}
        {activeDetailTab === 'ready-size' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <ClipboardList className="w-3.5 h-3.5" /> 5. Ready Size Confirmation
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Meeting Room Readiness" value={lead.readySize?.roomReadiness} />
                        <InfoTile label="Ready Size Due Date" value={lead.readySize?.dueDate ? date(lead.readySize.dueDate) : null} />
                        <InfoTile label="Ready Size Confirmed By" value={lead.readySize?.confirmedBy?.name} />
                        <InfoTile label="Confirmation Date" value={lead.readySize?.confirmationDate ? date(lead.readySize.confirmationDate) : null} />
                        <InfoTile label="Window Size" value={lead.readySize?.windowSize} />
                        <InfoTile label="Site Condition" value={lead.readySize?.siteCondition} />
                        <InfoTile label="Pelmet Details" value={lead.readySize?.pelmetDetails} />
                        <InfoTile label="Channel Details" value={lead.readySize?.channelDetails} />
                        <InfoTile label="Ready Height" value={lead.readySize?.readyHeight} />
                    </div>
                    {lead.readySize?.finalMeasurements && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Final Measurements</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.readySize.finalMeasurements}</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* STAGE 6: CONSUMPTION SHEET / BOQ DASHBOARD */}
        {activeDetailTab === 'consumption-boq' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <FileText className="w-3.5 h-3.5" /> 6. Consumption Sheet / BOQ Dashboard
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Consumption Sheet Due" value={lead.consumption?.sheetDueDate ? date(lead.consumption.sheetDueDate) : null} />
                        <InfoTile label="Consumption Quantity" value={lead.consumption?.quantity} />
                        <InfoTile label="Unit" value={lead.consumption?.unit} />
                        <InfoTile label="Wastage Allowance" value={lead.consumption?.wastageAllowance} />
                        <InfoTile label="BOQ / Consumption Sheet Version" value={lead.consumption?.boqVersion} />
                        <InfoTile label="BOQ Prepared By" value={typeof lead.consumption?.boqPreparedBy === 'object' ? lead.consumption?.boqPreparedBy?.name : lead.consumption?.boqPreparedBy} />
                        <InfoTile label="BOQ Prepared Date" value={lead.consumption?.boqPreparedDate ? date(lead.consumption.boqPreparedDate) : null} />
                        <InfoTile label="Panel Count" value={lead.consumption?.panelCount} />
                        <InfoTile label="Fabric / Design Selection" value={lead.consumption?.fabricDesignSelection} />
                        <InfoTile label="Lining / Accessory Assumptions" value={lead.consumption?.liningAccessoryAssumptions} />
                    </div>
                    {lead.consumption?.roomList && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Room List</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.consumption.roomList}</p>
                        </div>
                    )}
                    {lead.consumption?.measurements && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Measurements</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.consumption.measurements}</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* STAGE 7: PROPOSAL CREATION */}
        {activeDetailTab === 'proposal' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <ReceiptText className="w-3.5 h-3.5" /> 7. Proposal Creation
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Proposal Due Date" value={lead.proposal?.dueDate ? date(lead.proposal.dueDate) : null} />
                        <InfoTile label="Proposal No. / Version" value={lead.proposal?.noVersion} />
                        <InfoTile label="Proposal Date" value={lead.proposal?.date ? date(lead.proposal.date) : null} />
                        <InfoTile label="Design Direction" value={lead.proposal?.designDirection} />
                        <InfoTile label="Pricing Range" value={lead.proposal?.pricingRange} />
                        <InfoTile label="Approval Status" value={lead.proposal?.approvalStatus || 'PENDING'} />
                        <InfoTile label="Approved By" value={lead.proposal?.approvedBy || 'Hitesh / Senior DCM'} />
                    </div>
                    {lead.proposal?.clientBrief && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Client Brief</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.proposal.clientBrief}</p>
                        </div>
                    )}
                    {lead.proposal?.terms && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Terms</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.proposal.terms}</p>
                        </div>
                    )}
                    {lead.proposal?.refundRevisionClause && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Refund / Revision Clause</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.proposal.refundRevisionClause}</p>
                        </div>
                    )}
                    <AttachmentLinks label="Consumption Sheet" files={lead.proposal?.consumptionSheet} />
                </div>
            </div>
        )}

        {/* STAGE 8: BUDGETING / TOKEN DISCUSSION */}
        {activeDetailTab === 'token-discussion' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <Wallet className="w-3.5 h-3.5" /> 8. Budgeting / Token Discussion
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Token Discussion Due" value={lead.token?.discussionDueDate ? date(lead.token.discussionDueDate) : null} />
                        <InfoTile label="Token Amount" value={lead.token?.amount ? currency(lead.token.amount) : null} />
                        <InfoTile label="Token Status" value={lead.token?.status ? humanise(lead.token.status) : null} />
                        <InfoTile label="Token Received Date" value={lead.token?.receivedDate ? date(lead.token.receivedDate) : null} />
                        <InfoTile label="Budget Estimate" value={lead.token?.budgetEstimate ? currency(lead.token.budgetEstimate) : null} />
                        <InfoTile label="Project Timeline" value={lead.token?.projectTimeline} />
                        <InfoTile label="Client Budget Response" value={lead.token?.clientBudgetResponse} />
                        <InfoTile label="Client Response" value={lead.token?.clientResponse} />
                    </div>
                    {lead.token?.commercialTerms && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Commercial Terms</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.token.commercialTerms}</p>
                        </div>
                    )}
                    <AttachmentLinks label="Proposal Attachment" files={lead.token?.proposalAttachment} />
                </div>
            </div>
        )}

        {/* STAGE 9: PRICING / MATERIAL COSTING */}
        {activeDetailTab === 'pricing-costing' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <BadgeDollarSign className="w-3.5 h-3.5" /> 9. Pricing / Material Costing
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Pricing Due Date" value={lead.costing?.dueDate ? date(lead.costing.dueDate) : null} />
                        <InfoTile label="Catalogue Cost" value={lead.costing?.catalogueCost ? currency(lead.costing.catalogueCost) : null} />
                        <InfoTile label="Costing Version / Revision" value={lead.costing?.version} />
                        <InfoTile label="Landed Cost" value={lead.costing?.landedCost ? currency(lead.costing.landedCost) : null} />
                        <InfoTile label="Local Fabric Cost" value={lead.costing?.localFabricCost ? currency(lead.costing.localFabricCost) : null} />
                        <InfoTile label="Labour Cost / Custom Cost" value={lead.costing?.labourCost ? currency(lead.costing.labourCost) : null} />
                        <InfoTile label="Total Cost" value={lead.costing?.totalCost ? currency(lead.costing.totalCost) : null} />
                        <InfoTile label="Calculated Margin %" value={lead.costing?.calculatedMargin !== undefined && lead.costing?.calculatedMargin !== null ? `${lead.costing.calculatedMargin}%` : null} />
                        <InfoTile label="Sample Cost" value={lead.costing?.sampleCost ? currency(lead.costing.sampleCost) : null} />
                        <InfoTile label="Margin Model" value={lead.costing?.marginModel} />
                        <InfoTile label="Min Margin Threshold" value={lead.costing?.minMarginThreshold ? `${lead.costing.minMarginThreshold}%` : '25%'} />
                        <InfoTile label="Max Discount Threshold" value={lead.costing?.maxDiscountThreshold ? `${lead.costing.maxDiscountThreshold}%` : '15%'} />
                        <InfoTile label="Hitesh Approval Status" value={lead.costing?.hiteshApprovalStatus ? lead.costing.hiteshApprovalStatus.replace(/_/g, ' ') : 'NOT REQUIRED'} />
                        <InfoTile label="Hitesh Approval Notes" value={lead.costing?.hiteshApprovalNotes} />
                    </div>
                </div>
            </div>
        )}

        {/* STAGE 10: QUOTATION PREPARATION */}
        {activeDetailTab === 'quotation' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <ReceiptText className="w-3.5 h-3.5" /> 10. Quotation Preparation
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Quotation Due Date" value={lead.quotation?.dueDate ? date(lead.quotation.dueDate) : null} />
                        <InfoTile label="Quotation No." value={lead.quotation?.no} />
                        <InfoTile label="Quotation Version" value={lead.quotation?.version} />
                        <InfoTile label="Quotation Date" value={lead.quotation?.date ? date(lead.quotation.date) : null} />
                        <InfoTile label="Final Quoted Value" value={lead.quotation?.finalQuotedValue ? currency(lead.quotation.finalQuotedValue) : null} />
                        <InfoTile label="Taxes" value={lead.quotation?.taxes ? currency(lead.quotation.taxes) : null} />
                        <InfoTile label="Add Subtotal" value={lead.quotation?.addSubtotal ? currency(lead.quotation.addSubtotal) : null} />
                        <InfoTile label="Quotation Validity" value={lead.quotation?.validity} />
                        <InfoTile label="Discount Approval Status" value={lead.quotation?.discountApprovalStatus ? humanise(lead.quotation.discountApprovalStatus) : null} />
                        <InfoTile label="Fabric Selection" value={lead.quotation?.fabricSelection} />
                        <InfoTile label="Catalogue Price" value={lead.quotation?.cataloguePrice ? currency(lead.quotation.cataloguePrice) : null} />
                        <InfoTile label="Labour Price" value={lead.quotation?.labourPrice ? currency(lead.quotation.labourPrice) : null} />
                        <InfoTile label="Sample Price" value={lead.quotation?.samplePrice ? currency(lead.quotation.samplePrice) : null} />
                        <InfoTile label="Discount" value={lead.quotation?.discount ? currency(lead.quotation.discount) : null} />
                        <InfoTile label="Margin Rules" value={lead.quotation?.marginRules} />
                    </div>
                    <AttachmentLinks label="BOQ" files={lead.quotation?.boq} />
                </div>
            </div>
        )}

        {/* STAGE 11: CLIENT APPROVAL */}
        {activeDetailTab === 'client-approval' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> 11. Client Approval
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <InfoTile label="Approval Due Date" value={lead.approval?.planned} />
                        <InfoTile label="Client Approval Date" value={lead.approval?.clientApprovalDate} />
                        <InfoTile label="Client Approval Status" value={lead.approval?.clientApprovalStatus ? humanise(lead.approval.clientApprovalStatus) : null} />
                        <InfoTile label="Final Quotation / Proposal Version Approved" value={lead.approval?.finalApprovedVersion} />
                    </div>
                    <AttachmentLinks label="Approval Proof / Attachment" files={lead.approval?.proofAttachment} />
                </div>
            </div>
        )}

        {/* STAGE 12: KYC / CUSTOMER CONVERSION */}
        {activeDetailTab === 'kyc' && (
            <div className="space-y-4">
                <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <PresentationIcon className="w-3.5 h-3.5" /> 12. KYC / Customer Conversion
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <InfoTile label="Client Selection" value={lead.presentation?.clientSelection} />
                        <InfoTile label="Fabric Selection" value={lead.presentation?.fabricSelection} />
                        <InfoTile label="Design Direction" value={lead.presentation?.designDirection} />
                    </div>
                    {lead.presentation?.revisionNotes && (
                        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Revision Notes</span>
                            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{lead.presentation.revisionNotes}</p>
                        </div>
                    )}
                    <AttachmentLinks label="Presentation Attachment" files={lead.presentation?.attachment} />
                </div>
            </div>
        )}
    </div>
};

export default LeadDetails