import { useState } from 'react';
import { Eye, X, Printer, ZoomIn, ZoomOut, RotateCcw, Pencil } from 'lucide-react';
import { Button } from '../ui';

/**
 * High-fidelity Single Room Site Detail Sheet preview.
 * Replicates the authentic Master Excel format (Embellish Site Detail Sheet R5) dedicated for a single room.
 */
export const SiteDetailSheetView = ({
  room,
  clientName = 'Mr. Rakesh Jain',
  address = 'A/3-D Amitesh LLP',
  architect = 'ADID Atelier LLP.',
  siteIncharge = 'Amit / Ashish / Sachin / Hemant',
  sheetNo = 1,
  onPrint,
  onEditRoom,
}) => {
  const [activeImage, setActiveImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!room) {
    return (
      <div className="p-12 text-center text-slate-400">
        No room data selected.
      </div>
    );
  }

  const items = Array.isArray(room.items) ? room.items : [];
  const notes = Array.isArray(room.notes) ? room.notes : (room.notes ? [room.notes] : []);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))));
  const handleZoomReset = () => setZoomLevel(1);

  return (
    <div className="space-y-2">
      {/* Action & Zoom Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 text-xs no-print">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Zoom:</span>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 transition"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="  text-xs w-10 text-center font-medium text-slate-700 dark:text-slate-300">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 transition"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoomLevel !== 1 && (
            <button
              type="button"
              onClick={handleZoomReset}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition text-[11px]"
              title="Reset zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEditRoom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={onEditRoom}
              className="text-xs"
            >
              Edit Sheet
            </Button>
          )}
          {onPrint && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={onPrint}
              className="text-xs"
              title="Print this room sheet in invoice format"
            >
              Print Sheet
            </Button>
          )}
        </div>
      </div>

      {/* Sheet Container with Zoom & Scroll */}
      <div className="overflow-x-auto bg-slate-200/60 dark:bg-slate-950 border border-slate-300/80 dark:border-slate-800 print:p-0 print:bg-white print:border-0 print:overflow-visible rounded-lg">
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          className="transition-transform duration-150 inline-block min-w-[1200px] w-full bg-white text-slate-900 border border-slate-400 shadow-xl rounded-sm font-sans print:shadow-none print:border-none print:p-2 print:transform-none"
          id="site-detail-single-room-sheet"
        >
          {/* Top Title Banner */}
          <div className="w-full bg-[#d9d9d9] border border-black py-1.5 px-4 text-center mb-3">
            <h1 className="text-2xl font-bold tracking-wider text-black m-0 font-serif">
              Embellish
            </h1>
          </div>

          {/* Header Info Boxes */}
          <div className="grid grid-cols-12 gap-3 mb-4 text-[11px]">
            {/* Left Box */}
            <div className="col-span-7 border border-black bg-white p-2">
              <table className="w-full text-left">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-24 font-bold py-0.5 text-black">Client :</td>
                    <td className="py-0.5 text-black font-semibold uppercase">{room.clientName || clientName}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="font-bold py-0.5 text-black">Address / Arch :</td>
                    <td className="py-0.5 text-black">{room.architect || architect || address}</td>
                  </tr>
                  <tr>
                    <td className="font-bold py-0.5 text-black">Room :</td>
                    <td className="py-0.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
                      {room.roomTitle || room.sheetName}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Box */}
            <div className="col-span-5 border border-black bg-white p-2">
              <table className="w-full text-left">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-28 font-bold py-0.5 text-black">Sheet no :</td>
                    <td className="py-0.5 text-black   font-bold text-sm">
                      {room.sheetNo || sheetNo}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold py-0.5 text-black align-top">Site Incharge :</td>
                    <td className="py-0.5 text-black text-[10px]">
                      {room.siteIncharge || siteIncharge}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Main Excel Multi-Header Table */}
          <div className="border border-black overflow-hidden mb-4">
            <table className="w-full border-collapse text-[10px] text-center border-black">
              <thead>
                {/* Level 1 Headers */}
                <tr className="border-b border-black font-bold text-black divide-x divide-black bg-[#f2f2f2]">
                  <th rowSpan={3} className="p-1 w-8 text-center align-middle bg-[#eaeaea]">SR</th>
                  <th rowSpan={3} className="p-1 w-10 text-center align-middle bg-[#eaeaea]">Look</th>
                  <th rowSpan={3} className="p-1 w-28 text-center align-middle bg-[#eaeaea]">Type</th>
                  <th colSpan={2} className="p-1 bg-[#eaeaea] text-center">actual window</th>
                  <th colSpan={3} className="p-1 bg-[#eaeaea] text-center">Pelmet</th>
                  <th colSpan={8} className="p-1 bg-[#95c93d] text-black text-center uppercase tracking-wide font-extrabold border-x-2 border-black">
                    Material details
                  </th>
                  <th colSpan={5} className="p-1 bg-[#ffe600] text-black text-center uppercase tracking-wide font-extrabold border-r-2 border-black">
                    Stitching Details
                  </th>
                  <th colSpan={3} className="p-1 bg-[#d9d9d9] text-black text-center uppercase tracking-wide font-bold border-r-2 border-black">
                    by Workshop
                  </th>
                  <th colSpan={3} className="p-1 bg-[#f0f0f0] text-black text-center uppercase tracking-wide font-bold">
                    Installation Details
                  </th>
                </tr>

                {/* Level 2 Sub-Headers */}
                <tr className="border-b border-black font-bold text-black divide-x divide-black bg-white text-[9.5px]">
                  {/* window size */}
                  <th className="p-1 w-12">width</th>
                  <th className="p-1 w-12">height</th>

                  {/* Pelmet */}
                  <th className="p-1 w-12">width</th>
                  <th className="p-1 w-12">drop</th>
                  <th className="p-1 w-12">Return</th>

                  {/* Material details */}
                  <th className="p-1 min-w-[200px] border-l-2 border-black">Catalogue image</th>
                  <th className="p-1 w-14">Design</th>
                  <th className="p-1 w-24">brand</th>
                  <th className="p-1 min-w-[130px]">Name</th>
                  <th className="p-1 w-14">wdth</th>
                  <th colSpan={2} className="p-1 w-20">repeat</th>
                  <th className="p-1 w-10">full</th>
                  <th className="p-1 w-12">qty</th>

                  {/* Stitching Details */}
                  <th className="p-1 w-16 border-l-2 border-black">style</th>
                  <th className="p-1 w-10">parts</th>
                  <th className="p-1 w-20">opening</th>
                  <th colSpan={2} className="p-1 w-20">ready size</th>

                  {/* by Workshop */}
                  <th colSpan={2} className="p-1 w-28 border-l-2 border-black">lining</th>
                  <th className="p-1 w-16">Tieback</th>

                  {/* Installation Details */}
                  <th className="p-1 w-16 border-l-2 border-black">position</th>
                  <th className="p-1 w-24">Electrical point / cord side</th>
                  <th className="p-1 w-16">type</th>
                </tr>

                {/* Level 3 Units Sub-Header */}
                <tr className="border-b border-black font-medium text-slate-700 divide-x divide-black bg-[#fafafa] text-[8.5px]">
                  {/* window size */}
                  <th className="p-0.5"></th>
                  <th className="p-0.5"></th>

                  {/* Pelmet */}
                  <th className="p-0.5"></th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5"></th>

                  {/* Material details */}
                  <th className="p-0.5 border-l-2 border-black"></th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5 bg-[#fed7aa]/40 font-bold">(cms)</th>
                  <th className="p-0.5">V(cm)</th>
                  <th className="p-0.5">H(cm)</th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5 font-bold">mtrs</th>

                  {/* Stitching Details */}
                  <th className="p-0.5 border-l-2 border-black"></th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5">wdth</th>
                  <th className="p-0.5">hght</th>

                  {/* by Workshop */}
                  <th className="p-0.5 border-l-2 border-black">type</th>
                  <th className="p-0.5">qty</th>
                  <th className="p-0.5 bg-[#bae6fd]/40"></th>

                  {/* Installation Details */}
                  <th className="p-0.5 border-l-2 border-black"></th>
                  <th className="p-0.5"></th>
                  <th className="p-0.5"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black text-black">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={28} className="p-8 text-center text-slate-400 italic">
                      No treatments or curtains configured for this room sheet yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const isPeachWidth = item.fabricWidth && (String(item.fabricWidth).includes('300') || String(item.fabricWidth).includes('54'));
                    const isCustomTieback = item.tieback && (String(item.tieback).toLowerCase().includes('custom') || String(item.tieback).toLowerCase().includes('reg'));

                    return (
                      <tr key={item.id || idx} className="divide-x divide-black hover:bg-amber-50/20 transition group">
                        {/* SR */}
                        <td className="p-2   font-bold text-center bg-slate-50">{item.srNo || idx + 1}</td>

                        {/* Look */}
                        <td className="p-1 text-center align-middle">
                          {item.look ? (
                            <img src={item.look} alt="look" className="w-8 h-8 object-cover rounded mx-auto border border-slate-300" />
                          ) : (
                            <span className="text-slate-300 text-[9px]">—</span>
                          )}
                        </td>

                        {/* Type */}
                        <td className="p-2 font-bold text-left text-slate-900 align-middle whitespace-pre-line">
                          {item.type || '—'}
                        </td>

                        {/* Actual Window Width & Height */}
                        <td className="p-2   font-bold text-center align-middle text-slate-900">
                          {item.windowWidth || '—'}
                        </td>
                        <td className="p-2   font-bold text-center align-middle text-slate-900">
                          {item.windowHeight || '—'}
                        </td>

                        {/* Pelmet Width, Drop, Return */}
                        <td className="p-2   text-center align-middle">{item.pelmetWidth || '—'}</td>
                        <td className="p-2   text-center align-middle">{item.pelmetDrop || '—'}</td>
                        <td className="p-2   text-center align-middle">{item.pelmetReturn || '—'}</td>

                        {/* Catalogue Images Gallery */}
                        <td className="p-2 border-l-2 border-black align-middle bg-slate-50/50">
                          {Array.isArray(item.catalogueImages) && item.catalogueImages.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[260px] mx-auto">
                              {item.catalogueImages.map((imgUrl, imgIdx) => (
                                <button
                                  key={imgIdx}
                                  type="button"
                                  onClick={() => setActiveImage(imgUrl)}
                                  className="relative group/thumb border border-slate-300 hover:border-blue-500 rounded overflow-hidden shadow-2xs hover:shadow-md transition"
                                  title="Click to view full image"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Catalogue ${imgIdx + 1}`}
                                    className="w-14 h-14 object-cover group-hover/thumb:scale-105 transition-transform"
                                  />
                                  <span className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <Eye className="w-3.5 h-3.5" />
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[9px]">No photo</span>
                          )}
                        </td>

                        {/* Design */}
                        <td className="p-2 font-medium text-center align-middle">{item.design || '—'}</td>

                        {/* Brand */}
                        <td className="p-2 text-left font-medium align-middle whitespace-pre-line leading-tight">
                          {item.brand || '—'}
                        </td>

                        {/* Name (Fabric/quality/shade) */}
                        <td className="p-2 text-left align-middle whitespace-pre-line leading-snug">
                          {item.fabricName || '—'}
                        </td>

                        {/* Width with Peach highlight if applicable */}
                        <td className={`p-2   font-bold text-center align-middle ${isPeachWidth ? 'bg-[#fed7aa] text-amber-950' : ''}`}>
                          {item.fabricWidth || '—'}
                        </td>

                        {/* Repeat V & H */}
                        <td className="p-2   text-center align-middle">{item.repeatV || '—'}</td>
                        <td className="p-2   text-center align-middle">{item.repeatH || '—'}</td>

                        {/* Fullness */}
                        <td className="p-2   font-bold text-center align-middle text-slate-800">
                          {item.fullness || '—'}
                        </td>

                        {/* Qty (mtrs) */}
                        <td className="p-2   font-bold text-center align-middle text-slate-950">
                          {item.qtyMtrs || '—'}
                        </td>

                        {/* Stitching Style */}
                        <td className="p-2 font-semibold text-center align-middle border-l-2 border-black">
                          {item.stitchingStyle || '—'}
                        </td>

                        {/* Parts */}
                        <td className="p-2   text-center align-middle">{item.parts || '—'}</td>

                        {/* Opening */}
                        <td className="p-2 font-medium text-center align-middle whitespace-pre-line">
                          {item.opening || '—'}
                        </td>

                        {/* Ready size Width & Height */}
                        <td className="p-2   text-center align-middle">{item.readyWidth || '—'}</td>
                        <td className="p-2   text-center align-middle">{item.readyHeight || '—'}</td>

                        {/* Workshop Lining Type & Qty */}
                        <td className="p-2 text-left align-middle border-l-2 border-black font-medium leading-tight">
                          {item.liningType || '—'}
                        </td>
                        <td className="p-2   text-center align-middle">{item.liningQty || '—'}</td>

                        {/* Tieback with Sky Blue highlight if custom */}
                        <td className={`p-2 font-semibold text-center align-middle ${isCustomTieback ? 'bg-[#bae6fd] text-sky-950' : ''}`}>
                          {item.tieback || '—'}
                        </td>

                        {/* Installation Position, Cord Side, Type */}
                        <td className="p-2 text-center align-middle border-l-2 border-black">{item.position || '—'}</td>
                        <td className="p-2 text-center align-middle font-medium">{item.electricalPoint || '—'}</td>
                        <td className="p-2 text-center align-middle">{item.installationType || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Section: Notes (Left) & Color Codes Legend (Right) */}
          <div className="grid grid-cols-12 gap-4 text-[10px]">
            {/* Notes Box */}
            <div className="col-span-7">
              <div className="border border-black bg-white overflow-hidden shadow-2xs">
                <div className="bg-[#fed7aa] text-black font-bold px-3 py-1 border-b border-black text-[11px]">
                  Notes
                </div>
                <div className="p-2.5 divide-y divide-slate-200">
                  {notes.length > 0 ? (
                    notes.map((note, nIdx) => (
                      <div key={nIdx} className="py-1 text-slate-800 font-medium leading-relaxed">
                        {note}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic py-1">
                      No special notes for this room.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Color Codes Legend Box */}
            <div className="col-span-5">
              <div className="border border-black bg-white p-2.5 shadow-2xs">
                <div className="text-center font-bold uppercase tracking-wider text-black text-[10px] mb-2 border-b border-slate-200 pb-1">
                  PLEASE NOTE : COLOR CODES
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-4 rounded-xs bg-[#fed7aa] border border-black/60 shrink-0" />
                    <span className="text-slate-700 text-[9.5px]">Fabric width as height / adjustment in stitching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-4 rounded-xs bg-[#ffe600] border border-black/60 shrink-0" />
                    <span className="text-slate-700 text-[9.5px]">Stitching details specification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-4 rounded-xs bg-[#95c93d] border border-black/60 shrink-0" />
                    <span className="text-slate-700 text-[9.5px]">Material & fabric details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-4 rounded-xs bg-[#bae6fd] border border-black/60 shrink-0" />
                    <span className="text-slate-700 text-[9.5px]">Workshop custom fabrication / Tieback</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal for Catalogue Photos */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl p-2 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/90 transition z-10"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeImage}
              alt="Catalogue enlarged"
              className="max-w-full max-h-[82vh] object-contain rounded mx-auto"
            />
            <div className="text-center mt-2">
              <a
                href={activeImage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Open original in new window
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDetailSheetView;
