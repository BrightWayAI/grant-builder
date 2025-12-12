# Brightway Grants

AI-powered grant proposal generation for small nonprofit development teams.

## Features

- **Knowledge Base (RAG)**: Upload past proposals, annual reports, and impact data to train the AI on your organization's voice
- **RFP Parser**: Upload RFPs and automatically extract requirements, deadlines, and section limits
- **AI Draft Generation**: Generate complete proposal drafts that match RFP requirements using your organization's content
- **Inline Co-Pilot Editor**: Refine drafts with AI assistance - expand, condense, strengthen with data, clarify language
- **Export**: Download polished proposals as DOCX or copy to clipboard

## Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Pinecone account (for vector embeddings)
- AWS S3 or Cloudflare R2 (for file storage)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.template` to `.env` and fill in your credentials:

```bash
cp .env.template .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `OPENAI_API_KEY`: From OpenAI dashboard
- `PINECONE_API_KEY`: From Pinecone console
- `PINECONE_INDEX`: Your Pinecone index name
- `S3_*`: Your S3/R2 bucket configuration

### 3. Set up Pinecone

Create a Pinecone index with:
- **Dimensions**: 3072 (for text-embedding-3-large)
- **Metric**: cosine

### 4. Initialize database

```bash
npm run db:push
```

Or for production with migrations:

```bash
npm run db:migrate
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **AI**: OpenAI (GPT-4o, text-embedding-3-large)
- **Vector DB**: Pinecone
- **Rich Text**: Tiptap
- **File Storage**: AWS S3 / Cloudflare R2

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup, onboarding
│   ├── (dashboard)/      # Dashboard, proposals, knowledge-base
│   └── api/              # API routes
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── editor/           # Tiptap editor components
│   ├── documents/        # Document upload/list
│   ├── proposals/        # RFP parser, export
│   └── dashboard/        # Navigation
└── lib/
    ├── ai/               # OpenAI, Pinecone, RAG
    ├── auth.ts           # NextAuth config
    ├── db.ts             # Prisma client
    └── storage.ts        # S3 utilities
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/*` | * | NextAuth handlers |
| `/api/organizations` | POST, GET | Create/get organization |
| `/api/documents` | POST, GET | Upload/list documents |
| `/api/documents/[id]` | DELETE | Delete document |
| `/api/rfp/parse` | POST | Parse uploaded RFP |
| `/api/proposals` | POST, GET | Create/list proposals |
| `/api/proposals/[id]/generate` | POST | Generate section content (streaming) |
| `/api/proposals/[id]/sections/[sectionId]` | PATCH | Update section |
| `/api/copilot` | POST | AI editing actions (streaming) |
| `/api/export/docx` | POST | Export proposal to DOCX |

## Usage Flow

1. **Sign up** and create your organization profile
2. **Upload documents** to your knowledge base (past proposals, annual reports, etc.)
3. **Create a new proposal** by uploading an RFP or starting from template
4. **Review extracted requirements** and edit as needed
5. **Generate drafts** for each section using AI
6. **Refine with co-pilot** - select text and use quick actions or custom prompts
7. **Export** to DOCX or copy sections to clipboard

## Docker Deployment

### Local Development with Docker

```bash
# Start the app with PostgreSQL
docker-compose up --build

# The app will be available at http://localhost:3000
```

### Production Deployment

#### Option 1: Docker Compose (Simple)

```bash
# Create .env file with production values
cp .env.template .env
# Edit .env with your production credentials

# Build and run
docker-compose -f docker-compose.prod.yml up --build -d
```

#### Option 2: Deploy to Cloud Platforms

**Vercel (Recommended for Next.js)**
1. Push code to GitHub
2. Import project at vercel.com
3. Add environment variables in Vercel dashboard
4. Deploy

**Railway**
1. Connect GitHub repo at railway.app
2. Add PostgreSQL service
3. Add environment variables
4. Deploy

**AWS/GCP/Azure with Docker**
```bash
# Build the image
docker build -t brightway-grants .

# Tag for your registry
docker tag brightway-grants:latest YOUR_REGISTRY/brightway-grants:latest

# Push to registry
docker push YOUR_REGISTRY/brightway-grants:latest

# Run with your cloud provider's container service
```

### Required Services for Production

1. **PostgreSQL Database** - AWS RDS, Supabase, Railway, or Neon
2. **Pinecone** - Vector database for RAG (pinecone.io)
3. **OpenAI API** - For AI generation (platform.openai.com)
4. **S3-compatible Storage** - AWS S3 or Cloudflare R2 for file uploads

### Environment Variables for Production

See `.env.template` for required environment variables. You'll need:
- Database connection string
- NextAuth secret and URL
- OpenAI API key
- Pinecone credentials
- S3/R2 storage credentials

## License

MIT
