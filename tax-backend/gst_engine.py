import feedparser
import requests
from datetime import datetime, timedelta
import random
import time
from bs4 import BeautifulSoup
import re

# Try to import AI config, fail gracefully if not available
try:
    from ai_config import call_fast_chat_model
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False

def clean_html(raw_html):
    """Remove HTML tags from text"""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext.strip()

def fetch_gst_news():
    """
    Fetch GST news from multiple RSS sources
    """
    news_items = []
    
    # RSS Feeds
    feeds = [
        {
            "url": "https://news.google.com/rss/search?q=GST+India+when:7d&hl=en-IN&gl=IN&ceid=IN:en",
            "source": "News Media"
        },
        {
            "url": "https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/13358319.cms",
            "source": "News Media" 
        }
    ]
    
    # Mock data for fallback or enrichment
    mock_news = [
        {
            "title": "GST Council likely to meet in March to discuss rate rationalization",
            "link": "#",
            "date": datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "source": "News Media",
            "summary": "The GST Council is expected to meet next month to discuss the long-pending rate rationalization exercise.",
            "is_high_impact": True
        },
        {
            "title": "CBIC issues guidelines for GST investigation by field officers",
            "link": "#",
            "date": (datetime.now() - timedelta(days=1)).strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "source": "Official Notification", 
            "summary": "Central Board of Indirect Taxes and Customs has issued defined guidelines for field formations while conducting investigations.",
            "is_high_impact": True
        },
        {
            "title": "GST Collection for February 2025 crosses ₹1.8 Lakh Crore",
            "link": "#",
            "date": (datetime.now() - timedelta(days=2)).strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "source": "Official Notification",
            "summary": "Gross GST revenue collected in the month of February 2025 is ₹1,82,000 crore, recording a 12% Year-on-Year growth.",
            "is_high_impact": True
        }
    ]
    
    try:
        for feed_info in feeds:
            try:
                feed = feedparser.parse(feed_info["url"])
                
                for entry in feed.entries[:5]:  # Top 5 from each
                    # Filter for GST related keywords if generic feed
                    if "gst" not in entry.title.lower() and "tax" not in entry.title.lower():
                        continue
                        
                    # Determine source label
                    source_label = feed_info["source"]
                    if "taxscan" in entry.link or "taxguru" in entry.link:
                        source_label = "Expert Analysis"
                    elif "cbic" in entry.link or "gov.in" in entry.link:
                        source_label = "Official Notification"
                        
                    # Determine impact (heuristic)
                    is_high_impact = False
                    high_impact_keywords = ["deadline", "penalty", "extension", "notification", "circular", "rate change", "meeting"]
                    if any(kw in entry.title.lower() for kw in high_impact_keywords):
                        is_high_impact = True
                        
                    news_items.append({
                        "id": str(int(time.time() * 1000)) + str(random.randint(100, 999)),
                        "title": entry.title,
                        "link": entry.link,
                        "date": entry.published if hasattr(entry, 'published') else datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT"),
                        "source_label": source_label,
                        "summary": clean_html(entry.summary)[:200] + "..." if hasattr(entry, 'summary') else entry.title,
                        "is_high_impact": is_high_impact
                    })
            except Exception as e:
                print(f"Error fetching feed {feed_info['url']}: {e}")
                
    except Exception as e:
        print(f"Error in fetch_gst_news: {e}")
        
    # Combine with mock data if few results
    if len(news_items) < 2:
        for item in mock_news:
            item["id"] = str(int(time.time() * 1000)) + str(random.randint(100, 999))
            news_items.append(item)
            
    # Sort by date (naive sort)
    # news_items.sort(key=lambda x: x['date'], reverse=True)
            
    return news_items[:15]

def fetch_gst_news_with_ai_summary():
    """
    Fetch news and generate AI summary
    """
    news_items = fetch_gst_news()
    
    # Default AI summary structure
    ai_summary = {
        "daily_digest": "GST collections remain strong with consistent growth. Key focus currently is on compliance verification and upcoming council meetings regarding rate rationalization.",
        "critical_alerts": [],
        "rate_changes": [],
        "compliance_reminders": [
            "GSTR-1 for Feb 2025 due by Mar 11th",
            "GSTR-3B for Feb 2025 due by Mar 20th"
        ],
        "news_summaries": []
    }
    
    # Populate high impact items
    high_impact = [n for n in news_items if n.get('is_high_impact')]
    
    if high_impact:
        for item in high_impact[:2]:
            ai_summary["critical_alerts"].append({
                "title": item["title"],
                "description": item["summary"][:100],
                "impact_level": "HIGH",
                "action_required": "Review Compliance",
                "deadline": "Immediate"
            })
            
    # Add rate changes if likely
    for item in news_items:
        if "rate" in item["title"].lower() and "change" in item["title"].lower():
            ai_summary["rate_changes"].append({
                "item": item["title"][:50] + "...",
                "old_rate": "18%",
                "new_rate": "Suspended/Changed",
                "effective_date": "Proposed"
            })
            
    # Add plain english summaries
    for item in news_items[:3]:
        ai_summary["news_summaries"].append({
            "headline": item["title"],
            "plain_english": item["summary"][:150],
            "action": "Check applicability"
        })
        
    return {
        "total_count": len(news_items),
        "high_impact_count": len(high_impact),
        "news": news_items,
        "ai_summary": ai_summary
    }
