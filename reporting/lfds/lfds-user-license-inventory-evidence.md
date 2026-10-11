# LFDS User and License Inventory Evidence

Product/version: LFDS `12.0.2607.421` (current structural checks and sample review; not live tested)

## Goal

Provide read-only inventory views for LFDS directory users, login activity, license rows, container limits, identity providers, and SAML SID mappings.

## Confirmed Schema Evidence

- `dbo.directory_objects.sid` aligns with `dbo.user_licenses.sid`.
- `dbo.directory_objects.sid` aligns with `dbo.user_logins.sid`.
- `dbo.directory_objects.provider_id -> dbo.identity_providers.id`.
- `dbo.saml_lf_sid_mappings.saml_sid` and `lf_sid` align with directory object SIDs.
- `dbo.container_limits` stores license/resource instance limits.

## Queue Sources Processed

- [Any ways to get Laserfiche Directory account lock status in batch?](https://answers.laserfiche.com/questions/206318/Any-ways-to-get-Laserfiche-Directory-account-lock-status-in-batch)
- [Querying LFDS database for user last log in in Forms](https://answers.laserfiche.com/questions/151526/Querying-LFDS-database-for-user-last-log-in-in-Forms)
- [Directory Server Database query help](https://answers.laserfiche.com/questions/204411/Directory-Server-Database-query-help)
- [Number of licenses we own](https://answers.laserfiche.com/questions/184000/Number-of-licenses-we-ownin-the-database)
- [Linking multiple SAML identity providers through common username](https://answers.laserfiche.com/questions/213876/Linking-multiple-SAML-identity-providers-through-common-username)
- [Last sign-in time in LFDS 12, database location?](https://answers.laserfiche.com/questions/232845/Last-signin-time-in-LFDS-12-database-location)
- [Directory Server database](https://answers.laserfiche.com/questions/117487/Directory-Server-database)
- [LFDS database user_logins table not updated for some Windows users](https://answers.laserfiche.com/questions/236312/LFDS-database-userlogins-table-not-updated-for-some-Windows-users)

## Cautions

- LFDS `12.0.2607.421` read-only review did not establish disabled/service-account flag decoding or universal license accounting. Do not infer these from raw flags or reuse account_cache type codes for directory_objects.
- Login rows and license rows can multiply directory objects; this view is not a distinct-user count. Container limits and SAML mappings were empty in the reviewed demo and remain behaviorally unverified. Only lf_sid has a schema-backed directory-object relationship. The speculative saml_sid-to-directory-object join and its labels have been removed; the SAML identifier is retained without inventing an identity contract or cross-product mapping.

- Directory object names and login activity can be personal data.
- License type values should be interpreted against the installed LFDS version and licensing model.
- The script avoids hard-coded database names and should be deployed in a separate reporting database.
