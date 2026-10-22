// Ordinary Playwright UI observation. Does not read cookies, storage, React state,
// network response bodies, or blurred/locked examples. REA verifies snapshots separately.
import {createRequire} from 'node:module';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
const output='research/captures/visible-toeic-vocabulary.json';
const result=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):{source:'ordinary_playwright_visible_ui',path_url:'https://openquiz.ai/learning-path/14',captured_at:new Date().toISOString(),excluded:['examples','synonyms','images','audio','locked_fields'],sets:[],errors:[]};
try {
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://openquiz.ai/'));
  for(let index=0;index<50;index++) {
    if(result.sets.some(s=>s.position===index))continue;
    try {
      await page.goto(result.path_url,{waitUntil:'domcontentloaded',timeout:15000});
      const cards=page.locator('.glass-card').filter({has:page.locator('h3')});
      await cards.nth(50).waitFor({timeout:12000});
      const expectedTitle=(await cards.nth(index+1).locator('h3').innerText()).replace(/^\d+\.\s*/,'').trim();
      await cards.nth(index+1).click({timeout:5000});
      await page.waitForURL(url=>/^\/study-set\/\d+$/.test(url.pathname),{timeout:10000,waitUntil:'domcontentloaded'});
      await page.locator('div.border-r.border-border p.font-medium').first().waitFor({timeout:12000});
      const words=await page.locator('div.border-r.border-border').evaluateAll(nodes=>nodes.map(left=>{
        const term=left.querySelector('p.font-medium');
        const right=left.nextElementSibling;
        const definition=right?.querySelector('p.text-foreground');
        const meta=left.querySelector('.text-muted-foreground.text-xs');
        const spans=meta?Array.from(meta.children):[];
        function visibleText(node){
          if(!node)return '';
          let parent=node;
          while(parent&&parent!==document.body){const style=getComputedStyle(parent);if(style.filter.includes('blur')||style.visibility==='hidden'||style.display==='none')return '';parent=parent.parentElement;}
          return node.textContent.trim();
        }
        return {term:visibleText(term),definition:visibleText(definition),part_of_speech:visibleText(spans[0]),phonetic:visibleText(spans[2])};
      }).filter(w=>w.term&&w.definition));
      const title=(await page.locator('h1').innerText()).trim();
      if(title!==expectedTitle||words.length!==12)throw new Error(`Unexpected UI: ${title}; ${words.length} visible words`);
      const sourceURL=new URL(page.url());sourceURL.search='';sourceURL.hash='';
      result.sets.push({position:index,source_id:Number(sourceURL.pathname.split('/').pop()),title,source_url:sourceURL.href,words});
      writeFileSync(output,JSON.stringify(result,null,2)+'\n');
      console.log(JSON.stringify({completed:result.sets.length,title,words:words.length}));
    } catch(e) {result.errors.push({position:index,message:e.message});writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({position:index,error:e.message}));if(result.errors.length>=3)break;}
  }
} finally {await browser.close();}
