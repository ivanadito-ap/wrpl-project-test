# API Documentation

## Overview

This API provides endpoints for user authentication, job application tracking, and contact management. All responses are in JSON format. Errors return a message and optional details.

## Authentication Endpoints

### 1. User Login

**Method:** POST
**Path:** `/api/v1/login`
**Authentication Required:** No

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success Response (200):**

```json
{ "message": "Login successful" }
```

Sets a session cookie with `user_id`.

**Errors:**

* 400: Validation error (e.g., invalid email format).
* 401: Incorrect credentials.
* 500: Server error.

### 2. User Registration

**Method:** POST
**Path:** `/api/v1/register`
**Authentication Required:** No

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "passwordConfirmation": "securepassword"
}
```

**Success Response (201):**

```json
{ "message": "Account registered successfully" }
```

**Errors:**

* 400: Validation error or passwords don’t match.
* 409: Email already exists.
* 500: Server error.

### 3. User Logout

**Method:** DELETE
**Path:** `/api/v1/logout`
**Authentication Required:** Yes

**Success Response (200):**

```json
{ "message": "User logged out successfully" }
```

Destroys the session.

**Errors:**

* 400: Invalid session.
* 500: Logout failure.

## Job Tracking Endpoints

### 1. Submit a Job Application

**Method:** POST
**Path:** `/api/v1/jobs`
**Authentication Required:** Yes

**Request Body:**

```json
{
  "companyName": "Tech Corp",
  "appliedPosition": "Developer",
  "companyAddress": "123 Street",
  "dateApplied": "2023-10-01",
  "country": 1,
  "companyWebsite": "https://tech.com",
  "status": 2,
  "additional_notes": "Met the team"
}
```

**Success Response (201):**

```json
{ "message": "Job submitted successfully" }
```

**Errors:**

* 400: Validation error.
* 500: Server error.

### 2. Retrieve All Jobs

**Method:** GET
**Path:** `/api/v1/jobs`
**Authentication Required:** Yes

**Success Response (200):**

```json
{
  "message": "success",
  "data": [ /* Array of job objects */ ]
}
```

**Errors:**

* 400: Invalid session.
* 500: Server error.

### 3. Delete a Job Application

**Method:** DELETE
**Path:** `/api/v1/jobs`
**Authentication Required:** Yes

**Request Body:**

```json
{
  "companyName": "Tech Corp",
  "appliedPosition": "Developer",
  "dateApplied": "2023-10-01"
}
```

**Success Response (200):**

```json
{ "message": "Job deleted successfully" }
```

**Errors:**

* 400: Validation error.
* 500: Server error.

## Contact Management Endpoints

### 1. Submit a Contact

**Method:** POST
**Path:** `/api/v1/contacts`
**Authentication Required:** Yes

**Request Body:**

```json
{
  "roleInCompany": "HR Manager",
  "phoneNumber": "+123456789",
  "contactEmail": "hr@tech.com",
  "linkedinProfile": "linkedin.com/in/hr"
}
```

**Success Response (201):**

```json
{ "message": "Contact submitted successfully" }
```

**Errors:**

* 400: Validation error.
* 500: Server error.

### 2. Retrieve All Contacts

**Method:** GET
**Path:** `/api/v1/contacts`
**Authentication Required:** Yes

**Success Response (200):**

```json
{
  "message": "success",
  "data": [ /* Array of contact objects */ ]
}
```

**Errors:**

* 400: Invalid session.
* 500: Server error.

### 3. Delete a Contact

**Method:** DELETE
**Path:** `/api/v1/contacts`
**Authentication Required:** Yes

**Request Body:**

```json
{
  "contactEmail": "hr@tech.com"
}
```

**Success Response (200):**

```json
{ "message": "Contact deleted successfully" }
```

**Errors:**

* 400: Validation error.
* 500: Server error.
