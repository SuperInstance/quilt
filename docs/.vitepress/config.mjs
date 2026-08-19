import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Quilt',
  description: 'A spreadsheet where every cell is a live, addressable capability.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#7c3aed' }],
    ['meta', { property: 'og:title', content: 'Quilt' }],
    ['meta', { property: 'og:description', content: 'A reactive, typed, cellular runtime. 15 repos across 5 deployment tiers.' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Engineering Bar', link: '/engineering-bar' },
      { text: 'Recipes', link: '/recipes' },
      { text: 'API', link: '/sdk/' },
      { text: 'Federation', link: '/federation' },
    ],
    sidebar: {
      '/guide/': [
        { text: 'Introduction', link: '/guide/' },
        { text: 'Quick start', link: '/guide/quick-start' },
        { text: 'Cell kinds', link: '/guide/cell-kinds' },
        { text: 'Federation', link: '/guide/federation' },
        { text: 'Deployment', link: '/guide/deployment' },
      ],
      '/sdk/': [
        { text: 'Overview', link: '/sdk/' },
        { text: 'resolveTemplate', link: '/sdk/resolve-template' },
        { text: 'resolveArtifact', link: '/sdk/resolve-artifact' },
        { text: 'validateManifest', link: '/sdk/validate-manifest' },
        { text: 'publishArtifact', link: '/sdk/publish-artifact' },
        { text: 'publishRunTrace', link: '/sdk/publish-run-trace' },
        { text: 'resolveCell', link: '/sdk/resolve-cell' },
        { text: 'subscribeCell', link: '/sdk/subscribe-cell' },
        { text: 'FederatedArtifactStore', link: '/sdk/federated-store' },
        { text: 'MqttCellTransport', link: '/sdk/mqtt-transport' },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/SuperInstance/quilt' },
    ],
    footer: {
      message: 'Apache 2.0 · 82 tests passing',
      copyright: '© 2026 SuperInstance',
    },
    search: { provider: 'local' },
  },
})
