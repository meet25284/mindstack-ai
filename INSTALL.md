# INSTALL.md — Setup & Contribution Guide

## Prerequisites

| Requirement | Version / Notes |
|---|---|
| **Node.js** | v18 or later (Next.js 16 requires Node 18+) |
| **npm** | v9 or later (bundled with Node 18+) |
| **MongoDB Atlas account** | Two connections needed: one Mongoose URI, one raw MongoClient URI for the vector collection |
| **MongoDB Atlas Vector Search index** | Index named `vector_index` on the `vector` collection, `numDimensions: 1536`, field: `vector` |
| **MongoDB Atlas Search index** | Index named `BM25` on the `vector` collection, field: `content` (full-text) |
| **OpenAI API key** | GPT-4o mini + `text-embedding-3-small` access required |
| **Cloudinary account** | For document file storage |
| **Razorpay account** | For payment processing (test keys sufficient for local dev) |
| **Gmail account** | For transactional email via Nodemailer (App Password recommended) |

---

## Step-by-Step Install

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd mindstack-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` — see the [Environment Variables](#environment-variables) table below for full details.

### 4. Set up MongoDB Atlas indexes

You need two Atlas Search indexes on the **`vector`** collection in the database pointed to by `VECTOR_DB`:

**Vector Search index** (`vector_index`):
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "vector",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```

**Full-text (BM25) index** (`BM25`):
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "content": { "type": "string" },
      "userId": { "type": "objectId" }
    }
  }
}
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server (hot reload) |
| `npm run build` | Build the production bundle |
| `npm start` | Start the production server (requires build first) |
| `npm run lint` | Run ESLint checks |

---

## Running Tests

No automated test suite is currently configured (see [FUTURE_IDEAS.txt](./FUTURE_IDEAS.txt)). The model service contains a `NODE_ENV === "test"` guard that returns mocked values for `generateTitle` and skips email sending.

---

## Folder Structure

```
mindstack-ai/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # All API route handlers
│   │   ├── chat/           # SSE streaming chat endpoint
│   │   ├── upload/         # File upload + embedding pipeline
│   │   ├── knowledge/      # Knowledge base CRUD
│   │   ├── create-order/   # Razorpay order creation
│   │   ├── verify-payment/ # Razorpay signature verification
│   │   ├── webhook/        # Razorpay webhook handler
│   │   ├── register/       # User registration
│   │   ├── login/          # JWT login (lwp = login with password)
│   │   ├── sendotp/        # OTP dispatch
│   │   ├── verifyotp/      # OTP verification
│   │   ├── verify-email/   # Email verification link handler
│   │   ├── user/           # User profile endpoint
│   │   ├── stats/          # Usage statistics
│   │   ├── usage/          # Per-conversation token usage
│   │   ├── thread/         # Single thread fetch
│   │   ├── threads/        # Thread list
│   │   ├── files/          # File metadata
│   │   └── deleteConversation/ # Conversation deletion
│   ├── chat/               # Chat UI page
│   ├── dashboard/          # Token balance & transaction history
│   ├── checkout/           # Razorpay token purchase page
│   ├── knowledge/          # Knowledge base management UI
│   ├── upload/             # Document upload UI
│   ├── login/              # Login page
│   └── page.jsx            # Root page (registration form)
├── components/             # Reusable React components
├── services/               # Business logic & external service clients
│   ├── rag/                # RAG pipeline (vectorSearch, bm25Search, hybridSearch, rerank, promptBuilder)
│   └── upload/             # Upload pipeline (embeddingService, dbService)
├── models/                 # Mongoose schemas (User, File, Payment, Usage, Thread, Conversation, Transaction)
├── middleware/             # Auth middleware (JWT verification)
├── lib/                    # Shared utilities (MongoDB raw client)
├── hooks/                  # Custom React hooks
├── validations/            # Zod validation schemas
├── templetes/              # Email HTML templates
├── public/                 # Static assets
├── .env.example            # Environment variable template
└── next.config.mjs         # Next.js configuration
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | Mongoose connection string (standard MongoDB Atlas URI) | **Required** |
| `VECTOR_DB` | Raw MongoDB Atlas URI for the vector collection (can be the same cluster, different db) | **Required** |
| `JWT_SECRET` | Secret key used to sign and verify JWTs | **Required** |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o mini and text-embedding-3-small | **Required** |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | **Required** |
| `CLOUDINARY_API_KEY` | Cloudinary API key | **Required** |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | **Required** |
| `RAZORPAY_KEY_ID` | Razorpay publishable key (e.g. `rzp_test_...`) | **Required** |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | **Required** |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to verify Razorpay webhook HMAC signatures | **Required** |
| `email` | Gmail address used as the SMTP sender | **Required** |
| `password` | Gmail App Password (not your account password) | **Required** |
| `gmail` | Alternate Gmail reference (see `.env.example`) | Optional |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app (used in verification email links) | Optional (defaults to `http://localhost:3000`) |

> **Gmail setup tip:** Enable 2-Step Verification on your Google account, then generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Use that as the `password` value.

---

## Common Troubleshooting

| Issue | Fix |
|---|---|
| `Cannot find module 'pdf-parse'` at build | `pdf-parse` is declared as a `serverExternalPackage` in `next.config.mjs` — ensure you are running on Node.js, not Edge runtime. |
| `Cannot find module 'mammoth'` at build | Same as above — `mammoth` must not run in the Edge runtime. |
| Vector search returns empty results | Verify that the Atlas `vector_index` uses `numDimensions: 1536` and that the index has finished building (Atlas shows "Active" status). |
| BM25 search returns empty results | Verify the `BM25` Atlas Search index exists and is "Active". The index name must match exactly (case-sensitive). |
| Razorpay webhook not triggering | In test mode, use the Razorpay dashboard to manually trigger webhook events, or use `ngrok` to expose `localhost` and register the webhook URL. |
| OTP not received | Check that the Gmail App Password is correct and that the account does not have "Less secure app access" blocked (use App Passwords instead). |
| JWT errors / 401 on all API calls | Ensure `JWT_SECRET` in `.env` matches the secret used to sign existing tokens. Changing this secret invalidates all existing sessions. |

---

## Contribution Guidelines

1. **Fork** the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Keep changes focused — one feature or fix per PR.
3. Follow the existing code style (ES Modules, async/await, no default exports for services).
4. Add JSDoc comments to new service functions following the pattern in `services/upload/dbService.js`.
5. Test your changes manually against the dev server before opening a PR.
6. Open a Pull Request against the `main` branch with a clear description of what changed and why.

---

## License

See `LICENSE` if present in the repository.
