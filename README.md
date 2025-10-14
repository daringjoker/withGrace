# Baby Tracker

A modern Next.js application for tracking your baby's daily activities including feeding, diaper changes, sleep patterns, and other important events with photo support.

## Features

- 🍼 **Feeding Tracking**: Monitor breastfeeding, expressed breast milk, formula feeding with amounts and duration
- 👶 **Diaper Changes**: Track wet and dirty diapers with detailed descriptions
- 😴 **Sleep Monitoring**: Log naps and night sleep periods
- 📸 **Photo Support**: Attach multiple photos to any event using UploadThing
- 📊 **Dashboard**: View daily statistics and recent activity
- 📱 **Mobile-First**: Responsive design optimized for mobile use
- 💾 **Data Persistence**: PostgreSQL database with Prisma ORM

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **File Uploads**: UploadThing
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd baby-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your UploadThing keys in `.env.local`:
   - Sign up at [UploadThing](https://uploadthing.com)
   - Create a new app and get your keys
   - Add them to your `.env.local` file:
```env
UPLOADTHING_SECRET=your_secret_here
UPLOADTHING_APP_ID=your_app_id_here
```

5. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

### Adding Events

1. Navigate to the "Add Event" page
2. Choose the type of event (Feeding, Diaper Change, Sleep, Other)
3. Fill in the required details
4. Optionally add photos
5. Save the event

### Dashboard

View your baby's daily statistics and recent activity on the main dashboard.

## Database Schema

The application uses Prisma with PostgreSQL for data persistence. Key models include:

- `BabyEvent`: Base event model
- `FeedingEvent`: Feeding-specific data
- `DiaperEvent`: Diaper change data  
- `SleepEvent`: Sleep tracking data
- `OtherEvent`: Other activities
- `EventImage`: Photo attachments

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma database browser

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `UPLOADTHING_SECRET`
   - `UPLOADTHING_APP_ID`
   - `DATABASE_URL` (use Vercel Postgres for production)
   - `NEXT_PUBLIC_APP_URL` (auto-set by Vercel)
4. Deploy

**Note:** The application is configured to use PostgreSQL. For production on Vercel, use Vercel Postgres for optimal performance.

### Other Platforms

The app can be deployed to any platform that supports Next.js applications. Make sure to:

1. Set all required environment variables
2. Run database migrations: `npx prisma db push`
3. Build the application: `npm run build`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
