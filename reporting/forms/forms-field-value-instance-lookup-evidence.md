# Forms Field-Value to Instance Lookup Evidence

Product/version: Forms `12.0.2607.40144` (current structural checks and sample review; not live tested)

This pattern is public-safe. It records schema evidence from the AI export package and the processed SQL-example review queue without copying raw Laserfiche Answers SQL.

## Goal

Find Forms process instances and submissions that contain a matching submitted field value.

## Confirmed Schema Evidence

- `dbo.cf_bp_data.submission_id -> dbo.cf_submissions.submission_id`
- `dbo.cf_submissions.bp_instance_id -> dbo.cf_bp_main_instances.bp_instance_id`
- `dbo.cf_bp_data.attribute_id` aligns with `dbo.cf_fields.attribute_id` for field metadata.
- `dbo.cf_fields.label`, `dbo.cf_fields.custom_field_name`, and `dbo.cf_fields.type` provide field context.
- `dbo.cf_bp_main_instances.status` uses the documented Forms instance status mapping.

## Queue Sources Processed

- [How do I find a specific form submission on my Forms database?](https://answers.laserfiche.com/questions/153974/How-do-I-find-a-specific-form-submission-on-my-Forms-database)
- [Query Forms SQL database to Find Instance based on Field Value](https://answers.laserfiche.com/questions/201522/Query-Forms-SQL-database-to-Find-Instance-based-on-Field-Value)

## Cautions

- Additional read-only Forms `12.0.2607.40144` review found that a variable can bind to fields on multiple forms. The view now requires submission form context from `cf_form_submissions` before attaching field labels. Where that context is absent, raw values and attribute IDs remain, but labels are NULL; a label filter intentionally excludes those unlabeled rows. Multiple matching fields within one form can still produce multiple rows.
- Raw/formatted coverage differs, and submissions can form a previous-submission chain. This lookup is not a complete latest-value snapshot. Main-instance status also does not alone establish worker suspension state. These observations do not constitute live execution testing of this script.

- Field values can include personal or sensitive information. Restrict reporting permissions.
- Repeated fields can produce multiple rows per submission through `repeat_id` and `member_path`.
- The script intentionally avoids hard-coded database names and should be deployed in a separate reporting database.
