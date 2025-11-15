import { useState, useEffect } from 'react';

export interface NewsItem {
    gid: string;
    title: string;
    link: string;
    pubDate: string;
    author: string;
    imageUrl: string | null;
    contentSnippet: string;
}

const useNewsFetch = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            setError(null);
            try {
                const feedUrl = 'https://store.steampowered.com/feeds/news/app/244770/';
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
                const response = await fetch(proxyUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const text = await response.text();
                
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'application/xml');

                const parseError = xml.querySelector('parsererror');
                if (parseError) {
                    console.error('XML Parsing Error:', parseError.textContent);
                    throw new Error('Failed to parse the news feed. The format might have changed or the proxy failed.');
                }
                
                const items = xml.querySelectorAll('item');
                
                const parsedItems: NewsItem[] = Array.from(items).map(item => {
                    const title = item.querySelector('title')?.textContent || 'No title';
                    const link = item.querySelector('link')?.textContent || '#';
                    const pubDate = item.querySelector('pubDate')?.textContent || '';
                    const author = item.querySelector('author')?.textContent || 'Unknown author';
                    const gid = item.querySelector('guid')?.textContent || '';
                    const descriptionHTML = item.querySelector('description')?.textContent || '';

                    const descContainer = document.createElement('div');
                    descContainer.innerHTML = descriptionHTML;
                    
                    const img = descContainer.querySelector('img');
                    const imageUrl = img ? img.src : null;
                    
                    if (img) img.remove();
                    const contentSnippet = descContainer.textContent?.trim().substring(0, 200) + '...' || 'No content';

                    return {
                        gid,
                        title,
                        link,
                        pubDate: new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                        author,
                        imageUrl,
                        contentSnippet,
                    };
                });
                
                setNews(parsedItems);
            } catch (e: any) {
                setError(`Failed to fetch news feed. Please try again later.`);
                console.error("News fetch error:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    return { news, loading, error };
};

export default useNewsFetch;
