# Inventory Management System

This repository contains a Next.js frontend and local backend support for an inventory management application.

## What is included

- `frontend/`: Next.js application and UI pages
- `backend/server.js`: optional local Express backend helper
- `TROUBLESHOOTING.md`: connection and database issue guidance
- `.env.example`: environment variable template for deployment

## Local development

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Create local environment files:
   - Copy `.env.example` to `frontend/.env.local`
   - Add your Supabase credentials in `frontend/.env.local`

   Example:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   ```
3. Start the app:
   ```powershell
   npm run dev
   ```
4. Open the app in the browser at `http://localhost:3000` (for local development) or visit the deployed version at `https://inventory-management-system.vercel.app`.

## Deployment

This project can be deployed from the repository root using Vercel or another platform that supports Next.js.

- Build command: `npm run build`
- Start command: `npm run start`
- Environment variables required in production:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Note: `.env.local` is ignored by git. Use `.env.example` as a template.

## Recommended deployment flow

1. Push your latest code to GitHub.
2. Create a new Vercel project using this repository.
3. Configure the environment variables in Vercel.
4. Deploy the project.

## Notes

- The `frontend/` directory contains the Next.js app and `tsconfig.json`.
- The local Express backend in `backend/server.js` is not required for Vercel deployment.
- If you need troubleshooting help, refer to `TROUBLESHOOTING.md`.
