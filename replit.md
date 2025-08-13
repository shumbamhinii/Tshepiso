# Pricing Calculator Application

## Overview

This is a full-stack pricing calculator application built with React (frontend) and Express.js (backend). The application helps users calculate pricing for products and services by managing costs, expenses, products, and various pricing scenarios. It features a modern UI built with shadcn/ui components and uses PostgreSQL with Drizzle ORM for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state, local React state for UI
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **API Pattern**: RESTful API with JSON responses
- **Development**: Hot reload with tsx and Vite middleware integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Drizzle Kit for schema management
- **Local Storage**: Browser localStorage for temporary data persistence

## Key Components

### Database Schema
The application uses a comprehensive schema with the following main entities:
- **Users**: Basic user authentication and management
- **Pricing Projects**: Main project containers for pricing calculations
- **Products**: Individual items with pricing parameters
- **Expenses**: Fixed and variable costs
- **Pricing Results**: Calculated pricing outputs
- **Snapshots**: Saved pricing configurations
- **Competitor Prices**: Market research data
- **What-If Scenarios**: Alternative pricing calculations
- **Budget Items**: Budget tracking and management

### Frontend Components
- **Pricing Calculator**: Main application component with tabbed interface
- **Setup Tab**: Cost and profit method configuration
- **Products Tab**: Product management with advanced options
- **Results Tab**: Pricing calculations and recommendations
- **Scenarios Tab**: What-if scenario analysis
- **Competitors Tab**: Competitor pricing comparison
- **Budget Tab**: Budget tracking and variance analysis
- **Snapshots Tab**: Configuration save/load functionality

### API Endpoints
- **Projects**: CRUD operations for pricing projects
- **Products**: Product management within projects
- **Expenses**: Cost tracking and categorization
- **Results**: Pricing calculations and analysis
- **Snapshots**: Configuration persistence
- **Scenarios**: Alternative pricing models

## Data Flow

1. **User Input**: Users configure pricing parameters through the setup tab
2. **Product Definition**: Products are added with cost and calculation methods
3. **Calculation Engine**: Custom pricing algorithms calculate optimal prices
4. **Results Display**: Comprehensive pricing analysis and recommendations
5. **Persistence**: Data is saved to PostgreSQL database
6. **Snapshots**: Complete configurations can be saved and restored

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **UI Components**: Radix UI primitives, shadcn/ui components
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Database**: Drizzle ORM, Neon Database serverless driver
- **Development**: Vite, TypeScript, ESBuild
- **Validation**: Zod schema validation
- **State Management**: TanStack Query
- **Date Handling**: date-fns
- **Icons**: Lucide React

### Development Tools
- **Build**: Vite with React plugin
- **Type Checking**: TypeScript with strict configuration
- **Database**: Drizzle Kit for migrations
- **Development Server**: Express with Vite middleware
- **Replit Integration**: Cartographer and runtime error overlay

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized React application to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: Migrations applied via Drizzle Kit
- **Environment**: NODE_ENV=production with database URL configuration

### Development Workflow
- **Local Development**: `npm run dev` starts Express server with Vite middleware
- **Database**: `npm run db:push` applies schema changes
- **Type Checking**: `npm run check` validates TypeScript
- **Hot Reload**: Vite provides fast refresh for frontend changes

### Environment Configuration
- **Database URL**: PostgreSQL connection string via DATABASE_URL environment variable
- **Production**: Node.js server serving built assets
- **Development**: Express server with Vite middleware for hot reloading

## Changelog

```
Changelog:
- July 03, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```