---
name: testing
description: Guide for test strategy and implementation. Use when writing tests, setting up test infrastructure, or improving test coverage.
---

## Test Pyramid

Maintain a healthy ratio: ~70% unit tests, ~20% integration tests, ~10% E2E tests. Unit tests are fast and cheap — write many. Integration tests verify component interactions. E2E tests cover critical user journeys only (happy paths and key error paths).

## TDD: Red-Green-Refactor

1. **Red**: Write a failing test that defines the desired behavior.
2. **Green**: Write the minimal code to make the test pass.
3. **Refactor**: Clean up the code while keeping tests green.
4. Repeat. Each cycle should take minutes, not hours. If a test is hard to write, the design likely needs improvement.

## AAA Pattern (Arrange-Act-Assert)

Structure every test clearly:
```
// Arrange — set up test data and dependencies
// Act — execute the behavior under test
// Assert — verify the expected outcome
```
Keep each section small. One act and a focused set of assertions per test.

## Test Naming

Use descriptive names that document behavior: `should return 404 when user not found`, `calculates tax correctly for international orders`. The test name should read as a specification. Avoid names like `test1` or `testFunction`.

## Mocking Strategies

- **Dependency Injection**: Pass dependencies as parameters or constructor args. Replace with test doubles in tests.
- **Test doubles**: Use **stubs** (return canned data), **mocks** (verify interactions), **spies** (record calls), **fakes** (simplified implementations like in-memory DB).
- Mock at boundaries (network, filesystem, clock), not internal functions.
- Over-mocking makes tests brittle — if refactoring breaks many mocks, you're testing implementation, not behavior.

## Coverage Analysis

- Aim for 80%+ line coverage as a baseline, but don't chase 100%.
- Coverage tells you what's NOT tested, not that tested code is correct.
- Focus on branch coverage — ensure both `if` and `else` paths are exercised.
- Uncovered code in critical paths (auth, payments, data validation) is high-risk.

## Flaky Test Fixes

- Common causes: time-dependent logic, shared mutable state, async race conditions, external service calls, test order dependencies.
- Fix by: using fake clocks, isolating test state, awaiting async operations properly, mocking external services, making tests fully independent.
- Quarantine flaky tests immediately — don't let them erode trust in the suite.

## Test Data Management

- Use factories or builders to create test data: `UserFactory.build({ role: 'admin' })`.
- Each test should set up its own data — never rely on shared seed data that other tests might mutate.
- Use database transactions that roll back after each test for fast isolation.

## CI Optimization

- Run unit tests first (fast feedback), then integration, then E2E.
- Parallelize test suites across workers/containers.
- Use selective test runs: only run tests affected by changed files (e.g., `jest --changedSince=main`).
- Cache dependencies between CI runs. Fail fast on first error in PR checks.

## Mutation Testing

Mutation testing modifies your source code (e.g., flips `>` to `<`, removes lines) and checks if tests catch the change. Surviving mutants reveal weak tests. Tools: Stryker (JS/TS), mutmut (Python), pitest (Java). Run periodically on critical modules, not on every commit.
