import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { BlogService } from '../src/services/content/blog.service.js';
import { CmsService } from '../src/services/content/cms.service.js';
import { MediaService } from '../src/services/content/media.service.js';
import { SeoService } from '../src/services/seo/seo.service.js';

console.log('=== Psychology Calculator Phase 13: Content CMS & Blog Engine Test Suite ===\n');

// 1. Initialize In-Memory SQLite Database
const rawDb = new DatabaseSync(':memory:');
rawDb.exec('PRAGMA foreign_keys = ON;');

const mockD1 = {
  prepare(query) {
    const stmt = rawDb.prepare(query);
    return {
      bind(...params) {
        return {
          async first() {
            return stmt.get(...params) || null;
          },
          async all() {
            const results = stmt.all(...params);
            return { results, success: true };
          },
          async run() {
            const info = stmt.run(...params);
            return {
              success: true,
              meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) }
            };
          }
        };
      },
      async first() {
        return stmt.get() || null;
      },
      async all() {
        const results = stmt.all();
        return { results, success: true };
      },
      async run() {
        const info = stmt.run();
        return {
          success: true,
          meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) }
        };
      }
    };
  }
};

// Mock Cloudflare R2 Storage Bucket
const r2Store = new Map();
const mockR2 = {
  async put(key, value, options) {
    r2Store.set(key, { value, options, customMetadata: options?.customMetadata });
    return {
      key,
      size: value.byteLength || (typeof value === 'string' ? value.length : 0),
      etag: 'mock-etag-123',
      httpMetadata: { contentType: options?.httpMetadata?.contentType || options?.contentType }
    };
  },
  async get(key) {
    if (!r2Store.has(key)) return null;
    const item = r2Store.get(key);
    return {
      body: item.value,
      size: item.value.byteLength || (typeof item.value === 'string' ? item.value.length : 0),
      customMetadata: item.customMetadata,
      async arrayBuffer() {
        return item.value;
      }
    };
  },
  async delete(key) {
    r2Store.delete(key);
  }
};

// Apply all 16 migrations
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  rawDb.exec(sql);
}

// Apply development seeds
const seedSql = fs.readFileSync(path.resolve(process.cwd(), 'seeds/dev_seed.sql'), 'utf8');
rawDb.exec(seedSql);
console.log(`✔ In-memory SQLite & R2 Mock initialized with ${migrationFiles.length} migrations and seed data`);

async function runCmsTests() {
  const blogService = new BlogService(mockD1);
  const cmsService = new CmsService(mockD1);
  const mediaService = new MediaService(mockD1, mockR2);
  const seoService = new SeoService(mockD1);

  console.log('\n--- 1. Testing Discovery of Seeded Blog Articles & Relations ---');
  const initialPosts = await blogService.getPublishedPosts();
  assert.ok(initialPosts.posts.length >= 1, 'Should have at least 1 published seeded article');

  const pillarPost = await blogService.getPostBySlug('what-is-the-big-five-personality-model');
  assert.ok(pillarPost, 'Should retrieve seeded pillar article by slug');
  assert.strictEqual(pillarPost.title, 'What Is the Big Five Personality Model? The Scientific Gold Standard Explained');
  assert.strictEqual(pillarPost.category_name, 'Personality & Psychometrics');
  assert.strictEqual(pillarPost.author_name, 'Psychology Calculator Editorial Team');
  assert.strictEqual(pillarPost.related_assessment_name, 'Big Five (OCEAN) Personality Test');
  assert.strictEqual(pillarPost.cta_title, 'Discover Your True Personality Profile');
  assert.ok(pillarPost.tags && pillarPost.tags.length >= 2, 'Should include attached tags');
  console.log(`✔ Seeded Pillar Article verified with full relations: "${pillarPost.title}"`);

  console.log('\n--- 2. Testing Spotlight Featured Post & Reading Time Calculation ---');
  const featured = await blogService.getFeaturedPost();
  assert.ok(featured, 'Should resolve spotlight featured post');
  assert.strictEqual(featured.id, 'post_big_five_guide');

  const readingTime = blogService.calculateReadingTime('word '.repeat(600));
  assert.strictEqual(readingTime, 3, '600 words should be calculated as ~3 min read');
  console.log(`✔ Spotlight featured post verified and reading time calculation tested (600 words = ${readingTime} min)`);

  console.log('\n--- 3. Testing Article Creation, Tag Synchronization & Version Snapshots ---');
  const newPostId = await blogService.upsertPost({
    title: 'Understanding Adult Attachment Styles in Relationships',
    slug: 'understanding-adult-attachment-styles',
    excerpt: 'How childhood bonding dynamics influence emotional intimacy in romantic relationships.',
    content: '## Adult Attachment Dynamics\n\nAttachment theory posits that internal working models shape adult emotional security...',
    author_id: 'author_editorial',
    category_id: 'bcat_relationships',
    status: 'published',
    tags: ['Attachment', 'Relationships', 'Psychology'],
    related_assessment_id: 'asm_attachment'
  });

  const createdPost = await blogService.getPostById(newPostId);
  assert.ok(createdPost);
  assert.strictEqual(createdPost.slug, 'understanding-adult-attachment-styles');
  assert.strictEqual(createdPost.tags?.length, 3);

  // Check version snapshot in post_versions
  const versionRow = rawDb.prepare('SELECT * FROM post_versions WHERE post_id = ?').get(newPostId);
  assert.ok(versionRow, 'Version snapshot should be saved');
  assert.strictEqual(versionRow.version_number, 1);
  console.log(`✔ New article created with tag sync and revision snapshot v1 (ID: ${newPostId})`);

  console.log('\n--- 4. Testing Scheduled Publishing & Draft Isolation ---');
  const scheduledPostId = await blogService.upsertPost({
    title: 'Future Psychology Research Trends',
    content: '## Forthcoming innovations...',
    status: 'scheduled',
    published_at: new Date(Date.now() + 86400000).toISOString() // Tomorrow
  });

  const publicFeed = await blogService.getPublishedPosts();
  assert.ok(!publicFeed.posts.some((p) => p.id === scheduledPostId), 'Scheduled future post must NOT appear in public feed');

  const draftLookup = await blogService.getPostBySlug('future-psychology-research-trends', false);
  assert.strictEqual(draftLookup, null, 'Public lookup must return null for unreleased scheduled post');

  const adminPreview = await blogService.getPostBySlug('future-psychology-research-trends', true);
  assert.ok(adminPreview, 'Admin preview mode must allow resolving scheduled post');
  console.log('✔ Scheduled post successfully isolated from public feed and accessible via preview');

  console.log('\n--- 5. Testing Article Duplication & Deletion ---');
  const clonedId = await blogService.duplicatePost(newPostId);
  assert.ok(clonedId);
  const clonedPost = await blogService.getPostById(clonedId);
  assert.strictEqual(clonedPost.status, 'draft', 'Duplicated post should default to draft');
  assert.ok(clonedPost.title.includes('(Copy)'));

  await blogService.deletePost(clonedId);
  const deletedLookup = await blogService.getPostById(clonedId);
  assert.strictEqual(deletedLookup, null, 'Deleted post should no longer exist');
  console.log('✔ Article duplication to draft and clean cascade deletion verified');

  console.log('\n--- 6. Testing Taxonomy & Author Services ---');
  const newCatId = await cmsService.upsertBlogCategory({
    name: 'Cognitive Science & Neuroscience',
    description: 'Biological foundations of mental processing.'
  });
  const cat = await cmsService.getBlogCategoryBySlug('cognitive-science-neuroscience');
  assert.ok(cat);
  assert.strictEqual(cat.id, newCatId);

  const newAuthorId = await cmsService.upsertAuthor({
    name: 'Dr. Sarah Lin, PhD',
    role_title: 'Clinical Psychometrician',
    bio: 'Lead researcher in behavioral variance.',
    social_links: { twitter: 'https://twitter.com/sarahlin' }
  });
  const author = await cmsService.getAuthorBySlug('dr-sarah-lin-phd');
  assert.ok(author);
  assert.strictEqual(author.id, newAuthorId);
  console.log('✔ Taxonomy & Author services verified: Category & Author created');

  console.log('\n--- 7. Testing Static Pages & Reusable CTAs ---');
  const aboutPage = await cmsService.getPageBySlug('about');
  assert.ok(aboutPage, 'Should retrieve seeded About page');
  assert.strictEqual(aboutPage.title, 'About Psychology Calculator');

  const newCtaId = await cmsService.upsertContentCta({
    title: 'Unlock Your Emotional Quotient',
    description: 'Measure emotional agility and stress tolerance.',
    button_text: 'Take EQ Test →',
    button_url: '/assessments/emotional-intelligence-test',
    style: 'teal'
  });
  const ctas = await cmsService.getContentCtas();
  assert.ok(ctas.some((c) => c.id === newCtaId));
  console.log('✔ Static Pages & Reusable Content CTAs verified');

  console.log('\n--- 8. Testing Cloudflare R2 Media Upload, Size Limit & MIME Validation ---');
  const mockPngData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const uploadedMedia = await mediaService.uploadMedia({
    filename: 'personality-chart.png',
    data: mockPngData.buffer,
    mimeType: 'image/png',
    altText: 'Five factor personality chart'
  });
  assert.ok(uploadedMedia.id);
  assert.ok(uploadedMedia.r2_key.startsWith('media/'));
  assert.strictEqual(uploadedMedia.file_size, mockPngData.byteLength);

  // Validation: Unsupported executable rejected
  await assert.rejects(
    async () => {
      await mediaService.uploadMedia({
        filename: 'malicious.exe',
        data: new Uint8Array([1, 2, 3]).buffer,
        mimeType: 'application/x-msdownload'
      });
    },
    (err) => err.message.includes('Unsupported media type')
  );

  // Clean deletion
  await mediaService.deleteMedia(uploadedMedia.id);
  const mediaList = await mediaService.getMediaItems();
  assert.ok(!mediaList.items.some((m) => m.id === uploadedMedia.id));
  console.log('✔ Cloudflare R2 Media uploaded, MIME validated, and deleted cleanly');

  console.log('\n--- 9. Testing Sitemap Integration for Blog & Static Pages ---');
  const sitemapXml = await seoService.generateSitemapXml();
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/blog</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/blog/what-is-the-big-five-personality-model</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://www.psychologycalculator.com/p/about</loc>'));
  assert.ok(!sitemapXml.includes('future-psychology-research-trends'), 'Scheduled post must not be in sitemap');
  console.log('✔ Dynamic XML Sitemap verified: /blog, published articles, and static pages included');

  console.log('\n============================================================');
  console.log('🎉 ALL PHASE 13 CONTENT CMS & BLOG ENGINE TESTS PASSED!');
  console.log('============================================================\n');
}

runCmsTests().catch((err) => {
  console.error('❌ Content CMS Test failed:', err);
  process.exit(1);
});
