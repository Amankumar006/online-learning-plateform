# Email Notification Setup Guide

This guide will walk you through the final steps to enable email notifications for announcements in your application.

The application is already configured to create email documents in a Firestore collection called `emailQueue`. You just need to install and configure the official Firebase "Trigger Email" extension to process this queue and send the emails.

## Prerequisites

1.  **A Firebase Project**: Your project must be on the "Blaze (pay-as-you-go)" plan to use Firebase Extensions.
2.  **SMTP Server Credentials**: You need access to an SMTP server. This could be from a service like SendGrid, Mailgun, or even a Gmail account (using an "App Password"). You will need:
    *   SMTP Host (e.g., `smtp.gmail.com`)
    *   SMTP Port (e.g., `465` for SSL)
    *   Username
    *   Password (or App Password)

## Installation and Configuration

Follow these steps in your Firebase project console.

### Step 1: Find the Extension

1.  Go to the **Firebase Console**.
2.  Select your project.
3.  In the left navigation pane, go to **Build > Extensions**.
4.  Click **"Explore Extensions"** and search for **"Trigger Email"**.
5.  Click on the "Trigger Email" extension by Firebase and then click **"Install in project"**.

### Step 2: Configure the Extension

You will be presented with a configuration screen. Fill in the parameters as follows:

1.  **Cloud Functions location**: Choose the region where you want the function to be deployed. This should ideally be the same as your Firestore location (e.g., `Mumbai (asia-south1)`).

2.  **Firestore collection**: This is the most critical step. Enter `emailQueue`. This tells the extension to listen for new documents in the collection that the application creates.

3.  **Authentication Type**: Select **"Username & Password"** if you are using standard SMTP credentials.

4.  **SMTP connection URI**: Enter your SMTP server details in this specific format: `smtps://<username>:<password>@<hostname>:<port>`.
    *   **Example for Gmail**: `smtps://your.email@gmail.com:YOUR_APP_PASSWORD@smtp.gmail.com:465`
    *   **Note**: For security, it's better to leave the password out of the URI and use the dedicated password field below.
    *   **Recommended URI format**: `smtps://your.email@gmail.com@smtp.gmail.com:465`

5.  **SMTP password**:
    *   Click **"Create secret"**.
    *   Enter your SMTP password or App Password in the dialog that appears. This stores it securely in Google Secret Manager.
    *   Give the secret a recognizable name (e.g., `SMTP_PASSWORD`).
    *   Once created, select this new secret from the dropdown.

6.  **Default FROM address**: Enter the email address that emails should be sent from (e.g., `noreply@your-domain.com` or your Gmail address).

7.  **Default REPLY-TO address**: (Optional) Enter the email address where you want to receive replies.

### Step 3: Install

Review your configuration and click **"Install extension"**. It will take a few minutes for the extension to be installed and deployed.

## Step 4: Testing the Setup

1.  Navigate to the **Admin Dashboard** in your application.
2.  Find the **"Send a Custom Announcement"** card.
3.  Fill in the title and message.
4.  **Important**: Check the box that says **"Send this announcement as an email to all users"**.
5.  Click **"Send Announcement"**.
6.  Go to your Firebase Console, then **Build > Firestore Database**. You should see a new document created in the `emailQueue` collection.
7.  Within a minute, this document should be processed and disappear from the queue. Check the inbox of a registered user to confirm they received the email.

That's it! Your email notification system is now fully operational.
