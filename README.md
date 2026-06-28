# IMS Backend

Backend API for the **Inventory Management System (IMS)** built with **NestJS**, **Supabase (PostgreSQL)**, and **Bun**.

## Prerequisites

- Bun
- Node.js (if required by your environment)
- Supabase project (Development or Production)

## Installation

Install the project dependencies:

```bash
bun install
```

## Environment Variables

Create a `.env` file in the project root.

Example:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

JWT_SECRET=your_jwt_secret
PORT=3000
```

## Running the Development Server

```bash
bun run start:dev
```

The API will be available at:

```
http://localhost:3000
```

## Building the Project

```bash
bun run build
```

## Running the Production Server

```bash
bun run start:prod
```

## Database

This project uses **Supabase PostgreSQL**.

Database schema changes are managed using **Supabase Migrations**.

Common commands:

```bash
# Create a migration
supabase migration new <migration_name>

# Apply migrations
supabase db push

# Generate schema from remote
supabase db pull
```

## Tech Stack

- NestJS
- Bun
- TypeScript
- Supabase
- PostgreSQL
- JWT Authentication
- bcrypt

## License

This project is intended for internal company use.
