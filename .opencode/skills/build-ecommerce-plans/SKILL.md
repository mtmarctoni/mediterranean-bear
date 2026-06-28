---
name: build-ecommerce-plans
description: Use when the user wants to turn the Mediterranean Bear ecommerce plans/ directory into working code. Reads all plan files, interviews the user to resolve every design decision, then spawns build and review agents phase by phase.
---

# Build E-commerce from Plans

## When to use

Use this skill when the user says something like:
- "Let's start building"
- "Implement the plans"
- "Build phase 1"
- "Turn the plans into code"
- "Spawn agents to build this"
- "Review what was built"

The workflow is: **read plans -> interview user -> update plans -> spawn builder -> spawn reviewer -> iterate**.

## Step 1: Read all plans

Before asking anything or writing code, read every `.md` file in the `plans/` directory:

1. `plans/README.md` (build order)
2. `plans/000-architecture-overview.md`
3. `plans/001-database-schema.md`
4. `plans/002-product-catalog.md`
5. `plans/003-stripe-payments.md`
6. `plans/004-printful-fulfillment.md`
7. `plans/005-auth-customers.md`
8. `plans/006-cart-state.md`
9. `plans/007-order-lifecycle-admin.md`
10. `plans/008-seo-performance.md`
11. `plans/009-email-notifications.md`
12. `plans/010-deployment.md`
13. `plans/011-design-system.md`
14. `plans/012-webhooks.md`
15. `plans/013-shipping-taxes.md`

After reading, give the user a concise summary of:
- The tech stack
- The database entities
- The four build phases
- Any obvious contradictions or missing pieces you spot

Ask: "Is this summary accurate before we proceed?"

## Step 2: Relentless design interview

Interview the user one question at a time. Wait for their answer before asking the next. Do not batch questions. Follow the phase order from `plans/README.md`.

For every question:
1. **State the decision area** (e.g., "Shipping rate calculation")
2. **Explain the tradeoffs** using the plan documents
3. **Give your recommended answer** with rationale
4. **Ask the user to confirm, reject, or modify**

### Interview rules

- **Sharpen fuzzy language.** If the user says "account", ask whether they mean the Auth.js identity, the `customers` table row, or the `/account` page. If they say "order", ask whether they mean Stripe Checkout Session, Printful fulfillment order, or our internal `orders` table.
- **Explore the codebase first.** If a question can be answered by looking at existing code, files, or config, explore before asking. Report what you found.
- **Stress-test with concrete scenarios.** Invent edge cases to force precision: "What happens if a customer pays but Printful rejects the address?" "What if a webhook arrives twice?" "What if the user changes their address inside Stripe Checkout?"
- **Resolve dependencies one by one.** Do not move to a later decision until the prerequisite decisions are locked. For example, do not discuss Stripe Checkout Session metadata until the order schema is finalized.
- **Update plans inline.** When a decision changes, edit the relevant plan `.md` file immediately. Do not let decisions live only in chat history.

### Suggested interview roadmap

**Phase 1: Foundation**
- Confirm the tech stack choices (Next.js, Neon, Drizzle, Stripe, Printful). Any reason to change?
- Confirm the design system palette and typography. Is the placeholder brand identity acceptable?
- Confirm the database schema. Any additional entities? Any fields we can drop for MVP?

**Phase 2: Core Loop**
- Which Printful blank product(s) will we offer first? (e.g., Gildan 5000)
- Which sizes and colors will we offer per product?
- Will we generate mockups via Printful API or upload our own product photos?
- Cart behavior: drawer vs full page? Save anonymous carts for how long?

**Phase 3: Transaction & Fulfillment**
- Guest checkout allowed for MVP?
- Shipping: use Printful live rates, or flat rate, or free shipping threshold?
- Taxes: use Stripe Tax, or manual tax table, or ignore tax for now?
- Payment: Stripe Checkout hosted page, or custom Stripe Elements form?
- Failed fulfillment policy: auto-refund after 48h, or manual intervention only?
- Admin notifications: email on every order, or only on failures?

**Phase 4: Polish & Launch**
- Which emails are required for launch? (confirmation + shipping minimum)
- SEO: target keywords, domain name
- Launch countries (affects Stripe `allowed_countries` and Printful shipping)

## Step 3: Build phase spawning

Once shared understanding is reached, ask the user which phase to start with. Default to Phase 1.

Spawn the `ecommerce-builder` agent using the `task` tool. Pass it:

- The plan file(s) to implement for that phase
- The acceptance criteria (what "done" looks like)
- The verification command(s) to run
- A strict instruction: "Stop and ask the user if any plan is ambiguous. Do not guess."

Example prompt for the builder:

```
You are implementing Phase 1 of the Mediterranean Bear ecommerce site.
Read these plan files first:
- plans/000-architecture-overview.md
- plans/011-design-system.md
- plans/001-database-schema.md

Then implement exactly what the plans describe:
1. Scaffold the Next.js 15 project with TypeScript, Tailwind CSS, shadcn/ui, and Drizzle ORM.
2. Configure the database schema in lib/db/schema.ts with all tables from the plan.
3. Run the initial migration.
4. Set up the Tailwind theme and shadcn config.

Acceptance criteria:
- `pnpm install` works
- `pnpm db:migrate` applies cleanly
- `pnpm dev` starts without errors
- `npx tsc --noEmit` passes

If anything in the plans is unclear, stop and ask. Do not make assumptions.
```

## Step 4: Review spawning

After the builder reports completion, spawn the `ecommerce-reviewer` agent using the `task` tool. Pass it:

- The same plan files
- The files the builder claims to have changed
- Verification commands to run

Reviewer must:
1. Read the plan and the implementation
2. Check that every requirement in the plan is satisfied
3. Run the verification commands
4. Report: PASS or FAIL with specific, actionable issues

If review fails, return to Step 3 with the review feedback. Repeat until review passes.

## Step 5: Move to next phase

After a phase passes review, ask the user whether to proceed to the next phase, refine the current phase further, or stop.

If proceeding, return to Step 3 with the next phase's plan files.

## Important constraints

- Do not write production code yourself during the interview phase. Only update plan documents.
- Do not skip the interview. The interview is the value of this skill.
- Do not spawn builders for multiple phases at once unless the user explicitly asks for parallel work.
- Always verify with `npx tsc --noEmit`, `pnpm build`, or tests before declaring a phase complete.
