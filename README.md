# Campus Navigation App

A modern, interactive campus navigation application built with React and TypeScript. This application provides comprehensive navigation capabilities for campus environments, including both indoor and outdoor navigation with detailed mapping data.

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
│           ├── buildings.geojson       # Building boundaries
│           ├── index.json              # Outdoor map index
│           ├── parking_lots.geojson    # Parking areas
│           └── paths.geojson           # Walking paths
│
├── src/
│   ├── assets/                 # Static assets (images, icons)
│   ├── components/             # Reusable UI components
│   ├── features/               # Feature-specific modules
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Page components
│   ├── services/               # API and data services
│   ├── styles/                 # SCSS stylesheets
│   │   ├── global.scss         # Global styles
│   │   ├── variables.scss      # SCSS variables
│   │   └── components/         # Component-specific styles
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── App.tsx                 # Main application component
│   └── main.tsx                # Application entry point
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

## NPM Scripts *(Defined in [package.json](./package.json))*

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

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Phoenix-Programming/Campus-Navigation-App.git
   cd Campus-Navigation-App
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
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

We welcome contributions to the Campus Navigation App! Please follow these guidelines:

### Workflow

1. Make sure you have completed the [Getting Started](#getting-started) steps above.

2. Create a feature branch from the current development branch:

   ```bash
   git checkout -b FName_LInitial_IssueNum_Feature-Name
   ```

3. Make your changes following the established code style.

4. Write or update tests for your changes.

5. Run the linter to ensure code quality:

   ```bash
   npm run lint
   ```

6. Test your changes thoroughly.

7. Commit your changes with a descriptive commit message.

8. Push to your remote branch.

9. Create a pull request and send a link to the team for review.

10. Answer any questions and make necessary changes requested by the team.

### Code Standards

- Follow TypeScript best practices
- Use functional components with hooks
- Write comprehensive tests for new features
- Follow the existing file structure and naming conventions
- Ensure accessibility standards are met
- Document complex functions and components

### Pull Request Process

1. Ensure your code passes all tests and linting
2. Update documentation if needed
3. Provide a clear description of your changes
4. Reference any related issues in your PR description

## Project Status

This project is currently in active development. Check the issues and project board for current development priorities and known issues.
