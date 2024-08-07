import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { setup, $fetch } from '@nuxt/test-utils';

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    dev: true,
  });

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/');

    expect(html).toContain('<div>count: 0</div>');
    expect(html).toContain('<div>server: 1</div>');
  });
});
