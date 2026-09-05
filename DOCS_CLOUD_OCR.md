# MedLens Cloud OCR & Multimodal AI Extraction Setup Guide

This guide documents the setup, credential configuration, and fallback mechanisms for the **MedLens Extraction & AI Engine**.

---

## 1. Cloud OCR Providers Architecture

MedLens implements a decoupled, provider-agnostic OCR interface:

```ts
interface OCRService {
  readonly providerName: string;
  extract(document: Buffer, fileName?: string): Promise<OCRResult>;
}
```

Supported Providers:
* `google` / `google-document-ai`: Google Cloud Document AI (Primary Cloud Provider)
* `paddle` / `paddle-ocr`: PaddleOCR (High-Accuracy Local / Containerized Fallback)
* `tesseract` / `tesseract-ocr`: Tesseract OCR (Local Fallback)

---

## 2. Google Cloud Document AI Setup

### Step 1: Enable Document AI API
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project (e.g. `medlens-production`).
3. Enable the **Cloud Document AI API** (`documentai.googleapis.com`).

### Step 2: Create a Document OCR Processor
1. In Google Cloud Console, navigate to **Document AI** > **Processors**.
2. Click **Create Processor** and select **Document OCR** (General Processor).
3. Set your Region/Location (e.g., `us` or `eu`).
4. Note your **Processor ID** (e.g., `8f7b209a1b2c3d4e`).

### Step 3: Configure Service Account Credentials
1. Navigate to **IAM & Admin** > **Service Accounts**.
2. Create a service account with the role **Document AI API User** (`roles/documentai.apiUser`).
3. Create and download a JSON key file to a secure directory (never commit this file to git).

### Step 4: Add Environment Variables
Add the following to your `.env` file:

```env
# Google Cloud Document AI Configuration
OCR_PROVIDER=google
OCR_FALLBACK_PROVIDER=paddle

GOOGLE_CLOUD_PROJECT_ID="your-google-project-id"
GOOGLE_CLOUD_LOCATION="us"
GOOGLE_DOCUMENT_AI_PROCESSOR_ID="your-processor-id"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

---

## 3. Local PaddleOCR Fallback Setup

If Google Cloud Document AI encounters an error, timeout, or quota limit, MedLens automatically fails over to the configured fallback provider without failing the document ingestion.

To run a local PaddleOCR microservice:
```bash
# Using Docker (Fastest)
docker run -d -p 8866:8866 --name paddleocr paddlepaddle/paddleocr:latest
```

Configure in `.env`:
```env
OCR_FALLBACK_PROVIDER=paddle
PADDLE_OCR_ENDPOINT="http://localhost:8866/predict/ocr_system"
```

---

## 4. Google Gemini Multimodal AI Extraction

For extracting structured clinical entities (Labs, Medications, Allergies, Conditions, Symptoms) from documents:

```env
# Google Gemini API Key
GEMINI_API_KEY="AIzaSyYourGeminiAPIKeyHere"
```

When `GEMINI_API_KEY` is omitted or unavailable, MedLens automatically uses its built-in deterministic clinical parser.

---

## 5. Non-Negotiable Safety & Reference Range Rules

1. **Deterministic Range Evaluation**: Status (`LOW`, `NORMAL`, `HIGH`) is calculated purely by application code using document-printed ranges. The LLM is never permitted to classify clinical severity.
2. **Missing Ranges**: Missing reference ranges strictly default to `REFERENCE_UNAVAILABLE` with `referenceSource: 'NONE'`.
3. **Audit Trail**: Every OCR execution, AI extraction, validation check, conflict detection, and human verification action is logged immutably.
