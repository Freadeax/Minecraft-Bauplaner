import { computeProject } from '../../../../packages/application/src/projectComputation.js';
import { decodeComputeInput, encodeComputeResult } from '../../../../packages/application/src/computationTransport.js';
import type { ComputationRequest, ComputationResponse, ComputationTag } from './protocol';

self.onmessage = (event: MessageEvent<ComputationRequest>) => {
  const request = event.data;
  const tag: ComputationTag = { jobId: request.jobId, projectId: request.projectId, revision: request.revision, basisRevisionId: request.basisRevisionId };
  try {
    if (request.type !== 'compute-project' || request.input.project.id !== tag.projectId || request.input.project.revision !== tag.revision || (request.input.basis?.id ?? null) !== tag.basisRevisionId)
      throw new Error('Berechnungsauftrag und Projektbasis stimmen nicht überein.');
    // Cells travel as transferred columns both ways (SIZE-01), not as a structured clone of a million objects.
    const { result, transfer } = encodeComputeResult(computeProject(decodeComputeInput(request.input)));
    const response: ComputationResponse = { ...tag, type: 'project-computed', result };
    self.postMessage(response, { transfer });
  } catch (error) {
    const response: ComputationResponse = { ...tag, type: 'project-computation-error', error: error instanceof Error ? error.message : 'Projekt konnte nicht berechnet werden.' };
    self.postMessage(response);
  }
};
