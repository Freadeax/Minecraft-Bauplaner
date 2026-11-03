import type { ComputeInput, ProjectComputation } from '../../../../packages/application/src/projectComputation.js';
import type { WireInput, WireResult } from '../../../../packages/application/src/computationTransport.js';

export interface ComputationTag {
  readonly jobId: number;
  readonly projectId: string;
  readonly revision: number;
  readonly basisRevisionId: string | null;
}
export interface ComputationRequest extends ComputationTag { readonly type: 'compute-project'; readonly input: ComputeInput | WireInput }
export type ComputationResponse = ComputationTag & (
  | { readonly type: 'project-computed'; readonly result: ProjectComputation | WireResult }
  | { readonly type: 'project-computation-error'; readonly error: string }
);
