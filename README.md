# Nametag

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

> **⚠️ Active Development Notice**
>
> Nametag is under active development and may introduce breaking changes between releases. Please read the [release notes](https://github.com/mattogodoy/nametag/releases) carefully before updating to ensure a smooth upgrade process.

Nametag is an open-source personal relationships manager (PRM) that helps you remember the people in your life and how they're connected. Track birthdays, contact information, personal notes, interaction history, and visualize your social network as an interactive force-directed graph.

![Dashboard](docs/screenshots/dashboard-dark.png)
_Dashboard with network overview and statistics_

**[Try the hosted version →](https://nametag.one)** | **[Documentation →](https://docs.nametag.one)**

---

## Table of Contents / Mục lục

- [English](#features)
  - [Features Overview](#features)
  - [Tech Stack](#tech-stack)
  - [Quick Start (Self-Hosted with Docker)](#quick-start-self-hosted)
  - [Local Development Setup](#local-development-setup)
  - [Useful Commands](#useful-commands)
- [🇻🇳 Hướng Dẫn Chi Tiết (Tiếng Việt)](#-hướng-dẫn-chi-tiết-tiếng-việt)
  - [1. Phân Tích Tính Năng Của Dự Án](#1-phân-tích-tính-năng-của-dự-án)
  - [2. Hướng Dẫn Cài Đặt & Chạy Dự Án](#2-hướng-dẫn-cài-đặt--chạy-dự-án)
  - [3. Cấu Hình Biến Môi Trường (.env)](#3-cấu-hình-biến-môi-trường-env)
  - [4. Các Lệnh Scripts Hữu Ích](#4-các-lệnh-scripts-hữu-ích)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **People Management**: Flexible contact profiles (full name, nickname, birthdays, custom important dates, photos with crop & auto-compression, HEIC support, Eastern name order, and customizable custom fields/templates).
- **Interactive Network Graph**: Force-directed graphs powered by D3.js. View your entire network from the dashboard, or inspect individual connections centered around specific people.
- **Relationship Mapping**: Bidirectional relationships (parent/child, sibling, spouse, friend, coworker) with customizable labels, types, and colors.
- **Custom Groups & Bulk Actions**: Organize contacts into groups, with bulk deletion, bulk group assignment, and relationship creation.
- **Interactive Geocoded Map**: Interactive map powered by MapLibre GL and Nominatim geocoder to visualize contact locations and clusters worldwide.
- **Journal & Timeline**: Log meetings, conversations, and personal notes associated with one or multiple contacts over time.
- **Smart Reminders & Notifications**: Birthday and anniversary alerts with configurable lead times, stay-in-touch reminders, weekly email digests, via Resend/SMTP or Web Push (VAPID).
- **CardDAV Synchronization**: Two-way sync with Google Contacts, Apple iCloud, Microsoft Outlook, and Nextcloud.
- **Import / Export**: Full data backup and restore via JSON and vCard (.vcf) formats.
- **Duplicate Detection & Merging**: Find similar or duplicate contacts and merge them cleanly.
- **Global Fuzzy Search**: Real-time accent-insensitive fuzzy search powered by MiniSearch.
- **Trash & Soft-Delete**: Safe deletion with full restore capabilities and permanent purge options.
- **Authentication & Security**: Email/password authentication, OIDC / SSO support (Authentik, Keycloak, etc.), registration disabling flag, rate limiting (In-memory or Redis), and RESTful API with OpenAPI token auth.
- **PWA & Offline Capability**: Installable Progressive Web App with offline notice and local caching.
- **Multi-language Support**: English, Spanish, French, German, Italian, Dutch, Norwegian, Russian, Chinese, and Japanese.
- **Dark & Light Mode**: Complete theme customization.

---

## Tech Stack

- **Frontend & Backend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, `@tailwindcss/typography`
- **Database & ORM**: PostgreSQL 16, Prisma ORM 7
- **Graph Visualization**: D3.js (d3-force, d3-zoom, d3-drag, d3-selection)
- **Map & Geocoding**: MapLibre GL, OpenStreetMap Nominatim
- **Search**: MiniSearch (in-memory client/server fuzzy search)
- **Auth**: NextAuth v5 (Auth.js) with bcryptjs and OIDC SSO
- **Cache & Rate Limiting**: Redis (via ioredis) with in-memory fallback
- **Email & Push Notifications**: Nodemailer (SMTP), Resend API, Web-Push (VAPID)
- **Image Processing**: Sharp, heic-convert, react-easy-crop
- **Testing**: Vitest, React Testing Library, Playwright (E2E)

---

## Quick Start (Self-Hosted)

For production or personal self-hosting, running via Docker Compose is recommended:

```bash
# 1. Clone repository or create a directory
git clone https://github.com/mattogodoy/nametag.git
cd nametag

# 2. Copy and configure environment variables
cp .env.example .env

# Generate secrets and insert into .env:
# NEXTAUTH_SECRET=$(openssl rand -base64 32)
# CRON_SECRET=$(openssl rand -base64 16)

# 3. Start services with Docker Compose
docker compose up -d
```

Visit `http://localhost:3000` to create your initial admin account.

---

## Local Development Setup

To run and develop Nametag on your local machine:

### Prerequisites

- **Node.js**: v20 or later
- **Docker & Docker Compose**: For running local PostgreSQL and Redis
- **npm** (or pnpm/yarn)

### Step 1: Start Database & Redis Services

Run the development services container (starts PostgreSQL on port 5432 and Redis on 6379):

```bash
docker compose -f docker-compose.services.yml up -d
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Ensure the following default values exist in your `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nametag_db
DB_USER=nametag
DB_PASSWORD=nametag_dev_password

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-string-min-32-chars
CRON_SECRET=generate-a-random-cron-secret-min-16-chars
```

### Step 4: Run Migrations and Seed Demo Data

```bash
# Apply database migrations
npx prisma migrate dev

# Seed database with demo user and sample contacts
npm run seed:dev
```

*Default Demo Credentials:*
- **Email**: `demo@nametag.one`
- **Password**: `password123`

### Step 5: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js local development server |
| `npm run build` | Build production bundle |
| `npm run start` | Run built production app |
| `npm run lint` | Run ESLint checks |
| `npm run typecheck` | Run TypeScript type checks (`tsc --noEmit`) |
| `npm run test` | Run tests interactively with Vitest |
| `npm run test:run` | Run test suite once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run verify` | Run lint, typecheck, unit tests, and build check |
| `npm run seed:dev` | Seed database with sample contacts and demo user |
| `npm run generate-vapid-keys` | Generate VAPID keypair for Web Push notifications |

---

# 🇻🇳 Hướng Dẫn Chi Tiết (Tiếng Việt)

## 1. Phân Tích Tính Năng Của Dự Án

**Nametag** là một hệ thống **Quản lý Mối quan hệ Cá nhân (Personal Relationship Manager - PRM)** mã nguồn mở hiện đại, được xây dựng bằng Next.js 16 và PostgreSQL. Khác với các ứng dụng danh bạ thông thường chỉ lưu số điện thoại, Nametag tập trung vào việc **xây dựng, ghi nhớ và trực quan hóa toàn bộ mạng lưới các mối quan hệ** xung quanh bạn.

### Các Phân Hệ Tính Năng Cốt Lõi:

#### 1. Quản lý Danh bạ Toàn diện (People Management)
- **Hồ sơ chi tiết**: Họ tên, biệt danh, ngày sinh nhật, ảnh chân dung, địa chỉ, số điện thoại, email, mạng xã hội.
- **Thứ tự tên linh hoạt (Eastern Name Order)**: Hỗ trợ hiển thị Họ trước Tên sau phù hợp văn hóa Á Đông (Việt Nam, Nhật Bản, Trung Quốc,...).
- **Trường dữ liệu tùy biến (Custom Fields & Templates)**: Tự do tạo thêm các thuộc tính lưu trữ theo nhu cầu (sở thích cá nhân, ngày kết nạp, cỡ giày/áo, link mạng xã hội,...).
- **Xử lý ảnh chuyên nghiệp**: Trình cắt ảnh trực quan (`react-easy-crop`), tự động nén ảnh tối ưu dung lượng (`sharp`), hỗ trợ ảnh HEIC/HEIF trực tiếp từ iPhone.
- **Lối tắt liên lạc nhanh (Quick Links)**: Bấm gọi điện hoặc mở ngay cuộc trò chuyện qua WhatsApp, Telegram, Signal,...
- **Theo dõi lần gặp gần nhất (Last Contact)**: Đánh dấu và cập nhật nhanh lần liên lạc mới nhất để không quên giữ kết nối.

#### 2. Mạng Lưới Quan Hệ & Đồ Thị Tương Tác (Network Graph & D3.js)
- **Quan hệ hai chiều**: Định nghĩa liên kết giữa các cá nhân (Cha - Con, Vợ - Chồng, Anh em, Đồng nghiệp, Bạn học,...).
- **Tùy biến quan hệ**: Đặt tên quan hệ, màu sắc hiển thị riêng biệt.
- **Biểu đồ mạng lưới (Interactive Force-directed Graph)**:
  - **Graph toàn cảnh (Dashboard)**: Người dùng ở trung tâm, tỏa ra toàn bộ mạng lưới các mối liên hệ xã hội.
  - **Graph cá nhân (Person Network)**: Xem mạng lưới quan hệ bao quanh một người cụ thể.
  - Hỗ trợ thao tác kéo thả node, zoom, pan, lọc theo nhóm màu sắc.

#### 3. Bản Đồ Tương Tác (Geocoded Map View)
- Tích hợp **MapLibre GL** và dịch vụ định vị địa lý **OpenStreetMap Nominatim**.
- Tự động chuyển đổi địa chỉ thành tọa độ và cắm mốc lên bản đồ thế giới.
- Hỗ trợ gom cụm (Clustering) khi thu nhỏ bản đồ và nhận diện những người cùng sống tại một địa điểm (Colocation).

#### 4. Nhật Ký & Dòng Thời Gian (Journal & Timeline)
- Ghi lại nhật ký các sự kiện, cuộc trò chuyện, buổi cà phê hay những kỷ niệm đáng nhớ.
- Gắn thẻ (tag) một hoặc nhiều người vào bài viết để dễ dàng tra cứu lịch sử tương tác về sau.
- Trình soạn thảo ghi chú hỗ trợ định dạng Markdown.

#### 5. Nhắc Nhở & Thông Báo Đa Kênh (Reminders & Notifications)
- Nhắc ngày sinh nhật, ngày kỷ niệm quan trọng (Upcoming dates) trước số ngày tùy chọn (Lead time).
- Nhắc nhở định kỳ giữ liên lạc đối với những người quan trọng.
- Bản tin tổng hợp hàng tuần (Weekly Digest).
- Hỗ trợ gửi thông báo qua **Email** (SMTP hoặc Resend API) và **Web Push Notifications** (chuẩn VAPID trực tiếp về điện thoại/trình duyệt).

#### 6. Đồng Bộ CardDAV & Nhập/Xuất Dữ Liệu
- **Đồng bộ 2 chiều qua CardDAV**: Tương thích danh bạ Google Contacts, Apple iCloud, Microsoft Outlook, Nextcloud.
- **Nhập / Xuất**: Xuất và nhập toàn bộ danh bạ qua định dạng chuẩn **vCard (.vcf)** và **JSON**.
- **Phát hiện & Hợp nhất trùng lặp (Duplicate Detection & Merge)**: Thuật toán tự động tìm các liên hệ bị trùng lặp và cung cấp giao diện so sánh để gộp thông tin một cách an toàn.

#### 7. Tìm Kiếm Thông Minh & An Toàn Dữ Liệu
- **Tìm kiếm mờ (Fuzzy Search)**: Tìm kiếm tức thì theo thời gian thực bằng MiniSearch, không phân biệt dấu tiếng Việt hay chữ hoa/chữ thường.
- **Thùng rác & Xóa mềm (Trash & Soft-delete)**: Dữ liệu xóa được chuyển vào thùng rác, có thể khôi phục lại bất kỳ lúc nào hoặc xóa vĩnh viễn khi cần.

#### 8. Bảo Mật & Xác Thực (Security & Auth)
- Mã hóa mật khẩu với `bcryptjs`.
- Hỗ trợ **SSO / OIDC** (Authentik, Keycloak, Pocket-ID, Google, v.v.).
- Tùy chọn khóa đăng ký sau tài khoản quản trị đầu tiên (`DISABLE_REGISTRATION=true`).
- Cơ chế giới hạn tần suất yêu cầu (Rate Limiting) phòng chống tấn công brute-force qua Redis hoặc bộ nhớ in-memory.
- Cung cấp **RESTful API** với chuẩn **OpenAPI Specification** và quản lý API Token.

#### 9. Trải Nghiệm Ứng Dụng (PWA & Đa Ngôn Ngữ)
- Hỗ trợ cài đặt thành ứng dụng trên điện thoại (iOS, Android) và máy tính thông qua công nghệ **PWA (Progressive Web App)**.
- Giao diện Dark Mode và Light Mode hiện đại, mượt mà.
- Hỗ trợ 10 ngôn ngữ khác nhau trên thế giới.

---

## 2. Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu Cầu Tiên Quyết (Prerequisites)
- **Node.js**: Phiên bản 20 trở lên (`node -v`).
- **Docker & Docker Compose**: Dùng để chạy PostgreSQL và Redis (`docker -v`, `docker compose version`).

---

### Phương Án 1: Chạy Nhanh Cho Triển Khai (Self-Hosted qua Docker)

Nếu bạn chỉ muốn triển khai để sử dụng thực tế (Production / Homelab):

1. **Chuẩn bị file cấu hình:**
   ```bash
   cp .env.example .env
   ```
   Mở file `.env` và tạo hai chuỗi bảo mật ngẫu nhiên:
   ```bash
   # Tạo NEXTAUTH_SECRET (tối thiểu 32 ký tự)
   openssl rand -base64 32
   # Tạo CRON_SECRET (tối thiểu 16 ký tự)
   openssl rand -base64 16
   ```
   Dán các chuỗi vừa tạo vào biến `NEXTAUTH_SECRET` và `CRON_SECRET` trong `.env`.

2. **Khởi chạy container:**
   ```bash
   docker compose up -d
   ```

3. **Truy cập ứng dụng:**
   Mở trình duyệt truy cập: `http://localhost:3000` và đăng ký tài khoản quản trị viên đầu tiên.

---

### Phương Án 2: Chạy Môi Trường Lập Trình (Local Development)

Nếu bạn là lập trình viên muốn chỉnh sửa code, tính năng và giao diện:

#### Bước 1: Khởi động cơ sở dữ liệu PostgreSQL & Redis
Dự án đã chuẩn bị sẵn file `docker-compose.services.yml` chỉ chứa PostgreSQL và Redis:
```bash
docker compose -f docker-compose.services.yml up -d
```
*(Lệnh này sẽ khởi chạy Postgres tại cổng `5432` và Redis tại cổng `6379`).*

#### Bước 2: Cài đặt thư viện dependencies
```bash
npm install
```

#### Bước 3: Tạo file cấu hình môi trường `.env`
Sao chép từ file mẫu:
```bash
cp .env.example .env
```
Các thông số mặc định cho môi trường dev đã khớp với `docker-compose.services.yml`:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=nametag_db`
- `DB_USER=nametag`
- `DB_PASSWORD=nametag_dev_password`
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=your-random-secret-key-at-least-32-characters`
- `CRON_SECRET=your-random-cron-secret-at-least-16-characters`

#### Bước 4: Đồng bộ Database Schema và Tạo dữ liệu mẫu (Seed)
Chạy Prisma migration để tạo bảng trong PostgreSQL:
```bash
npx prisma migrate dev
```

Chạy lệnh seed để nạp dữ liệu mẫu và tài khoản demo:
```bash
npm run seed:dev
```
> **Tài khoản đăng nhập thử nghiệm:**
> - **Email**: `demo@nametag.one`
> - **Mật khẩu**: `password123`

#### Bước 5: Chạy máy chủ phát triển (Dev Server)
```bash
npm run dev
```
Mở trình duyệt tại địa chỉ: **[http://localhost:3000](http://localhost:3000)**.

---

### Phương Án 3: Sử dụng VS Code Dev Containers
Nếu bạn dùng Visual Studio Code và extension **Dev Containers**:
1. Mở thư mục dự án trong VS Code.
2. Nhấn tổ hợp `Ctrl + Shift + P` (hoặc `Cmd + Shift + P` trên Mac) và chọn **"Dev Containers: Reopen in Container"**.
3. VS Code sẽ tự động thiết lập toàn bộ môi trường Node.js, Postgres và Redis.
4. Mở terminal trong VS Code và gõ `npm run dev`.

---

## 3. Cấu Hình Biến Môi Trường (.env)

| Biến Môi Trường | Ý Nghĩa / Giá Trị Mặc Định | Ghi Chú |
|---|---|---|
| `DB_HOST`, `DB_PORT` | `localhost`, `5432` | Địa chỉ host và port của PostgreSQL |
| `DB_NAME`, `DB_USER` | `nametag_db`, `nametag` | Tên cơ sở dữ liệu và tài khoản kết nối |
| `DB_PASSWORD` | `nametag_dev_password` | Mật khẩu kết nối cơ sở dữ liệu |
| `NEXTAUTH_URL` | `http://localhost:3000` | URL gốc của ứng dụng (đổi thành domain thật khi chạy production) |
| `NEXTAUTH_SECRET` | Chuỗi ngẫu nhiên $\ge$ 32 ký tự | Khóa bí mật mã hóa phiên đăng nhập JWT |
| `CRON_SECRET` | Chuỗi ngẫu nhiên $\ge$ 16 ký tự | Khóa xác thực các tác vụ định kỳ (Cron jobs) |
| `DISABLE_REGISTRATION` | `false` (hoặc `true`) | Đặt `true` để chặn đăng ký tự do sau tài khoản đầu tiên |
| `SMTP_HOST`, `SMTP_PORT` | Cấu hình SMTP | Tùy chọn gửi email thông báo qua máy chủ SMTP |
| `RESEND_API_KEY` | `re_xxx` | Tùy chọn gửi email thông báo qua Resend API |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Tạo qua `npm run generate-vapid-keys` | Kích hoạt tính năng Web Push Notifications |
| `REDIS_URL` | `redis://:password@localhost:6379` | Tùy chọn sử dụng Redis cho bộ đệm và rate-limiting |

---

## 4. Các Lệnh Scripts Hữu Ích

```bash
# Kiểm tra định dạng và quy chuẩn mã nguồn
npm run lint

# Kiểm tra lỗi kiểu dữ liệu TypeScript
npm run typecheck

# Chạy kiểm thử tự động (Unit / Integration tests)
npm run test:run

# Chạy kiểm thử End-to-End với Playwright
npm run test:e2e

# Biên dịch ứng dụng cho Production
npm run build

# Kiểm tra tổng thể toàn bộ dự án trước khi commit (Lint + Typecheck + Test + Build)
npm run verify

# Tạo cặp khóa VAPID cho Push Notification
npm run generate-vapid-keys
```

---

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

## Roadmap

ℹ️ _Contributions to any of these items are very welcome! Items that require the most help will have the **[HELP NEEDED]** tag. If you want to contribute to an item that does not have a PR or Issue associated to it, please create it yourself._

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

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved, and the [development setup guide](https://docs.nametag.one/contributing/development/) for detailed instructions on running Nametag locally.

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
