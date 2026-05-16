# InboxPilot: AI Email Assistant SaaS

InboxPilot is a full-stack university SaaS project for helping users manage Gmail messages with AI. Users can register, log in, connect Gmail through Google OAuth, view recent emails, summarize selected messages, extract tasks and deadlines, and generate AI suggested replies.

The safety boundary is important: InboxPilot does not automatically send emails. AI replies are shown as AI suggested replies so the user can review, edit, copy, or delete them.

## Tech Stack

- Frontend: React.js with Tailwind CSS
- Backend: Node.js with Express.js
- Database: MongoDB
- Authentication: JWT and Google OAuth 2.0
- Email API: Gmail API with read-only access
- AI API: Gemini API
- Language: JavaScript

## Project Structure

```text
.
├── .kiro/
│   └── steering/             # Kiro AI project context
├── inboxpilot/
│   ├── client/
│   │   └── src/
│   │       ├── components/   # Reusable React UI components
│   │       ├── pages/        # App screens such as login, dashboard, email detail
│   │       └── services/     # API client and frontend service helpers
│   └── server/
│       ├── config/           # Database, OAuth, and app configuration
│       ├── controllers/      # Express request handlers
│       ├── middleware/       # Auth, error handling, validation
│       ├── models/           # MongoDB/Mongoose schemas
│       ├── routes/           # Express route definitions
│       └── services/         # Gmail, Gemini, auth, and business logic
├── .env.example              # Safe environment variable template
├── .gitignore
└── InboxPilot_University_Project_Document_Improved.md
```

## Core MVP Features

- User registration, login, logout, and profile view
- JWT-protected app routes
- Google OAuth Gmail connection
- Gmail read-only recent email listing
- Email detail view
- AI email summarization
- AI task, deadline, and priority extraction
- AI suggested reply generation with user-selected tone
- Task management
- AI suggested reply management
- Dashboard summary cards
- Settings page for Gmail connection status

## Environment Setup

Copy `.env.example` to `.env` and fill in local development values.

```bash
cp .env.example .env
```

Never commit real API keys, OAuth secrets, JWT secrets, MongoDB credentials, or generated tokens.

## Development Notes

- Keep Gmail scope read-only unless the project requirements change.
- Keep AI reply generation manual-review only; do not add automatic sending.
- Put frontend code under `inboxpilot/client`.
- Put backend code under `inboxpilot/server`.
- Keep integration logic inside `server/services` so controllers stay simple.
- Update `.kiro/steering/project-context.md` when major architecture decisions change.

## Reference Document

The full project specification is in:

`InboxPilot_University_Project_Document_Improved.md`
