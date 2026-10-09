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

export function getReportingPaths(productKey) {
  return productReportingPaths[productKey] ?? [];
}

export function getReportingQuestions(productKey, knownTables) {
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
        tables: ['dbo.propset', 'dbo.propdef', 'dbo.toc'],
      },
      {
        question: 'How are users, trustees, and access-related records represented?',
        guidance: 'Start with trustee/security tables and verify joins carefully before reporting access state.',
        tables: ['dbo.trustee', 'dbo.account_cache'],
      },
    ],
    lfds: [
      {
        question: 'Which identities, providers, and groups are configured?',
        guidance: 'Start with directory object and provider tables, then inspect foreign keys before joining identity records.',
        tables: ['dbo.directory_objects', 'dbo.identity_providers'],
      },
      {
        question: 'How are user licenses represented?',
        guidance: 'Start with user license assignments and container limits. Verify identity joins using the exported relationships.',
        tables: ['dbo.user_licenses', 'dbo.container_limits'],
      },
    ],
    workflow: [
      {
        question: 'Which tasks are queued for execution?',
        guidance: 'Review the task queue and associated payload records. Confirm retry and state meanings before aggregating.',
        tables: ['dbo.workflow_task_queue', 'dbo.workflow_task_queue_data'],
      },
      {
        question: 'How can I inspect instance completion and search activity?',
        guidance: 'Review completion and search records separately, then verify any join using the schema relationships.',
        tables: ['dbo.instance_completion', 'dbo.search_instance', 'dbo.search_entry'],
      },
    ],
  };

  return (commonQuestions[productKey] ?? []).filter((item) => !knownTables || item.tables.every((table) => knownTables.has(table)));
}
