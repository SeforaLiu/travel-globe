# Testing Strategy

This document describes the testing approach used in this project.

## 1. Testing Scope

The following areas are covered:

- Backend API testing (FastAPI)
- Authentication & authorization
- Core business flows (diary / mood / AI generation)
- Manual UI testing for frontend

The following areas are intentionally not covered:

- Three.js rendering details
- Visual appearance and animations
- Browser compatibility matrix

---

## 2. Backend Testing

### Tools

- pytest
- FastAPI TestClient
- SQLite (test environment)

### Covered Scenarios

- Health check
- User login and JWT authentication
- Authorized / unauthorized access
- Core CRUD APIs
- Basic error handling

Backend tests are located in:

backend/tests/

---

## 3. Frontend Testing

Due to the visual and interactive nature of the frontend (React + Three.js),
automated unit testing is intentionally kept minimal.

### Manual Testing Checklist

- Login success / failure
- Route protection for unauthenticated users
- Diary creation and listing flow
- AI-generated content display
- Modal open / close behavior
- Dark / light mode switching
- Mobile interaction behavior

---

## 4. Testing Philosophy

The goal of testing in this project is to:

- Ensure core user flows work reliably
- Catch breaking changes early
- Maintain reasonable confidence before deployment

This is a personal project, so the testing strategy focuses on
practical coverage rather than exhaustive test completeness.