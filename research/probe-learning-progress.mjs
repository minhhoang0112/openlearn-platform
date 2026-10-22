// Bounded UI-only observation in the browser the user authorized for OpenQuiz.
// No credentials, storage values, hidden answer bodies or source account state are imported.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire('C:/Users/HP VICTUS/AppData/Local/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/rea-agents/package.json');
const {chromium}=require('playwright-core');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
const report={source:'ordinary_playwright_UI_not_REA',url:'https://openquiz.ai/study/163',steps:[],limitations:['Only three answers observed; this does not recover the full scheduling algorithm.']};
const meanings={apply:'áp dụng','apply for':'ứng tuyển',apprentice:'người học việc',background:'nền tảng',candidate:'ứng viên',expert:'chuyên gia',hire:'thuê',interview:'phỏng vấn',profession:'nghề nghiệp',profile:'lý lịch',promote:'thăng chức',qualifications:'bằng cấp'};
try{
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='https://openquiz.ai/study/163');if(!page)throw new Error('Select the authorized study page first.');
  async function state(){const raw=await page.locator('body').innerText();const lines=raw.split('\n').map(s=>s.trim());const flat=raw.replace(/\s+/g,' ');return {word:Object.keys(meanings).find(w=>lines.includes(w)),completed:flat.match(/Đã hoàn thành\s*:\s*(\d+)\s*\/\s*(\d+)/)?.slice(1),questions:flat.match(/Câu hỏi\s*:\s*(\d+)\s*\/\s*(\d+)/)?.slice(1)};}
  for(let i=0;i<3;i++){
    const before=await state();if(!before.word)throw new Error('Unknown visible prompt; stopping instead of guessing.');
    await page.locator('input:visible').last().fill(meanings[before.word]);
    await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục',exact:true}).waitFor({timeout:10000});
    const feedback=await state();const wrongButton=await page.getByRole('button',{name:/Tôi trả lời sai/}).count();
    await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
    await page.getByRole('button',{name:'Kiểm tra',exact:true}).waitFor({timeout:10000});
    report.steps.push({before,feedback,accepted:wrongButton>0,afterContinue:await state()});
  }
  console.log(JSON.stringify(report));
}finally{writeFileSync('research/captures/learning-progress-probe.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
