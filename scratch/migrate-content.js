import fs from 'node:fs';
import path from 'node:path';
import { markdownToPortableText } from 'emdash/client';

const BLOG_SRC = '/Users/chrisl/Coding/Astro Build/bgm-blog-v4-astro/bgm-blog-astro-v4/src/content/blog';
const SEED_OUTPUT = '/Users/chrisl/Coding/Astro Build/em-dash-v1/test-my-emdash-site-v1/seed/seed.json';

const categorySlugMap = {
  'SEO': 'seo',
  'Paid Ads': 'paid-ads',
  'Digital Strategy': 'digital-strategy',
  'Marketing Automation': 'marketing-automation',
  'AI Content': 'ai-content',
  'Email Marketing': 'email-marketing',
};

const categoryLabels = {
  'seo': 'SEO',
  'paid-ads': 'Paid Ads',
  'digital-strategy': 'Digital Strategy',
  'marketing-automation': 'Marketing Automation',
  'ai-content': 'AI Content',
  'email-marketing': 'Email Marketing',
};

function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: fileContent };

  const yaml = match[1];
  const body = fileContent.slice(match[0].length);

  const data = {};
  const lines = yaml.split(/\r?\n/);
  let currentArrayKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('-') && currentArrayKey) {
      const val = line.replace(/^\s*-\s*["']?/, '').replace(/["']?\s*$/, '');
      data[currentArrayKey].push(val);
      continue;
    }

    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      let val = kv[2].trim();

      if (val === '') {
        currentArrayKey = key;
        data[key] = [];
      } else {
        currentArrayKey = null;
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key === 'id') val = Number(val) || val;
        data[key] = val;
      }
    }
  }

  return { data, body };
}

function processMarkdownBody(body) {
  // Strip imports
  let cleaned = body.replace(/^import\s+.*$/gm, '');

  // Strip top YouTube expression: {frontmatter.youtube && <YouTube url={frontmatter.youtube} />}
  cleaned = cleaned.replace(/\{frontmatter\.youtube\s*&&\s*<YouTube[^>]*\/>\}/g, '');

  // Convert <InlineCTA /> to opaque fence
  cleaned = cleaned.replace(/<InlineCTA\s*\/>/g, '<!--ec:block {"_type":"inlineCTA"} -->');

  // Convert <YouTube url="..." /> to opaque fence
  cleaned = cleaned.replace(/<YouTube\s+url=["']([^"']+)["']\s*\/>/g, (_, url) => {
    return `<!--ec:block {"_type":"youtube","url":"${url}"} -->`;
  });

  return cleaned.trim();
}

const files = fs.readdirSync(BLOG_SRC).filter(f => f.endsWith('.mdx'));
console.log(`Found ${files.length} blog posts to migrate.`);

const postsData = [];

for (const file of files) {
  const fullPath = path.join(BLOG_SRC, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const { data, body } = parseFrontmatter(raw);

  const slug = data.slug || file.replace(/\.mdx$/, '');
  const title = data.title || slug;
  const description = data.description || '';
  const pubDateStr = data.pubDate ? new Date(data.pubDate).toISOString() : new Date().toISOString();
  const rawCategories = Array.isArray(data.category) ? data.category : (data.category ? [data.category] : []);
  const catSlugs = rawCategories.map(c => categorySlugMap[c] || c.toLowerCase().replace(/\s+/g, '-'));

  const processedBody = processMarkdownBody(body);
  const portableText = markdownToPortableText(processedBody);

  postsData.push({
    file,
    id: `post-${data.id || postsData.length + 1}`,
    slug,
    title,
    description,
    pubDate: pubDateStr,
    imageUrl: data.imageUrl || '',
    imageAlt: data.imageAlt || title,
    youtube: data.youtube || null,
    categories: catSlugs,
    portableText,
  });
}

// Sort by pubDate desc
postsData.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

const seedContentPosts = postsData.map((p, idx) => ({
  id: p.id,
  slug: p.slug,
  status: 'published',
  publishedAt: p.pubDate,
  createdAt: p.pubDate,
  updatedAt: p.pubDate,
  data: {
    title: p.title,
    excerpt: p.description,
    featured_image: p.imageUrl ? {
      id: `img-${p.slug}`,
      src: p.imageUrl,
      alt: p.imageAlt || p.title,
      filename: path.basename(p.imageUrl)
    } : undefined,
    youtube: p.youtube,
    content: p.portableText,
  },
  bylines: [
    {
      byline: 'byline-chris-latham',
    }
  ],
  taxonomies: {
    category: p.categories,
    tag: p.categories
  }
}));

const seedData = {
  "$schema": "https://emdashcms.com/seed.schema.json",
  "version": "1",
  "meta": {
    "name": "Burger Gelato Media",
    "description": "Practical digital marketing insights for small businesses ready to grow smarter, not harder.",
    "author": "Burger Gelato Media"
  },
  "settings": {
    "title": "Burger Gelato Media",
    "tagline": "Practical digital marketing insights for small businesses ready to grow smarter, not harder."
  },
  "collections": [
    {
      "slug": "posts",
      "label": "Posts",
      "labelSingular": "Post",
      "urlPattern": "/blog/{slug}",
      "supports": ["drafts", "revisions", "preview", "scheduling", "search", "seo"],
      "commentsEnabled": true,
      "fields": [
        {
          "slug": "title",
          "label": "Title",
          "type": "string",
          "required": true,
          "searchable": true
        },
        {
          "slug": "featured_image",
          "label": "Featured Image",
          "type": "image"
        },
        {
          "slug": "content",
          "label": "Content",
          "type": "portableText",
          "searchable": true
        },
        {
          "slug": "excerpt",
          "label": "Excerpt",
          "type": "text"
        },
        {
          "slug": "youtube",
          "label": "YouTube URL",
          "type": "url"
        }
      ]
    },
    {
      "slug": "pages",
      "label": "Pages",
      "labelSingular": "Page",
      "urlPattern": "/pages/{slug}",
      "supports": ["drafts", "revisions", "preview", "search", "seo"],
      "fields": [
        {
          "slug": "title",
          "label": "Title",
          "type": "string",
          "required": true,
          "searchable": true
        },
        {
          "slug": "content",
          "label": "Content",
          "type": "portableText",
          "searchable": true
        }
      ]
    }
  ],
  "taxonomies": [
    {
      "name": "category",
      "label": "Categories",
      "labelSingular": "Category",
      "hierarchical": true,
      "collections": ["posts"],
      "terms": Object.entries(categoryLabels).map(([slug, label]) => ({ slug, label }))
    },
    {
      "name": "tag",
      "label": "Tags",
      "labelSingular": "Tag",
      "hierarchical": false,
      "collections": ["posts"],
      "terms": Object.entries(categoryLabels).map(([slug, label]) => ({ slug, label }))
    }
  ],
  "bylines": [
    {
      "id": "byline-chris-latham",
      "slug": "chris-latham",
      "displayName": "Chris Latham"
    }
  ],
  "menus": [
    {
      "name": "primary",
      "label": "Primary Navigation",
      "items": [
        {
          "type": "custom",
          "label": "Home",
          "url": "/"
        },
        {
          "type": "custom",
          "label": "Archive",
          "url": "/archive"
        },
        {
          "type": "custom",
          "label": "Categories",
          "url": "/categories"
        }
      ]
    }
  ],
  "widgetAreas": [
    {
      "name": "sidebar",
      "label": "Sidebar",
      "description": "Widget area displayed on single post pages",
      "widgets": [
        {
          "type": "component",
          "componentId": "core:search",
          "title": "Search"
        },
        {
          "type": "component",
          "componentId": "core:categories",
          "title": "Categories"
        },
        {
          "type": "component",
          "componentId": "core:recent-posts",
          "title": "Recent Posts",
          "settings": {
            "count": 5,
            "showDate": true
          }
        }
      ]
    },
    {
      "name": "footer",
      "label": "Footer",
      "description": "Widget area displayed in the site footer",
      "widgets": [
        {
          "type": "content",
          "title": "About Burger Gelato Media",
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [
                {
                  "_type": "span",
                  "text": "Practical digital marketing insights for small businesses ready to grow smarter, not harder.",
                  "_key": "k1"
                }
              ],
              "_key": "k0"
            }
          ]
        }
      ]
    }
  ],
  "sections": [
    {
      "slug": "newsletter-signup",
      "title": "5-Minute Video CTA",
      "description": "Call-to-action block for Burger Gelato Media free 5-minute video",
      "keywords": ["newsletter", "video", "cta"],
      "source": "theme",
      "content": [
        {
          "_type": "block",
          "style": "h3",
          "children": [
            {
              "_type": "span",
              "text": "Great at what you do. Invisible online.",
              "_key": "k1"
            }
          ],
          "_key": "k0"
        },
        {
          "_type": "block",
          "style": "normal",
          "children": [
            {
              "_type": "span",
              "text": "Turn what you know into content that gets found, gets watched, and gets clients.",
              "_key": "k3"
            }
          ],
          "_key": "k2"
        }
      ]
    }
  ],
  "content": {
    "pages": [
      {
        "id": "about",
        "slug": "about",
        "status": "published",
        "data": {
          "title": "About Burger Gelato Media",
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [
                {
                  "_type": "span",
                  "text": "Burger Gelato Media provides practical digital marketing insights for small businesses. Helping you navigate SEO, paid advertising, marketing automation, and content strategy to grow smarter, not harder.",
                  "_key": "k1"
                }
              ],
              "_key": "k0"
            }
          ]
        }
      },
      {
        "id": "privacy",
        "slug": "privacy",
        "status": "published",
        "data": {
          "title": "Privacy Policy",
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [
                {
                  "_type": "span",
                  "text": "Burger Gelato Media respects your privacy. We do not sell or rent your personal information to third parties.",
                  "_key": "k1"
                }
              ],
              "_key": "k0"
            }
          ]
        }
      },
      {
        "id": "terms",
        "slug": "terms",
        "status": "published",
        "data": {
          "title": "Terms of Service",
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [
                {
                  "_type": "span",
                  "text": "All content on Burger Gelato Media is for informational purposes only. By using this website, you agree to these terms.",
                  "_key": "k1"
                }
              ],
              "_key": "k0"
            }
          ]
        }
      }
    ],
    "posts": seedContentPosts
  }
};

fs.writeFileSync(SEED_OUTPUT, JSON.stringify(seedData, null, '\t'), 'utf8');
console.log(`Successfully generated ${SEED_OUTPUT} with ${seedContentPosts.length} posts!`);
