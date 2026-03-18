# Secure IoT Monitoring Platform

This workspace is the backend container for a three-part IoT Security Monitoring demo:

- `secure-iot-monitoring-platform-245956-245970/iot_security_frontend` – React dashboard
- `secure-iot-monitoring-platform-245956-245972/iot_security_backend` – Express API + Socket.IO
- `secure-iot-monitoring-platform-245956-245971/iot_security_database` – MongoDB startup and seed scripts

The integration is now aligned so the frontend can authenticate, load protected data, and receive Socket.IO updates from the backend while the backend uses MongoDB defaults that match the database seed/startup scripts.

## Environment alignment

### Database defaults

The database workspace provisions MongoDB with these demo defaults:

- `MONGODB_URL=mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin`
- `MONGODB_DB=myapp`

### Backend variables

See `iot_security_backend/.env.example`.

Minimum required backend variable:

- `JWT_SECRET` – request this from the user/orchestrator

Local demo defaults already aligned in the backend example:

- `HOST=0.0.0.0`
- `PORT=3001`
- `MONGODB_URL=mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin`
- `MONGODB_DB=myapp`
- `CORS_ORIGIN=http://localhost:3000`
- `SOCKET_CORS_ORIGIN=http://localhost:3000`

### Frontend variables

See `secure-iot-monitoring-platform-245956-245970/iot_security_frontend/.env.example`.

For a local demo:

- `REACT_APP_API_BASE_URL=http://localhost:3001`
- `REACT_APP_SOCKET_URL=http://localhost:3001`

For preview/deployed environments:

- set both frontend variables to the backend container URL
- set backend `CORS_ORIGIN` and `SOCKET_CORS_ORIGIN` to the frontend container URL

## Local end-to-end demo setup

### 1) Start MongoDB and seed the demo data

In the database workspace:

1. `cd secure-iot-monitoring-platform-245956-245971/iot_security_database`
2. `bash startup.sh`

This will:
- start MongoDB if needed
- create users and indexes
- seed demo data
- write `db_connection.txt`

### 2) Start the backend

In the backend workspace:

1. `cd secure-iot-monitoring-platform-245956-245972/iot_security_backend`
2. ensure `.env` contains a valid `JWT_SECRET`
3. `npm install`
4. `npm run dev`

Useful backend endpoints:
- `GET /` – health and MongoDB readiness
- `GET /docs` – Swagger UI
- `GET /openapi.json` – OpenAPI document

### 3) Start the frontend

In the frontend workspace:

1. `cd secure-iot-monitoring-platform-245956-245970/iot_security_frontend`
2. ensure `.env` points to the backend URL
3. `npm install`
4. `npm start`

## Seeded demo credentials

- Admin: `admin@iotsecure.demo / Admin123!`
- Analyst: `analyst@iotsecure.demo / User123!`

## What the integrated demo supports

- JWT login and current-user lookup
- Protected device, event, and dashboard overview APIs
- Manual device event trigger from the frontend
- Socket.IO realtime updates for:
  - `events:new`
  - `events:acknowledged`
  - `devices:updated`
  - `devices:deleted`
  - `stats:updated`
  - `dashboard:updated`

## Notes for preview environments

When running the three containers with hosted preview URLs:

- point the frontend `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL` at the backend preview URL
- point backend `CORS_ORIGIN` and `SOCKET_CORS_ORIGIN` at the frontend preview URL
- keep `MONGODB_URL` and `MONGODB_DB` aligned with the database container output
