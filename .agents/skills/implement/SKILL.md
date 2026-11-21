---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Record the starting commit with `git rev-parse HEAD` before editing.

Call the Skill tool with "tdd" where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Before committing, call the Skill tool with "code-review" in pre-commit mode. Pass the starting commit, any scope exclusions, and the originating spec or a checklist of user-approved requirements from the conversation.

Commit your work to the current branch.
