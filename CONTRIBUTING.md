# Contributing to Campus Navigation App

## Getting Started

### Prerequisites

- [Node.js (version 18 or higher)](https://nodejs.org/en/download)
- [Python 3.14](https://www.python.org/downloads/)
- npm package manager
- Git

### Setup

#### Clone the Repository

```bash
git clone https://github.com/Phoenix-Programming/Campus-Navigation-App.git
cd Campus-Navigation-App
```

#### Install npm Dependencies

```bash
cd frontend
npm install
cd ..
```

#### Create a Python Virtual Environment

```bash
python3 -m venv .venv
```

#### Install Poetry

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

#### Install Python Dependencies

```bash
poetry install
```

#### Create Backend Environment Variables

```bash
cp backend/.env.example backend/.env
```

Populate the environment variables in the `backend/.env` file.

#### Install PostgreSQL

You should install PostgreSQL so you can run a local instance of the database for testing. Follow the [official PostgreSQL installation steps](https://www.postgresql.org/download/).

#### Create a Local Database

Follow the appropriate commands to create the PostgreSQL database on your system.

##### MacOS (Homebrew)

```bash
# Replace myusername, mypassword, and mydbname with your own values
psql postgres -c "CREATE USER myusername WITH PASSWORD 'mypassword';"
createdb mydbname -O myusername
```

##### Linux (apt)

```bash
# Replace myusername, mypassword, and mydbname with your own values
sudo -u postgres psql -c "CREATE USER myusername WITH PASSWORD 'mypassword';"
sudo -u postgres createdb mydbname -O myusername
```

##### Windows (Installer)

```bash
# Replace myusername, mypassword, and mydbname with your own values
psql -U postgres -c "CREATE USER myusername WITH PASSWORD 'mypassword';"
createdb -U postgres -O myusername mydbname
```

##### Add your Database Credentials to Your Environment Variables

Once you have created your PostgreSQL database, populate the DB_URL environment variable in your `.env` file using your username, password, and database name.

## Development Workflow

### Sync with the Remote Repository

```bash
git fetch
git checkout main
git merge main
```

### Create a Feature Branch

```bash
git checkout -b FName_LInitial_IssueNum_Feature-Name
```

### Run the Linter to Ensure Code Quality

```bash
npm run lint
```

### Test Your Changes Thoroughly

#### Frontend

```bash
cd frontend
npm run test
npm run coverage
cd ..
```

#### Backend

Coming soon...

### Make Descriptive Commits

```bash
git add .
git commit -m "Insert descriptive commit here"
```

### Push to the Remote Repository

```bash
git push origin your-branch-name
```

### Create a Pull Request

Create a pull request with a clear description of your changes.

#### Respond to Feedback

Repond to feedback on your pull request and make necessary changes requested during review.

## Pull Request Process

### Before Submitting

1. **Ensure your code passes all checks**:

   - Frontend tests pass: `npm run test`
   - Backend tests pass: `poetry run poe test`
   - Linting passes: `npm run lint`
   - Build succeeds: `npm run build`

2. **Update documentation** if needed
3. **Add or update tests** for new functionality
4. **Ensure your branch is up to date** with the main branch

### Description

Include the following in your pull request description:

- **Summary**: Brief description of what is included in the pull request
- **Changes**: List of specific changes made
- **Testing**: How you tested your changes
- **Screenshots**: If applicable, add screenshots of UI changes
- **Related Issues**: Reference any related issues using `Closes #42` or `Fixes #67`

### Review Process

1. At least two team members must review and approve the PR
2. All automated checks must pass
3. Address any and all feedback from reviewers
4. Once approved, the PR may be merged

## Development Scripts

### Frontend Development Scripts

The following npm scripts are available for development:

- **`npm run dev`**: Start development server with hot reload
- **`npm run build`**: Build the application for production
- **`npm run lint`**: Run ESLint to check code quality
- **`npm run preview`**: Preview the production build locally
- **`npm run test`**: Run all tests once with Vitest
- **`npm run coverage`**: Run tests with coverage report

### Backend Development Scripts

The following poetry scripts are available for development:

- **`poetry run poe start`**: Start the API server
- **`poetry run poe test`**: Run the unit tests

## Questions or Issues?

If you have questions about contributing or encounter issues:

1. Check the [existing issues](https://github.com/Phoenix-Programming/Campus-Navigation-App/issues) on GitHub
2. Create a new issue if your question/problem isn't already addressed
3. Reach out to the team for guidance

Thank you for contributing to the Campus Navigation App!
