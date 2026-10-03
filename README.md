# CCE106 Practical Laboratory Examination

## Student Service Portal

### Student Information

Name:

Section:

Date:

### Required Features

- [ ] Login
- [ ] Authentication state
- [ ] Secure token storage
- [ ] Protected navigation
- [ ] Dashboard
- [ ] Student API request
- [ ] Loading state
- [ ] Error state
- [ ] Empty state
- [ ] Search/filter
- [ ] Dynamic student details
- [ ] Profile
- [ ] Session restoration
- [ ] Logout

### API

Base URL: `REPLACE_WITH_EXAM_API` (set in `constants/api.ts`)

The app reads the API base URL from `EXPO_PUBLIC_API_BASE_URL`. Copy
`.env.example` to `.env` and replace the value with the URL supplied by the
instructor. Do not commit `.env` or credentials.

POST /login

GET /students

GET /students/{id}

GET /profile

Use the instructor's API documentation for payloads and response fields.

The API integration is in `services/api.ts`. It expects a token field named
`accessToken`, `access_token`, or `token`, and accepts common `data`, `user`,
and `students` response wrappers. Adjust the mappings there if the instructor
uses different field names.

Requests time out after 15 seconds and display separate messages for connection
failures, expired sessions, unavailable services, and invalid responses. Successful
responses must contain JSON. Student records need a unique, nonempty string ID or
a finite numeric ID; optional name, email, and course fields must be strings or
null. Invalid student lists are reported as errors instead of appearing empty.

The placeholder API configuration currently enables local demo data. Configure
and test the instructor's real API before submission; automated tests use mocked
responses and do not verify that server's payload format.

### How to Run

```sh
npm install
npx expo start
```

Press `w` for web, or run `npm run web` directly.

The application restores authenticated sessions on native platforms, protects the
dashboard and student detail routes, and uses the configured API for login and
student data. The web build does not persist tokens because SecureStore is
native-only.

No requests or credentials are provided. Use the instructor's API URL and test
credentials when configuring the app.

Expo SecureStore is used only in `context/AuthContext.tsx`. Its methods are not
implemented in this starter. SecureStore supports native platforms, not web;
check availability before calling it and verify secure session persistence on
Android/iOS. See the [Expo SDK 54 SecureStore documentation](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/).

Compiler and lint checks:

```sh
npx tsc --noEmit
npm run lint
```

Run the authentication, directory, and API regression tests with `npm test`.
Individual suites are available through `npm run test:auth`,
`npm run test:directory`, and `npm run test:api`.

### Required Git Commits

Students must create at least five meaningful commits.

Suggested examples:

- `exam: setup navigation`
- `exam: implement login`
- `exam: integrate student api`
- `exam: add dynamic student details`
- `exam: implement session and logout`

### Submission

Submit the GitHub repository URL according to the instructor's instructions.
