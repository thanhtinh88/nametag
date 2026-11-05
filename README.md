# Nametag

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

> **⚠️ Active Development Notice**
>
> Nametag is under active development and may introduce breaking changes between releases. Please read the [release notes](https://github.com/mattogodoy/nametag/releases) carefully before updating to ensure a smooth upgrade process.

Nametag is a personal relationships manager that helps you remember the people in your life and how they're connected. Track birthdays, contact information, how people are connected, and visualize your network as an interactive graph.

![Dashboard](docs/screenshots/dashboard-dark.png)
_Dashboard with network overview and statistics_

**[Try the hosted version →](https://nametag.one)**

## Screenshots

<details>
<summary>View screenshots</summary>

![Dashboard dark theme](docs/screenshots/dashboard-dark.png)
![Dashboard light theme](docs/screenshots/dashboard-light.png)
_Main dashboard with a network graph of relationships_

---

![People dark theme](docs/screenshots/people-dark.png)
![People light theme](docs/screenshots/people-light.png)
_People list page_

---

![Groups dark theme](docs/screenshots/groups-dark.png)
![Groups light theme](docs/screenshots/groups-light.png)
_Groups page_

---

![Journal dark theme](docs/screenshots/journal-dark.png)
![Journal light theme](docs/screenshots/journal-light.png)
_Journal page_

---

![Relationships dark theme](docs/screenshots/relationships-dark.png)
![Relationships light theme](docs/screenshots/relationships-light.png)
_Relationships page_

</details>

## Features

### 🔍 Criminal Investigation & Case Management
- **Case Tracking & Events**: Manage investigation cases with dedicated case codes (e.g. `VV-2026-001`), crime categories (theft, robbery, narcotics, public disorder, etc.), damage assessments, and case progression states (*Unresolved*, *Investigating*, *Solved*, *Suspended*).
- **Comprehensive Subject / Suspect Profiles**:
  - Identity verification: National Citizen ID / CCCD (date/place of issue), residence status (*Permanent*, *Temporary*, *Transient*, *Absent*, *Wanted*).
  - Risk & surveillance tiers: Management levels (*Normal*, *Surveillance*, *Key Target*) and threat levels (*Low*, *Medium*, *High*, *Armed & Dangerous*).
  - Physical marks & identifying features: Tattoos, scars, deformities, birthmarks with location and photo attachments.
  - Criminal records & history: Prior convictions and administrative penalties, sentencing details, adjudicating authorities, verdict dates, and rehabilitation/pardon status.
  - Suspect vehicles: License plate numbers, vehicle types, models, colors, custom modifications, registered owners, and suspicion flags.
  - Bank accounts & mule tracking: Associated bank accounts, account holders, account types (*Owner*, *Mule / Rent*, *Suspicious illegal proceeds*).
- **Gangs & Criminal Syndicates**: Territory / turf monitoring, syndicate descriptions, and member hierarchies (*Leader*, *Second-in-Command*, *Enforcer*, *Member*).
- **Suspect Matcher & Hypothesis Analysis**: Link subjects to cases with hypothesis states (*Hypothesis*, *Investigating*, *Confirmed*, *Ruled Out*), confidence tiers, alibi logs, and investigation date-range filters.
- **Immich Integration**: Automatic facial recognition clustering via Immich face IDs and crime-scene/CCTV evidence photo albums.

### 🗺️ Tactical Map & Evidence Spatial Analysis
- **Geocoded Map & Clustering**: Interactive MapLibre GL map with geocoded addresses, subject locations, and clustered markers.
- **CCTV Camera Surveillance**: Plot CCTV cameras with heading, field-of-view (FOV) visual cones, capture status (*Captured*, *Clear*, *Blind/Broken*), and DVR clock drift notes.
- **BTS Cell Tower Triangulation**: Cellular towers with carrier info, Cell ID / LAC, coverage radius, directional azimuth sectors, and subscriber / IMEI records.
- **Subject Routes & Trajectories**: Plot confirmed or suspected movement paths with time-calibrated waypoint scrubbing.
- **Tactical Markup Canvas**: In-map freehand pencil drawing, polygons, rectangles, circles, directional lines, and operational text annotations.

### 🕸️ Interactive Network Graphs & Link Analysis
- **Force-Directed Graph**: Visual network analysis powered by D3.js with zoom, drag, and node exploration.
- **Multi-Category Relationships**: Categorized relationships (*Criminal*, *Financial*, *Family*, *Legal Case*, *Social*) with custom line styles and directionality (bidirectional or directed).
- **Verification & Confidence Tracking**: Status (*Confirmed*, *Investigating*, *Unverified*, *Ruled Out*) and confidence indicators.
- **Tactical Filtering**: Quick-filter chips and sidebar to filter by threat level, management status, gangs, and date ranges.
- **Dual Display Modes**: Toggle between individual entity nodes and grouped bubble clusters.

### 📇 Personal CRM & Core Platform Capabilities
- **Contacts & Custom Fields**: Track people with full attributes, important dates, birthdays, contact info, and custom field templates.
- **Investigation Journal**: Timestamped notes and field encounter logs linked to subjects and cases.
- **CardDAV Two-Way Sync**: Synchronization with Google Contacts, Apple iCloud, Microsoft Outlook, and Nextcloud.
- **Data Import / Export**: Complete JSON backup/restore and vCard contact import/export.
- **Duplicate Detection & Merge**: Automatic detection of duplicate records with side-by-side merging.
- **Fuzzy Search**: Global accent-insensitive fuzzy search across subjects, cases, notes, and gangs.
- **PWA & Modern UI**: Installable Progressive Web App, dark and light themes, responsive layout, and bilingual support (English & Vietnamese).
- **REST API**: Comprehensive OpenAPI/Swagger-documented endpoints with token-based authentication.

## Getting Started & Running the Project

You can run Nametag locally for development or deploy it via Docker.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher) and `npm`
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

---

### Option 1: Local Development (Recommended)

This setup runs PostgreSQL and Redis in lightweight Docker containers while running the Next.js app natively on your host machine for fast hot-reload and smooth debugging.

#### 1. Clone the repository
```bash
git clone https://github.com/mattogodoy/nametag.git
cd nametag
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Configure environment variables
Copy the example environment file:
```bash
cp .env.example .env
```
Generate random secrets for session tokens and cron tasks:
```bash
# On Linux / macOS:
sed -i "s/your-nextauth-secret-here-minimum-32-characters/$(openssl rand -base64 32 | tr -d '\n\r')/" .env
sed -i "s/generate-a-secure-random-string-here/$(openssl rand -base64 16 | tr -d '\n\r')/" .env
```
*(The default database and Redis configurations in `.env.example` already match `docker-compose.services.yml`.)*

#### 4. Start backend services (PostgreSQL & Redis)
```bash
docker-compose -f docker-compose.services.yml up -d
```

#### 5. Initialize the database & seed demo data
Run the automated database setup script (applies migrations, generates Prisma client, and seeds sample records):
```bash
./scripts/setup-db.sh
```

#### 6. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Demo Credentials:**
- **Email**: `demo@nametag.one`
- **Password**: `password123`

---

### Option 2: Docker Compose (Full Stack / Self-Hosting)

To run the entire application (including the web app, database, Redis, and backup service) via Docker:

```bash
cp .env.example .env
# Edit .env to set your secrets and configurations
docker compose up -d
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

### Option 3: VS Code Dev Container

If you use VS Code:
1. Open the project folder in VS Code.
2. When prompted, select **Reopen in Container** (or run `Dev Containers: Reopen in Container` from the Command Palette `F1`).
3. Dependencies, database services, migrations, and seeds are prepared automatically inside the container.
4. Run `npm run dev` and open `http://localhost:3000`.

---

## Useful Development Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Next.js development server at `localhost:3000` |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint static code analysis |
| `npm run typecheck` | Run TypeScript compiler type checking without emitting files |
| `npm run test:run` | Run unit & integration tests with Vitest |
| `npm run test:coverage` | Run unit tests with code coverage report |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run verify` | Full verification suite: lint + typecheck + unit tests + build |
| `npx prisma studio` | Launch visual browser GUI to view and edit database tables |
| `npx prisma migrate dev` | Create and apply a new Prisma database migration |
| `npm run seed:dev` | Re-seed the database with development mock data |
| `docker-compose -f docker-compose.services.yml down` | Stop local development background database services |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved, and the [development setup guide](https://docs.nametag.one/contributing/development/) for detailed instructions on running Nametag locally.

## Roadmap

ℹ️ _Contributions to any of these items are very welcome! Items that require the most help will have the **[HELP NEEDED]** tag. If you want to contribute to an item that does not have a PR or Issue associated to it, please create it yoursef._

### To do

Future features and improvements, ordered by priority:

- [ ] **[HELP NEEDED]** Mobile app (Native apps for Android and iOS are preferred)
- [ ] Add support for SQLite databases
- [ ] Add notification support [[Issue #6](https://github.com/mattogodoy/nametag/issues/6)]
- [ ] Support multi-user groups [[Issue #37](https://github.com/mattogodoy/nametag/issues/37)]
- [ ] Immich integration [[Issue #46](https://github.com/mattogodoy/nametag/issues/46)]
- [ ] **[HELP NEEDED]** Additional language translations (Portuguese, Korean, etc.)

### Done

Features and improvements that have already been implemented:

- [x] ~~UI/UX improvements and accessibility enhancements~~
- [x] ~~Documentation improvements (API, deployment, functionality, development, etc)~~
- [x] ~~SMTP support~~ [[Issue #4](https://github.com/mattogodoy/nametag/issues/4), [PR #21](https://github.com/mattogodoy/nametag/pull/21)]
- [x] ~~Option to disable registration~~ [[Issue #9](https://github.com/mattogodoy/nametag/issues/9), [PR #17](https://github.com/mattogodoy/nametag/pull/17)]
- [x] ~~ARM build for docker images~~ [[Issue #14](https://github.com/mattogodoy/nametag/issues/14), [PR #18](https://github.com/mattogodoy/nametag/pull/18)]
- [x] ~~Improve development setup to make contributors' lives easier~~ [[PR #25](https://github.com/mattogodoy/nametag/pull/25)]
- [x] ~~Implement CardDAV support~~ [[Issue #15](https://github.com/mattogodoy/nametag/issues/15), [PR #82](https://github.com/mattogodoy/nametag/pull/82)]
- [x] ~~API for third-party integrations~~ [[Issue #29](https://github.com/mattogodoy/nametag/issues/29), [PR #70](https://github.com/mattogodoy/nametag/pull/70)]
- [x] ~~Add photos to people~~ [[Issue #19](https://github.com/mattogodoy/nametag/issues/19), [PR #135](https://github.com/mattogodoy/nametag/pull/135)]
- [x] ~~Add custom template titles for important dates~~ [[Issue #23](https://github.com/mattogodoy/nametag/issues/23), [PR #176](https://github.com/mattogodoy/nametag/pull/176)]
- [x] ~~Add journaling capabilities~~ [[Issue #28](https://github.com/mattogodoy/nametag/issues/28), [PR #192](https://github.com/mattogodoy/nametag/pull/192)]
- [x] ~~Implement OIDC~~ [[Issue #10](https://github.com/mattogodoy/nametag/issues/10)]
- [x] ~~Add map to show people's locations~~ [[Issue #26](https://github.com/mattogodoy/nametag/issues/26), [PR #341](https://github.com/mattogodoy/nametag/pull/341)]
- [x] ~~Full-text fuzzy search~~ [[PR #301](https://github.com/mattogodoy/nametag/pull/301)]
- [x] ~~Configurable photo compression~~ [[PR #331](https://github.com/mattogodoy/nametag/pull/331)]
- [x] ~~HEIC photo support~~ [[PR #357](https://github.com/mattogodoy/nametag/pull/357)]
- [x] ~~Messaging app quick links~~ [[PR #375](https://github.com/mattogodoy/nametag/pull/375)]
- [x] ~~PWA / installable app with offline support~~ [[PR #379](https://github.com/mattogodoy/nametag/pull/379)]
- [x] ~~Duplicate detection and contact merging~~
- [x] ~~Custom field templates~~
- [x] ~~Trash with soft-delete and restore~~
- [x] ~~Data import/export (JSON)~~
- [x] ~~Bulk operations~~
- [x] ~~Eastern name order support~~

## License

Licensed under the [GNU Affero General Public License v3.0](LICENSE). This ensures that if you modify and deploy Nametag, you must make your source code available.

## Support

- **Hosted version**: For support with the hosted service, email support@nametag.one
- **Self-hosting**: Open an issue on GitHub, or check the [docs](https://docs.nametag.one)
- **Security issues**: See [SECURITY.md](SECURITY.md)

## Support Development

If you find Nametag useful and want to support its development, you can buy me a coffee! ☕

<a href="https://www.buymeacoffee.com/mattogodoy" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

---

Built with care for people who care about people.
