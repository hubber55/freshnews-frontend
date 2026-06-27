import logging
from deduplicator import deduplicate_articles

logging.basicConfig(level=logging.INFO)

# Test articles from a simulated RSS feed
feed_articles = [
    {
        "title": "കാട്ടാന ആക്രമണത്തിൽ ഒരാൾ കൊല്ലപ്പെട്ടു",
        "link": "https://news.google.com/rss/articles/CBMisAFBVV95cUxQVnppWTd...",
        "description": "Some description here...",
        "image_url": "https://example.com/img1.jpg"
    },
    {
        "title": "Unique New Article Title Here",
        "link": "https://news.google.com/rss/articles/CBMiUniqueArticleLink...",
        "description": "Unique description...",
        "image_url": "https://example.com/img2.jpg"
    }
]

# Simulated existing posts from DB
# Post 1 is a duplicate. The title in DB is rewritten (different), but it has metadata in faq.
existing_posts = [
    {
        "title": "പാലക്കാട് കാട്ടാന ആക്രമണത്തിൽ മരണം സംഭവിച്ചു", # AI rewritten title
        "original_url": "https://www.kairalinewsonline.com/elephant-attack-resolved-url",
        "image_url": "https://example.com/img1.jpg",
        "faq": [
            {"q": "What happened?", "a": "An elephant attacked."},
            {
                "original_title": "കാട്ടാന ആക്രമണത്തിൽ ഒരാൾ കൊല്ലപ്പെട്ടു", # Original raw title match
                "unresolved_url": "https://news.google.com/rss/articles/CBMisAFBVV95cUxQVnppWTd..."
            }
        ]
    }
]

print("Running deduplication test...")
unique = deduplicate_articles(feed_articles, existing_posts)

print("\n--- Results ---")
print(f"Input articles: {len(feed_articles)}")
print(f"Unique output articles: {len(unique)}")
for u in unique:
    print(f"  - Title: {u['title']}")
    print(f"  - Link: {u['link']}")

assert len(unique) == 1, "Should have filtered out the duplicate article!"
assert unique[0]["title"] == "Unique New Article Title Here", "Should keep the unique article!"
print("\nSuccess! Pre-resolution deduplication works perfectly!")
