<script setup lang="ts">
const route = useRoute()

const { data: page } = await useAsyncData(
  () => 'blog-en',
  () => queryCollection('blog_en').first()
)
const { data: posts } = await useAsyncData(
  () => `blog-posts-en-${route.path}`,
  () => queryCollection('posts_en')
    .order('id', 'DESC')
    .all()
)

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

definePageMeta({
  public: true
})
</script>

<template>
  <div>
    <UContainer>
      <template #top>
        <HeroBackground />
      </template>
      <UPageHeader
        v-bind="page"
        class="py-[50px]"
      />
      <UPageBody>
        <UBlogPosts>
          <UBlogPost
            v-for="(post, index) in posts"
            :key="post.id"
            :to="post.path"
            :title="post.title"
            :description="post.description"
            :image="post.image"
            :date="new Date(post.date)"
            :authors="post.authors"
            :badge="post.badge"
            :orientation="index === 0 ? 'horizontal' : 'vertical'"
            :class="[index === 0 && 'col-span-full']"
            variant="naked"
            :ui="{
              description: 'line-clamp-2'
            }"
          />
        </UBlogPosts>
      </UPageBody>
    </UContainer>
  </div>
</template>
