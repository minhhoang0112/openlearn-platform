import {randomInt} from 'node:crypto';

export const VOCABULARY_ENGINE='segmented_v2';
export function mix(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

// Practice mastery is separate from the time interval of the next SRS review.
export function vocabularyProgress(cards,questions,answers){
  const progress=new Map(cards.map(c=>[c.id,{word_id:c.id,initial_status:c.status||'new',status:c.status||'new',correct_streak:0,attempts:0,complete:false,last_correct:null}]));
  const byId=new Map(questions.map(q=>[q.id,q]));
  for(const answer of answers){const q=byId.get(answer.question_id),p=q&&progress.get(q.word_id);if(!p)continue;p.attempts++;p.last_correct=!!answer.correct;
    if(answer.correct){p.correct_streak++;p.complete=p.status!=='new';p.status=p.status==='new'?'learning':'mastered';}
    else{p.correct_streak=0;p.complete=false;p.status=p.status==='mastered'&&p.initial_status==='mastered'?'learning':'new';}
  }
  return progress;
}

// Small segments combine fresh vocabulary with words already encountered.
// Correct cards leave the current practice queue; wrong cards remain eligible.
export function vocabularySegments(cards,progress,{ordered=false}={}){
  const active=cards.filter(c=>!progress.get(c.id)?.complete).map(c=>({...c,status:progress.get(c.id)?.status||c.status||'new'}));
  if(!active.length)return [];
  const ratio=active.filter(c=>c.status==='mastered').length/active.length,size=ratio>0.7?4:ratio>0.5?5:7;
  const choose=items=>ordered?[...items]:mix(items),pool=choose(active),seen=new Set(),encountered=[],learning=[],wrong=[],segments=[];
  const maxSegments=Math.ceil(active.length/7*2);
  for(let index=0;index<maxSegments;index++){
    const batch=[],ids=new Set();
    const take=(items,limit)=>{let added=0;for(const c of items){if(added>=limit)break;if(!ids.has(c.id)){batch.push(c);ids.add(c.id);added++;}}};
    if(!index)take(pool,size);
    else{
      take(choose(wrong),Math.min(4,size));const free=size-batch.length;
      if(free>0){const fresh=pool.filter(c=>!seen.has(c.id)),freshSlots=Math.min(3,free);take(choose(fresh),freshSlots);take(choose(encountered),free-freshSlots);take(choose(learning),size-batch.length);take(fresh,size-batch.length);}
    }
    if(!batch.length)break;
    const segment=ordered?batch:mix(batch);segments.push(segment);
    for(const c of segment){seen.add(c.id);if(c.status==='new'){encountered.push(c);if(progress.get(c.id)?.last_correct===false)wrong.push(c);}else if(c.status==='learning')learning.push(c);}
    if(seen.size===active.length)break;
  }
  return segments;
}
