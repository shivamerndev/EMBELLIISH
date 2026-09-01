# EMBELLIISH HOME ERP — COMPLETE CLIENT USER GUIDE

> **End-to-End Non-Technical Operational Manual & SOP for Luxury Curtains & Interior Soft Furnishings**

---

## 1. Introduction

### What is Embelliish Home ERP?
**Embelliish Home ERP** is a specialized enterprise management platform designed specifically for luxury curtain, blind, and soft furnishing businesses. It digitizes and manages the complete lifecycle of a client project—from the moment a customer enquiry arrives, through site measurements, fabric calculation, commercial proposals, factory production, quality control, installation, and final payment collection.

### Why Use Embelliish ERP?
Before Embelliish ERP, luxury curtain operations relied on fragmented WhatsApp messages, Excel spreadsheets, phone calls, and memory. This created costly errors such as stitching curtains to unverified dimensions, sending installers to site without motor remotes, or starting factory production before receiving client advance payments.

Embelliish ERP replaces manual chaos with a **single, unified system** where every team member—from the Founder to the DCM, Execution Engineer, Factory Manager, and Accountant—works on the exact same project record.

### The Golden Operational Rules
Embelliish ERP enforces four non-negotiable operational rules:
1. **Window Size vs. Ready Size Separation**: Physical window opening dimensions (raw sizes) and tailored curtain dimensions (Ready Sizes including floor touch deductions, header margins, and track clearance) are tracked in separate fields. Fabric is NEVER cut against raw window dimensions.
2. **Ready Size Confirmation Lock**: Factory stitching cannot begin until Ready Sizes are explicitly locked and confirmed by the client and DCM.
3. **The Gated Green-Amber-Red Activation Model**: Production cannot begin until 4 operational gates are Green:
   - ✅ Site Measurement Completed & Locked
   - ✅ CAD / CorelDraw Technical Drawing Approved
   - ✅ 10% Token + 60% Advance Payment Settled
   - ✅ Client Design & Fabric Sign-Off Completed
4. **Discount Governance Threshold**: Any DCM discount exceeding company limit (e.g. > 10%) automatically triggers a Founder Approval request.
5. **Zero-Balance Installation Gate**: Products cannot be dispatched or installed on-site until the remaining 30% balance payment is cleared by Accounts.

---

## 2. Getting Started

### System Requirements
- **Supported Devices**: Desktop computers, laptops, iPads, tablets, and mobile smartphones.
- **Web Browser**: Google Chrome, Apple Safari, Microsoft Edge, or Mozilla Firefox (latest versions recommended).
- **Internet Connection**: Standard broadband or 4G/5G mobile connection.

### How to Access the ERP
1. Open your web browser.
2. Navigate to your company's ERP URL (e.g., `https://erp.embellishhomes.com` or local portal address).
3. The system will automatically display the **Login & Authentication Screen**.

---

## 3. Login & Account Management (`/auth/login`)

[SCREENSHOT: Login & Authentication Screen]

### Screen Purpose
The Login screen ensures secure portal access for authorized team members. Based on your user account, the ERP automatically adjusts your dashboard, permissions, and visible menu items.

### What You See
- **Embelliish Home Logo**: Located at the top of the login card.
- **Email Field**: Text input where you type your registered work email address.
- **Password Field**: Masked input where you type your password.
- **Sign In Button**: Primary action button to authenticate your login.
- **Error Notification Banner**: Red banner that appears if email/password credentials are incorrect.
- **Seeded Demo Accounts**: Quick-fill account list for quick access during training.

### Buttons & Interactive Controls

| Button Name | What It Does | When to Use It | What Happens Next | Important Checks |
| :--- | :--- | :--- | :--- | :--- |
| **Sign in** | Validates your login email and password. | Click after typing your credentials to log in. | The system verifies your details and opens your personal Executive Dashboard. | Ensure email address is formatted correctly (e.g., `name@embellish.com`). |
| **Eye Icon (Password Toggle)** | Toggles password visibility between hidden dots (`••••••••`) and readable text. | Use if you want to verify your password before clicking Sign in. | Password text becomes visible or hidden. | Ensure nobody around you is looking at your screen when password is displayed. |
| **Seeded Demo Account Buttons** | One-click button that pre-fills demo account credentials (e.g., `Hitesh — Admin`, `Rahul — DCM`, `Ankit — Coordinator`). | Use during training or role testing. | Email and password fields auto-populate instantly. | Click **Sign in** after selecting a demo account. |

### Form Fields & Inputs

| Field Name | What It Means | What to Enter | Required? | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Email** | Your official staff email address. | Enter your registered email address. | **Yes** | `rahul@embellish.com` |
| **Password** | Secure account password. | Enter your account password. | **Yes** | `••••••••` |

### Validation & Error Handling
- **Missing Email / Password**: If you click **Sign in** without entering credentials, the browser highlights the missing field in red.
- **Incorrect Credentials**: A red error banner appears at the top of the form stating *"Invalid email or password"*. Check for typos and try again.

---

## 4. ERP Navigation & System Architecture

[SCREENSHOT: Main Navigation Sidebar & Header]

### Left Sidebar Navigation
The left sidebar contains the main navigation items. Menu items adapt dynamically based on your logged-in role permissions.

- **Dashboard** (`/dashboard`): Executive overview of active leads, bottlenecks, and KPIs.
- **CRM** (`/crm`):
  - **Leads**: Master database of enquiries (`/crm/leads`).
  - **DCM Assignment**: Allocates leads to Design & Client Managers (`/crm/dcm-assignments`).
  - **Qualification**: Requirement, budget, and timeline verification (`/crm/qualification`).
  - **Follow Ups**: Scheduled call-backs, reminders, and meetings (`/crm/follow-ups`).
  - **Sales and Commercials**: 12-stage commercial pipeline (`/crm/sales-commercials`).
- **Members** (`/members`): Team member management, roles, and workload capacity.
- **Settings** (`/settings`): Administrative configuration, discount thresholds, rate cards.

### Header Top Bar
- **Sidebar Collapse Button (`<`)**: Toggles sidebar between expanded and collapsed view.
- **Search Bar**: Quick-search leads, clients, or projects by name or code.
- **Notification Bell (🔔)**: Displays real-time alerts for overdue follow-ups, low inventory stock, open snags, and pending discount approvals.
- **Theme Switcher (☀️ / 🌙)**: Toggles interface between Light Mode and Dark Mode.
- **User Profile Pill**: Displays current user's name and role badge with Logout option.

---

## 5. Executive Dashboard (`/dashboard`)

[SCREENSHOT: Executive Dashboard]

### Purpose
The Executive Dashboard provides an instant, real-time command center for management and staff. It brings together active leads, overdue actions, revenue pipeline, project stages across the spine, and factory floor status.

### What You See
- **KPI Summary Cards**: 8 metric cards displaying key business numbers.
- **Alert Banner**: Highlights urgent items requiring immediate action (overdue follow-ups, open snags, low stock items below reorder level).
- **Projects Across the Spine Bar Chart**: Visual horizontal chart showing active projects at each stage.
- **Lead Pipeline Bar Chart**: Visual horizontal chart showing leads by status.
- **Recent Activities Timeline**: Chronological feed of recent CRM follow-ups and events.
- **Factory Floor Summary**: 8-stage workshop card showing work orders currently in production.

### KPI Metric Cards Explained

| Metric Card | Simple Business Meaning | What Clicking It Does |
| :--- | :--- | :--- |
| **Total Leads** | Total number of enquiries captured in the system. | Opens All Leads list (`/crm/leads`). |
| **Follow-up Today** | Total calls and meetings scheduled for today. | Opens Follow-Ups list (`/crm/follow-ups`). |
| **Overdue Actions** | Follow-up activities past their due date without completion. | Opens Overdue Follow-ups queue (`/crm/follow-ups?tab=OVERDUE`). |
| **Meeting Today** | Studio meetings and site visit appointments scheduled today. | Opens today's meeting list. |
| **Pending Quotations** | Quotations currently in draft or waiting for approval. | Opens Quotations view (`/crm/sales-commercials/quotation`). |
| **Won Projects** | Total lead accounts successfully converted to active projects. | Opens Converted Leads view (`/crm/leads?tab=CONVERTED`). |
| **Lost Projects** | Leads marked as unqualified or lost to competitors. | Opens Lost Leads view (`/crm/leads?tab=LOST`). |
| **Revenue Pipeline** | Total estimated currency value of all open projects in ₹. | Displays revenue pipeline breakdown. |

---

## 6. CRM & Pipeline Management

---

### 6.1 CRM Overview
The CRM module manages customer relationships from initial contact until lead qualification. It ensures no lead is lost, forgotten, or left unassigned.

---

### 6.2 Capture New Lead (`/crm/leads` → Modal)

[SCREENSHOT: Capture New Lead Modal]

#### Screen Purpose
Used by front desk staff, Senior DCMs, or Admins to enter a new client enquiry into the system.

#### What You See
A modal form titled **"Capture New Lead — Step 1 Lead Capture sheet entry form"** with fields organized in 2-column rows, an architect selector, budget classification options, requirement notes, and a file/image attachment area.

#### Form Fields & Table

| Field | What it means | What to enter | Required? | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Client Name** | Full name of the customer or client organization. | Enter client's full name. | **Yes** | `D-table Analytics` / `Rahul Sharma` |
| **Contact Person** | Name of the primary point of contact. | Enter contact person's name. | **Yes** | `Sakshi` |
| **Mobile Number** | Primary phone number for call/WhatsApp. | Enter 10-digit mobile number. | **Yes** | `9876543210` |
| **Email** | Client's email address for proposals/quotes. | Enter valid email address. | No | `client@example.com` |
| **Lead Source** | How the customer found Embelliish. | Select source from dropdown. | No | `Architect Referral` |
| **Architect / Designer Name** | Architect or Interior Designer associated with client. | Select existing architect or click `+ Add New Member`. | No | `Studio Design / John Doe` |
| **Indicative Budget** | Estimated client budget in Rupees. | Enter budget amount in ₹. | No | `₹2,50,000` |
| **Budget Classification** | Priority category based on budget value. | Select A, B, C, or D from dropdown. | No | `A (High Priority/Budget)` |
| **Project Location** | City or area where site is located. | Enter city/location. | No | `Mumbai / Aurangabad / Pune` |
| **Previous Client Relationship** | Whether client has purchased before. | Select `No` or `Yes`. | No | `No` |
| **Existing Relationship Owner** | Staff member who knows the client. | Enter staff name or `NA`. | No | `Sakshi` / `NA` |
| **Architect / Designer Involved** | Whether an architect is managing the project. | Select `Yes`, `No`, or `Not Known`. | No | `Yes` |
| **Requirement Summary** | Notes on what client needs. | Enter product scope (e.g., Living room sheer, Master bed blackout). | No | `As per floorplan PDF attached` |
| **Multiple Images & Documents** | Site drawings, floorplans, reference photos. | Click to upload JPG, PNG, PDF, DOCX, XLSX files. | No | `living_room_plan.pdf` |

#### Dropdown Options & Meanings

##### 1. Lead Source
- **Architect Referral**: Lead provided by an architect or interior designer.
- **Direct Client**: Walk-in client or direct inquiry.
- **Existing Client**: Repeat customer.
- **Social Media**: Inquiry from Instagram, Facebook, or Website.
- **Other Referral**: Lead referred by friends or contractors.

##### 2. Budget Classification
- **A (High Priority/Budget)**: Budget > ₹5,00,000 (Luxury high-value project).
- **B (Medium-High)**: Budget ₹2,50,000 – ₹5,00,000.
- **C (Standard)**: Budget ₹1,00,000 – ₹2,50,000.
- **D (Basic)**: Budget < ₹1,00,000.

##### 3. Architect / Designer Involved
- **Yes**: Architect is actively guiding the client.
- **No**: Client is making decisions independently.
- **Not Known**: Pending verification during qualification call.

#### Searchable Architect Select & Add Architect Modal
- Typing in the **Architect / Designer Name** field filters existing architects by name, firm, or phone.
- If the architect is not listed, click **`+ Add New Member`** inside the dropdown.
- An **Add New Architect Modal** opens asking for:
  - `Architect Name` (Required)
  - `Firm Name`
  - `Mobile Number`
  - `Email`
- Click **`Save Member`**. The architect is saved and auto-selected in the lead form!

#### Buttons & Interactive Controls

| Button Name | What It Does | When to Use It | What Happens Next | Important Checks |
| :--- | :--- | :--- | :--- | :--- |
| **`+ Add Lead`** | Opens the Capture New Lead Modal form. | Click on the Leads page whenever a new enquiry arrives. | The New Lead form opens. | Verify lead is not already entered by searching mobile number first. |
| **`Save Lead Record`** | Submits and saves the new lead into the system. | Click after filling required fields (Client Name, Contact Person, Mobile). | System generates a unique Lead Code (e.g. `LD/045`) and displays lead in New queue. | Ensure mobile number and client name are accurate. |
| **`Cancel`** | Closes the modal without saving. | Click if you want to discard the entry. | Modal closes; no data is saved. | Unsaved input will be lost. |
| **`Click to Upload Multiple Images or Documents`** | Opens browser file chooser to attach files. | Use to attach floorplans, interior drawings, or site photos. | Selected files upload automatically and show preview pills. | Supported formats: JPG, PNG, WEBP, PDF, DOCX, XLSX. Max file size: 10MB per file. |

#### Validation & Error Handling
- **Missing Required Fields**: If Client Name, Contact Person, or Mobile Number is empty, clicking `Save Lead Record` shows red validation messages under missing fields.
- **Invalid Mobile Number**: Must contain a valid 10-digit number.
- **Upload Error**: If a file exceeds size limit or format is unsupported, a red notification states *"Failed to upload document/image"*.

---

### 6.3 All Leads Master Table (`/crm/leads`)

[SCREENSHOT: Leads Master Table]

#### Screen Purpose
Central management table displaying all lead records with search, filter tabs, and quick actions.

#### What You See
- **Status Filter Tabs**: `All Leads`, `New`, `Contacted`, `Qualified`, `Converted`, `Lost`.
- **Search Bar**: Real-time search by Client Name, Phone, Email, Location, Architect, or Lead Code.
- **Leads Table Columns**: Lead Code, Client Name, Contact Person, Mobile, Location, Source, Architect Name, Budget Class (`A`/`B`/`C`/`D`), Previous Relation (`Yes`/`No`), Architect Involved (`Yes`/`No`/`Not Known`), Status Badge, Table Actions.

#### Table Action Icons & Buttons

| Icon / Button | What It Does | When to Use It | What Happens Next |
| :--- | :--- | :--- | :--- |
| **Eye Icon (👁️)** | Opens complete **Lead Details Drawer / Modal**. | Click to inspect full lead history, attachments, follow-ups, and progress. | Opens full profile overlay showing complete history timeline and file downloads. |
| **Pencil Icon (✏️)** | Opens **Edit Lead Modal**. | Click to update contact details, budget, or notes. | Edit form opens with pre-filled lead data. Click `Save Changes` to update. |
| **User Check Icon (👤✓)** | Opens **DCM Allocation Popup**. | Click to assign lead to a Design & Client Manager. | Redirects to `/crm/dcm-assignments` with lead pre-selected. |
| **Trash Icon (🗑️)** | Deletes lead record (Admin only). | Click if lead was entered by mistake. | Shows confirmation dialog *"Are you sure you want to delete lead LD/xxx?"*. |

---

### 6.4 DCM Assignment (`/crm/dcm-assignments`)

[SCREENSHOT: DCM Assignment Screen]

#### Purpose
Allocates qualified leads to Design & Client Managers (DCMs) based on capacity, territory, and expertise.

#### What You See
- **Assignment Tabs**: `All Assignments`, `High Priority`, `Reassignment Needed`, `Overloaded`.
- **DCM Capacity Badges**:
  - `Available` (Green badge): DCM has 5 or fewer active projects.
  - `Overloaded` (Red pulsing badge): DCM has 6 or more active projects.
- **DCM Active Project Count**: System automatically calculates live active projects per DCM.

#### Fields & Table

| Field | What it means | What to enter / select | Required? | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Assigned DCM Name** | DCM staff member responsible for lead. | Select DCM from available dropdown list. | **Yes** | `Hitesh Sharma` / `Rahul Verma` |
| **Assignment Due Date** | Date by which DCM must contact client. | Pick target date. | **Yes** | `2026-08-30` |
| **Priority** | Urgency of assignment. | Select `HIGH`, `MEDIUM`, or `LOW`. | **Yes** | `HIGH` |
| **Assignment Date & Time** | Timestamp of allocation. | Auto-filled or pick date-time. | No | `28/08/2026 14:00` |
| **Reassignment Required** | Whether lead needs to be moved to another DCM. | Select `NO` or `YES`. | **Yes** | `YES` |
| **Reassigned To Name** *(Conditional)* | New DCM taking over project. | Select replacement DCM. | **Mandatory if Reassignment = YES** | `Punam K` |
| **Reassignment Reason** *(Conditional)* | Business reason for reallocating lead. | Enter explanation (e.g. Overload, leave, territory change). | **Mandatory if Reassignment = YES** | `High workload allocation` |

#### Conditional Field Rules
- **IF** `Reassignment Required` is set to **`YES`**:
  - `Reassigned To Name` dropdown appears and becomes **Mandatory**.
  - `Reassignment Reason` text field appears and becomes **Mandatory**.
- **IF** `Reassignment Required` is set to **`NO`**:
  - Reassignment fields remain hidden.

#### System Automated Behavior
- **Automatic Capacity Tracking**: The ERP continuously monitors each DCM's active project workload. If active projects > 5, capacity status automatically switches to `OVERLOADED`.
- **Automatic Audit Trail**: The system records the timestamp and name of the user who performed the assignment (`Updated User`).

---

### 6.5 Qualification & Discovery (`/crm/qualification`)

[SCREENSHOT: Lead Qualification Screen]

#### Purpose
DCM conducts discovery calls to verify requirement scope, budget match, client timeline, and decision-maker availability before advancing the lead to commercial proposals.

#### What You See
- **Qualification Tabs**: `All Leads`, `Pending Decision`, `Approved`, `Rejected`, `Not Decided`.
- **Tri-State Verification Badges**: Badges showing `Yes` (Green), `No` (Red), `Pending` (Amber), `Not Known` (Blue).
- **Delay Badges**: Indicates if qualification is past due date.

#### Qualification Form Fields

| Field | What it means | What to select | Required? | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Qualification Due Date** | Target completion date for discovery. | Pick date. | **Yes** | `2026-08-30` |
| **Requirement Verified** | Scope of curtains/blinds confirmed with client. | Select `YES`, `NO`, or `PENDING`. | **Yes** | `YES` |
| **Budget / Pricing Verified** | Client budget matches Embelliish pricing. | Select `YES`, `NO`, or `PENDING`. | **Yes** | `YES` |
| **Timeline Confirmed** | Site completion timeline is feasible. | Select `YES`, `NO`, or `PENDING`. | **Yes** | `YES` |
| **Decision Maker Identified** | Contact person has purchasing authority. | Select `YES`, `NO`, or `PENDING`. | **Yes** | `YES` |
| **Site Visit Required** | Physical measurement visit needed. | Select `YES`, `NO`, or `PENDING`. | **Yes** | `YES` |
| **Competition Details Captured** | Competitor quotes or options identified. | Select `YES`, `NO`, or `NOT_KNOWN`. | No | `NOT_KNOWN` |
| **Qualification Decision** | Final qualification outcome. | Select `APPROVED`, `REJECTED`, `PENDING`, or `NOT DECIDED`. | **Yes** | `APPROVED` |
| **Rejection / Hold Reason** *(Conditional)* | Reason why lead is rejected, delayed, or pending. | Enter detailed business reason. | **Mandatory if Decision = REJECTED, PENDING, or NOT DECIDED** | `Client budget below minimum threshold` |

#### Conditional Validation Rules
- **IF Qualification Decision is `APPROVED`**:
  - `Rejection / Hold Reason` is optional.
  - Clicking **`Save Qualification`** sets Lead Status to **`QUALIFIED`** and unlocks the Sales & Commercials pipeline.
- **IF Qualification Decision is `REJECTED`**:
  - `Rejection / Hold Reason` is **MANDATORY**.
  - Clicking **`Save Qualification`** sets Lead Status to **`UNQUALIFIED`** and registers the lost reason.
- **IF Qualification Decision is `PENDING` or `NOT DECIDED`**:
  - `Rejection / Hold Reason` is **MANDATORY**.
  - Clicking **`Save Qualification`** keeps Lead Status as **`CONTACTED`** and logs hold notes.

---

### 6.6 Follow-Ups & Scheduling (`/crm/follow-ups`)

[SCREENSHOT: Follow-ups Screen]

#### Purpose
Manages scheduled client calls, meetings, reminders, and site visit follow-ups.

#### Functional Buttons
- **`+ Schedule Follow-up`**: Opens modal to schedule date, time, reminder type (Call, Email, Meeting, Site Visit), and notes.
- **`Mark Complete` Checkbox**: Logs completion timestamp and notes.
- **`Reschedule` Button**: Quick date-picker to push follow-up date forward.
- **Tab Filters**: `All Follow-ups`, `Scheduled`, `Completed`, `Overdue`.

---

## 7. Sales & Commercials Pipeline (12 Stages)

---

### Overview of Commercial Pipeline
Once a lead is **QUALIFIED**, it enters the 12-stage Sales & Commercials pipeline (`/crm/sales-commercials`). This pipeline guides the project through site measurements, BOQ estimation, proposals, token collection, founder approval, quotations, client sign-off, and order activation.

---

### 7.1 Stage 1 — Qualified Leads Decision Hub (`/crm/sales-commercials/leads`)
- **Purpose**: Workspace displaying all qualified leads ready for commercial progression.
- **Actions**: Click **`Proceed to Pre-Site Visit`** to move lead to Stage 2.

---

### 7.2 Stage 2 — Pre-Site Visit Planning (`/crm/sales-commercials/pre-site-visit`)
- **Purpose**: Prepare site measurement appointment before technical engineer visits client location.
- **Form Fields**:
  - `Assign Execution Engineer`: Select technical engineer from dropdown.
  - `Appointment Date & Time`: Pick scheduled appointment time.
  - `Site Readiness Checklist`: Toggle `Pelmet Ready?` (Yes/No), `Scaffolding Needed?` (Yes/No), `Automation Wiring Complete?` (Yes/No).
- **Button**: Click **`Notify Engineer & Client`** to trigger confirmation SMS/WhatsApp.

---

### 7.3 Stage 3 — Site Measurement Capture (`/crm/sales-commercials/measurement`)

[SCREENSHOT: Site Measurement Capture]

#### Purpose
Captures physical window opening dimensions and tailored ready sizes on site.

#### CRITICAL CONCEPT: Window Size vs. Ready Size Separation
Physical window openings vary due to flooring levels, pelmet heights, and ceiling drops. Therefore, Embelliish ERP strictly separates:
- **Raw Window Size**: Physical opening width and height measured on site.
- **Tailored Ready Size**: Finished curtain size calculated after applying floor drop deductions (e.g. -0.5 inch), header clearance, and track mounting margins.

#### Form Fields & Table

| Field | What it means | What to enter / select | Required? | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Room Name** | Room location in house. | Enter or select room name. | **Yes** | `Master Bedroom` / `Living Room` |
| **Window / Opening Name** | Specific window code in room. | Enter window identifier. | **Yes** | `W1 - Bay Window` |
| **Mount Type** | How track/rod will be mounted. | Select `Ceiling Mount`, `Wall Mount`, `Inside Frame`, or `Outside Frame`. | **Yes** | `Ceiling Mount` |
| **Raw Window Width** | Physical opening width in inches/feet. | Enter measured width. | **Yes** | `96 inches` (8 ft) |
| **Raw Window Height** | Physical opening height in inches/feet. | Enter measured height. | **Yes** | `120 inches` (10 ft) |
| **Floor Touch Deduction** | Height deduction for floor drop. | Enter deduction margin. | **Yes** | `-0.5 inches` |
| **Header / Track Clearance** | Deduction for track height & pelmet. | Enter clearance margin. | **Yes** | `-1.5 inches` |
| **Tailored Ready Width** | Final finished width for stitching. | System calculates or enter ready width. | **Yes** | `96 inches` |
| **Tailored Ready Height** | Final finished height for stitching. | System calculates (`120 - 0.5 - 1.5 = 118 in`). | **Yes** | `118 inches` (9.83 ft) |
| **Media Uploads** | Site window photos and video evidence. | Click to upload window photo/video. | No | `living_w1_photo.jpg` |

#### Buttons
- **`+ Add Room`**: Creates a new room section in project.
- **`+ Add Window Opening`**: Adds window entry row inside selected room.
- **`Upload Media`**: Uploads site photo or measurement video proof.
- **`Lock Measurements & Save`**: Finalizes measurement sheet and locks raw dimensions.

---

### 7.4 Stage 4 — Studio Meeting & Fabric Selection (`/crm/sales-commercials/studio-meeting`)
- **Purpose**: Client visits studio to select fabrics, linings, curtain styles (Ripplefold, Pleated, Eyelet, Roman Blinds), and motorization.
- **Button**: Click **`Log Studio Meeting Notes`** to save selections.

---

### 7.5 Stage 5 — Ready Size Confirmation (`/crm/sales-commercials/ready-size`)

[SCREENSHOT: Ready Size Confirmation]

- **Purpose**: Final verification of tailored Ready Sizes by DCM and client before fabric cutting.
- **CRITICAL GATE**: Stitching NEVER starts without Ready Size sign-off.
- **Button**: Click **`Confirm & Lock Ready Sizes`**.

---

### 7.6 Stage 6 — Consumption Sheet / BOQ Dashboard (`/crm/sales-commercials/consumption-boq`)
- **Purpose**: Automatic system calculation of material quantities (Bill of Quantities).
- **System Calculations**:
  - Fabric meters required = `(Ready Width × Fullness Ratio 2.5x / Fabric Cut Width) × Ready Height`.
  - Track length in feet = `Sum of Ready Widths`.
  - Motor quantity = Total motorized openings.
- **Button**: Click **`Generate BOQ / Consumption Sheet`**.

---

### 7.7 Stage 7 — Proposal Creation (`/crm/sales-commercials/proposal`)
- **Purpose**: Prepare room-wise visual proposal PDF with fabric pictures, track specifications, and estimated prices.
- **Buttons**: **`Generate Proposal PDF`**, **`Send Proposal to Client`**.

---

### 7.8 Stage 8 — Budgeting & Token Discussion (`/crm/sales-commercials/token-discussion`)
- **Purpose**: Discuss 10% token payment requirement with client to lock design commitment.
- **Form Fields**: `Token Amount Received` (₹), `Payment Method` (UPI / Bank Transfer / Cheque / Cash), `Transaction Reference Number`.
- **Button**: Click **`Record Token Payment (10%)`**.

---

### 7.9 Stage 9 — Pricing & Material Costing (`/crm/sales-commercials/pricing-costing`)

[SCREENSHOT: Pricing & Founder Approval Screen]

#### Purpose
Finalize project quotation pricing, apply discounts, and enforce house discount limits.

#### GOVERNANCE RULE: Founder Approval Gate
- **If DCM Discount <= 10%**: Quotation is automatically approved for issue.
- **If DCM Discount > 10%**: System automatically sets status to **`PENDING_APPROVAL`** and triggers an urgent notification banner on the Founder/Admin Dashboard!

#### Buttons
- **`Submit for Pricing Approval`**: Sends pricing proposal for check.
- **`Approve Discount`** *(Founder/Admin only)*: Approves requested discount > 10%.
- **`Reject / Counter`** *(Founder/Admin only)*: Opens modal to specify max allowed discount percentage (e.g. counter with 12%).

---

### 7.10 Stage 10 — Quotation Preparation (`/crm/sales-commercials/quotation`)
- **Purpose**: Generate formal itemized contract quotation including fabric, tailoring, hardware, installation, and GST (18%).
- **Buttons**: **`Generate Final Quotation PDF`**, **`Send Quotation`**.

---

### 7.11 Stage 11 — Client Approval & Order Activation (`/crm/sales-commercials/client-approval`)

[SCREENSHOT: Client Approval & Green Gate Screen]

#### Purpose
Obtain digital client sign-off, collect 60% advance payment, and activate order for factory production.

#### THE 4 GREEN GATES FOR ORDER ACTIVATION
Before an order can be activated, all 4 gates must show **GREEN ✅**:
1. **✅ Site Measurements Locked**: Measurements captured and locked in Stage 3.
2. **✅ Technical Drawing Approved**: CAD/CorelDraw drawing approved by designer.
3. **✅ Payment Settled**: Minimum 10% Token + 60% Advance Payment received in Accounts.
4. **✅ Client Sign-Off Completed**: Signed quotation and design sign-off uploaded.

#### Order Activation Statuses
- **GREEN (All 4 Gates Passed)**: Click **`Activate Order & Start Production`** button to send work order to factory floor!
- **AMBER / RED (Gates Pending)**: Order activation button remains disabled. Hovering over disabled button displays missing requirements (e.g. *"Advance Payment pending ₹1,50,000"*).

---

### 7.12 Stage 12 — KYC & Customer Conversion (`/crm/sales-commercials/kyc`)
- **Purpose**: Record client GSTIN, billing address, site delivery address, and convert Lead record into a live **Project** (`/projects/:id`).

---

## 8. Order Activation & The Gated Green-Amber-Red Model

```text
[ Lead / Commercial Proposal ]
             │
             ▼
 ┌───────────────────────────────────────────────────────────┐
 │ ORDER ACTIVATION CHECKER                                  │
 ├───────────────────────────────────────────────────────────┤
 │  Gate 1: Site Measurement Completed & Locked?    [ YES ✅ ]│
 │  Gate 2: Technical Drawing Approved?             [ YES ✅ ]│
 │  Gate 3: Token (10%) + Advance (60%) Received?   [ YES ✅ ]│
 │  Gate 4: Client Design Sign-Off Completed?       [ YES ✅ ]│
 └───────────────────────────────────────────────────────────┘
             │
             ├───────── ALL GREEN ✅ ─────────► [ ACTIVE ORDER → FACTORY FLOOR ]
             │
             └───────── ANY AMBER/RED ❌ ─────► [ BLOCKED FROM PRODUCTION ]
```

---

## 9. Members & Resource Management (`/members`)

[SCREENSHOT: Members & DCM Workload Screen]

### Purpose
Manage staff profiles, role permissions, DCM active project counts, and workload capacity.

### What You See
- **Members List**: Table of all company staff.
- **Role Badges**: Admin, Senior DCM, DCM, Project Coordinator, Designer, Execution Engineer, Purchase Manager, Store Keeper, Factory Manager, QC Inspector, Installer, Accountant.
- **Active Projects Count**: Live count of active projects assigned to each member.
- **Capacity Badges**:
  - `Available` (Green): Member has capacity for new projects.
  - `Overloaded` (Red pulsing): DCM has > 5 active projects.

### Modals & Buttons
- **`+ Add Member`**: Opens modal to create new staff profile (Name, Role, Email, Mobile, Max Capacity).
- **`Edit Member`**: Update role, contact details, or status.

---

## 10. Files, Attachments & Media Evidence

### Supported File Formats
- **Images**: JPG, JPEG, PNG, WEBP.
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT.
- **Max File Size**: 10MB per file.

### Where File Uploads Are Used
1. **Lead Capture (`/crm/leads`)**: Attach client floorplans and inspiration images.
2. **Site Visit (`/crm/sales-commercials/measurement`)**: Upload window measurement photos and site video proof.
3. **Design (`/crm/sales-commercials/ready-size`)**: Upload CorelDraw / CAD curtain drawings.
4. **Client Sign-off (`/crm/sales-commercials/client-approval`)**: Upload signed quotation PDF and payment receipts.
5. **Quality Control & Installation**: Upload pre-dispatch QC photos and final installed curtain photos.

### How to Upload & Manage Files
1. Click **`Click to Upload Multiple Images or Documents`** or drag files into upload box.
2. Progress bar indicates upload completion.
3. Uploaded files appear as preview pills with file name, size, and view link.
4. Click the **Red Cross Icon (❌)** on a file pill to remove an attachment before saving.

---

## 11. Notifications & System Alerts

[SCREENSHOT: Notifications Center]

### Notification Bell (🔔)
Located on top header. Displays a red badge with unread count whenever system alerts occur.

### Automated Alert Types
1. **Overdue Action Alert**: Triggered when a follow-up or qualification call passes due date.
2. **Founder Approval Required**: Triggered when DCM requests a discount > 10%.
3. **Low Inventory Stock**: Triggered when fabric or motor inventory drops below reorder level.
4. **QC Failure Alert**: Triggered when a work order fails Quality Control inspection.

---

## 12. Master Status Guide

### 1. Lead Statuses (`LEAD_STATUS`)

| Status | Simple Meaning | When it is applied | Next Step |
| :--- | :--- | :--- | :--- |
| **`NEW`** | Fresh enquiry newly entered in ERP. | Immediately upon creating lead. | Assign DCM (`/crm/dcm-assignments`). |
| **`CONTACTED`** | DCM has contacted client for initial call. | When first call/follow-up is logged. | Perform qualification discovery. |
| **`QUALIFIED`** | Lead passed qualification criteria (budget, timeline). | When Qualification Decision = `APPROVED`. | Move to Sales & Commercials pipeline. |
| **`UNQUALIFIED`** | Lead failed qualification (budget low, wrong location). | When Qualification Decision = `REJECTED`. | Lead archived in Lost Leads queue. |
| **`CONVERTED`** | Client signed quote & paid advance; lead converted to Project. | When Order is Activated (`/crm/sales-commercials/kyc`). | Project Workspace created (`/projects/:id`). |
| **`LOST`** | Lead lost to competitor or cancelled by client. | Marked lost during pipeline. | Record lost reason notes. |

---

### 2. Project Pipeline Stages (`PROJECT_STAGE`)

| Stage | Stage Label | Simple Business Meaning | Gate Requirements |
| :--- | :--- | :--- | :--- |
| **1** | `SITE_VISIT` | Site appointment scheduled for measurements. | Lead qualified. |
| **2** | `MEASUREMENT` | Raw window sizes & ready sizes captured. | Site visit completed. |
| **3** | `BOQ` | Fabric consumption sheet calculated. | Measurements locked. |
| **4** | `DESIGN` | Curtain styles & CAD drawings created. | BOQ generated. |
| **5** | `QUOTATION` | Itemized quotation generated. | Pricing approved. |
| **6** | `TOKEN_RECEIVED` | 10% token payment recorded. | Quotation approved & token paid. |
| **7** | `ADVANCE_RECEIVED` | 60% advance payment received. | Advance settled in Accounts. |
| **8** | `ACTIVE` | Order activated for production. | All 4 Green Gates passed. |
| **9** | `EXECUTION_DRAWING` | Final workshop production drawing locked. | Order active. |
| **10** | `PURCHASE` | Fabric, motors, & accessories ordered. | Drawing approved. |
| **11** | `MATERIAL_RECEIVED` | Raw materials received in store. | Material inward recorded. |
| **12** | `PRODUCTION` | Factory workshop cutting & stitching. | Ready sizes confirmed & material in stock. |
| **13** | `QC` | Quality Control length & seam inspection. | Stitching completed. |
| **14** | `PACKING` | Room-wise packed with accessories. | QC Passed. |
| **15** | `DISPATCH` | Goods packed for site dispatch. | Packing complete. |
| **16** | `FINAL_PAYMENT` | 30% balance payment collected. | Balance cleared in Accounts. |
| **17** | `INSTALLATION` | On-site track mounting & curtain hanging. | Balance cleared. |
| **18** | `SNAG` | Rework ticket open for site alterations. | Installation issues reported. |
| **19** | `CLOSED` | Project 100% complete, paid, & closed. | Installation & snags resolved, fully paid. |

---

### 3. Factory Production Stages (`PRODUCTION_STAGE`)

| Stage | Workshop Process | Who Performs It |
| :--- | :--- | :--- |
| **`PENDING`** | Waiting in factory queue for materials. | Store Keeper / Factory Manager |
| **`FABRIC_CUTTING`** | Fabric master cutting according to Ready Size cut lengths. | Cutting Master |
| **`EMBROIDERY`** | Custom embroidery or border work being executed. | Embroidery Specialist |
| **`HAND_WORK`** | Hand stitching, pleating, and eyelet attachment. | Handwork Artisan |
| **`STITCHING`** | Main machine stitching of side hems, headers, and bottom drops. | Stitching Tailor |
| **`CHECKING`** | Dimension checking & thread trimming. | Workshop Checker |
| **`PACKING`** | Room-wise bundling with tiebacks and motor remotes. | Packing Staff |
| **`COMPLETED`** | Ready for QC Inspection & Dispatch. | Factory Manager |

---

## 13. Role-Wise User Guide

---

### 1. Admin / Founder (`ADMIN` / `SUPER_ADMIN`)
- **Main Responsibility**: Overall business operation, discount sign-offs, pricing masters, settings.
- **Key Modules**: Dashboard, All CRM, Sales & Commercials, Members, Settings, Reports.
- **Key Daily Actions**:
  - Review Executive Dashboard for overdue actions & bottlenecks.
  - Approve or counter DCM discount requests > 10%.
  - Monitor revenue pipeline and factory production flow.

---

### 2. Senior DCM & DCM (`SENIOR_DCM` / `DCM`)
- **Main Responsibility**: Lead qualification, client studio meetings, ready size confirmation, quotation proposals, token & advance collection.
- **Key Modules**: Leads, DCM Assignments, Qualification, Follow-ups, Sales & Commercials.
- **Key Daily Actions**:
  - Qualify incoming leads within 24 hours.
  - Conduct studio meetings & assist clients in fabric selection.
  - Verify and lock tailored Ready Sizes.
  - Record 10% token and 60% advance payments.

---

### 3. Project Coordinator (`PROJECT_COORDINATOR`)
- **Main Responsibility**: Cross-departmental coordination, tracking project movement across all 19 stages, site scheduling.
- **Key Modules**: CRM, Sales & Commercials, Projects Workspace, Production View.
- **Key Daily Actions**:
  - Schedule execution engineers for pre-site visits.
  - Verify CAD drawings are uploaded by designers on time.
  - Ensure materials are received from suppliers before production date.

---

### 4. Execution Engineer (`EXECUTION_ENGINEER`)
- **Main Responsibility**: Site visits, capturing physical window sizes vs ready sizes, uploading site photos/videos, installation mounting.
- **Key Modules**: Pre-Site Visit, Measurement Capture, Installation Workspace.
- **Key Daily Actions**:
  - Visit client site with measurement kit.
  - Input raw window dimensions, mount type, and floor drop margins.
  - Upload site opening photos/videos.

---

### 5. Designer (`DESIGNER`)
- **Main Responsibility**: CorelDraw / CAD technical curtain drawings, fabric pattern repeat calculations.
- **Key Modules**: Ready Size Confirmation, Proposal Creation, Execution Drawings.
- **Key Daily Actions**:
  - Convert site measurements into workshop production drawings.
  - Upload approved CAD drawings to project workspace.

---

### 6. Purchase Manager & Store Keeper (`PURCHASE_MANAGER` / `STORE_KEEPER`)
- **Main Responsibility**: Procurement of fabrics, motor hardware, tracks, accessories; inventory inward/outward registers.
- **Key Modules**: Inventory, Purchase Orders, Material Receipt.
- **Key Daily Actions**:
  - Issue POs to fabric vendors.
  - Register material inward stock upon delivery.
  - Reserve fabric inventory for active projects.

---

### 7. Factory Manager & QC Inspector (`FACTORY_MANAGER` / `QC_INSPECTOR`)
- **Main Responsibility**: Factory workshop stage tracking (Cutting to Packing), Quality Control Pass/Fail inspections.
- **Key Modules**: Production Page, QC Workspace.
- **Key Daily Actions**:
  - Update work order stage as items move from Cutting → Stitching → Checking.
  - Conduct QC inspection against confirmed Ready Sizes. Log `PASS` or `FAIL`.

---

### 8. Installer (`INSTALLER`)
- **Main Responsibility**: On-site track mounting, hanging curtains, pairing motor remotes, client digital sign-off.
- **Key Modules**: Installation Workspace.
- **Key Daily Actions**:
  - Collect packed room-wise items from warehouse.
  - Mount tracks and hang curtains on site.
  - Upload installed site photos and obtain client sign-off.

---

### 9. Accountant (`ACCOUNTANT`)
- **Main Responsibility**: Invoicing, registering 10% token, 60% advance, and 30% balance payments, GST compliance.
- **Key Modules**: Accounts, Token Discussion, Client Approval, Invoices.
- **Key Daily Actions**:
  - Verify payment credits in bank account.
  - Issue GST receipts and update payment milestone status.
  - Clear balance payments before authorizing dispatch/installation.

---

## 14. Complete End-to-End Business Workflow

```text
1. NEW ENQUIRY (Lead Capture)
   │
   ▼
2. DCM ASSIGNMENT (Check DCM Workload & Capacity)
   │
   ▼
3. QUALIFICATION (Verify Scope, Budget, & Timeline)
   │
   ▼
4. PRE-SITE VISIT (Assign Execution Engineer)
   │
   ▼
5. MEASUREMENT CAPTURE (Window Size vs Ready Size + Site Photos)
   │
   ▼
6. READY SIZE CONFIRMATION (DCM & Client Lock Ready Sizes)
   │
   ▼
7. CONSUMPTION SHEET / BOQ (Auto-Calculate Fabric Meters & Tracks)
   │
   ▼
8. PROPOSAL & PRICING (Prepare Quote; If Discount > 10% → Founder Approves)
   │
   ▼
9. TOKEN & ADVANCE PAYMENT (10% Token + 60% Advance Received)
   │
   ▼
10. ORDER ACTIVATION (Check 4 Green Gates → Activate Order)
   │
   ▼
11. TECHNICAL DRAWING & PURCHASE (CAD Drawing Approved + Material Inward)
   │
   ▼
12. FACTORY PRODUCTION (Cutting → Stitching → Checking)
   │
   ▼
13. QUALITY CONTROL & PACKING (QC Pass → Room-Wise Packing)
   │
   ▼
14. BALANCE PAYMENT (30% Balance Settled in Accounts)
   │
   ▼
15. INSTALLATION & CLOSURE (Site Mounting → Photos → Client Sign-Off → Project Closed)
```

---

## 15. Common Business Scenarios

---

### Scenario 1 — A New Client Enquiry Arrives via Architect Referral
1. Open ERP and navigate to **CRM → Leads** (`/crm/leads`).
2. Click **`+ Add Lead`** button.
3. Enter Client Name (`Rahul Sharma`), Contact Person (`Sakshi`), Mobile Number (`9876543210`).
4. Select `Lead Source = Architect Referral`.
5. Select or add Architect (`Studio Design / John Doe`).
6. Select `Budget Classification = A`.
7. Upload client floorplan PDF in attachments section.
8. Click **`Save Lead Record`**. Lead code `LD/045` is created!
9. **What To Do Next**: Go to DCM Assignment screen (`/crm/dcm-assignments`) to allocate lead to an available DCM.

---

### Scenario 2 — DCM Needs to Be Reassigned Due to Overload
1. Open **CRM → DCM Assignment** (`/crm/dcm-assignments`).
2. Locate lead `LD/045`. Notice current DCM `Rahul Verma` has 7 active projects (Red pulsing `Overloaded` badge).
3. Click the **Edit Action Button (✏️)** on the row.
4. Set `Reassignment Required = YES`.
5. In `Reassigned To Name`, select `Punam K` (Capacity: `Available`, 2 active projects).
6. In `Reassignment Reason`, enter `"Primary DCM workload overloaded"`.
7. Click **`Save Assignment`**.
8. **What To Do Next**: System auto-notifies Punam K to initiate qualification call within 24 hours.

---

### Scenario 3 — DCM Requests 15% Discount (Founder Approval Workflow)
1. In Stage 9 Pricing & Costing (`/crm/sales-commercials/pricing-costing`), DCM enters 15% discount.
2. Because 15% > 10% house threshold, system sets quotation status to **`PENDING_APPROVAL`**.
3. Founder logs into ERP. Executive Dashboard displays alert banner: *"1 Pending Discount Approval"*.
4. Founder clicks **`Approve Discount`** (or inputs counter offer of 12%).
5. **What To Do Next**: DCM receives notification that discount is approved and generates final quotation PDF in Stage 10.

---

### Scenario 4 — Order Activation Blocked by Missing Advance Payment
1. DCM attempts to activate order in Stage 11 (`/crm/sales-commercials/client-approval`).
2. The **`Activate Order & Start Production`** button is disabled (Red State).
3. Hovering displays: *"Gate 3 Failed: 60% Advance Payment Pending (₹1,80,000)"*.
4. DCM contacts client for advance payment transfer.
5. Accountant logs into **Accounts** (`/accounts`), opens lead, and records ₹1,80,000 credit against Advance milestone.
6. Gate 3 turns **GREEN ✅**.
7. DCM clicks **`Activate Order & Start Production`**. Work order moves to factory queue!

---

## 16. Troubleshooting Guide

| Problem | Possible Reason | What the User Should Do |
| :--- | :--- | :--- |
| **Cannot save New Lead form** | Missing required fields or invalid mobile number. | Check red error highlights under fields. Ensure Client Name, Contact Person, and 10-digit mobile number are entered. |
| **`Activate Order` button disabled** | One or more of the 4 Green Gates is incomplete. | Check the Order Activation checker box. Ensure Measurements are locked, Drawing is approved, Payments are settled, and Sign-off is uploaded. |
| **Cannot assign lead to DCM** | Selected DCM is marked `OVERLOADED`. | Choose an available DCM with <= 5 active projects, or set `Reassignment Required = YES` to override with manager approval. |
| **File not uploading** | File size > 10MB or format unsupported. | Ensure file is JPG, PNG, WEBP, PDF, DOCX, or XLSX and under 10MB. Try compressing PDFs or images before uploading. |
| **Qualification form won't save** | Rejection / Hold reason missing when decision is Rejected/Pending. | If decision is `REJECTED`, `PENDING`, or `NOT DECIDED`, you MUST type an explanation in the `Rejection / Hold Reason` text box. |
| **Quotation stuck in `PENDING_APPROVAL`** | Requested discount exceeds 10%. | Request Founder/Admin to review Dashboard and click `Approve Discount`. |
| **Record not appearing in table** | Search query or status filter tab active. | Clear the search bar text and switch tab to `All Leads` or `All Assignments`. |

---

## 17. Frequently Asked Questions (FAQ)

### Q1: Can I cut fabric before the client pays the 60% advance?
**No.** Embelliish ERP strictly blocks order activation until 10% token + 60% advance payments are confirmed in Accounts. This protects the company from unsold customized inventory.

### Q2: Why are Window Size and Ready Size recorded separately?
Window size is the raw physical opening. Ready size includes tailored allowances for floor drop, track mounting, and header space. Stitching against raw window sizes leads to curtains dragging on the floor or being too short.

### Q3: What happens if a DCM has more than 5 active projects?
The ERP automatically flags the DCM's capacity badge as red `Overloaded`. Managers can easily identify overloaded DCMs on the DCM Assignment page and reassign new leads to available staff.

### Q4: Can an installer take curtains to site if the client hasn't paid the final 30% balance?
**No.** The ERP enforces a balance payment gate before installation. Goods cannot be dispatched or installed until Accounts marks the final 30% balance as cleared.

---

## 18. Quick Reference Guide & Key Rules Summary

### The 4 Golden Rules
1. **Never stitch without Ready Size confirmation.**
2. **Never activate production without 4 Green Gates.**
3. **Never grant > 10% discount without Founder Approval.**
4. **Never install without clearing the 30% balance payment.**

### Key Navigation Links
- **Executive Dashboard**: `/dashboard`
- **Lead Capture & All Leads**: `/crm/leads`
- **DCM Workload Allocation**: `/crm/dcm-assignments`
- **Lead Qualification**: `/crm/qualification`
- **Commercial Pipeline**: `/crm/sales-commercials`
- **Factory Workshop Floor**: `/production`
- **Accounts & Payments**: `/accounts`
- **Team Members & Capacity**: `/members`

---
*Embelliish Home ERP — Powered by D-table Analytics*
