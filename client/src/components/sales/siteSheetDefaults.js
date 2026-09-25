import {
  parseSubformArray,
  getConsumptionMeasurements,
  isSampleRakeshJainRooms,
  buildQuotationRoomsFromLead,
} from '../quotation/quotationDefaults';

/**
 * Default sample rooms extracted directly from Master Excel "Site Detail Sheet. R5.xls"
 * Used as an optional reference only.
 */
export const SAMPLE_SITE_DETAIL_ROOMS = [
  {
    "id": "room-1",
    "sheetName": "Living Room - W1",
    "roomTitle": "Living Room W1",
    "sheetNo": 1,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Width of the Fabric as ht, of the Window",
      "Width of the Fabric as ht, of the Window"
    ],
    "items": [
      {
        "id": "item-1-2",
        "srNo": 2,
        "look": "",
        "type": "W1 Reverse Mock",
        "windowWidth": "55\"",
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready with Trim",
        "brand": "Olake /",
        "fabricName": "H0692-17",
        "fabricWidth": "300",
        "repeatV": "",
        "repeatH": "",
        "fullness": 3,
        "qtyMtrs": 5,
        "stitchingStyle": "Knife",
        "parts": 1.5,
        "opening": "Lock on Left",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "in house 301 blackout",
        "liningQty": "",
        "tieback": "",
        "position": "1",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-1-1",
        "srNo": 1,
        "look": "",
        "type": "W1 Drape Mock",
        "windowWidth": "40\"",
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "D Décor Aura / \nGlorious",
        "fabricName": "Sr.No. 125 / \nQuality : Nampa - New / \nDesign : Plain / \nShade : 429",
        "fabricWidth": "140",
        "repeatV": "",
        "repeatH": "",
        "fullness": 3,
        "qtyMtrs": 11,
        "stitchingStyle": "Knife",
        "parts": 3,
        "opening": "Lock on Left",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "2",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-1-3",
        "srNo": 3,
        "look": "",
        "type": "Trim",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Order by ishani M",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-1-4",
        "srNo": 4,
        "look": "",
        "type": "Tessels",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "IKN \nIKON Accessories 2022",
        "fabricName": "544104",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "1 - Pc",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-1-5",
        "srNo": 5,
        "look": "",
        "type": "Knobs",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "IKN \nIKON Accessories 2022",
        "fabricName": "584103",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "1 - Pc",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-1-6",
        "srNo": 6,
        "look": "",
        "type": "W1 Sheer Curtain",
        "windowWidth": 253,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready with Fringes",
        "brand": "Lihuamingxiu",
        "fabricName": "H104 - 1",
        "fabricWidth": "280",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 17,
        "stitchingStyle": "Ripple",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "3",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-1-7",
        "srNo": 7,
        "look": "",
        "type": "Fringes 20\"",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Order by ishani M",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-1-8",
        "srNo": 8,
        "look": "",
        "type": "Fringess Back Fabric",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "In house Net Fabric",
        "brand": "White Net \nM-00",
        "fabricName": "",
        "fabricWidth": "54\"",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": 8.5,
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-2",
    "sheetName": "Living Room - W2",
    "roomTitle": "Living Room W2",
    "sheetNo": 2,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Width of the Fabric as ht, of the Window",
      "Width of the Fabric as ht, of the Window"
    ],
    "items": [
      {
        "id": "item-2-1",
        "srNo": 1,
        "look": "",
        "type": "W2 Reverse Mock",
        "windowWidth": "52\"",
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready with Trim",
        "brand": "Olake /",
        "fabricName": "H0692-17",
        "fabricWidth": "300",
        "repeatV": "",
        "repeatH": "",
        "fullness": 3,
        "qtyMtrs": 5,
        "stitchingStyle": "Knife",
        "parts": 1.5,
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "in house 301 blackout",
        "liningQty": "",
        "tieback": "",
        "position": "1",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-2-2",
        "srNo": 2,
        "look": "",
        "type": "W2 Drape Mock",
        "windowWidth": "40\"",
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "D Décor Aura / \nGlorious",
        "fabricName": "Sr.No. 125 / \nQuality : Nampa - New / \nDesign : Plain / \nShade : 429",
        "fabricWidth": "140",
        "repeatV": "",
        "repeatH": "",
        "fullness": 3,
        "qtyMtrs": 11,
        "stitchingStyle": "Knife",
        "parts": 3,
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "2",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-2-3",
        "srNo": 3,
        "look": "",
        "type": "Trim",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Order by ishani M",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-2-4",
        "srNo": 4,
        "look": "",
        "type": "Tessels",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "IKN \nIKON Accessories 2022",
        "fabricName": "544104",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "1 - Pc",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-2-5",
        "srNo": 5,
        "look": "",
        "type": "Knobs",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "IKN \nIKON Accessories 2022",
        "fabricName": "584103",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "1 - Pc",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-2-6",
        "srNo": 6,
        "look": "",
        "type": "W2 Sheer Curtain",
        "windowWidth": 52.75,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready with Fringes",
        "brand": "Lihuamingxiu",
        "fabricName": "H104 - 1",
        "fabricWidth": "280",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 4,
        "stitchingStyle": "Ripple",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-2-7",
        "srNo": 7,
        "look": "",
        "type": "Fringes 20\"",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Order by ishani M",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-2-8",
        "srNo": 8,
        "look": "",
        "type": "Fringess Back Fabric",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "In house Net Fabric",
        "brand": "White Net \nM-00",
        "fabricName": "",
        "fabricWidth": "54\"",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": 4,
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-3",
    "sheetName": "Living Room - W3",
    "roomTitle": "Living Room W3",
    "sheetNo": 3,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Width of the Fabric as ht, of the Window",
      "Width of the Fabric as ht, of the Window"
    ],
    "items": [
      {
        "id": "item-3-1",
        "srNo": 1,
        "look": "",
        "type": "W3 Reverse Mock",
        "windowWidth": "55\" + 55\"",
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready with Trim",
        "brand": "Olake /",
        "fabricName": "H0692-17",
        "fabricWidth": "300",
        "repeatV": "",
        "repeatH": "",
        "fullness": 3,
        "qtyMtrs": 10,
        "stitchingStyle": "Knife",
        "parts": "1.5 + 1.5",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "in house 301 blackout",
        "liningQty": "",
        "tieback": "",
        "position": "1",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-3-2",
        "srNo": 2,
        "look": "",
        "type": "W3 Drape Mock",
        "windowWidth": "40\" + 40\"",
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "D Décor Aura / \nGlorious",
        "fabricName": "Sr.No. 125 / \nQuality : Nampa - New / \nDesign : Plain / \nShade : 429",
        "fabricWidth": "140",
        "repeatV": "",
        "repeatH": "",
        "fullness": 3,
        "qtyMtrs": 21.5,
        "stitchingStyle": "Knife",
        "parts": "3+3",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "2",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-3-3",
        "srNo": 3,
        "look": "",
        "type": "Trim",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Order by ishani M",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-3-4",
        "srNo": 4,
        "look": "",
        "type": "Tessels",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "IKN \nIKON Accessories 2022",
        "fabricName": "544104",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "2 - Pc",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-3-5",
        "srNo": 5,
        "look": "",
        "type": "Knobs",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "IKN \nIKON Accessories 2022",
        "fabricName": "584103",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "2 - Pc",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-3-6",
        "srNo": 6,
        "look": "",
        "type": "W3 Sheer Curtain",
        "windowWidth": 224,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready with Fringes",
        "brand": "Lihuamingxiu",
        "fabricName": "H104 - 1",
        "fabricWidth": "280",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 15.5,
        "stitchingStyle": "Ripple",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-3-7",
        "srNo": 7,
        "look": "",
        "type": "Fringes 20\"",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Order by ishani M",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-3-8",
        "srNo": 8,
        "look": "",
        "type": "Fringess Back Fabric",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "In house Net Fabric",
        "brand": "White Net \nM-00",
        "fabricName": "",
        "fabricWidth": "54\"",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": 8,
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-4",
    "sheetName": "Mandir Area",
    "roomTitle": "Mandir Area",
    "sheetNo": 4,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Width of the Fabric as height of the Window (Vertical Lines Want) adjust in stitching"
    ],
    "items": [
      {
        "id": "item-4-1",
        "srNo": 1,
        "look": "",
        "type": "Roller Blind",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-5",
    "sheetName": "Guest Room",
    "roomTitle": "Guest Room",
    "sheetNo": 5,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Width of the Fabric as height of the Window (Vertical Lines Want) adjust in stitching"
    ],
    "items": [
      {
        "id": "item-5-1",
        "srNo": 1,
        "look": "",
        "type": "Main Curtain",
        "windowWidth": 124,
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [
          "/site-sheets/guest-room/img_0.jpg",
          "/site-sheets/guest-room/img_1.jpg"
        ],
        "design": "Ready",
        "brand": "Deco Dome / \nLinia /",
        "fabricName": "Linia One / \nAlora - 1",
        "fabricWidth": "54\"",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 22.5,
        "stitchingStyle": "Ripple",
        "parts": 7,
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "in house 301 blackout",
        "liningQty": "",
        "tieback": "Custom",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-5-2",
        "srNo": 2,
        "look": "",
        "type": "Sheer Curtain",
        "windowWidth": 124,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [
          "/site-sheets/guest-room/img_2.jpg",
          "/site-sheets/guest-room/img_3.jpg",
          "/site-sheets/guest-room/img_4.jpg",
          "/site-sheets/guest-room/img_5.jpg"
        ],
        "design": "Ready",
        "brand": "Fabri Care /\nLineal 2/2",
        "fabricName": "Lineal / \nSr.No. 05 / \nQuality : Concord / \nDesign : Course / \nShade : Ratten",
        "fabricWidth": "300",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 9,
        "stitchingStyle": "Ripple",
        "parts": "",
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "Reg",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-6",
    "sheetName": "Rakesh & Sangita Room",
    "roomTitle": "Rakesh & Sangita Room",
    "sheetNo": 6,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Design File Will Share by ishani M and Akansha"
    ],
    "items": [
      {
        "id": "item-6-1",
        "srNo": 1,
        "look": "",
        "type": "Main Curtain",
        "windowWidth": 116.2,
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "Sansaar / \nCarlton",
        "fabricName": "Sr.No. 8 / \nPrice Code : D / \nDesign : Helena / \nColour : Manilla /",
        "fabricWidth": "140",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 19.5,
        "stitchingStyle": "Ripple",
        "parts": 6,
        "opening": "Lock on Left",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "in house 301 blackout",
        "liningQty": "",
        "tieback": "Custom",
        "position": "1",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-6-2",
        "srNo": 2,
        "look": "",
        "type": "Sheer Curtain",
        "windowWidth": 116.2,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Custom - \nFrench Knot diagonal",
        "brand": "D Décor / \nSophia",
        "fabricName": "Sophia / \nSr.No. 9 / \nPrice Code : A / \nQuality : PC Linen SRD 7468DP / \nDesign :  Plain / \nShade : 58752 /",
        "fabricWidth": "140",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 19.5,
        "stitchingStyle": "Ripple",
        "parts": 6,
        "opening": "Lock on Left",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "2",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-7",
    "sheetName": "Rishabh and Priyal Room",
    "roomTitle": "Rishabh and Priyal Room",
    "sheetNo": 7,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Width of the Fabric as ht of the Window",
      "Width of the Fabric as ht, of the Window (Once the Fabric arrives, pls inform me of its width. Based on that, we will decide the fall and band."
    ],
    "items": [
      {
        "id": "item-7-1",
        "srNo": 1,
        "look": "",
        "type": "Main Curtain",
        "windowWidth": 144.2,
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "Le Dimora / \nChaster",
        "fabricName": "Pg No: 21 / \nCHAS 207-05 /",
        "fabricWidth": "290",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 10,
        "stitchingStyle": "Ripple",
        "parts": "1+1",
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "in house 301 blackout",
        "liningQty": "",
        "tieback": "Custom",
        "position": "1",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-7-2",
        "srNo": 2,
        "look": "",
        "type": "Sheer Curtain",
        "windowWidth": 144.2,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "Hanger No: 13 /",
        "fabricName": "SKU / \nEMB -129",
        "fabricWidth": "300",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 10,
        "stitchingStyle": "Ripple",
        "parts": "1+1",
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "Reg",
        "position": "2",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-8",
    "sheetName": "Kitchen",
    "roomTitle": "Kitchen",
    "sheetNo": 8,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Width of the Fabric as height of the Window (Vertical Lines Want) adjust in stitching"
    ],
    "items": [
      {
        "id": "item-8-1",
        "srNo": 1,
        "look": "",
        "type": "Roller Blind",
        "windowWidth": "",
        "windowHeight": "",
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "",
        "brand": "",
        "fabricName": "",
        "fabricWidth": "",
        "repeatV": "",
        "repeatH": "",
        "fullness": "",
        "qtyMtrs": "",
        "stitchingStyle": "",
        "parts": "",
        "opening": "",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-9",
    "sheetName": "Avik Room",
    "roomTitle": "Avik Room",
    "sheetNo": 9,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Design File Will Share by ishani M"
    ],
    "items": [
      {
        "id": "item-9-1",
        "srNo": 1,
        "look": "",
        "type": "LW1+2 Main Curtain \n\n(Top Fabric)",
        "windowWidth": 213.1,
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready \n\nTop Fabric \n79.1\"",
        "brand": "Sansaar / \nFables",
        "fabricName": "Sr.No. 37 / \nPrice Code : D / \nQuality : SRD 55876P / \nShade : 67582/",
        "fabricWidth": "140",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 23.5,
        "stitchingStyle": "Ripple",
        "parts": "5.5 + 5.5",
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "In house 301 blackout",
        "liningQty": "",
        "tieback": "Custom",
        "position": "1",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-9-2",
        "srNo": 2,
        "look": "",
        "type": "LW1+2 Sheer Curtain",
        "windowWidth": 213.1,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "Sansaar / \nFables",
        "fabricName": "Sr.No. 42 / \nPrice Code : B / \nQuality : Sheer SA 17751Y. Dull Thread Oriana / \nDesign : 377719 / \nShade : 45344 /",
        "fabricWidth": "140",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 35.5,
        "stitchingStyle": "Ripple",
        "parts": "5.5 + 5.5",
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "Reg",
        "position": "2",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  },
  {
    "id": "room-10",
    "sheetName": "Future Kids Room",
    "roomTitle": "Future Kids Room",
    "sheetNo": 10,
    "clientName": "Mr.Rakesh Jain",
    "architect": "ADID Atelier LLP.",
    "siteIncharge": "Esha / Arisha / Rucha / Namrata",
    "notes": [
      "Vertical Lines Want"
    ],
    "items": [
      {
        "id": "item-10-1",
        "srNo": 1,
        "look": "",
        "type": "Main Curtain",
        "windowWidth": 135.1,
        "windowHeight": 113,
        "pelmetWidth": 12,
        "pelmetDrop": 6,
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "Pure ap Royale",
        "fabricName": "Velencia /\n 120763 /",
        "fabricWidth": "141",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 23,
        "stitchingStyle": "Ripple",
        "parts": "3.5 + 3.5",
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      },
      {
        "id": "item-10-2",
        "srNo": 2,
        "look": "",
        "type": "Sheer Curtain",
        "windowWidth": 135.1,
        "windowHeight": 113,
        "pelmetWidth": "",
        "pelmetDrop": "",
        "pelmetReturn": "",
        "catalogueImages": [],
        "design": "Ready",
        "brand": "Deco Dome / \nLinia",
        "fabricName": "Linia - One / \nZoid  - 26",
        "fabricWidth": "54\"",
        "repeatV": "",
        "repeatH": "",
        "fullness": 2.5,
        "qtyMtrs": 23,
        "stitchingStyle": "Ripple",
        "parts": "3.5 + 3.5",
        "opening": "Center Open",
        "readyWidth": "",
        "readyHeight": "",
        "liningType": "",
        "liningQty": "",
        "tieback": "",
        "position": "",
        "electricalPoint": "",
        "installationType": ""
      }
    ]
  }
];

/**
 * Checks if the site detail rooms array is the hardcoded Rakesh Jain dummy sample.
 */
export const isSampleSiteDetailRooms = (rooms, clientName = '') => {
  if (!Array.isArray(rooms) || rooms.length === 0) return false;
  if (clientName && String(clientName).toLowerCase().includes('rakesh jain')) return false;

  const hasTellTaleRoom = rooms.some((r) => {
    const title = (r.roomTitle || r.sheetName || '').toLowerCase();
    return (
      title.includes('living room w1') ||
      title.includes('living room - w1') ||
      title.includes('rakesh & sangita') ||
      title.includes('rishabh and priyal') ||
      title.includes('avik room') ||
      title.includes('future kids room') ||
      title.includes('walking wardrobe')
    );
  });

  const hasTellTaleItem = rooms.some((r) =>
    Array.isArray(r.items) &&
    r.items.some((it) =>
      it.type === 'W1 Reverse Mock' ||
      it.fabricName === 'H0692-17' ||
      (it.brand && String(it.brand).includes('Olake')) ||
      (it.brand && String(it.brand).includes('D Décor Aura'))
    )
  );

  return hasTellTaleRoom || hasTellTaleItem;
};

/**
 * Traverses the quotation sheet and earlier sidebar pipeline stages to retrieve rooms for a lead.
 */
export const getQuotationRoomsFromLead = (item) => {
  if (!item) return [];

  // 1. Direct quotation sheet rooms
  const rawQSheetRooms = item?.quotation?.quotationSheet?.rooms;
  const parsedQSheetRooms = parseSubformArray(rawQSheetRooms);
  if (parsedQSheetRooms.length > 0 && !isSampleRakeshJainRooms(parsedQSheetRooms, item?.clientName)) {
    return parsedQSheetRooms;
  }

  // 2. Direct itemsTable rooms from quotation
  const rawItemsTableRooms = item?.quotation?.itemsTable?.rooms;
  const parsedItemsTableRooms = parseSubformArray(rawItemsTableRooms);
  if (parsedItemsTableRooms.length > 0 && !isSampleRakeshJainRooms(parsedItemsTableRooms, item?.clientName)) {
    return parsedItemsTableRooms;
  }

  // 3. Fallback quotation.rooms
  const rawQuotationRooms = item?.quotation?.rooms;
  const parsedQuotationRooms = parseSubformArray(rawQuotationRooms);
  if (parsedQuotationRooms.length > 0 && !isSampleRakeshJainRooms(parsedQuotationRooms, item?.clientName)) {
    return parsedQuotationRooms;
  }

  // 4. If quotation sheet has not been saved yet, follow sidebar flow:
  // buildQuotationRoomsFromLead inspects Consumption Sheet (measurements, roomList), Measurement Capture (rows, notes), etc.
  const builtRooms = buildQuotationRoomsFromLead(item);
  if (builtRooms.length > 0 && !isSampleRakeshJainRooms(builtRooms, item?.clientName)) {
    return builtRooms;
  }

  return [];
};

/**
 * Builds Site Detail Sheet rooms and window treatments dynamically from the Quotation Sheet
 * following the sidebar flow (Quotation Preparation -> Site Detail Sheet).
 */
export const buildSiteDetailRoomsFromLead = (item, users = []) => {
  const quotationRooms = getQuotationRoomsFromLead(item);
  const measurementRows = getConsumptionMeasurements(item);

  const clientName = item?.clientName || item?.name || '';
  const architect = item?.architectName || item?.architect || item?.designer || '';
  
  // Resolve incharge from confirmedBy or lead fields
  let siteIncharge = '';
  if (item?.readySize?.confirmedBy) {
    let ids = [];
    const cb = item.readySize.confirmedBy;
    if (Array.isArray(cb)) ids = cb;
    else if (typeof cb === 'string') ids = cb.split(',').map((s) => s.trim()).filter(Boolean);
    else if (typeof cb === 'object' && cb !== null) ids = [cb._id || cb.id || cb.name || cb];

    const names = ids.map((idOrObj) => {
      if (!idOrObj) return null;
      if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
      if (typeof idOrObj === 'string' && users.length > 0) {
        const found = users.find((u) => u._id === idOrObj || u.id === idOrObj);
        if (found?.name) return found.name;
      }
      return typeof idOrObj === 'string' ? idOrObj : (idOrObj?.name || null);
    }).filter(Boolean);

    if (names.length > 0) {
      siteIncharge = names.join(' / ');
    }
  }
  if (!siteIncharge) {
    siteIncharge = item?.siteIncharge || item?.assignedTo?.name || '';
  }

  // Clean empty single room fallback if lead has no rooms anywhere
  if (quotationRooms.length === 0) {
    return [
      {
        id: 'room-1',
        sheetName: 'Room 1',
        roomTitle: 'Room 1',
        sheetNo: 1,
        clientName,
        architect,
        siteIncharge,
        notes: [],
        items: [
          {
            id: 'item-1-1',
            srNo: 1,
            look: '',
            type: 'Main Curtain',
            windowWidth: '',
            windowHeight: '',
            pelmetWidth: '',
            pelmetDrop: '',
            pelmetReturn: '',
            catalogueImages: [],
            design: 'Ready',
            brand: '',
            fabricName: '',
            fabricWidth: '',
            repeatV: '',
            repeatH: '',
            fullness: 2.5,
            qtyMtrs: '',
            stitchingStyle: 'Ripple',
            parts: 1,
            opening: 'Center Open',
            readyWidth: '',
            readyHeight: '',
            liningType: '',
            liningQty: '',
            tieback: '',
            position: '',
            electricalPoint: '',
            installationType: '',
          },
        ],
      },
    ];
  }

  return quotationRooms.map((qRoom, roomIdx) => {
    const qRoomName = qRoom.roomName || `Room ${roomIdx + 1}`;
    
    // Find all measurement rows belonging to this room
    const roomMeasurementRows = measurementRows.filter((mr) => {
      const mrRoom = (mr.room || mr.area || mr.roomName || '').toLowerCase().trim();
      const targetName = qRoomName.toLowerCase().trim();
      return mrRoom && targetName && (mrRoom === targetName || targetName.includes(mrRoom) || mrRoom.includes(targetName));
    });

    const qItems = Array.isArray(qRoom.items) ? qRoom.items : [];

    const mappedItems = qItems.map((qItem, itemIdx) => {
      // Find matching measurement row for this item by window identifier or description
      let matchingRow = roomMeasurementRows.find((mr) => {
        const winId = (mr.windowId || mr.lWindowDetail || mr.label || '').trim().toLowerCase();
        return winId && qItem.description && qItem.description.toLowerCase().includes(winId);
      });

      // If only 1 measurement row exists in this room and there's 1-2 items, or if no windowId matched
      if (!matchingRow && roomMeasurementRows.length === 1) {
        matchingRow = roomMeasurementRows[0];
      } else if (!matchingRow && roomMeasurementRows.length > itemIdx) {
        matchingRow = roomMeasurementRows[itemIdx];
      }

      const windowWidth = matchingRow
        ? (matchingRow.frameToFrameWidth || matchingRow.outToOutWidth || matchingRow.width || matchingRow.confirmedWidth || '')
        : '';
      const windowHeight = matchingRow
        ? (matchingRow.frameToFrameHeight || matchingRow.outToOutHeight || matchingRow.height || matchingRow.confirmedHeight || '')
        : '';
      const pelmetWidth = matchingRow
        ? (matchingRow.pelmetO2oWidth || matchingRow.pelmetOutOutWidth || matchingRow.pelmetF2fWidth || matchingRow.pelmetFrameFrameWidth || '')
        : '';
      const pelmetDrop = matchingRow
        ? (matchingRow.pelmetO2oDrop || matchingRow.pelmetOutOutDrop || matchingRow.pelmetF2fDrop || matchingRow.pelmetFrameFrameDrop || '')
        : '';
      const pelmetReturn = matchingRow
        ? (matchingRow.curtainReturnLeft || matchingRow.curtainReturnRight || '')
        : '';
      const fabricName = matchingRow?.fabricName || matchingRow?.fabric || '';
      const brand = matchingRow?.brand || '';
      const stitchingStyle = matchingRow?.stitchingStyle || 'Ripple';
      const fullness = matchingRow?.fullness || 2.5;
      const parts = matchingRow?.parts || 1;
      const opening = matchingRow?.opening || 'Center Open';

      const treatmentType = qItem.description || matchingRow?.particular || matchingRow?.windowType || 'Main Curtain';
      const qtyMtrs = qItem.qty !== undefined && qItem.qty !== null && qItem.qty !== '' ? qItem.qty : '';

      return {
        id: qItem.id || `item-${roomIdx + 1}-${itemIdx + 1}`,
        srNo: itemIdx + 1,
        look: '',
        type: treatmentType,
        windowWidth,
        windowHeight,
        pelmetWidth,
        pelmetDrop,
        pelmetReturn,
        catalogueImages: [],
        design: 'Ready',
        brand,
        fabricName,
        fabricWidth: '',
        repeatV: '',
        repeatH: '',
        fullness,
        qtyMtrs,
        stitchingStyle,
        parts,
        opening,
        readyWidth: '',
        readyHeight: '',
        liningType: '',
        liningQty: '',
        tieback: '',
        position: '',
        electricalPoint: '',
        installationType: '',
      };
    });

    // If quotation room has no items, supply one clean treatment row
    const itemsList = mappedItems.length > 0 ? mappedItems : [
      {
        id: `item-${roomIdx + 1}-1`,
        srNo: 1,
        look: '',
        type: 'Main Curtain',
        windowWidth: '',
        windowHeight: '',
        pelmetWidth: '',
        pelmetDrop: '',
        pelmetReturn: '',
        catalogueImages: [],
        design: 'Ready',
        brand: '',
        fabricName: '',
        fabricWidth: '',
        repeatV: '',
        repeatH: '',
        fullness: 2.5,
        qtyMtrs: '',
        stitchingStyle: 'Ripple',
        parts: 1,
        opening: 'Center Open',
        readyWidth: '',
        readyHeight: '',
        liningType: '',
        liningQty: '',
        tieback: '',
        position: '',
        electricalPoint: '',
        installationType: '',
      }
    ];

    return {
      id: qRoom.id || `room-${roomIdx + 1}`,
      sheetName: qRoomName,
      roomTitle: qRoomName,
      sheetNo: roomIdx + 1,
      clientName,
      architect,
      siteIncharge,
      notes: [],
      items: itemsList,
    };
  });
};

