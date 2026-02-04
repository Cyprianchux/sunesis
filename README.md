# Sunesis — Intelligent Learning & Knowledge Presentation Platform

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

### Slide View Mode

![Slide View](screenshots/slide-page.png)

### Web View Mode

![Web View](screenshots/web-page.png)

### User Home Page

![User Home Page](screenshots/account-page.png)

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

- Search across:
- - Slide titles
- - Descriptions
- - Topics
- Works in:
- - Admin dashboard (Setup)
- - Slide view
- - Web view

### Persistent Storage

- Uses IndexedDB for high-performance browser storage
- Data persists across sessions
- No server required

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

**Layer** - **Technology Used**
**Frontend:** HTML5, CSS#, JavaScript
**Storage:** IndexedDB
**Security:** Web Crypto API (SHA-256)
**Architecture:** Client-side style
**UI Icons:** Font Awesome

---

## Security Note (Important)

Sunesis uses browser storage for learning and demonstration purposes.

It is **not intended for sensitive or production-level data**.

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

''' 3. Viewing Logic

- Slide View filters by topic and navigates one-by-one
- Web View displays all slides as content sections
- Search filters cached data instantly

---

## User Flow

- Register or login
- Create or view topics
- Add slides with content/media
- View content via:
- - Slide View
- - Web View
- Search & manage knowledge

---

## Security Notes

- Passwords never stored in plain text
- Hashed using SHA-256
- Session based access control
- Remember-me stored separately
- For production: backend auth is recommended

---

## Author

Developed by **CyprianchuX**

---

## License

This project is for educational and learning purposes.
