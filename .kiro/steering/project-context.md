# InboxPilot Project Context

InboxPilot is a full-stack AI Email Assistant SaaS for a university software engineering project.

## Product Goal

Help users understand and organize Gmail messages faster by summarizing selected emails, extracting tasks and deadlines, and generating AI suggested replies.

## Safety Rule

Do not implement automatic email sending. The app may generate an AI suggested reply, but the user must review and manually decide what to do with it.

## Stack

- React.js frontend with Tailwind CSS
- Node.js and Express.js backend
- MongoDB database
- JWT auth
- Google OAuth 2.0
- Gmail API using read-only scope
- Gemini API for summaries, task extraction, and AI suggested reply generation
- JavaScript across the app

## Folder Ownership

- `inboxpilot/client/src/components`: reusable UI components
- `inboxpilot/client/src/pages`: route-level screens
- `inboxpilot/client/src/services`: frontend API calls and browser-side service wrappers
- `inboxpilot/server/config`: database, OAuth, and environment config
- `inboxpilot/server/controllers`: Express request handlers
- `inboxpilot/server/middleware`: auth, validation, error, and security middleware
- `inboxpilot/server/models`: MongoDB/Mongoose schemas
- `inboxpilot/server/routes`: Express routers
- `inboxpilot/server/services`: Gmail API, Gemini API, and business logic

## Expected MVP Screens

- Login
- Register
- Dashboard
- Email list
- Email detail
- Tasks
- AI suggested replies
- Settings/profile

## Expected Backend Areas

- Auth routes and controllers
- Google OAuth callback handling
- Gmail read-only email fetching
- AI summary/task/reply endpoints
- Task persistence
- AI suggested reply persistence
- User profile and Gmail connection status

## Environment

Use `.env.example` as the source of required environment variables. Real secrets belong only in `.env`, which is ignored by Git.

## Reference

The detailed project specification is in `InboxPilot_University_Project_Document_Improved.md`.
