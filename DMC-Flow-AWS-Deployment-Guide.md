# DMC Flow — AWS Deployment Step-by-Step Guide

**Prepared:** 6 August 2026
**Repository:** `dMurinHeath/DMC-Flow`
**Verified against:** `main` @ `76deca8`, `ApplicationShell` @ `ff4c88f`
**Target architecture:** private S3 bucket behind CloudFront (Origin Access Control), published by GitHub Actions using OIDC federation

This guide complements `docs/deployment.md` in the repository. That file is the
command reference; this is the ordered procedure, including three defects that
must be corrected before you deploy anything, and the reasoning behind the
order.

---

## 0. Where you are right now

Confirmed state at the time of writing:

- `main` is at `76deca8` (merge of PR #4) and contains the full static export
  plus `.github/workflows/deploy.yml`.
- `npm run check` passes: 29 test files, 170 tests, lint, type-check and build.
- `npm run build` emits **seven static routes and zero dynamic routes**, writing
  `out/index.html`, `out/inbox.html`, `out/projects.html`, `out/project.html`,
  `out/project/board.html`, `out/task.html` and `out/404.html`.
- No AWS resources exist yet, and no GitHub repository variables are set.

**Expect a failed workflow run.** Because `deploy.yml` is already on `main`, the
PR #4 merge triggered it. It will have run `npm ci`, `npm run check` and
`npm run build` successfully, then failed at **Configure AWS credentials
(OIDC)** because `vars.AWS_DEPLOY_ROLE_ARN` is empty. Nothing was uploaded and
nothing is broken. Open **Actions → Deploy** and confirm that is the failure you
see, rather than something unexpected.

---

## 1. Correct three defects before deploying

These are on `main` now. Two of them cannot be fixed after the fact without a
second deployment cycle, and one of them must be in the CloudFormation template
*before* you create the stack — so this step comes first.

Create a branch from `main`:

```bash
git checkout main
git pull
git checkout -b deploy-hardening
```

### 1.1 The 404 page will never appear (`infra/static-site.yml`)

With Origin Access Control and a private bucket, the CloudFront service
principal holds `s3:GetObject` but not `s3:ListBucket`. S3 therefore answers a
request for a missing key with **403 AccessDenied**, not 404 — it will not
confirm whether a key exists. The template only maps `404`, so a visitor to a
bad URL receives CloudFront's raw error page instead of the application's.

Find `CustomErrorResponses` in `infra/static-site.yml` and add the 403 entry:

```yaml
        CustomErrorResponses:
          - ErrorCode: 403
            ResponseCode: 404
            ResponsePagePath: /404.html
            ErrorCachingMinTTL: 0
          - ErrorCode: 404
            ResponseCode: 404
            ResponsePagePath: /404.html
            ErrorCachingMinTTL: 0
```

Keep both. The 403 mapping is the one that will actually fire; the 404 mapping
is harmless and covers the case where S3 does return a 404.

### 1.2 The deploy syncs in the wrong order (`.github/workflows/deploy.yml`)

The workflow currently uploads HTML first and content-hashed assets second. For
the seconds between those two steps, live HTML references
`_next/static/<newhash>.js` files that do not yet exist in the bucket, and
anyone loading the site in that window gets a broken page.

Content-hashed assets are additive — new build, new filenames — so uploading
them first is invisible to visitors. **Swap the two steps** so the order is:

1. `Sync content-hashed static assets`
2. `Sync HTML and non-hashed assets`
3. `Invalidate CloudFront`

Move the whole `Sync content-hashed static assets` block above the
`Sync HTML and non-hashed assets` block. Do not change the commands themselves.

### 1.3 No concurrency guard (`.github/workflows/deploy.yml`)

Two merges close together can race, and the slower job may finish last and
publish the *older* build. Add a workflow-level concurrency group immediately
after the `permissions:` block:

```yaml
permissions:
  id-token: write
  contents: read

concurrency:
  group: deploy-main
  cancel-in-progress: false
```

`cancel-in-progress: false` is deliberate: a half-finished deploy should be
allowed to complete rather than be killed mid-upload.

### 1.4 Verify and open a pull request

```bash
npm run check
git add infra/static-site.yml .github/workflows/deploy.yml
git commit -m "Fix 403 error mapping, deploy sync order, and deploy concurrency."
git push -u origin deploy-hardening
```

Open the PR but **do not merge it yet.** You will deploy the CloudFormation
stacks from this branch's working tree first, then merge, so that the first
successful deployment already contains all three corrections.

---

## 2. AWS prerequisites

Before running any command, confirm:

- You are authenticated to the correct AWS account: `aws sts get-caller-identity`
- Your identity can create CloudFormation stacks, S3 buckets, CloudFront
  distributions, IAM roles, and (once per account) an IAM OIDC provider.
- You have decided a region for the stack. CloudFront itself is global, but the
  stack and bucket live in a region — `eu-west-2` (London) is the sensible
  default for DMC Digital.
- **If you want a custom domain:** an ACM certificate for that hostname must
  already exist **in `us-east-1`**, regardless of your stack region. CloudFront
  only accepts certificates from `us-east-1`. The template does not create
  Route 53 records; you add the CNAME/alias yourself afterwards.

Confirm you are on the corrected branch, because step 3 deploys from your local
files:

```bash
git branch --show-current   # expect: deploy-hardening
grep -A3 "ErrorCode: 403" infra/static-site.yml   # expect the new block
```

---

## 3. Deploy the static site stack

Without a custom domain (recommended for the first run — get it working on the
CloudFront domain, add DNS later):

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-static-site \
  --template-file infra/static-site.yml \
  --region eu-west-2 \
  --parameter-overrides \
    AlternateDomainName="" \
    AcmCertificateArn=""
```

With a custom domain:

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-static-site \
  --template-file infra/static-site.yml \
  --region eu-west-2 \
  --parameter-overrides \
    AlternateDomainName="flow.dmc-digital.com" \
    AcmCertificateArn="arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID"
```

`--capabilities CAPABILITY_NAMED_IAM` is not required for this stack — it
creates no IAM identities — but passing it does no harm if you prefer to keep
the two commands symmetrical.

**This takes 5–15 minutes.** CloudFront distribution creation is slow. The
command blocks until the stack settles.

Capture the outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name dmc-flow-static-site \
  --region eu-west-2 \
  --query "Stacks[0].Outputs" \
  --output table
```

Write down three values — you need all of them:

| Output | Used for |
| --- | --- |
| `BucketName` | the `AWS_S3_BUCKET` repository variable, and the OIDC stack parameter |
| `DistributionId` | the `AWS_CLOUDFRONT_DISTRIBUTION_ID` variable, and the OIDC stack parameter |
| `DistributionDomain` | the URL you will test against |

The bucket name is auto-generated by CloudFormation (something like
`dmc-flow-static-site-sitebucket-ab12cd34`). That is intentional — it keeps the
name globally unique without you choosing one.

At this point the bucket is empty, so visiting `DistributionDomain` returns an
error. That is expected.

---

## 4. Deploy the GitHub OIDC role stack

This creates the role GitHub Actions assumes. It needs the two values from
step 3.

**First time in this AWS account** — creates the OIDC provider:

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-github-oidc \
  --template-file infra/github-oidc-role.yml \
  --region eu-west-2 \
  --parameter-overrides \
    CreateOIDCProvider=true \
    SiteBucketName="BUCKET_NAME_FROM_STEP_3" \
    DistributionId="DISTRIBUTION_ID_FROM_STEP_3" \
  --capabilities CAPABILITY_NAMED_IAM
```

**If the account already has a GitHub OIDC provider** — an account may only have
one, and creating a second fails. Check first:

```bash
aws iam list-open-id-connect-providers
```

If `token.actions.githubusercontent.com` appears, use its ARN:

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-github-oidc \
  --template-file infra/github-oidc-role.yml \
  --region eu-west-2 \
  --parameter-overrides \
    CreateOIDCProvider=false \
    ExistingOIDCProviderArn="arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" \
    SiteBucketName="BUCKET_NAME_FROM_STEP_3" \
    DistributionId="DISTRIBUTION_ID_FROM_STEP_3" \
  --capabilities CAPABILITY_NAMED_IAM
```

`CAPABILITY_NAMED_IAM` **is** required here, because the role has an explicit
name.

Capture the output:

```bash
aws cloudformation describe-stacks \
  --stack-name dmc-flow-github-oidc \
  --region eu-west-2 \
  --query "Stacks[0].Outputs" \
  --output table
```

You need `RoleArn`.

### What this role can and cannot do

Worth reading before you continue, because this is the security boundary:

- It can only be assumed by GitHub Actions running in
  `dMurinHeath/DMC-Flow` on the **`main` branch**. A pull request build, a fork,
  or another branch cannot assume it.
- It can list the site bucket, read/write/delete objects in it, and create
  CloudFront invalidations on that one distribution. Nothing else.
- No long-lived AWS access key exists anywhere. Credentials are minted per run
  and expire.

---

## 5. Set the GitHub repository variables

In GitHub: **Settings → Secrets and variables → Actions → Variables tab →
New repository variable.**

These are **variables**, not secrets. None of them is confidential, and
variables are visible in logs, which is what you want for debugging.

| Variable name | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `RoleArn` from step 4 |
| `AWS_REGION` | `eu-west-2` (or whatever you used) |
| `AWS_S3_BUCKET` | `BucketName` from step 3 |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` from step 3 |

Spelling matters — the workflow reads these names exactly. A typo produces an
empty value and the same OIDC failure you already saw.

---

## 6. Protect the `main` branch

You intended this from the start and it matters more now that `main` deploys to
a live site.

**Settings → Branches → Add branch protection rule**, targeting `main`:

- Require a pull request before merging
- Require status checks to pass — select **Quality**
- Dismiss stale approvals when new commits are pushed
- Do not allow force pushes or deletion

The `Quality` workflow already runs on pull requests, so this is just switching
on enforcement.

---

## 7. Merge and publish

Merge the `deploy-hardening` pull request into `main`.

That push triggers **Deploy**. Watch it in Actions. The steps run in this order:

1. `npm ci`
2. `npm run check` — lint, type-check, 170 tests, production build
3. `npm run build` — writes `out/`
4. Configure AWS credentials via OIDC
5. Sync content-hashed static assets (immutable, one-year cache)
6. Sync HTML and non-hashed assets (`max-age=0, must-revalidate`, with `--delete`)
7. CloudFront invalidation of `/*`

A failing quality gate aborts before step 4, so a broken build can never reach
the bucket.

---

## 8. Verify the deployment

Use the `DistributionDomain` from step 3. Work through all seven — each proves
a different piece of the setup.

| # | URL | What it proves | Expected |
| --- | --- | --- | --- |
| 1 | `/` | Bucket, OAC, default root object | My Flow loads with seed data |
| 2 | `/inbox` | CloudFront Function appends `.html` | Inbox loads |
| 3 | `/projects` | Same | Projects index loads |
| 4 | `/project?id=proj-dmc-flow-pilot` | Query-param routing survives the CDN | DMC Flow Pilot detail loads |
| 5 | `/project/board?id=proj-cloud-platform` | Nested path rewriting | Cloud Platform board loads |
| 6 | `/task?id=task-approve-flow-gate` | Task detail route | Task detail loads |
| 7 | `/nonexistent` | **The 403→404 fix from step 1.1** | Your 404 page, HTTP status **404** |

Check the status code on #7 explicitly — a browser will render the page either
way:

```bash
curl -sSI https://YOUR_DISTRIBUTION_DOMAIN/nonexistent | head -1
# expect: HTTP/2 404
```

Then confirm the app actually works, not just that it loads: add a task via
quick capture on My Flow, triage it to a project in Inbox, and reload. It should
persist — that is `localStorage` doing its job in the browser, with no server
involved.

Finally check at 390px width as well as desktop.

---

## 9. Rehearse the rollback before you need it

Do this once, now, while nothing is wrong.

**Preferred route — redeploy a known-good commit:**

```bash
git checkout main
git revert --no-edit <bad-commit-sha>
git push
```

The pipeline rebuilds and republishes that tree. This is the route to use in
almost every case, because it keeps the repository and the live site in
agreement.

**Emergency route — restore prior object versions:** the bucket has versioning
enabled, so previous copies of every file still exist. Restore the prior
versions and then invalidate:

```bash
aws cloudfront create-invalidation \
  --distribution-id "DISTRIBUTION_ID" \
  --paths "/*"
```

Use this only when you cannot wait for a build. It leaves the live site
differing from `main`, so follow it with a proper revert.

---

## 10. How you update the site from now on

Nothing about the development discipline changes. The Flow Gate chunk process
continues exactly as it has:

1. Branch from `main`.
2. Run `/plan-chunk` in Cursor and get human approval for Context, Objective,
   Constraints, Contract, Done-test and Out of scope.
3. Implement, review the real diff line by line, run `npm run check`.
4. Open a pull request. The **Quality** check runs automatically.
5. Merge. **Deploy** runs and the live site updates in a few minutes.

The only new rule: `main` is now production. A merge is a publish.

---

## Appendix A — Troubleshooting

**Everything returns 403, including `/`.**
The bucket is empty, or the deploy never uploaded. Check the Actions run
completed steps 5 and 6. Confirm objects exist:
`aws s3 ls s3://BUCKET_NAME/ --recursive | head`

**`Error: Could not assume role with OIDC` / `Not authorized to perform sts:AssumeRoleWithWebIdentity`.**
Three usual causes, in order of likelihood: `AWS_DEPLOY_ROLE_ARN` is unset or
misspelled; the run is not on `main` (the trust policy allows only
`refs/heads/main`); or the OIDC provider ARN in the role's trust policy does not
match the provider that actually exists in the account.

**`InvalidClientTokenId` or `ExpiredToken` in the sync step.**
The role was assumed but the region is wrong or missing. Check `AWS_REGION`.

**`/inbox` returns an error but `/` works.**
The CloudFront Function is not attached or not published. Check the
distribution's default behaviour has the `viewer-request` function association,
and that `AutoPublish: true` took effect.

**`/nonexistent` shows a CloudFront error page rather than your 404.**
The 403 mapping from step 1.1 is missing from the deployed stack. Note that
editing the template is not enough — you must re-run
`aws cloudformation deploy` for the site stack.

**Stack creation fails with `EntityAlreadyExists` on the OIDC provider.**
The account already has one. Re-run step 4 with `CreateOIDCProvider=false` and
the existing ARN.

**A deploy succeeded but the browser shows the old build.**
Hard-reload first. If it persists, the invalidation step failed — check the
Actions log, and confirm the role has `cloudfront:CreateInvalidation` on the
right distribution ARN.

---

## Appendix B — Known limitations accepted in this setup

These are deliberate, not oversights. Each can become its own chunk later.

- **No access control.** Anyone with the URL can use the site. There is no
  shared server state, so no visitor can see another visitor's data — every
  browser gets its own seeded copy — but the site is public. If a client demo
  needs gating, a CloudFront Function checking a basic-auth header is the
  smallest addition.
- **Old hashed assets are never deleted.** The HTML sync excludes
  `_next/static/*` from `--delete`, so assets from previous builds accumulate.
  This is safe (in-flight sessions keep working) but unbounded. An S3 lifecycle
  rule expiring old objects and noncurrent versions would bound both this and
  the versioning history.
- **No logging, alarms or WAF.** Appropriate for a prototype demo; not
  appropriate for anything holding real client data.
- **Prototype data is per-browser and disposable.** `localStorage` is not a
  security boundary, has no backup, and no audit trail. Nothing sensitive,
  confidential or regulated should be entered into the deployed site.
