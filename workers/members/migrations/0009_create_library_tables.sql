CREATE TABLE IF NOT EXISTS library_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_md TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT,
  tags TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_library_articles_slug_locale ON library_articles (slug, locale);
CREATE INDEX IF NOT EXISTS idx_library_articles_status ON library_articles (status);
CREATE INDEX IF NOT EXISTS idx_library_articles_category ON library_articles (category);

CREATE TABLE IF NOT EXISTS library_faqs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_md TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT,
  tags TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_library_faqs_slug_locale ON library_faqs (slug, locale);
CREATE INDEX IF NOT EXISTS idx_library_faqs_status ON library_faqs (status);
CREATE INDEX IF NOT EXISTS idx_library_faqs_category ON library_faqs (category);
