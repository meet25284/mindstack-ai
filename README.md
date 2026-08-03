# MindStack AI

> **Your personal AI knowledge assistant — upload documents, ask questions, get cited answers.**

MindStack AI is a full-stack RAG (Retrieval-Augmented Generation) SaaS application. Users upload their own documents (PDF, DOCX, TXT, Markdown), which are chunked, embedded, and stored in MongoDB Atlas. When a user asks a question in the chat interface, the system runs a **hybrid search** (vector + BM25) over their private knowledge base, reranks results with Reciprocal Rank Fusion, and streams a grounded answer via GPT-4o mini — with inline source citations.

---

## Key Features

| Feature | Details |
|---|---|
| **Document Upload & Ingestion** | Upload PDF, DOCX, TXT, and Markdown files. Text is chunked (500 chars, 100-char overlap) and embedded with `text-embedding-3-small` (1536-dim). Files are stored on Cloudinary. |
| **Hybrid Semantic Search** | Parallel vector search (MongoDB Atlas `$vectorSearch`) + BM25 full-text search (`$search`), fused with Reciprocal Rank Fusion (RRF). Only chunks with score >= 0.70 are returned. |
| **Streaming AI Chat** | Real-time SSE streaming of GPT-4o mini responses. Markdown rendered client-side with `streamdown`. Supports multi-turn conversation threads with auto-generated titles. |
| **Source Citations** | Every AI response surfaces the exact knowledge-base chunks it used, visible in an inline citation panel. |
| **Knowledge Base Management** | Per-user private document library. View, preview, and soft-delete documents. Processing status tracked (PENDING -> PROCESSING -> READY / FAILED). |
| **Token-Based Billing** | Pay-as-you-go via Razorpay (INR). Rs1 = 5,000 AI tokens. Payments verified server-side via HMAC signature. Token balance tracked per user and deducted per chat request. |
| **Webhook-Driven Token Credit** | Razorpay webhooks credit tokens only after `payment.captured` event, never on client-side confirmation alone. Duplicate webhook events are handled gracefully. |
| **User Dashboard** | Token balance, transaction history, daily usage breakdown, low-balance warnings, and one-click purchase flow. |
| **Email Verification & OTP** | Registration sends a verification email. Login supports OTP flow via Nodemailer + Gmail SMTP. |
| **JWT Authentication** | Stateless auth using JSON Web Tokens. All API routes protected server-side via Bearer token middleware. |
| **Prompt Injection Guard** | System prompt explicitly instructs the model to treat retrieved document content as data only and ignore any embedded override instructions. |

---

## Screenshots

<img width="1924" height="959" alt="Screenshot from 2026-08-03 10-09-46" src="https://github.com/user-attachments/assets/3f10819b-9fa0-4c9f-ba9a-fe9bc14d330b" />


---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | Node.js |
| AI / LLM | OpenAI GPT-4o mini via Vercel AI SDK (`ai`, `@ai-sdk/openai`) |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) |
| Vector DB | MongoDB Atlas Vector Search (`$vectorSearch`) |
| Full-text Search | MongoDB Atlas Search (`$search`, BM25 index) |
| Primary DB | MongoDB + Mongoose |
| File Storage | Cloudinary |
| Payments | Razorpay (Standard Checkout + Webhooks) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Email | Nodemailer (Gmail SMTP) |
| UI | React 19, Tailwind CSS v4, Lucide React |
| Markdown Streaming | `streamdown` |
| Validation | Zod |
| Document Parsing | `pdf-parse` (PDF), `mammoth` (DOCX) |

---

## Live Demo

[mindstack.ai](https://mindstack-ai-swart.vercel.app/)

---


