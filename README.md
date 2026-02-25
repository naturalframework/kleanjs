# KleanJS

A performance-driven, type-safe, and infrastructure-agnostic framework for building modern serverless applications.

## Why KleanJS?

In a world filled with boilerplate and "Junior AI-generated" code, KleanJS was born to provide a **professional-grade foundation** for high-speed, cost-effective software. It is designed for engineers who prioritize performance and clean architecture without sacrificing developer experience.

### The Problem
Most serverless frameworks couple business logic directly to infrastructure (e.g., AWS Lambda events) or rely on heavy, manual generic typing that clutters the codebase and increases maintenance costs.

### The Solution
KleanJS implements a **Hexagonal Architecture** where:
1. **Core Logic** is 100% agnostic and high-speed.
2. **Type Inference** is "invisible" via `Use<T>()` markers, eliminating generic noise.
3. **Adapters** handle infrastructure-specific mapping (AWS, SQS, etc.) efficiently.

---

## Design Principles

* **Agnostic Core**: Your business logic shouldn't know it's running on a Lambda or a server.
* **Invisible DX**: Type safety that "just works" through inference, not through complex boilerplate.
* **Cost & Speed**: Minimal overhead in cold starts and execution time to reduce cloud bills.
* **Strict Error Contracts**: Predictable error handling across all triggers.

---

## Repository Structure

This is a monorepo managed with a focus on modularity:

| Package | Purpose | Documentation |
| :--- | :--- | :--- |
| **`@kleanjs/core`** | The agnostic engine, validation logic, and error handling. | [View Core README](./packages/core/README.md) |
| **`@kleanjs/aws-lambda`** | Specialized adapters for AWS API Gateway and SQS. | [View AWS README](./packages/aws-lambda/README.md) |

---

## Getting Started

1. **Install the Core**:
   ```bash
   npm install @kleanjs/core
   ```

2. **Choose an Adapter**:
   For AWS environments:
   ```bash
   npm install @kleanjs/aws-lambda
   ```

3. **Build your first Hexagonal Handler**:
   Check the [Core Usage Examples](./packages/core/README.md#usage-examples) to see how to implement logic that is independent of its trigger.

---

## Development Roadmap

- [x] Agnostic Core Engine
- [x] AWS API Gateway Adapter
- [x] AWS SQS Adapter (Parallel & Series)
- [ ] Google Cloud Functions Adapter (Coming soon)
- [ ] Fastify / Express Adapters (Coming soon)

## License
GPLv3
