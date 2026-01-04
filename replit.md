# Vite React Supabase Project

## Overview
A React + TypeScript + Vite application with Supabase integration for authentication and data storage.

## Project Structure
- `src/` - Source code
  - `pages/` - React page components (Login, Reserve)
  - `App.tsx` - Main application component with routing
  - `supabaseClient.ts` - Supabase client configuration
- `public/` - Static assets
- `vite.config.ts` - Vite configuration

## Tech Stack
- React 18
- TypeScript
- Vite (build tool)
- React Router DOM (routing)
- Supabase (backend-as-a-service)

## Environment Variables Required
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key

## Development
Run the development server:
```bash
npm run dev
```

The server runs on port 5000 with host 0.0.0.0 for Replit compatibility.

## Build
```bash
npm run build
```

## Recent Changes
- January 2026: Configured for Replit environment (port 5000, allowedHosts)
