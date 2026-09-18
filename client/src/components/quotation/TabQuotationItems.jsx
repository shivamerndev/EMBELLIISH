import { useState } from 'react';
import { Field, Input, Select, Button } from '../ui';
import { Plus, Trash2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { UNIT_OPTIONS, GST_OPTIONS, SAMPLE_RAKESH_JAIN_ROOMS, SAMPLE_SERVICE_ITEMS, formatINR, } from './quotationDefaults';


export const TabQuotationItems = ({
  rooms = [],
  serviceItems = [],
  scopeTitle = 'Curtain fabric',
  refArchitect = '',
  specialNotes = '',
  closedAtText = '',
  totals = {},
  onUpdateRooms,
  onUpdateServiceItems,
  onUpdateMeta,
}) => {
  const [collapsedRooms, setCollapsedRooms] = useState({});

  const toggleCollapse = (id) => {
    setCollapsedRooms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Load sample items matching PDF
  const handleLoadSamplePdfItems = () => {
    if (
      rooms.length > 0 &&
      !window.confirm('Replace current quotation items with the sample 9 rooms and services from the estimate PDF?')
    ) {
      return;
    }
    onUpdateRooms(SAMPLE_RAKESH_JAIN_ROOMS);
    onUpdateServiceItems(SAMPLE_SERVICE_ITEMS);
    onUpdateMeta({
      scopeTitle: 'Curtain fabric',
      refArchitect: 'ADID Atelier LLP.',
      specialNotes: 'Note: Servant Room Not by us and Living Room W4 is Cancelled',
      closedAtText: 'Closed at 15,50,000/- + GST',
    });
  };

  // Room Handlers
  const handleAddRoom = () => {
    const nextSrNo = String(rooms.length + 1);
    const newRoom = {
      id: `room-${Date.now()}`,
      srNo: nextSrNo,
      roomName: `Room ${nextSrNo}`,
      items: [
        {
          id: `item-${Date.now()}`,
          description: 'Main Curtain',
          unit: 'mtr',
          qty: 1,
          price: 0,
          gstRate: 5,
        },
      ],
    };
    onUpdateRooms([...rooms, newRoom]);
  };

  const handleRemoveRoom = (index) => {
    onUpdateRooms(rooms.filter((_, i) => i !== index));
  };

  const handleRoomChange = (index, field, value) => {
    const updated = [...rooms];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateRooms(updated);
  };

  // Item Handlers within a Room
  const handleAddItemToRoom = (roomIndex) => {
    const updated = [...rooms];
    const room = updated[roomIndex];
    const newItem = {
      id: `item-${Date.now()}`,
      description: '',
      unit: 'mtr',
      qty: 1,
      price: 0,
      gstRate: 5,
    };
    room.items = [...(room.items || []), newItem];
    onUpdateRooms(updated);
  };

  const handleRemoveItemFromRoom = (roomIndex, itemIndex) => {
    const updated = [...rooms];
    updated[roomIndex].items = updated[roomIndex].items.filter((_, idx) => idx !== itemIndex);
    onUpdateRooms(updated);
  };

  const handleItemChange = (roomIndex, itemIndex, field, value) => {
    const updated = [...rooms];
    const room = updated[roomIndex];
    const items = [...room.items];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    room.items = items;
    onUpdateRooms(updated);
  };

  // Service Items Handlers
  const handleAddServiceItem = () => {
    const newSrv = {
      id: `srv-${Date.now()}`,
      description: '',
      unit: 'rnft',
      qty: 1,
      price: 0,
      gstRate: 18,
    };
    onUpdateServiceItems([...serviceItems, newSrv]);
  };

  const handleRemoveServiceItem = (index) => {
    onUpdateServiceItems(serviceItems.filter((_, i) => i !== index));
  };

  const handleServiceItemChange = (index, field, value) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateServiceItems(updated);
  };

  return (
    <div className="space-y-6">

      {/* Meta Bar: Scope & Reference Architect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
        <Field label="Scope / Category Header">
          <Input
            value={scopeTitle}
            onChange={(e) => onUpdateMeta({ scopeTitle: e.target.value })}
            placeholder="e.g. Curtain fabric"
          />
        </Field>
        <Field label="Architect / Designer Reference (Ref)">
          <Input
            value={refArchitect}
            onChange={(e) => onUpdateMeta({ refArchitect: e.target.value })}
            placeholder="e.g. ADID Atelier LLP."
          />
        </Field>
      </div>

      {/* Live Financial Totals Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Value (ex-tax)</p>
          <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
            ₹{formatINR(totals.grandTotalValue)}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total GST Amount</p>
          <p className="text-base sm:text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
            ₹{formatINR(totals.grandGstValue)}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Grand Total (inc. GST)
          </p>
          <p className="text-base sm:text-lg font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            ₹{formatINR(totals.grandTotal)}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-brand-500/30 bg-brand-500/10">
          <p className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wider">
            Round Off Total
          </p>
          <p className="text-base sm:text-lg font-mono font-bold text-brand-700 dark:text-brand-300 mt-1">
            ₹{formatINR(totals.roundOff || totals.grandTotal)}
          </p>
        </div>
      </div>

      {/* Room-wise Sections */}
      <div className="space-y-4">
        {rooms.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
              No rooms added to this quotation yet.
            </p>
            <div className="flex justify-center gap-3">
              <Button size="sm" icon={Sparkles} onClick={handleLoadSamplePdfItems}>
                Load Sample Estimate
              </Button>
              <Button size="sm" variant="outline" icon={Plus} onClick={handleAddRoom}>
                Add First Room
              </Button>
            </div>
          </div>
        ) : (
          rooms.map((room, rIdx) => {
            const isCollapsed = collapsedRooms[room.id || `r-${rIdx}`];
            const roomTotalVal = (room.items || []).reduce(
              (acc, it) => acc + (Number(it.qty || 0) * Number(it.price || 0)),
              0
            );

            return (
              <div
                key={room.id || `room-${rIdx}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-xs"
              >
                {/* Room Header */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(room.id || `r-${rIdx}`)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="w-16">
                      <Input
                        size="sm"
                        value={room.srNo || ''}
                        onChange={(e) => handleRoomChange(rIdx, 'srNo', e.target.value)}
                        placeholder="Sr."
                        className="text-center font-mono font-bold"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        size="sm"
                        value={room.roomName || ''}
                        onChange={(e) => handleRoomChange(rIdx, 'roomName', e.target.value)}
                        placeholder="Room Name (e.g. Living Area)"
                        className="font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                      Room Subtotal: ₹{formatINR(roomTotalVal)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Plus}
                      onClick={() => handleAddItemToRoom(rIdx)}
                    >
                      Add Item
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      icon={Trash2}
                      onClick={() => handleRemoveRoom(rIdx)}
                      title="Delete this room"
                    />
                  </div>
                </div>

                {/* Items Table in Room */}
                {!isCollapsed && (
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <th className="text-left font-semibold py-2 px-1">Description</th>
                          <th className="w-24 text-center font-semibold py-2 px-1">Unit</th>
                          <th className="w-20 text-right font-semibold py-2 px-1">Qty</th>
                          <th className="w-24 text-right font-semibold py-2 px-1">Price (₹)</th>
                          <th className="w-24 text-right font-semibold py-2 px-1">Total (₹)</th>
                          <th className="w-20 text-center font-semibold py-2 px-1">GST %</th>
                          <th className="w-24 text-right font-semibold py-2 px-1">GST (₹)</th>
                          <th className="w-24 text-right font-semibold py-2 px-1">Row Total</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {(room.items || []).map((item, iIdx) => {
                          const totalVal = Math.round(Number(item.qty || 0) * Number(item.price || 0) * 100) / 100;
                          const gstVal = Math.round(totalVal * (Number(item.gstRate ?? 5) / 100) * 100) / 100;
                          const rowTotal = Math.round((totalVal + gstVal) * 100) / 100;

                          return (
                            <tr key={item.id || `item-${rIdx}-${iIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              <td className="py-1.5 px-1 min-w-[200px]">
                                <Input
                                  size="sm"
                                  value={item.description || ''}
                                  onChange={(e) => handleItemChange(rIdx, iIdx, 'description', e.target.value)}
                                  placeholder="Item / Fabric description"
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <Select
                                  size="sm"
                                  value={item.unit || 'mtr'}
                                  onChange={(e) => handleItemChange(rIdx, iIdx, 'unit', e.target.value)}
                                  options={UNIT_OPTIONS}
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <Input
                                  size="sm"
                                  type="number"
                                  step="0.01"
                                  value={item.qty ?? ''}
                                  onChange={(e) => handleItemChange(rIdx, iIdx, 'qty', e.target.value)}
                                  className="text-right font-mono"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <Input
                                  size="sm"
                                  type="number"
                                  step="0.01"
                                  value={item.price ?? ''}
                                  onChange={(e) => handleItemChange(rIdx, iIdx, 'price', e.target.value)}
                                  className="text-right font-mono"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="py-1.5 px-1 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                {formatINR(totalVal)}
                              </td>
                              <td className="py-1.5 px-1">
                                <Select
                                  size="sm"
                                  value={item.gstRate ?? 5}
                                  onChange={(e) => handleItemChange(rIdx, iIdx, 'gstRate', Number(e.target.value))}
                                  options={GST_OPTIONS}
                                />
                              </td>
                              <td className="py-1.5 px-1 text-right font-mono text-slate-500">
                                {formatINR(gstVal)}
                              </td>
                              <td className="py-1.5 px-1 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                {formatINR(rowTotal)}
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromRoom(rIdx, iIdx)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="py-2 px-4 flex justify-between items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-500/30 dark:bg-slate-900/60">

        <Button type="button" size="sm" icon={Plus} onClick={handleAddRoom} >
          Add New Room
        </Button>
<h1 className='font-semibold text-sm'>
        Total Rooms : {rooms.length}
</h1>
      </div>


      {/* Standalone Service, Stitching, Hardware & Installation Items */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-stone-500/10 border-b border-stone-500/20">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-300">
              Services, Stitching, Hardware & Miscellaneous Charges
            </h5>
            <p className="text-[11px] text-stone-700 dark:text-stone-400">
              Curtain stitching, lead bands, channels, tie backs, transportation, and installation.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={handleAddServiceItem}
          >
            Add Service / Charge
          </Button>
        </div>

        <div className="p-3 overflow-x-auto">
          {serviceItems.length === 0 ? (
            <p className="text-center py-4 text-xs text-slate-400">No additional service charges added.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left font-semibold py-2 px-1">Service / Charge Description</th>
                  <th className="w-24 text-center font-semibold py-2 px-1">Unit</th>
                  <th className="w-20 text-right font-semibold py-2 px-1">Qty</th>
                  <th className="w-24 text-right font-semibold py-2 px-1">Price (₹)</th>
                  <th className="w-24 text-right font-semibold py-2 px-1">Total (₹)</th>
                  <th className="w-20 text-center font-semibold py-2 px-1">GST %</th>
                  <th className="w-24 text-right font-semibold py-2 px-1">GST (₹)</th>
                  <th className="w-24 text-right font-semibold py-2 px-1">Row Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {serviceItems.map((srv, sIdx) => {
                  const totalVal = Math.round(Number(srv.qty || 1) * Number(srv.price || 0) * 100) / 100;
                  const gstVal = Math.round(totalVal * (Number(srv.gstRate ?? 18) / 100) * 100) / 100;
                  const rowTotal = Math.round((totalVal + gstVal) * 100) / 100;

                  return (
                    <tr key={srv.id || `srv-${sIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-1.5 px-1 min-w-[200px]">
                        <Input
                          size="sm"
                          value={srv.description || ''}
                          onChange={(e) => handleServiceItemChange(sIdx, 'description', e.target.value)}
                          placeholder="e.g. Curtain stitching, Transportation, Installation"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <Select
                          size="sm"
                          value={srv.unit || ''}
                          onChange={(e) => handleServiceItemChange(sIdx, 'unit', e.target.value)}
                          options={UNIT_OPTIONS}
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          size="sm"
                          type="number"
                          step="0.01"
                          value={srv.qty ?? ''}
                          onChange={(e) => handleServiceItemChange(sIdx, 'qty', e.target.value)}
                          className="text-right font-mono"
                          placeholder="1"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          size="sm"
                          type="number"
                          step="0.01"
                          value={srv.price ?? ''}
                          onChange={(e) => handleServiceItemChange(sIdx, 'price', e.target.value)}
                          className="text-right font-mono"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatINR(totalVal)}
                      </td>
                      <td className="py-1.5 px-1">
                        <Select
                          size="sm"
                          value={srv.gstRate ?? 18}
                          onChange={(e) => handleServiceItemChange(sIdx, 'gstRate', Number(e.target.value))}
                          options={GST_OPTIONS}
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono text-slate-500">
                        {formatINR(gstVal)}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(rowTotal)}
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceItem(sIdx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete service charge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Special Notes & Deal Closing Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
        <Field label="Special Quotation Notes (Printed under items table)">
          <Input
            value={specialNotes}
            onChange={(e) => onUpdateMeta({ specialNotes: e.target.value })}
            placeholder="e.g. Note: Servant Room Not by us and Living Room W4 is Cancelled"
          />
        </Field>

        <Field label='Deal Closing Banner Text (e.g. "Closed at 15,50,000/- + GST")'>
          <Input
            value={closedAtText}
            onChange={(e) => onUpdateMeta({ closedAtText: e.target.value })}
            placeholder="e.g. Closed at 15,50,000/- + GST"
            className="font-bold text-brand-600 dark:text-brand-400"
          />
        </Field>
      </div>
    </div>
  );
};

export default TabQuotationItems;