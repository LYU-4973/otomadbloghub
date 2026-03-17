import fs from 'node:fs';
import RSSParser from 'rss-parser';
import googleTranslate from 'google-translate-api-next';

// 에러 방지를 위해 라이브러리 구조에 맞게 translate 함수 추출
const translate = googleTranslate.translate || googleTranslate;

const parser = new RSSParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  timeout: 10000,
});

const BLOG_SOURCES = [
  { name: "루klng LNG", mainUrl: "https://blog.naver.com/looklng", platform: "Naver" },
  { name: "こち横", mainUrl: "https://note.com/kochi928", platform: "Note" },
  { name: "모르는 사람", mainUrl: "https://moru-is-person.tistory.com/", platform: "Tistory" },
  { name: "Peltvr", mainUrl: "https://peltvr.blogspot.com/", platform: "Blogspot" },
];

function getRssUrl(source) {
  const url = source.mainUrl.replace(/\/$/, ""); 
  if (source.platform === "Naver") {
    // 네이버 블로그 ID 추출 로직 강화
    const id = url.split('/').filter(Boolean).pop();
    return `https://rss.blog.naver.com/${id}.xml`;
  }
  if (source.platform === "Note") return `${url}/rss`;
  if (source.platform === "Tistory") return `${url}/rss`;
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
        
        const [ko, en, ja] = await Promise.all([
          translate(item.title, { to: 'ko' }).catch(() => ({ text: item.title })),
          translate(item.title, { to: 'en' }).catch(() => ({ text: item.title })),
          translate(item.title, { to: 'ja' }).catch(() => ({ text: item.title }))
        ]);

        allPosts.push({
          titles: { ko: ko.text, en: en.text, ja: ja.text },
          original_title: item.title,
          url: item.link,
          author: source.name,
          platform: source.platform,
          date: item.pubDate || new Date().toISOString(),
          category: "Blog"
        });
      }
    } catch (err) {
      console.error(`❌ [${source.name}] 실패:`, err.message);
    }
  }

  // 날짜 기준 최신순 정렬
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 결과 저장
  fs.writeFileSync('./src/data.json', JSON.stringify(allPosts, null, 2));
  console.log(`✅ 수집 완료: 총 ${allPosts.length}개의 게시글`);
}

updateData();