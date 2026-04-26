# SahayakOS

A modern volunteer management platform that connects NGOs with qualified volunteers for crisis response and community service. SahayakOS uses AI-driven matching to optimize volunteer allocation based on skills, availability, and location.

## About

SahayakOS is built for the Google Solutions Challenge, designed to bridge the gap between NGOs needing urgent volunteer support and individuals ready to help. The platform features:

- **Volunteer Registry**: Manage volunteer profiles with skills, availability, devices, and reliability scores
- **NGO Management**: Register NGOs with coverage areas, focus areas, and verification status
- **Smart Job Matching**: Create job listings with skill requirements and urgency levels
- **City-based Dashboard**: Interactive map interface showing volunteering opportunities by location
- **Authentication**: Secure access with Clerk for both volunteers and NGO representatives
- **Availability Tracking**: Flexible time slot and hourly availability management

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org) 16.2+ with React 19, TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com) 4 + [shadcn](https://shadcn.com) components
- **Backend**: [Convex](https://convex.dev) (serverless backend as a service)
- **Authentication**: [Clerk](https://clerk.com)
- **Maps**: [Leaflet](https://leafletjs.com) for interactive map visualization
- **UI Components**: Base UI, Lucide icons, CVA for component variants

## Quick Start

### Prerequisites

- Node.js 18+ (or Bun)
- npm or bun package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ps1
```

2. Install dependencies:
```bash
npm install
# or with bun
bun install
```

3. Set up environment variables:
```bash
# Copy the example env file
cp .env.example .env.local
```

Configure the following:
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- City map configurations for dashboard display

### Development

Run the development server:

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app will auto-reload as you make changes.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Validate TypeScript and generate route types

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page with city map dashboard
│   ├── login/             # Authentication pages
│   ├── signup/
│   ├── profile/           # User profile management
│   ├── ngo/               # NGO-specific pages
│   ├── pwreset/           # Password reset flow
│   └── layout.tsx         # Root layout with providers
├── components/            # Reusable React components
├── lib/                   # Utility functions and helpers
├── convex/                # Backend API and data schema
│   ├── schema.ts          # Convex data schema (volunteers, NGOs, listings)
│   ├── auth.config.ts     # Authentication configuration
│   ├── volunteers.ts      # Volunteer queries/mutations
│   ├── ngos.ts            # NGO queries/mutations
│   ├── jobListings.ts     # Job listing queries/mutations
│   └── volunteerAccounts.ts
├── public/                # Static assets
└── [config files]
```

## Core Data Models

### Volunteers
- Personal information (name, age, location)
- Skills and languages spoken
- Availability (time slots or hourly)
- Devices (camera, PC, smartphone)
- Contact details
- Reliability score and rating

### NGOs
- Organization details (name, registration ID)
- Coverage areas and focus areas
- Point of contact information
- Verification and reliability scores
- Volunteer treatment score

### Job Listings
- Title, location, duration
- Urgency level (low, medium, high, critical)
- Required skills with priority matrix
- Volunteers needed and allocated
- Status tracking (open, filled, closed)

## Authentication Flow

The application uses Clerk for authentication with separate flows for:
- **Volunteers**: Sign up, profile creation, availability setup
- **NGO Representatives**: Register organization, manage job listings

Authentication is integrated with Convex via tokenIdentifier mapping.

## Development Workflow

### Type Checking

Validate all TypeScript:
```bash
npm run typecheck
```

This generates Next.js route types and runs the full type checker.

### Linting

Check code quality:
```bash
npm run lint
```

### Database Schema

The Convex schema is defined in `convex/schema.ts`. Key features:
- Indexed tables for efficient queries by location, urgency, skills
- Support for flexible availability definitions
- Relationship tracking between users, accounts, and listings

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

### Docker

A Dockerfile can be added for containerized deployment.

## Contributing

1. Create a feature branch (`git checkout -b feature/your-feature`)
2. Make your changes and test locally
3. Run linting and type checking
4. Commit and push to GitHub
5. Create a pull request

## Support & Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://convex.dev/docs)
- [Clerk Authentication Guide](https://clerk.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## License

[Specify your license here]

## Acknowledgments

Built for the Google Solutions Challenge to support crisis response and community volunteerism.
