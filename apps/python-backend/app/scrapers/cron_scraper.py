"""Background cron scraper for updating docs monthly."""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.scrapers.doc_crawler import crawl_and_extract, filter_migration_syntax, find_latest_release_url
from app.scrapers.text_processor import chunk_for_vectorization
from app.rag_engine.vector_db import store_migration_context

logger = logging.getLogger(__name__)

# List of doc URLs to scrape monthly
DYNAMIC_TARGETS = [
    # Frontend Frameworks
    {"name": "react", "index_url": "https://react.dev/blog", "pattern": r"react-\d+-upgrade-guide"},
    {"name": "next", "index_url": "https://nextjs.org/docs/app/building-your-application/upgrading", "pattern": r"upgrading/version-\d+"},
    {"name": "vue", "index_url": "https://v3-migration.vuejs.org/", "pattern": r"breaking-changes"},
    {"name": "@angular/core", "index_url": "https://angular.dev/update-guide", "pattern": r"update-guide"},
    {"name": "svelte", "index_url": "https://svelte.dev/blog", "pattern": r"svelte-\d+"},
    {"name": "ember-cli", "index_url": "https://emberjs.com/blog", "pattern": r"ember-\d+-\d+-released"},

    # CSS / UI Frameworks
    {"name": "tailwindcss", "index_url": "https://tailwindcss.com/docs/upgrade-guide", "pattern": r"upgrade-guide"},
    {"name": "bootstrap", "index_url": "https://getbootstrap.com/docs/versions/", "pattern": r"migration"},
    {"name": "@mui/material", "index_url": "https://mui.com/material-ui/migration/", "pattern": r"migration-v\d+"},

    # Backend Frameworks
    {"name": "express", "index_url": "https://expressjs.com/en/guide/migrating-5.html", "pattern": r"migrating-\d+"},
    {"name": "Django", "index_url": "https://docs.djangoproject.com/en/stable/releases/", "pattern": r"releases/\d+\.\d+/"},
    {"name": "Flask", "index_url": "https://flask.palletsprojects.com/en/stable/changes/", "pattern": r"changes/#version-\d+"},
    {"name": "spring-boot", "index_url": "https://spring.io/blog/category/releases", "pattern": r"spring-boot-\d+"},
    {"name": "laravel", "index_url": "https://laravel.com/docs/upgrade", "pattern": r"upgrade"},
    {"name": "rails", "index_url": "https://rubyonrails.org/blog", "pattern": r"Rails-\d+-\d+-\d+-has-been-released"},
    {"name": "@nestjs/core", "index_url": "https://docs.nestjs.com/migration-guide", "pattern": r"migration-guide"},

    # Programming Languages
    {"name": "python", "index_url": "https://docs.python.org/3/whatsnew/index.html", "pattern": r"whatsnew/3\.\d+\.html"},
    {"name": "node", "index_url": "https://nodejs.org/en/blog/announcements", "pattern": r"v\d+-release-announce"},
    {"name": "typescript", "index_url": "https://www.typescriptlang.org/dev/blog/", "pattern": r"announcing-typescript-\d+"},
    {"name": "rust", "index_url": "https://blog.rust-lang.org/", "pattern": r"announcing-rust-\d+"},
    {"name": "go", "index_url": "https://go.dev/doc/devel/release", "pattern": r"go1\.\d+"},
    {"name": "java", "index_url": "https://www.oracle.com/java/technologies/javase/jdk-relnotes-index.html", "pattern": r"jdk\d+"},
    {"name": "csharp", "index_url": "https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/", "pattern": r"csharp-\d+"},
    {"name": "cpp", "index_url": "https://en.cppreference.com/w/cpp/compiler_support", "pattern": r"cpp\d+"},
    {"name": "php", "index_url": "https://www.php.net/manual/en/appendices.php", "pattern": r"migration\d+\.php"},
    {"name": "kotlin", "index_url": "https://kotlinlang.org/docs/whatsnew.html", "pattern": r"whatsnew\d+"},
    {"name": "swift", "index_url": "https://www.swift.org/blog/", "pattern": r"swift-\d+-\d+-released"},

    # Mobile / Cross-Platform
    {"name": "flutter", "index_url": "https://docs.flutter.dev/release/breaking-changes", "pattern": r"breaking-changes"},
    {"name": "react-native", "index_url": "https://reactnative.dev/blog", "pattern": r"react-native-\d+"},

    # Databases / APIs
    {"name": "graphql", "index_url": "https://graphql.org/blog/", "pattern": r"release"},
    {"name": "pg", "index_url": "https://www.postgresql.org/docs/release/", "pattern": r"release-\d+\.html"},
    {"name": "mongodb", "index_url": "https://www.mongodb.com/docs/manual/release-notes/", "pattern": r"release-notes/\d+\.\d+"},

    # State Management & Routing
    {"name": "react-router-dom", "index_url": "https://reactrouter.com/en/main/upgrading", "pattern": r"upgrading/v\d+"},
    {"name": "redux", "index_url": "https://redux.js.org/usage/migrating-to-modern-redux", "pattern": r"migrating"},
    {"name": "zustand", "index_url": "https://zustand-demo.pmnd.rs/", "pattern": r"zustand"},

    # AI & Data Science
    {"name": "torch", "index_url": "https://pytorch.org/blog/", "pattern": r"pytorch-\d+"},
    {"name": "tensorflow", "index_url": "https://blog.tensorflow.org/", "pattern": r"tensorflow-\d+"},
    {"name": "pandas", "index_url": "https://pandas.pydata.org/docs/whatsnew/index.html", "pattern": r"v\d+\.\d+\.\d+"},
    {"name": "numpy", "index_url": "https://numpy.org/doc/stable/release.html", "pattern": r"\d+\.\d+\.\d+"},
    {"name": "scikit-learn", "index_url": "https://scikit-learn.org/stable/whats_new.html", "pattern": r"v\d+\.\d+"},

    # Build Tools & Bundlers
    {"name": "vite", "index_url": "https://vitejs.dev/guide/migration.html", "pattern": r"migration"},
    {"name": "webpack", "index_url": "https://webpack.js.org/migrate/", "pattern": r"migrate/\d+"},

    # Testing Frameworks
    {"name": "jest", "index_url": "https://jestjs.io/blog", "pattern": r"jest-\d+"},
    {"name": "@playwright/test", "index_url": "https://playwright.dev/docs/release-notes", "pattern": r"release-notes"},
    {"name": "cypress", "index_url": "https://docs.cypress.io/guides/references/migration-guide", "pattern": r"migration-guide"},

    # Cloud & DevOps
    {"name": "docker", "index_url": "https://docs.docker.com/engine/release-notes/", "pattern": r"release-notes"},
    {"name": "kubernetes", "index_url": "https://kubernetes.io/docs/setup/release/notes/", "pattern": r"notes"},
    {"name": "terraform", "index_url": "https://developer.hashicorp.com/terraform/docs", "pattern": r"upgrade-guide"},
]

async def monthly_doc_update_job():
    logger.info("[CronScraper] Starting monthly documentation update job...")
    for target in DYNAMIC_TARGETS:
        try:
            index_url = target["index_url"]
            pattern = target["pattern"]
            logger.info(f"[CronScraper] Traversing index {index_url} for latest release...")
            
            latest_url = await find_latest_release_url(index_url, pattern)
            if not latest_url:
                logger.warning(f"[CronScraper] Could not find any matching URL for {index_url} with pattern {pattern}")
                # Fallback to scraping the index url directly just in case
                latest_url = index_url
                
            logger.info(f"[CronScraper] Found latest docs: {latest_url}. Scraping...")
            scraped = await crawl_and_extract(latest_url)
            if not scraped:
                continue
            filtered = filter_migration_syntax(scraped)
            if not filtered:
                continue
            chunks = chunk_for_vectorization(filtered)
            if chunks:
                package_name = target.get("name", "unknown")
                store_migration_context(chunks, latest_url, package_name)
            logger.info(f"[CronScraper] Successfully updated docs for {latest_url}")
        except Exception as e:
            logger.error(f"[CronScraper] Failed to update docs from target {target}: {e}")

def start_cron_scraper():
    scheduler = AsyncIOScheduler()
    
    # Run once a month, on the 1st day of the month at 2:00 AM
    trigger = CronTrigger(day="1", hour="2", minute="0")
    scheduler.add_job(monthly_doc_update_job, trigger=trigger)
    
    scheduler.start()
    logger.info("[CronScraper] Monthly doc scraper scheduled (runs on the 1st of every month at 02:00 AM).")
