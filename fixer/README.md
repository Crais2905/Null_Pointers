# Fixer — AI Log Triage

> An AI-assisted application that turns logs and user complaints into evidence-backed diagnoses and actionable developer tasks.

Built by **NullPointers** during a hackathon.

## The Problem

Investigating an incident usually involves several manual steps: reading logs, identifying the affected service, finding the responsible developer, and preparing a bug report.

This process takes time, and repeated reports can create duplicate tasks.

## Our Solution

Fixer brings incident analysis and task preparation into one workflow:

1. The user submits application logs and a complaint.
2. The AI service masks sensitive data and extracts relevant signals.
3. Gemini generates a structured diagnosis and task draft.
4. The backend verifies evidence against the original logs.
5. Routing rules recommend a developer based on ownership, skills, and workload.
6. The incident is sent for human review or dispatched to the developer Inbox.

## Features

- Log submission through text or file upload.
- Sensitive-data masking before AI analysis.
- Structured diagnoses with severity and confidence.
- Supporting evidence linked to log lines.
- Backend verification of AI-generated evidence.
- Developer recommendations with routing scores.
- Manual confirmation and configurable automatic dispatch.
- Duplicate detection and occurrence tracking.
- Developer Inbox with acknowledgment and completion actions.
- Markdown task export.
- Optional webhook delivery.
- Audit history and operational metrics.
- Five prepared demo scenarios.

## Technology Stack

| Component | Technologies |
|-----------|--------------|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Java 17+, Spring Boot, Spring Data JPA |
| Database | H2 |
| AI service | Python 3.11+, FastAPI |
| AI integration | Google Gemini, Google Gen AI SDK |
| Checks | JUnit, pytest, TypeScript, Vite |

## Architecture

```text
React Frontend
      |
      v
Java / Spring Boot
      |
      +----> H2 Database
      |
      v
Python / FastAPI
      |
      v
Google Gemini
```

The Java backend manages the incident workflow, evidence verification, developer routing, persistence, and task delivery.

The Python service handles log preprocessing, sensitive-data masking, signal detection, and AI analysis.

## Project Structure

```text
.
├── README.md
├── pom.xml                  # Root Maven project
├── mvnw / mvnw.cmd          # Maven Wrapper
├── start.cmd                # Windows entry point
├── start.ps1                # Full application launcher
├── run-backend.ps1          # Backend-only launcher
└── fixer/
    ├── backend/             # Spring Boot application
    │   └── src/main/java/fixer/
    │       ├── api/         # REST controllers
    │       ├── ai/          # AI service client
    │       ├── data/        # Entities, repositories, storage
    │       ├── dispatch/    # Inbox, webhook, Markdown export
    │       ├── evidence/    # Evidence verification
    │       ├── metrics/     # Database-backed metrics
    │       ├── pipeline/    # Incident processing
    │       ├── policy/      # Dispatch rules
    │       └── routing/     # Developer selection
    ├── ai/                  # Python AI service
    ├── web/                 # React frontend
    ├── contracts/           # Shared API contracts
    ├── docs/                # Technical documentation
    ├── scripts/             # Setup and development tools
    └── .env.example         # Configuration template
```

## Requirements

- Windows with PowerShell.
- JDK 17 or newer.
- Python 3.11 or newer.
- Internet access for the initial dependency installation.

The launcher prepares local dependencies and obtains Node.js, npm, and Maven when needed.

## Quick Start

From the repository root:

```powershell
.\start.cmd
```

Alternatively:

```powershell
.\start.ps1
```

The launcher prepares dependencies, builds the backend, starts all three services, and opens the frontend once the services are ready.

### Service Addresses

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173/?api=java |
| Backend health | http://localhost:8080/api/health |
| AI health | http://localhost:8000/health |
| AI API documentation | http://localhost:8000/docs |

Press **Ctrl+C** in the launcher terminal to stop the application.

Service logs are stored in `.build/logs/`.

## Gemini Configuration

Create `fixer/.env` using `fixer/.env.example`, or let the launcher create it on the first run.

Add your configuration:

```dotenv
GEMINI_API_KEY=your_api_key_here
LLM_MODEL=gemini-3.5-flash-lite
REPLAY=auto
```

You can create an API key in [Google AI Studio](https://aistudio.google.com/apikey).

The configured model must be available to your account.

> Keep the API key in `fixer/.env`. Never commit it or place it in frontend code.

Restart the application after changing the configuration.

### Analysis Modes

| Configuration | Behavior |
|---------------|----------|
| `REPLAY=auto` with a key | Live Gemini analysis |
| `REPLAY=auto` without a key | Cached demo responses |
| `REPLAY=1` | Force replay mode |
| `REPLAY=0` | Require live Gemini analysis |

### Run the Demo Without an API Key

```powershell
.\start.ps1 -Replay
```

Replay mode uses prepared cached responses for supported demo inputs. It runs the application workflow without live Gemini requests.

The first dependency setup still requires internet access.

Frontend mocks are configured separately. Open the frontend with `?api=java` to use the Java backend.

### Additional Configuration

```dotenv
LLM_TIMEOUT_SECONDS=20
AI_BASE_URL=http://127.0.0.1:8000
DISPATCH_WEBHOOK_URL=
VITE_API_URL=http://localhost:8080
VITE_USE_MOCKS=false
```

Webhook delivery is optional. Tasks remain available in the developer Inbox.

## Dispatch Policy

| Confidence | Handling |
|------------|----------|
| Below `0.50` | Human triage |
| From `0.50` to below `0.75` | Manual confirmation |
| `0.75` or higher | Eligible for automatic dispatch when enabled |

Automatic dispatch also requires verified evidence and a suitable developer.

Repeated reports of the same active issue update the existing task’s occurrence count instead of creating another task.

## Development Commands

### Prepare Dependencies

```powershell
.\start.ps1 -SetupOnly
```

### Run Without Opening the Browser

```powershell
.\start.ps1 -NoBrowser
```

### Use Custom Ports

```powershell
.\start.ps1 -ApiPort 18080 -AiPort 18000 -WebPort 15173
```

### Run Project Checks

```powershell
.\start.ps1 -Test
```

This command runs:

- Java tests.
- Python tests.
- TypeScript checking.
- The frontend production build.

The test launcher forces replay mode and disables webhook delivery to avoid external calls.

## IntelliJ IDEA Setup

1. Open the root `pom.xml` as a Maven project.
2. Select JDK 17 or newer.
3. Reload the Maven project.
4. Use the root launcher to start the complete application.

The backend run configuration starts only the Java service.

## Demo Workflow

1. Start the application in replay mode.
2. Open the frontend connected to the Java API.
3. Select a prepared demo scenario.
4. Submit the complaint and logs.
5. Review the diagnosis and supporting evidence.
6. Check the recommended developer.
7. Confirm dispatch if required.
8. Open the developer Inbox.
9. Acknowledge, complete, or export the task.

## Practical Value

- **Support:** less manual preparation of technical incident reports.
- **Developers:** tasks with context, evidence, and suggested reproduction steps.
- **Team leads:** consistent routing and visibility into incident handling.
- **The team:** fewer duplicate tasks and a traceable decision history.

Actual time savings should be measured during real use.

## Current Limitations

- H2 runs in memory, so incidents and tasks are lost after a backend restart.
- Replay mode supports prepared demo inputs.
- Live analysis requires a valid Gemini key, model access, and sufficient quota.
- AI-generated diagnoses remain subject to evidence verification and dispatch rules.
- Authentication, durable storage, and deployment controls are required before using the application with production data.

## Team

| Member | Main Responsibility |
|--------|---------------------|
| Oleh | Frontend and user interface |
| Viacheslav | REST API, pipeline, evidence verification, routing, and policy |
| Sviatoslav | Python AI service, masking, detectors, and AI analysis |
| Mykola | Data layer, task persistence, delivery, metrics, and project integration |

## My Contribution — Mykola

My main responsibility was the backend data layer and task-management functionality. I also worked on project assembly, local infrastructure, and development automation to make the team's components run together.

### Backend and Data Layer

I implemented:

- JPA entities and repositories for incidents, tasks, developers, audit logs, and settings.
- Storage interfaces for integration with the incident-processing pipeline.
- Log storage with SHA-256 hashing.
- Developer and module seed data.
- Demo input loading and reset support.

### Task Management

I implemented:

- Transactional task creation and persistence.
- Database locking and unique constraints to prevent concurrent duplicate task creation.
- Duplicate detection and occurrence tracking.
- Support for creating a new task after a previous task for the same issue is completed.
- Audit recording alongside data changes.
- Task acknowledgment and completion operations.

### Delivery and Metrics

I added:

- The in-app developer Inbox.
- Optional webhook delivery with duplicate-send protection.
- Markdown task export.
- Database-backed metrics with separate tracking for manual and automatic dispatch.
- Integration tests for persistence, deduplication, task lifecycle, and webhook behavior.

### Project Integration and Development Infrastructure

Alongside backend development, I took on DevOps-related work focused on local setup, builds, and running the application.

I worked on:

- Assembling the frontend, Java backend, and Python AI service into a runnable project.
- Configuring the root Maven project and Maven Wrapper.
- Preparing IntelliJ IDEA setup and backend run configuration.
- Adding a shared launcher for dependency setup, builds, and service startup.
- Organizing environment configuration and keeping API keys outside tracked source files.
- Integrating the switch from Claude to Gemini.
- Configuring live analysis and replay-based demo execution.
- Adding service readiness checks, startup logs, and coordinated shutdown.
- Providing a single command for backend tests, AI tests, and frontend build checks.
- Documenting setup steps and integration points for the team.

My contribution covered both application functionality and the development setup needed to build, run, and demonstrate the complete project.