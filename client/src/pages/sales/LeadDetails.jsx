import { useEffect, useState } from "react";
import { Paperclip, Pencil, UserCheck, BadgeDollarSign, MapPin, User, FileText, Download, ArrowRightCircle, CheckCircle2, Ruler, ClipboardList, Wallet, ReceiptText, ShieldCheck, Presentation as PresentationIcon, CalendarCheck2 } from 'lucide-react';
import { Button, Badge, StatusBadge, Loading } from '../../components/ui';
import { currency, date, humanise } from '../../utils/format';
import { useSelector } from "react-redux";
import useSales from "../../hooks/useSales";
import { useParams, useNavigate } from "react-router-dom";


/** Compact label/value tile used across the Sales & Commercials detail panels. */
const InfoTile = ({ label, value }) => (
    <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
        <span className="text-slate-400 block text-[10px] uppercase">{label}</span>
        <span className="text-slate-200 text-xs">{value || value === 0 ? value : '—'}</span>
    </div>
);

/** Downloadable file badges used across the Sales & Commercials detail panels. */
const AttachmentLinks = ({ label, files }) => (
    <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-brand-400" /> {label} ({files?.length || 0})
        </span>
        {!(files && files.length > 0) ? (
            <p className="text-xs text-slate-500 italic">None attached.</p>
        ) : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 hover:border-brand-500/50 rounded-lg text-xs transition group" >
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                        <span className="truncate text-slate-300 group-hover:text-brand-300">{att.filename || `File ${i + 1}`}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 shrink-0 ml-2" />
                </a>
            ))}
        </div>
        }
    </div>
);

const LeadDetails = ({ onClose: propOnClose, onEdit: propOnEdit, onAssign: propOnAssign, onQualify: propOnQualify, onConvert: propOnConvert }) => {

    const navigate = useNavigate();
    const { LeadCode, code } = useParams();
    const targetCode = LeadCode || code;

    const [activeDetailTab, setActiveDetailTab] = useState('client');

    const DETAIL_TABS = [
        { id: 'client', label: 'Client & Overview', icon: User },
        { id: 'site', label: 'Site & Measurement', icon: MapPin },
        { id: 'studio', label: 'Studio & BOQ', icon: CalendarCheck2 },
        { id: 'proposals', label: 'Proposal & Token', icon: ReceiptText },
        { id: 'quotation', label: 'Quotation & Approval', icon: ShieldCheck },
    ];

    const onClose = propOnClose || (() => navigate('/crm/sales-commercials/leads'));
    const onEdit = propOnEdit || ((l) => navigate(`/crm/leads?edit=${l?.code || ''}`));
    const onAssign = propOnAssign || ((l) => navigate(`/crm/dcm-assignments?lead=${l?.code || ''}`));
    const onQualify = propOnQualify || ((l) => navigate(`/crm/qualification?lead=${l?.code || ''}`));
    const onConvert = propOnConvert || ((l) => navigate(`/crm/qualification?lead=${l?.code || ''}`));

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
                <Loading message="Loading lead details..." />
            </div>
        );
    }

    return (<>
        <div className="flex flex-wrap bg-sky-900/60 border border-sky-700/80 mb-4 p-2 rounded-md items-center justify-between gap-2 w-full">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <div className="flex items-center gap-2">
                <Button variant="secondary" icon={Pencil} onClick={() => { onClose(); onEdit(lead); }}>
                    Edit Lead
                </Button>
                {lead.status === 'NEW' && (
                    <Button variant="outline" icon={UserCheck} onClick={() => { onClose(); onAssign(lead); }}>
                        Assign Owner
                    </Button>
                )}
                {['NEW', 'CONTACTED'].includes(lead.status) && (
                    <Button variant="outline" icon={CheckCircle2} onClick={() => { onClose(); onQualify(lead); }}>
                        Qualify
                    </Button>
                )}
                {lead.status === 'QUALIFIED' && (
                    <Button variant="primary" icon={ArrowRightCircle} onClick={() => { onClose(); onConvert(lead); }}>
                        Convert to Client
                    </Button>
                )}
            </div>
        </div>


        <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto overflow-x-hidden pr-2">
            {/* Status Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <div>
                    <p className="text-xs text-slate-400">Current Lead Status</p>
                    <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={lead.status} />
                        <Badge tone={lead.priority === 'HOT' ? 'rose' : lead.priority === 'MEDIUM' ? 'amber' : 'slate'}>
                            {lead.priority} PRIORITY
                        </Badge>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs text-slate-400">Indicative Budget</p>
                    <p className="text-lg font-bold text-slate-100 numeric">
                        {lead.budget ? currency(lead.budget) : 'Unspecified'}
                    </p>
                    <Badge tone={BUDGET_TONES[lead.budgetClassification] || 'blue'}>
                        {lead.budgetClassification || 'MID_RANGE'}
                    </Badge>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                {DETAIL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeDetailTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveDetailTab(tab.id)}
                            className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs transition-all ${isActive
                                ? 'bg-brand-500 text-slate-950 font-bold shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                                }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-brand-400'}`} />
                            <span className="truncate">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: CLIENT & OVERVIEW */}
            {activeDetailTab === 'client' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-slate-900/30 border border-slate-800/80 rounded-lg space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Contact & Capture</p>
                            <div className="space-y-1.5 text-xs">
                                <p><strong className="text-slate-400">Lead ID:</strong> <span className="font-mono text-brand-300">{lead.code}</span></p>
                                <p><strong className="text-slate-400">Capture Date & Time:</strong> {date(lead.captureDateTime || lead.createdAt, { time: true })}</p>
                                <p><strong className="text-slate-400">Client Name:</strong> {lead.clientName}</p>
                                <p><strong className="text-slate-400">Contact Person:</strong> {lead.contactPerson || '—'}</p>
                                <p><strong className="text-slate-400">Mobile Number:</strong> <span className="text-slate-200">{lead.phone}</span></p>
                                <p><strong className="text-slate-400">Email:</strong> {lead.email || '—'}</p>
                                <p><strong className="text-slate-400">Location:</strong> {lead.location || '—'}</p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-slate-900/30 border border-slate-800/80 rounded-lg space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Source & Relationships</p>
                            <div className="space-y-1.5 text-xs">
                                <p><strong className="text-slate-400">Lead Source:</strong> {humanise(lead.source)}</p>
                                <p><strong className="text-slate-400">Architect / Designer:</strong> {lead.architect?.name || lead.architectName || '—'}</p>
                                <p><strong className="text-slate-400">Architect Involved:</strong> {lead.architectInvolved ? 'Yes' : 'No'} {lead.architectInvolvedDetails ? `(${lead.architectInvolvedDetails})` : ''}</p>
                                <p><strong className="text-slate-400">Previous Relationship:</strong> {lead.previousClientRelationship ? 'Yes' : 'No'} {lead.previousClientRelationshipDetails ? `(${lead.previousClientRelationshipDetails})` : ''}</p>
                                <p><strong className="text-slate-400">Relationship Owner:</strong> {lead.existingRelationshipOwner?.name || lead.existingRelationshipOwnerName || lead.assignedDCM?.name || 'Unassigned'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Requirement Summary</p>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">
                            {lead.requirementSummary || lead.requirement || 'No specific requirement details recorded yet.'}
                        </p>
                    </div>

                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center justify-between">
                            <span>General Attachments ({lead.attachments?.length || 0})</span>
                        </p>
                        {!(lead.attachments && lead.attachments.length > 0) ? (
                            <p className="text-xs text-slate-500 italic">No general files attached to this lead.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {lead.attachments.map((att, i) => (
                                    <a
                                        key={i}
                                        href={att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 hover:border-brand-500/50 rounded-lg text-xs transition group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Paperclip className="w-4 h-4 text-brand-400 shrink-0" />
                                            <span className="truncate text-slate-300 group-hover:text-brand-300">{att.filename || `File ${i + 1}`}</span>
                                        </div>
                                        <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 shrink-0 ml-2" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: SITE & MEASUREMENT */}
            {activeDetailTab === 'site' && (
                <div className="space-y-4">
                    {/* Site Visit, Installer & Technical Parameters Panel */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <MapPin className="w-3.5 h-3.5" /> Site Visit, Installer & Technical Specifications
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                                <span className="text-slate-400 block text-[10px] uppercase">Site Visit Due Date</span>
                                <span className="font-semibold text-slate-200">{lead.siteVisitDueDate ? date(lead.siteVisitDueDate) : 'Not scheduled'}</span>
                            </div>

                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                                <span className="text-slate-400 block text-[10px] uppercase">Actual Site Visit Date & Time</span>
                                <span className="font-semibold text-slate-200">{lead.actualSiteVisitDateTime ? date(lead.actualSiteVisitDateTime, { time: true }) : 'Pending visit'}</span>
                            </div>

                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                                <span className="text-slate-400 block text-[10px] uppercase">Client / Architect Availability</span>
                                <span className="text-slate-200">{lead.clientArchitectAvailability || '—'}</span>
                            </div>

                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                                <span className="text-slate-400 block text-[10px] uppercase">Assigned Installer / Measurement</span>
                                <span className="font-semibold text-slate-200">{lead.assignedInstaller?.name || lead.assignedInstallerName || 'Unassigned'}</span>
                            </div>

                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                                <span className="text-slate-400 block text-[10px] uppercase">Installer Availability</span>
                                <Badge tone={lead.installerAvailability === 'AVAILABLE' ? 'emerald' : lead.installerAvailability === 'BUSY' ? 'amber' : lead.installerAvailability === 'ON_SITE' ? 'blue' : lead.installerAvailability === 'UNAVAILABLE' ? 'rose' : 'slate'}>
                                    {lead.installerAvailability || 'AVAILABLE'}
                                </Badge>
                            </div>

                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                                <span className="text-slate-400 block text-[10px] uppercase">Rooms</span>
                                <span className="text-slate-200">{lead.rooms || '—'}</span>
                            </div>
                        </div>

                        {lead.siteAddress && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Site Address</span>
                                <p className="text-slate-200">{lead.siteAddress}</p>
                            </div>
                        )}

                        {lead.scope && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Scope</span>
                                <p className="text-slate-200">{lead.scope}</p>
                            </div>
                        )}

                        <AttachmentLinks label="Drawings / Renders" files={lead.drawingsRenders} />
                    </div>

                    {/* Measurement Details */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <Ruler className="w-3.5 h-3.5" /> Measurement
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
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Measurements</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.measurement.notes}</p>
                            </div>
                        )}
                        <AttachmentLinks label="Site Photos / Measurement Attachments" files={lead.measurement?.attachments} />
                        <AttachmentLinks label="Measurement Drawings" files={lead.measurement?.drawings} />
                    </div>
                </div>
            )}

            {/* TAB 3: STUDIO & BOQ */}
            {activeDetailTab === 'studio' && (
                <div className="space-y-4">
                    {/* Studio Meeting */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <CalendarCheck2 className="w-3.5 h-3.5" /> Studio Meeting
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <InfoTile label="Studio Meeting Due Date" value={lead.studioMeeting?.dueDate ? date(lead.studioMeeting.dueDate) : null} />
                            <InfoTile label="Meeting Date" value={lead.studioMeeting?.date ? date(lead.studioMeeting.date) : null} />
                            <InfoTile label="Meeting Attendees" value={lead.studioMeeting?.attendees} />
                            <InfoTile label="Pricing Range" value={lead.studioMeeting?.pricingRange} />
                        </div>
                        {lead.studioMeeting?.feedback && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Client Feedback / Meeting Outcome</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.feedback}</p>
                            </div>
                        )}
                        {lead.studioMeeting?.nextAction && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Next Action from the Meeting</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.nextAction}</p>
                            </div>
                        )}
                        {lead.studioMeeting?.architectBrief && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Architect Brief</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.studioMeeting.architectBrief}</p>
                            </div>
                        )}
                        <AttachmentLinks label="Client Drawings" files={lead.studioMeeting?.clientDrawings} />
                        <AttachmentLinks label="Samples" files={lead.studioMeeting?.samples} />
                        <AttachmentLinks label="Project Pictures" files={lead.studioMeeting?.projectPictures} />
                    </div>

                    {/* Room Readiness / Ready Size */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <ClipboardList className="w-3.5 h-3.5" /> Room Readiness / Ready Size
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
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Final Measurements</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.readySize.finalMeasurements}</p>
                            </div>
                        )}
                    </div>

                    {/* Consumption / BOQ */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <ClipboardList className="w-3.5 h-3.5" /> Consumption Sheet / BOQ
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
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Room List</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.consumption.roomList}</p>
                            </div>
                        )}
                        {lead.consumption?.measurements && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Measurements</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.consumption.measurements}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: PROPOSALS & TOKEN */}
            {activeDetailTab === 'proposals' && (
                <div className="space-y-4">
                    {/* Proposal */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <ReceiptText className="w-3.5 h-3.5" /> Proposal
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
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Client Brief</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.proposal.clientBrief}</p>
                            </div>
                        )}
                        {lead.proposal?.terms && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Terms</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.proposal.terms}</p>
                            </div>
                        )}
                        {lead.proposal?.refundRevisionClause && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Refund / Revision Clause</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.proposal.refundRevisionClause}</p>
                            </div>
                        )}
                        <AttachmentLinks label="Consumption Sheet" files={lead.proposal?.consumptionSheet} />
                    </div>

                    {/* Token / Advance */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <Wallet className="w-3.5 h-3.5" /> Token / Advance Discussion
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
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Commercial Terms</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.token.commercialTerms}</p>
                            </div>
                        )}
                        <AttachmentLinks label="Proposal Attachment" files={lead.token?.proposalAttachment} />
                    </div>

                    {/* Costing */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <BadgeDollarSign className="w-3.5 h-3.5" /> Costing
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

            {/* TAB 5: QUOTATION & APPROVAL */}
            {activeDetailTab === 'quotation' && (
                <div className="space-y-4">
                    {/* Quotation */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <ReceiptText className="w-3.5 h-3.5" /> Quotation
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

                    {/* Client Approval */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> Client Approval
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <InfoTile label="Planned" value={lead.approval?.planned} />
                            <InfoTile label="Client Approval Status" value={lead.approval?.clientApprovalStatus ? humanise(lead.approval.clientApprovalStatus) : null} />
                            <InfoTile label="Final Quotation / Proposal Version Approved" value={lead.approval?.finalApprovedVersion} />
                        </div>
                        <AttachmentLinks label="Approval Proof / Attachment" files={lead.approval?.proofAttachment} />
                    </div>

                    {/* Presentation */}
                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                            <PresentationIcon className="w-3.5 h-3.5" /> Presentation
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <InfoTile label="Client Selection" value={lead.presentation?.clientSelection} />
                            <InfoTile label="Fabric Selection" value={lead.presentation?.fabricSelection} />
                            <InfoTile label="Design Direction" value={lead.presentation?.designDirection} />
                        </div>
                        {lead.presentation?.revisionNotes && (
                            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Revision Notes</span>
                                <p className="text-slate-200 whitespace-pre-wrap">{lead.presentation.revisionNotes}</p>
                            </div>
                        )}
                        <AttachmentLinks label="Presentation Attachment" files={lead.presentation?.attachment} />
                    </div>
                </div>
            )}
        </div>
    </>
    );
};


export default LeadDetails