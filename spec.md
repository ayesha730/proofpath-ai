ProofPath AI — Technical Specification

Architecture

ProofPath AI is a web application with a frontend and backend.

Frontend

- Technology: React and Vite
- Responsibilities: user interface, profile input, opportunity search, and results display

Backend

- Technology: Node.js and Express
- Responsibilities: API endpoints, opportunity retrieval, result processing, and communication with configured AI services

AI Integration

The application uses a configured Gemini API integration where implemented. AI-generated matching or summaries must not be treated as authoritative confirmation of eligibility.

Opportunity Sources

The application may use configured opportunity websites, source-specific retrieval logic, and curated official directories. Actual source availability depends on the implementation and external services.

Configuration and Secrets

- Store API keys in local environment variables.
- Never commit ".env" files or API keys to a public repository.
- Provide an ".env.example" containing placeholder values only, if needed.

Error Handling

The application should communicate failed or unavailable sources and avoid presenting failed retrieval as successful.

Verification

Before release:

1. Run the frontend and backend.
2. Test the main opportunity-search flow.
3. Check links and displayed opportunity details.
4. Verify that secrets are excluded from Git.
5. Confirm that the README instructions match the actual project.

Deployment

The frontend and backend must be deployed to compatible hosting services if a public, working demo URL is required. Localhost URLs are not publicly accessible.