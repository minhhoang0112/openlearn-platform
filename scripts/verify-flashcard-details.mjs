import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const origin='http://127.0.0.1:3000';
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={checks:[],errors:[]};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin);
  await page.getByRole('button',{name:'Đăng nhập ngay',exact:true}).click();
  await page.getByRole('heading',{name:'Lộ trình đang học',exact:true}).waitFor();
  const catalog=await (await page.request.get(origin+'/api/v1/sets?limit=100&q='+encodeURIComponent('Gia đình'))).json();
  const set=catalog.data.items.find(s=>/A1/.test(s.title));assert.ok(set,'A1 family set exists');
  const details=await (await page.request.get(origin+'/api/v1/sets/'+set.id)).json();
  const index=details.data.words.findIndex(w=>w.term.toLowerCase()==='mother');assert.ok(index>=0);
  const word=details.data.words[index];
  async function openMother(){
    await page.goto(origin+'/study-set/'+set.id);
    await page.getByTestId('flashcard-player').waitFor();
    for(let i=0;i<index;i++)await page.getByRole('button',{name:'Thẻ tiếp theo',exact:true}).click();
    const card=page.getByTestId('flashcard-player');
    await card.click({position:{x:40,y:90}});
    await card.getByText(word.definition,{exact:true}).waitFor();
    return card;
  }
  const card=await openMother();
  const translate=card.getByRole('button',{name:'Dịch ví dụ cho mother',exact:true});
  await translate.waitFor({timeout:120000});
  await page.waitForFunction(()=>!document.querySelector('[data-testid=flashcard-player] [role=status]'),{},{timeout:120000});
  assert.equal(await card.locator('[role=alert]').count(),0);
  assert.equal(await card.locator('[role=note]').count(),0);
  await translate.click();
  await card.locator('[role=note]').waitFor({timeout:120000});
  const translation=await card.locator('[role=note]').innerText();assert.ok(translation.trim());
  await card.getByText('Mặt sau (Nghĩa)',{exact:true}).waitFor();
  report.checks.push('mother flashcard automatically gains example; translate button reveals Vietnamese without flipping');
  await card.getByRole('button',{name:'Nghe ví dụ cho mother',exact:true}).click();
  await card.getByText('Mặt sau (Nghĩa)',{exact:true}).waitFor();
  await translate.click();assert.equal(await card.locator('[role=note]').count(),0);
  report.checks.push('example audio and hide translation leave the card on its back');
  await translate.focus();await page.keyboard.press('Enter');
  await card.locator('[role=note]').waitFor();await card.getByText('Mặt sau (Nghĩa)',{exact:true}).waitFor();
  report.checks.push('Enter on translation control activates only that control');
  const saved=await (await page.request.get(origin+'/api/v1/sets/'+set.id)).json();
  const savedWord=saved.data.words.find(w=>w.id===word.id);assert.ok(savedWord.example);assert.equal(savedWord.example_translation,translation);
  const reloaded=await openMother();await reloaded.getByRole('button',{name:'Dịch ví dụ cho mother',exact:true}).click();
  assert.equal(await reloaded.locator('[role=note]').innerText(),translation);
  report.checks.push('saved example and translation survive page reload');
  await page.screenshot({path:'research/captures/flashcard-example-translation.png',fullPage:false});
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report));
}finally{
  writeFileSync('docs/flashcard-details-validation.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
