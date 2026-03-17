import fs from 'node:fs';
import RSSParser from 'rss-parser';
import pkg from 'google-translate-api-next';
const { translate } = pkg;

const parser = new RSSParser();

// 여기에 블로그 메인 주소를 넣으면 자동으로 RSS 주소로 변환해줄 거야
const BLOG_SOURCES = [
  { name: "루klng LNG", mainUrl: "https://blog.naver.com/looklng", platform: "Naver" },
  { name: "こち横", mainUrl: "https://note.com/kochi928", platform: "Note" },
  { name: "모르는 사람", mainUrl: "https://moru-is-person.tistory.com/", platform: "Tistory" },
  { name: "Peltvr", mainUrl: "https://peltvr.blogspot.com/", platform: "Blogspot" },
];

// 각 플랫폼별 RSS 주소 변환기
function getRssUrl(source) {
  const url = source.mainUrl.replace(/\/$/, ""); // 끝에 슬래시 제거
  if (source.platform === "Naver") return `https://rss.blog.naver.com/${url.split('/').pop()}.xml`;
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
      const feed = await parser.parseURL(rssUrl);
      const item = feed.items[0]; // 최신글 1개

      if (item) {
        console.log(`🌐 [${source.name}] 번역 중...`);
        
        // 미리 한국어, 영어, 일본어로 번역해두기
        const [ko, en, ja] = await Promise.all([
          translate(item.title, { to: 'ko' }),
          translate(item.title, { to: 'en' }),
          translate(item.title, { to: 'ja' })
        ]);

        allPosts.push({
          titles: { ko: ko.text, en: en.text, ja: ja.text },
          original_title: item.title,
          url: item.link,
          author: source.name,
          platform: source.platform,
          date: item.pubDate,
          category: "Blog"
        });
      }
    } catch (err) {
      console.error(`❌ [${source.name}] 실패:`, err.message);
    }
  }

  // 최신순 정렬
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync('./src/data.json', JSON.stringify(allPosts, null, 2));
  console.log('✅ 모든 데이터 수집 및 번역 완료!');
}

updateData();