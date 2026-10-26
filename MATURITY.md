# Richardson Maturity Model Evaluation

**Name:** Aneri Patel  
**Roll No.:** 24AIML031  
**Subject:** Advanced Web Development Frameworks

---

# Introduction

The Richardson Maturity Model is used to check how RESTful an API is. It has four levels, from Level 0 to Level 3. In this document, I have evaluated my Task Management API and checked which level it satisfies.

---

# Evaluation Table

| Level | Criterion | Does my API satisfy it? | Evidence |
|-------|-----------|-------------------------|----------|
| Level 0 | Uses HTTP as a transport | âŒ No | My API has multiple endpoints instead of one. |
| Level 1 | Separate URLs for resources | âœ… Yes | I use `/tasks` and `/tasks/:id`. |
| Level 2 | Correct HTTP methods and status codes | âœ… Yes | I use GET, POST, PUT, DELETE with proper status codes like 200, 201, 400, 404 and 500. |
| Level 3 | HATEOAS support | âŒ No | My API does not include links in the response body. |

---

# Endpoint Evaluation

| Endpoint | Method | Purpose | Status Code |
|----------|--------|---------|-------------|
| `/tasks` | GET | Get all tasks | 200 OK |
| `/tasks` | POST | Create a new task | 201 Created |
| `/tasks/:id` | PUT | Update a task | 200 OK / 404 Not Found |
| `/tasks/:id` | DELETE | Delete a task | 200 OK / 404 Not Found |

---

# Why My API is Level 2

My Task Management API follows REST principles. It has separate URLs for resources, uses the correct HTTP methods, and returns meaningful status codes. It also handles invalid requests and server errors properly. Because of these features, my API satisfies **Level 2** of the Richardson Maturity Model.

---

# HATEOAS Example (Level 3)

If I wanted my API to reach Level 3, I could return links like this:

```json
{
  "id": "123",
  "title": "Task A",
  "_links": {
    "self": "/tasks/123",
    "delete": "/tasks/123"
  }
}
```

These links help the client know what actions can be performed next.

---

# Why Most APIs Stop at Level 2

Most real-world APIs stop at Level 2 because it is simple and works well for most applications. Using proper URLs, HTTP methods, and status codes is enough for web and mobile apps. HATEOAS is useful, but many applications already know which API endpoints to call, so it is not commonly implemented.

---

# Improvements

I checked my Task Management API for Level 2 requirements.

- Correct HTTP methods are used.
- Proper status codes are returned.
- Error handling is available.
- No Level 2 issues were found, so no code changes were needed.

---

# Conclusion

After evaluating my Task Management API, I found that it satisfies **Richardson Maturity Model Level 2**. The API follows REST principles by using resource-based URLs, correct HTTP methods, and proper status codes. To reach Level 3, HATEOAS links would need to be added to the API responses.
