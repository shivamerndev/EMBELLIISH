# EMBELLIISH HOME ERP

> **End-to-End Enterprise Resource Planning for Luxury Curtains & Interior Soft Furnishings.**

Embelliish Home ERP is a specialized, production-ready enterprise management platform designed to digitize and automate the entire operational lifecycle of luxury curtain and soft furnishing projects — from initial lead capture, architect coordination, site measurements, BOQ estimation, and design approval to procurement, factory stitching, quality control (QC), multi-stage payments, site installation, and rework management.

---

## 📋 Table of Contents

- [Overview & Purpose](#-overview--purpose)
- [Key Business Modules](#-key-business-modules)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [End-to-End Operational Workflow](#-end-to-end-operational-workflow)
- [Technology Stack](#-technology-stack)
- [Directory Structure](#-directory-structure)
- [Environment & Configuration](#-environment--configuration)
- [Getting Started & Installation](#-getting-started--installation)
- [Demo Credentials](#-demo-credentials)
- [API Architecture & Endpoints](#-api-architecture--endpoints)
- [Documentation & Resources](#-documentation--resources)

---

## 🎯 Overview & Purpose

Traditional interior soft furnishing businesses rely heavily on fragmented tools like WhatsApp messages, Excel sheets, phone calls, and manual tracking. This leads to critical operational failures such as incorrect curtain ready-sizes, unapproved discounts, production before payment confirmation, and uncoordinated installations.

**Embelliish Home ERP solves these challenges by enforcing a strict Gated Business Process (Green-Amber-Red Model):**

1. **Window Size vs. Ready Size Separation**: Prevents incorrect floor-drop and header calculations by maintaining explicit fields for raw window dimensions and tailored ready sizes.
2. **Order Activation Gates**: Production cannot start until measurement, drawing, token payment, and design approvals are all marked green.
3. **QC & Rework Accountability**: No curtain package moves to dispatch without passing QC checks; room-wise packing ensures zero missing parts on site.
4. **Audit Trail & Governance**: Dynamic Founder discount approvals for discounts exceeding company thresholds.

---

## 🧩 Key Business Modules

The system organizes **42 business stages into 10 major operational modules**:

1. **Identity & Auth (`/api/v1/auth`, `/api/v1/users`, `/api/v1/members`)**
   - JWT authentication, password hashing, user registration, role assignment, and active session management.
2. **CRM & Lead Management (`/api/v1/crm/*`)**
   - Track leads, clients, architects, DCM (Design & Client Manager) assignments, meeting logs, follow-ups, and sales proposals.
3. **Project & Site Engineering (`/api/v1/project/*`)**
   - Site visit scheduling, room layout definition, photo/video site measurement upload, BOQ (Bill of Quantities) generation, CAD drawings, design sign-offs, installations, and snag tracking.
4. **Inventory & Procurement (`/api/v1/inventory/*`)**
   - Catalogue fabrics, motors, track hardware, accessories, vendor purchase orders, stock levels, and consumption calculations.
5. **Production & Manufacturing (`/api/v1/production/*`)**
   - Work order generation, factory stage tracking (Cutting, Embroidery, Stitching), Quality Control (QC) pass/fail logs, and room-wise unit packing.
6. **Financials & Accounts (`/api/v1/accounts/*`)**
   - Token & stage payment tracking, tax invoices (GST), transaction history, and payment schedule verification.
7. **Pricing Engine (`/api/v1/pricing`)**
   - Centralized rate cards, hardware pricing, motor add-ons, and dynamic price calculation for BOQs and quotations.
8. **Reports & Analytics (`/api/v1/reports`)**
   - Financial summaries, stage bottleneck reports, lead conversion analytics, and production output tracking.
9. **Notifications (`/api/v1/notifications`)**
   - In-app alerts and workflow notifications triggered by stage transitions or pending approvals.
10. **System Settings (`/api/v1/settings`)**
    - Dynamic company configuration, tax rates (GST %), payment schedule thresholds, discount limits, and consumption defaults.

---

## 👥 Role-Based Access Control (RBAC)

The system supports **12 fine-grained organizational roles** across departments:

| Role | Code | Primary Department | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **System Admin** | `ADMIN` | Management | System configuration, user management, full access |
| **Senior DCM** | `SENIOR_DCM` | Sales | Sales pipeline oversight, DCM team management |
| **Design & Client Manager** | `DCM` | Sales | Lead nurturing, site meetings, BOQ presentation, token collection |
| **Project Coordinator** | `PROJECT_COORDINATOR` | Projects | Cross-department workflow coordination and tracking |
| **Designer** | `DESIGNER` | Design | CorelDraw / CAD curtain drawings and design specs |
| **Execution Engineer** | `EXECUTION_ENGINEER` | Execution | Site measurements, site visits, technical verification |
| **Purchase Manager** | `PURCHASE_MANAGER` | Purchase | Vendor management, raw material purchase orders |
| **Store Keeper** | `STORE_KEEPER` | Stores | Material receiving, stock inward/outward registers |
| **Factory Manager** | `FACTORY_MANAGER` | Factory | Stitching queues, cutting, embroidery, workshop operations |
| **QC Inspector** | `QC_INSPECTOR` | Quality | Length, stitch, and fabric quality check pass/fail logs |
| **Installer** | `INSTALLER` | Installation | On-site curtain mounting, motor setup, photo sign-off |
| **Accountant** | `ACCOUNTANT` | Accounts | Invoicing, payment verification, financial ledgers |

---

## 🔄 End-to-End Operational Workflow

```text
Lead Capture → DCM Meeting → Site Visit → Measurement (Window vs Ready)
    ↓
BOQ Calculation → Proposal & Quotation → Discount Approval (if > 10%)
    ↓
Token Payment (10%) → Order Activation (Green Gate) → Design & Drawings
    ↓
Procurement & Stock Reserve → Factory Work Order (Cutting → Stitching)
    ↓
Quality Check (QC) → Room-Wise Packing → Final Payment (Balance)
    ↓
Site Installation → Client Digital Sign-Off → Project Closure (or Rework Ticket)
```

---

## 🛠️ Technology Stack

### Backend (`/server`)
- **Runtime**: Node.js (ES Modules, `type: "module"`)
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose ORM (supports local MongoDB or `mongodb-memory-server` for zero-install dev)
- **Security**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), Security Headers (`helmet`), CORS (`cors`)
- **Logging & Uploads**: Winston Logger (`winston`), HTTP Logger (`morgan`), File Uploads (`multer`, `@aws-sdk/client-s3`)
- **Validation**: Zod schema validation

### Frontend (`/client`)
- **Framework**: React 18, Vite
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Routing**: React Router DOM v6
- **Forms & Validation**: React Hook Form, Zod (`@hookform/resolvers`)
- **Data Tables**: TanStack Table v8 (`@tanstack/react-table`)
- **Styling & UI**: Tailwind CSS, Lucide React Icons (`lucide-react`), `clsx`, `tailwind-merge`

---

## 📁 Directory Structure

```text
Embellish/
├── Overview.md                     # Comprehensive operational spec & business blueprint
├── embellish_erp.users.json        # Pre-configured seed users & credentials
├── readme.md                       # Main application documentation
├── docs/                           # Functional specifications & reference sheets
│   ├── Embelliish_FRD_v1.0.pdf
│   ├── Embellish_Operating_Spine_Compiled.xlsx
│   └── Cunsumption_Sheet.jpeg
├── server/                         # Express Node.js Backend
│   ├── .env.example                # Sample environment file
│   ├── package.json
│   ├── uploads/                    # Local media storage (measurements, drawings, site photos)
│   └── src/
│       ├── server.js               # HTTP server entrypoint & graceful shutdown
│       ├── app.js                  # Express app setup, middleware, static route serving
│       ├── config/                 # Env parser, MongoDB & Winston logger config
│       ├── constants/              # Roles, workflow stages, product constants
│       ├── core/                   # ApiError & ApiResponse utility classes
│       ├── middlewares/            # Auth, RBAC, error handling, file upload
│       ├── modules/                # Feature modules (auth, crm, project, inventory, production, accounts, etc.)
│       ├── routes/                 # Central router mounted at /api/v1
│       └── seeds/                  # Seed scripts & data initialization
└── client/                         # React Vite Frontend
    ├── package.json
    ├── vite.config.js              # Vite server config with API proxying
    ├── index.html
    └── src/
        ├── api/                    # Axios instances & interceptors
        ├── components/             # Reusable UI components (tables, modals, inputs)
        ├── features/               # Feature-specific components & slices
        ├── pages/                  # Route views (Dashboard, Leads, Projects, Production, etc.)
        ├── store/                  # Redux Toolkit store definition
        └── styles/                 # Tailwind CSS styles & design tokens
```

---

## ⚙️ Environment & Configuration

Create a `.env` file in the `server/` directory based on [`server/.env.example`](file:///c:/Users/91995/Desktop/D-table_analytic/Embellish/server/.env.example):

```env
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/embellish_erp

# Set true for in-memory MongoDB (no local MongoDB installation required for dev)
USE_MEMORY_DB=false

# Authentication
JWT_SECRET=your_super_secret_jwt_key_embellish_erp_2026
JWT_EXPIRES_IN=7d

# S3 File Storage (Optional: defaults to server/uploads on local disk if omitted)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=embellish-uploads

# Client Origin
CLIENT_URL=http://localhost:5173
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- **Node.js**: v18+ recommended
- **npm**: v9+
- **MongoDB**: Local MongoDB instance OR set `USE_MEMORY_DB=true` in `server/.env`.

### 1. Repository Setup
```bash
git clone <repository-url>
cd Embellish
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```

### 4. Running Development Mode

Start the Backend API Server (Port `5000`):
```bash
cd server
npm run dev
```

Start the Frontend Dev Server (Port `5173`):
```bash
cd client
npm run dev
```

> The Vite dev server automatically proxies `/api` and `/uploads` requests to `http://localhost:5000`.

---

## 🔐 Demo Credentials

The database comes pre-seeded with sample users for every operational role (passwords default to `password123` in dev seeds):

| Role | Email | Department |
| :--- | :--- | :--- |
| **Admin** | `admin@embellish.com` | Management |
| **Senior DCM** | `senior.dcm@embellish.com` | Sales |
| **DCM** | `rahul@embellish.com` | Sales |
| **Project Coordinator** | `coordinator@embellish.com` | Projects |
| **Designer** | `designer@embellish.com` | Design |
| **Execution Engineer** | `execution@embellish.com` | Execution |
| **Purchase Manager** | `purchase@embellish.com` | Purchase |
| **Store Keeper** | `stores@embellish.com` | Stores |
| **Factory Manager** | `factory@embellish.com` | Factory |
| **QC Inspector** | `qc@embellish.com` | Quality |
| **Installer** | `installer@embellish.com` | Installation |
| **Accountant** | `accounts@embellish.com` | Accounts |

---

## 📡 API Architecture & Endpoints

All API endpoints are prefixed with `/api/v1`.

### Key Routes Overview

- **`GET /api/health`**: Service health check & MongoDB status.
- **`GET /api/v1/meta`**: System-wide metadata (workflow stages, roles, permissions, tax settings, rate cards).
- **`POST /api/v1/auth/login`**: User authentication & JWT issuance.
- **`POST /api/v1/auth/register`**: User creation.
- **`GET /api/v1/crm/leads`**: List and create leads.
- **`GET /api/v1/project/projects`**: Project status, room lists, and stage tracking.
- **`POST /api/v1/project/measurements`**: Submit site window & ready measurements.
- **`POST /api/v1/project/boqs`**: Calculate fabric, motor & accessory quantities.
- **`GET /api/v1/production/orders`**: Factory stitching & production stage management.
- **`POST /api/v1/production/qc`**: Quality check inspection logs.
- **`POST /api/v1/accounts/payments`**: Record token and milestone payments.

---

## 📑 Documentation & Resources

- [`Overview.md`](file:///c:/Users/91995/Desktop/D-table_analytic/Embellish/Overview.md): Deep-dive functional walkthrough & real-life step-by-step example.
- [`docs/Embelliish_FRD_v1.0.pdf`](file:///c:/Users/91995/Desktop/D-table_analytic/Embellish/docs/Embelliish_FRD_v1.0.pdf): Functional Requirements Document v1.0.
- [`server/.env.example`](file:///c:/Users/91995/Desktop/D-table_analytic/Embellish/server/.env.example): Complete configuration template.

---

*Embelliish Home ERP — Precision, Quality, and Automation for Interior Furnishings.*
