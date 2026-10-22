// Visible UI facts only; ordinary Playwright, not REA. No private API or locked bodies.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
const output='research/captures/visible-foundation-work.json';
const result=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):{method:'ordinary_playwright_visible_ui',captured_at:new Date().toISOString(),paths:[],errors:[]};
result.paths=result.paths.filter(p=>p.expected_set_count>0);
for(const p of result.paths)p.sets=p.sets.filter(s=>!s.reported_word_count||s.words.length>=s.reported_word_count);
const wanted=[
  ['Nền tảng','Lộ trình A1-A2 tiếng Anh'],['Nền tảng','B1-B2 Everyday English'],['Nền tảng','C1-C2 Everyday English'],
  ['Nền tảng','English Word Form Mastery Path'],['Nền tảng','Lộ trình làm chủ Chunking để giao tiếp trôi chảy - by OpenQuiz'],
  ['Công việc','English for Technology'],['Công việc','Tiếng Anh Y Tế Cơ Bản'],['Công việc','English for Technical Work'],['Công việc','English for Business']
];
const save=()=>writeFileSync(output,JSON.stringify(result,null,2)+'\n');
let failures=0;
try {
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://openquiz.ai/'));
  async function goto(url){for(let attempt=0;attempt<3;attempt++){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});return;}catch(e){if(attempt===2)throw e;await page.waitForTimeout(1000);}}}
  for(const [tag,title] of wanted) {
    let path=result.paths.find(p=>p.title===title);
    if(!path){
      await goto('https://openquiz.ai/');
      await page.getByText(title,{exact:true}).first().click({timeout:12000});
      await page.waitForURL(url=>/^\/learning-path\/\d+$/.test(url.pathname),{timeout:12000,waitUntil:'domcontentloaded'});
      await page.locator('h1').filter({hasText:title}).waitFor({timeout:12000});
      await page.locator('.glass-card').filter({has:page.locator('h3')}).nth(1).waitFor({timeout:12000});
      const cards=page.locator('.glass-card').filter({has:page.locator('h3')});
      const titles=await cards.locator('h3').allInnerTexts();
      if(titles.length<2)throw new Error('Path cards did not load');
      const source=new URL(page.url());source.search='';source.hash='';
      path={id:20000+Number(source.pathname.split('/').pop()),title,tag,source_url:source.href,expected_set_count:titles.length-1,sets:[]};
      result.paths.push(path);save();console.log(JSON.stringify({path:title,expected_sets:path.expected_set_count}));
    }
    for(let index=0;index<path.expected_set_count;index++) {
      if(path.sets.some(s=>s.position===index))continue;
      try {
        await goto(path.source_url);
        await page.locator('h1').filter({hasText:title}).waitFor({timeout:12000});
        const cards=page.locator('.glass-card').filter({has:page.locator('h3')});
        await cards.nth(path.expected_set_count).waitFor({timeout:12000});
        const expectedTitle=(await cards.nth(index+1).locator('h3').innerText()).replace(/^\d+\.\s*/,'').trim();
        const cardText=await cards.nth(index+1).innerText();
        const expectedWords=Number(cardText.match(/(\d+)\s+từ/)?.[1]||0);
        await cards.nth(index+1).click({timeout:5000});
        await page.waitForURL(url=>/^\/study-set\/\d+$/.test(url.pathname),{timeout:10000,waitUntil:'domcontentloaded'});
        await page.waitForTimeout(1300);
        await page.locator('div.border-r.border-border p.font-medium').first().waitFor({timeout:12000});
        for(let load=0;load<6 && await page.locator('div.border-r.border-border').count()<expectedWords;load++){
          await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(750);
        }
        const words=await page.locator('div.border-r.border-border').evaluateAll(nodes=>nodes.map(left=>{
          function visibleText(node){if(!node)return '';let p=node;while(p&&p!==document.body){const s=getComputedStyle(p);if(s.filter.includes('blur')||s.visibility==='hidden'||s.display==='none')return '';p=p.parentElement;}return node.textContent.trim();}
          const term=left.querySelector('p.font-medium');const definition=left.nextElementSibling?.querySelector('p.text-foreground');
          const spans=Array.from(left.querySelector('.text-muted-foreground.text-xs')?.children||[]);
          return {term:visibleText(term),definition:visibleText(definition),part_of_speech:visibleText(spans[0]),phonetic:spans.map(visibleText).find(t=>/^\/.*\/$/.test(t))||''};
        }).filter(w=>w.term&&w.definition));
        const actualTitle=(await page.locator('h1').innerText()).trim();
        if(actualTitle!==expectedTitle||!words.length)throw new Error(`Unexpected title/count: ${actualTitle} ${words.length}/${expectedWords}`);
        const source=new URL(page.url());source.search='';source.hash='';
        path.sets.push({position:index,source_id:Number(source.pathname.split('/').pop()),title:actualTitle,source_url:source.href,reported_word_count:expectedWords,words});save();
        console.log(JSON.stringify({path:title,completed:path.sets.length,total:path.expected_set_count,words:words.length}));
      } catch(e){result.errors.push({path:title,index,message:e.message});save();console.log(JSON.stringify({path:title,index,error:e.message}));if(++failures>=4)throw e;}
    }
  }
} finally {await browser.close();}
