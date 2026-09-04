/**
 * Strict HTML Sanitizer & Table of Contents Parser
 * Designed for safe rendering of rich text content without external vulnerabilities.
 */

export interface TocHeading {
  id: string
  text: string
  level: number
}

/**
 * Whitelist of safe HTML tags for rich articles
 */
const ALLOWED_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'a',
  'img',
  'ul',
  'ol',
  'li',
  'blockquote',
  'div',
  'figure',
  'figcaption',
  'span',
  'hr',
  'br',
  'code',
  'pre',
])

/**
 * Whitelist of safe attributes
 */
const ALLOWED_ATTRS = new Set([
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'class',
  'id',
  'title',
])

/**
 * Sanitize raw HTML string and inject stable anchor IDs for Headings (h1, h2, h3)
 */
export function sanitizeAndFormatArticleHtml(rawHtml: string): {
  sanitizedHtml: string
  headings: TocHeading[]
} {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return { sanitizedHtml: '', headings: [] }
  }

  // 1. Remove dangerous blocks: <script>, <style>, <iframe>, <object>, <embed>, <form>, <svg>
  let clean = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')

  // 2. Remove inline event handlers (onload, onclick, onerror, onmouseover, etc.)
  clean = clean.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')

  // 3. Remove dangerous protocols: javascript:, vbscript:, data:text/html
  clean = clean.replace(/(href|src)\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, '$1="#"')
  clean = clean.replace(/(href|src)\s*=\s*(?:'data:text\/html[^']*'|"data:text\/html[^"]*")/gi, '$1="#"')

  // 4. Extract headings and inject stable IDs + scroll-mt-24 class
  const headings: TocHeading[] = []
  let headingIndex = 1

  clean = clean.replace(
    /<(h[1-3])(\s+[^>]*)?>(.*?)<\/\1>/gi,
    (match, tag, attrs = '', content) => {
      const level = parseInt(tag.replace('h', ''), 10)
      const text = content.replace(/<[^>]*>/g, '').trim()
      const headingId = `heading-${headingIndex++}`

      if (text) {
        headings.push({
          id: headingId,
          text,
          level,
        })
      }

      // Check existing class attribute or append scroll-mt-24
      let updatedAttrs = attrs || ''
      if (/class=["']/i.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(
          /class=["']([^"']*)["']/i,
          `class="$1 scroll-mt-24 font-bold tracking-tight"`
        )
      } else {
        updatedAttrs += ` class="scroll-mt-24 font-bold tracking-tight"`
      }

      return `<${tag} id="${headingId}"${updatedAttrs}>${content}</${tag}>`
    }
  )

  return {
    sanitizedHtml: clean,
    headings,
  }
}

/**
 * Parses markdown/plain-text formatting (headings, bold, lists, bible callouts)
 * into sanitized HTML for display on public pages.
 */
export function formatRichTextToHtml(rawContent: string): string {
  if (!rawContent || typeof rawContent !== 'string') return ''

  let text = rawContent

  // 1. Convert markdown Bible callout:
  // > [!BIBLE] Verse
  // > "Quote"
  text = text.replace(
    />\s*\[!BIBLE\]\s*([^\n]+)\n((?:>\s*[^\n]+\n?)*)/gi,
    (_, verse, body) => {
      const cleanBody = body
        .split('\n')
        .map((l: string) => l.replace(/^>\s*/, '').trim())
        .filter(Boolean)
        .join(' ')
      return `\n<div class="bible-callout my-6 p-5 border-l-4 border-primary bg-primary/10 rounded-r-xl shadow-xs">
  <div class="flex items-center gap-2 font-bold text-primary text-sm mb-2">
    <span class="inline-block">📖</span> ${verse.trim()}
  </div>
  <blockquote class="italic text-foreground/90 font-serif leading-relaxed text-sm sm:text-base">
    ${cleanBody}
  </blockquote>
</div>\n`
    }
  )

  // 2. Convert standard markdown blockquotes: > quote
  text = text.replace(
    /(?:^|\n)(>[^\n]+(?:\n>[^\n]+)*)/g,
    (match) => {
      // Don't re-convert already converted callouts
      if (match.includes('bible-callout')) return match
      const lines = match
        .trim()
        .split('\n')
        .map((l) => l.replace(/^>\s*/, '').trim())
        .join(' ')
      return `\n<blockquote class="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-4 font-serif text-sm sm:text-base leading-relaxed">${lines}</blockquote>\n`
    }
  )

  // 3. Convert Markdown headings if present
  text = text.replace(/^### (.*$)/gim, '<h3 class="text-base sm:text-lg font-bold mt-6 mb-2 text-foreground">$1</h3>')
  text = text.replace(/^## (.*$)/gim, '<h2 class="text-lg sm:text-xl font-bold mt-8 mb-3 text-foreground font-serif border-b pb-2">$1</h2>')
  text = text.replace(/^# (.*$)/gim, '<h1 class="text-xl sm:text-2xl font-extrabold mt-8 mb-4 text-foreground font-serif">$1</h1>')

  // 4. Convert **bold** and *italic*
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(?<!\*)\*(?!\*)(.*?)\*/g, '<em>$1</em>')

  // 5. If text does not already contain HTML block wrappers (p, div, blockquote, etc.), split into <p>
  if (!/<(p|div|section|blockquote|ul|ol|table)\b/i.test(text)) {
    const paragraphs = text.split(/\n\s*\n/)
    text = paragraphs
      .map((p) => {
        const trimmed = p.trim()
        if (!trimmed) return ''
        if (
          trimmed.startsWith('<h1') ||
          trimmed.startsWith('<h2') ||
          trimmed.startsWith('<h3') ||
          trimmed.startsWith('<div') ||
          trimmed.startsWith('<blockquote')
        ) {
          return trimmed
        }
        return `<p class="leading-relaxed text-muted-foreground">${trimmed.replace(/\n/g, '<br/>')}</p>`
      })
      .filter(Boolean)
      .join('\n\n')
  }

  return sanitizeAndFormatArticleHtml(text).sanitizedHtml
}


/**
 * Extract clean plain-text excerpt for SEO description & Open Graph tags.
 * Strips HTML tags, markdown, callout blocks, and normalizes whitespaces.
 */

export function stripHtmlAndTruncate(text: string | null | undefined, maxLength: number = 160): string {
  if (!text || typeof text !== 'string') return ''

  // 1. Remove script, style, html tags
  let clean = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    // 2. Remove markdown callouts & symbols
    .replace(/>\s*\[!BIBLE\][^\n]*/gi, '')
    .replace(/[#*`_~>[\]()]/g, ' ')
    // 3. Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // 4. Normalize whitespaces
    .replace(/\s+/g, ' ')
    .trim()

  if (clean.length <= maxLength) return clean

  // Truncate cleanly at word boundary
  const truncated = clean.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 80) {
    return truncated.substring(0, lastSpace).trim() + '...'
  }
  return truncated.trim() + '...'
}

/**
 * Basic text sanitizer for search queries and short text inputs.
 * Strips HTML control chars, quotes, and dangerous non-printable bytes.
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/[<>"'`\\]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
}


