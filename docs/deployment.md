# DMC Flow static hosting runbook

Cursor authors the templates and workflow in this repository. **Cursor does not
run any AWS command, does not create or read credentials, and does not
deploy.** Every command below is executed by a human in their own shell with
their own credentials.

## What gets deployed

`npm run build` with `output: "export"` writes a static site to `out/`:

- Top-level HTML: `index.html`, `inbox.html`, `projects.html`, `project.html`,
  `task.html`, `404.html`
- Nested HTML: `project/board.html`
- Hashed assets under `out/_next/static/`

CloudFront sits in front of a **private** S3 bucket (Block Public Access on,
no website endpoint). Origin Access Control is the only read path. A
CloudFront Function rewrites `/` → `/index.html` and appends `.html` to
extensionless URIs so App Router export paths resolve without an S3 website
endpoint.

## Prerequisites

- An AWS account and IAM principal that can create CloudFormation stacks,
  S3, CloudFront, IAM roles and (once) an OIDC provider.
- GitHub repository `dMurinHeath/DMC-Flow` with permission to set **repository
  variables** (not secrets for these values).
- Optional: an ACM certificate in **us-east-1** if you want a custom domain.
  This template does not create Route 53 records.

## 1. Deploy the static site stack

Choose a region for the stack (S3 + CloudFront API calls). ACM certificates
for CloudFront aliases must still be in `us-east-1`.

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-static-site \
  --template-file infra/static-site.yml \
  --parameter-overrides \
    AlternateDomainName="" \
    AcmCertificateArn="" \
  --capabilities CAPABILITY_NAMED_IAM
```

With a custom domain (certificate ARN must be us-east-1):

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-static-site \
  --template-file infra/static-site.yml \
  --parameter-overrides \
    AlternateDomainName="flow.example.com" \
    AcmCertificateArn="arn:aws:acm:us-east-1:ACCOUNT:certificate/ID" \
  --capabilities CAPABILITY_NAMED_IAM
```

Record the outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name dmc-flow-static-site \
  --query "Stacks[0].Outputs"
```

You need `BucketName`, `DistributionId`, and `DistributionDomain`.

## 2. Deploy the GitHub OIDC role stack

**First time in the account** (create the OIDC provider):

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-github-oidc \
  --template-file infra/github-oidc-role.yml \
  --parameter-overrides \
    CreateOIDCProvider=true \
    SiteBucketName="BUCKET_FROM_SITE_STACK" \
    DistributionId="DISTRIBUTION_ID_FROM_SITE_STACK" \
  --capabilities CAPABILITY_NAMED_IAM
```

**If the account already has** `token.actions.githubusercontent.com`:

```bash
aws cloudformation deploy \
  --stack-name dmc-flow-github-oidc \
  --template-file infra/github-oidc-role.yml \
  --parameter-overrides \
    CreateOIDCProvider=false \
    ExistingOIDCProviderArn="arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com" \
    SiteBucketName="BUCKET_FROM_SITE_STACK" \
    DistributionId="DISTRIBUTION_ID_FROM_SITE_STACK" \
  --capabilities CAPABILITY_NAMED_IAM
```

Record `RoleArn` from the stack outputs.

The role trust policy allows only:

`repo:dMurinHeath/DMC-Flow:ref:refs/heads/main`

Permissions are limited to `s3:ListBucket` on that bucket,
`s3:GetObject` / `PutObject` / `DeleteObject` on its objects, and
`cloudfront:CreateInvalidation` on that distribution.

## 3. Set GitHub repository variables

In the repository settings → Variables (Actions), set:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `RoleArn` from the OIDC stack |
| `AWS_REGION` | Region used for the site stack deploy |
| `AWS_S3_BUCKET` | `BucketName` from the site stack |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` from the site stack |

Do not put long-lived AWS access keys in repository secrets. OIDC issues
short-lived credentials at workflow runtime.

## 4. First publish

Merge `ApplicationShell` (or the branch that contains the static export and
this workflow) into `main` via pull request. The **Deploy** workflow runs on
push to `main`: `npm ci` → `npm run check` → `npm run build` → OIDC assume
role → two `s3 sync` passes → CloudFront invalidation.

A failed quality gate aborts before any upload.

## 5. Verify

- Open `https://<DistributionDomain>/` — My Flow loads.
- `/inbox`, `/projects`, and `/project?id=<seed-project-id>` load (proves the
  URI rewrite Function).
- `/task?id=<seed-task-id>` loads.
- `/nonexistent` returns the 404 page with **HTTP 404** (not 200).
- After a subsequent deploy, a hard reload shows the new build immediately
  (HTML `max-age=0,must-revalidate`).

## 6. Rollback

1. Prefer redeploying a known-good git commit to `main` so the pipeline
   rebuilds and syncs that tree.
2. If you must restore objects without a new build, use S3 versioning on the
   site bucket: identify prior object versions and restore them, then create a
   CloudFront invalidation for `/*`.

Rehearse rollback once before you need it.

## 7. Tear down

Empty the bucket (including all object versions), then delete the stacks
(OIDC role stack first is fine if nothing else depends on the role; delete
the site stack after the bucket is empty):

```bash
# After emptying all object versions from the bucket:
aws cloudformation delete-stack --stack-name dmc-flow-github-oidc
aws cloudformation delete-stack --stack-name dmc-flow-static-site
```

If `CreateOIDCProvider=true` created the account’s only GitHub OIDC provider,
deleting that stack removes it — other workloads using the same provider would
be affected. Prefer `CreateOIDCProvider=false` when the provider is shared.
