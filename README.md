# Embellish ERP — Custom Home Decor & Curtain Operations Spine

**Embellish ERP** is an end-to-end enterprise resource planning (ERP) system designed specifically for custom home decor, luxury curtains, and interior soft-furnishings operations. It unifies lead generation, client communication, site measurement, BOQ estimation, automated workflow approval, production tracking, quality control, dispatch, installation, and payment tracking into a single streamlined platform.

---

## 📌 Business Overview & Core Objective

In traditional luxury curtain and furnishing management, operations often rely on fragmented channels (WhatsApp messages, Excel sheets, manual phone calls, and offline notes). Embellish ERP digitizes and structures the entire operational spine:

- **Single Source of Truth**: Eliminates manual communication errors and lost order details.
- **Strict Stage Gates (Green/Amber/Red Model)**: Prevents orders from moving to production until critical prerequisites (Site Measurement, Approved Drawings, Token Payment, Design Confirmation) are verified.
- **Window vs. Ready Size Accuracy**: Tracks exact window dimensions alongside tailored ready-curtain sizes (floor touch, header allowances) to eliminate costly factory re-works.
- **Audit Trails & Ownership**: Assigns explicit accountability across all business micro-stages.

---

## 🔄 End-to-End Operational Workflow

```text
[ Lead Received ] ➡️ [ DCM Client Meeting ] ➡️ [ Site Visit & Measurement ]
                                                            │
[ Order Activated ] ◄── [ Token Payment & Approval ] ◄── [ BOQ & Proposal ]
         │
         ▼
[ CorelDraw Drawing ] ➡️ [ Procurement & Stock ] ➡️ [ Factory Production ]
                                                              │
[ Project Closed ] ◄── [ Installation & Sign-off ] ◄── [ QC & Room Packing ]
```

### Key Stages Summary:
1. **Lead & CRM**: Capture client, architect/designer info, budget, and assign Design & Client Manager (DCM).
2. **Site Visit & Measurement**: Record site dimensions, room tags, photos/videos, and ready-to-stitch dimensions.
3. **BOQ & Quotation**: Automated fabric/motor quantity calculation and quotation generation with tier-based discount approvals.
4. **Token & Order Activation**: Require initial deposit before unlocking production pipelines.
5. **Drawing & Specs**: Upload precision CorelDraw/CAD technical drawings for factory execution.
6. **Procurement & Inventory**: Track material requisitions, vendor POs, stock receiving, and shortages.
7. **Production & QC**: Stage-by-stage factory tracking (Cutting ➡️ Embroidery ➡️ Stitching ➡️ QC Inspection).
8. **Packing & Dispatch**: Room-by-room bundled packaging (Curtains, Tiebacks, Motors, Remotes).
9. **Final Payment & Installation**: Ensure balance clearance prior to installation dispatch and client sign-off.
10. **Rework & Closure**: Formalized ticket management for post-installation adjustments and project sign-off.

---

## 🛠️ Technology Stack

### Frontend (`/client`)
- **Core Framework**: React 18 with Vite
- **State Management**: Redux Toolkit & React Context API
- **Styling & UI**: TailwindCSS, Lucide React Icons, Clsx, Tailwind Merge
- **Forms & Validation**: React Hook Form with Zod schema validation
- **Data Tables**: TanStack React Table
- **HTTP Client**: Axios

### Backend (`/server`)
- **Runtime & Server**: Node.js & Express.js (ES Modules)
- **Database**: MongoDB with Mongoose ODM (supports local MongoDB or embedded `mongodb-memory-server`)
- **Authentication**: JWT (JSON Web Tokens) & Bcrypt password hashing
- **File Storage**: Multer (Local disk upload) & AWS S3 integration
- **Documentation & Logging**: Swagger UI Express (`swagger-jsdoc`), Winston, Morgan
- **Security**: Helmet, CORS

---

## 📁 Repository Structure

```text
Embellish/
├── Overview.md              # Detailed business flow & FRD specification
├── docs/                    # Architectural documents, sheets & FRD PDF
├── embellish_erp.users.json # Seed data / exported user database schema
├── client/                  # React + Vite Frontend Application
│   ├── src/
│   │   ├── api/             # API client instances & Axios interceptors
│   │   ├── app/             # Application config & entry
│   │   ├── components/      # Reusable UI components (Tables, Modals, Inputs)
│   │   ├── features/        # Feature-specific components & slices
│   │   ├── layouts/         # App layouts (Sidebar, Header, Dashboard Wrapper)
│   │   ├── pages/           # Page modules (CRM, Sales, Projects, Accounts, Settings)
│   │   ├── routes/          # React Router route definitions
│   │   └── store/           # Redux Toolkit store setup
│   ├── package.json
│   └── vite.config.js
└── server/                  # Node.js + Express Backend API
    ├── src/
    │   ├── config/          # Database & AWS S3 configurations
    │   ├── middlewares/     # Auth, error handling, validation middlewares
    │   ├── modules/         # Business domain modules (crm, project, sales, inventory, etc.)
    │   ├── routes/          # Express route aggregation
    │   ├── seeds/           # Database seed scripts
    │   └── server.js        # Server bootstrap entry point
    ├── .env.example
    └── package.json
```

---

## ⚡ Getting Started & Setup Guide

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **MongoDB**: Local MongoDB instance (e.g., `mongodb://localhost:27017`) or enabled `USE_MEMORY_DB=true`

---

### 1. Environment Configuration

Navigate to the `server/` directory and create `.env` based on `.env.example`:

```bash
cd server
cp .env.example .env
```

Key environment parameters:
- `PORT`: Server port (default `5000`)
- `MONGODB_URI`: MongoDB connection string
- `USE_MEMORY_DB`: Set to `true` if running without a standalone local MongoDB service
- `JWT_SECRET`: Secret key for session tokens

---

### 2. Backend Installation & Startup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend server runs on `http://localhost:5000`.

---

### 3. Frontend Installation & Startup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The client web interface runs on `http://localhost:5173`.

---

## 📜 Available NPM Scripts

### Backend (`server/`)
- `npm run dev`: Starts Express server in dev mode with Nodemon auto-reloading.
- `npm start`: Starts production Node server.
- `npm run seed:consumption`: Runs database seeding script for material consumption testing.
- `npm run build`: Installs all dependencies and builds client bundle for deployment.

### Frontend (`client/`)
- `npm run dev`: Launches Vite development server.
- `npm run build`: Bundles assets for production deployment.
- `npm run preview`: Previews compiled build locally.
- `npm run lint`: Performs ESLint check.

---

## 👥 User Roles & Access Matrix

| Role | Operational Scope |
| :--- | :--- |
| **Founder / Admin** | Full platform access, financial oversight, discount approvals (>10%), system configuration. |
| **DCM (Design & Client Manager)** | CRM management, client meetings, proposal creation, quotation generation. |
| **Site Manager / Measurement Tech** | Site visits, room measurements, ready size recording, video/photo uploads. |
| **Designer / CAD Tech** | Technical drawing generation, CorelDraw specifications. |
| **Procurement & Inventory Manager** | Material POs, stock allocation, supplier management. |
| **Factory Supervisor & Tailors** | Stage-by-stage manufacturing execution (Cutting, Stitching, Embroidery). |
| **QC Inspector** | Quality audits, defect tagging, rework approvals. |
| **Installation Team** | On-site fitting, client sign-off, photo verification. |

---

## 📄 License & Maintainers

Maintained for **Embellish Home ERP**. Proprietary software — all rights reserved.
