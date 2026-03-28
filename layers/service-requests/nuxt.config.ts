export default defineNuxtConfig({
  // Layer-specific configuration
  compatibilityDate: '2025-10-24',
  i18n: {
    locales: [
      {
        code: 'en',
        iso: 'en-US',
        name: 'English',
        file: 'en.json'
      },
      {
        code: 'nl',
        iso: 'nl-NL',
        name: 'Nederlands',
        file: 'nl.json'
      }
    ],
  }
})
