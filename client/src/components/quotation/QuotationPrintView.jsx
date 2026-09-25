import React from 'react';
import { formatINR } from './quotationDefaults';

export const QuotationPrintView = React.forwardRef(({
  coverLetter = {},
  clientName = '',
  refArchitect = '',
  scopeTitle = 'Curtain fabric',
  quotationNo = '',
  dateStr = '',
  rooms = [],
  serviceItems = [],
  totals = {},
  specialNotes = '',
  closedAtText = '',
  termsBanking = {},
  printablePages = [1, 2, 3], // which pages to render (or all 3)
}, ref) => {
  return (
    <div ref={ref} className="quotation-print-container font-serif text-slate-900 bg-white dark:bg-white dark:text-slate-900">
      <style>{`
        @media print {
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .quotation-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 265mm !important;
            height: auto !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .quotation-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
        }
        .quotation-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 24px auto;
          background: #ffffff;
          padding: 32px 40px 48px 40px;
          border: 1px solid #1e293b;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .table-quote th, .table-quote td {
          border: 1px solid #111;
          padding: 2.5px 5px;
          font-size: 10.5px;
          line-height: 1.25;
        }
        .table-quote th {
          background-color: #f8fafc;
          font-weight: 700;
          text-align: center;
        }
      `}</style>

      {/* ================= PAGE 1 ================= */}
      {printablePages.includes(1) && (
        <div className="quotation-page" id="quote-page-1">
          <div>
            {/* Top Embellish Branding */}
            <div className="text-center pt-2 pb-1">
              <h1 className="text-2xl sm:text-3xl font-serif tracking-[0.2em] font-normal text-slate-900">
                embellish
              </h1>
              <p className="text-[10px] tracking-wider text-slate-700 font-sans mt-0.5">
                Punctuating Spaces •
              </p>
            </div>

            {/* Solid Horizontal Rules matching PDF */}
            <div className="border-t-2 border-slate-900 my-1"></div>
            <div className="text-center font-bold text-xs py-0.5 border-b border-slate-900 mb-4">
              Estimate
            </div>

            {/* Right Meta & Address */}
            <div className="flex justify-end mb-6 text-xs leading-relaxed">
              <div className="text-left w-64 space-y-2">
                <div>
                  <p><span className="font-semibold">Date</span> {dateStr || coverLetter.date || ''}</p>
                  <p className="font-medium text-slate-800">{quotationNo || coverLetter.quotationNo || 'EMB-QTN'}</p>
                </div>
                <div>
                  <p className="font-bold underline mb-1">Address</p>
                  <div className="text-[11px] text-slate-700 whitespace-pre-line leading-normal">
                    {coverLetter.companyAddress || `Unit No : 1, 1st Floor,
Raghuvanshi Mansion,
Raghuvanshi Mill Compound,
Senapati Bapat Road,
Lower Parel (West).
Mumbai - 400013.
Email: hiteshembellish@gmail.com`}
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="text-xs mb-6 space-y-1">
              <p className="font-semibold">{coverLetter.clientSalutation || 'To,'}</p>
              <p className="font-bold text-sm text-slate-950">{clientName || coverLetter.clientName || 'Client'},</p>
            </div>

            {/* Subject */}
            <div className="text-xs mb-4">
              <p className="font-bold tracking-wide">Subject : {coverLetter.subject || 'PROFORMA INVOICE'}</p>
              <p className="mt-2 font-medium">{coverLetter.greeting || 'Respected Sir,'}</p>
            </div>

            {/* Body */}
            <div className="text-xs space-y-4 leading-relaxed pt-2">
              {coverLetter.bodyText ? (
                coverLetter.bodyText
                  .split(/\n\s*\n/)
                  .filter((p) => p.trim())
                  .map((para, idx) => (
                    <p key={idx} className="whitespace-pre-line">{para.trim()}</p>
                  ))
              ) : (
                <>
                  <p>Please find enclosed estimate for Curtain.</p>
                  {coverLetter.queryNote && <p>{coverLetter.queryNote}</p>}
                  {coverLetter.closingNote && <p>{coverLetter.closingNote}</p>}
                </>
              )}
            </div>

            {/* Sign-off */}
            <div className="text-xs mt-16 space-y-1">
              <p className="font-medium">{coverLetter.signOff || 'Kind Regards,'}</p>
              <p className="font-bold pt-4">{coverLetter.signatoryName || 'Mr. Hitesh Bhanushali'}</p>
              <p className="font-semibold text-slate-800">{coverLetter.signatoryCompany || 'Embellish'}</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-600 pt-8">
            Page 1
          </div>
        </div>
      )}

      {/* ================= PAGE 2 ================= */}
      {printablePages.includes(2) && (
        <div className="quotation-page" id="quote-page-2">
          <div>
            {/* Top Embellish Branding */}
            <div className="text-center pt-2 pb-1">
              <h1 className="text-2xl sm:text-3xl font-serif tracking-[0.2em] font-normal text-slate-900">
                embellish
              </h1>
              <p className="text-[10px] tracking-wider text-slate-700 font-sans mt-0.5">
                Punctuating Spaces •
              </p>
            </div>

            <div className="border-t-2 border-slate-900 my-1"></div>
            <div className="text-center font-bold text-xs py-0.5 border-b border-slate-900 mb-2">
              Estimate
            </div>

            {/* Client & Estimate Meta Row */}
            <div className="grid grid-cols-2 text-xs py-1 px-1 border-b border-slate-900 mb-2 font-sans">
              <div className="space-y-0.5">
                <div className="flex">
                  <span className="w-14 font-semibold text-slate-700">Client</span>
                  <span className="font-bold text-slate-950">{clientName || 'Client'}</span>
                </div>
                <div className="flex">
                  <span className="w-14 font-semibold text-slate-700">Ref</span>
                  <span className="font-bold text-slate-800">{refArchitect || '—'}</span>
                </div>
                <div className="font-semibold text-slate-900 pt-0.5">{scopeTitle || 'Curtain fabric'}</div>
              </div>

              <div className="space-y-0.5 text-right font-sans">
                <div className="font-medium">
                  <span className="font-semibold text-slate-700 mr-1">Date</span>
                  {dateStr || coverLetter.date || ''}
                </div>
                <div className="font-bold text-slate-900">
                  {quotationNo || coverLetter.quotationNo || 'EMB-QTN'}
                </div>
              </div>
            </div>

            {/* High Density Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-quote border-collapse font-sans">
                <thead>
                  <tr className="border border-slate-900">
                    <th className="w-12">Sr. No</th>
                    <th className="text-left px-2">Room</th>
                    <th className="w-12">unit</th>
                    <th className="w-14 text-right">QTY</th>
                    <th className="w-20 text-right">Price</th>
                    <th className="w-24 text-right">Total value</th>
                    <th className="w-16 text-center">GST Rate %</th>
                    <th className="w-20 text-right">Gst value</th>
                    <th className="w-24 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, rIdx) => (
                    <React.Fragment key={room.id || `room-${rIdx}`}>
                      {/* Room Header Row */}
                      <tr className="bg-slate-100 font-bold">
                        <td className="text-center  ">{room.srNo || rIdx + 1}</td>
                        <td colSpan={8} className="font-bold text-slate-900">
                          {room.roomName}
                        </td>
                      </tr>

                      {/* Items in Room */}
                      {(room.items || []).map((item, iIdx) => {
                        const totalVal = (item.totalValue ?? ((item.qty || 0) * (item.price || 0)));
                        const gstVal = item.gstValue ?? (totalVal * ((item.gstRate || 0) / 100));
                        const rowTotal = item.total ?? (totalVal + gstVal);
                        return (
                          <tr key={item.id || `item-${rIdx}-${iIdx}`} className="hover:bg-slate-50">
                            <td></td>
                            <td className="pl-4 text-slate-900">{item.description}</td>
                            <td className="text-center text-slate-600">{item.unit || '—'}</td>
                            <td className="text-right  ">{item.qty !== undefined ? Number(item.qty).toFixed(2) : '0.00'}</td>
                            <td className="text-right  ">{formatINR(item.price)}</td>
                            <td className="text-right  ">{formatINR(totalVal)}</td>
                            <td className="text-center  ">{item.gstRate ?? 5}%</td>
                            <td className="text-right  ">{formatINR(gstVal)}</td>
                            <td className="text-right   font-medium">{formatINR(rowTotal)}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* Standalone Service / Hardware Items */}
                  {serviceItems.length > 0 && (
                    <>
                      <tr className="bg-slate-50 border-t-2 border-slate-400">
                        <td colSpan={9} className="py-1"></td>
                      </tr>
                      {serviceItems.map((srv, sIdx) => {
                        const totalVal = (srv.totalValue ?? ((srv.qty || 1) * (srv.price || 0)));
                        const gstVal = srv.gstValue ?? (totalVal * ((srv.gstRate || 0) / 100));
                        const rowTotal = srv.total ?? (totalVal + gstVal);
                        return (
                          <tr key={srv.id || `srv-${sIdx}`} className="hover:bg-slate-50">
                            <td></td>
                            <td className="font-semibold text-slate-900">{srv.description}</td>
                            <td className="text-center text-slate-600">{srv.unit || '—'}</td>
                            <td className="text-right  ">{srv.unit ? Number(srv.qty || 1).toFixed(2) : ''}</td>
                            <td className="text-right  ">{srv.price ? formatINR(srv.price) : ''}</td>
                            <td className="text-right  ">{formatINR(totalVal)}</td>
                            <td className="text-center  ">{srv.gstRate ?? 18}%</td>
                            <td className="text-right  ">{formatINR(gstVal)}</td>
                            <td className="text-right   font-medium">{formatINR(rowTotal)}</td>
                          </tr>
                        );
                      })}
                    </>
                  )}

                  {/* Note Row */}
                  {specialNotes && (
                    <tr className="border-t border-slate-900">
                      <td colSpan={9} className="py-1.5 px-3 font-semibold text-slate-800 text-[11px] italic bg-slate-50">
                        {specialNotes}
                      </td>
                    </tr>
                  )}

                  {/* Total Row */}
                  <tr className="font-bold border-t-2 border-slate-900 bg-slate-100">
                    <td colSpan={5} className="text-left px-3 text-xs uppercase tracking-wider font-bold">
                      Total
                    </td>
                    <td className="text-right   font-bold text-xs">
                      {formatINR(totals.grandTotalValue)}
                    </td>
                    <td></td>
                    <td className="text-right   font-bold text-xs">
                      {formatINR(totals.grandGstValue)}
                    </td>
                    <td className="text-right   font-bold text-xs text-slate-950">
                      {formatINR(totals.grandTotal)}
                    </td>
                  </tr>

                  {/* Round Off Row */}
                  <tr className="font-bold bg-slate-50 border-b-2 border-slate-900">
                    <td colSpan={8} className="text-right pr-4 text-xs font-semibold">
                      Round Off
                    </td>
                    <td className="text-right   font-bold text-xs text-slate-950">
                      {formatINR(totals.roundOff || totals.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Closed Deal Banner */}
            {closedAtText && (
              <div className="mt-3 py-1.5 px-4 text-center font-bold text-xs sm:text-sm tracking-wide bg-slate-100 border border-slate-900 text-slate-900">
                {closedAtText}
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-slate-600 pt-8">
            Page 2
          </div>
        </div>
      )}

      {/* ================= PAGE 3 ================= */}
      {printablePages.includes(3) && (
        <div className="quotation-page font-sans text-xs" id="quote-page-3">
          <div className="space-y-4">
            {/* Box 1: Payment Terms */}
            <div className="border border-slate-400 p-3.5 rounded-xs space-y-1">
              <h3 className="font-bold text-sky-900 tracking-wide text-xs mb-1.5 uppercase">
                OUR PAYMENT TERMS
              </h3>
              <p className="font-bold text-slate-900">{termsBanking.advancePercent || '70% Advance'}</p>
              <p className="font-bold text-slate-900">{termsBanking.deliveryPercent || '30% before delivery'}</p>
              <p className="text-[11px] text-slate-700 leading-relaxed italic pt-1">
                {termsBanking.paymentInspectionNote ||
                  '(All payments must be released beofre installation. Stitched Curtains will be available for inspection before delivery at ou r Bhiwandi workshop on request.)'}
              </p>
            </div>

            {/* Box 2: Banking Details */}
            <div className="border border-slate-400 p-3.5 rounded-xs space-y-1">
              <h3 className="font-bold text-sky-900 tracking-wide text-xs mb-1.5 uppercase">
                BANKING DETAILS
              </h3>
              <p className="text-[11px] text-slate-600 font-medium">Issue Cheques/ RTGS in Favour Of</p>
              <p className="font-bold text-slate-950 text-sm">{termsBanking.favourOf || 'Embellish'}</p>
              <p className="font-bold text-slate-900 mt-1">{termsBanking.bankName || 'KOTAK MAHINDRA BANK'}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] pt-1">
                <p><span className="font-semibold text-slate-700">Account No :</span> <span className="font-bold  ">{termsBanking.accountNo || '7648054150'}</span></p>
                <p><span className="font-semibold text-slate-700">IFS Code :</span> <span className="font-bold  ">{termsBanking.ifscCode || 'KKBK0000642'}</span></p>
                <p><span className="font-semibold text-slate-700">MICR No :</span> <span className=" ">{termsBanking.micrNo || '400485006'}</span></p>
                <p><span className="font-semibold text-slate-700">Branch :</span> {termsBanking.branch || 'Mulund West'}</p>
                <p className="col-span-2 pt-1"><span className="font-semibold text-slate-700">GST NO :</span> <span className="font-bold  ">{termsBanking.gstNo || '27AIFPB1400Q1ZH'}</span></p>
              </div>
            </div>

            {/* Box 3: Terms and Conditions */}
            <div className="border border-slate-400 p-3.5 rounded-xs space-y-3 leading-relaxed">
              <div>
                <h3 className="font-bold text-slate-950 text-xs mb-1.5">
                  Terms and Conditions
                </h3>
                <p className="text-[11px] text-slate-700 whitespace-pre-line">
                  {termsBanking.cancellationPolicy ||
                    'Once an order has been accepted, no cancellation of that order is valid unless you receive our written communication endorsing the cancelled order. Your deposit is NOT REFUNDABLE and credit will remain available only if the goods ordered specifically for you have not been manufactured or ordered.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-[11.5px] mb-0.5">Prices</h4>
                <p className="text-[11px] text-slate-700 whitespace-pre-line">
                  {termsBanking.pricesValidity ||
                    `All prices mentioned in the estimate are valid for one month for the date of the estimate.\nAll prices are exclusive of all taxes unless mentioned otherwise.`}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-[11.5px] mb-0.5">Transportation</h4>
                <p className="text-[11px] text-slate-700 whitespace-pre-line">
                  {termsBanking.transportationPolicy ||
                    `All prices mentioned in the estimate are Ex-Mumbai.\nAll further cost (transportation, octroi and other miscellaneous expenses to be paid at actual by the client mentioned in the estimate\nIf onsite stitching is required, the client will arrange for travelling of workmen from our office (Mumbai) to the site, space for work, food for workmen and accommodation.`}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-600 pt-8">
            Page 3
          </div>
        </div>
      )}
    </div>
  );
});

QuotationPrintView.displayName = 'QuotationPrintView';

export default QuotationPrintView;
