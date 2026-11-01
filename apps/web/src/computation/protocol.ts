import type { ComputeInput, ProjectComputation } from '../../../../packages/application/src/projectComputation.js';

export interface ComputationTag {
  readonly jobId: number;
  readonly projectId: string;
  readonly revision: number;
  readonly basisRevisionId: string | null;
}
export interface ComputationRequest extends ComputationTag { readonly type: 'compute-project'; readonly input: ComputeInput }
export type ComputationResponse = ComputationTag & (
  | { readonly type: 'project-computed'; readonly result: ProjectComputation }
  | { readonly type: 'project-computation-error'; readonly error: string }
);
