import { handleMcpRequest } from '../src/http.js';

export const config = { maxDuration: 60 };

export default {
  fetch: (request: Request) => handleMcpRequest(request),
};
