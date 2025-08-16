#!/bin/bash

# Install Firebase Next.js adapter if not already installed
echo "Installing Firebase Next.js adapter..."
npm install --save-dev @firebase/nextjs

# Build the Next.js app
echo "Building Next.js application..."
npm run build

echo "Deployment ready!"
echo "Now run: firebase deploy"