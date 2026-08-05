Review the complete current diff against the human-approved chunk. Do not edit files unless explicitly asked after the review.

Inspect every changed line and report:

1. Verdict - PASS, CHANGES REQUIRED or ESCALATE
2. Scope - unrelated, missing or unexplained changes
3. Correctness - inputs, outputs, state, failures and edge cases
4. Security - validation, authorisation, tenancy, secrets, injection and exposure
5. Architecture - dependency direction, reuse and coupling
6. Maintainability - duplication, naming and avoidable complexity
7. Tests - assertion quality, failure cases and human-authored consequential test
8. Evidence - commands run and exact outcomes
9. Explainability questions the developer must answer

For each finding, give severity, file/line, why it matters and the smallest correction. Do not treat an agent-authored review as independent human approval.
