# LearnEnglish API

Express 5 and MongoDB Atlas backend for the LearnEnglish project.

## Requirements

- Node.js 20 or newer
- MongoDB Atlas URI in `atlas-credentials.env`

The existing `atlas-credentials.env` is loaded automatically from this folder. The API reads `MONGODB_URI`; it does not print the URI to the terminal. Keep the credential file private. It is listed in `.gitignore`.

## Run

```powershell
npm install
npm run dev
```

The server listens on `http://localhost:5000` by default. Override `PORT` or `ATLAS_ENV_FILE` in the environment if needed. Set `CORS_ORIGIN` to a comma-separated list of allowed frontend origins; when unset, CORS accepts any origin for local development.

The server also loads an optional ignored `.env` file for app settings. Start from `.env.example` and put `JWT_SECRET`, `FRONTEND_URL`, admin seed values, and optional SMTP settings there. Development derives a stable JWT key from the private Atlas URI when `JWT_SECRET` is absent; production requires a separate `JWT_SECRET`.

## Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API and database status |
| POST | `/api/auth/register` | Register a student and return a JWT session |
| POST | `/api/auth/login` | Authenticate and return a JWT session |
| GET | `/api/auth/me` | Read the signed-in account (`Authorization: Bearer <token>`) |
| POST | `/api/auth/forgot-password` | Create a one-time password reset link |
| POST | `/api/auth/reset-password` | Set a new password with a valid reset token |
| GET, POST | `/api/stories` | List and create stories |
| GET, PATCH, DELETE | `/api/stories/:id` | Read, update, and delete a story |
| GET, POST | `/api/topics` | List and create topics |
| PATCH, DELETE | `/api/topics/:id` | Update and delete a topic |
| GET | `/api/users` | List users; supports `q` and `status` filters |
| GET | `/api/users/:id` | Read a user |
| PATCH | `/api/users/:id/status` | Set a user to `active` or `blocked` |

Story listing supports `q`, `topic`, `status`, `page`, and `limit` query parameters. A topic with stories cannot be deleted. Story status values are `draft` and `published`; topic status values are `active` and `inactive`.

## Authentication setup

Registration and login issue seven-day JWTs. Passwords are hashed with bcrypt; reset tokens are stored as hashes, expire after 30 minutes, and invalidate existing JWTs when used. Auth endpoints are rate-limited. Admin APIs require a JWT for a user with the `admin` role.

Create an ignored `.env` file with a unique `JWT_SECRET` (32+ random bytes), `FRONTEND_URL`, and optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Without SMTP, development responses include a reset link for local testing; production never returns that link.

To create or update the first admin, run `npm run seed:admin` in an interactive terminal. It prompts for name and email, then asks for the password with terminal input hidden. Alternatively, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 12 characters) in `.env`. The seed command hashes the password before writing it to MongoDB.

## Security note

These routes are a development scaffold and are not authenticated yet. Do not expose them publicly until authentication and admin authorization middleware are added. User records store `passwordHash`, never a plaintext password.