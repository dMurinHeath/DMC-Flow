Assess whether the approved chunk is ready to commit. Do not commit, push or open a PR.

1. Show the final changed-file list and confirm scope.
2. Run the approved done-test and `npm run check`.
3. Record exact results and distinguish baseline failures from new failures.
4. List every unresolved warning, assumption, TODO and required reviewer.
5. Ask the developer to explain purpose, control flow, failure modes and security assumptions.
6. Confirm the complete diff received human review.
7. Propose a concise commit message explaining what changed and why.
8. Provide a PR verification summary and AI-assistance disclosure.

Return READY or NOT READY. Any material uncertainty, failed check or missing review means NOT READY.
