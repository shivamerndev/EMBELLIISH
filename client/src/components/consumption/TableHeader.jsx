
const TableHeader = ({ columnVisibility = {}, typeFilter = 'MAIN_CURTAIN' }) => {

  const isColVisible = (key) => columnVisibility[key] !== false;
  const isRoman      = typeFilter === 'ROMAN_BLIND' || typeFilter === 'ROLLER_BLIND' || typeFilter === 'WOODEN_BLIND';
  const isCurtain    = !isRoman && (typeFilter === 'MAIN_CURTAIN' || typeFilter === 'SHEER_CURTAIN' || typeFilter === 'MOTORISED_CURTAIN' || typeFilter === 'ALL');
  const isWallpaper  = typeFilter === 'WALLPAPER';

  return (
    <thead className="sticky top-0 z-30 select-none text-slate-800 dark:text-slate-200">
      {/* --- LEVEL 1: Main Category Groups --- */}
      <tr className="bg-[#6b5240] dark:bg-slate-950 text-amber-50 dark:text-slate-200 text-[11px] font-bold tracking-wider uppercase border-b border-amber-800/40 dark:border-slate-800">

        {/* Sticky Identity */}
        <th
          rowSpan={2}
          className="sticky left-0 z-40 bg-[#574233] dark:bg-slate-950 border-r border-amber-700/50 dark:border-slate-800 px-2 py-2 text-center w-[52px] min-w-[52px]"
        >
          SR
        </th>
        <th
          rowSpan={2}
          className="sticky left-[52px] z-40 bg-[#574233] dark:bg-slate-950 border-r border-amber-700/50 dark:border-slate-800 px-3 py-2 text-left w-[150px] min-w-[150px]"
        >
          AREA / ROOM
        </th>
        <th
          rowSpan={2}
          className="sticky left-[202px] z-40 bg-[#574233] dark:bg-slate-950 border-r-4 border-r-amber-500/80 dark:border-r-amber-500/70 px-3 py-2 text-left w-[180px] min-w-[180px] shadow-[4px_0_10px_rgba(0,0,0,0.15)]"
        >
          PARTICULAR
        </th>

        {/* ── Shared: Window Size O2O + F2F ── */}
        {!isWallpaper && isColVisible('windowSize') && (
          <>
            <th colSpan={2} className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
              WINDOW — O2O
            </th>
            <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
              WINDOW — F2F
            </th>
          </>
        )}

        {/* ── Shared: Pelmet Size O2O + F2F ── */}
        {!isWallpaper && isColVisible('pelmetSize') && (
          <>
            <th colSpan={2} className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
              PELMET — O2O
            </th>
            <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
              PELMET — F2F
            </th>
          </>
        )}

        {/* ── Shared: Wire ── */}
        {!isWallpaper && isColVisible('wire') && (
          <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
            WIRE — SIDE DROP
          </th>
        )}

        {/* ── Shared: Measurements ── */}
        {!isWallpaper && isColVisible('measurements') && (
          <th colSpan={4} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
            MEASUREMENTS
          </th>
        )}

        {/* ══════════════ CURTAIN ONLY ══════════════ */}
        {isCurtain && (
          <>  
            {/* Track & Drop */}
            {isColVisible('trackDrop') && (
              <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
                TRACK &amp; DROP
              </th>
            )}

            {/* Fabric */}
            {isColVisible('fabric') && (
              <th colSpan={3} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                FABRIC
              </th>
            )}

            {/* Allowances (7 cols) */}
            {isColVisible('allowances') && (
              <th colSpan={7} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                ALLOWANCES
              </th>
            )}

            {/* Calculations (7 cols) */}
            {isColVisible('calculations') && (
              <th colSpan={7} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
                CALCULATIONS
              </th>
            )}

            {/* Fabric Order (5 cols) */}
            {isColVisible('fabricOrder') && (
              <th colSpan={5} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                FABRIC ORDER
              </th>
            )}

            {/* Flags (3 cols) */}
            {isColVisible('flags') && (
              <th colSpan={3} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                FLAGS
              </th>
            )}
          </>
        )}

        {/* ══════════════ ROMAN BLIND ONLY ══════════════ */}
        {isRoman && (
          <>
            {/* Finished Size (Width + Drop) */}
            {isColVisible('rb_finishedSize') && (
              <th colSpan={2} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
                FINISHED SIZE
              </th>
            )}

            {/* Fabric (Width / Usable Width / Vertical Repeat) */}
            {isColVisible('rb_fabric') && (
              <th colSpan={3} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                FABRIC
              </th>
            )}

            {/* Allowances (Left / Right / Top / Bottom / Wastage) */}
            {isColVisible('rb_allowances') && (
              <th colSpan={5} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                ALLOWANCES
              </th>
            )}

            {/* Calculations (Order Increment / Fabric Direction / Required Cut Width) */}
            {isColVisible('rb_calculations') && (
              <th colSpan={3} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
                CALCULATIONS
              </th>
            )}

            {/* Fabric Order (Raw Cut Drop / Repeat Cut Drop / Railroad Running Width / No. of Widths / Raw Metres / Net Metres) */}
            {isColVisible('rb_fabricOrder') && (
              <th colSpan={6} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                FABRIC ORDER
              </th>
            )}

            {/* Flags (Order Metres / Railroad Check / Cutting Instruction) */}
            {isColVisible('rb_flags') && (
              <th colSpan={3} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                FLAGS
              </th>
            )}
          </>
        )}

        {/* ══════════════ WALLPAPER ONLY ══════════════ */}
        {isWallpaper && (
          <>
            {/* Wall Info: Wall/Elevation / Qty / Wall Width / Wall Height */}
            {isColVisible('wp_wallInfo') && (
              <th colSpan={4} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
                WALL INFO
              </th>
            )}

            {/* Roll Specs: Roll Width / Roll Length / Vertical Repeat / Pattern Match */}
            {isColVisible('wp_rollSpecs') && (
              <th colSpan={4} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                ROLL SPECS
              </th>
            )}

            {/* Allowances: Top / Bottom / Wastage */}
            {isColVisible('wp_allowances') && (
              <th colSpan={3} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                ALLOWANCES
              </th>
            )}

            {/* Order Settings: Ordering Unit / Order Increment Required? / Order Increment / Min Order / Spare Rolls */}
            {isColVisible('wp_orderSettings') && (
              <th colSpan={5} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
                ORDER SETTINGS
              </th>
            )}

            {/* Calculations: Raw Cut Drop / Adj. Strip Length / Strips/Wall / Req. Strips / Strips/Roll */}
            {isColVisible('wp_calculations') && (
              <th colSpan={5} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#785c48] dark:bg-slate-900/90">
                CALCULATIONS
              </th>
            )}

            {/* Order Output: Req. Metres / Base Rolls / Final Order Metres / Final Order Rolls / Calc. Consumption / Final Order Qty / Order Unit */}
            {isColVisible('wp_orderOutput') && (
              <th colSpan={7} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6e5441] dark:bg-slate-900/80">
                ORDER OUTPUT
              </th>
            )}

            {/* Flags: Order Check / Cutting Instruction / Approx. Coverage Area / Notes */}
            {isColVisible('wp_flags') && (
              <th colSpan={4} className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1.5 text-center bg-[#6b5240] dark:bg-slate-900/70">
                FLAGS
              </th>
            )}
          </>
        )}

        <th rowSpan={2} className="px-3 py-2 text-center w-[110px] min-w-[110px] bg-[#574233] dark:bg-slate-950">
          ACTIONS
        </th>
      </tr>

      {/* --- LEVEL 2: Exact Field Labels & Units --- */}
      <tr className="bg-[#836444] dark:bg-slate-900/95 text-amber-50 dark:text-slate-300 text-[10px] font-semibold border-b-2 border-amber-900/60 dark:border-slate-700 shadow-sm">

        {/* ── Shared: Window O2O + F2F ── */}
        {!isWallpaper && isColVisible('windowSize') && (
          <>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
            <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Height (mm)</th>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
            <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Height (mm)</th>
          </>
        )}

        {/* ── Shared: Pelmet O2O + F2F ── */}
        {!isWallpaper && isColVisible('pelmetSize') && (
          <>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
            <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Drop (mm)</th>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Width (mm)</th>
            <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Drop (mm)</th>
          </>
        )}

        {/* ── Shared: Wire (Right then Left matching todo.md) ── */}
        {!isWallpaper && isColVisible('wire') && (
          <>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-1.5 py-1 text-center w-[65px] min-w-[65px]">Right</th>
            <th className="border-r border-amber-700/40 dark:border-slate-800 px-1.5 py-1 text-center w-[65px] min-w-[65px]">Left</th>
          </>
        )}

        {/* ── Shared: Measurements ── */}
        {!isWallpaper && isColVisible('measurements') && (
          <>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[80px] min-w-[80px]">Rnft</th>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Roman Sqft</th>
            <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[80px] min-w-[80px]">Window</th>
            <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center w-[60px] min-w-[60px]">Qty</th>
          </>
        )}

        {/* ══════════════ CURTAIN ONLY ══════════════ */}
        {isCurtain && (
          <>
            {/* Track & Drop */}
            {isColVisible('trackDrop') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Track Width</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Finished Drop</th>
              </>
            )}

            {/* Fabric */}
            {isColVisible('fabric') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Fabric Width</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Usable Width</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Vertical Repeat</th>
              </>
            )}

            {/* Allowances */}
            {isColVisible('allowances') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[75px] min-w-[75px]">Fullness</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[85px] min-w-[85px]">Left Return</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Right Return</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Centre Overlap</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Top Allowance</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Bottom Hem</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[75px] min-w-[75px]">Wastage</th>
              </>
            )}

            {/* Calculations */}
            {isColVisible('calculations') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Order Increment</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[110px] min-w-[110px]">Pleating by Design</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[100px] min-w-[100px]">Fabric Direction</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[85px] min-w-[85px]">Auto Safety</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Effective Width</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Flat Fabric Width</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-1 py-1 text-right w-[115px] min-w-[115px]">Usable Width Applied</th>
              </>
            )}

            {/* Fabric Order */}
            {isColVisible('fabricOrder') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">No. of Widths</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Raw Cut Drop</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Repeat Cut Drop</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Raw Metres</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[85px] min-w-[85px]">Net Metres</th>
              </>
            )}

            {/* Flags */}
            {isColVisible('flags') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Order Metres</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center w-[100px] min-w-[100px]">Railroad Check</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center w-[115px] min-w-[115px]">Cutting Instruction</th>
              </>
            )}
          </>
        )}

        {/* ══════════════ ROMAN BLIND ONLY ══════════════ */}
        {isRoman && (
          <>
            {/* Finished Size: Width + Drop */}
            {isColVisible('rb_finishedSize') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[110px] min-w-[110px]">Finished Blind Width (in)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[110px] min-w-[110px]">Finished Blind Drop (in)</th>
              </>
            )}

            {/* Fabric: Width / Usable Width / Vertical Repeat */}
            {isColVisible('rb_fabric') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Fabric Width (in)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Useable Width (in)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Vertical Repeat (in)</th>
              </>
            )}

            {/* Allowances: Left / Right / Top / Bottom / Wastage */}
            {isColVisible('rb_allowances') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Left Allowance (in)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Right Allowance (in)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Top Allowance (in)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Bottom Allowance (in)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[85px] min-w-[85px]">Wastage (%)</th>
              </>
            )}

            {/* Calculations: Order Increment / Fabric Direction / Required Cut Width */}
            {isColVisible('rb_calculations') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Order Increment (m)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[140px] min-w-[140px]">Fabric Direction (Normal/Railroaded)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[115px] min-w-[115px]">Required Cut Width (in)</th>
              </>
            )}

            {/* Fabric Order: Raw Cut Drop / Repeat Cut Drop / Railroad Running Width / No. of Widths / Raw Metres / Net Metres */}
            {isColVisible('rb_fabricOrder') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Raw Cut Drop (in)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[110px] min-w-[110px]">Repeat Cut Drop (in)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[135px] min-w-[135px]">Railroad Running Width (in)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">No. of Widths (no.)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Raw Metres (m)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Net Metres (m)</th>
              </>
            )}

            {/* Flags: Order Metres / Railroad Check / Cutting Instruction */}
            {isColVisible('rb_flags') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Order Metres (m)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center w-[125px] min-w-[125px]">Railroad Check (status)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center w-[160px] min-w-[160px]">Cutting Instruction (text)</th>
              </>
            )}
          </>
        )}

        {/* ══════════════ WALLPAPER ONLY ══════════════ */}
        {isWallpaper && (
          <>
            {/* Wall Info: Wall/Elevation / Qty / Wall Width / Wall Height */}
            {isColVisible('wp_wallInfo') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-left w-[130px] min-w-[130px]">Wall / Elevation</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[55px] min-w-[55px]">Qty</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Wall Width</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[90px] min-w-[90px]">Wall Height</th>
              </>
            )}

            {/* Roll Specs: Roll Width / Roll Length / Vertical Repeat / Pattern Match */}
            {isColVisible('wp_rollSpecs') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[85px] min-w-[85px]">Roll Width</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Roll Length (m)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Vertical Repeat</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center w-[100px] min-w-[100px]">Pattern Match</th>
              </>
            )}

            {/* Allowances: Top / Bottom / Wastage */}
            {isColVisible('wp_allowances') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Top Allowance</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Bottom Allowance</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[75px] min-w-[75px]">Wastage</th>
              </>
            )}

            {/* Order Settings: Ordering Unit / Order Increment Required? / Order Increment / Min Order / Spare Rolls */}
            {isColVisible('wp_orderSettings') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[100px] min-w-[100px]">Ordering Unit</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[115px] min-w-[115px]">Order Increment Req?</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Order Increment (m)</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Min. Order (m)</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[85px] min-w-[85px]">Spare Rolls</th>
              </>
            )}

            {/* Calculations: Raw Cut Drop / Adj. Strip Length / Strips per Wall / Required Strips / Strips per Roll */}
            {isColVisible('wp_calculations') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Raw Cut Drop</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[115px] min-w-[115px]">Adj. Strip Length</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Strips / Wall</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Req. Strips</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Strips / Roll</th>
              </>
            )}

            {/* Order Output: Req. Metres / Base Rolls / Final Order Metres / Final Order Rolls / Calc. Consumption / Final Order Qty / Order Unit */}
            {isColVisible('wp_orderOutput') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[95px] min-w-[95px]">Req. Metres</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[100px] min-w-[100px]">Base Rolls Req.</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[110px] min-w-[110px]">Final Order Metres</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Final Order Rolls</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[120px] min-w-[120px]">Calc. Consumption</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[105px] min-w-[105px]">Final Order Qty</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-center w-[85px] min-w-[85px]">Order Unit</th>
              </>
            )}

            {/* Flags: Order Check / Cutting Instruction / Approx. Coverage Area / Notes */}
            {isColVisible('wp_flags') && (
              <>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[95px] min-w-[95px]">Order Check</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-center w-[115px] min-w-[115px]">Cutting Instruction</th>
                <th className="border-r border-amber-700/30 dark:border-slate-800 px-2 py-1 text-right w-[120px] min-w-[120px]">Approx. Coverage Area</th>
                <th className="border-r border-amber-700/40 dark:border-slate-800 px-2 py-1 text-left w-[120px] min-w-[120px]">Notes</th>
              </>
            )}
          </>
        )}
      </tr>
    </thead>
  );
};

export default TableHeader

