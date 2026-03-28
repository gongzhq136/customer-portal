<script setup lang="ts">
const { t } = useI18n()

// SEO
useSeoMeta({
  title: `${t('contact.title')} - ${t('contact.company.name')}`,
  ogTitle: `${t('contact.title')} - ${t('contact.company.name')}`,
  description: t('contact.description'),
  ogDescription: t('contact.description')
})
definePageMeta({
  public: true,
})
</script>

<template>
  <div>
    <UPageSection :title="t('contact.title')" :description="t('contact.description')">
      <template #top>
        <HeroBackground />
      </template>
      <UPageGrid>
        <UPageCard :title="t('contact.cards.email.title')" :description="t('contact.cards.email.description')"
          icon="i-lucide-mail" :ui="{ leading: 'bg-primary/10 p-3 rounded-lg' }">
          <template #footer>
            <UButton to="mailto:support@apexpro.example" variant="ghost" color="primary" icon="i-lucide-external-link">
              support@apexpro.example
            </UButton>
          </template>
        </UPageCard>

        <UPageCard :title="t('contact.cards.phone.title')" :description="t('contact.cards.phone.description')"
          icon="i-lucide-phone" :ui="{ leading: 'bg-primary/10 p-3 rounded-lg' }">
          <template #footer>
            <UButton :to="`tel:${t('contact.info.phone')}`" variant="ghost" color="primary" icon="i-lucide-phone">
              {{ t('contact.info.phone') }}
            </UButton>
          </template>
        </UPageCard>

        <UPageCard :title="t('contact.cards.visit.title')" :description="t('contact.cards.visit.description')"
          icon="i-lucide-map-pin" :ui="{ leading: 'bg-primary/10 p-3 rounded-lg' }">
          <template #footer>
            <UButton :to="`https://maps.google.com/?q=${t('contact.info.address')}`" target="_blank" variant="ghost"
              color="primary" icon="i-lucide-external-link">
              {{ t('contact.info.address') }}
            </UButton>
          </template>
        </UPageCard>

        <UPageCard :title="t('contact.cards.follow.title')" :description="t('contact.cards.follow.description')"
          icon="i-lucide-users" :ui="{ leading: 'bg-primary/10 p-3 rounded-lg' }">
          <template #footer>
            <div class="flex gap-2">
              <UButton to="https://github.com/ludulicious" target="_blank" variant="ghost" color="primary"
                icon="i-simple-icons-github" size="sm" />
            </div>
          </template>
        </UPageCard>
      </UPageGrid>
    </UPageSection>

    <!-- CTA Section -->
    <UPageCTA :title="t('contact.cta.title')" :description="t('contact.cta.description')" :links="[
      {
        label: t('contact.cta.sales'),
        to: 'mailto:sales@apexpro.example',
        color: 'primary',
        size: 'lg'
      },
      {
        label: t('contact.cta.support'),
        to: 'mailto:support@apexpro.example',
        variant: 'outline',
        size: 'lg'
      }
    ]" variant="naked" class="overflow-hidden">
      <LazyStarsBg />
    </UPageCTA>
  </div>
</template>
