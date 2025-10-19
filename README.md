# Campus Navigation App

A modern, interactive campus navigation application built with React and TypeScript. This application provides comprehensive navigation capabilities for campus environments, including both indoor and outdoor navigation with detailed mapping data.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development](#development)
  - [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)
- [Project Status](#project-status)

## Features

- **Interactive Campus Maps**: Navigate through outdoor campus areas with detailed building layouts
- **Indoor Navigation**: Room-by-room navigation within buildings
- **Points of Interest**: Discover campus amenities, offices, food locations, and more
- **Accessibility Information**: Building accessibility features and visitor hours
- **Real-time Navigation**: Route planning and turn-by-turn directions

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **Mapping Library**: Leaflet with Leaflet Routing Machine
- **Styling**: SCSS
- **Testing**: Vitest

## Project Structure

```text
campus-navigation-app/
├── .github/        # GitHub workflows, issue templates, etc.
│
├── public/                             # Publicly served static files (not processed by Vite)
│   └── data/                           # Static data files
│       ├── indoors/                    # Indoor mapping data
│       │   └── ist/                    # Building-specific data
│       │       ├── graph.json          # Indoor navigation graph
│       │       ├── pois.json           # Points of interest
│       │       └── rooms.json          # Room information
│       │
│       ├── metadata/                   # Campus metadata
│       │   ├── buildings.json          # Building information
│       │   ├── closures.json           # Temporary closures
│       │   ├── food.json               # Food locations
│       │   └── offices.json            # Office locations
│       │
│       └── outdoors/                   # Outdoor mapping data
│           ├── index.json              # Outdoor map index
│           └── *.geojson               # Outdoor GeoJSON data
│
├── src/
│   ├── assets/                   # Static assets (images, icons)
│   ├── components/               # Reusable UI components
│   ├── features/                 # Feature-specific modules
│   ├── hooks/                    # Custom React hooks
│   ├── pages/                    # Page components
│   ├── services/                 # API and data services
│   ├── styles/                   # SCSS stylesheets
│   │   ├── abstracts/
│   │   │   └── _variables.scss    # SCSS variables
│   │   ├── base/
│   │   │   └── _global.scss       # Global styles
│   │   └── components/           # Component-specific styles
│   │
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── App.tsx                   # Main application component
│   └── main.tsx                  # Application entry point
│
├── tests/                      # Test files mirroring src structure
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   └── setupTests.ts           # Test setup configuration
│
├── .gitignore                  # Git ignored files and folders
├── CONTRIBUTING.md             # Project contributing documentation
├── LICENSE.md                  # Project license
├── README.md                   # Project documentation
├── eslint.config.js            # ESLint configuration
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── tsconfig.app.json           # TypeScript app-specific config
├── tsconfig.node.json          # TypeScript Node.js config
├── vite.config.ts              # Vite build configuration
└── vitest.config.ts            # Vitest testing configuration
```

## Available Scripts

The following npm scripts are available for development and production:

- **`npm run dev`**: Start development server with hot reload
- **`npm run build`**: Build the application for production
- **`npm run lint`**: Run ESLint to check code quality
- **`npm run preview`**: Preview the production build locally
- **`npm run test`** or **`npm test`**: Run all tests once with Vitest (no coverage)
- **`npm run test:watch`**: Run tests in watch mode (re-runs on file changes, no coverage)
- **`npm run coverage`**: Run tests with coverage report
- **`npm run coverage:watch`**: Run tests in watch mode with coverage

## Getting Started

### Prerequisites

- [Node.js (version 18 or higher)](https://nodejs.org/en/download)
- npm package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Phoenix-Programming/Campus-Navigation-App.git
   cd Campus-Navigation-App
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

### Development

1. **Start the development server**

   ```bash
   npm run dev
   ```

2. **Open your browser**

   Open `http://localhost:5173` in your browser to use the app

### Building for Production

1. **Build the application**

   ```bash
   npm run build
   ```

2. **Preview the production build**

   ```bash
   npm run preview
   ```

   The built files will be in the `dist/` directory, ready for deployment.

## Contributing

We welcome contributions to the Campus Navigation App! Please see our [Contributing Guide](./CONTRIBUTING.md) for detailed information on how to get started, our development workflow, coding standards, and the pull request process.

## License

This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.

## Project Status

This project is currently in active development. Check the [project board](https://github.com/Phoenix-Programming/Campus-Navigation-App/projects) for current development priorities and known issues.
