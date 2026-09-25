import { calculateRowConsumption } from '../../utils/consumptionCalc.js';

export const PARTICULAR_MAP = {
  MAIN_CURTAIN: 'Main Curtain',
  SHEER_CURTAIN: 'Sheer Curtain',
  MOTORISED_CURTAIN: 'Motorised Curtain',
  ROMAN_BLIND: 'Roman Blind',
  WOODEN_BLIND: 'Wooden Blind',
  ROLLER_BLIND: 'Roller Blind',
  WALLPAPER: 'Wallpaper',
};

export const DEFAULT_COVER_LETTER = {
  companyName: 'embellish',
  companyTagline: 'Punctuating Spaces •',
  documentTitle: 'Estimate',
  date: (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  })(),
  quotationNo: 'EMB-QTN',
  companyAddress: `Unit No : 1, 1st Floor,
Raghuvanshi Mansion,
Raghuvanshi Mill Compound,
Senapati Bapat Road,
Lower Parel (West).
Mumbai - 400013.
Email: hiteshembellish@gmail.com`,
  clientSalutation: 'To,',
  clientName: 'Client',
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

/**
 * Recursively parses JSON / subform arrays from MongoDB / lead payload fields.
 */
export const parseSubformArray = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && raw !== null) return [raw];
  if (typeof raw === 'string') {
    let current = raw.trim();
    let depth = 0;
    while (typeof current === 'string' && depth < 5) {
      const trimmed = current.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          current = JSON.parse(trimmed);
          depth++;
        } catch {
          break;
        }
      } else {
        break;
      }
    }
    if (Array.isArray(current)) return current;
    if (typeof current === 'object' && current !== null) return [current];
  }
  return [];
};

/**
 * Validates if a measurement row has usable room/window/dimensional data.
 */
export const isMeasurementRowValid = (row) => {
  if (!row) return false;
  const hasArea = Boolean(
    (row.area && String(row.area).trim()) ||
    (row.room && String(row.room).trim()) ||
    (row.roomName && String(row.roomName).trim())
  );
  const hasDims = Boolean(
    (row.outToOutWidth !== '' && row.outToOutWidth != null) ||
    (row.outToOutHeight !== '' && row.outToOutHeight != null) ||
    (row.frameToFrameWidth !== '' && row.frameToFrameWidth != null) ||
    (row.frameToFrameHeight !== '' && row.frameToFrameHeight != null) ||
    (row.pelmetOutOutWidth !== '' && row.pelmetOutOutWidth != null) ||
    (row.pelmetOutOutDrop !== '' && row.pelmetOutOutDrop != null) ||
    (row.pelmetFrameFrameWidth !== '' && row.pelmetFrameFrameWidth != null) ||
    (row.pelmetFrameFrameDrop !== '' && row.pelmetFrameFrameDrop != null) ||
    (row.width !== '' && row.width != null) ||
    (row.height !== '' && row.height != null) ||
    (row.confirmedWidth !== '' && row.confirmedWidth != null) ||
    (row.confirmedHeight !== '' && row.confirmedHeight != null)
  );
  const hasDetail = Boolean(
    (row.lWindowDetail && String(row.lWindowDetail).trim()) ||
    (row.windowId && String(row.windowId).trim()) ||
    (row.label && String(row.label).trim()) ||
    (row.remarks && String(row.remarks).trim()) ||
    (row.notes && String(row.notes).trim()) ||
    (row.sidesOfRoman && String(row.sidesOfRoman).trim()) ||
    (row.ceilingSupport && String(row.ceilingSupport).trim()) ||
    row.wire || row.wireLeft || row.wireRight ||
    row.fabric || row.fabricName || row.particular || row.windowType
  );
  return hasArea || hasDims || hasDetail;
};

/**
 * Traverses the sidebar pipeline backwards to collect measurement rows:
 * Stage 3 (Consumption Sheet) -> Stage 1 (Measurement Capture) -> Stage 4 (Ready Size).
 */
export const getConsumptionMeasurements = (item) => {
  if (!item) return [];

  // 1. Consumption Sheet measurements (Stage 3 in sidebar)
  const existingConsumption = item?.consumption?.measurements;
  const parsedExisting = parseSubformArray(existingConsumption);
  if (parsedExisting.length > 0 && typeof parsedExisting[0] === 'object') {
    const validExisting = parsedExisting.filter(isMeasurementRowValid);
    if (validExisting.length > 0) {
      return validExisting;
    }
  }

  // 2. Measurement Capture rows or notes (Stage 1 in sidebar)
  const rawNotes = item?.measurement?.rows || item?.measurement?.notes;
  const parsedNotes = parseSubformArray(rawNotes);
  const validNotes = parsedNotes.filter(isMeasurementRowValid);
  if (validNotes.length > 0) {
    return validNotes;
  }

  // 3. Ready Size final measurements
  const rawFinal = item?.readySize?.finalMeasurements || item?.readySize?.finalMeasurementGrid;
  const parsedFinal = parseSubformArray(rawFinal);
  const validFinal = parsedFinal.filter(isMeasurementRowValid);
  if (validFinal.length > 0) {
    return validFinal;
  }

  // 4. Ready Size window sizes or measurement window sizes
  const rawWindows = item?.readySize?.windowSizes || item?.readySize?.windowSize || item?.measurement?.windowSizes;
  const parsedWindows = parseSubformArray(rawWindows);
  const validWindows = parsedWindows.filter(isMeasurementRowValid);
  if (validWindows.length > 0) {
    return validWindows;
  }

  return [];
};

/**
 * Checks if the rooms array is the hardcoded Rakesh Jain dummy sample.
 */
export const isSampleRakeshJainRooms = (rooms, clientName = '') => {
  if (!Array.isArray(rooms) || rooms.length === 0) return false;
  if (clientName && String(clientName).toLowerCase().includes('rakesh jain')) return false;
  const hasTellTaleRoom = rooms.some(
    (r) =>
      r.roomName &&
      (r.roomName.toLowerCase().includes('rakesh & sangita') ||
        r.roomName.toLowerCase().includes('rishabh and priyal') ||
        r.roomName.toLowerCase().includes('avik room'))
  );
  return hasTellTaleRoom;
};

/**
 * Checks if the service items array is the hardcoded Rakesh Jain dummy sample.
 */
export const isSampleRakeshJainServices = (services, clientName = '') => {
  if (!Array.isArray(services) || services.length === 0) return false;
  if (clientName && String(clientName).toLowerCase().includes('rakesh jain')) return false;
  const hasTellTaleService = services.some(
    (s) =>
      (s.description?.includes('Mock Stitching') && s.qty === 28) ||
      (s.description?.includes('Curtain stitching') && s.qty === 173) ||
      (s.description?.includes('Installation') && s.price === 28000)
  );
  return hasTellTaleService;
};

/**
 * Builds quotation rooms and window items following the sidebar flow:
 * Takes whichever rooms and windows exist in the consumption sheet / measurement capture,
 * calculates fabric / blind quantities, and organizes them room-by-room.
 */
export const buildQuotationRoomsFromLead = (item) => {
  const measurementRows = getConsumptionMeasurements(item);
  const rawRoomList = item?.consumption?.roomList || item?.rooms || item?.measurement?.roomList;
  const parsedRoomList = typeof rawRoomList === 'string'
    ? rawRoomList.split(',').map((s) => s.trim()).filter(Boolean)
    : Array.isArray(rawRoomList)
      ? rawRoomList.map((s) => String(s).trim()).filter(Boolean)
      : [];

  if (measurementRows.length > 0) {
    const roomMap = new Map();

    measurementRows.forEach((row, idx) => {
      const rawRoomName = (row.room && String(row.room).trim()) ||
                          (row.area && String(row.area).trim()) ||
                          (row.roomName && String(row.roomName).trim()) ||
                          'General';
      const key = rawRoomName.toLowerCase();
      if (!roomMap.has(key)) {
        roomMap.set(key, { roomName: rawRoomName, rows: [] });
      }
      roomMap.get(key).rows.push({ row, idx });
    });

    const quotationRooms = [];
    let roomCounter = 1;

    for (const { roomName, rows } of roomMap.values()) {
      const items = [];
      let itemCounter = 1;

      rows.forEach(({ row }) => {
        const calc = calculateRowConsumption(row);
        const rawParticular = String(row.particular || row.windowType || 'MAIN_CURTAIN').toUpperCase();
        const particularLabel = PARTICULAR_MAP[rawParticular] || row.particular || row.windowType || 'Main Curtain';
        const windowLabel = (row.windowId || row.lWindowDetail || row.label || '').trim();

        let description = '';
        if (windowLabel) {
          if (particularLabel.toLowerCase().includes(windowLabel.toLowerCase())) {
            description = particularLabel;
          } else {
            description = `${windowLabel} ${particularLabel}`;
          }
        } else {
          description = particularLabel;
        }

        if (row.fabricName && !description.toLowerCase().includes(String(row.fabricName).toLowerCase())) {
          description += ` - ${row.fabricName}`;
        }

        const isBlind = rawParticular.includes('ROMAN') || rawParticular.includes('ROLLER') || rawParticular.includes('WOODEN');
        const isWallpaper = rawParticular.includes('WALLPAPER');

        let unit = 'mtr';
        let qty = 1;
        let gstRate = 5;

        if (isBlind) {
          unit = 'Sq.ft';
          const sqftVal = Number(calc.romanSqft ?? row.romanSqft ?? 0);
          qty = sqftVal > 0 ? Math.round(sqftVal * 100) / 100 : 1;
          gstRate = 18;
        } else if (isWallpaper) {
          unit = 'Sq.ft';
          const wpQty = Number(calc.stripsPerWall ?? calc.orderRolls ?? 0);
          qty = wpQty > 0 ? Math.round(wpQty * 100) / 100 : 1;
          gstRate = 18;
        } else {
          unit = 'mtr';
          const fabricQty = Number(calc.orderMetres ?? calc.fabricMeters ?? calc.mtrsDrapesRoundOff ?? row.fabricMeters ?? row.quantity ?? 0);
          qty = fabricQty > 0 ? Math.round(fabricQty * 100) / 100 : 1;
          gstRate = 5;
        }

        const itemPrice = Number(row.price ?? row.rate ?? 0);

        items.push({
          id: `item-${roomCounter}-${itemCounter++}`,
          description,
          unit,
          qty,
          price: itemPrice,
          gstRate,
        });

        // Add blackout item if needed
        const blackoutMtr = Number(calc.blackoutMeters ?? row.blackoutMeters ?? (row.blackout ? qty : 0));
        if (blackoutMtr > 0) {
          items.push({
            id: `item-${roomCounter}-${itemCounter++}`,
            description: `${windowLabel ? windowLabel + ' ' : ''}Fabric blackout`.trim(),
            unit: 'mtr',
            qty: Math.round(blackoutMtr * 100) / 100,
            price: 395,
            gstRate: 5,
          });
        }
      });

      quotationRooms.push({
        id: `room-${roomCounter}`,
        srNo: String(roomCounter),
        roomName,
        items,
      });

      roomCounter++;
    }

    // Add any remaining rooms from roomList
    parsedRoomList.forEach((rName) => {
      const alreadyIncluded = quotationRooms.some((qr) => qr.roomName.toLowerCase() === rName.toLowerCase());
      if (!alreadyIncluded) {
        quotationRooms.push({
          id: `room-${roomCounter}`,
          srNo: String(roomCounter),
          roomName: rName,
          items: [
            {
              id: `item-${roomCounter}-1`,
              description: 'Main Curtain',
              unit: 'mtr',
              qty: 1,
              price: 0,
              gstRate: 5,
            },
          ],
        });
        roomCounter++;
      }
    });

    return quotationRooms;
  }

  // Fallback to parsedRoomList if measurements not present
  if (parsedRoomList.length > 0) {
    return parsedRoomList.map((roomName, idx) => ({
      id: `room-${idx + 1}`,
      srNo: String(idx + 1),
      roomName,
      items: [
        {
          id: `item-${idx + 1}-1`,
          description: 'Main Curtain',
          unit: 'mtr',
          qty: 1,
          price: 0,
          gstRate: 5,
        },
      ],
    }));
  }

  // Clean default if no lead rooms are available
  return [
    {
      id: 'room-1',
      srNo: '1',
      roomName: 'Living Room',
      items: [
        {
          id: 'item-1-1',
          description: 'Main Curtain',
          unit: 'mtr',
          qty: 1,
          price: 0,
          gstRate: 5,
        },
      ],
    },
  ];
};

/**
 * Builds quotation service items based on consumption totals (stitching, lead band, transport, installation).
 */
export const buildQuotationServicesFromLead = (item) => {
  const measurementRows = getConsumptionMeasurements(item);
  let totalCurtainRnft = 0;
  let totalRomanSqft = 0;

  measurementRows.forEach((row) => {
    const calc = calculateRowConsumption(row);
    const particular = String(row.particular || row.windowType || 'MAIN_CURTAIN').toUpperCase();
    if (particular.includes('ROMAN') || particular.includes('ROLLER') || particular.includes('WOODEN')) {
      totalRomanSqft += Number(calc.romanSqft ?? row.romanSqft ?? 0);
    } else {
      totalCurtainRnft += Number(calc.rnft ?? row.rnft ?? 0);
    }
  });

  const services = [];
  let srvIdx = 1;

  if (totalCurtainRnft > 0) {
    services.push({
      id: `srv-${srvIdx++}`,
      description: 'Curtain stitching',
      unit: 'rnft',
      qty: Math.round(totalCurtainRnft * 100) / 100,
      price: 950,
      gstRate: 5,
    });
    services.push({
      id: `srv-${srvIdx++}`,
      description: 'Lead Band',
      unit: 'rnft',
      qty: Math.round(totalCurtainRnft * 100) / 100,
      price: 125,
      gstRate: 5,
    });
  }

  if (totalRomanSqft > 0) {
    services.push({
      id: `srv-${srvIdx++}`,
      description: 'Roman Stitching',
      unit: 'rnft',
      qty: Math.round(totalRomanSqft * 100) / 100,
      price: 500,
      gstRate: 18,
    });
  }

  services.push({
    id: `srv-${srvIdx++}`,
    description: 'Transportation Charges',
    unit: '',
    qty: 1,
    price: 0,
    gstRate: 18,
  });

  services.push({
    id: `srv-${srvIdx++}`,
    description: 'Installation charges',
    unit: '',
    qty: 1,
    price: 0,
    gstRate: 18,
  });

  return services;
};

