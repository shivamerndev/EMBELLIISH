import React, { useState } from 'react';
import { Plus, Trash2, Copy, Image as ImageIcon, Sparkles, Layers, Check, X, Ruler } from 'lucide-react';
import { Button, Input, Select, Textarea } from '../ui';

const TREATMENT_TYPES = [
  'Main Curtain',
  'Sheer Curtain',
  'Blackout Curtain',
  'Roman Blind',
  'Roller Blind',
  'Wooden Venetian Blind',
  'W1 Reverse Mock',
  'W1 Drape Mock',
  'Trim',
  'Tessels',
  'Knobs',
  'Fringes',
  'Custom Fabrication'
];

const STITCHING_STYLES = [
  'Ripple',
  'Knife Pleat',
  'Pinch Pleat',
  'Eyelet',
  'Rod Pocket',
  'Box Pleat',
  'Roman Classic'
];

const OPENING_OPTIONS = [
  'Center Open',
  'Lock on Left',
  'Lock on Right',
  'One Way Left',
  'One Way Right'
];

export const SiteDetailSheetEditor = ({
  room,
  onUpdateRoom,
  onSave,
  onDeleteRoom,
}) => {
  const [newImageUrl, setNewImageUrl] = useState('');
  const [targetItemIndex, setTargetItemIndex] = useState(null);

  if (!room) {
    return <div className="p-8 text-center text-slate-400">Select a room to edit.</div>;
  }

  const items = Array.isArray(room.items) ? room.items : [];
  const notes = Array.isArray(room.notes) ? room.notes : (room.notes ? [room.notes] : []);

  const handleMetaChange = (field, value) => {
    onUpdateRoom({
      ...room,
      [field]: value
    });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onUpdateRoom({
      ...room,
      items: updated
    });
  };

  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      srNo: items.length + 1,
      look: '',
      type: 'Main Curtain',
      windowWidth: '124',
      windowHeight: '113',
      pelmetWidth: '',
      pelmetDrop: '',
      pelmetReturn: '',
      catalogueImages: [],
      design: 'Ready',
      brand: '',
      fabricName: '',
      fabricWidth: '54"',
      repeatV: '',
      repeatH: '',
      fullness: 2.5,
      qtyMtrs: 10,
      stitchingStyle: 'Ripple',
      parts: 1,
      opening: 'Center Open',
      readyWidth: '',
      readyHeight: '',
      liningType: 'in house 301 blackout',
      liningQty: '',
      tieback: 'Custom',
      position: '',
      electricalPoint: '',
      installationType: ''
    };
    onUpdateRoom({
      ...room,
      items: [...items, newItem]
    });
  };

  const handleDuplicateItem = (index) => {
    const source = items[index];
    const duplicated = {
      ...source,
      id: `item-${Date.now()}`,
      srNo: items.length + 1,
      type: `${source.type} (Copy)`
    };
    onUpdateRoom({
      ...room,
      items: [...items, duplicated]
    });
  };

  const handleDeleteItem = (index) => {
    const updated = items.filter((_, idx) => idx !== index).map((it, idx) => ({
      ...it,
      srNo: idx + 1
    }));
    onUpdateRoom({
      ...room,
      items: updated
    });
  };

  const handleAddImageToItem = (itemIdx) => {
    if (!newImageUrl.trim()) return;
    const updated = [...items];
    const currentImgs = Array.isArray(updated[itemIdx].catalogueImages) ? updated[itemIdx].catalogueImages : [];
    updated[itemIdx] = {
      ...updated[itemIdx],
      catalogueImages: [...currentImgs, newImageUrl.trim()]
    };
    onUpdateRoom({
      ...room,
      items: updated
    });
    setNewImageUrl('');
    setTargetItemIndex(null);
  };

  const handleRemoveImageFromItem = (itemIdx, imgIdx) => {
    const updated = [...items];
    const currentImgs = Array.isArray(updated[itemIdx].catalogueImages) ? updated[itemIdx].catalogueImages : [];
    updated[itemIdx] = {
      ...updated[itemIdx],
      catalogueImages: currentImgs.filter((_, i) => i !== imgIdx)
    };
    onUpdateRoom({
      ...room,
      items: updated
    });
  };

  const handleNoteChange = (index, value) => {
    const updated = [...notes];
    updated[index] = value;
    onUpdateRoom({
      ...room,
      notes: updated
    });
  };

  const handleAddNote = () => {
    onUpdateRoom({
      ...room,
      notes: [...notes, '']
    });
  };

  const handleDeleteNote = (index) => {
    onUpdateRoom({
      ...room,
      notes: notes.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      {/* Room Header Fields */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Room Sheet Information
          </h3>
          {onDeleteRoom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={onDeleteRoom}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs h-7"
            >
              Delete Room
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Room Title
            </label>
            <Input
              value={room.roomTitle || room.sheetName || ''}
              onChange={(e) => handleMetaChange('roomTitle', e.target.value)}
              placeholder="e.g. Guest Room"
              size="sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Sheet No.
            </label>
            <Input
              type="number"
              value={room.sheetNo || 1}
              onChange={(e) => handleMetaChange('sheetNo', Number(e.target.value))}
              size="sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Site Incharge
            </label>
            <Input
              value={room.siteIncharge || ''}
              onChange={(e) => handleMetaChange('siteIncharge', e.target.value)}
              placeholder="Amit / Ashish / Sachin / Hemant"
              size="sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Architect / Address Reference
            </label>
            <Input
              value={room.architect || ''}
              onChange={(e) => handleMetaChange('architect', e.target.value)}
              placeholder="ADID Atelier LLP."
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Treatments List Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Curtain & Treatment Items ({items.length})
            </h3>
            <span className="text-xs text-slate-400">
              Each row appears on the {room.roomTitle || room.sheetName} sheet
            </span>
          </div>
          <Button size="sm" icon={Plus} onClick={handleAddItem}>
            Add Treatment
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              {/* Row Top Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center  ">
                    {item.srNo || idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.type || ''}
                    onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                    placeholder="Treatment Name (e.g. Main Curtain)"
                    className="font-bold text-sm bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-brand-500 text-slate-900 dark:text-slate-100 px-1"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={Copy}
                    onClick={() => handleDuplicateItem(idx)}
                    title="Duplicate treatment"
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => handleDeleteItem(idx)}
                    className="text-rose-600 hover:text-rose-700"
                    title="Delete treatment"
                  />
                </div>
              </div>

              {/* Grid Form Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                {/* Window Dimensions */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Window Width
                  </label>
                  <Input
                    value={item.windowWidth ?? ''}
                    onChange={(e) => handleItemChange(idx, 'windowWidth', e.target.value)}
                    placeholder="124"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Window Height
                  </label>
                  <Input
                    value={item.windowHeight ?? ''}
                    onChange={(e) => handleItemChange(idx, 'windowHeight', e.target.value)}
                    placeholder="113"
                    size="sm"
                  />
                </div>

                {/* Pelmet Details */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Pelmet Width
                  </label>
                  <Input
                    value={item.pelmetWidth ?? ''}
                    onChange={(e) => handleItemChange(idx, 'pelmetWidth', e.target.value)}
                    placeholder="12"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Pelmet Drop
                  </label>
                  <Input
                    value={item.pelmetDrop ?? ''}
                    onChange={(e) => handleItemChange(idx, 'pelmetDrop', e.target.value)}
                    placeholder="6"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Pelmet Return
                  </label>
                  <Input
                    value={item.pelmetReturn ?? ''}
                    onChange={(e) => handleItemChange(idx, 'pelmetReturn', e.target.value)}
                    placeholder="—"
                    size="sm"
                  />
                </div>

                {/* Design / Readiness */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Design
                  </label>
                  <Input
                    value={item.design ?? ''}
                    onChange={(e) => handleItemChange(idx, 'design', e.target.value)}
                    placeholder="Ready"
                    size="sm"
                  />
                </div>

                {/* Brand & Fabric */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Brand / Collection
                  </label>
                  <Input
                    value={item.brand ?? ''}
                    onChange={(e) => handleItemChange(idx, 'brand', e.target.value)}
                    placeholder="Deco Dome / Linia"
                    size="sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Fabric Name / Shade / Quality
                  </label>
                  <Input
                    value={item.fabricName ?? ''}
                    onChange={(e) => handleItemChange(idx, 'fabricName', e.target.value)}
                    placeholder="Linia One / Alora - 1"
                    size="sm"
                  />
                </div>

                {/* Fabric Width, Fullness & Qty */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Fabric Width (cms/in)
                  </label>
                  <Input
                    value={item.fabricWidth ?? ''}
                    onChange={(e) => handleItemChange(idx, 'fabricWidth', e.target.value)}
                    placeholder='54" or 300'
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Fullness (Cut)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={item.fullness ?? ''}
                    onChange={(e) => handleItemChange(idx, 'fullness', e.target.value)}
                    placeholder="2.5"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Qty (Mtrs)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={item.qtyMtrs ?? ''}
                    onChange={(e) => handleItemChange(idx, 'qtyMtrs', e.target.value)}
                    placeholder="22.5"
                    size="sm"
                  />
                </div>

                {/* Stitching Details */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Stitching Style
                  </label>
                  <Input
                    value={item.stitchingStyle ?? ''}
                    onChange={(e) => handleItemChange(idx, 'stitchingStyle', e.target.value)}
                    placeholder="Ripple"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Parts
                  </label>
                  <Input
                    value={item.parts ?? ''}
                    onChange={(e) => handleItemChange(idx, 'parts', e.target.value)}
                    placeholder="1 or 7"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Opening
                  </label>
                  <Input
                    value={item.opening ?? ''}
                    onChange={(e) => handleItemChange(idx, 'opening', e.target.value)}
                    placeholder="Center Open"
                    size="sm"
                  />
                </div>

                {/* Workshop Details */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Lining Type (Workshop)
                  </label>
                  <Input
                    value={item.liningType ?? ''}
                    onChange={(e) => handleItemChange(idx, 'liningType', e.target.value)}
                    placeholder="in house 301 blackout"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Tieback
                  </label>
                  <Input
                    value={item.tieback ?? ''}
                    onChange={(e) => handleItemChange(idx, 'tieback', e.target.value)}
                    placeholder="Custom"
                    size="sm"
                  />
                </div>

                {/* Installation Details */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                    Cord / Elec Side
                  </label>
                  <Input
                    value={item.electricalPoint ?? ''}
                    onChange={(e) => handleItemChange(idx, 'electricalPoint', e.target.value)}
                    placeholder="Mag / Left / Right"
                    size="sm"
                  />
                </div>
              </div>

              {/* Catalogue Images Gallery for this item */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Catalogue & Swatch Photos ({Array.isArray(item.catalogueImages) ? item.catalogueImages.length : 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => setTargetItemIndex(targetItemIndex === idx ? null : idx)}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Image
                  </button>
                </div>

                {/* Add Image Inline Form */}
                {targetItemIndex === idx && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg mb-2">
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Paste image URL (or /site-sheets/guest-room/img_0.jpg)..."
                      size="sm"
                      className="flex-1"
                    />
                    <Button size="xs" onClick={() => handleAddImageToItem(idx)}>
                      Add
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setTargetItemIndex(null)}>
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Thumbnails */}
                {Array.isArray(item.catalogueImages) && item.catalogueImages.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {item.catalogueImages.map((img, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="relative group border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800"
                      >
                        <img
                          src={img}
                          alt={`Catalogue ${imgIdx + 1}`}
                          className="w-16 h-16 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromItem(idx, imgIdx)}
                          className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    No images attached. Click "Add Image" above to link a catalogue swatch photo.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Room Notes Editor */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Room Production Notes
          </h3>
          <Button size="sm" variant="outline" icon={Plus} onClick={handleAddNote}>
            Add Note
          </Button>
        </div>

        <div className="space-y-2">
          {notes.map((note, nIdx) => (
            <div key={nIdx} className="flex items-center gap-2">
              <Input
                value={note}
                onChange={(e) => handleNoteChange(nIdx, e.target.value)}
                placeholder="e.g. Width of the Fabric as height of the Window (Vertical Lines Want) adjust in stitching"
                size="sm"
                className="flex-1"
              />
              <Button
                size="xs"
                variant="ghost"
                icon={Trash2}
                onClick={() => handleDeleteNote(nIdx)}
                className="text-rose-500"
              />
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-xs text-slate-400 italic">No notes added.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteDetailSheetEditor;
