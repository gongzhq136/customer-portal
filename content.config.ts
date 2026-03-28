import { defineCollection, z } from '@nuxt/content'

const variantEnum = z.enum(['solid', 'outline', 'subtle', 'soft', 'ghost', 'link'])
const colorEnum = z.enum(['primary', 'secondary', 'neutral', 'error', 'warning', 'success', 'info'])
const sizeEnum = z.enum(['xs', 'sm', 'md', 'lg', 'xl'])
const orientationEnum = z.enum(['vertical', 'horizontal'])

const createBaseSchema = () => z.object({
  title: z.string().min(1),
  description: z.string().min(1)
})

const createFeatureItemSchema = () => createBaseSchema().extend({
  icon: z.string().min(1).editor({ input: 'icon' })
})

const createLinkSchema = () => z.object({
  label: z.string().min(1),
  to: z.string().min(1),
  icon: z.string().optional().editor({ input: 'icon' }),
  size: sizeEnum.optional(),
  trailing: z.boolean().optional(),
  target: z.string().optional(),
  color: colorEnum.optional(),
  variant: variantEnum.optional()
})

const createImageSchema = () => z.object({
  src: z.string().min(1).editor({ input: 'media' }),
  alt: z.string().optional(),
  loading: z.string().optional(),
  srcset: z.string().optional()
})

export const collections = {
  index_en: defineCollection({
    source: 'en/0.index.yml',
    type: 'page',
    schema: z.object({
      hero: z.object({
        links: z.array(createLinkSchema())
      }).optional(),
      sections: z.array(
        createBaseSchema().extend({
          id: z.string().optional(),
          orientation: orientationEnum.optional(),
          reverse: z.boolean().optional(),
          features: z.array(createFeatureItemSchema()).optional()
        })
      ).optional(),
      features: createBaseSchema().extend({
        items: z.array(createFeatureItemSchema())
      }).optional(),
      testimonials: createBaseSchema().extend({
        headline: z.string().optional(),
        items: z.array(
          z.object({
            quote: z.string().min(1),
            user: z.object({
              name: z.string().min(1),
              description: z.string().min(1),
              avatar: createImageSchema()
            })
          })
        )
      }).optional(),
      cta: createBaseSchema().extend({
        links: z.array(createLinkSchema())
      }).optional()
    })
  }),
  index_nl: defineCollection({
    source: 'nl/0.index.yml',
    type: 'page',
    schema: z.object({
      hero: z.object({
        links: z.array(createLinkSchema())
      }).optional(),
      sections: z.array(
        createBaseSchema().extend({
          id: z.string().optional(),
          orientation: orientationEnum.optional(),
          reverse: z.boolean().optional(),
          features: z.array(createFeatureItemSchema()).optional()
        })
      ).optional(),
      features: createBaseSchema().extend({
        items: z.array(createFeatureItemSchema())
      }).optional(),
      testimonials: createBaseSchema().extend({
        headline: z.string().optional(),
        items: z.array(
          z.object({
            quote: z.string().min(1),
            user: z.object({
              name: z.string().min(1),
              description: z.string().min(1),
              avatar: createImageSchema()
            })
          })
        )
      }).optional(),
      cta: createBaseSchema().extend({
        links: z.array(createLinkSchema())
      }).optional()
    })
  }),
  blog_en: defineCollection({
    source: 'en/2.blog.yml',
    type: 'page'
  }),
  blog_nl: defineCollection({
    source: 'nl/2.blog.yml',
    type: 'page'
  }),
  posts_en: defineCollection({
    type: 'page',
    source: {
      include: 'en/blog/**/*',
      prefix: 'blog/',
    },
    schema: z.object({
      image: z.object({ src: z.string().min(1).editor({ input: 'media' }) }),
      authors: z.array(
        z.object({
          name: z.string().min(1),
          to: z.string().min(1),
          avatar: z.object({ src: z.string().min(1).editor({ input: 'media' }) })
        })
      ),
      date: z.date(),
      badge: z.object({ label: z.string().min(1) })
    })
  }),
  posts_nl: defineCollection({
    type: 'page',
    source: {
      include: 'nl/blog/**/*',
      prefix: 'blog/',
    },
    schema: z.object({
      image: z.object({ src: z.string().min(1).editor({ input: 'media' }) }),
      authors: z.array(
        z.object({
          name: z.string().min(1),
          to: z.string().min(1),
          avatar: z.object({ src: z.string().min(1).editor({ input: 'media' }) })
        })
      ),
      date: z.date(),
      badge: z.object({ label: z.string().min(1) })
    })
  })
}
