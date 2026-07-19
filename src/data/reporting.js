const reportingAssetLoaders = {
  'reporting/forms/forms-active-task-monitor.sql': () =>
    import('../../reporting/forms/forms-active-task-monitor.sql?raw').then((module) => module.default),
  'reporting/forms/forms-active-task-monitor-evidence.md': () =>
    import('../../reporting/forms/forms-active-task-monitor-evidence.md?raw').then((module) => module.default),
  'reporting/forms/forms-field-value-instance-lookup.sql': () =>
    import('../../reporting/forms/forms-field-value-instance-lookup.sql?raw').then((module) => module.default),
  'reporting/forms/forms-field-value-instance-lookup-evidence.md': () =>
    import('../../reporting/forms/forms-field-value-instance-lookup-evidence.md?raw').then((module) => module.default),
  'reporting/forms/forms-submission-volume-summary.sql': () =>
    import('../../reporting/forms/forms-submission-volume-summary.sql?raw').then((module) => module.default),
  'reporting/forms/forms-submission-volume-summary-evidence.md': () =>
    import('../../reporting/forms/forms-submission-volume-summary-evidence.md?raw').then((module) => module.default),
  'reporting/forms/forms-user-group-inventory.sql': () =>
    import('../../reporting/forms/forms-user-group-inventory.sql?raw').then((module) => module.default),
  'reporting/forms/forms-user-group-inventory-evidence.md': () =>
    import('../../reporting/forms/forms-user-group-inventory-evidence.md?raw').then((module) => module.default),
  'reporting/forms/forms-external-lookup-guidance.sql': () =>
    import('../../reporting/forms/forms-external-lookup-guidance.sql?raw').then((module) => module.default),
  'reporting/forms/forms-external-lookup-guidance-evidence.md': () =>
    import('../../reporting/forms/forms-external-lookup-guidance-evidence.md?raw').then((module) => module.default),
  'reporting/forms/forms-design-lookup-inventory.sql': () =>
    import('../../reporting/forms/forms-design-lookup-inventory.sql?raw').then((module) => module.default),
  'reporting/forms/forms-design-lookup-inventory-evidence.md': () =>
    import('../../reporting/forms/forms-design-lookup-inventory-evidence.md?raw').then((module) => module.default),
  'reporting/forms/forms-attachment-error-draft-diagnostics.sql': () =>
    import('../../reporting/forms/forms-attachment-error-draft-diagnostics.sql?raw').then((module) => module.default),
  'reporting/forms/forms-attachment-error-draft-diagnostics-evidence.md': () =>
    import('../../reporting/forms/forms-attachment-error-draft-diagnostics-evidence.md?raw').then((module) => module.default),
  'reporting/forms/forms-authenticated-participant-signup.sql': () =>
    import('../../reporting/forms/forms-authenticated-participant-signup.sql?raw').then((module) => module.default),
  'reporting/forms/forms-authenticated-participant-signup-evidence.md': () =>
    import('../../reporting/forms/forms-authenticated-participant-signup-evidence.md?raw').then(
      (module) => module.default,
    ),
  'reporting/forms/forms-session-diagnostics.sql': () =>
    import('../../reporting/forms/forms-session-diagnostics.sql?raw').then((module) => module.default),
  'reporting/forms/forms-session-diagnostics-evidence.md': () =>
    import('../../reporting/forms/forms-session-diagnostics-evidence.md?raw').then((module) => module.default),
  'reporting/lfds/lfds-user-license-inventory.sql': () =>
    import('../../reporting/lfds/lfds-user-license-inventory.sql?raw').then((module) => module.default),
  'reporting/lfds/lfds-user-license-inventory-evidence.md': () =>
    import('../../reporting/lfds/lfds-user-license-inventory-evidence.md?raw').then((module) => module.default),
  'reporting/lfds/lfds-directory-account-state.sql': () =>
    import('../../reporting/lfds/lfds-directory-account-state.sql?raw').then((module) => module.default),
  'reporting/lfds/lfds-directory-account-state-evidence.md': () =>
    import('../../reporting/lfds/lfds-directory-account-state-evidence.md?raw').then((module) => module.default),
  'reporting/lfds/lfds-claims-group-license-inventory.sql': () =>
    import('../../reporting/lfds/lfds-claims-group-license-inventory.sql?raw').then((module) => module.default),
  'reporting/lfds/lfds-claims-group-license-inventory-evidence.md': () =>
    import('../../reporting/lfds/lfds-claims-group-license-inventory-evidence.md?raw').then((module) => module.default),
  'reporting/repository/repository-path-metadata-lookup.sql': () =>
    import('../../reporting/repository/repository-path-metadata-lookup.sql?raw').then((module) => module.default),
  'reporting/repository/repository-path-metadata-lookup-evidence.md': () =>
    import('../../reporting/repository/repository-path-metadata-lookup-evidence.md?raw').then((module) => module.default),
  'reporting/repository/repository-page-and-search-diagnostics.sql': () =>
    import('../../reporting/repository/repository-page-and-search-diagnostics.sql?raw').then((module) => module.default),
  'reporting/repository/repository-page-and-search-diagnostics-evidence.md': () =>
    import('../../reporting/repository/repository-page-and-search-diagnostics-evidence.md?raw').then((module) => module.default),
  'reporting/repository/repository-query-compatibility-helpers.sql': () =>
    import('../../reporting/repository/repository-query-compatibility-helpers.sql?raw').then((module) => module.default),
  'reporting/repository/repository-query-compatibility-helpers-evidence.md': () =>
    import('../../reporting/repository/repository-query-compatibility-helpers-evidence.md?raw').then((module) => module.default),
  'reporting/repository/repository-storage-security-diagnostics.sql': () =>
    import('../../reporting/repository/repository-storage-security-diagnostics.sql?raw').then((module) => module.default),
  'reporting/repository/repository-storage-security-diagnostics-evidence.md': () =>
    import('../../reporting/repository/repository-storage-security-diagnostics-evidence.md?raw').then(
      (module) => module.default,
    ),
  'reporting/repository/repository-annotation-redaction-diagnostics.sql': () =>
    import('../../reporting/repository/repository-annotation-redaction-diagnostics.sql?raw').then(
      (module) => module.default,
    ),
  'reporting/repository/repository-annotation-redaction-diagnostics-evidence.md': () =>
    import('../../reporting/repository/repository-annotation-redaction-diagnostics-evidence.md?raw').then(
      (module) => module.default,
    ),
  'reporting/workflow/workflow-queue-search-diagnostics.sql': () =>
    import('../../reporting/workflow/workflow-queue-search-diagnostics.sql?raw').then((module) => module.default),
  'reporting/workflow/workflow-queue-search-diagnostics-evidence.md': () =>
    import('../../reporting/workflow/workflow-queue-search-diagnostics-evidence.md?raw').then((module) => module.default),
  'reporting/workflow/workflow-wait-completion-diagnostics.sql': () =>
    import('../../reporting/workflow/workflow-wait-completion-diagnostics.sql?raw').then((module) => module.default),
  'reporting/workflow/workflow-wait-completion-diagnostics-evidence.md': () =>
    import('../../reporting/workflow/workflow-wait-completion-diagnostics-evidence.md?raw').then((module) => module.default),
  'reporting/workflow/workflow-external-data-source-guidance.sql': () =>
    import('../../reporting/workflow/workflow-external-data-source-guidance.sql?raw').then((module) => module.default),
  'reporting/workflow/workflow-external-data-source-guidance-evidence.md': () =>
    import('../../reporting/workflow/workflow-external-data-source-guidance-evidence.md?raw').then((module) => module.default),
  'reporting/workflow/workflow-definition-history.sql': () =>
    import('../../reporting/workflow/workflow-definition-history.sql?raw').then((module) => module.default),
  'reporting/workflow/workflow-definition-history-evidence.md': () =>
    import('../../reporting/workflow/workflow-definition-history-evidence.md?raw').then((module) => module.default),
};

export const productReportingPaths = {
  forms: [
    {
      title: 'Process lifecycle',
      summary: 'Start with business processes, then follow instances and submission records.',
      tables: ['dbo.cf_business_processes', 'dbo.cf_bp_main_instances', 'dbo.cf_submissions'],
    },
    {
      title: 'Form design to submitted values',
      summary: 'Use form definitions and fields to orient submitted data tables before aggregating.',
      tables: ['dbo.cf_forms', 'dbo.cf_fields', 'dbo.cf_bp_data'],
    },
    {
      title: 'Users, groups, and roles',
      summary: 'Map user records through group membership and role assignment tables.',
      tables: ['dbo.cf_users', 'dbo.cf_usergroups_users_mapping', 'dbo.cf_usergroups', 'dbo.cf_roles'],
    },
    {
      title: 'Tasks, timers, and history',
      summary: 'Use worker instance tables and history tables for queue and task-state reporting.',
      tables: ['dbo.cf_bp_worker_instances', 'dbo.cf_bp_worker_instance_history', 'dbo.cf_bp_task_reminders'],
    },
  ],
  lfds: [
    {
      title: 'Directory identities and providers',
      summary: 'Start with directory objects, then add provider context and login details.',
      tables: ['dbo.directory_objects', 'dbo.identity_providers', 'dbo.user_logins'],
    },
    {
      title: 'User licenses',
      summary: 'Use directory object SIDs to connect identity records to license assignments.',
      tables: ['dbo.directory_objects', 'dbo.user_licenses', 'dbo.container_limits'],
    },
    {
      title: 'SAML to Laserfiche SID mapping',
      summary: 'Use SID mapping tables when reconciling federated users to Laserfiche identities.',
      tables: ['dbo.saml_lf_sid_mappings', 'dbo.directory_objects', 'dbo.identity_providers'],
    },
  ],
  repository: [
    {
      title: 'Repository entry inventory',
      summary: 'Start from TOC entries, then add parent, volume, and template context.',
      tables: ['dbo.toc', 'dbo.vol', 'dbo.propset'],
    },
    {
      title: 'Field metadata and values',
      summary: 'Use field definitions with property values to report entry metadata.',
      tables: ['dbo.propdef', 'dbo.propval', 'dbo.toc'],
    },
    {
      title: 'Document pages and electronic documents',
      summary: 'Use entry and page tables to review page counts, image sizes, and text inventory.',
      tables: ['dbo.toc', 'dbo.doc', 'dbo.vol'],
    },
  ],
  workflow: [
    {
      title: 'Task queue diagnostics',
      summary: 'Use queue and queue data tables to review retry state, queued work, and task payload size.',
      tables: ['dbo.workflow_task_queue', 'dbo.workflow_task_queue_data'],
    },
    {
      title: 'Search activity tracing',
      summary: 'Connect search instance records to search entry records for current and logged activity.',
      tables: ['dbo.search_instance', 'dbo.search_entry', 'dbo.search_instance_log', 'dbo.search_entry_log'],
    },
    {
      title: 'Instance completion status',
      summary: 'Use completion records for workflow instance completion and retry diagnostics.',
      tables: ['dbo.instance_completion'],
    },
  ],
};

const repoBlobBaseUrl = 'https://github.com/SilhouetteBS/FicheBaitSchemaReference/blob/main';

function buildGeneratedCandidateSql(pattern) {
  const objectList = pattern.tables.length ? pattern.tables.map((table) => `--   ${table}`).join('\n') : '--   None captured';
  const versionList = pattern.confirmedVersions?.length ? pattern.confirmedVersions.join(', ') : 'None';
  const sourceLink = pattern.answersLinks?.[0]?.url ?? '';
  const excerpt = String(pattern.capturedExcerpt ?? '').trim();

  return [
    '/*',
    `  Schema-verified Answers candidate: ${pattern.title}`,
    '',
    '  This entry is a source candidate, not a finished reporting script.',
    '  The referenced object names were found in the imported Data Dictionary schemas,',
    '  but the SQL has not been live tested or rewritten into a portable reporting object.',
    '',
    `  Product: ${pattern.product ?? 'Unknown'}`,
    `  Confirmed schema versions: ${versionList}`,
    '  Referenced objects:',
    objectList,
    '',
    `  Source: ${sourceLink}`,
    '*/',
    '',
    excerpt
      ? `/* Captured excerpt from the Answers post. Review and rewrite before use. */\n${excerpt}`
      : `/* No SQL excerpt was captured. Use the source link for manual review. */`,
  ].join('\n');
}

function buildGeneratedCandidateEvidence(pattern) {
  const versionList = pattern.confirmedVersions?.length ? pattern.confirmedVersions.join(', ') : 'None';
  const sourceLink = pattern.answersLinks?.[0]?.url ?? '';
  const notes = pattern.reviewNotes?.length ? pattern.reviewNotes : ['Not live tested. Review before operational use.'];
  const suggestions = pattern.improvementSuggestions?.length
    ? pattern.improvementSuggestions
    : ['Convert the candidate into a narrow read-only SELECT/view/procedure before promoting it as a finished script.'];

  return [
    `# ${pattern.title}`,
    '',
    '## Review status',
    '',
    '- Source type: Laserfiche Answers community post',
    '- Site status: Schema-verified source candidate',
    '- Live tested: No',
    '- Support posture: Read-only research aid; validate changes in a test environment.',
    `- Confirmed schema versions: ${versionList}`,
    '',
    '## Referenced objects',
    '',
    ...(pattern.tables.length ? pattern.tables.map((table) => `- \`${table}\``) : ['- None captured']),
    '',
    '## Review notes',
    '',
    ...notes.map((note) => `- ${note}`),
    '',
    '## Suggested next review',
    '',
    ...suggestions.map((suggestion) => `- ${suggestion}`),
    '',
    '## Source',
    '',
    `- [${pattern.title}](${sourceLink})`,
  ].join('\n');
}

export const communityReportingPatterns = {
  forms: [
    {
      title: 'Forms active task and Monitor reporting',
      summary:
        'Creates reporting-database views and procedures for active Forms tasks, worker instances, and Monitor-style task review.',
      scriptPath: 'reporting/forms/forms-active-task-monitor.sql',
      evidencePath: 'reporting/forms/forms-active-task-monitor-evidence.md',
      sourceCount: 17,
      tables: [
        'dbo.cf_bp_main_instances',
        'dbo.cf_bp_worker_instances',
        'dbo.cf_bp_worker_instance_history',
        'dbo.cf_bp_data',
        'dbo.cf_bp_worker_instnc_to_resume',
        'dbo.cf_bp_instance_approvers',
        'dbo.cf_user_snapshot',
        'dbo.cf_bp_steps',
      ],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Forms Instance Monitoring',
          url: 'https://answers.laserfiche.com/questions/102452/Forms-Instance-Monitoring',
        },
        {
          title: 'Troubleshoot Forms SQL Blockers',
          url: 'https://answers.laserfiche.com/questions/233803/Troubleshoot-Forms-SQL-Blockers',
        },
        {
          title: 'Forms report with start time and end time for each User Task',
          url: 'https://answers.laserfiche.com/questions/212282/Forms-report-with--start-time-and-end-time-for-each-User-Task-in-Forms-process',
        },
        {
          title: 'Report to use for Active Forms',
          url: 'https://answers.laserfiche.com/questions/216937/Report-to-use-for-Active-Forms',
        },
        {
          title: 'Forms Report to Dynamically show all tasks started by you',
          url: 'https://answers.laserfiche.com/questions/184820/Forms-Report-to-Dynamically-show-all-tasks-started-by-you',
        },
        {
          title: 'Generating Report on Unassigned Tasks',
          url: 'https://answers.laserfiche.com/questions/208760/Generating-Report-on-Unassigned-Tasks',
        },
        {
          title: 'delete outstanding forms from a deleted account',
          url: 'https://answers.laserfiche.com/questions/233682/delete-outstanding-forms-from-a-deleted-account',
        },
        {
          title: 'Current step information from Monitor page',
          url: 'https://answers.laserfiche.com/questions/215801/How-can-I-retrieve-the-current-step-information-from-an-SQL-table-which-is-displayed-on-the-Monitor-page',
        },
        {
          title: 'Forms SQL query for all instances at a gateway step',
          url: 'https://answers.laserfiche.com/questions/197726/Forms-SQL-query-for-all-instances-at-a-gateway-step',
        },
        {
          title: 'Forms Inbox Email Reminder',
          url: 'https://answers.laserfiche.com/questions/76772/Forms-Inbox-Email-Reminder',
        },
        {
          title: 'Number of active Forms tasks for each user type',
          url: 'https://answers.laserfiche.com/questions/131323/Number-of-active-Forms-tasks-for-each-user-type',
        },
        {
          title: 'Custom Reporting | Task Names',
          url: 'https://answers.laserfiche.com/questions/223652/Custom-Reporting--Task-Names',
        },
        {
          title: 'Report on Reassigned Tasks within a Forms Process',
          url: 'https://answers.laserfiche.com/questions/160384/Report-on-Reassigned-Tasks-within-a-Forms-Process',
        },
        {
          title: "Forms 10.4 task reassignment for users who don't have a license",
          url: 'https://answers.laserfiche.com/questions/221322/Forms-104-task-reassignment-for-users-who-dont-have-a-license',
        },
        {
          title: 'Determining Step ID/Name in Workflow When Started by a Forms Process',
          url: 'https://answers.laserfiche.com/questions/146710/Determining-Step-IDName-in-Workflow-When-Started-by-a-Forms-Process',
        },
        {
          title: 'Does Laserfiche Forms has an API',
          url: 'https://answers.laserfiche.com/questions/203576/Does-Laserfiche-Forms-has-an-API',
        },
        {
          title: 'Cannot send email notifications to a user',
          url: 'https://answers.laserfiche.com/questions/207661/Cannot-send-email-notifications-to-a-user',
        },
      ],
    },
    {
      title: 'Forms field-value to instance lookup',
      summary:
        'Creates a reporting view and procedure that connect submitted values to Forms submissions and business process instances.',
      scriptPath: 'reporting/forms/forms-field-value-instance-lookup.sql',
      evidencePath: 'reporting/forms/forms-field-value-instance-lookup-evidence.md',
      sourceCount: 5,
      tables: ['dbo.cf_bp_data', 'dbo.cf_submissions', 'dbo.cf_bp_main_instances', 'dbo.cf_fields'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'How do I find a specific form submission on my Forms database?',
          url: 'https://answers.laserfiche.com/questions/153974/How-do-I-find-a-specific-form-submission-on-my-Forms-database',
        },
        {
          title: 'Query Forms SQL database to Find Instance based on Field Value',
          url: 'https://answers.laserfiche.com/questions/201522/Query-Forms-SQL-database-to-Find-Instance-based-on-Field-Value',
        },
      ],
    },
    {
      title: 'Forms submission volume summary',
      summary:
        'Creates reporting-database objects for submission and instance counts by process, status, and date range.',
      scriptPath: 'reporting/forms/forms-submission-volume-summary.sql',
      evidencePath: 'reporting/forms/forms-submission-volume-summary-evidence.md',
      sourceCount: 2,
      tables: ['dbo.cf_bp_main_instances', 'dbo.cf_business_processes', 'dbo.cf_submissions'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Top 10 Forms Submissions',
          url: 'https://answers.laserfiche.com/questions/237177/Top-10-Forms-Submissions--An-Experience-Using-AI-To-Write-A-SQL-Query',
        },
        {
          title: 'Report to use for Active Forms',
          url: 'https://answers.laserfiche.com/questions/216937/Report-to-use-for-Active-Forms',
        },
      ],
    },
    {
      title: 'Forms user and group inventory',
      summary:
        'Creates read-only reporting objects for Forms users, user types, administrator flags, activation, login timestamps, and group membership.',
      scriptPath: 'reporting/forms/forms-user-group-inventory.sql',
      evidencePath: 'reporting/forms/forms-user-group-inventory-evidence.md',
      sourceCount: 5,
      tables: ['dbo.cf_users', 'dbo.cf_usergroups_users_mapping', 'dbo.cf_usergroups'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Named users list',
          url: 'https://answers.laserfiche.com/questions/122499/Named-users-list',
        },
        {
          title: 'Get group name in Forms',
          url: 'https://answers.laserfiche.com/questions/149043/Get-group-name-in-Forms',
        },
        {
          title: 'Join login and username',
          url: 'https://answers.laserfiche.com/questions/141935/Join-login-and-username',
        },
        {
          title: 'Participant User Not Seeing Anything After Logging In',
          url: 'https://answers.laserfiche.com/questions/64738/Participant-User-Not-Seeing-Anything-After-Logging-In',
        },
        {
          title: 'SQL Query to Find Forms Processes User Has Access Rights To',
          url: 'https://answers.laserfiche.com/questions/224490/SQL-Query-to-Find-Forms-Processes-User-Has-Access-Rights-To',
        },
      ],
    },
    {
      title: 'Forms external lookup guidance',
      summary:
        'Provides schema-neutral customer-owned lookup table and stored procedure patterns for Forms lookup rules and external SQL data sources.',
      scriptPath: 'reporting/forms/forms-external-lookup-guidance.sql',
      evidencePath: 'reporting/forms/forms-external-lookup-guidance-evidence.md',
      sourceCount: 6,
      tables: [],
      tags: ['Community sourced', 'Schema neutral', 'Not live tested', 'Context only'],
      answersLinks: [
        {
          title: 'Forms SQL Function Lookup',
          url: 'https://answers.laserfiche.com/questions/61668/Forms-SQL-Funcion-Lookup',
        },
        {
          title: 'Form Lookup',
          url: 'https://answers.laserfiche.com/questions/173089/Form-Lookup',
        },
        {
          title: 'Set drop-down field default when populating with database query',
          url: 'https://answers.laserfiche.com/questions/68625/Set-dropdown-field-default-when-populating-with-database-query',
        },
        {
          title: 'Lookup rule not working on public form',
          url: 'https://answers.laserfiche.com/questions/165147/Lookup-rule-not-working-on-public-form',
        },
        {
          title: 'LF Forms and Workflow query linked SQL or MySQL Server',
          url: 'https://answers.laserfiche.com/questions/66314/LF-Forms-and-Workflow-query-Linked-SQL-or-MySQL-Server-possible-at-all-',
        },
        {
          title: 'How to create a workflow to auto generate a report',
          url: 'https://answers.laserfiche.com/questions/226520/How-to-create-a-workflow-to-auto-generate-a-report',
        },
      ],
    },
    {
      title: 'Forms design and lookup inventory',
      summary:
        'Creates read-only reporting objects for Forms, fields, variables, process references, external lookup sources, and lookup mappings.',
      scriptPath: 'reporting/forms/forms-design-lookup-inventory.sql',
      evidencePath: 'reporting/forms/forms-design-lookup-inventory-evidence.md',
      sourceCount: 14,
      tables: [
        'dbo.cf_forms',
        'dbo.cf_fields',
        'dbo.cf_bp_dataset',
        'dbo.cf_external_databases',
        'dbo.cf_field_column_mapping',
        'dbo.cf_bp_processes',
        'dbo.cf_business_processes',
        'dbo.cf_form_process_mapping',
      ],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'SQL query for Form lookups',
          url: 'https://answers.laserfiche.com/questions/225408/SQL-query-for-Form-lookups',
        },
        {
          title: 'Lookup tables in Forms, where used?',
          url: 'https://answers.laserfiche.com/questions/227968/Lookup-tables-in-Forms-where-used',
        },
        {
          title: 'Query forms database for Forms, Fields and variables per business process',
          url: 'https://answers.laserfiche.com/questions/166490/query-forms-database-for-Forms-Fields-and-variables-per-business-process',
        },
        {
          title: 'Show variable names with field location on form',
          url: 'https://answers.laserfiche.com/questions/226145/Show-variable-names-with-field-location-on-form',
        },
        {
          title: 'Last Person to Edit Forms',
          url: 'https://answers.laserfiche.com/questions/116789/Last-Person-to-Edit-Forms',
        },
        {
          title: 'Forms - How to find a reference to a form in the process',
          url: 'https://answers.laserfiche.com/questions/184061/Forms--How-to-find-a-reference-to-a-form-in-the-process',
        },
        {
          title: 'Forms Database Tables Documentation',
          url: 'https://answers.laserfiche.com/questions/120310/Forms-Database-Tables-Documentation',
        },
        {
          title: 'Is there a way to grab all form names and their respective url link?',
          url: 'https://answers.laserfiche.com/questions/94941/Is-there-a-way-to-grab-all-form-names-and-their-respective-url-link',
        },
        {
          title: 'Report of all forms created',
          url: 'https://answers.laserfiche.com/questions/188296/Report-of-all-forms-created',
        },
        {
          title: 'Forms: User drop down list',
          url: 'https://answers.laserfiche.com/questions/77375/Forms-User-drop-down-list',
        },
        {
          title: 'Populate Forms Drop Down List with Team Roles/Members',
          url: 'https://answers.laserfiche.com/questions/119534/Populate-Forms-Drop-Down-List-with-Team-RolesMembers',
        },
        {
          title: "Can you set a field's default value to the logged in user's role",
          url: 'https://answers.laserfiche.com/questions/143857/Can-you-set-a-fields-default-value-to-the-logged-in-users-role',
        },
        {
          title: 'Bug in Forms 9.2.0.908 - Noticeable on Publish Page',
          url: 'https://answers.laserfiche.com/questions/72817/Bug-in-Forms-920908--Noticeable-on-Publish-Page',
        },
        {
          title: 'Forms High Security Solution Feature Request: Have Forms Sync between both databases',
          url: 'https://answers.laserfiche.com/questions/147827/Forms-High-Security-Solution-Feature-Request--Have-Forms-Sync-between-both-databases',
        },
      ],
    },
    {
      title: 'Forms attachment, error, and draft diagnostics',
      summary:
        'Creates read-only diagnostics for attachment metadata, instance errors, and saved draft submissions without exposing attachment binary content.',
      scriptPath: 'reporting/forms/forms-attachment-error-draft-diagnostics.sql',
      evidencePath: 'reporting/forms/forms-attachment-error-draft-diagnostics-evidence.md',
      sourceCount: 11,
      tables: [
        'dbo.cf_bp_attachment_data',
        'dbo.cf_bp_data_attachment_mapping',
        'dbo.bp_instance_errors',
        'dbo.cf_form_submissions',
        'dbo.cf_submissions',
        'dbo.cf_bp_processes',
        'dbo.cf_business_processes',
      ],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Validate PDF headers for Forms attachments',
          url: 'https://answers.laserfiche.com/questions/131478/Validate-PDF-headers-for-Forms-attachments',
        },
        {
          title: 'Custom Field in Report',
          url: 'https://answers.laserfiche.com/questions/188200/Custom-Field-in-Report',
        },
        {
          title: 'Resubmitting Previously Submitted Form Data',
          url: 'https://answers.laserfiche.com/questions/165126/Resubmitting-Previously-Submitted-Form-Data',
        },
        {
          title: 'Delete Completed/Cancelled Forms from SQL (Forms 10.2)',
          url: 'https://answers.laserfiche.com/questions/137948/Delete-CompletedCancelled-Forms-from-SQL-Forms-102',
        },
        {
          title: 'Forms Logs in Web Interface',
          url: 'https://answers.laserfiche.com/questions/172983/Forms-Logs-in-Web-Interface',
        },
        {
          title: 'View all saved Drafts as an Admin',
          url: 'https://answers.laserfiche.com/questions/163792/View-all-saved-Drafts-as-an-Admin',
        },
        {
          title: 'How do I create a report on drafts in Forms?',
          url: 'https://answers.laserfiche.com/questions/236187/How-do-I-create-a-report-on-drafts-in-Forms',
        },
        {
          title: 'Retrieve draft in forms',
          url: 'https://answers.laserfiche.com/questions/105714/Retrieve-draft-in-forms',
        },
        {
          title: 'Where Are Saved Forms Kept in the Database?',
          url: 'https://answers.laserfiche.com/questions/53695/Where-Are-Saved-Forms-Kept-in-the-Database',
        },
        {
          title: 'Easiest way to determine which collection or table has an invalid number of rows?',
          url: 'https://answers.laserfiche.com/questions/218970/Easiest-way-to-determine-which-collection-or-table-has-an-invalid-number-of-rows',
        },
        {
          title: 'Form Deleted - Are Transactions Stored?',
          url: 'https://answers.laserfiche.com/questions/87939/Form-Deleted--Are-Transactions-Stored',
        },
      ],
    },
    {
      title: 'Forms authenticated participant sign-ups',
      summary:
        'Creates a read-only reporting view and procedure for authenticated participant sign-up records and creation dates.',
      scriptPath: 'reporting/forms/forms-authenticated-participant-signup.sql',
      evidencePath: 'reporting/forms/forms-authenticated-participant-signup-evidence.md',
      sourceCount: 1,
      tables: ['dbo.cf_users_sign_up'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Creation date of a forms authenticated participant',
          url: 'https://answers.laserfiche.com/questions/100971/Creation-date-of-a-forms-authenticated-participant',
        },
      ],
    },
    {
      title: 'Forms session diagnostics',
      summary:
        'Creates read-only diagnostics for Forms sessions, last activity, user context, and session-variable row counts.',
      scriptPath: 'reporting/forms/forms-session-diagnostics.sql',
      evidencePath: 'reporting/forms/forms-session-diagnostics-evidence.md',
      sourceCount: 1,
      tables: ['dbo.cf_sessions', 'dbo.cf_session_variables', 'dbo.cf_users'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Forms SQL queries are consuming all the server resources',
          url: 'https://answers.laserfiche.com/questions/118286/Forms-SQL-queries-are-consuming-all-the-server-resources',
        },
      ],
    },
  ],
  lfds: [
    {
      title: 'LFDS user and license inventory',
      summary:
        'Creates read-only reporting objects for directory users, identity providers, logins, licenses, limits, and SAML SID mappings.',
      scriptPath: 'reporting/lfds/lfds-user-license-inventory.sql',
      evidencePath: 'reporting/lfds/lfds-user-license-inventory-evidence.md',
      sourceCount: 9,
      tables: [
        'dbo.directory_objects',
        'dbo.identity_providers',
        'dbo.user_logins',
        'dbo.user_licenses',
        'dbo.container_limits',
        'dbo.saml_lf_sid_mappings',
      ],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Any ways to get Laserfiche Directory account lock status in batch?',
          url: 'https://answers.laserfiche.com/questions/206318/Any-ways-to-get-Laserfiche-Directory-account-lock-status-in-batch',
        },
        {
          title: 'Querying LFDS database for user last log in in Forms',
          url: 'https://answers.laserfiche.com/questions/151526/Querying-LFDS-database-for-user-last-log-in-in-Forms',
        },
        {
          title: 'Directory Server Database query help',
          url: 'https://answers.laserfiche.com/questions/204411/Directory-Server-Database-query-help',
        },
        {
          title: 'Number of licenses we own',
          url: 'https://answers.laserfiche.com/questions/184000/Number-of-licenses-we-ownin-the-database',
        },
        {
          title: 'Linking multiple SAML identity providers through common username',
          url: 'https://answers.laserfiche.com/questions/213876/Linking-multiple-SAML-identity-providers-through-common-username',
        },
        {
          title: 'Last sign-in time in LFDS 12, database location?',
          url: 'https://answers.laserfiche.com/questions/232845/Last-signin-time-in-LFDS-12-database-location',
        },
        {
          title: 'Directory Server database',
          url: 'https://answers.laserfiche.com/questions/117487/Directory-Server-database',
        },
        {
          title: 'LFDS database user_logins table not updated for some Windows users',
          url: 'https://answers.laserfiche.com/questions/236312/LFDS-database-userlogins-table-not-updated-for-some-Windows-users',
        },
      ],
    },
    {
      title: 'LFDS directory account state',
      summary:
        'Creates read-only account-state and group-membership views for directory objects, login failures, and identity providers.',
      scriptPath: 'reporting/lfds/lfds-directory-account-state.sql',
      evidencePath: 'reporting/lfds/lfds-directory-account-state-evidence.md',
      sourceCount: 3,
      tables: ['dbo.directory_objects', 'dbo.identity_providers', 'dbo.user_logins', 'dbo.group_membership'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Any ways to get Laserfiche Directory account lock status in batch?',
          url: 'https://answers.laserfiche.com/questions/206318/Any-ways-to-get-Laserfiche-Directory-account-lock-status-in-batch',
        },
        {
          title: 'How to query User with organization in LFDS Database?',
          url: 'https://answers.laserfiche.com/questions/187013/How-to-query-User-with-organization-in-LFDS-Database-',
        },
        {
          title: 'LFDS User filter',
          url: 'https://answers.laserfiche.com/questions/165621/LFDS-User-filter',
        },
      ],
    },
    {
      title: 'LFDS claims, group, and license inventory',
      summary:
        'Creates read-only reporting objects for directory objects, additional claims, group membership, license rows, and login context.',
      scriptPath: 'reporting/lfds/lfds-claims-group-license-inventory.sql',
      evidencePath: 'reporting/lfds/lfds-claims-group-license-inventory-evidence.md',
      sourceCount: 8,
      tables: [
        'dbo.directory_objects',
        'dbo.additional_claims',
        'dbo.group_membership',
        'dbo.user_licenses',
        'dbo.user_logins',
      ],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'In Progress Forms Tasks',
          url: 'https://answers.laserfiche.com/questions/211569/In-Progress-Forms-Tasks',
        },
        {
          title: 'SQL Query to retrieve the email, username, display name and the License Type',
          url: 'https://answers.laserfiche.com/questions/131649/SQL-Query-to-retrieve-the-email-username-display-name-and-the-License-Type',
        },
        {
          title: 'Export all LFDS groups and respective users',
          url: 'https://answers.laserfiche.com/questions/205004/How-can-one-export-a-list-of-all-the-groups-and-respective-users-in-LF-directory-server',
        },
        {
          title: 'Add LFDS Groups to SQL Query',
          url: 'https://answers.laserfiche.com/questions/217062/Add-LFDS-Groups-to-SQL-Query',
        },
        {
          title: 'Adjust a form based on the group the user is in',
          url: 'https://answers.laserfiche.com/questions/194574/How-to-adjust-a-forms-functionality-based-on-the-group-the-user-is-in',
        },
        {
          title: 'Query for Forms',
          url: 'https://answers.laserfiche.com/questions/199344/Query-for-Forms',
        },
        {
          title: 'LFDS User License Display Limitations',
          url: 'https://answers.laserfiche.com/questions/172516/LFDS-User-License-Display-Limitations',
        },
        {
          title: 'From Workflows, retrieving email and manager info for LFDS Trustees',
          url: 'https://answers.laserfiche.com/questions/147922/From-Workflows-retrieving-email-and-manager-info-for-LFDS-Thrustees',
        },
      ],
    },
  ],
  repository: [
    {
      title: 'Repository annotation and redaction diagnostics',
      summary:
        'Creates read-only diagnostics for annotation rectangles, redaction candidates, page context, and entries that may need review.',
      scriptPath: 'reporting/repository/repository-annotation-redaction-diagnostics.sql',
      evidencePath: 'reporting/repository/repository-annotation-redaction-diagnostics-evidence.md',
      sourceCount: 2,
      tables: ['dbo.ann', 'dbo.annrect', 'dbo.doc', 'dbo.toc'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Redactions without Text',
          url: 'https://answers.laserfiche.com/questions/77035/Redactions-without-Text',
        },
        {
          title: 'Retrieve Physical File Path of TIFFs and E-Docs Using Entry ID in Laserfiche',
          url: 'https://answers.laserfiche.com/questions/227206/Retrieve-Physical-File-Path-of-TIFFs-and-EDocs-Using-Entry-ID-in-Laserfiche',
        },
      ],
    },
    {
      title: 'Repository path and metadata lookup',
      summary:
        'Creates read-only reporting views and a lookup procedure for entries, parent folders, volumes, pages, templates, and field values.',
      scriptPath: 'reporting/repository/repository-path-metadata-lookup.sql',
      evidencePath: 'reporting/repository/repository-path-metadata-lookup-evidence.md',
      sourceCount: 18,
      tables: ['dbo.toc', 'dbo.doc', 'dbo.vol', 'dbo.propset', 'dbo.propdef', 'dbo.propval'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'How to mimic a repository search using a SQL query?',
          url: 'https://answers.laserfiche.com/questions/156668/How-to-mimic-a-repository-search-using-a-SQL-query',
        },
        {
          title: 'Feature Request: Ability to use Lookup Rules in Forms to query metadata in repository',
          url: 'https://answers.laserfiche.com/questions/207941/Feature-Request--Ability-to-use-Lookup-Rules-in-Forms-to-query-metadata-in-repository',
        },
        {
          title: 'Query to see how many pages in repository are in color and black & white?',
          url: 'https://answers.laserfiche.com/questions/168368/Query-to-see-how-many-pages-in-repository-are-in-color-and-black--white',
        },
        {
          title: 'SQL query on LF Server tables for specific metadata',
          url: 'https://answers.laserfiche.com/questions/201363/SQL-query-on-LF-Server-tables-for-specific-metadata',
        },
        {
          title: 'What table in SQL is the document path located?',
          url: 'https://answers.laserfiche.com/questions/67002/What-table-in-SQL-is-the-document-path-located',
        },
        {
          title: 'Audit trail on Number of Records in Each Folder',
          url: 'https://answers.laserfiche.com/questions/154758/Audit-trail-on-Number-of-Records-in-Each-Folder',
        },
        {
          title: 'Folder name in dbo.toc different to repository',
          url: 'https://answers.laserfiche.com/questions/207423/Folder-name-in-dbotoc-different-to-repository',
        },
        {
          title: 'Checking A Field Value from the Form to see if it exists in Repository',
          url: 'https://answers.laserfiche.com/questions/173171/Checking-A-Field-Value-from-the-Form-to-see-if-it-exists-in-Repository',
        },
        {
          title: 'Restore after Metadata Field Type change',
          url: 'https://answers.laserfiche.com/questions/164669/Restore-after-Metadata-Field-Type-change',
        },
        {
          title: 'Retrieving values from an index list item',
          url: 'https://answers.laserfiche.com/questions/224419/Retrieving-values-from-an-index-list-item',
        },
        {
          title: 'Count the number of documents a template is assigned to per day',
          url: 'https://answers.laserfiche.com/questions/105169/Count-the-number-of-documents-a-template-is-assigned-to-per-day',
        },
        {
          title: 'wait condition sticky note',
          url: 'https://answers.laserfiche.com/questions/117562/wait-condition-sticky-note',
        },
      ],
    },
    {
      title: 'Repository page and search diagnostics',
      summary:
        'Creates read-only diagnostics for page counts, likely color pages, image/text sizes, active documents, and search-related troubleshooting context.',
      scriptPath: 'reporting/repository/repository-page-and-search-diagnostics.sql',
      evidencePath: 'reporting/repository/repository-page-and-search-diagnostics-evidence.md',
      sourceCount: 10,
      tables: ['dbo.toc', 'dbo.doc', 'dbo.vol', 'dbo.active_doc'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Query to see how many pages in repository are in color and black & white?',
          url: 'https://answers.laserfiche.com/questions/168368/Query-to-see-how-many-pages-in-repository-are-in-color-and-black--white',
        },
        {
          title: 'Unknown SQL have a performance impact on Laseriche',
          url: 'https://answers.laserfiche.com/questions/66306/Unknown-SQL-have-a-performance-impact-on-Laseriche',
        },
        {
          title: 'General database error 9008 during search',
          url: 'https://answers.laserfiche.com/questions/221495/While-we-search-within-repository-we-got-error--Error-executing-SQL-command-General-database-error-9008',
        },
        {
          title: 'ORA-32033 unsupported column aliasing',
          url: 'https://answers.laserfiche.com/questions/78110/sql-statement-returns-ORA32033-unsupported-column-aliasing',
        },
        {
          title: 'search performance',
          url: 'https://answers.laserfiche.com/questions/56636/search-performance',
        },
        {
          title: 'SQL - Missing Indexes',
          url: 'https://answers.laserfiche.com/questions/82284/SQL--Missing-Indexes',
        },
        {
          title: 'Disconnect User Sessions Using Script',
          url: 'https://answers.laserfiche.com/questions/193285/Disconnect-User-Sessions-Using-Script',
        },
      ],
    },
    {
      title: 'Repository query compatibility helpers',
      summary:
        'Creates read-only helper objects for repository schema-version checks, Workflow Custom Query token conflicts, and binary-to-hex conversion.',
      scriptPath: 'reporting/repository/repository-query-compatibility-helpers.sql',
      evidencePath: 'reporting/repository/repository-query-compatibility-helpers-evidence.md',
      sourceCount: 8,
      tables: ['dbo.dboptions', 'dbo.toc', 'dbo.propval', 'dbo.propdef'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'LF Repository - SQL table details with table schema and dictionary',
          url: 'https://answers.laserfiche.com/questions/223444/LF-Repository--SQL-table-details-with-table-schema-and-dictionary',
        },
        {
          title: 'Azure DBs for repositories',
          url: 'https://answers.laserfiche.com/questions/218919/Azure-DBs-for-repositories',
        },
        {
          title: 'LFQL Through Workflow',
          url: 'https://answers.laserfiche.com/questions/50622/LFQL-Through-Workflow',
        },
        {
          title: 'SQL Database looking for LF Server version 8.6.1',
          url: 'https://answers.laserfiche.com/questions/89879/SQL-Database-looking-for-LF-Server-version-861',
        },
        {
          title: 'Token not found error in Custom Query',
          url: 'https://answers.laserfiche.com/questions/132492/Token-not-found-error-in-Custom-Query',
        },
        {
          title: 'Store binary hex value from SQL Query',
          url: 'https://answers.laserfiche.com/questions/48378/How-can-I-store-the-binary-hex-value-from-a-SQL-Query-without-Workflow-conveting-it-to-a-series-of-decimal-numbers',
        },
        {
          title: 'SQL database schema does not match error 9110',
          url: 'https://answers.laserfiche.com/questions/52173/SQL-database-schema-does-not-match-error-9110',
        },
        {
          title: 'Laserfiche Server version for a Database with a schema of 7.2.1',
          url: 'https://answers.laserfiche.com/questions/193436/Laserfiche-Server-version-for-a-Database-with-a-schema-of-721',
        },
      ],
    },
    {
      title: 'Repository storage and security diagnostics',
      summary:
        'Creates read-only diagnostics for recycle bin entries, volume storage, account cache, trustee, trusted group, and trusted login context.',
      scriptPath: 'reporting/repository/repository-storage-security-diagnostics.sql',
      evidencePath: 'reporting/repository/repository-storage-security-diagnostics-evidence.md',
      sourceCount: 10,
      tables: [
        'dbo.recycle_bin',
        'dbo.toc',
        'dbo.vol',
        'dbo.account_cache',
        'dbo.trustee',
        'dbo.trusted_group',
        'dbo.trusted_login',
      ],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Is there a way to find out the recycle bin size of a repository?',
          url: 'https://answers.laserfiche.com/questions/56763/Is-there-a-way-to-find-out-the-recycle-bin-size-of-a-repository',
        },
        {
          title: 'General database error while searching with one user but not with admin account',
          url: 'https://answers.laserfiche.com/questions/203436/General-database-error-while-searching-with-one-user-but-not-with-admin-account',
        },
        {
          title: 'SQL Server temp database size',
          url: 'https://answers.laserfiche.com/questions/103672/SQL-Server-temp-database-size',
        },
        {
          title: 'SQL Table for finding electronic file location',
          url: 'https://answers.laserfiche.com/questions/77337/SQL-Table-for-finding-electronic-file-location',
        },
        {
          title: 'Error executing SQL command',
          url: 'https://answers.laserfiche.com/questions/68697/Error-executing-SQL-command',
        },
        {
          title: 'Where are Windows Account details stored in SQL',
          url: 'https://answers.laserfiche.com/questions/63116/Where-are-Windows-Account-details-stored-in-SQL',
        },
        {
          title: 'lookup a repository folder',
          url: 'https://answers.laserfiche.com/questions/157902/lookup-a-repository-folder',
        },
        {
          title: 'Getting the Created By field',
          url: 'https://answers.laserfiche.com/questions/160770/Getting-the-Created-By-field',
        },
        {
          title: 'Moving user settings',
          url: 'https://answers.laserfiche.com/questions/74962/Moving-user-settings',
        },
        {
          title: 'Windows Accounts under Users and Groups',
          url: 'https://answers.laserfiche.com/questions/130988/Windows-Accounts-under-Users-and-Groups',
        },
      ],
    },
  ],
  workflow: [
    {
      title: 'Workflow queue and search diagnostics',
      summary:
        'Creates read-only reporting objects for workflow task queues, queue payload sizes, search activity, and completion status.',
      scriptPath: 'reporting/workflow/workflow-queue-search-diagnostics.sql',
      evidencePath: 'reporting/workflow/workflow-queue-search-diagnostics-evidence.md',
      sourceCount: 9,
      tables: [
        'dbo.workflow_task_queue',
        'dbo.workflow_task_queue_data',
        'dbo.search_instance',
        'dbo.search_entry',
        'dbo.search_instance_log',
        'dbo.search_entry_log',
        'dbo.search_activity',
        'dbo.search_activity_log',
        'dbo.search_error',
        'dbo.search_error_log',
        'dbo.instance_completion',
      ],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Workflow activity search SQL error ambiguous column name',
          url: 'https://answers.laserfiche.com/questions/62128/Workflow-activity-search-SQL-error-ambiguous-column-name',
        },
        {
          title: 'A transport-level error has occurred when receiving results from the server',
          url: 'https://answers.laserfiche.com/questions/105587/A-transportlevel-error-has-occurred-when-receiving-results-from-the-server-provider-TCP-Provider-error-0--The-semaphore-timeout-period-has-expired',
        },
        {
          title: 'workflow_task_queue_data table size very large',
          url: 'https://answers.laserfiche.com/questions/128584/workflowTaskQueuedata-table-size-very-large--Using-SQL-Express-database',
        },
        {
          title: 'SQL Query to identify workflows running more than an Hour',
          url: 'https://answers.laserfiche.com/questions/136072/SQL-Query-to-identify-workflows-running-more-than-an-Hour',
        },
        {
          title: 'SQL Query to get the number of workflows by repository name or ID',
          url: 'https://answers.laserfiche.com/questions/153150/SQL-Query-to-get-the-number-of-workflows-by-repository-name-or-ID',
        },
        {
          title: 'Feature Request: List all rules invoking a given workflow rule',
          url: 'https://answers.laserfiche.com/questions/181460/Feature-Request-List-all-rules-invoking-a-given-separate-workflow-rule',
        },
        {
          title: 'Daily Workflow Report of Instances Running Longer than X Amount of Time',
          url: 'https://answers.laserfiche.com/questions/91303/Daily-Workflow-Report-of-Instances-Running-Longer-than-X-Amount-of-Time',
        },
        {
          title: 'Workflow Warning/Error locations',
          url: 'https://answers.laserfiche.com/questions/148987/Workflow-WarningError-locations',
        },
        {
          title: 'Workflow database question',
          url: 'https://answers.laserfiche.com/questions/97863/Workflow-database-question',
        },
        {
          title: 'Awesome Workflow SQL Database Size despite Single Day Log Files Lifetime',
          url: 'https://answers.laserfiche.com/questions/81029/Awesome-Workflow-SQL-Database-Size-despite-Single-Day-Log-Files-Lifetime',
        },
        {
          title: 'Feature Request: Display Scheduled WF Rules on a Calendar',
          url: 'https://answers.laserfiche.com/questions/174675/Feature-Request-Display-Scheduled-WF-Rules-on-a-Calendar',
        },
      ],
    },
    {
      title: 'Workflow wait and completion diagnostics',
      summary:
        'Creates read-only views for wait conditions and completion retry state while exposing payload sizes instead of payload contents.',
      scriptPath: 'reporting/workflow/workflow-wait-completion-diagnostics.sql',
      evidencePath: 'reporting/workflow/workflow-wait-completion-diagnostics-evidence.md',
      sourceCount: 2,
      tables: ['dbo.wait_condition', 'dbo.instance_completion'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Connection pool timeout',
          url: 'https://answers.laserfiche.com/questions/105585/Timeout-expired--The-timeout-period-elapsed-prior-to-obtaining-a-connection-from-the-pool--This-may-have-occurred-because-all-pooled-connections-were-in-use-and-max-pool-size-was-reached',
        },
        {
          title: 'Transport-level semaphore timeout',
          url: 'https://answers.laserfiche.com/questions/105587/A-transportlevel-error-has-occurred-when-receiving-results-from-the-server-provider-TCP-Provider-error-0--The-semaphore-timeout-period-has-expired',
        },
      ],
    },
    {
      title: 'Workflow external data source guidance',
      summary:
        'Provides schema-neutral staging table and lookup procedure patterns for Workflow Query Data and Custom Query activities.',
      scriptPath: 'reporting/workflow/workflow-external-data-source-guidance.sql',
      evidencePath: 'reporting/workflow/workflow-external-data-source-guidance-evidence.md',
      sourceCount: 6,
      tables: [],
      tags: ['Community sourced', 'Schema neutral', 'Not live tested', 'Context only'],
      answersLinks: [
        {
          title: 'LF Forms and Workflow query linked SQL or MySQL Server',
          url: 'https://answers.laserfiche.com/questions/66314/LF-Forms-and-Workflow-query-Linked-SQL-or-MySQL-Server-possible-at-all-',
        },
        {
          title: 'Connecting SQL Database to Laserfiche Cloud Workflows',
          url: 'https://answers.laserfiche.com/questions/230095/Connecting-SQL-Database-to-Laserfiche-Cloud-Workflows',
        },
        {
          title: 'Creating Dynamic Nested Fields in Laserfiche by avoiding SQL',
          url: 'https://answers.laserfiche.com/questions/115077/Creating-Dynamic-Nested-Fields-in-Laserfiche-by-avoiding-SQL',
        },
        {
          title: 'Workflow Database Activities query time out',
          url: 'https://answers.laserfiche.com/questions/47242/Workflow-Database-Activities-query-time-out',
        },
        {
          title: 'Track token iterations',
          url: 'https://answers.laserfiche.com/questions/83672/Track-token-iterations',
        },
        {
          title: 'Stop schedule for workflow',
          url: 'https://answers.laserfiche.com/questions/196997/Stop-schedule-for-workflow',
        },
      ],
    },
    {
      title: 'Workflow definition history',
      summary:
        'Creates read-only inventory for Workflow definitions, current version metadata, modification history, and code/assembly payload sizes.',
      scriptPath: 'reporting/workflow/workflow-definition-history.sql',
      evidencePath: 'reporting/workflow/workflow-definition-history-evidence.md',
      sourceCount: 1,
      tables: ['dbo.workflow', 'dbo.workflow_history', 'dbo.workflow_code'],
      tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Read-only'],
      answersLinks: [
        {
          title: 'Workflow Last Modified Date',
          url: 'https://answers.laserfiche.com/questions/142410/Workflow-Last-Modified-Date',
        },
      ],
    },
  ],
};

export function getCommunityReportingPatterns(productKey) {
  return (communityReportingPatterns[productKey] ?? []).map((pattern) => ({
    ...pattern,
    scriptUrl: pattern.scriptUrl ?? `${repoBlobBaseUrl}/${pattern.scriptPath}`,
    evidenceUrl: pattern.evidenceUrl ?? `${repoBlobBaseUrl}/${pattern.evidencePath}`,
    scriptLoader: pattern.scriptLoader ?? reportingAssetLoaders[pattern.scriptPath],
    evidenceLoader: pattern.evidenceLoader ?? reportingAssetLoaders[pattern.evidencePath],
  }));
}

export async function loadGeneratedCommunityReportingPatterns(productKey) {
  const { generatedReportingCandidates } = await import('./generatedReportingCandidates.js');

  return (generatedReportingCandidates[productKey] ?? []).map((pattern) => ({
    ...pattern,
    product: productKey,
    scriptUrl: null,
    evidenceUrl: null,
    scriptLoader: () => Promise.resolve(buildGeneratedCandidateSql({ ...pattern, product: productKey })),
    evidenceLoader: () => Promise.resolve(buildGeneratedCandidateEvidence(pattern)),
  }));
}

export function getReportingScriptsForTable(productKey, tableKey) {
  const normalizedTableKey = tableKey.toLowerCase();

  return getCommunityReportingPatterns(productKey).filter((pattern) =>
    pattern.tables.some((table) => table.toLowerCase() === normalizedTableKey),
  );
}

export async function loadReportingScriptsForTable(productKey, tableKey) {
  const normalizedTableKey = tableKey.toLowerCase();
  const generatedPatterns = await loadGeneratedCommunityReportingPatterns(productKey);
  return [
    ...getReportingScriptsForTable(productKey, tableKey),
    ...generatedPatterns.filter((pattern) =>
      pattern.tables.some((table) => table.toLowerCase() === normalizedTableKey)),
  ];
}

export function getReportingPaths(productKey) {
  return productReportingPaths[productKey] ?? [];
}

export function getReportingQuestions(productKey) {
  const commonQuestions = {
    forms: [
      {
        question: 'Which processes exist and how are they named?',
        guidance: 'Start with process definition tables, then inspect process instance tables before counting activity.',
        tables: ['dbo.cf_business_processes', 'dbo.cf_bp_main_instances'],
      },
      {
        question: 'How many submissions exist by process or date?',
        guidance: 'Use submission and process tables, then validate the join path from exported foreign keys or the diagram.',
        tables: ['dbo.cf_business_processes', 'dbo.cf_submissions'],
      },
      {
        question: 'Where are submitted field values stored?',
        guidance: 'Use form and field definitions to identify the value tables, then verify value column meaning before reporting.',
        tables: ['dbo.cf_forms', 'dbo.cf_fields', 'dbo.cf_bp_data'],
      },
      {
        question: 'Who can access or administer Forms items?',
        guidance: 'Start with users and group/role mapping tables, then confirm the meaning of flags and role identifiers.',
        tables: ['dbo.cf_users', 'dbo.cf_usergroups_users_mapping', 'dbo.cf_roles'],
      },
    ],
    repository: [
      {
        question: 'Which templates, fields, and document metadata structures exist?',
        guidance: 'Start with template and field tables, then use relationships to find document or entry associations.',
        tables: ['dbo.template', 'dbo.propdef', 'dbo.toc'],
      },
      {
        question: 'How are users, trustees, and access-related records represented?',
        guidance: 'Start with trustee/security tables and verify joins carefully before reporting access state.',
        tables: ['dbo.trustee', 'dbo.account_cache', 'dbo.acl'],
      },
    ],
    lfds: [
      {
        question: 'Which identities, providers, and groups are configured?',
        guidance: 'Start with directory object and provider tables, then inspect foreign keys before joining identity records.',
        tables: ['dbo.directory_objects', 'dbo.identity_providers', 'dbo.groups'],
      },
      {
        question: 'Which licenses or registered applications are represented?',
        guidance: 'Start with license/application tables and validate product-specific meaning before operational reporting.',
        tables: ['dbo.licenses', 'dbo.applications'],
      },
    ],
    workflow: [
      {
        question: 'Which workflows, schedules, and runtime records exist?',
        guidance: 'Start with workflow definition tables, then follow runtime/history relationships for execution reporting.',
        tables: ['dbo.Workflow', 'dbo.Schedule', 'dbo.Instance'],
      },
      {
        question: 'How can I inspect workflow activity or error history?',
        guidance: 'Use activity/history tables and confirm status values before aggregating by state or error.',
        tables: ['dbo.Activity', 'dbo.InstanceHistory', 'dbo.Error'],
      },
    ],
  };

  return commonQuestions[productKey] ?? [];
}

function quoteName(value) {
  return `[${String(value).replaceAll(']', ']]')}]`;
}

function quoteTableKey(tableKey) {
  const [schemaName, tableName] = tableKey.split('.');
  return `${quoteName(schemaName)}.${quoteName(tableName)}`;
}

function getTableByKey(version, tableKey) {
  return version.source.tables.find((table) => table.key === tableKey);
}

function chooseColumns(table, patterns, fallbackCount = 5) {
  if (!table) {
    return [];
  }

  const selected = [];
  patterns.forEach((pattern) => {
    const match = table.columns.find(
      (column) => pattern.test(column.name) && !selected.some((existing) => existing.name === column.name),
    );
    if (match) {
      selected.push(match);
    }
  });

  table.columns.slice(0, fallbackCount).forEach((column) => {
    if (!selected.some((existing) => existing.name === column.name)) {
      selected.push(column);
    }
  });

  return selected.slice(0, fallbackCount);
}

function selectList(columns, alias = '') {
  return columns.map((column) => `  ${alias ? `${alias}.` : ''}${quoteName(column.name)}`).join(',\n');
}

function findForeignKeyBetween(version, leftTableKey, rightTableKey) {
  return (version.source.foreignKeys ?? []).find(
    (foreignKey) =>
      (foreignKey.sourceTableKey === leftTableKey && foreignKey.referencedTableKey === rightTableKey) ||
      (foreignKey.sourceTableKey === rightTableKey && foreignKey.referencedTableKey === leftTableKey),
  );
}

function joinConditionForForeignKey(foreignKey, leftAlias, rightAlias, leftTableKey) {
  const sourceAlias = foreignKey.sourceTableKey === leftTableKey ? leftAlias : rightAlias;
  const referencedAlias = foreignKey.referencedTableKey === leftTableKey ? leftAlias : rightAlias;

  return foreignKey.columns
    .map(
      (column) =>
        `${sourceAlias}.${quoteName(column.sourceColumnName)} = ${referencedAlias}.${quoteName(
          column.referencedColumnName,
        )}`,
    )
    .join(' AND ');
}

export function buildGeneratedReportingExamples(version) {
  if (version.source.productKey !== 'forms') {
    return [];
  }

  const processTable = getTableByKey(version, 'dbo.cf_business_processes');
  const submissionsTable = getTableByKey(version, 'dbo.cf_submissions');
  const taskTable = getTableByKey(version, 'dbo.cf_bp_worker_instances');
  const userTable = getTableByKey(version, 'dbo.cf_users');
  const groupTable = getTableByKey(version, 'dbo.cf_usergroups');
  const roleTable = getTableByKey(version, 'dbo.cf_roles');
  const processColumns = chooseColumns(processTable, [/name/i, /display/i, /title/i, /id$/i]);
  const submissionColumns = chooseColumns(submissionsTable, [/id$/i, /process/i, /created/i, /submitted/i]);
  const taskColumns = chooseColumns(taskTable, [/status/i, /state/i, /assigned/i, /created/i, /updated/i]);
  const userColumns = chooseColumns(userTable, [/user/i, /name/i, /email/i, /id$/i]);
  const processSubmissionFk =
    processTable && submissionsTable ? findForeignKeyBetween(version, processTable.key, submissionsTable.key) : null;
  const statusColumn = taskTable?.columns.find((column) => /status|state/i.test(column.name));
  const taskDateColumn = taskTable?.columns.find((column) => /updated|modified|created|date/i.test(column.name));

  return [
    {
      title: 'List processes',
      tables: ['dbo.cf_business_processes'],
      available: Boolean(processTable && processColumns.length),
      sql: processTable
        ? `SELECT TOP (100)\n${selectList(processColumns)}\nFROM ${quoteTableKey(processTable.key)}\nORDER BY 1;`
        : '',
      note: processTable
        ? 'Generated from columns exported for this version. Narrow the SELECT list further before operational use.'
        : 'Expected Forms process table was not found in this snapshot.',
    },
    {
      title: 'Count submissions by process',
      tables: ['dbo.cf_business_processes', 'dbo.cf_submissions'],
      available: Boolean(processTable && submissionsTable && processSubmissionFk),
      sql:
        processTable && submissionsTable && processSubmissionFk
          ? `SELECT\n  p.${quoteName(processColumns[0]?.name ?? processTable.columns[0].name)} AS process_value,\n  COUNT_BIG(*) AS submission_count\nFROM ${quoteTableKey(processTable.key)} AS p\nJOIN ${quoteTableKey(submissionsTable.key)} AS s\n  ON ${joinConditionForForeignKey(processSubmissionFk, 'p', 's', processTable.key)}\nGROUP BY p.${quoteName(processColumns[0]?.name ?? processTable.columns[0].name)}\nORDER BY submission_count DESC;`
          : submissionsTable
            ? `SELECT TOP (100)\n${selectList(submissionColumns)}\nFROM ${quoteTableKey(submissionsTable.key)}\nORDER BY 1;`
            : '',
      note: processSubmissionFk
        ? `Generated from exported foreign key ${processSubmissionFk.name}.`
        : 'A direct exported foreign key between processes and submissions was not found; use the diagram to choose a verified path before joining.',
    },
    {
      title: 'Show task records for status review',
      tables: ['dbo.cf_bp_worker_instances'],
      available: Boolean(taskTable),
      sql: taskTable
        ? `SELECT TOP (100)\n${selectList(taskColumns)}\nFROM ${quoteTableKey(taskTable.key)}${statusColumn ? `\nWHERE ${quoteName(statusColumn.name)} IS NOT NULL` : ''}\nORDER BY ${taskDateColumn ? quoteName(taskDateColumn.name) : '1'} DESC;`
        : '',
      note: statusColumn
        ? `Generated using status-like column ${statusColumn.name}. Confirm the meaning of each status value before reporting.`
        : 'No status-like column was detected; review the exported Columns panel before adding filters.',
    },
    {
      title: 'List users',
      tables: ['dbo.cf_users', 'dbo.cf_usergroups', 'dbo.cf_roles'],
      available: Boolean(userTable),
      sql: userTable
        ? `SELECT TOP (100)\n${selectList(userColumns, 'u')}\nFROM ${quoteTableKey(userTable.key)} AS u\nORDER BY 1;`
        : '',
      note:
        groupTable || roleTable
          ? 'User table exists; inspect exported foreign keys before adding group or role joins.'
          : 'User table exists, but expected group or role tables were not found in this snapshot.',
    },
  ];
}

export function buildTableReportingExamples(version, tableKey) {
  const table = getTableByKey(version, tableKey);
  if (!table) {
    return [];
  }

  const displayColumns = chooseColumns(table, [/name/i, /title/i, /status/i, /type/i, /date/i, /id$|guid$|uuid$/i], 6);
  const dateColumn = table.columns.find((column) => /date|time|created|modified|updated/i.test(column.name));
  const statusColumn = table.columns.find((column) => /status|state|type/i.test(column.name));
  const examples = [
    {
      title: 'Inspect representative rows',
      note: 'Use TOP with a narrow column list when orienting yourself to table shape. Do not update rows.',
      sql: `SELECT TOP (100)\n${selectList(displayColumns)}\nFROM ${quoteTableKey(table.key)}\nORDER BY 1;`,
    },
  ];

  if (dateColumn) {
    examples.push({
      title: `Recent records by ${dateColumn.name}`,
      note: 'Confirm the date column meaning before using it for operational reporting.',
      sql: `SELECT TOP (100)\n${selectList(displayColumns)}\nFROM ${quoteTableKey(table.key)}\nWHERE ${quoteName(dateColumn.name)} IS NOT NULL\nORDER BY ${quoteName(dateColumn.name)} DESC;`,
    });
  }

  if (statusColumn) {
    examples.push({
      title: `Counts by ${statusColumn.name}`,
      note: 'Status and type values are product-specific. Validate the values before publishing metrics.',
      sql: `SELECT\n  ${quoteName(statusColumn.name)},\n  COUNT_BIG(*) AS row_count\nFROM ${quoteTableKey(table.key)}\nGROUP BY ${quoteName(statusColumn.name)}\nORDER BY row_count DESC;`,
    });
  }

  return examples;
}
