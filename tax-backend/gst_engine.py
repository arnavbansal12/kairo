# gst_engine.py
# -----------------------------------------------------------------------------
# GST INTELLIGENCE MODULE - NEWS SCRAPER + AI SUMMARY ENGINE
# Scrapes, merges, filters news and generates AI summaries
# -----------------------------------------------------------------------------

import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict
import hashlib
import re
import json

# Common HTTP headers
HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}

# =============================================================================
# GST FIREWALL - Keyword filtering
# =============================================================================

GST_KEYWORDS = [
    "GST", "CGST", "IGST", "SGST", "GSTR", 
    "Input Tax Credit", "ITC",
    "Direct Tax", "Indirect Tax", "Income Tax",
    "Finance Ministry", "CBIC", "CBDT",
    "Tax Tribunal", "AAR", "Advance Ruling",
    "E-Invoice", "E-Way Bill",
    "Tax Audit", "GST Council",
    "Section 16", "Section 17", "Section 73", "Section 74",
    "Customs", "Central Excise", "Tax",
    "ITAT", "High Court", "Supreme Court",
    "Refund", "Penalty", "Assessment", "Rate", "Slab"
]

# HIGH IMPACT keywords - news that really matters
HIGH_IMPACT_KEYWORDS = [
    "rate change", "rate reduction", "rate increase", "new rate",
    "deadline", "due date", "extension", "last date",
    "gst council", "council meeting", "council decision",
    "new rule", "amendment", "notification", "circular",
    "penalty waiver", "amnesty", "relief",
    "e-invoice mandatory", "e-way bill",
    "audit", "scrutiny", "show cause",
    "refund", "itc", "input tax credit",
    "return filing", "gstr-1", "gstr-3b", "gstr-9"
]

def passes_gst_firewall(title: str, summary: str, source: str = None) -> bool:
    if source == "Expert Analysis":
        return True
    combined_text = f"{title} {summary}".upper()
    for keyword in GST_KEYWORDS:
        if keyword.upper() in combined_text:
            return True
    return False

def is_high_impact(title: str, summary: str) -> bool:
    """Check if news is high-impact (directly affects business/compliance)."""
    combined_text = f"{title} {summary}".lower()
    for keyword in HIGH_IMPACT_KEYWORDS:
        if keyword.lower() in combined_text:
            return True
    return False

def generate_id(title: str, link: str) -> str:
    return hashlib.md5(f"{title}{link}".encode()).hexdigest()[:12]

def parse_date(date_str: str) -> str:
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")
    formats = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%a, %d %b %Y %H:%M:%S GMT",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return datetime.now().strftime("%Y-%m-%d")

def fetch_rss_with_headers(url: str) -> feedparser.FeedParserDict:
    try:
        response = requests.get(url, headers=HTTP_HEADERS, timeout=15)
        response.raise_for_status()
        return feedparser.parse(response.text)
    except Exception as e:
        print(f"⚠️ RSS fetch error for {url}: {e}")
        return feedparser.FeedParserDict(entries=[])

# =============================================================================
# SOURCE 1: Google News RSS
# =============================================================================

def fetch_google_news() -> List[Dict]:
    url = "https://news.google.com/rss/search?q=GST+India+tax&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        feed = fetch_rss_with_headers(url)
        items = []
        for entry in feed.entries[:25]:
            title = entry.get('title', '')
            link = entry.get('link', '')
            summary = entry.get('summary', entry.get('description', ''))
            pub_date = entry.get('published', entry.get('pubDate', ''))
            summary = BeautifulSoup(summary, 'html.parser').get_text()[:500]
            
            if not passes_gst_firewall(title, summary, "News Media"):
                continue
            
            items.append({
                "id": generate_id(title, link),
                "title": title,
                "link": link,
                "date": parse_date(pub_date),
                "source_label": "News Media",
                "summary": summary.strip() or "Click to read the full article.",
                "is_high_impact": is_high_impact(title, summary)
            })
        print(f"✅ Google News: {len(items)} articles fetched")
        return items
    except Exception as e:
        print(f"⚠️ Google News fetch failed: {e}")
        return []

# =============================================================================
# SOURCE 2: Economic Times Tax News (Alternative to CBIC)
# =============================================================================

def fetch_et_tax_news() -> List[Dict]:
    """Scrape Economic Times for tax news."""
    url = "https://economictimes.indiatimes.com/news/economy/policy"
    try:
        response = requests.get(url, headers=HTTP_HEADERS, timeout=15)
        if response.status_code != 200:
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        items = []
        
        # Find article links
        for article in soup.find_all(['article', 'div'], class_=re.compile(r'story|article|news', re.I)):
            link_tag = article.find('a', href=True)
            if not link_tag:
                continue
            
            title = link_tag.get_text(strip=True)
            href = link_tag.get('href', '')
            
            if not title or len(title) < 20:
                continue
            
            # Only tax-related
            if not passes_gst_firewall(title, "", "Official Notification"):
                continue
            
            # Make absolute URL
            if not href.startswith('http'):
                href = 'https://economictimes.indiatimes.com' + href
            
            items.append({
                "id": generate_id(title, href),
                "title": title[:150],
                "link": href,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "source_label": "Official Notification",
                "summary": "Policy news from Economic Times covering GST and tax updates.",
                "is_high_impact": is_high_impact(title, "")
            })
            
            if len(items) >= 10:
                break
        
        print(f"✅ ET Policy: {len(items)} articles fetched")
        return items
    except Exception as e:
        print(f"⚠️ ET fetch failed: {e}")
        return []

# =============================================================================
# SOURCE 3: Taxscan via HTML scraping (RSS not working)
# =============================================================================

def fetch_taxscan_news() -> List[Dict]:
    """Scrape Taxscan homepage for latest articles."""
    url = "https://www.taxscan.in/"
    try:
        response = requests.get(url, headers=HTTP_HEADERS, timeout=15)
        if response.status_code != 200:
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        items = []
        
        # Find article elements
        for article in soup.find_all(['article', 'div'], class_=re.compile(r'post|article|entry', re.I))[:15]:
            # Find title and link
            title_tag = article.find(['h2', 'h3', 'h4'])
            if not title_tag:
                continue
            
            link_tag = title_tag.find('a') or article.find('a', href=True)
            if not link_tag:
                continue
            
            title = title_tag.get_text(strip=True)
            href = link_tag.get('href', '')
            
            if not title or len(title) < 15:
                continue
            
            # Find excerpt/summary
            excerpt = ""
            excerpt_tag = article.find(['p', 'div'], class_=re.compile(r'excerpt|summary|content', re.I))
            if excerpt_tag:
                excerpt = excerpt_tag.get_text(strip=True)[:300]
            
            items.append({
                "id": generate_id(title, href),
                "title": title,
                "link": href,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "source_label": "Expert Analysis",
                "summary": excerpt or "Expert tax analysis and legal commentary from Taxscan.",
                "is_high_impact": is_high_impact(title, excerpt)
            })
        
        print(f"✅ Taxscan: {len(items)} articles fetched")
        return items
    except Exception as e:
        print(f"⚠️ Taxscan fetch failed: {e}")
        return []

# =============================================================================
# FALLBACK NEWS
# =============================================================================

def get_fallback_news() -> List[Dict]:
    return [
        {
            "id": "fallback001",
            "title": "GST Council to meet for key policy decisions on rate rationalization",
            "link": "https://www.cbic-gst.gov.in/",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "source_label": "News Media",
            "summary": "The GST Council is scheduled to convene to discuss important policy matters including tax rate rationalization and compliance simplification measures.",
            "is_high_impact": True
        },
        {
            "id": "fallback002", 
            "title": "E-Invoice mandatory for businesses above Rs 5 Crore turnover - Check deadline",
            "link": "https://www.gst.gov.in/",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "source_label": "Official Notification",
            "summary": "CBIC has announced mandatory e-invoicing requirements for businesses. Ensure your billing systems are updated to generate IRN before the compliance deadline.",
            "is_high_impact": True
        },
        {
            "id": "fallback003",
            "title": "Input Tax Credit: Key considerations and common mistakes to avoid in FY 2025-26",
            "link": "https://www.taxscan.in/",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "source_label": "Expert Analysis",
            "summary": "Expert analysis on Input Tax Credit provisions covering common compliance issues, reconciliation requirements, and strategies to maximize legitimate ITC claims.",
            "is_high_impact": False
        }
    ]

# =============================================================================
# MAIN AGGREGATOR
# =============================================================================

def fetch_gst_news() -> List[Dict]:
    """Fetch news from all sources."""
    all_news = []
    all_news.extend(fetch_google_news())
    all_news.extend(fetch_et_tax_news())
    all_news.extend(fetch_taxscan_news())
    
    if not all_news:
        print("⚠️ All sources failed, using fallback news")
        all_news = get_fallback_news()
    
    # Deduplicate
    seen = set()
    unique_news = []
    for item in all_news:
        if item["id"] not in seen:
            seen.add(item["id"])
            unique_news.append(item)
    
    # Sort by date (newest first), then by high-impact
    unique_news.sort(key=lambda x: (x["date"], x.get("is_high_impact", False)), reverse=True)
    
    print(f"📰 Total GST News: {len(unique_news)} items")
    return unique_news

# =============================================================================
# AI SUMMARY ENGINE - Using Gemini
# =============================================================================

def generate_ai_summary(news_items: List[Dict]) -> Dict:
    """
    Generate AI-powered summary of all news using Llama 3.1 405B.
    Returns structured summary with key insights.
    """
    try:
        # Import from ai_config module
        from ai_config import call_chat_model
        
        # Prepare news text for summarization
        news_text = "\n\n".join([
            f"HEADLINE: {item['title']}\nSOURCE: {item['source_label']}\nSUMMARY: {item['summary']}"
            for item in news_items[:15]  # Limit to avoid token limits
        ])
        
        prompt = f"""You are a GST Tax Expert AI Assistant for Indian businesses.

Analyze these GST/Tax news items and provide a structured summary:

{news_text}

Generate a response in this exact JSON format:
{{
    "daily_digest": "A 2-3 sentence overview of today's most important GST developments",
    "critical_alerts": [
        {{
            "title": "Short alert title",
            "description": "What happened and why it matters",
            "action_required": "What the taxpayer should do",
            "deadline": "Any relevant deadline or null",
            "impact_level": "HIGH/MEDIUM/LOW"
        }}
    ],
    "rate_changes": [
        {{
            "item": "Product/Service name",
            "old_rate": "X%",
            "new_rate": "Y%",
            "effective_date": "Date or null"
        }}
    ],
    "compliance_reminders": [
        "Reminder 1",
        "Reminder 2"
    ],
    "news_summaries": [
        {{
            "headline": "Original headline",
            "plain_english": "Simple explanation of what this means for you",
            "action": "What you should do (if anything)"
        }}
    ]
}}

Rules:
1. Focus on news that DIRECTLY AFFECTS taxpayers (rate changes, deadlines, compliance)
2. Convert legal/technical jargon to simple business language
3. Include specific dates and numbers when mentioned
4. If no rate changes found, return empty array for rate_changes
5. Maximum 5 critical alerts, 5 news summaries
6. Be concise but comprehensive
7. Return ONLY valid JSON, no markdown"""

        # Use Llama 3.1 405B for summarization (chat/UI task)
        print("📰 Generating AI summary with Llama 3.1 405B...")
        response = call_chat_model(prompt)
        
        # Parse JSON response
        response_text = response.replace("```json", "").replace("```", "").strip()
        ai_summary = json.loads(response_text)
        
        # Add metadata
        ai_summary["generated_at"] = datetime.now().isoformat()
        ai_summary["news_count"] = len(news_items)
        ai_summary["success"] = True
        
        print("✅ AI Summary generated successfully")
        return ai_summary
        
    except json.JSONDecodeError as e:
        print(f"⚠️ AI Summary JSON parse error: {e}")
        return get_fallback_ai_summary(news_items)
    except Exception as e:
        print(f"⚠️ AI Summary generation failed: {e}")
        return get_fallback_ai_summary(news_items)

def get_fallback_ai_summary(news_items: List[Dict]) -> Dict:
    """Fallback when AI is unavailable."""
    high_impact = [n for n in news_items if n.get("is_high_impact", False)]
    
    return {
        "success": False,
        "generated_at": datetime.now().isoformat(),
        "news_count": len(news_items),
        "daily_digest": f"Today we found {len(news_items)} GST-related news items. {len(high_impact)} are marked as high-impact updates that may require your attention.",
        "critical_alerts": [
            {
                "title": n["title"][:80],
                "description": n["summary"][:200],
                "action_required": "Review this update for potential impact on your business",
                "deadline": None,
                "impact_level": "MEDIUM"
            }
            for n in high_impact[:3]
        ],
        "rate_changes": [],
        "compliance_reminders": [
            "Ensure GSTR-3B is filed by the 20th of each month",
            "GSTR-1 due by 11th (monthly) or 13th (quarterly)",
            "Reconcile ITC with GSTR-2B before claiming"
        ],
        "news_summaries": [
            {
                "headline": n["title"],
                "plain_english": n["summary"],
                "action": "Click to read full article"
            }
            for n in news_items[:5]
        ]
    }

def fetch_gst_news_with_ai_summary() -> Dict:
    """Main function: Fetch news AND generate AI summary."""
    news = fetch_gst_news()
    ai_summary = generate_ai_summary(news)
    
    return {
        "news": news,
        "ai_summary": ai_summary,
        "high_impact_count": len([n for n in news if n.get("is_high_impact", False)]),
        "total_count": len(news)
    }

# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    result = fetch_gst_news_with_ai_summary()
    print(f"\nTotal News: {result['total_count']}")
    print(f"High Impact: {result['high_impact_count']}")
    print(f"\nAI Summary:")
    print(json.dumps(result['ai_summary'], indent=2))
