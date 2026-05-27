# EventHub - Premium Event Management and Ticketing System

EventHub is a full-stack event management and ticketing platform built as a professional GitHub portfolio project. It combines a premium dark Bootstrap 5 frontend with a secure Node.js, Express, MongoDB, and JWT backend.

The application supports public event discovery, user registration, ticket booking, ticket cancellation, poster uploads, and an admin dashboard for managing events and bookings.

## Portfolio Highlights

- Premium dark navy interface with glassmorphism cards and gradient accents
- Responsive landing page, event catalog, ticket dashboard, and admin workspace
- Secure JWT authentication with role-based admin authorization
- MongoDB schemas for users, events, and bookings
- Multer-based image uploads for event posters
- Atomic ticket inventory updates to reduce overselling risk
- Friendly toast notifications, loading states, and polished forms
- Automated API tests for the main user and admin flows

## Screenshots

Add screenshots to this section when publishing the project:

```text
screenshots/
  home.png
  events.png
  event-details.png
  admin-dashboard.png
  add-event.png
```

Suggested views:

- Homepage hero and featured events
- Event listing cards
- Event details and booking form
- My tickets page
- Admin dashboard metrics and recent bookings
- Add event form

## Features

- User registration and login
- JWT-protected routes
- bcryptjs password hashing
- User roles: `user` and `admin`
- Admin-only event creation, update, and deletion
- Poster image upload for events
- Public event listing and event details
- Ticket booking with available seat tracking
- Ticket cancellation with inventory restoration
- User ticket history
- Admin dashboard with total events, bookings, users, and revenue
- Recent bookings table
- Responsive UI for mobile, tablet, and desktop

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, Bootstrap 5, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT |
| Password Security | bcryptjs |
| File Uploads | multer |
| Testing | Node test runner, supertest |

## Project Structure

```text
event-management-ticketing-system/
  backend/
    config/
    middleware/
    models/
    routes/
    scripts/
    tests/
    uploads/
    server.js
    package.json
    .env.example
  frontend/
    assets/
      css/
      images/
      js/
    index.html
    login.html
    register.html
    events.html
    event-details.html
    my-tickets.html
    admin-dashboard.html
    add-event.html
  README.md
```

## Installation

Clone the repository and install backend dependencies:

```bash
cd backend
npm install
```

Create the environment file:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Start the backend:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000/api
```

## Environment Variables

Create `backend/.env` with:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/eventhub
JWT_SECRET=replace_this_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5500,http://127.0.0.1:5500

ADMIN_NAME=EventHub Admin
ADMIN_EMAIL=admin@eventhub.local
ADMIN_PASSWORD=Admin@12345
```

Use MongoDB Atlas by replacing `MONGO_URI`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/eventhub
```

## Admin Credentials

The admin account is created through the seed script. Configure these values first:

```env
ADMIN_NAME=EventHub Admin
ADMIN_EMAIL=admin@eventhub.local
ADMIN_PASSWORD=Admin@12345
```

Then run:

```bash
cd backend
npm run seed:admin
```

After seeding, log in at `frontend/login.html` using the configured admin email and password.

## Frontend Usage

Open the frontend directly:

```text
frontend/index.html
```

Or serve it with a static server:

```bash
cd frontend
npx serve .
```

By default, the frontend calls:

```text
http://localhost:5000/api
```

To change the API URL from the browser console:

```js
localStorage.setItem('eventhubApiBase', 'http://localhost:5000/api');
```

## API Routes

### Auth

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register a user |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | Authenticated | Get current user |
| GET | `/api/auth/users/count` | Admin | Get total user count |

### Events

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/events` | Public | List events |
| GET | `/api/events/:id` | Public | Get event details |
| POST | `/api/events` | Admin | Create event, supports `poster` upload |
| PUT | `/api/events/:id` | Admin | Update event, supports `poster` upload |
| DELETE | `/api/events/:id` | Admin | Delete event if it has no active bookings |

### Bookings

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/bookings` | Authenticated | Book tickets |
| GET | `/api/bookings/mine` | Authenticated | View my tickets |
| PATCH | `/api/bookings/:id/cancel` | Owner or Admin | Cancel booking |
| GET | `/api/bookings/admin` | Admin | View all bookings |

## Test Commands

Run automated API tests:

```bash
cd backend
npm test
```

The suite verifies registration, login, admin event creation, event listing, event update, booking, viewing tickets, admin booking access, cancellation, authorization, and poster upload paths.

To test against a different database:

```env
TEST_MONGO_URI=mongodb://127.0.0.1:27017/eventhub_test
```

## Sample API Flow

Register user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jane User\",\"email\":\"jane@example.com\",\"password\":\"User@12345\"}"
```

Login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"jane@example.com\",\"password\":\"User@12345\"}"
```

Create event as admin:

```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Product Summit\",\"description\":\"A conference for product teams.\",\"category\":\"Conference\",\"date\":\"2027-08-20\",\"time\":\"18:30\",\"venue\":\"Civic Hall\",\"city\":\"Chicago\",\"price\":75,\"totalTickets\":100}"
```

Book ticket:

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"<EVENT_ID>\",\"quantity\":2}"
```

Cancel ticket:

```bash
curl -X PATCH http://localhost:5000/api/bookings/<BOOKING_ID>/cancel \
  -H "Authorization: Bearer <USER_TOKEN>"
```

## GitHub Portfolio Description

EventHub is a professional full-stack event management and ticketing system built with Node.js, Express, MongoDB, Bootstrap 5, and Vanilla JavaScript. It demonstrates secure authentication, role-based access control, CRUD operations, file uploads, booking workflows, responsive UI design, and API test coverage in a clean portfolio-ready project.

## Scripts

```bash
npm start        # run backend
npm run dev      # run backend with nodemon
npm test         # run API tests
npm run seed:admin
```

## Security Notes

- Use a strong `JWT_SECRET` before deployment.
- Admin authorization is enforced on backend routes.
- Passwords are hashed before storage.
- Uploaded files are limited to common image MIME types.
- Event mutations whitelist accepted fields.
- Booking inventory updates use atomic MongoDB operations.
