import { computed } from 'vue'
import { useHead } from '@vueuse/head'
import i18next from 'i18next'
import { useRoute } from 'vue-router'

const APP_NAME = 'My Budget'
const BASE_URL = 'https://my-budget-vue.pages.dev'

interface MetaOptions {
  title?: string | (() => string)
  description?: string | (() => string)
  image?: string
  url?: string
}

export function useHeadMeta(options: MetaOptions) {
  const route = useRoute()
  
  const title = computed(() => {
    const titleValue = typeof options.title === 'function' ? options.title() : options.title
    if (titleValue) {
      return `${titleValue} - ${APP_NAME}`
    }
    return APP_NAME
  })

  const description = computed(() => {
    const descValue = typeof options.description === 'function' ? options.description() : options.description
    return descValue || i18next.t('welcome', { defaultValue: 'A modern personal budget management application' })
  })

  const image = computed(() => {
    return options.image || `${BASE_URL}/og-image.png`
  })

  const url = computed(() => {
    return options.url || `${BASE_URL}${route.fullPath}`
  })

  useHead({
    title: title,
    meta: [
      {
        name: 'description',
        content: description
      },
      // Open Graph
      {
        property: 'og:title',
        content: title
      },
      {
        property: 'og:description',
        content: description
      },
      {
        property: 'og:image',
        content: image
      },
      {
        property: 'og:url',
        content: url
      },
      {
        property: 'og:type',
        content: 'website'
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image'
      },
      {
        name: 'twitter:title',
        content: title
      },
      {
        name: 'twitter:description',
        content: description
      },
      {
        name: 'twitter:image',
        content: image
      }
    ]
  })
}

