# Project Technical Documentation

This document provides a comprehensive technical overview of the project, covering its architecture, core components, technologies, and operational aspects. It is intended for developers, contributors, and maintainers to understand the system's inner workings.

## 1. Overall Architecture

The application follows a client-server architecture with a clear separation of concerns.

-   **Frontend:** A Next.js application serves as the user interface, providing a dynamic and responsive experience.
-   **Backend:** A Node.js server handles API requests, business logic, and interactions with external services. Firebase is heavily utilized for various backend functionalities.
-   **Database:** Firestore, a NoSQL cloud database, is used for storing structured data like user information, lesson details, and exercise data.
-   **Storage:** Firebase Storage is used for storing user-uploaded files, such as images for practice exercises.
-   **Authentication:** Firebase Authentication manages user registration, login, and session management.
-   **AI Integration:** The application integrates with Google AI services through Genkit for features like AI-powered chat, content generation, and grading.

The frontend communicates with the backend primarily through RESTful APIs, although Firebase SDKs are used directly for real-time database updates and authentication state changes.


## 2. Core Modules

The project is organized into several key modules, reflected in the file structure:

-   `/src/app`: Contains the Next.js application's page routes and root layout. This is where the main application pages (e.g., dashboard, lessons, login) are defined.
-   `/src/components`: Houses reusable React components used across the application, such as UI elements (buttons, inputs), layout components (navigation), and feature-specific components (e.g., `lessons`, `practice`).
-   `/src/lib`: Contains utility functions, helper classes, and configuration files shared throughout the project. This includes Firebase initialization (`firebase.ts`), data fetching and manipulation logic (`data.ts`, `storage.ts`), and general utilities (`utils.ts`).
-   `/src/ai`: Dedicated module for AI-related functionalities. This includes Genkit configurations (`genkit.ts`), AI flows (`flows`), and tool definitions (`tools`), and schema definitions (`schemas`).
-   `/src/hooks`: Custom React hooks for encapsulating component logic, such as `use-mobile.tsx` and `use-toast.ts`.
-   `/src/app/admin`: Contains the pages and components specific to the administrative interface for managing users, lessons, and exercises.
-   `/src/app/dashboard`: Contains the pages and components for the user dashboard, including the main dashboard view, lessons, practice, profile, and progress sections.

## 3. Component Interaction

Component interaction occurs at several levels:

-   **Frontend to Backend (API):** The Next.js frontend makes asynchronous requests to the Node.js backend endpoints for operations that require server-side logic, data processing, or interaction with external services not directly exposed to the frontend. These are typically RESTful API calls.
-   **Frontend to Firebase (SDK):** For real-time updates, authentication state management, and direct data operations (with appropriate security rules), the frontend utilizes the Firebase JavaScript SDKs to interact directly with Firestore, Firebase Authentication, and Firebase Storage.
-   **Backend to Firebase:** The Node.js backend interacts extensively with Firebase services using the Firebase Admin SDK. This is used for more privileged operations, server-side data validation, and complex data manipulations.
-   **Backend to AI Module (Genkit):** The Node.js backend triggers AI flows and uses AI tools defined within the `/src/ai` module via the Genkit framework. This allows the backend to offload AI processing and integrate with Google AI services.
-   **Components within Frontend:** React components communicate through props, context, and state management libraries (if any are used beyond React's built-in capabilities). Custom hooks in `/src/hooks` also facilitate shared logic between components.

## 4. Tech Stack

-   **Next.js:** Chosen as the frontend framework for its strong support for server-side rendering (SSR) and static site generation (SSG), which improves performance and SEO. It also provides a file-system based routing system and simplifies API route creation.
-   **Node.js:** Serves as the backend runtime environment. Its non-blocking, event-driven architecture is well-suited for handling concurrent requests and interacting with I/O bound services like databases and external APIs.
-   **Firebase:** A comprehensive suite of tools and services chosen for rapid development and ease of integration.
    -   **Firestore:** A flexible, scalable NoSQL cloud database. Its real-time synchronization capabilities are valuable for features like progress tracking and potentially collaborative features. Its document model fits well for storing diverse data structures.
    -   **Firebase Authentication:** Provides a secure and easy-to-implement authentication system with support for various providers (email/password, social logins). It simplifies user management and security.
    -   **Firebase Storage:** Offers secure file uploads and downloads. It's used for storing images associated with practice exercises.
-   **Genkit:** A framework for building AI-powered applications. It simplifies the process of integrating with large language models (LLMs) and other AI services, defining AI workflows (flows), and creating custom tools for AI agents. This was chosen to streamline the development of AI features.
-   **Tailwind CSS:** A utility-first CSS framework used for styling the frontend. Its class-based approach allows for rapid UI development and easy customization.
-   **Shadcn/ui:** A collection of re-usable components built with Tailwind CSS and Radix UI. It provides pre-built, accessible, and customizable UI components, accelerating frontend development.
-   **TypeScript:** Used for both frontend and backend development. It adds static typing, which improves code maintainability, reduces runtime errors, and enhances developer productivity through better tooling and code completion.

## 5. Key Features and Workflows

-   **User Authentication:** Users can sign up and log in using Firebase Authentication. This secures access to personalized features.
-   **Personalized Dashboard:** Upon logging in, users are directed to a dashboard (`/dashboard`) that provides an overview of their progress and access to different learning modules.
-   **Interactive Lessons:** Users can access and complete interactive lessons (`/dashboard/lessons/[id]`). Lessons include text, code blocks, and AI-powered text-to-speech.
-   **Adaptive Exercises:** The platform provides adaptive exercises (`/dashboard/practice/[id]`) that may adjust difficulty or type based on user performance. This likely involves fetching exercise data from Firestore and submitting user answers for evaluation.
-   **Progress Tracking:** User activity and performance on lessons and exercises are tracked and visualized (`/dashboard/progress`). This data is stored in Firestore and potentially aggregated or analyzed in the backend.
-   **Tool-Equipped AI Chat (`Buddy AI`):** A sophisticated, standalone chat interface (`/dashboard/buddy-ai`) powered by a central Genkit flow (`buddy-chat.ts`). This AI can:
    *   Adopt different personas (e.g., friendly 'Study Buddy' or technical 'Code Mentor').
    *   Maintain conversation history.
    *   Use tools to search the web, create custom exercises, suggest study topics, generate images, and analyze code complexity.
-   **Unified Content Generation (Admin):** The admin interface features a unified, tab-based page for generating exercises. Admins can either generate a set of exercises based on an existing lesson or generate a single, custom exercise from a detailed text prompt. This is powered by AI flows (`/src/ai/flows/generate-lesson-content.ts`, `/src/ai/flows/generate-custom-exercise.ts`, `/src/ai/flows/generate-lesson-image.ts`).
-   **Code Execution Simulation:** A feature to simulate code execution (`src/components/lessons/code-editor.tsx`, powered by the `simulate-code-execution.ts` flow).
-   **Long Form Answer Grading:** An AI flow (`/src/ai/flows/grade-long-form-answer.ts`) is used to grade open-ended text responses, including handwritten work submitted as an image.

## 6. Data Flow

-   **User Authentication:** User credentials from the frontend are sent to Firebase Authentication for verification. Upon successful authentication, Firebase provides a user object and token to the frontend.
-   **Data Fetching (Frontend):** The frontend fetches data for the dashboard, lessons, and exercises by making requests to the backend API or directly querying Firestore collections using the Firebase SDK. Firestore's real-time capabilities can update the frontend automatically when data changes on the backend.
-   **Data Submission (Frontend):** User input from exercises, profile updates, or AI chat is sent from the frontend to the backend API or directly written to Firestore (depending on the sensitivity and complexity of the operation).
-   **Backend Processing:** The Node.js backend receives data from the frontend, performs validation, applies business logic, and interacts with Firestore and Firebase Storage. For AI-related requests, the backend triggers the appropriate Genkit flows.
-   **Firestore Interactions:** The backend reads from and writes to Firestore collections (e.g., `users`, `lessons`, `exercises`, `userProgress`).
-   **Firebase Storage Interactions:** The backend handles file uploads (e.g., exercise images) to Firebase Storage. The frontend receives signed URLs from the backend to display or interact with these files.
-   **AI Data Flow:** When an AI flow is triggered, Genkit orchestrates the interaction with Google AI services. Input data (like user prompts and conversation history) is passed to the AI model, and the generated output is returned to the backend, which then sends it back to the frontend.

## 7. Security Considerations

-   **Firebase Authentication:** Secures user accounts and prevents unauthorized access to user-specific data.
-   **Firestore Security Rules:** Fine-grained access control is enforced using Firestore Security Rules, which define who can read, write, and delete data in specific collections and documents based on authentication status, user ID, and data content. The `firestore.rules` file defines these rules.
-   **Backend Validation:** Server-side validation in the Node.js backend is crucial to ensure data integrity and prevent malicious data from being written to the database, even if frontend validation is bypassed.
-   **Firebase Admin SDK Privileges:** The Firebase Admin SDK used in the backend has elevated privileges. It's essential to ensure that backend endpoints are properly secured and only expose necessary functionality to authenticated and authorized users.
-   **API Security:** Backend API endpoints should be protected to prevent unauthorized access and potential abuse. This involves verifying user authentication tokens and implementing rate limiting where necessary.
-   **Firebase Storage Security Rules:** Similar to Firestore, Firebase Storage uses security rules to control access to uploaded files.

## 8. Deployment Process

The deployment process likely involves:

-   **Frontend Deployment:** The Next.js application can be deployed to platforms that support Next.js hosting, such as Vercel, Netlify, or Firebase App Hosting. This typically involves building the Next.js project and deploying the output files.
-   **Backend Deployment:** The Node.js backend, which includes the Genkit setup and Firebase Admin SDK usage, needs to be deployed to a server environment. This could be a cloud function (e.g., Firebase Functions), a containerized application (e.g., Docker on Cloud Run or Kubernetes), or a traditional server.
-   **Firebase Service Setup:** Setting up and configuring Firebase projects, including enabling Authentication, Firestore, and Storage, and configuring security rules.
-   **Environment Configuration:** Setting up environment variables on the hosting platform for both the frontend and backend, including Firebase project configuration and API keys.
-   **Genkit Deployment:** Deploying the Genkit flows, which might involve deploying them as cloud functions or within the backend service.

## 9. Scalability Strategy

-   **Firebase Services:** Firebase services (Firestore, Authentication, Storage) are managed services designed to scale automatically to handle increased load without significant operational overhead. This is a major advantage for scalability.
-   **Next.js Scalability:** Next.js applications can be scaled horizontally by running multiple instances behind a load balancer. SSR and SSG also contribute to performance and scalability by reducing the load on the server for static or frequently accessed content.
-   **Node.js Backend Scalability:** The Node.js backend can be scaled horizontally by running multiple instances. Using serverless functions (like Firebase Functions) can also provide automatic scaling based on demand. Designing the backend to be stateless as much as possible simplifies horizontal scaling.
-   **Database Design:** The Firestore data model is designed for scalability. Proper indexing and denormalization strategies are important for maintaining performance as the data size grows.
-   **Caching:** Implementing caching mechanisms for frequently accessed data can reduce the load on the database and backend.

## 10. APIs and Integrations

-   **Internal REST APIs:** The project utilizes internal RESTful APIs exposed by the Node.js backend. These APIs are used by the frontend to interact with the backend logic, data processing, and AI functionalities. Examples might include endpoints for fetching lesson data, submitting exercise answers, or triggering AI flows.
-   **Google AI Integration (via Genkit):** The primary external integration is with Google AI services (likely using models like Gemini) through the Genkit framework. This enables features like AI chat, content generation, and grading.
-   **Firebase SDKs:** While used for interaction, the Firebase SDKs themselves represent an integration with the Firebase platform's various services.
-   **Other Potential Integrations:** Depending on the project's features, there might be integrations with other services not immediately apparent from the file structure, such as email services, payment gateways, or analytics platforms.

## 11. Authentication

Firebase Authentication is the sole authentication mechanism used in the project.

-   **User Registration:** New users register by providing email and password (or using social login providers). Firebase handles the secure storage of user credentials.
-   **Login:** Existing users log in using their registered credentials. Firebase verifies the credentials and provides an authentication token.
-   **Session Management:** Firebase Authentication manages user sessions, keeping track of the authenticated user's state. The frontend listens for authentication state changes to update the UI and grant access to protected routes.
-   **Protected Routes:** Routes and data that require authentication are protected on both the frontend (by checking the authentication state) and the backend/Firestore (using security rules and middleware).
-   **User Data:** User-specific data in Firestore is linked to the authenticated user's ID, ensuring that users can only access their own data (enforced by Firestore Security Rules).

## 12. Configuration and Environment Requirements

-   **Firebase Configuration:** The project requires Firebase project configuration details (API key, project ID, etc.) to connect to the Firebase services. These are typically stored in environment variables (`.env.local` for Next.js frontend and environment variables for the backend).
-   **Google Cloud Project Configuration:** For using Google AI services via Genkit, a Google Cloud project is required with the necessary APIs enabled. Credentials for accessing these services (e.g., service account keys or application default credentials) are needed for the backend/Genkit deployment.
-   **Environment Variables:** Various environment variables are used for configuration, including:
    -   Firebase project settings
    -   Google Cloud project settings and credentials
    -   Any external API keys
    -   Application-specific settings (e.g., feature flags, base URLs).
-   **Configuration Files:**
    -   `next.config.ts`: Next.js configuration.
    -   `tailwind.config.ts`, `postcss.config.mjs`: Frontend styling configuration.
    -   `tsconfig.json`: TypeScript configuration.
    -   `apphosting.yaml`: Configuration for Firebase App Hosting (if used).
    -   `firestore.rules`: Firestore security rules.
    -   Genkit configuration in `/src/ai/genkit.ts`.
-   **Node.js Environment:** The backend requires a Node.js environment with the project dependencies installed (`package.json`).
