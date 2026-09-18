export const DEFAULT_COVER_LETTER = {
  companyName: 'embellish',
  companyTagline: 'Punctuating Spaces •',
  documentTitle: 'Estimate',
  date: '15/04/2026',
  quotationNo: 'EMBRAG 520-A / 2025 -26',
  companyAddress: `Unit No : 1, 1st Floor,
Raghuvanshi Mansion,
Raghuvanshi Mill Compound,
Senapati Bapat Road,
Lower Parel (West).
Mumbai - 400013.
Email: hiteshembellish@gmail.com`,
  clientSalutation: 'To,',
  clientName: 'Mr.Rakesh Jain',
  subject: 'PROFORMA INVOICE',
  greeting: 'Respected Sir,',
  bodyText: `Please find enclosed estimate for Curtain.

Should you have any queries, please feel free to contact us.

We look forward to working with you.`,
  queryNote: 'Should you have any queries, please feel free to contact us.',
  closingNote: 'We look forward to working with you.',
  signOff: 'Kind Regards,',
  signatoryName: 'Mr. Hitesh Bhanushali',
  signatoryCompany: 'Embellish',
};

export const DEFAULT_TERMS_BANKING = {
  advancePercent: '70% Advance',
  deliveryPercent: '30% before delivery',
  paymentInspectionNote:
    '(All payments must be released beofre installation. Stitched Curtains will be available for inspection before delivery at ou r Bhiwandi workshop on request.)',
  favourOf: 'Embellish',
  bankName: 'KOTAK MAHINDRA BANK',
  accountNo: '7648054150',
  ifscCode: 'KKBK0000642',
  micrNo: '400485006',
  branch: 'Mulund West',
  gstNo: '27AIFPB1400Q1ZH',
  cancellationPolicy:
    'Once an order has been accepted, no cancellation of that order is valid unless you receive our written communication endorsing the cancelled order. Your deposit is NOT REFUNDABLE and credit will remain available only if the goods ordered specifically for you have not been manufactured or ordered.',
  pricesValidity: `All prices mentioned in the estimate are valid for one month for the date of the estimate.
All prices are exclusive of all taxes unless mentioned otherwise.`,
  transportationPolicy: `All prices mentioned in the estimate are Ex-Mumbai.
All further cost (transportation, octroi and other miscellaneous expenses to be paid at actual by the client mentioned in the estimate
If onsite stitching is required, the client will arrange for travelling of workmen from our office (Mumbai) to the site, space for work, food for workmen and accommodation.`,
};

export const SAMPLE_RAKESH_JAIN_ROOMS = [
  {
    id: 'room-1',
    srNo: '1',
    roomName: 'Living Area',
    items: [
      { id: 'i-1-1', description: 'W1 mock 1 reverse 40"', unit: 'mtr', qty: 10, price: 2200, gstRate: 5 },
      { id: 'i-1-2', description: 'W1 mock 2 40"', unit: 'mtr', qty: 10, price: 2900, gstRate: 5 },
      { id: 'i-1-3', description: 'Fabric blackout', unit: 'mtr', qty: 24, price: 395, gstRate: 5 },
      { id: 'i-1-4', description: "W1 Sheer Curtain - Custom fringe sheer 20''", unit: 'mtr', qty: 42, price: 5600, gstRate: 5 },
      { id: 'i-1-5', description: 'W2 Mock 1 reverse 40"', unit: 'mtr', qty: 10, price: 2200, gstRate: 5 },
      { id: 'i-1-6', description: 'W2 Mock 40"', unit: 'mtr', qty: 10, price: 2900, gstRate: 5 },
      { id: 'i-1-7', description: 'Fabric blackout', unit: 'mtr', qty: 10, price: 395, gstRate: 5 },
      { id: 'i-1-8', description: "W2 Sheer Curtain - Custom fringe sheer 20''", unit: 'mtr', qty: 10.5, price: 5600, gstRate: 5 },
      { id: 'i-1-9', description: 'Tassels', unit: 'pcs', qty: 4, price: 18000, gstRate: 5 },
      { id: 'i-1-10', description: 'Knob', unit: 'pcs', qty: 4, price: 6000, gstRate: 5 },
      { id: 'i-1-11', description: 'W3 Mock 1 reverse 40" + 40"', unit: 'mtr', qty: 19, price: 2200, gstRate: 5 },
      { id: 'i-1-12', description: 'W3 Mock 2 40"', unit: 'mtr', qty: 19, price: 2900, gstRate: 5 },
      { id: 'i-1-13', description: 'Fabric blackout', unit: 'mtr', qty: 19, price: 395, gstRate: 5 },
      { id: 'i-1-14', description: "W3 Sheer Curtain - Custom fringe sheer 20''", unit: 'mtr', qty: 39, price: 5600, gstRate: 5 },
      { id: 'i-1-15', description: 'vertical trim fr all 4 mock', unit: 'rnft', qty: 40, price: 750, gstRate: 5 },
    ],
  },
  {
    id: 'room-2',
    srNo: '2',
    roomName: 'Mandir Area - Selection Pending',
    items: [
      { id: 'i-2-1', description: 'roller blind', unit: 'Sq.ft', qty: 83, price: 450, gstRate: 18 },
    ],
  },
  {
    id: 'room-3',
    srNo: '3',
    roomName: 'Guest Room',
    items: [
      { id: 'i-3-1', description: 'Main Curtain', unit: 'mtr', qty: 23, price: 1100, gstRate: 5 },
      { id: 'i-3-2', description: 'Fabric blackout', unit: 'mtr', qty: 22.5, price: 395, gstRate: 5 },
      { id: 'i-3-3', description: 'Sheer Curtain', unit: 'mtr', qty: 23, price: 1200, gstRate: 5 },
    ],
  },
  {
    id: 'room-4',
    srNo: '4',
    roomName: 'Rakesh & Sangita Room',
    items: [
      { id: 'i-4-1', description: 'Main Curtain', unit: 'mtr', qty: 19.5, price: 1300, gstRate: 5 },
      { id: 'i-4-2', description: 'Fabric blackout', unit: 'mtr', qty: 19, price: 395, gstRate: 5 },
      { id: 'i-4-3', description: 'Sheer Curtain - Custom french knot diagnal', unit: 'mtr', qty: 19.5, price: 4200, gstRate: 5 },
    ],
  },
  {
    id: 'room-5',
    srNo: '5',
    roomName: 'Rishabh and Priyal Room',
    items: [
      { id: 'i-5-1', description: 'Main Curtain', unit: 'mtr', qty: 26, price: 2200, gstRate: 5 },
      { id: 'i-5-2', description: 'Fabric blackout', unit: 'mtr', qty: 25.5, price: 395, gstRate: 5 },
      { id: 'i-5-3', description: 'Sheer Curtain', unit: 'mtr', qty: 26, price: 2100, gstRate: 5 },
    ],
  },
  {
    id: 'room-6',
    srNo: '',
    roomName: 'Walking',
    items: [
      { id: 'i-6-1', description: 'Wooden Blind', unit: 'Sq.ft', qty: 57, price: 950, gstRate: 18 },
    ],
  },
  {
    id: 'room-7',
    srNo: '7',
    roomName: 'Kitchen - Selection Pending',
    items: [
      { id: 'i-7-1', description: 'Roller Blind', unit: 'Sq.ft', qty: 68, price: 450, gstRate: 18 },
    ],
  },
  {
    id: 'room-8',
    srNo: '8',
    roomName: 'Avik Room',
    items: [
      { id: 'i-8-1', description: 'LW1 Main Curtain 70/30', unit: 'mtr', qty: 10.5, price: 1700, gstRate: 5 },
      { id: 'i-8-2', description: 'Fabric blackout', unit: 'mtr', qty: 10, price: 395, gstRate: 5 },
      { id: 'i-8-3', description: 'LW1 Sheer Curtain', unit: 'mtr', qty: 10.5, price: 2200, gstRate: 5 },
      { id: 'i-8-4', description: 'LW2 Main Curtain 70/30', unit: 'mtr', qty: 26, price: 1700, gstRate: 5 },
      { id: 'i-8-5', description: 'Fabric blackout', unit: 'mtr', qty: 25.5, price: 395, gstRate: 5 },
      { id: 'i-8-6', description: 'LW2 Sheer Curtain', unit: 'mtr', qty: 26, price: 2200, gstRate: 5 },
    ],
  },
  {
    id: 'room-9',
    srNo: '9',
    roomName: 'Future Kids Room',
    items: [
      { id: 'i-9-1', description: 'Main Curtain', unit: 'mtr', qty: 23, price: 2200, gstRate: 5 },
      { id: 'i-9-2', description: 'Fabric blackout', unit: 'mtr', qty: 22.5, price: 395, gstRate: 5 },
      { id: 'i-9-3', description: 'Sheer Curtain', unit: 'mtr', qty: 23, price: 1100, gstRate: 5 },
    ],
  },
];

export const SAMPLE_SERVICE_ITEMS = [
  { id: 'srv-1', description: 'Mock Stitching', unit: 'rnft', qty: 28, price: 1600, gstRate: 5 },
  { id: 'srv-2', description: 'Curtain stitching', unit: 'rnft', qty: 173, price: 950, gstRate: 5 },
  { id: 'srv-3', description: 'Lead Band', unit: 'rnft', qty: 173, price: 125, gstRate: 5 },
  { id: 'srv-4', description: 'Mock Manual channels', unit: 'rnft', qty: 28, price: 475, gstRate: 18 },
  { id: 'srv-5', description: 'Mock Manual channels Fixing', unit: 'rnft', qty: 28, price: 100, gstRate: 18 },
  { id: 'srv-6', description: 'Main Custom Tie Back', unit: 'Pc', qty: 12, price: 2500, gstRate: 5 },
  { id: 'srv-7', description: 'Sheer Reg Tie Back', unit: 'Pc', qty: 18, price: 750, gstRate: 5 },
  { id: 'srv-8', description: 'Transportaion Charges', unit: '', qty: 1, price: 15000, gstRate: 18 },
  { id: 'srv-9', description: 'Installation charges', unit: '', qty: 1, price: 28000, gstRate: 18 },
];

export const UNIT_OPTIONS = [
  { value: 'mtr', label: 'mtr (Meters)' },
  { value: 'Sq.ft', label: 'Sq.ft (Square Feet)' },
  { value: 'rnft', label: 'rnft (Running Feet)' },
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'Pc', label: 'Pc (Piece)' },
  { value: 'Set', label: 'Set' },
  { value: 'Lump sum', label: 'Lump sum' },
  { value: '', label: '— None —' },
];

export const GST_OPTIONS = [
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
  { value: 0, label: '0% (Exempt)' },
];

export const calculateItemValues = (item) => {
  const qty = Number(item.qty || 0);
  const price = Number(item.price || 0);
  const gstRate = Number(item.gstRate ?? 5);

  const totalValue = Math.round(qty * price * 100) / 100;
  const gstValue = Math.round(totalValue * (gstRate / 100) * 100) / 100;
  const total = Math.round((totalValue + gstValue) * 100) / 100;

  return {
    qty,
    price,
    totalValue,
    gstRate,
    gstValue,
    total,
  };
};

export const calculateQuotationSheetTotals = (rooms = [], services = []) => {
  let grandTotalValue = 0;
  let grandGstValue = 0;
  let grandTotal = 0;

  const processedRooms = rooms.map((room) => {
    const processedItems = (room.items || []).map((it) => {
      const vals = calculateItemValues(it);
      grandTotalValue += vals.totalValue;
      grandGstValue += vals.gstValue;
      grandTotal += vals.total;
      return { ...it, ...vals };
    });
    return { ...room, items: processedItems };
  });

  const processedServices = (services || []).map((srv) => {
    const vals = calculateItemValues(srv);
    grandTotalValue += vals.totalValue;
    grandGstValue += vals.gstValue;
    grandTotal += vals.total;
    return { ...srv, ...vals };
  });

  const roundOff = Math.round(grandTotal);

  return {
    processedRooms,
    processedServices,
    grandTotalValue: Math.round(grandTotalValue * 100) / 100,
    grandGstValue: Math.round(grandGstValue * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    roundOff,
  };
};

export const formatINR = (val, decimals = 2) => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
