# Internship Challenge: Authenticated Routes with Firebase

Welcome, intern candidate! This challenge is designed to assess your ability to set up a development environment, interact with external services (Firebase), and demonstrate basic Git workflow and application functionality.

## The Challenge

Your task is to successfully set up and run this application on your local machine.

### Submission Requirements

1.  **Fork this Repository:** Start by forking this repository to your GitHub account.
2.  **Run the Application:** Get the application running locally, ensuring all authentication flows (especially GitHub login) are functional.
3.  **Create a Pull Request (PR):** Create a Pull Request from your forked repository back to the `main` branch of the original repository.
4.  **Include a Video Demonstration:** The PR description *must* include a link to a short video (e.g., Loom, YouTube unlisted, Google Drive link) demonstrating the application running successfully on your system. The video should show:
    *   The application loading in your browser.
    *   Successfully logging in using the GitHub authentication provider.
    *   Navigating to at least one protected route (e.g., `/dashboard` or `/admin`).
    *   Logging out.

    *We are not looking for code changes in this challenge, only proof that you can set up and run the existing project.*

## Getting Started & Assistance

To help you successfully complete this challenge, here are the essential steps and Firebase setup instructions. Please refer to the main `README.md` for more detailed information if needed.

### Prerequisites

-   Node.js (LTS version recommended)
-   pnpm (or npm/yarn, but pnpm is used in this project)
    ```bash
    npm install -g pnpm
    ```

### Firebase Project Setup (Critical for Authentication!)

You *must* set up your own Firebase project to get the authentication working.

1.  **Create a Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Create a new project. You can disable Google Analytics for this challenge.

2.  **Enable Authentication:**
    *   In your Firebase project, go to **Build > Authentication > Sign-in method**.
    *   Enable **GitHub** as an authentication provider.

3.  **Configure GitHub OAuth:**
    *   When enabling GitHub, Firebase will provide a "Callback URL". **Copy this URL.**
    *   Go to your [GitHub Developer Settings](https://github.com/settings/developers) (Settings > Developer settings > OAuth Apps).
    *   Create a "New OAuth App".
    *   Set the "Homepage URL" to `http://localhost:5173`.
    *   Set the "Authorization callback URL" to the URL you copied from Firebase (e.g., `https://<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/handler`).
    *   Register the application.
    *   You will receive a "Client ID". Generate a new "Client Secret" and **copy both**.
    *   Return to the Firebase Console, paste the GitHub Client ID and Client Secret, and save.

4.  **Add a Web App to Firebase Project:**
    *   In your Firebase project overview, click "Add app" and select the "Web" icon (`</>`).
    *   Register your app (e.g., "Intern Challenge App").
    *   **Copy the Firebase configuration object.** You will need these values for your `.env` file. It will look like this:
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
    *   Populate it with the Firebase configuration values you copied. Remember to prefix each key with `VITE_`.

    ```
    VITE_FIREBASE_API_KEY="YOUR_API_KEY"
    VITE_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
    VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    VITE_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.appspot.com"
    VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    VITE_FIREBASE_APP_ID="YOUR_APP_ID"
    ```

### Running the Application

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

2.  **Start the Development Server:**
    ```bash
    pnpm dev
    ```
    The application should now be accessible at `http://localhost:5173`.

Good luck, and we look forward to seeing your submission!
