import React, { useState, useEffect } from 'react';
import {
    X, Layers, Settings, Zap, Paperclip, FileCode, Upload,
    Loader2, Trash2, ExternalLink, Image as ImageIcon, Plus, Check, Save
} from 'lucide-react';
import { Button, Input, Select, Field, Badge } from '../ui';
import { uploadApi } from '../../api';
import { getMediaUrl, date } from '../../utils/format';

/**
 * Right-side Slide-Over Inspector Drawer for deep window specifications:
 * Pelmets, Channels, Motors, Wirings, Site Photos, and Versioned Drawings.
 */
const MeasurementDetailsDrawer = ({
    open = false,
    row = null,
    rowIndex = null,
    onClose,
    onSaveRowDetails,
}) => {
    const [form, setForm] = useState(row || {});
    const [pelmetDetails, setPelmetDetails] = useState(row?.pelmetDetails || []);
    const [channelDetails, setChannelDetails] = useState(row?.channelDetails || []);
    const [motorDetails, setMotorDetails] = useState(row?.motorDetails || []);
    const [wiringDetails, setWiringDetails] = useState(row?.wiringDetails || []);
    const [attachments, setAttachments] = useState(row?.attachments || []);
    const [drawings, setDrawings] = useState(row?.drawings || []);

    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadingDrawings, setUploadingDrawings] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    useEffect(() => {
        if (row) {
            setForm(row);
            setPelmetDetails(row.pelmetDetails || []);
            setChannelDetails(row.channelDetails || []);
            setMotorDetails(row.motorDetails || []);
            setWiringDetails(row.wiringDetails || []);
            setAttachments(row.attachments || []);
            setDrawings(row.drawings || []);
        }
    }, [row]);

    if (!open || !row) return null;

    // File Upload Handlers
    const handleMediaUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadingMedia(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            files.forEach((f) => formData.append('files', f));
            const res = await uploadApi.upload(formData);
            const uploaded = (res.data || []).map((file) => ({
                url: file.url,
                filename: file.filename || file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: new Date().toISOString(),
            }));
            setAttachments((prev) => [...prev, ...uploaded]);
        } catch (err) {
            setUploadError(err?.message || 'Failed to upload media');
        } finally {
            setUploadingMedia(false);
            e.target.value = '';
        }
    };

    const handleDrawingUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadingDrawings(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            files.forEach((f) => formData.append('files', f));
            const res = await uploadApi.upload(formData);
            setDrawings((prev) => {
                const startVer = prev.length + 1;
                const uploaded = (res.data || []).map((file, i) => ({
                    url: file.url,
                    filename: file.filename || file.originalname,
                    version: startVer + i,
                    uploadedAt: new Date().toISOString(),
                }));
                return [...prev, ...uploaded];
            });
        } catch (err) {
            setUploadError(err?.message || 'Failed to upload drawing');
        } finally {
            setUploadingDrawings(false);
            e.target.value = '';
        }
    };

    const handleSave = () => {
        const updatedRow = {
            ...form,
            pelmetDetails,
            channelDetails,
            motorDetails,
            wiringDetails,
            attachments,
            drawings,
        };
        onSaveRowDetails(rowIndex, updatedRow);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
            <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Measurement Specifications</span>
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                                {form.windowId || form.label || 'W-01'}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{form.room || 'Living Room'} • {form.particular || 'Main Curtain'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
                    {uploadError && (
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-lg text-xs">
                            {uploadError}
                        </div>
                    )}

                    {/* Section 1: Pelmet Details */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-amber-500" /> Pelmet Specifications ({pelmetDetails.length})
                            </h4>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                icon={Plus}
                                onClick={() => setPelmetDetails([...pelmetDetails, { pelmetType: 'Wooden Box', dimensions: '', notes: '' }])}
                            >
                                Add Pelmet
                            </Button>
                        </div>
                        {pelmetDetails.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px]">No pelmet specification added.</p>
                        ) : (
                            <div className="space-y-2">
                                {pelmetDetails.map((p, idx) => (
                                    <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select
                                                value={p.pelmetType}
                                                onChange={(e) => {
                                                    const updated = [...pelmetDetails];
                                                    updated[idx].pelmetType = e.target.value;
                                                    setPelmetDetails(updated);
                                                }}
                                                options={[
                                                    { value: 'Wooden Box', label: 'Wooden Box' },
                                                    { value: 'Recessed Pelmet', label: 'Recessed Pelmet' },
                                                    { value: 'Fabric Covered', label: 'Fabric Covered' },
                                                    { value: 'Plasterboard', label: 'Plasterboard Coving' },
                                                ]}
                                            />
                                            <Input
                                                placeholder="Dimensions (W x H x D)"
                                                value={p.dimensions || ''}
                                                onChange={(e) => {
                                                    const updated = [...pelmetDetails];
                                                    updated[idx].dimensions = e.target.value;
                                                    setPelmetDetails(updated);
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Notes..."
                                                value={p.notes || ''}
                                                onChange={(e) => {
                                                    const updated = [...pelmetDetails];
                                                    updated[idx].notes = e.target.value;
                                                    setPelmetDetails(updated);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setPelmetDetails(pelmetDetails.filter((_, i) => i !== idx))}
                                                className="p-1 text-slate-400 hover:text-rose-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Channel Details */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Settings className="w-4 h-4 text-indigo-500" /> Channel Specifications ({channelDetails.length})
                            </h4>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                icon={Plus}
                                onClick={() => setChannelDetails([...channelDetails, { channelType: 'Single Track', quantity: 1, dimensions: '' }])}
                            >
                                Add Channel
                            </Button>
                        </div>
                        {channelDetails.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px]">No channel specification added.</p>
                        ) : (
                            <div className="space-y-2">
                                {channelDetails.map((c, idx) => (
                                    <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select
                                                value={c.channelType}
                                                onChange={(e) => {
                                                    const updated = [...channelDetails];
                                                    updated[idx].channelType = e.target.value;
                                                    setChannelDetails(updated);
                                                }}
                                                options={[
                                                    { value: 'Single Track', label: 'Single Track' },
                                                    { value: 'Double Track', label: 'Double Track' },
                                                    { value: 'Ceiling Recessed', label: 'Ceiling Recessed' },
                                                    { value: 'Heavy Duty Track', label: 'Heavy Duty Motorised Track' },
                                                ]}
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Qty"
                                                value={c.quantity || 1}
                                                onChange={(e) => {
                                                    const updated = [...channelDetails];
                                                    updated[idx].quantity = Number(e.target.value);
                                                    setChannelDetails(updated);
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Dimensions / Length..."
                                                value={c.dimensions || ''}
                                                onChange={(e) => {
                                                    const updated = [...channelDetails];
                                                    updated[idx].dimensions = e.target.value;
                                                    setChannelDetails(updated);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setChannelDetails(channelDetails.filter((_, i) => i !== idx))}
                                                className="p-1 text-slate-400 hover:text-rose-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Motor Specifications */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-sky-500" /> Motor Specifications ({motorDetails.length})
                            </h4>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                icon={Plus}
                                onClick={() => setMotorDetails([...motorDetails, { motorType: 'Somfy WireFree', quantity: 1, specification: '' }])}
                            >
                                Add Motor
                            </Button>
                        </div>
                        {motorDetails.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px]">No motor specification added.</p>
                        ) : (
                            <div className="space-y-2">
                                {motorDetails.map((m, idx) => (
                                    <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select
                                                value={m.motorType}
                                                onChange={(e) => {
                                                    const updated = [...motorDetails];
                                                    updated[idx].motorType = e.target.value;
                                                    setMotorDetails(updated);
                                                }}
                                                options={[
                                                    { value: 'Somfy WireFree', label: 'Somfy WireFree (Battery)' },
                                                    { value: 'Somfy RTS 230V', label: 'Somfy RTS (230V AC)' },
                                                    { value: 'Somfy Glydea', label: 'Somfy Glydea' },
                                                    { value: 'Tuya Smart', label: 'Tuya / Zigbee Motor' },
                                                ]}
                                            />
                                            <Input
                                                placeholder="Specification / Torque"
                                                value={m.specification || ''}
                                                onChange={(e) => {
                                                    const updated = [...motorDetails];
                                                    updated[idx].specification = e.target.value;
                                                    setMotorDetails(updated);
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setMotorDetails(motorDetails.filter((_, i) => i !== idx))}
                                                className="p-1 text-slate-400 hover:text-rose-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 4: Site Photos & Attachments */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Paperclip className="w-4 h-4 text-emerald-500" /> Site Photos & Attachments ({attachments.length})
                            </h4>
                            <label className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition ${uploadingMedia ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                Upload Media
                                <input type="file" multiple accept="image/*,video/*,.pdf" className="hidden" onChange={handleMediaUpload} disabled={uploadingMedia} />
                            </label>
                        </div>
                        {attachments.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px]">No site photos uploaded.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {attachments.map((att, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <a href={getMediaUrl(att.url)} target="_blank" rel="noreferrer" className="truncate hover:underline text-slate-700 dark:text-slate-300 font-medium">
                                            {att.filename || `Photo ${i + 1}`}
                                        </a>
                                        <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 5: Versioned Drawings */}
                    <div className="space-y-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                <FileCode className="w-4 h-4 text-purple-500" /> Versioned Blueprints ({drawings.length})
                            </h4>
                            <label className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition ${uploadingDrawings ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploadingDrawings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                Upload Drawing
                                <input type="file" multiple accept="image/*,.pdf,.dwg" className="hidden" onChange={handleDrawingUpload} disabled={uploadingDrawings} />
                            </label>
                        </div>
                        {drawings.length === 0 ? (
                            <p className="text-purple-400 italic text-[11px]">No drawings attached to this record.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {drawings.map((dwg, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/40 rounded-lg">
                                        <div className="flex items-center gap-2 truncate">
                                            <Badge tone="purple">v{dwg.version || i + 1}</Badge>
                                            <a href={getMediaUrl(dwg.url)} target="_blank" rel="noreferrer" className="truncate hover:underline text-purple-900 dark:text-purple-200 font-semibold">
                                                {dwg.filename || `Drawing ${i + 1}`}
                                            </a>
                                        </div>
                                        <button type="button" onClick={() => setDrawings(drawings.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Save Specifications</Button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MeasurementDetailsDrawer);
