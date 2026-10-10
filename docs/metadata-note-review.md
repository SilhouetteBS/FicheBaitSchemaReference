# Metadata Note Review

Reviewed on 2026-10-10 against the 21 canonical schema snapshots. The scope was the 64 distinct unknown columns on curated Reporting-related tables, representing 329 versioned note entries. All received clearer purpose or limitation wording. Table relevance is not proof that each script reads every column.

No row data, live SQL execution, or internal payload decoding was used. Exported keys, identities, FKs, and SQL types establish structure only. Name-based interpretations remain Inferred; undocumented formats and codes remain Unknown. Reappearance in the unknown-note queue does not mean the review was skipped: additional evidence is still required.

## Forms

| Table | Columns reviewed | Disposition |
| --- | --- | --- |
| cf_business_processes | faq_options, is_savetolf_xml_included, style_json, testing_rules | Unknown: numeric option encodings and design/testing payload formats are not exported. smallint does not prove a Boolean encoding. |
| cf_bp_processes | style_json | Unknown: process-definition styling, not instance data; format unverified. |
| cf_bp_steps | definition_json, style_json | Unknown: step-design payloads, not worker execution state. |
| cf_fields | choices, component, signature_options, subfields, wrapper | Unknown: distinguish field definitions from submitted values. subfields is short text, not a proven serialized list; signature_options has no verified mapping. |
| cf_form_submissions | draft_contains | Unknown: text, not a bit flag; may contain sensitive submission context. |
| cf_forms | custom_css, form_js, preview_css | Inferred from names/types: design code; display inertly, never execute or inject. |
| cf_forms | component, json_data, pagination_options, wrapper | Unknown: internal design/configuration formats, not submission answers or page counts. |

## LFDS

| Table | Columns reviewed | Disposition |
| --- | --- | --- |
| directory_objects | flags | Unknown: no verified bit-to-status or permission mapping. |
| identity_providers | scim_enabled, scim_username | Inferred: provider configuration, not sync-health proof or verified end-user join keys. |
| identity_providers | scim_group_rules, scim_organization_id, scim_type | Unknown: no rule format, organization FK, or numeric type mapping. |
| additional_claims | str_val, bin_val | Inferred representations; key and claim_defs FK are exported. Encoding, claim-specific semantics, and interchangeability remain unverified. |
| container_limits | license_uuid | Inferred license discriminator; exported key is (id, license_uuid, resource_uuid), not license_uuid alone. |
| saml_lf_sid_mappings | saml_sid | Inferred SAML-side identity. Unique pair does not establish one-to-one identity; only lf_sid has a directory_objects.sid FK. Cross-product identity encoding remains unverified. |

## Repository

| Table | Columns reviewed | Disposition |
| --- | --- | --- |
| toc | toc_uuid | Observed unique char(36) identifier (toc_uuid_unq), distinct from primary key tocid. Cross-repository portability is not established. |
| toc | etag, edoc_etag, edoc_cksum, toc_flags | Unknown update rules, checksum algorithm, and flag bits. Not timestamps, version numbers, or effective permissions. |
| doc | img_etag, txt_etag, loc_etag, lft_etag, img_cksum, page_flags | Unknown marker/hash/flag semantics; no claim of OCR freshness, redaction state, or a verified expansion of lft. |
| vol | encryption_key_guid | Inferred key reference, not key material or a verified FK. |
| vol | cksum_alg, vol_flags | Unknown algorithm mapping and operational flag bits. |
| propdef | condition_err | Inferred validation-configuration error text, not an actual failure log. |
| propdef | condition, prop_flags | Unknown condition language and field-option bits; never execute as SQL. |
| ann | attach_cksum, attach_etag, bitmap | Unknown hash/marker/encoding semantics. image SQL type does not guarantee a renderable bitmap. |
| trustee | trustee_flags | Unknown bits; not proof of effective permissions or account state. |

## Workflow

| Table | Columns reviewed | Disposition |
| --- | --- | --- |
| wait_condition | condition_id | Observed identity PK, not a condition-type code. wait_condition_entry_fk is exported in four snapshots, but not exported in 12.0.2511.266; that version's note does not assert the relationship. |
| wait_condition | condition, condition_type | Unknown payload language and code mapping. |
| instance_completion | state | Unknown binary payload, not an integer completion code. |
| search_error, search_error_log | activity_message_type, additional_data | Unknown message-type mapping and diagnostic format; potentially sensitive context. |
| workflow_code | csharp_assembly, vb_assembly, workflow_assembly, designer_code | Unknown packaging and serialization. Binary image columns are not file paths; never execute payloads. |
| workflow_task_queue_data | task_data | Unknown queued-task text format; not a status code or verified join key. |

## Further Evidence

Use privately reviewed, version-specific vendor documentation or sanctioned test-system observations to establish option enums, flag masks, payload formats, or identity conversions. Do not submit row data, source bodies, environment names, or credentials through public Issues. Cross-product joins require a verified identity contract, not matching names or SQL types.
