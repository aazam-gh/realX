# Authenticated Routes with Firebase and TanStack Router

This project is an example demonstrating how to implement authenticated routes using Firebase for authentication and TanStack Router for routing in a React application. It showcases protected routes, user session management, and role-based access control.

## Features

-   **Firebase Authentication:** Integrates Firebase Auth for user authentication (e.g., GitHub provider).
-   **Protected Routes:** Guards routes based on authentication status and user roles.
-   **Route Guards:** Implements custom route guards for controlling access.
-   **Login/Logout:** Provides clear flows for user sign-in and sign-out.
-   **User Session Management:** Manages user sessions and redirects.
-   **Public vs. Private Routes:** Differentiates between publicly accessible and authenticated-only routes.
-   **Admin Dashboard:** Example of an admin section with specific role requirements.

## Technologies Used

-   **React:** Frontend library for building user interfaces.
-   **TanStack Router:** Type-safe router for React applications.
-   **Firebase:** Backend as a Service (BaaS) for authentication, database, etc.
-   **Vite:** Fast frontend build tool.
-   **Tailwind CSS:** Utility-first CSS framework (implied by `styles.css` and `components.json`).
-   **pnpm:** Fast, disk space efficient package manager.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

-   Node.js (LTS version recommended)
-   pnpm (or npm/yarn, but pnpm is used in this project)
    ```bash
    npm install -g pnpm
    ```

### Firebase Project Setup

1.  **Create a Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click "Add project" and follow the steps to create a new project.
    *   When prompted, disable Google Analytics for simplicity in this example.

2.  **Enable Authentication:**
    *   In your Firebase project, navigate to **Build > Authentication**.
    *   Go to the "Sign-in method" tab.
    *   Enable **Email/Password** provider (if needed, though not directly used by default in this example for login, it's good practice).
    *   Enable **GitHub** as an authentication provider.

3.  **Configure GitHub OAuth:**
    *   When enabling GitHub, Firebase will provide a "Callback URL". Copy this URL.
    *   Go to your [GitHub Developer Settings](https://github.com/settings/developers) (Settings > Developer settings > OAuth Apps).
    *   Click "New OAuth App".
    *   Fill in the "Application name" (e.g., "Firebase Auth Example").
    *   Set the "Homepage URL" to `http://localhost:5173` (your local development URL) or your production URL.
    *   Set the "Authorization callback URL" to the URL you copied from Firebase (e.g., `https://<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/handler`).
    *   Click "Register application".
    *   You will receive a "Client ID". Then, generate a new "Client Secret" and copy both.
    *   Return to the Firebase Console, paste the GitHub Client ID and Client Secret into the respective fields, and save the changes.

4.  **Add a Web App to Firebase Project:**
    *   In your Firebase project overview, click "Add app" and select the "Web" icon (`</>`).
    *   Register your app with a nickname (e.g., "Web App").
    *   Copy the Firebase configuration object. You will need these values for your `.env` file. It will look something like this:
        ```javascript
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_PROJECT_ID.appspot.com",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID",
        };
        ```

### Environment Variables Setup

1.  **Create `.env` file:**
    *   In the root of the project, create a new file named `.env`.
    *   Populate it with the Firebase configuration values obtained in the previous step. Ensure each key is prefixed with `VITE_` as this project uses Vite for environment variables.

    ```
    VITE_FIREBASE_API_KEY="YOUR_API_KEY"
    VITE_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
    VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    VITE_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.appspot.com"
    VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    VITE_FIREBASE_APP_ID="YOUR_APP_ID"
    ```

### Local Development Setup

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

2.  **Start the Development Server:**
    ```bash
    pnpm dev
    ```
    This will start the Vite development server, usually accessible at `http://localhost:5173`.

### Building for Production

To create a production-ready build:

```bash
pnpm build
```

This command will compile the application into the `dist` directory. You can then deploy the contents of the `dist` folder to your preferred hosting service (e.g., Firebase Hosting, Netlify, Vercel).

## Project Structure Highlights

-   `src/main.tsx`: Entry point of the React application.
-   `src/auth.tsx`: Contains Firebase authentication logic and context providers.
-   `src/firebase/config.ts`: Firebase initialization and configuration.
-   `src/routes/`: Defines the application's routes using TanStack Router.
    -   `src/routes/__root.tsx`: Root route definition.
    -   `src/routes/(auth)/login.tsx`: Login page.
    -   `src/routes/(vendor-panel)/_vendor.tsx`: Example of a protected vendor panel route.
    -   `src/routes/admin.tsx`: Admin-specific routes.
-   `src/components/`: Reusable UI components.
-   `src/lib/utils.ts`: Utility functions (e.g., `cn` for class name concatenation).

Feel free to explore the codebase to understand the implementation details of authenticated routes and Firebase integration.