import { handleAuthCallback } from '../src/http.js';

export default {
  fetch: (request: Request) => handleAuthCallback(request),
};
