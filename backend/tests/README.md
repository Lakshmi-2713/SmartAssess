# API integration tests

End-to-end checks against a running SmartAssess API: auth, JWT guards,
role authorization, validation bounds, mass assignment, regex safety and
security headers.

## Run

Start a throwaway MongoDB and the API, then point the suite at it:

```bash
mongod --dbpath /tmp/smartassess-test --port 27099 &

PORT=5099 \
MONGO_URI="mongodb://127.0.0.1:27099/smartassess_test" \
JWT_SECRET=testsecret \
CORS_ORIGIN='*' \
node server.js &

BASE=http://127.0.0.1:5099 npm run test:api
```

Never point `BASE` at a production deployment — the suite creates and
deletes records.
