---
name: playwright
description: Guide for writing Playwright browser tests. Use when asked to write E2E tests, browser automation, or UI testing.
---

## Page Object Pattern

Encapsulate page interactions in classes. Each page object exposes methods (e.g., `login(user, pass)`) and locators as properties. Keep assertions in test files, not page objects. This isolates selector changes to one place.

```typescript
class LoginPage {
  constructor(private page: Page) {}
  readonly email = this.page.getByLabel('Email');
  readonly password = this.page.getByLabel('Password');
  readonly submit = this.page.getByRole('button', { name: 'Sign in' });
  async login(email: string, pass: string) {
    await this.email.fill(email);
    await this.password.fill(pass);
    await this.submit.click();
  }
}
```

## Locator Strategy (Priority Order)

1. `getByRole('button', { name: 'Submit' })` — best for accessibility-aligned tests.
2. `getByText('Welcome')` — for visible text content.
3. `getByLabel('Email')` — for form fields.
4. `getByTestId('nav-menu')` — when semantic locators aren't sufficient.
5. Avoid CSS/XPath selectors unless absolutely necessary.

## Async Waiting

Playwright auto-waits for elements, but use explicit waits when needed:
- `await page.waitForURL('**/dashboard')` after navigation.
- `await expect(locator).toBeVisible()` for assertions that wait.
- `await page.waitForResponse(url)` when waiting for API calls.
- Never use hard `page.waitForTimeout()` — it causes flaky tests.

## Assertions

Use `expect(locator)` web-first assertions: `toBeVisible()`, `toHaveText()`, `toHaveValue()`, `toHaveAttribute()`, `toHaveCount()`. These auto-retry until timeout. Prefer these over `expect(await locator.textContent()).toBe(...)`.

## Auth Handling

Use `storageState` to save and reuse auth across tests. Run auth setup once in a `global-setup.ts` or a `setup` project, save cookies/storage to a JSON file, then load it in `test.use({ storageState: 'auth.json' })`.

## Network Interception

```typescript
await page.route('**/api/users', route =>
  route.fulfill({ json: [{ name: 'Mock User' }] })
);
```

Use `route.abort()` to block requests, `route.continue()` to modify headers.

## CI & Parallel Execution

- Set `fullyParallel: true` in `playwright.config.ts` for maximum speed.
- Use `workers: process.env.CI ? 2 : undefined` to limit CI resources.
- Run with `--shard=1/4` to split across CI nodes.
- Always run headed locally (`--headed`) and headless in CI (default).
- Use `retries: 2` in CI to handle transient failures.
- Capture traces on first retry: `trace: 'on-first-retry'`.
