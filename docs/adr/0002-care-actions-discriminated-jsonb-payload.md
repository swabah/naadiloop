# Single `careActions` table with an `actionType` discriminator and typed JSONB payload

Medication, test, referral, and follow-up actions live in one `careActions` table, distinguished by the fixed `actionType` enum. Shared workflow fields—title, instructions, due date, status, priority, source text, assignment, verification, and review requirements—remain typed columns. Only the small action-specific details live in `payload: jsonb`, with the corresponding discriminated Zod schemas owned by `packages/api`.

We chose this over four action-specific tables because Naadi Loop presents and transitions one ordered care journey across every action type. Splitting the kinds would duplicate lifecycle logic and complicate the patient journey and provider queues without helping the MVP's read patterns. The trade-off is that PostgreSQL cannot enforce each payload variant at the column level; the tRPC boundary performs that validation before later procedure implementations write data.

The unified lifecycle remains on the shared `actionStatus` column, with overdue derived at read time as required by `PRD.md` §10.1. Revisit the JSONB boundary only if action-specific fields need independent indexing or relational constraints at production scale.
