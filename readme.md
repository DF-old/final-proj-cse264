# Project Document Draft

## Project Name
- **Event Planner**

## Team Members & Roles
- **Denny Li** [del226@lehigh.edu](mailto:del226@lehigh.edu) Database / Auth / Cards
- **Truc Linh Ho** [tth227@lehigh.edu](mailto:tth227@lehigh.edu) API Integration
- **Neirah Ho** [neh226@lehigh.edu](mailto:neh226@lehigh.edu) Frontend/UI

## Application Functionality
- Users can register, log in, and stay signed in with a local session.
- The app uses a meaningful role distinction between **free** and **premium** users.
- The app stores and retrieves users, events, and configuration data from PostgreSQL through an Express API.
- Users can create, edit, view, and delete events.
- Each event can include a title, date, time, location, notes, category, and attached insight cards.
- The app fetches live data from external services and converts it into a standard card format for display.
- Free users get weather, holiday, and venue/location features.
- Premium users unlock additional sports and movie integrations.
- Users can export events as an `.ics` file or copy event details to the clipboard.
- The interface is interactive and dynamic, with forms, card search, attach/detach actions, and save feedback.

## User Story / Use Case
- A user opens the app, registers or logs in, and lands on the dashboard.
- From there, they create a new event and enter details such as the date, time, and location.
- The app suggests relevant cards such as weather, holiday, and venue information.
- If the user has premium access, they can also pull in sports scores and movie suggestions.
- The user attaches the cards that help with planning, saves the event, and returns later to edit or delete it.
- When finished, the user exports the event to a calendar file or copies the event details for sharing.

## Technical Design
- **Frontend:** React, TypeScript, Vite
- **Styling / UI:** Tailwind CSS 4, Lucide React icons
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **State / Auth:** custom auth context with `localStorage` session handling
- **Internal REST API:** `/users`, `/users/login`, `/events`, `/config`
- **External REST APIs:** Open-Meteo, weather.gov, Nominatim / OpenStreetMap, Nager.Date, IMDb / JustWatch
- **New library / framework:** Tailwind CSS 4 and Lucide React
- **Architecture summary:** the React frontend talks to an Express API, which reads and writes PostgreSQL data. The frontend also calls public APIs, transforms those responses into standardized cards, and attaches them to events.

## Application Requirements Mapping
- **User accounts and roles:** implemented through the auth flow and free/premium access control.
- **Database:** PostgreSQL stores users, events, and per-user configuration.
- **Interactive UI:** the event builder includes forms, filtering, searching, attaching cards, and export actions.
- **New technology:** Tailwind CSS 4 and Lucide React extend the classroom stack.
- **Internal REST API:** the Express server exposes dedicated routes for auth, events, and config.
- **External API use:** the app enriches events with real data from public APIs.

## Presentation Questions

### Project Purpose and Value
- The app helps users plan events faster by combining event creation with context-aware suggestions.
- Instead of manually checking weather, holidays, venues, or entertainment options, the user gets that context inside one planning flow.

### Feature Showcase and Demo
- Log in or register.
- Create an event.
- Fetch suggested cards based on date and location.
- Attach or remove cards.
- Save the event and see it appear on the dashboard.
- Open an event again, make changes, and export it as `.ics`.

### Roadmap and Presentation
- Add stronger calendar syncing.
- Improve search and filtering for cards.
- Add richer user settings and profile management.
- Expand recommendation logic so suggestions feel more personalized.

### Peer Communication
- The app is designed to be understandable to non-technical users.
- The main idea is simple: create an event, get helpful context, save it, and export it when ready.

## Technical Walkthrough Notes
- Authentication is handled through a custom context and persisted session data.
- The dashboard loads user-specific events from the API.
- The event builder sends create and update requests to the backend.
- External services are queried on the client side and normalized into cards before being attached to an event.
- Premium access is enforced in the UI by showing extra integrations only when the user is upgraded.

## Implementation Details

### Why the backend uses separate SQL tables for auth, events, and config
- The project uses three existing PostgreSQL tables as lightweight storage layers for different concerns:
  - `reviews_del226` for users and passwords
  - `applicationtracker_del226` for events
  - `films_del226` for per-user configuration
- This choice keeps the backend simple while still satisfying the database requirement.
- Auth is intentionally mocked rather than fully secure production auth, because the goal of the project is to demonstrate full-stack data flow, role-based behavior, and persistence.
- User configuration is stored separately from the core user record so the app can update tier/integration settings without rewriting the user row.
- The config table uses a sentinel key format like `__config__:{userId}` so each user gets one JSON config row.

### Why TypeScript is used
- TypeScript gives the project shared data shapes across the client and server.
- It helps keep the expected structures consistent for `User`, `EventDraft`, `Card`, and integration responses.
- It reduces bugs when API payloads change, especially for event editing and external API adapters.
- It also makes the project easier to explain because the interfaces document the shape of the data.

### Expected API shapes
- On the client, these response shapes are merged into the `User` and `EventDraft` types so the UI always works with a predictable structure.

| Endpoint | Purpose | Sample description | Sample output |
| --- | --- | --- | --- |
| `POST /users/login` | Authenticate a user | Returns the base user record after a successful login. | `{ "id": "12", "username": "demoUser", "createdAt": "2026-04-14T18:00:00.000Z" }` |
| `GET /config?userId=...` | Load saved user settings | Returns the stored role, tier, and enabled integrations for that user. | `{ "role": "user", "tier": "premium", "enabledIntegrations": ["weather", "holidays", "location", "nba", "nfl", "mlb", "movies"] }` |
| `GET /events?userId=...` | Load a user’s events | Returns event drafts mapped into client-friendly fields such as title, date, and attached cards. | `{ "id": "45", "userId": "12", "title": "Birthday Dinner", "date": "2026-05-02", "location": "Bethlehem, PA", "attachedCards": [] }` |
| `POST /events` and `PUT /events/:eventId` | Save an event draft | Accepts the full event draft payload and stores the extra event details inside the `notes` JSON column. | Request body example: `{ "userId": "12", "title": "Birthday Dinner", "date": "2026-05-02", "time": "7:00 PM", "location": "Bethlehem, PA", "notes": "Bring dessert" }` |

**Sample description:** The frontend sends a login request, receives the base user object, fetches the user config from `/config`, and then combines those values into one `User` state object for the session.

**Sample output:** After login, the dashboard can use the merged session state to show premium-only integrations when `tier` is `premium`, and the event builder can load and save event drafts with the user id already attached.

### Why the API URL is configured through environment variables
- The client reads the backend base URL from `VITE_API_URL`.
- This makes it easy to switch between local development and a deployed backend without changing application code.
- The app imports the API base once and reuses it in each fetch call, which keeps the code consistent and easy to maintain.

### Client-side data flow
- `AuthProvider` loads the session from `localStorage` and rehydrates the signed-in user on refresh.
- Login fetches the base user object from the backend, then fetches `/config` and merges the results into one user state object.
- Registration creates the user, writes default config for that user, and then immediately logs the user in.
- Upgrading to premium updates the config endpoint and then updates the local session state.
- The dashboard requests only the current user’s events and renders them as editable cards.
- The event builder can save a new event or update an existing one depending on whether an event id already exists.

### External data normalization
- External APIs do not return the same shape, so the client converts each source into a common card model.
- Weather, holidays, locations, sports, and movie results are all adapted into the same `Card` format before they are shown in the UI.
- That normalization is what makes the UI flexible, because the event builder can render one consistent card component regardless of source.

### Why the project is structured this way
- The backend focuses on persistence and CRUD operations.
- The client focuses on interaction, display, and data enrichment.
- This split makes the app easier to demo because the technical story is clear: the backend stores records, the frontend turns them into a usable event-planning workflow.

## API Keys & Database Setup
- **Server `.env`**
  - `POSTGRES_USERNAME=you`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_HOST=cse264.cru8ico68j35.us-east-1.rds.amazonaws.com`
  - `POSTGRES_PORT=5432`
  - `POSTGRES_DBNAME=cse264`
  - `PORT=3000`
  - `USER_TABLE=reviews_you`
  - `EVENT_TABLE=applicationtracker_you`
  - `CONFIG_TABLE=films_you`

- **Client `.env`**
  - `VITE_API_URL=http://localhost:3000`

- The current code uses public APIs and does not require a third-party API key file for the integrations currently in the app.
