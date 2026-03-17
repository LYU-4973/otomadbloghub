import fs from 'node:fs';
import RSSParser from 'rss-parser';
import googleTranslate from 'google-translate-api-next';

const translate = googleTranslate.translate || googleTranslate;

const parser = new RSSParser({
  headers: {
    // 티스토리 406 에러 방지를 위한 표준 브라우저 헤더
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 15000,
});

const BLOG_SOURCES = [
  { name: "루klng LNG", mainUrl: "https://blog.naver.com/looklng", platform: "Naver" },
  { name: "こち横", mainUrl: "https://note.com/kochi928", platform: "Note" },
  { name: "모르는 사람", mainUrl: "https://moru-is-person.tistory.com", platform: "Tistory" },
  { name: "Peltvr", mainUrl: "https://peltvr.blogspot.com", platform: "Blogspot" },
];

function getRssUrl(source) {
  const url = source.mainUrl.replace(/\/$/, ""); 
  if (source.platform === "Naver") {
    const id = url.split('/').filter(Boolean).pop();
    return `https://rss.blog.naver.com/${id}.xml`;
  }
  if (source.platform === "Tistory") return `${url}/rss`; // 티스토리는 /rss가 표준입니다.
  if (source.platform === "Note") return `${url}/rss`;
  if (source.platform === "Blogspot") return `${url}/feeds/posts/default?alt=rss`;
  return url;
}

async function updateData() {
  const allPosts = [];

  for (const source of BLOG_SOURCES) {
    try {
      const rssUrl = getRssUrl(source);
      console.log(`📡 [${source.name}] 수집 시도: ${rssUrl}`);
      
      const feed = await parser.parseURL(rssUrl);
      const item = feed.items[0]; 

      if (item) {
        console.log(`🌐 [${source.name}] 번역 중: ${item.title}`);
        
        let koText = item.title, enText = item.title, jaText = item.title;
        try {
          const [ko, en, ja] = await Promise.all([
            translate(item.title, { to: 'ko' }),
            translate(item.title, { to: 'en' }),
            translate(item.title, { to: 'ja' })
          ]);
          koText = ko.text; enText = en.text; jaText = ja.text;
        } catch (tErr) {
          console.warn(`⚠️ [${source.name}] 번역 실패:`, tErr.message);
        }

        allPosts.push({
          titles: { ko: koText, en: enText, ja: jaText },
          original_title: item.title,
          url: item.link,
          author: source.name,
          platform: source.platform,
          date: item.pubDate || item.isoDate || new Date().toISOString(),
          category: "Blog"
        });
      }
    } catch (err) {
      console.error(`❌ [${source.name}] 실패:`, err.message);
    }
  }

  allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  fs.writeFileSync('./src/data.json', JSON.stringify(allPosts, null, 2));
  console.log(`\n✅ 최종 수집 완료: 총 ${allPosts.length}개의 게시글`);
}

updateData();