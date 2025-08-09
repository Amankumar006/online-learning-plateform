# Project Technical Documentation

This document provides a comprehensive technical overview of the project, covering its architecture, core components, technologies, and operational aspects. It is intended for developers, contributors, and maintainers to understand the system's inner workings.

## 1. Overall Architecture

The application follows a modern client-server architecture built on Next.js, with a clear separation of concerns between the user interface and backend logic.

-   **Frontend:** A Next.js application using the App Router, React Server Components (RSC), and TypeScript. This provides a dynamic, performant, and type-safe user experience. It interacts with backend services via Server Actions and directly with Firebase for real-time data and authentication.
-   **Backend Logic (Server Actions):** Instead of a traditional standalone server, backend logic is encapsulated within Next.js Server Actions (`'use server'`). These functions execute securely on the server, handling business logic, database operations, and calls to the AI module. The primary action file is `src/lib/actions.ts`.
-   **Database:** Firestore, a NoSQL cloud database, is the primary data store for structured data like user profiles, lesson content, exercises, and user progress.
-   **Storage:** Firebase Storage is used for storing user-uploaded files and AI-generated assets, such as images for lessons and audio for text-to-speech.
-   **Authentication:** Firebase Authentication manages user registration, login (including email/password and OAuth providers like Google/GitHub), and session management across the application.
-   **AI Integration:** The application integrates with Google AI services through Genkit, a framework for building production-ready AI applications. Genkit flows are defined in `/src/ai/flows` and are called from Server Actions to perform tasks like content generation, grading, and conversational chat.

## 2. Core Modules

The project is organized into several key modules, reflected in the file structure:

-   **/src/app**: Contains the Next.js application's page routes (e.g., `/dashboard`, `/admin`) and layouts. It uses the file-system based App Router.
-   **/src/components**: Houses reusable React components. This includes:
    -   `ui`: Auto-generated, unstyled components from Shadcn/ui (e.g., Button, Card).
    -   `dashboard`, `admin`, `lessons`, `practice`: Higher-level components specific to a feature area.
    -   `common`: Components shared across multiple features, like `FormattedContent.tsx`.
-   **/src/lib**: The core of the application's backend logic and data management.
    -   `firebase.ts`: Initializes and exports Firebase services (Auth, Firestore, Storage).
    -   `data.ts`: A crucial abstraction layer for all Firestore interactions. It exports functions for creating, reading, updating, and deleting data (e.g., `getUser`, `createLesson`, `getExercises`), keeping all database logic centralized and consistent.
    -   `actions.ts`: Defines all Next.js Server Actions, which serve as the primary "API layer" called by the client components.
    -   `storage.ts`: Contains functions for uploading files (images, audio) to Firebase Storage.
-   **/src/ai**: The dedicated module for all AI-related functionality.
    -   `genkit.ts`: Initializes and configures the global Genkit instance and plugins.
    -   `flows`: Contains individual Genkit flows, each responsible for a specific AI task (e.g., `generate-lesson-content.ts`, `buddy-chat.ts`).
    -   `tools`: Defines custom tools that AI flows can use, such as searching the web or creating a practice exercise.
    -   `schemas`: Contains Zod schemas for defining the input and output structures of AI flows and tools.
-   **/src/hooks**: Custom React hooks for encapsulating complex client-side logic (e.g., `use-speech-recognition.ts`, `use-utility-sidebar.tsx`).
-   **/src/app/admin**: Contains pages and components for the admin dashboard.
-   **/src/app/dashboard**: Contains pages and components for the student-facing dashboard.

## 3. Component Interaction

Component interaction occurs at several levels:

-   **Client to Server (Server Actions):** Client components (e.g., a form in a page) invoke `async` functions exported from `src/lib/actions.ts`. Next.js automatically handles the RPC-like call to the server, where the action executes. This is the primary method for data mutation and backend logic.
-   **Client to Firebase (SDK):** For real-time updates and authentication, the client uses the Firebase JS SDK.
    -   `onAuthStateChanged` is used in layouts to protect routes and fetch user profiles.
    -   Firestore's `onSnapshot` is used in real-time features to listen for changes to documents and collections.
-   **Server Action to Data Layer:** Server Actions in `actions.ts` call functions from `data.ts` to interact with Firestore, keeping the actions clean and focused on orchestration.
-   **Server Action to AI Module:** Server Actions call Genkit flows defined in `/src/ai/flows` to perform AI tasks. For example, when an admin generates a lesson, the server action calls the `generateLessonContent` flow.
-   **Components within Frontend:** Standard React patterns are used:
    -   Props are passed down from parent to child components.
    -   State is managed locally with `useState` and `useEffect`.
    -   Context (`useUtilitySidebar`) is used for managing global UI state like the side panel.

## 4. Tech Stack

-   **Next.js (App Router):** Chosen for its performance benefits (RSC, Server Actions), improved developer experience with file-system routing, and seamless integration of client and server logic.
-   **Firebase:** A comprehensive backend-as-a-service platform.
    -   **Firestore:** A scalable NoSQL database with real-time listeners, perfect for interactive features like chat and live progress updates. Its flexible data model is ideal for the evolving schemas of lessons and exercises.
    -   **Firebase Authentication:** Provides a secure, managed authentication solution with built-in support for multiple providers, reducing development overhead.
    -   **Firebase Storage:** A simple and robust solution for storing user-generated content and AI-generated assets.
-   **Genkit:** A Google-built framework for AI applications. It standardizes the process of defining AI workflows (flows) with typed inputs/outputs (using Zod), chaining model calls, and creating custom tools for the AI to use. This makes the AI logic more structured, testable, and maintainable.
-   **Tailwind CSS & Shadcn/ui:** A powerful combination for rapid UI development. Tailwind provides low-level utility classes, while Shadcn/ui offers a collection of beautifully crafted, accessible, and customizable components, greatly accelerating the creation of a polished user interface.
-   **TypeScript:** Used across the entire stack. It ensures type safety between the client, server actions, and database models, significantly reducing runtime errors and improving code quality and developer productivity.
-   **Modular Design:** Each major feature is isolated into its own module with clean interfaces.

## 5. Key Features and Workflows

-   **User Authentication:** Users can sign up and log in via email/password or OAuth (Google, GitHub). `createUserInFirestore` is called on first login to create a corresponding user profile in the database.
-   **Tool-Equipped AI Chat (`Buddy AI`):** A sophisticated chat interface (`/dashboard/buddy-ai`) powered by the `buddy-chat.ts` Genkit flow. The AI can adopt different personas and use a suite of tools defined in `buddy-tools.ts` (e.g., `createCustomExercise`, `searchTheWeb`) to provide rich, interactive responses.
-   **Unified Content Generation (Admin):** Admins use a unified page (`/admin/exercises/new`) to generate exercises. They can either generate a set based on an existing lesson's content or create a single, custom exercise from a detailed prompt. This is powered by the `generate-exercise.ts` and `generate-custom-exercise.ts` flows.
-   **Code Execution Simulation:** In practice exercises, students can write code in a Monaco-based editor (`/components/lessons/code-editor.tsx`). The `simulate-code-execution.ts` flow analyzes this code, predicting its output, errors, and computational complexity without actually executing it on the server.
-   **Long Form & Math Answer Grading:** For open-ended questions, the `grade-long-form-answer.ts` flow uses AI to evaluate the student's text and/or handwritten image uploads. The `grade-math-solution.ts` flow is specialized for grading step-by-step mathematical solutions.
-   **Real-time AI Conversations:** Interactive chat system with Buddy AI providing contextual help and learning support.

## 6. Data Flow

-   **User Input -> Server Action:** A user action (e.g., submitting a form) calls a Server Action from `actions.ts`.
-   **Server Action -> Data Layer:** The action calls a function from `data.ts` (e.g., `createLesson`).
-   **Data Layer -> Firestore:** The `data.ts` function executes the necessary Firestore command (e.g., `addDoc`).
-   **AI Flow:**
    1.  A user action calls a Server Action (e.g., `generateExercise`).
    2.  The action calls the corresponding AI flow from `/ai/flows`.
    3.  The flow prepares a prompt and calls `ai.generate()` or `ai.generateStream()`.
    4.  Genkit sends the request to the configured Google AI model.
    5.  The model's response is parsed (often into a Zod schema) and returned up the call stack to the client.
-   **Real-time Updates:**
    1.  A user's action (e.g., sending a chat message) writes data to Firestore.
    2.  The system updates the UI and any relevant listeners are triggered to refresh the interface.
    3.  The hook updates the component's state (`setMessages`), and the UI re-renders with the new message.

## 7. Security Considerations

-   **Firebase Authentication:** All user-facing routes are protected. Layout components (`/app/dashboard/layout.tsx`, `/app/admin/layout.tsx`) use `onAuthStateChanged` to redirect unauthenticated users.
-   **Firestore Security Rules:** The project relies on Firestore's server-side security rules (`firestore.rules`) to enforce data access policies. These rules should be configured to ensure that:
    -   Users can only read and write their own profile data.
    -   Admins have broader permissions.
    -   Data validation is performed at the database level.
-   **Server Actions:** As the primary backend entry point, Server Actions are the main surface for security validation. They should always validate user input and permissions before performing sensitive operations.
-   **Environment Variables:** Sensitive information like API keys and Firebase configuration is stored in environment variables (`.env`) and accessed via `process.env`. These should never be committed to source control.

## 8. Deployment Process

The application is deployed using Firebase services:

-   **Hosting:** Firebase App Hosting is used to deploy the Next.js application. The `apphosting.yaml` file configures the build and run settings.
-   **Database & Auth:** Firestore, Firebase Authentication, and Storage are configured directly in the Firebase Console. Security rules are deployed via the Firebase CLI.
-   **Environment Configuration:** Secret keys (like SMTP passwords or external API keys) are stored in Google Secret Manager, which can be accessed by Firebase services during runtime.

## 9. Scalability Strategy

-   **Firebase Services:** Firestore, Authentication, and Storage are designed to scale automatically to handle massive traffic with low operational overhead.
-   **Serverless Execution:** By using Next.js with Server Actions and deploying on a managed platform like App Hosting, the backend logic runs in a serverless environment, which scales automatically based on request volume.
-   **Edge Caching:** Next.js and Firebase Hosting can cache static assets and pages at the edge, reducing latency for users worldwide.
-   **Efficient Queries:** The data layer in `data.ts` should use efficient Firestore queries with proper indexing to maintain performance as the dataset grows.

## 10. Authentication

Firebase Authentication is the sole authentication mechanism.

-   **Providers:** Supports email/password, Google, and GitHub OAuth.
-   **User Creation:** When a user signs up or logs in via OAuth for the first time, `createUserInFirestore` is called to create a user document in the `users` collection, storing their role, name, and initializing their progress data.
-   **Session Management:** Firebase handles session persistence. The `onAuthStateChanged` listener is the primary way the app detects the current user's session state.
-   **Role-Based Access Control (RBAC):** A `role` field ('student' or 'admin') on the user document is used to control access. Layouts and components check this role to render the appropriate UI (e.g., redirecting non-admins from `/admin`).

## 11. Configuration and Environment

-   **Firebase Configuration:** Stored in `.env` and loaded into `next.config.ts` or directly accessed via `process.env`.
-   **Genkit Configuration:** The core Genkit instance is configured in `src/ai/genkit.ts`, specifying the AI models to use (e.g., `googleai/gemini-2.0-flash`).
-   **Styling Configuration:** The app's theme (colors, fonts, etc.) is defined in `tailwind.config.ts` and `src/app/globals.css` using CSS variables, making it easy to theme the application.
