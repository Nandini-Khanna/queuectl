
CLI-based background job queue system built with Node.js and SQLite
# QueueCTL

A Node.js-based background job queue system with a CLI interface. It uses multiple worker processes to manage background jobs, moves permanently failed jobs into a Dead Letter Queue (DLQ), and automatically retries failed jobs with exponential backoff.
