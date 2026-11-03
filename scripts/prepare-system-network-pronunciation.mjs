// Build-time only; no runtime download or AI call. See docs/CMUDICT-NOTICE.txt.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const filename=process.argv[2];
if(!filename)throw Error('Usage: node scripts/prepare-system-network-pronunciation.mjs <cmudict.dict>');
const raw=readFileSync(filename,'utf8'),dictionary=new Map();
for(const line of raw.split(/\r?\n/)){
  const [term,...tokens]=line.trim().split(/\s+/);
  if(!term||term.startsWith(';;;')||term.includes('('))continue;
  const comment=tokens.indexOf('#');dictionary.set(term,comment<0?tokens:tokens.slice(0,comment));
}
const phones={AA:'ɑ',AE:'æ',AH:'ʌ',AO:'ɔ',AW:'aʊ',AY:'aɪ',B:'b',CH:'tʃ',D:'d',DH:'ð',EH:'ɛ',ER:'ɝ',EY:'eɪ',F:'f',G:'ɡ',HH:'h',IH:'ɪ',IY:'iː',JH:'dʒ',K:'k',L:'l',M:'m',N:'n',NG:'ŋ',OW:'oʊ',OY:'ɔɪ',P:'p',R:'r',S:'s',SH:'ʃ',T:'t',TH:'θ',UH:'ʊ',UW:'uː',V:'v',W:'w',Y:'j',Z:'z',ZH:'ʒ'};
const onsets=new Set(['B','CH','D','DH','F','G','HH','JH','K','L','M','N','P','R','S','SH','T','TH','V','W','Y','Z','ZH','P-R','P-L','B-R','B-L','T-R','D-R','K-R','K-L','G-R','G-L','F-R','F-L','TH-R','SH-R','S-P','S-T','S-K','S-M','S-N','S-L','S-W','T-W','K-W','S-P-R','S-P-L','S-T-R','S-K-R','S-K-L','S-K-W']);
function ipa(token){
  const sequence=dictionary.get(token);if(!sequence)throw Error('Missing pronunciation: '+token);
  const vowels=sequence.flatMap((p,i)=>/\d$/.test(p)?[i]:[]),marks=new Map();
  for(const [n,index] of vowels.entries()){
    const stress=sequence[index].at(-1);if(stress==='0'||vowels.length===1)continue;
    let start=n===0?0:index;
    if(n>0)for(let k=vowels[n-1]+1;k<index;k++)if(onsets.has(sequence.slice(k,index).join('-'))){start=k;break;}
    marks.set(start,stress==='1'?'ˈ':'ˌ');
  }
  return sequence.map((p,i)=>{
    const base=p.replace(/\d$/,''),symbol=p==='AH0'?'ə':p==='ER0'?'ɚ':p==='IY0'?'i':p==='UW0'?'u':phones[base];
    if(!symbol)throw Error('Unknown phoneme '+p);return (marks.get(i)||'')+symbol;
  }).join('');
}
const overrides={
 unmount:'ʌnˈmaʊnt',concurrency:'kənˈkɝənsi',subnet:'ˈsʌbnɛt',loopback:'ˈluːpbæk',hostname:'ˈhoʊstneɪm',resolver:'rɪˈzɑlvɚ',jitter:'ˈdʒɪtɚ',retries:'ˌriːˈtraɪz',timestamp:'ˈtaɪmstæmp',uptime:'ˈʌptaɪm',failover:'ˈfeɪlˌoʊvɚ',checksum:'ˈtʃɛkˌsʌm',hypervisor:'ˈhaɪpɚˌvaɪzɚ',runtime:'ˈrʌnˌtaɪm',cors:'kɔrz',ram:'ræm',nat:'næt',mac:'mæk',
 software:'ˈsɔftˌwɛr',directory:'dəˈrɛktɚi',query:'ˈkwɪri',unauthorized:'ʌnˈɔθəˌraɪzd',unavailable:'ˌʌnəˈveɪləbəl',unsupported:'ˌʌnsəˈpɔrtɪd',unreachable:'ʌnˈriːtʃəbəl',unplugged:'ʌnˈplʌɡd',unexpected:'ˌʌnɪkˈspɛktɪd',uninstall:'ˌʌnɪnˈstɔl',
 ip:'ˌaɪ ˈpiː',ipv4:'ˌaɪ piː viː ˈfɔr',ipv6:'ˌaɪ piː viː ˈsɪks',dns:'ˌdiː ɛn ˈɛs',dhcp:'ˌdiː eɪtʃ siː ˈpiː',ttl:'ˌtiː tiː ˈɛl',ssid:'ˌɛs ɛs aɪ ˈdiː',tcp:'ˌtiː siː ˈpiː',udp:'ˌjuː diː ˈpiː',http:'ˌeɪtʃ tiː tiː ˈpiː',https:'ˌeɪtʃ tiː tiː piː ˈɛs',tls:'ˌtiː ɛl ˈɛs',vpn:'ˌviː piː ˈɛn',ssh:'ˌɛs ɛs ˈeɪtʃ',dll:'ˌdiː ɛl ˈɛl',cpu:'ˌsiː piː ˈjuː',url:'ˌjuː ɑr ˈɛl',id:'ˌaɪ ˈdiː',
 '400':'fɔr ˈhʌndrəd','401':'fɔr oʊ wʌn','403':'fɔr oʊ θriː','404':'fɔr oʊ fɔr','429':'fɔr tuː naɪn','500':'faɪv ˈhʌndrəd','502':'faɪv oʊ tuː','503':'faɪv oʊ θriː','504':'faɪv oʊ fɔr',
 // Match the technical noun / verb sense instead of a dictionary's first homograph.
 process:'ˈprɑsɛs',record:'ˈrɛkɚd',object:'ˈɑbdʒɛkt',invalid:'ɪnˈvælɪd',live:'laɪv',read:'riːd',use:'juːs',access:'ˈæksɛs',input:'ˈɪnpʊt',output:'ˈaʊtpʊt',
};
const verbs=new Set(['boot','restart','hibernate','mount','unmount','install','uninstall','upgrade','hang','connect','disconnect','reconnect','debug','restore','commit','troubleshoot','diagnose','reproduce']);
const adjectives=new Set(['wireless','read-only','connected','disconnected','critical','resolved']);
const messages=new Set(['reboot required','boot device not found','file not found','no such file or directory','access denied','permission denied','account locked','insufficient privileges','installation failed','unsupported version','command not found','invalid argument','syntax error','not responding','service unavailable','unexpected shutdown','could not resolve host','no Internet access','limited connectivity','network cable unplugged','certificate expired','resource limit exceeded','database is locked','foreign key constraint failed','module not found']);
const messageTopics=new Set(['connection-errors','linux-errors','windows-application-errors']);
const status=new Set(['not responding','reboot required','restart pending','the operation was canceled','pending investigation']);
const course=JSON.parse(readFileSync(new URL('../server/content/system-network-vocabulary.json',import.meta.url)));
const entries={};
for(const topic of course.sets)for(const [term] of topic.words){
 let pos=verbs.has(term)?'verb':adjectives.has(term)?'adjective':term.includes(' ')?'noun phrase':'noun';
 if(messages.has(term)||messageTopics.has(topic.key)||/^\d{3} /.test(term))pos='error message';
 if(status.has(term))pos='status message';
 const phonetic='/'+term.toLowerCase().split(/[\s/-]+/).map(t=>overrides[t]||ipa(t)).join(' ')+'/';
 entries[term]={part_of_speech:pos,phonetic};
}
const result={accent:'en-US',source:'CMUdict with editorial technical-term readings; IPA converted from ARPAbet. Phrases show citation forms of their words, not connected-speech transcription.',source_url:'https://github.com/cmusphinx/cmudict',source_sha256:createHash('sha256').update(raw).digest('hex'),entries};
const target=new URL('../server/content/system-network-pronunciation.json',import.meta.url);
writeFileSync(target,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({entries:Object.keys(entries).length,file:fileURLToPath(target)}));
