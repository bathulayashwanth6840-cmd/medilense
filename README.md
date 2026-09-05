# MedLens — AI-Powered Medical Document Intelligence & Clinical Record Management

> **Important Clinical Safety Notice**: MedLens is **NOT** a diagnostic system. It strictly organizes, standardizes, and explains information already documented in source clinical records. MedLens does not diagnose diseases, prescribe medicines, recommend dosage changes, or replace healthcare professionals.

---

## 🌟 Overview

**MedLens** transforms fragmented, unstructured medical documents (PDF laboratory reports, discharge summaries, prescription notes, and patient intake narratives) into structured, traceable, and reviewable patient health records.

Designed with an enterprise clinical UI/UX, MedLens provides a two-column desktop workspace uniting structured clinical dashboards with real-time source document evidence, strict reference range discipline, cross-document conflict detection, and immutable human audit verification.

---

## 🚀 Key Features

### 1. Two-Column Clinical Workspace
- **Left Panel (60–65%) — Clinical Dashboard & Structured Records**:
  - Attention-grabbing **Conflict Detection Cards** with provider reconciliation modals.
  - **AI Clinical Fact Summary** with `SOURCE-GROUNDED` and `No Diagnostic Inference` badges.
  - **Laboratory Results Table** with exact source reference ranges (`LOW`, `NORMAL`, `UNAVAILABLE`).
  - **Medications & Documented Allergies** with severity indicators.
- **Right Panel (35–40%) — Document Source / AI Inspector**:
  - Realistic PDF preview canvas with animated **bounding box highlights** around source evidence.
  - Controls for zoom (`Zoom In`, `Zoom Out`, `Fit to Screen`) and page pagination.
  - **Provenance Metadata Panel** displaying document SHA-256 hash, extraction timestamp, and confidence progress indicator (`98.4%`).
  - **Human Verification Actions** (`Accept`, `Edit Value` with mandatory audit reason, and `Reject`).

### 2. Strict Reference Range Discipline (Zero Inferred Ranges)
- Evaluates values exclusively against reference boundaries printed in the uploaded document.
- When a document does not specify a reference range (e.g. Ferritin or ESR), it is marked as `UNAVAILABLE` rather than guessing or assuming a population normal range.

### 3. Cross-Record Conflict Detection & "Compare Sources" Modal
- Automatically flags contradictory dosages or allergy records (e.g. Metformin 500 mg intake vs. 1000 mg report).
- Provides a side-by-side reconciliation comparison table with source dates, doses, and confidence scores:
  - `[ Keep 500 mg ]` `[ Keep 1000 mg ]` `[ Mark for Review ]`
  - MedLens **never** automatically chooses the correct value without explicit clinician confirmation.

### 4. 📈 Longitudinal Lab Trends Visualizer
- Interactive SVG trajectory curves plotting historical lab values across dates.
- Visual source reference range shading (in-target green band vs. boundary flags) and interactive hover tooltips.

### 5. 👥 Clinician / Patient Dual View Mode
- **Clinician Mode**: High information density, dense data tables, provenance snippets, and audit drawers.
- **Patient-Friendly Mode**: Plain-language medical glossary explanations and simplified horizontal visual range gauges.

### 6. 🌓 Centralized Theme System
- WCAG-compliant **Light Mode**, **Dark Mode** (slate-navy clinical palette), and **System Default**.
- Persistent across page reloads via `localStorage` with zero theme flashing.

### 7. 📜 Immutable Audit Trail & PDF Export
- Complete chronological audit log of every AI extraction, confidence score evaluation, conflict resolution, and human modification.
- Printable, structured clinical summary export (`/api/export-pdf?patientId=:id`).

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14/15](https://nextjs.org/) (App Router, Turbopack, React Server Components)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 + Vanilla CSS Custom Properties
- **Icons**: Lucide React
- **Validation**: Zod Schemas
- **Security & Integrity**: Web Crypto SHA-256 Checksums
- **AI Integration**: Multimodal extraction pipeline with deterministic clinical fallback parsers

---

## 🏃 Getting Started Locally

### Prerequisites
- Node.js 18.17+ or 20+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bathulayashwanth6840-cmd/medilense.git
cd medilense
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛡️ Responsible AI & Data Integrity Principles

MedLens adheres to strict responsible-AI and clinical documentation standards:

1. **Rule of Neutrality**: Distinguishes extracted clinical facts from diagnostic speculation.
2. **Field-Level Provenance**: Every discrete data point retains its source document ID, page number, extraction snippet, and actor history (`DOCUMENT_EXTRACTED`, `AI_NORMALIZED`, `HUMAN_VERIFIED`, `USER_EDITED`).
3. **Auditability**: Every clinician edit or verification action creates an immutable audit entry with timestamp, user ID, previous state, new state, and clinical rationale.
