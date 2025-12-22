# Contributing to BitChange Pro

First off, thank you for considering contributing to BitChange Pro! It's people like you that make BitChange Pro such a great platform.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples**
* **Describe the behavior you observed and what behavior you expected**
* **Include screenshots if possible**
* **Include your environment details** (OS, browser, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Explain why this enhancement would be useful**
* **List some examples of how it would be used**

### Pull Requests

* Fill in the required template
* Follow the TypeScript/JavaScript styleguide
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/bitchange-pro.git
cd bitchange-pro

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### Project Structure

```
bitchange-pro/
├── client/          # Frontend React application
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── hooks/      # Custom React hooks
│   │   └── lib/        # Utilities and tRPC client
├── server/          # Backend Express + tRPC
│   ├── routers.ts      # tRPC API routes
│   ├── db.ts           # Database queries
│   └── _core/          # Framework code (avoid editing)
├── drizzle/         # Database schema and migrations
├── shared/          # Shared types and constants
└── docs/            # Documentation
```

### Development Workflow

1. **Create a branch** from `main` for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**
   ```bash
   pnpm test
   pnpm typecheck
   ```

4. **Commit your changes** with a descriptive commit message
   ```bash
   git commit -m "feat: add new trading pair feature"
   ```

5. **Push to your fork** and submit a pull request
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

* `feat:` A new feature
* `fix:` A bug fix
* `docs:` Documentation only changes
* `style:` Changes that don't affect code meaning (formatting, etc.)
* `refactor:` Code change that neither fixes a bug nor adds a feature
* `perf:` Performance improvements
* `test:` Adding or updating tests
* `chore:` Changes to build process or auxiliary tools

Examples:
```
feat: add WebAuthn biometric authentication
fix: resolve deposit address generation bug
docs: update deployment guide with VPS instructions
```

### Coding Standards

#### TypeScript/JavaScript

* Use TypeScript for all new code
* Follow the existing code style
* Use meaningful variable and function names
* Add JSDoc comments for public APIs
* Avoid `any` types when possible
* Use `const` over `let` when possible

#### React

* Use functional components with hooks
* Extract reusable logic into custom hooks
* Keep components small and focused
* Use TypeScript interfaces for props
* Follow the existing component structure

#### tRPC

* Define procedures in `server/routers.ts`
* Use `publicProcedure` for public endpoints
* Use `protectedProcedure` for authenticated endpoints
* Use `adminProcedure` for admin-only endpoints
* Add input validation with Zod schemas

#### Database

* Define schema in `drizzle/schema.ts`
* Create query helpers in `server/db.ts`
* Use transactions for multi-step operations
* Add indexes for frequently queried fields
* Document complex queries

### Testing

* Write tests for new features
* Update tests when modifying existing features
* Ensure all tests pass before submitting PR
* Aim for good test coverage

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Documentation

* Update README.md if needed
* Add/update JSDoc comments
* Update relevant documentation in `docs/`
* Include examples for new features

## Security

* Never commit sensitive information (API keys, passwords, etc.)
* Use environment variables for configuration
* Follow security best practices
* Report security vulnerabilities privately (see SECURITY.md)

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to BitChange Pro! 🚀
