// Parameter exports contain type names, not type schemas or definitions.
export function reviewDependencyTarget(schema, dependency, resolvedSourceKey = dependency.referencingObjectKey) {
  const parameterTypeEvidence = (schema.routines ?? []).flatMap((routine) =>
    (routine.parameters ?? []).filter((parameter) => parameter.dataType === dependency.referencedEntityName)
      .map((parameter) => ({ routine: routine.key, parameter: parameter.parameterName })));
  const directEvidence = parameterTypeEvidence.filter((item) => item.routine === resolvedSourceKey);
  if (parameterTypeEvidence.length) {
    return {
      category: directEvidence.length ? 'parameterTypeNameInCaller' : 'parameterTypeNameElsewhere',
      parameterTypeEvidence,
      action: 'Obtain read-only type catalog metadata for this exact product/version, including type schema and any table-type columns/keys. A matching parameter type name does not establish the target schema, definition, or a joinable table.',
    };
  }
  if (resolvedSourceKey === 'dbo.sp_upgraddiagrams' && dependency.referencedObjectKey === 'dbo.dtproperties') {
    return { category: 'diagramSupportReference', parameterTypeEvidence,
      action: 'The caller name matches Microsoft database-diagram support. Review provenance privately; do not infer a Laserfiche product table or create the missing target. The export does not prove this routine has the stock Microsoft definition.' };
  }
  return { category: dependency.referencedSchemaName ? 'qualifiedTargetNeedsEvidence' : 'unqualifiedTargetNeedsEvidence',
    parameterTypeEvidence,
    action: 'Inspect the exact-version source privately or obtain sanitized object/type/synonym catalog evidence. Missing schema metadata does not prove an alias or an external object. Do not publish module bodies, environment names, or invent a relationship.' };
}
