const verifiedDocuments = new WeakMap();
export const GRAPH_NORMALIZATION_CONTRACT = 'kreaton.graph-pivot.v1';

// Internal server runtime bridge, not authentication. Python verifies the signed envelope first.
export function registerServerVerifiedGraphDocument(schema, contract) {
  if (contract !== GRAPH_NORMALIZATION_CONTRACT) throw new Error('Unsupported graph normalization contract');
  if (schema.pages?.length !== 1 || schema.pages[0].page_key !== 'home' || schema.active_template?.id !== 'mega-retail-store') {
    throw new Error('Unsupported graph normalization document');
  }
  verifiedDocuments.set(schema, JSON.stringify(schema));
  return schema;
}

export function preservedGraphDocument(schema) {
  const snapshot = verifiedDocuments.get(schema);
  if (snapshot === undefined) return null;
  if (JSON.stringify(schema) !== snapshot) throw new Error('Verified graph document changed');
  const preserved = structuredClone(schema);
  verifiedDocuments.set(preserved, snapshot);
  return preserved;
}
