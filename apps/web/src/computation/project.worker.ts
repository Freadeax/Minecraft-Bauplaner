import { computeProject } from '../../../../packages/application/src/projectComputation.js';
import type { ComputationRequest, ComputationResponse, ComputationTag } from './protocol';

self.onmessage = (event: MessageEvent<ComputationRequest>) => {
  const request = event.data;
  const tag: ComputationTag = { jobId: request.jobId, projectId: request.projectId, revision: request.revision, basisRevisionId: request.basisRevisionId };
  try {
    if (request.type !== 'compute-project' || request.input.project.id !== tag.projectId || request.input.project.revision !== tag.revision || (request.input.basis?.id ?? null) !== tag.basisRevisionId)
      throw new Error('Berechnungsauftrag und Projektbasis stimmen nicht überein.');
    const response: ComputationResponse = { ...tag, type: 'project-computed', result: computeProject(request.input) };
    self.postMessage(response);
  } catch (error) {
    const response: ComputationResponse = { ...tag, type: 'project-computation-error', error: error instanceof Error ? error.message : 'Projekt konnte nicht berechnet werden.' };
    self.postMessage(response);
  }
};
