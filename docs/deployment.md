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
- `/nonexistent` returns the 404 page with **HTTP 404** (not 200). A missing
  object from a private OAC origin surfaces as 403 and is mapped to that page.
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

Follow these steps in order. Skipping ahead — especially emptying the bucket
before stopping the pipeline, or deleting the site stack before the bucket is
truly empty — is what makes teardown fail.

Leaving `infra/` and this runbook in the repository is intentional: they are
how the site is rebuilt. Teardown is fully reversible except that a rebuild
produces a new CloudFront domain and a new bucket name.

### 1. Stop the pipeline

While `.github/workflows/deploy.yml` is active, any push or merge to `main`
re-uploads objects into the bucket you are about to empty.

Prefer disabling the **Deploy** workflow in the GitHub Actions UI (Actions →
Deploy → ⋯ → Disable workflow). That is reversible if you decide to redeploy
later. Alternatively, remove the workflow file via pull request — permanent
until restored.

Do not proceed until Deploy can no longer run.

### 2. Revoke deploy credentials

Delete the OIDC stack so nothing can assume the deploy role and write to the
bucket while it is being emptied.

First check whether the GitHub OIDC provider is shared with other workloads:

```bash
aws iam list-open-id-connect-providers
```

The provider ARN is deterministic:

`arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com`

If this stack created the provider (`CreateOIDCProvider=true`), deleting the
stack removes that provider. Other roles that federate through it would break
until the provider is recreated; because the ARN is fixed, recreating it and
leaving dependent trust policies unchanged restores them.

Then delete the stack:

```bash
aws cloudformation delete-stack \
  --stack-name dmc-flow-github-oidc \
  --region REGION
aws cloudformation wait stack-delete-complete \
  --stack-name dmc-flow-github-oidc \
  --region REGION
```

### 3. Empty the bucket (versions and delete markers)

The site bucket has versioning enabled. `aws s3 rm --recursive` is not enough:
it writes delete markers and leaves prior versions in place, so CloudFormation
still sees a non-empty bucket and refuses to delete it. Every object version
**and** every delete marker must go.

Look up the bucket name from the site stack (CloudFormation generates it; do
not rely on memory):

```bash
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name dmc-flow-static-site --region REGION \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)
```

**Console (easier for a one-off):** open the bucket in the S3 console → Empty.
Confirm when prompted. That removes versions and delete markers.

**CLI (paginated loop):**

```bash
while true; do
  PAYLOAD=$(aws s3api list-object-versions --bucket "$BUCKET" --max-keys 500 \
    --query '{Objects: [Versions, DeleteMarkers][].{Key: Key, VersionId: VersionId}}' \
    --output json)
  echo "$PAYLOAD" | grep -q '"Objects": null' && break
  aws s3api delete-objects --bucket "$BUCKET" --delete "$PAYLOAD" >/dev/null
done
```

Verify before deleting the site stack (expect no Versions or DeleteMarkers):

```bash
aws s3api list-object-versions --bucket "$BUCKET" --region REGION
```

### 4. Delete the site stack

```bash
aws cloudformation delete-stack \
  --stack-name dmc-flow-static-site \
  --region REGION
aws cloudformation wait stack-delete-complete \
  --stack-name dmc-flow-static-site \
  --region REGION
```

CloudFront distributions must be disabled and propagated to every edge before
they can be removed. Expect **15 to 45 minutes** of silence from `wait`; that
is normal, not a hang.

### 5. Remove GitHub repository variables

Delete `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `AWS_S3_BUCKET`, and
`AWS_CLOUDFRONT_DISTRIBUTION_ID` from the repository Actions variables.

Leave branch protection on `main` in place unless you have a reason to remove
it.

### 6. Verify nothing is orphaned

Confirm both stacks are gone:

```bash
aws cloudformation describe-stacks \
  --stack-name dmc-flow-static-site --region REGION
aws cloudformation describe-stacks \
  --stack-name dmc-flow-github-oidc --region REGION
```

Both should report that the stack does not exist. Optionally re-check
`list-open-id-connect-providers` if you intended the GitHub OIDC provider to
be removed with the OIDC stack.

### Recovery

**Site stack `DELETE_FAILED` because the bucket is not empty.** Something was
left behind (usually versions or delete markers). Re-run step 3 until
`list-object-versions` is empty, then retry `delete-stack` / `wait` on
`dmc-flow-static-site`.

**CloudFront / distribution deletion fails or stalls.** In the CloudFront
console, disable the distribution if it is still enabled, wait until its
status is **Deployed**, then retry deleting the site stack. Allowance of
15–45 minutes still applies after disable.
