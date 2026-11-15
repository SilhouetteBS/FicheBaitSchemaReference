# LFDS Directory Account State Evidence

Product/version: LFDS `12.0.2603.369`

Column compatibility checked across imported builds on 2026-11-09: this script is
compatible as written with `12.0.2510.261`, `12.0.2511.289`, `12.0.2603.369`, and
`12.0.2607.421`. It is not compatible with `11.0.2403.2474` or `12.0.2506.370`, whose
`dbo.user_logins` exports lack `target_app`. The unimported `12.0.2610.126` build
remains unverified. This is column compatibility, not live SQL testing.

## Goal

Provide read-only account-state and group-membership context for LFDS directory objects.

## Confirmed Schema Evidence

- `dbo.directory_objects` stores identity names, SIDs, flags, provider IDs, and login failure fields.
- `dbo.user_logins.sid` aligns with `dbo.directory_objects.sid`.
- `dbo.group_membership.member_sid` and `group_sid` connect users to group directory objects.
- `dbo.identity_providers.id` connects provider context to directory objects.

## Queue Sources Processed

- [Any ways to get Laserfiche Directory account lock status in batch?](https://answers.laserfiche.com/questions/206318/Any-ways-to-get-Laserfiche-Directory-account-lock-status-in-batch)
- [How to query User with organization in LFDS Database?](https://answers.laserfiche.com/questions/187013/How-to-query-User-with-organization-in-LFDS-Database-)
- [LFDS database user_logins table not updated for some Windows users](https://answers.laserfiche.com/questions/236312/LFDS-database-userlogins-table-not-updated-for-some-Windows-users) (already in the reviewed-post register; reused as caution evidence, not a new candidate)

## Cautions

- Directory names, SIDs, login activity, and group membership can be sensitive.
- Interpret `flags` values cautiously; validate against the LFDS version and observed behavior.
- Deploy reporting objects outside the LFDS product database.
- Missing LFDS sign-in data is not proof of account inactivity. The linked LFDS 11
  discussion reports direct Windows authentication paths that bypass LFDS; it does
  not establish universal behavior for every later build, authentication mode, or client.
  Reconcile activity through supported product tools and the installed authentication
  path before any account decision. Do not automate disabling from this query.
- View grain is directory object multiplied by matching login observations and group
  memberships. It is not one row per account, and the procedure's TOP is not a user count.
- This starts from directory objects, so orphaned login SIDs are not a complete login
  inventory. A null group row does not prove lack of effective external/nested groups.
