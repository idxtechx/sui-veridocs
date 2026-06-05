# Contributing to Sui-VeriDocs

First off, thank you for considering contributing to Sui-VeriDocs! It's people like you that make Web3 development awesome.

Here is a set of guidelines to help you contribute to this project.

## How Can I Contribute?

### Reporting Bugs
* Check the existing issues list to see if the bug has already been reported.
* Open a new issue with a clear title, a description of the bug, steps to reproduce it, and the expected behavior.
* Include screenshots or console logs if applicable.

### Suggesting Features
* Open an issue describing the feature, why it would be useful, and how you think it should work.

### Submitting Pull Requests (PRs)
1. Fork the repository and create your branch from `main`.
2. Install dependencies with `npm install`.
3. Make your changes and ensure there are no TypeScript compile errors by running `npm run lint`.
4. Commit your changes with a clear and descriptive commit message following conventional commits (e.g., `feat: add PDF validator`, `fix: update layout styling`).
5. Push to your fork and submit a PR to the `main` branch of this repository.

## Coding Style Guidelines
- **TypeScript**: We enforce strict TypeScript typing. Do not use `any` unless absolutely necessary.
- **Styling**: We use Tailwind CSS for UI components. Keep designs cohesive, modern, and aligned with our dark-slate theme.
- **Testing**: Ensure any critical backend RPC handler or utility function is tested before submission.
