import { useState, useMemo } from 'react';
import { Modal, Button } from '../ui';
import { leadsApi } from '../../api';
import { useAction } from '../../hooks/useAsync';
import {
  FileText,
  FileSpreadsheet,
  Landmark,
  Eye,
  Printer,
  Save,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_COVER_LETTER,
  DEFAULT_TERMS_BANKING,
  SAMPLE_RAKESH_JAIN_ROOMS,
  SAMPLE_SERVICE_ITEMS,
  calculateQuotationSheetTotals,
  formatINR,
} from './quotationDefaults';
import TabCoverLetter from './TabCoverLetter';
import TabQuotationItems from './TabQuotationItems';
import TabTermsBanking from './TabTermsBanking';
import QuotationPrintView from './QuotationPrintView';

export const EditQuotationModal = ({ item, onClose, onDone }) => {
  const [activeTab, setActiveTab] = useState('tab2'); // default to Tab 2 (Quotation Items)
  const [previewPages, setPreviewPages] = useState([1, 2, 3]);

  // Extract existing data from lead if available
  const existingSheet = item?.quotation?.quotationSheet || {};
  const existingCover = item?.quotation?.coverLetter || existingSheet.coverLetter || {};
  const existingTerms = item?.quotation?.termsAndBanking || existingSheet.termsBanking || {};
  const existingRooms = existingSheet.rooms || item?.quotation?.itemsTable?.rooms;
  const existingServices = existingSheet.services || item?.quotation?.itemsTable?.services;

  // Format initial date
  const initialDateStr = (() => {
    if (existingCover.date) return existingCover.date;
    if (item?.quotation?.date) {
      try {
        const d = new Date(item.quotation.date);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      } catch (e) {}
    }
    return DEFAULT_COVER_LETTER.date;
  })();

  // 1. Cover Letter State (Page 1)
  const initialCoverLetterBody = (() => {
    if (existingCover.bodyText) {
      const parts = [existingCover.bodyText];
      if (existingCover.queryNote && !existingCover.bodyText.includes(existingCover.queryNote)) {
        parts.push(existingCover.queryNote);
      }
      if (existingCover.closingNote && !existingCover.bodyText.includes(existingCover.closingNote)) {
        parts.push(existingCover.closingNote);
      }
      return parts.join('\n\n');
    }
    return DEFAULT_COVER_LETTER.bodyText;
  })();

  const [coverLetter, setCoverLetter] = useState({
    ...DEFAULT_COVER_LETTER,
    ...existingCover,
    bodyText: initialCoverLetterBody,
    clientName: existingCover.clientName || item?.clientName || DEFAULT_COVER_LETTER.clientName,
    quotationNo: existingCover.quotationNo || item?.quotation?.no || item?.code || DEFAULT_COVER_LETTER.quotationNo,
    date: initialDateStr,
  });

  // 2. Quotation Items & Rooms State (Page 2)
  const [rooms, setRooms] = useState(existingRooms || SAMPLE_RAKESH_JAIN_ROOMS);
  const [serviceItems, setServiceItems] = useState(existingServices || SAMPLE_SERVICE_ITEMS);
  const [meta, setMeta] = useState({
    scopeTitle: existingSheet.scopeTitle || 'Curtain fabric',
    refArchitect: existingSheet.refArchitect || item?.architect || item?.designer || 'ADID Atelier LLP.',
    specialNotes: existingSheet.specialNotes || 'Note: Servant Room Not by us and Living Room W4 is Cancelled',
    closedAtText: existingSheet.closedAtText || 'Closed at 15,50,000/- + GST',
  });

  // 3. Terms & Banking State (Page 3)
  const [termsBanking, setTermsBanking] = useState({
    ...DEFAULT_TERMS_BANKING,
    ...existingTerms,
  });

  // Memoized financial calculations across rooms and services
  const totals = useMemo(() => {
    return calculateQuotationSheetTotals(rooms, serviceItems);
  }, [rooms, serviceItems]);

  const handleUpdateMeta = (patch) => {
    setMeta((prev) => ({ ...prev, ...patch }));
  };

  // API update hook
  const { execute, pending, error } = useAction(
    (payload) => leadsApi.update(item._id || item.id, payload),
    {
      onSuccess: () => {
        if (onDone) onDone();
        onClose();
      },
    }
  );

  const handleSave = () => {
    const sheetData = {
      coverLetter,
      rooms,
      services: serviceItems,
      scopeTitle: meta.scopeTitle,
      refArchitect: meta.refArchitect,
      specialNotes: meta.specialNotes,
      closedAtText: meta.closedAtText,
      termsBanking,
      totals: {
        grandTotalValue: totals.grandTotalValue,
        grandGstValue: totals.grandGstValue,
        grandTotal: totals.grandTotal,
        roundOff: totals.roundOff,
      },
      updatedAt: new Date().toISOString(),
    };

    // Keep parent quotation fields in sync
    const quotationPayload = {
      ...(item?.quotation || {}),
      no: coverLetter.quotationNo || item?.quotation?.no || 'EMBRAG 520-A',
      finalQuotedValue: totals.roundOff || totals.grandTotal,
      taxes: 18,
      quotationSheet: sheetData,
      coverLetter,
      itemsTable: {
        rooms,
        services: serviceItems,
      },
      termsAndBanking: termsBanking,
    };

    execute({ quotation: quotationPayload });
  };

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    {
      id: 'tab1',
      label: 'Cover & Proforma',
      icon: FileText,
    },
    {
      id: 'tab2',
      label: 'Quotation Sheet (BOQ)',
      icon: FileSpreadsheet,
    },
    {
      id: 'tab3',
      label: 'Terms & Banking',
      icon: Landmark,
    },
    {
      id: 'preview',
      label: 'Live PDF / Print Preview',
      icon: Eye,
      isSpecial: true,
    },
  ];

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Prepare & Edit Quotation — ${item.clientName || 'Client'}`}
      size="full"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="hidden sm:inline">Total ex-tax: <strong className="font-mono text-slate-900 dark:text-slate-100">₹{formatINR(totals.grandTotalValue)}</strong></span>
            <span className="hidden sm:inline">GST: <strong className="font-mono text-amber-600 dark:text-amber-400">₹{formatINR(totals.grandGstValue)}</strong></span>
            <span>Final Quoted: <strong className="font-mono text-brand-600 dark:text-brand-400 text-sm">₹{formatINR(totals.roundOff || totals.grandTotal)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              icon={Printer}
              onClick={handlePrint}
              title="Print or Save as PDF"
            >
              Print / Save PDF
            </Button>
            <Button
              icon={Save}
              loading={pending}
              onClick={handleSave}
            >
              Save Quotation
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to save quotation: {error.message || 'Please check your inputs and try again.'}</span>
          </div>
        )}

        {/* 3 Pages Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? tab.isSpecial
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive && !tab.isSpecial ? 'text-brand-600 dark:text-brand-400' : ''}`} />
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] block opacity-70 font-normal">{tab.sublabel}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="pt-2">
          {activeTab === 'tab1' && (
            <TabCoverLetter
              data={coverLetter}
              onChange={setCoverLetter}
            />
          )}

          {activeTab === 'tab2' && (
            <TabQuotationItems
              rooms={rooms}
              serviceItems={serviceItems}
              scopeTitle={meta.scopeTitle}
              refArchitect={meta.refArchitect}
              specialNotes={meta.specialNotes}
              closedAtText={meta.closedAtText}
              totals={totals}
              onUpdateRooms={setRooms}
              onUpdateServiceItems={setServiceItems}
              onUpdateMeta={handleUpdateMeta}
            />
          )}

          {activeTab === 'tab3' && (
            <TabTermsBanking
              data={termsBanking}
              onChange={setTermsBanking}
            />
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Preview Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 no-print">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">Displaying:</span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-purple-200 dark:border-purple-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewPages([1, 2, 3])}
                      className={`px-2.5 py-1 rounded font-medium transition ${
                        previewPages.length === 3
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      All 3 Pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPages([1])}
                      className={`px-2.5 py-1 rounded font-medium transition ${
                        previewPages.length === 1 && previewPages[0] === 1
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Page 1 Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPages([2])}
                      className={`px-2.5 py-1 rounded font-medium transition ${
                        previewPages.length === 1 && previewPages[0] === 2
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Page 2 Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPages([3])}
                      className={`px-2.5 py-1 rounded font-medium transition ${
                        previewPages.length === 1 && previewPages[0] === 3
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Page 3 Only
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    icon={Printer}
                    onClick={handlePrint}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Print / Export to PDF
                  </Button>
                </div>
              </div>

              {/* High-Fidelity Print & PDF Sheet View */}
              <div className="p-4 sm:p-6 bg-slate-200 dark:bg-slate-950/80 rounded-2xl overflow-x-auto max-h-[65vh] border border-slate-300 dark:border-slate-800">
                <QuotationPrintView
                  coverLetter={coverLetter}
                  clientName={coverLetter.clientName || item.clientName}
                  refArchitect={meta.refArchitect}
                  scopeTitle={meta.scopeTitle}
                  quotationNo={coverLetter.quotationNo}
                  dateStr={coverLetter.date}
                  rooms={rooms}
                  serviceItems={serviceItems}
                  totals={totals}
                  specialNotes={meta.specialNotes}
                  closedAtText={meta.closedAtText}
                  termsBanking={termsBanking}
                  printablePages={previewPages}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditQuotationModal;