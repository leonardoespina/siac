import { describe, it, expect, beforeAll } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils/e2e';

describe('Security (API endpoints)', async () => {
  await setup({
    server: true,
  });

  it('debería bloquear acceso a la migración masiva de comensales (bulk-migrate) sin token', async () => {
    try {
      await $fetch('/api/diners/bulk-migrate', {
        method: 'PUT',
        body: { ids: [1], newDependenciaId: 2 }
      });
      expect.unreachable('Debería haber lanzado un error 401/403');
    } catch (err: any) {
      expect(err.statusCode).toBeGreaterThanOrEqual(401);
      expect(err.statusCode).toBeLessThanOrEqual(403);
    }
  });

  it('debería bloquear acceso a reporte de consumos sin token', async () => {
    try {
      await $fetch('/api/reports/consumptions', {
        method: 'GET'
      });
      expect.unreachable('Debería haber lanzado un error 401/403');
    } catch (err: any) {
      expect(err.statusCode).toBeGreaterThanOrEqual(401);
      expect(err.statusCode).toBeLessThanOrEqual(403);
    }
  });
});
