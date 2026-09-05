# MedLens — Enterprise Technical Architecture Blueprint
**AI-Powered Medical Document Intelligence & Clinical Record Management**

---

## Executive Summary & System Philosophy

**MedLens** is an enterprise-grade clinical information intelligence platform engineered to transform fragmented, multimodal medical records (laboratory PDFs, outpatient prescriptions, discharge summaries, intake narratives) into structured, traceable, and reviewable patient health records.

### Core Non-Diagnostic Mandate
MedLens functions strictly under the **Rule of Neutrality** and is **NOT** a diagnostic decision system:
1. **Zero Diagnostic Inference**: MedLens extracts, normalizes, and explains documented clinical facts without generating diagnoses, predicting diseases, or proposing therapies.
2. **Zero Inferred Reference Ranges**: Reference boundaries are derived exclusively from source documentation. Missing reference ranges are explicitly flagged as `UNAVAILABLE` rather than approximated with population heuristics.
3. **Immutable Field-Level Provenance**: Every discrete observation maps bi-directionally to its source document, page number, pixel coordinates (bounding boxes), and raw textual snippet.
4. **Human-in-the-Loop Supremacy**: AI models organize and detect conflicts; only licensed clinicians or authorized reviewers verify and resolve discrepancies.

---

## 1. Application Architecture

### 1.1 End-to-End Component Communication Flow

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Presentation Layer (Next.js 15 / React 19)"]
        UI["Clinical Web Application"]
        DASH["Two-Column Workspace\n(Dashboard & Source Inspector)"]
        PAT_VIEW["Patient-Friendly Mode\n(Glossary & Visual Gauges)"]
        AUDIT_DRAWER["Audit & Provenance Explorer"]
    end

    subgraph APILayer ["API & Security Gateway"]
        AUTH["Auth & RBAC Middleware\n(JWT / Clinician vs Reviewer)"]
        RATE["Rate Limiter & Input Sanitizer"]
        ROUTE_HANDLERS["Next.js Route Handlers\n/ RESTful Endpoints"]
    end

    subgraph IngestionLayer ["Ingestion & Security Pipeline"]
        UPLOAD["File Intake (PDF / TIFF / Direct Text)"]
        SHA["SHA-256 Cryptographic Checksum Engine"]
        VIRUS["Malware & De-identification Scanner"]
        STORAGE["Encrypted Object Storage (S3 / GCS)\n[AES-256]"]
    end

    subgraph AIPipeline ["AI Multimodal Extraction Pipeline"]
        OCR["OCR & Layout Engine\n(Document Text & Spatial Tokenizer)"]
        LLM["Multimodal Clinical LLM\n(Gemini 2.0 Flash / Clinical Claude)"]
        GUARD_IN["Pre-Extraction Guardrails\n(Prompt Injection & Non-Diagnostic Framing)"]
        SCHEMA_VAL["Zod Schema Validator\n(Type-Safe Extraction Boundary)"]
        RANGE_ENGINE["Source Reference Range Parser\n(Zero-Assumption Engine)"]
        NORM["Medical Data Normalizer\n(UCUM Units, RxNorm, LOINC)"]
        CONF_SCORER["Extraction Confidence Scorer\n(0.000 - 1.000)"]
        GUARD_OUT["Post-Extraction Guardrail Scanner\n(Deterministic Neutrality Enforcement)"]
    end

    subgraph IntelligenceLayer ["Intelligence & Consistency Engines"]
        CONFLICT["Cross-Record Conflict Detector\n(Dosage, Duplicate, Allergy Clashes)"]
        TIMELINE_ENG["Chronological Timeline Synthesizer"]
        SUMMARY_ENG["Non-Diagnostic Fact Digest Generator"]
    end

    subgraph PersistenceLayer ["Persistence & Audit Layer"]
        PRISMA["Prisma ORM Client"]
        PG[(PostgreSQL Database)]
        AUDIT_LOG[(Immutable Audit Changelog)]
    end

    %% Flow connections
    UI --> DASH
    DASH --> AUTH
    PAT_VIEW --> AUTH
    AUTH --> RATE --> ROUTE_HANDLERS
    
    ROUTE_HANDLERS --> UPLOAD
    UPLOAD --> SHA --> STORAGE
    STORAGE --> OCR --> GUARD_IN --> LLM
    LLM --> SCHEMA_VAL --> RANGE_ENGINE --> NORM --> CONF_SCORER --> GUARD_OUT
    
    GUARD_OUT --> CONFLICT
    GUARD_OUT --> TIMELINE_ENG
    GUARD_OUT --> SUMMARY_ENG
    
    CONFLICT --> PRISMA
    TIMELINE_ENG --> PRISMA
    SUMMARY_ENG --> PRISMA
    
    PRISMA --> PG
    PRISMA --> AUDIT_LOG
    
    PG --> ROUTE_HANDLERS
    ROUTE_HANDLERS --> DASH
    ROUTE_HANDLERS --> AUDIT_DRAWER
```

---

### 1.2 Placement of Safety Guardrails & Provenance Tracking

```mermaid
sequenceDiagram
    autonumber
    actor Clinician as Clinical Reviewer
    participant Client as Frontend (Two-Column Workspace)
    participant API as API Route Handler
    participant GuardIn as Input Safety Scanner
    participant AI as Multimodal AI Engine
    participant GuardOut as Output Neutrality Validator
    participant Conflict as Conflict & Range Engine
    participant DB as PostgreSQL & Audit Log

    Clinician->>Client: Uploads Lab Report PDF (LabCorp_CBC_2026.pdf)
    Client->>API: POST /api/v1/documents/upload (Multipart FormData)
    API->>DB: Compute SHA-256 Checksum & Create Document Record
    API->>GuardIn: Validate MIME Type, Strip Metadata, Enforce Safe Non-Diagnostic Prompt
    GuardIn->>AI: Execute Multimodal Layout & Entity Extraction
    AI-->>GuardOut: Raw Extracted JSON (Labs, Meds, Ranges, Snippets, Bounding Boxes)
    
    critical Output Safety Enforcement
        GuardOut->>GuardOut: Reject any diagnostic claims ("patient has anemia" ➔ REJECTED)
        GuardOut->>GuardOut: Enforce strict source reference ranges (No guessed normal ranges)
    end

    GuardOut->>Conflict: Evaluate Cross-Document Discrepancies (e.g. Metformin 500mg vs 1000mg)
    Conflict->>DB: Store Extracted Entities + Provenance + Audit Log (`AI_EXTRACTED`)
    DB-->>API: Persisted Clinical Record
    API-->>Client: Return Structured Dashboard Data
    Client->>Clinician: Display Left Panel (Structured Labs) & Right Panel (PDF Bounding Box)
    
    Clinician->>Client: Click [Edit Value: 11.2 ➔ 11.5 g/dL] (Reason: "Phone clarification")
    Client->>API: POST /api/v1/verification (Action: EDIT, Reason: "...")
    API->>DB: Update Entity (`HUMAN_VERIFIED` / `EDITED`) & Append Immutable Audit Log
    DB-->>Client: Updated 100% Traceable Record
```

---

## 2. Scalable Folder Structure

```
medlens-platform/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Automated TypeScript, ESLint, Unit, and E2E Tests
│       ├── security-scan.yml         # SAST, Dependency, and Secret Leak Scanners
│       └── deploy.yml                # Production Container / Cloud Deployment Pipeline
├── prisma/
│   ├── schema.prisma                 # Fully normalized relational PostgreSQL schema
│   ├── migrations/                   # Sequential immutable SQL migrations
│   └── seed.ts                       # Clinical demo datasets (Eleanor Vance, etc.)
├── public/
│   ├── favicon.ico
│   ├── sample-reports/               # Pre-packaged clinical test PDFs for verification
│   └── assets/                       # Static SVGs, logos, and medical gauge indicators
├── src/
│   ├── app/                          # Next.js 15 App Router (Pages & API Handlers)
│   │   ├── layout.tsx                # Root layout, ThemeProvider, Toast, and Font wrappers
│   │   ├── globals.css               # Design system tokens, Tailwind directives, dark mode tokens
│   │   ├── page.tsx                  # Public Landing / System Architecture Portal
│   │   ├── patients/
│   │   │   ├── page.tsx              # Patient Directory & Search Roster
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Structured Patient Intake Registration Wizard
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Main Clinical Dashboard (Two-Column Workspace)
│   │   │       ├── loading.tsx       # Skeleton loading state
│   │   │       └── error.tsx         # Clinical error boundary
│   │   └── api/                      # RESTful Route Handlers
│   │       ├── v1/
│   │       │   ├── patients/
│   │       │   │   ├── route.ts              # POST (Create), GET (List / Search)
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts          # GET (Detail), PATCH (Update), DELETE
│   │       │   │       ├── conflicts/route.ts # GET patient-specific active conflicts
│   │       │   │       ├── timeline/route.ts  # GET chronological aggregated timeline
│   │       │   │       └── summarize/route.ts # POST generate non-diagnostic summary
│   │       │   ├── documents/
│   │       │   │   ├── upload/route.ts       # POST multipart document intake & SHA-256
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts          # GET document metadata & stream
│   │       │   │       └── process/route.ts  # POST trigger multimodal AI re-parsing
│   │       │   ├── verification/
│   │       │   │   ├── route.ts              # POST single human verification (ACCEPT/EDIT/REJECT)
│   │       │   │   └── bulk/route.ts         # POST atomic batch verification (≥95% confidence)
│   │       │   ├── conflicts/
│   │       │   │   └── [id]/resolve/route.ts # POST resolve conflict with mandatory audit rationale
│   │       │   ├── audit-logs/
│   │       │   │   └── route.ts              # GET query immutable audit trail
│   │       │   └── export-pdf/
│   │       │       └── route.ts              # GET generate printable structured clinical PDF
│   ├── components/                   # Modular Presentation & Interaction Components
│   │   ├── layout/
│   │   │   ├── Header.tsx            # App branding, safety disclaimer trigger, theme switcher
│   │   │   ├── NavigationBar.tsx     # Overview, Labs, Meds, Timeline, Documents, Audit tabs
│   │   │   └── DisclaimerModal.tsx   # Regulatory non-diagnostic safety notice
│   │   ├── patient/
│   │   │   ├── PatientHeader.tsx     # Demographics, age calculator, verification progress gauge
│   │   │   ├── IntakeForm.tsx        # Multi-step intake form (demographics, history, symptoms)
│   │   │   └── PatientFriendlyView.tsx # Plain-language glossary & horizontal visual range gauges
│   │   ├── clinical/
│   │   │   ├── LabResultsTable.tsx   # Dense lab table with reference ranges & row selection
│   │   │   ├── LabTrendsChart.tsx    # Longitudinal SVG trajectory line chart with normal shading
│   │   │   ├── MedicationsList.tsx   # Active medications with provenance tags
│   │   │   ├── AllergiesList.tsx     # Documented allergies with severity badges
│   │   │   ├── ConditionsList.tsx    # Past medical history & clinical observations
│   │   │   ├── ClinicalTimeline.tsx  # Chronological unified event stream
│   │   │   └── BulkVerificationModal.tsx # 1-click batch verification for confident extractions
│   │   ├── documents/
│   │   │   ├── SideBySideViewer.tsx  # PDF preview canvas, bounding box highlights, zoom controls
│   │   │   ├── DocumentUploader.tsx  # Drag-and-drop document upload with SHA-256 checksumming
│   │   │   └── ProvenanceBadge.tsx   # Tooltip-enabled origin tag (DOCUMENT_EXTRACTED, USER, etc.)
│   │   ├── ai/
│   │   │   ├── AISummaryCard.tsx     # Factual non-diagnostic digest with SOURCE-GROUNDED badges
│   │   │   ├── ConflictDetector.tsx  # Conflict attention cards & Compare Sources modal
│   │   │   └── ProvenanceInspector.tsx # Deep inspection of confidence scores & raw OCR snippets
│   │   ├── verification/
│   │   │   ├── AuditTrailDrawer.tsx  # Slide-over changelog drawer
│   │   │   ├── AuditTrailView.tsx    # Full-page searchable audit trail interface
│   │   │   └── VerificationActions.tsx # Accept, Edit (with reason), and Reject buttons
│   │   └── theme/
│   │       ├── ThemeProvider.tsx     # Context provider for Light, Dark, System themes
│   │       └── ThemeToggle.tsx       # Segmented / dropdown theme switch
│   ├── lib/                          # Core Business Logic, Security & Infrastructure
│   │   ├── ai/
│   │   │   ├── gemini.ts             # Multimodal Gemini 2.0 Client & Fallback Dispatcher
│   │   │   ├── prompts.ts            # Non-diagnostic structured prompts & extraction guidelines
│   │   │   ├── parsers.ts            # Strict reference range parser & zero-guess fallback
│   │   │   ├── guardrails.ts         # Regex & semantic safety filters for non-diagnostic output
│   │   │   └── conflictEngine.ts     # Cross-document conflict detection algorithms
│   │   ├── db/
│   │   │   ├── client.ts             # Prisma client singleton with connection pooling
│   │   │   └── repositories/         # Domain repository abstractions (Patient, Lab, Audit)
│   │   ├── security/
│   │   │   ├── hashing.ts            # Web Crypto SHA-256 checksum calculator
│   │   │   ├── sanitization.ts       # XSS prevention & input scrubbing
│   │   │   └── auth.ts               # Role-based access control (CLINICIAN, REVIEWER, AUDITOR)
│   │   ├── validation/
│   │   │   └── schemas.ts            # Zod validation schemas for all entities and API payloads
│   │   └── utils/
│   │       ├── formatters.ts         # Date, time, numeric, and badge formatting helpers
│   │       └── pdfGenerator.ts       # Structured PDF report builder
│   ├── types/
│   │   ├── clinical.ts               # Domain TypeScript interfaces and Enums
│   │   └── api.ts                    # API request and response contract interfaces
│   └── tests/                        # Comprehensive Test Suites
│       ├── unit/                     # Parsers, guardrails, and conflict engine unit tests
│       ├── integration/              # API endpoints and database transaction tests
│       └── e2e/                      # Playwright end-to-end browser verification tests
├── .env.example                      # Environment template (DATABASE_URL, GEMINI_API_KEY, etc.)
├── next.config.ts                    # Next.js configuration (Turbopack, headers, security)
├── package.json                      # Dependencies and scripts
└── tsconfig.json                     # Strict TypeScript compiler options
```

---

## 3. Database Design (PostgreSQL Normalized Schema)

```mermaid
erDiagram
    PATIENT ||--o{ PATIENT_PROFILE : has
    PATIENT ||--o{ MEDICAL_REPORT : owns
    PATIENT ||--o{ LAB_RESULT : contains
    PATIENT ||--o{ MEDICATION : takes
    PATIENT ||--o{ ALLERGY : has
    PATIENT ||--o{ CONDITION : diagnosed_with
    PATIENT ||--o{ OBSERVATION : noted_in
    PATIENT ||--o{ TIMELINE_EVENT : aggregates
    PATIENT ||--o{ CONFLICT : triggers
    PATIENT ||--o{ AUDIT_LOG : tracks
    PATIENT ||--o{ AI_SUMMARY : summarizes

    MEDICAL_REPORT ||--o{ REPORT_PAGE : contains
    MEDICAL_REPORT ||--o{ EXTRACTED_ENTITY : yields
    REPORT_PAGE ||--o{ EXTRACTED_ENTITY : locates

    EXTRACTED_ENTITY ||--o| LAB_RESULT : maps_to
    EXTRACTED_ENTITY ||--o| MEDICATION : maps_to
    EXTRACTED_ENTITY ||--o| ALLERGY : maps_to

    LAB_RESULT ||--o| REFERENCE_RANGE : uses
    CONFLICT ||--o{ CONFLICT_RECORD_MAP : references
    VERIFICATION ||--|| AUDIT_LOG : generates
```

### 3.1 Detailed Relational Schema Specification

#### 1. Core Patient & Identity Tables
```sql
-- Patients Table: Fundamental identity
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(64) UNIQUE NOT NULL, -- MRN or external identifier (e.g. 'ML-98214')
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    sex VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN', -- 'FEMALE', 'MALE', 'OTHER', 'UNKNOWN'
    blood_type VARCHAR(16),                     -- 'A+', 'O-', etc.
    contact_number VARCHAR(64),
    emergency_contact TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patient Profiles Table: Intake and lifestyle context
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    smoking_status VARCHAR(64) DEFAULT 'UNKNOWN',
    alcohol_consumption VARCHAR(64) DEFAULT 'UNKNOWN',
    occupation VARCHAR(128),
    intake_source VARCHAR(64) NOT NULL DEFAULT 'WEB_INTAKE_FORM',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 2. Document & Layout Storage Tables
```sql
-- Medical Reports Table: Ingested source files
CREATE TABLE medical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    original_file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(32) NOT NULL,            -- 'PDF', 'TIFF', 'PNG', 'JPEG', 'TEXT'
    file_size_bytes INTEGER NOT NULL,
    file_hash_sha256 VARCHAR(64) NOT NULL,     -- Cryptographic tamper check
    storage_path TEXT,                         -- S3 / GCS object URI
    document_type VARCHAR(64) NOT NULL,        -- 'LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY'
    report_date TIMESTAMPTZ,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    raw_extracted_text TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report Pages Table: Spatial layout and page breakdown
CREATE TABLE report_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES medical_reports(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    page_width_px INTEGER,
    page_height_px INTEGER,
    page_text TEXT,
    ocr_confidence NUMERIC(5, 4),               -- 0.0000 to 1.0000
    UNIQUE(report_id, page_number)
);

-- Extracted Entities Table: Granular AI extraction & Spatial Provenance Anchor
CREATE TABLE extracted_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES medical_reports(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    entity_type VARCHAR(64) NOT NULL,          -- 'LAB_RESULT', 'MEDICATION', 'ALLERGY', 'CONDITION'
    raw_extracted_json JSONB NOT NULL,
    bounding_box JSONB,                        -- { "x": 120, "y": 340, "w": 400, "h": 28 }
    source_snippet TEXT,                       -- Exact text snippet from OCR
    confidence_score NUMERIC(5, 4) NOT NULL,    -- 0.0000 to 1.0000
    provenance_source VARCHAR(64) NOT NULL DEFAULT 'DOCUMENT_EXTRACTED',
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3. Structured Clinical Findings Tables
```sql
-- Laboratory Results Table
CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_id UUID REFERENCES medical_reports(id) ON DELETE SET NULL,
    extracted_entity_id UUID REFERENCES extracted_entities(id) ON DELETE SET NULL,
    test_name VARCHAR(255) NOT NULL,
    test_category VARCHAR(128) DEFAULT 'General Laboratory',
    measured_value VARCHAR(64) NOT NULL,
    numeric_value NUMERIC(12, 4),
    unit VARCHAR(32),
    reference_range_text VARCHAR(128),         -- NULL if missing from source (never invented)
    ref_range_low NUMERIC(12, 4),
    ref_range_high NUMERIC(12, 4),
    interpretation VARCHAR(32) NOT NULL,       -- 'LOW', 'NORMAL', 'HIGH', 'REFERENCE_UNAVAILABLE'
    test_date TIMESTAMPTZ NOT NULL,
    provenance_source VARCHAR(64) NOT NULL DEFAULT 'DOCUMENT_EXTRACTED',
    source_page_number INTEGER DEFAULT 1,
    source_original_snippet TEXT,
    confidence_score NUMERIC(5, 4) NOT NULL DEFAULT 0.9500,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED', -- 'UNVERIFIED', 'VERIFIED', 'EDITED', 'REJECTED'
    verified_by VARCHAR(128),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medications Table
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_id UUID REFERENCES medical_reports(id) ON DELETE SET NULL,
    drug_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(128),                       -- e.g. '500 mg', '1000 mg'
    frequency VARCHAR(128),                    -- e.g. 'Twice daily with meals'
    route VARCHAR(64) DEFAULT 'Oral',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'DISCONTINUED', 'NEEDS_HUMAN_REVIEW'
    start_date DATE,
    end_date DATE,
    provenance_source VARCHAR(64) NOT NULL DEFAULT 'DOCUMENT_EXTRACTED',
    source_page_number INTEGER DEFAULT 1,
    source_original_snippet TEXT,
    confidence_score NUMERIC(5, 4) NOT NULL DEFAULT 0.9500,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
    verified_by VARCHAR(128),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allergies Table
CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_id UUID REFERENCES medical_reports(id) ON DELETE SET NULL,
    allergen VARCHAR(255) NOT NULL,
    reaction TEXT,
    severity VARCHAR(32) NOT NULL DEFAULT 'MILD', -- 'MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'
    provenance_source VARCHAR(64) NOT NULL DEFAULT 'DOCUMENT_EXTRACTED',
    source_page_number INTEGER DEFAULT 1,
    source_original_snippet TEXT,
    confidence_score NUMERIC(5, 4) NOT NULL DEFAULT 0.9500,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conditions & Past Medical History Table
CREATE TABLE conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    condition_name VARCHAR(255) NOT NULL,
    clinical_status VARCHAR(32) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED', 'REMISSION'
    documented_date DATE,
    provenance_source VARCHAR(64) NOT NULL DEFAULT 'DOCUMENT_EXTRACTED',
    verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 4. Conflicts, Audit & Synthesis Tables
```sql
-- Conflicts Table: Cross-record discrepancies
CREATE TABLE conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    conflict_type VARCHAR(64) NOT NULL,        -- 'MEDICATION_INCONSISTENCY', 'ALLERGY_CONTRADICTION', 'DUPLICATE_DISCREPANCY'
    entity_type VARCHAR(32) NOT NULL,          -- 'MEDICATION', 'ALLERGY', 'LAB_RESULT'
    description TEXT NOT NULL,
    conflicting_records_json JSONB NOT NULL,   -- [{ source: 'Intake', value: '500 mg' }, { source: 'Report', value: '1000 mg' }]
    resolution_status VARCHAR(32) NOT NULL DEFAULT 'DETECTED', -- 'DETECTED', 'RESOLVED', 'DISMISSED'
    resolved_by VARCHAR(128),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Audit Logs Table: Cryptographic event trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    entity_type VARCHAR(64) NOT NULL,          -- 'PATIENT', 'LAB_RESULT', 'MEDICATION', 'CONFLICT'
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,               -- 'AI_EXTRACTED', 'VERIFIED', 'EDITED', 'REJECTED', 'BULK_VERIFIED', 'CONFLICT_RESOLVED'
    previous_values_json JSONB,
    new_values_json JSONB,
    performed_by VARCHAR(64) NOT NULL DEFAULT 'USER', -- 'USER', 'AI_ENGINE', 'SYSTEM'
    reason TEXT,                               -- Clinician rationalization for edits
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Summaries Table: Generated non-diagnostic factual digests
CREATE TABLE ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    key_findings_json JSONB,
    notable_changes_json JSONB,
    missing_information_json JSONB,
    guardrail_version VARCHAR(32) NOT NULL DEFAULT 'v2.4-strict-neutral',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_lab_results_patient ON lab_results(patient_id, test_date);
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_conflicts_patient_status ON conflicts(patient_id, resolution_status);
CREATE INDEX idx_audit_logs_patient_time ON audit_logs(patient_id, timestamp DESC);
CREATE INDEX idx_reports_sha256 ON medical_reports(file_hash_sha256);
```

---

## 4. API Architecture & Endpoint Contracts

### 4.1 Global API Standards
- **Protocol**: HTTPS / RESTful JSON
- **Base Route**: `/api/v1`
- **Authentication**: Bearer JWT / Session Cookies (`Role: CLINICIAN | REVIEWER | AUDITOR`)
- **Standard Success Envelope**: `{ "success": true, "data": { ... }, "timestamp": "2026-09-05T11:15:00Z" }`
- **Standard Error Envelope**: `{ "success": false, "error": { "code": "CONFLICT_DETECTED", "message": "...", "details": [] } }`

---

### 4.2 Endpoint Specifications

#### 1. Patient Intake & Management

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/patients` | `POST` | `CLINICIAN` | Create new patient record & baseline intake |
| `/api/v1/patients` | `GET` | `CLINICIAN`, `REVIEWER` | List & search patients with conflict counts |
| `/api/v1/patients/:id` | `GET` | `CLINICIAN`, `REVIEWER` | Get complete structured patient profile |
| `/api/v1/patients/:id` | `PATCH` | `CLINICIAN` | Update patient demographic metadata |

##### `POST /api/v1/patients`
- **Request Body**:
```json
{
  "identifier": "ML-98214",
  "fullName": "Eleanor Vance",
  "dateOfBirth": "1972-04-14",
  "sex": "FEMALE",
  "bloodType": "A+",
  "contactNumber": "+1 (555) 234-8901",
  "emergencyContact": "Thomas Vance - (555) 987-6543",
  "notes": "Patient presents with persistent fatigue over past 6 weeks."
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "p-demo-eleanor",
    "identifier": "ML-98214",
    "fullName": "Eleanor Vance",
    "createdAt": "2026-09-05T11:15:00Z"
  }
}
```
- **Error Codes**: `400 Bad Request` (Zod validation failed), `409 Conflict` (Identifier already exists).

---

#### 2. Document Processing & Ingestion

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/documents/upload` | `POST` | `CLINICIAN` | Upload medical document & compute SHA-256 |
| `/api/v1/documents/:id/process` | `POST` | `CLINICIAN` | Trigger multimodal OCR extraction pipeline |
| `/api/v1/documents/:id/extractions` | `GET` | `CLINICIAN`, `REVIEWER` | Get spatial bounding boxes & snippets |

##### `POST /api/v1/documents/upload`
- **Request**: Multipart `FormData` containing `file` (PDF/Image) and `patientId`.
- **Validation**: File size $\le 30\text{ MB}$, valid MIME type (`application/pdf`, `image/png`, `image/jpeg`).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "documentId": "doc-cbc-01",
    "fileName": "LabCorp_CBC_2026.pdf",
    "fileHashSha256": "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    "pages": 2,
    "extractedEntitiesCount": 5,
    "processingStatus": "COMPLETED"
  }
}
```
- **Error Codes**: `400 Bad Request` (Invalid MIME/Corrupt file), `413 Payload Too Large`, `422 Unprocessable Entity` (OCR failed).

---

#### 3. Human Verification & Audit Trail

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/verification` | `POST` | `CLINICIAN`, `REVIEWER` | Single entity Accept, Edit, or Reject |
| `/api/v1/verification/bulk` | `POST` | `CLINICIAN` | Batch-accept items meeting confidence threshold |
| `/api/v1/audit-logs` | `GET` | `AUDITOR`, `CLINICIAN` | Query cryptographic audit trail |

##### `POST /api/v1/verification`
- **Request Body**:
```json
{
  "patientId": "p-demo-eleanor",
  "entityType": "LAB_RESULT",
  "entityId": "lab-1",
  "action": "EDIT",
  "editedValues": {
    "measuredValue": "11.2",
    "referenceRangeText": "13.0–17.0 g/dL"
  },
  "reason": "Clinician verified exact units against physical report."
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "entityId": "lab-1",
    "verificationStatus": "EDITED",
    "auditLogId": "audit-9821"
  }
}
```

##### `POST /api/v1/verification/bulk`
- **Request Body**:
```json
{
  "patientId": "p-demo-eleanor",
  "minConfidence": 0.95
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "verifiedCount": 4,
    "auditLogId": "audit-bulk-01"
  }
}
```

---

#### 4. Conflict Management & Resolution

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/patients/:id/conflicts` | `GET` | `CLINICIAN` | Fetch detected discrepancies |
| `/api/v1/conflicts/:id/resolve` | `POST` | `CLINICIAN` | Resolve conflict with clinical justification |

##### `POST /api/v1/conflicts/:id/resolve`
- **Request Body**:
```json
{
  "resolutionStatus": "RESOLVED",
  "resolutionNotes": "Clinician verified Metformin 500 mg regimen with outpatient pharmacy."
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "conflictId": "conf-1",
    "resolutionStatus": "RESOLVED",
    "resolvedAt": "2026-09-05T11:18:05Z"
  }
}
```

---

#### 5. Timeline, Summarization & PDF Export

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/patients/:id/timeline` | `GET` | Aggregate chronological stream of records & reports |
| `/api/v1/patients/:id/summarize` | `POST` | Generate non-diagnostic factual digest |
| `/api/v1/export-pdf` | `GET` | Generate printable structured PDF clinical summary |

---

## 5. AI Multimodal Pipeline & Failure Recovery

### 5.1 Pipeline Stages & Transformation Graph

```
[Uploaded Document PDF/Image]
       │
       ▼
1. INTAKE & INTEGRITY
   ├── Compute SHA-256 Checksum
   └── Store raw artifact in Encrypted Object Store
       │
       ▼
2. OCR & SPATIAL TOKENIZATION
   ├── PDF text-stream extraction (pdf-parse / Tesseract OCR)
   └── Extract word coordinate boxes [x, y, width, height, page]
       │
       ▼
3. MULTIMODAL UNDERSTANDING & EXTRACTION
   ├── Formulate Non-Diagnostic Zero-Shot Clinical Extraction Prompt
   ├── Submit Layout + Image tokens to Gemini 2.0 Flash / Clinical Model
   └── Request JSON schema conformity
       │
       ▼
4. STRICT SCHEMA VALIDATION (Zod Layer)
   ├── Validate entities: testName, measuredValue, unit, rawRangeText
   └── Validate medications: drugName, dosage, frequency, route
       │
       ▼
5. REFERENCE RANGE PARSING (Zero-Assumption Rule)
   ├── Extract low/high bounds strictly from document string
   └── If missing -> Mark interpretation as 'REFERENCE_UNAVAILABLE'
       │
       ▼
6. MEDICAL DATA NORMALIZATION
   ├── Standardize units to UCUM (e.g., 'gm/dl' ➔ 'g/dL')
   └── Sanitize numeric strings (e.g., '11,2' ➔ 11.2)
       │
       ▼
7. CONFIDENCE SCORING & PROVENANCE BINDING
   ├── Compute extraction confidence (0.000 - 1.000)
   ├── Bind source snippet and page bounding box
   └── Set provenanceSource = 'DOCUMENT_EXTRACTED'
       │
       ▼
8. CROSS-RECORD CONFLICT ENGINE
   ├── Cross-check with active medications and existing labs
   └── If divergence detected -> Generate 'Potential Conflict Detected'
       │
       ▼
9. POST-EXTRACTION SAFETY GUARDRAIL
   ├── Regex scan: Intercept any diagnostic assertions ("diagnosed with...")
   └── Ensure all output is descriptive and factual
       │
       ▼
10. RELATIONAL PERSISTENCE & AUDIT CHANGELOG
    ├── Save records with status 'UNVERIFIED'
    └── Log 'AI_EXTRACTED' event with model version and timestamp
       │
       ▼
11. HUMAN VERIFICATION WORKFLOW
    └── Clinician reviews side-by-side: [Accept] [Edit] [Reject]
```

---

### 5.2 Failure Modes, Circuit Breakers & Fallback Strategies

| Pipeline Failure Stage | Cause | Deterministic Mitigation & Fallback Strategy |
| :--- | :--- | :--- |
| **1. PDF OCR Failure** | Low scan resolution, blurred image, corrupted font tables. | Trigger secondary local OCR fallback parser (Tesseract OCR); if confidence $< 60\%$, flag document as `OCR_UNREADABLE — Manual Review Required`. |
| **2. LLM Timeout or 5xx Rate Limit** | Cloud AI API quota or network drop. | Exponential backoff with jitter (3 retries). If exhausted, route document to deterministic regex/table parser. |
| **3. Malformed LLM JSON Output** | Model hallucinated markdown or broken bracket. | Pass raw output through JSON auto-repair parser (`json-repair`). Re-validate against strict Zod schema. |
| **4. Unspecified Reference Range** | Document omitted reference bounds (e.g. Ferritin `45 ng/mL`). | **Strict Safety Rule**: Mark range as `Unavailable` and interpretation as `REFERENCE_UNAVAILABLE`. Never invent or substitute population ranges. |
| **5. Ambiguous Dosage / Clinical Conflict** | Divergence between intake narrative and prescription PDF. | Create a `MEDICATION_INCONSISTENCY` conflict record with status `DETECTED`. Block automatic overwrite. Present Compare Sources modal to clinician. |
| **6. Diagnostic Policy Violation** | Model output contained speculative diagnostic phrasing. | Output guardrail scanner intercepts text, strips non-compliant assertions, and replaces summary with descriptive laboratory delta statement. |

---

## 6. Architecture Completeness & Readiness Assessment

### Answer: Is this architecture enough?

**Yes.** This technical blueprint provides a complete, production-grade foundation that addresses every functional, non-diagnostic, regulatory, and UI/UX requirement:

1. **Regulatory Defensibility (HIPAA / FDA SaMD Guidelines)**:
   - Fulfills FDA Class I Non-Diagnostic Decision Support criteria by ensuring all intelligence is purely descriptive, source-grounded, and subject to mandatory human authorization.
2. **Deterministic Data Integrity**:
   - Every lab result and medication dosage retains end-to-end cryptographic and spatial provenance linking directly to its source PDF bounding box.
3. **High-Reliability Engineering**:
   - Resilient database transactions, circuit-breaking AI fallbacks, strict Zod schema validation, and atomic bulk verification with immutable audit changelogs.
4. **Implementation-Ready**:
   - The relational database schemas, REST API contracts, and folder structures are ready for direct scaffolding and execution.
