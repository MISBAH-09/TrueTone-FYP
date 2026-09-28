# TrueTone API Standards & Guidelines

This rule file dictates the architectural pattern and naming conventions that all agents must strictly follow when building or modifying the TrueTone project.

## 1. Backend Architecture (Django)

- **DRF Class-Based Views ONLY**: All new APIs must be built using Django REST Framework (DRF) Class-Based Views (`APIView`). **Do not use Function-Based Views (FBV).**
- **Class Naming**: Python classes must use `PascalCase` (e.g., `class AnalyzeSkinAPI(APIView):`).
- **Standardized JSON Responses**: Every single backend API endpoint must return exactly this JSON structure:
  ```json
  {
    "success": true,        // boolean
    "message": "...",       // string
    "data": { ... }         // object or null
  }
  ```
- **Internal Naming**: Python variables and functions must use `snake_case` (e.g., `user_profile`, `analyze_image`).

## 2. Frontend Architecture (React)

- **Service Layer**: All API communication must be placed in `frontend/src/services/` using Axios. Do not write `fetch` or `axios` calls directly inside React components (`.jsx` files).
- **File Extensions**: Service files must use `.js` or `.ts` extensions. **Do not use `.jsx` for files that do not return React components.**
- **Response Unwrapping**: Frontend services should expect the `{ success, message, data }` wrapper and return `data.data` (the actual payload) to the UI components to keep the UI clean.
- **Internal Naming**: JavaScript variables and functions must use `camelCase` (e.g., `getUserProfile`, `onboardingData`).

## 3. Communication Handshake (JSON Payload)

- **JSON Keys**: All JSON keys sent between the frontend and backend must use `snake_case` (e.g., `first_name`, `error_code`, `product_id`). This aligns natively with Python/Django standard practices.
