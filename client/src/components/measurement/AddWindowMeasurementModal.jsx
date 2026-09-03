import React, { useState, useEffect } from 'react';
import { Plus, X, DoorOpen, ShieldAlert } from 'lucide-react';
import { Button, Input, Select, Field, Modal } from '../ui';

const PARTICULAR_OPTIONS = [
    { value: 'MAIN_CURTAIN', label: 'Main Curtain' },
    { value: 'SHEER_CURTAIN', label: 'Sheer Curtain' },
    { value: 'MOTORISED_CURTAIN', label: 'Motorised Curtain' },
    { value: 'ROMAN_BLIND', label: 'Roman Blind' },
    { value: 'WOODEN_BLIND', label: 'Wooden Blind' },
    { value: 'ROLLER_BLIND', label: 'Roller Blind' },
];

const UNIT_OPTIONS = [
    { value: 'mm', label: 'mm (Millimeters)' },
    { value: 'cm', label: 'cm (Centimeters)' },
    { value: 'in', label: 'in (Inches)' },
    { value: 'ft', label: 'ft (Feet)' },
];

/**
 * AddWindowMeasurementModal — Production-grade SaaS modal for creating
 * a new window measurement assigned to a dynamically selected room.
 */
const AddWindowMeasurementModal = ({
    open = false,
    onClose,
    onAddMeasurement,
    availableRooms = [],
    existingRows = [],
    preselectedRoom = '',
}) => {
    const [selectedRoom, setSelectedRoom] = useState('');
    const [windowId, setWindowId] = useState('');
    const [particular, setParticular] = useState('MAIN_CURTAIN');
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState('mm');
    const [validationError, setValidationError] = useState('');

    // Normalize room options to prevent duplicates
    const normalizedRooms = React.useMemo(() => {
        const set = new Set();
        (availableRooms || []).forEach((r) => {
            if (r && typeof r === 'string') set.add(r.trim());
            else if (r && r.name) set.add(r.name.trim());
        });
        // Include any rooms present in existing rows
        (existingRows || []).forEach((row) => {
            if (row.room) set.add(String(row.room).trim());
        });
        if (set.size === 0) {
            set.add('Living Room');
            set.add('Master Bedroom');
            set.add('Bedroom 1');
            set.add('Dining Room');
            set.add('Kitchen');
        }
        return Array.from(set);
    }, [availableRooms, existingRows]);

    // Auto-generate collision-free Window ID (e.g. W-05)
    const generateNextWindowId = React.useCallback(() => {
        let maxNum = 0;
        (existingRows || []).forEach((row) => {
            const rawId = String(row.windowId || row.label || '');
            const match = rawId.match(/W-(\d+)/i) || rawId.match(/(\d+)/);
            if (match && match[1]) {
                const parsed = parseInt(match[1], 10);
                if (!isNaN(parsed) && parsed > maxNum) {
                    maxNum = parsed;
                }
            }
        });
        const nextNum = maxNum + 1;
        return `W-${String(nextNum).padStart(2, '0')}`;
    }, [existingRows]);

    useEffect(() => {
        if (open) {
            setSelectedRoom(preselectedRoom || (normalizedRooms.length > 0 ? normalizedRooms[0] : ''));
            setWindowId(generateNextWindowId());
            setParticular('MAIN_CURTAIN');
            setQuantity(1);
            setUnit('mm');
            setValidationError('');
        }
    }, [open, preselectedRoom, normalizedRooms, generateNextWindowId]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError('');

        // 1. Mandatory Room Selection Validation
        if (!selectedRoom || !selectedRoom.trim()) {
            setValidationError('Please select a room.');
            return;
        }

        // 2. Window ID Validation
        const trimmedWinId = windowId.trim();
        if (!trimmedWinId) {
            setValidationError('Please enter a Window ID.');
            return;
        }

        // 3. Duplicate Window ID Protection within same room/project
        const isDuplicate = existingRows.some(
            (r) => String(r.windowId || '').toLowerCase() === trimmedWinId.toLowerCase() &&
                   String(r.room || '').toLowerCase() === selectedRoom.toLowerCase()
        );

        if (isDuplicate) {
            setValidationError(`Window ID "${trimmedWinId}" already exists in ${selectedRoom}. Please use another ID.`);
            return;
        }

        // 4. Construct valid measurement record
        const newMeasurement = {
            id: `win-${Date.now()}-${existingRows.length}`,
            room: selectedRoom.trim(),
            windowId: trimmedWinId,
            particular: particular,
            frameToFrameWidth: '',
            frameToFrameHeight: '',
            outToOutWidth: '',
            outToOutHeight: '',
            curtainReturnLeft: '',
            curtainReturnRight: '',
            quantity: Math.max(1, Number(quantity) || 1),
            unit: unit || 'mm',
            pelmetDetails: [],
            channelDetails: [],
            motorDetails: [],
            wiringDetails: [],
        };

        onAddMeasurement(newMeasurement);
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Add Window Measurement"
            subtitle="Add a new measurement to a selected room in this project."
            size="sm"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {validationError && (
                    <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2 font-medium">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{validationError}</span>
                    </div>
                )}

                {/* ROOM SELECTION (DYNAMIC) */}
                <Field label="Target Room" required error={validationError && !selectedRoom ? 'Please select a room' : undefined}>
                    <Select
                        value={selectedRoom}
                        onChange={(e) => {
                            setSelectedRoom(e.target.value);
                            if (validationError) setValidationError('');
                        }}
                        options={[
                            { value: '', label: 'Select Room...' },
                            ...normalizedRooms.map((r, i) => ({
                                value: r,
                                label: `${String(i + 1).padStart(2, '0')} — ${r}`
                            }))
                        ]}
                        className={!selectedRoom && validationError ? 'border-rose-500 focus:ring-rose-500' : ''}
                    />
                </Field>

                {/* WINDOW ID */}
                <Field label="Window ID" required>
                    <Input
                        value={windowId}
                        onChange={(e) => setWindowId(e.target.value)}
                        placeholder="e.g. W-05"
                        className="font-mono text-xs"
                    />
                </Field>

                {/* PARTICULAR TYPE */}
                <Field label="Particular / Window Type" required>
                    <Select
                        value={particular}
                        onChange={(e) => setParticular(e.target.value)}
                        options={PARTICULAR_OPTIONS}
                        className="text-xs"
                    />
                </Field>

                {/* QUANTITY & UNIT */}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Quantity">
                        <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="text-xs"
                        />
                    </Field>

                    <Field label="Measurement Unit">
                        <Select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            options={UNIT_OPTIONS}
                            className="text-xs"
                        />
                    </Field>
                </div>

                {/* MODAL ACTIONS */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" icon={Plus}>
                        Add Measurement
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default React.memo(AddWindowMeasurementModal);
