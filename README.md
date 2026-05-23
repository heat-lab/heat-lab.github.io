# MERLS Frontend Project


## Frontend API Integration

All frontend API requests now target the production backend, configured in `src/config.js`:
- `/users` — user validation
- `/questions` — get/display test questions
- `/export` — report/download
- `/audio-upload` — audio file submission

To run locally or switch servers, simply update the value in `config.js`.

## Local Testing

**It is recommended to test locally and fix all the bugs before push to remote repository.**

### Prerequisites

- Node.js and npm installed
- A local clone of this repository
- Browser access to `localhost`

Install dependencies after cloning or after `package-lock.json` changes:

```bash
npm ci
```

For day-to-day work, `npm install` is also fine when adding or updating packages intentionally.

### Run the App Locally

Start the development server:

```bash
npm start
```

Open the app at:

```text
http://localhost:3000
```

The development server supports hot reload, so most changes in `src/` update automatically in the browser.

### Backend API Configuration

Frontend API requests are configured in:

```text
src/config.js
```

The current value points to the production backend:

```js
export const APIBASEURL = "https://merls-backend.onrender.com";
```

When testing the frontend locally, it still sends API requests to the production backend (hosted on Render), unless you change this value. 

### Browser Debugging

Use the browser developer tools while `npm start` is running.

Recommended checks:

- Console: JavaScript errors and React warnings
- Network: API request URLs, response status codes, and payloads
- Application or Storage: local/session storage if a flow depends on browser state
- Sources: breakpoints in files under `src/`, such as `src/Tests/Test.js`

For audio, microphone, or video features, make sure the browser grants permissions for `http://localhost:3000`.

If permissions get stuck in a bad state, reset site permissions in the browser and reload the app.

### Check the Production Build

Before pushing or deploying, verify that the app can build:

```bash
npm run build
```

This creates or updates the `build/` directory. GitHub Pages deployment uses this production build, so build errors should be fixed before deployment.

Warnings may not block the build, but review them when they relate to:

- Missing React Hook dependencies
- Unused state or imports
- Browser compatibility data
- Dependency warnings

### Preview the Production Build Locally

After running `npm run build`, preview the generated static files.

Preferred option if `serve` is available:

```bash
npx serve -s build
```

Then open the local URL shown in the terminal.

Alternative option using Python:

```bash
python3 -m http.server 8080 --directory build
```

Then open:

```text
http://localhost:8080
```

The Python server is useful for a quick static-file check, but it does not fully emulate single-page-app fallback behavior. Use `serve -s build` when testing client-side routing refreshes.