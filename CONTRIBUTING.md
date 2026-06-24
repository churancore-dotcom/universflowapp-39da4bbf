# Contributing

Thanks for your interest in contributing! This guide covers everything you need
to get a local copy running and submit a pull request.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<this-repo>.git
cd <this-repo>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app locally

```bash
npm run dev
```

The app will be available at the URL printed in your terminal (typically
`http://localhost:8080`).

## Submitting a Pull Request

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-change
   ```
2. Make your changes and commit with clear, descriptive messages.
3. Push your branch to your fork:
   ```bash
   git push origin feature/my-change
   ```
4. Open a **Pull Request** against the `main` branch of the upstream repo.
5. Describe **what** you changed and **why** in the PR body. Link any related
   issues.
6. Be responsive to review feedback — small, focused PRs are merged fastest.

## Code Style

- **TypeScript only** — all new files must be `.ts` or `.tsx`. No plain `.js`.
- **Follow the existing file structure** — components in `src/components/`,
  pages in `src/pages/`, helpers in `src/lib/`, edge functions in
  `supabase/functions/<name>/index.ts`.
- **No `console.log` in production code** — remove debug logs before opening a
  PR. Use proper error handling and surface user-facing errors via the existing
  toast system.
- Match the surrounding code style (indentation, quotes, import order). Don't
  reformat unrelated files.
- Keep components small and focused; extract reusable logic into hooks or
  helpers under `src/lib/`.
- Don't hardcode colors — use the semantic Tailwind tokens defined in
  `src/index.css`.

## Reporting Bugs

Open a GitHub issue with reproduction steps, expected behaviour, and the
actual behaviour you observed. Screenshots and console logs help a lot.

Thanks for contributing!
