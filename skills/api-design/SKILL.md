---
name: api-design
description: Guide for RESTful API design patterns. Use when designing, reviewing, or implementing APIs.
---

## Resource Naming

Use plural nouns for collections: `/users`, `/orders`, `/products`. Nest for relationships: `/users/{id}/orders`. Avoid verbs in URLs — let HTTP methods convey the action. Use kebab-case for multi-word resources: `/order-items`.

## HTTP Method Semantics

- **GET**: Read. Must be safe and idempotent. Never mutate state.
- **POST**: Create a new resource or trigger a process. Not idempotent.
- **PUT**: Full replace of a resource. Idempotent.
- **PATCH**: Partial update. Use JSON Merge Patch (`application/merge-patch+json`) or JSON Patch.
- **DELETE**: Remove a resource. Idempotent (deleting twice returns same result).

## Status Codes

- `200 OK` — Successful read/update. `201 Created` — Resource created (include `Location` header). `204 No Content` — Successful delete or update with no body.
- `400 Bad Request` — Validation error. `401 Unauthorized` — Missing/invalid auth. `403 Forbidden` — Authenticated but not authorized. `404 Not Found`. `409 Conflict` — State conflict (e.g., duplicate). `422 Unprocessable Entity` — Semantic validation failure.
- `429 Too Many Requests` — Rate limited (include `Retry-After` header).
- `500 Internal Server Error` — Unhandled server failure. Never expose stack traces.

## Error Response Format (RFC 7807)

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The 'email' field must be a valid email address.",
  "instance": "/users/signup"
}
```

## Pagination

- **Cursor-based** (preferred): `?after=eyJpZCI6MTAwfQ&limit=25`. Stable under inserts/deletes. Return `next_cursor` in response.
- **Offset-based**: `?page=2&per_page=25`. Simple but unstable with concurrent writes. Include `total_count` in response metadata.

## Authentication Patterns

- **JWT**: Stateless, include in `Authorization: Bearer <token>`. Short-lived access tokens (15min), long-lived refresh tokens.
- **OAuth2**: Use Authorization Code flow with PKCE for SPAs/mobile. Client Credentials for service-to-service.
- **API Keys**: For server-to-server. Pass via header (`X-API-Key`), never in URL query params.

## Versioning

- **URL path** (`/v1/users`): Simple, explicit, cache-friendly. Preferred for public APIs.
- **Header** (`Accept: application/vnd.api.v2+json`): Cleaner URLs but harder to test in browsers.
- Avoid breaking changes: add fields (don't remove), deprecate with sunset headers.

## Rate Limiting & CORS

- Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.
- CORS: Set `Access-Control-Allow-Origin` to specific origins, not `*` in production. Handle preflight `OPTIONS` requests.

## Idempotency

For non-idempotent operations (POST), accept an `Idempotency-Key` header. Store the key and response; return the stored response on duplicate requests. Expire keys after 24h.

## Documentation

Write OpenAPI 3.x specs. Include examples for every endpoint. Document error responses. Use tools like Swagger UI or Redoc for interactive docs.
