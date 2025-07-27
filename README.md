# LoanTrack Lite

This is a Next.js application for managing loans, customers, and collections, built with Firebase Studio.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Building and Deploying

This application is configured for easy deployment using Firebase App Hosting.

### Building for Production

To create a production-ready build of your application, run the following command:

```bash
npm run build
```

This will create an optimized version of your app in the `.next` directory.

### Deploying with Firebase App Hosting

The recommended deployment method is Firebase App Hosting, which automates the build and deployment process directly from your source code.

1.  **Create a GitHub Repository**: Push your project code to a GitHub repository.
2.  **Set up Firebase**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project or select an existing one.
    *   Navigate to the **App Hosting** section in the Build menu.
3.  **Connect and Deploy**:
    *   Follow the instructions to connect your GitHub repository.
    *   Firebase will automatically detect your Next.js app and the `apphosting.yaml` file.
    *   After connecting, every `git push` to your main branch will trigger a new build and deploy your application automatically. You will be provided with a live URL to access your app.
