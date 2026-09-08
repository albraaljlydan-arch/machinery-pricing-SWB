import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // SPA mode: single fallback HTML, no server — same deployment shape as
    // the current Vite+React app (client-only, Supabase called directly
    // from the browser). This is what makes the browser Back button work
    // "for real" this time: real routes, real history entries, instead of
    // the popstate hack the React version needed.
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false, // dynamic routes like /admin/projects/[id] can't be prerendered without known ids
    }),
  },
};

export default config;
