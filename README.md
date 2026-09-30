# Sunesis — Intelligent Learning & Knowledge Presentation Platform

#### Click <a href="https://sunesis.vercel.app">here</a> to view the website.

## What is Sunesis?

**Sunesis** is a simple, easy-to-use learning and presentation web platform. It allows users to:

- Create an account or log in
- Create Topic(s) and add slide(s)
- Select learning topics
- View organized presentations in both slide and web mode
- Continue learning without needing technical setup or downloads

Sunesis is designed to be lightweight, fast, and accessible directly from a web browser.

---

## Who is Sunesis for?

Sunesis is built for:

- Students and learners
- Educators and presenters
- Anyone who wants structured, topic-based content in a clean interface

No technical knowledge is required to use the platform.

---

## How Sunesis Works (Simple Explanation)

1. You open the Sunesis website
2. You log in or register using a username and password
3. You choose a topic (created by you or existing users)
4. You view slides/contents related to that topic
5. Your login can be remembered on your device if you choose

All data is stored safely in your browser. No external servers are required.

---

## Screenshots

### Home page

![Homepage](screenshots/login-register-page.png)

### Features

![Features](screenshots/features.png)

### User Home Page

![User Home Page](screenshots/account-page.png)

### Slide View Mode

![Slide View](screenshots/slide-page.png)

### Web View Mode

![Web View](screenshots/web-page.png)

---

## Features

### Topic & Slide Management

- Create unlimited learning topics
- Add text, images, and videos to slides
- Organize slides by topic
- Delete individual slides or entire topics

### Multiple Viewing Modes

- Slide View Mode — focused presentation, one slide at a time
- Web View Mode — full content browsing like a knowledge website

### Smart Search

**Search across:**

- Slide titles
- Descriptions
- Topics
  **Works in:**
- Admin dashboard (Setup)
- Slide view
- Web view

### Persistent Storage

- Supabase PostgreSQL stores registered users, topics, and slides
- IndexedDB keeps a local copy for offline reading and editing
- Local changes automatically sync when the connection returns

### Authentication System

- Secure password hashing (SHA-256)
- Login & registration system
- Remember-me functionality
- Session & local storage guards

### Modern UI/UX

- Responsive layout
- Feature-based homepage
- Smooth scrolling
- Mobile optimized

---

## Tech Stack

### Layer & Technology Used

**Frontend:** HTML5, CSS3, JavaScript
**Storage:** Supabase PostgreSQL + IndexedDB offline cache
**Security:** Web Crypto API (SHA-256)
**Architecture:** Client-side style
**UI Icons:** Font Awesome

---

## Local development

The frontend and API run in separate terminals. Install the frontend
dependencies and start the development server:

```powershell
pnpm install
pnpm dev
```

Vite serves the frontend at `http://localhost:5173`. In a second terminal, go
to the sibling `sunesis-api` directory, install its dependencies, configure
`.env` from `.env.example`, and run `pnpm start` to serve the API at
`http://localhost:3000`. The frontend connects to that local API automatically.
The frontend's API unit and end-to-end tests also load the backend from that
sibling directory.

The API needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET`.
Configure SMTP values to send verification and password-reset emails; set
`BASE_URL` to the frontend URL so those email links open the frontend. Keep
server-side secrets out of the frontend. Public registration always creates a
`user`; create or promote the admin account privately in Supabase.

In production, the frontend uses its `/api` route, which Vercel proxies to the
Sunesis API project. If that project has a different domain from
`sunesis-api.vercel.app`, update the destination in `vercel.json` and redeploy.

---

## How It Works

1. Topics
   Topics are stored in IndexedDB:

`topics = { name: "About Sunesis" }`

2. Slides
   Slides are linked to topics:

```
{
  id: 1,
  topic: "About Sunesis",
  title: "Sunesis Platform",
  desc: "Learning to use the platform",
  media: "base64-data",
  type: "image"
}
```

3. Viewing Logic

- Slide View filters by topic and navigates one-by-one
- Web View displays all slides as content sections
- Search filters cached data instantly

---

## User Flow

- Register or login
- Create or view topics
- Add slides with content/media
- View content via:
  - Slide View
  - Web View
- Search & manage knowledge

---

## Security Notes

- Passwords never stored in plain text
- Hashed using SHA-256
- Session based access control
- Remember-me stored separately
- Usernames are case-insensitive for login (stored in lowercase, displayed with first letter capitalized)
- For production: backend auth is recommended

## Recent Updates

- **Authentication Improvements**: Enhanced auth guard with shared helpers for consistent access control across pages
- **Case-Insensitive Usernames**: Login and registration now handle usernames case-insensitively while displaying them with proper capitalization
- **UI Validation**: Password validation colors reset to invalid state on errors or input clearing for better user feedback
- **Code Refactoring**: Improved code organization with reusable auth functions

---

## Author

Owned and Developed by **CyprianchuX**
