import {fail,integer,list} from './validation.mjs';

export function setReadiness(words,{aiConfigured=false}={}){
  const total=words.length,examples=words.filter(w=>!w.example?.trim()).map(w=>w.id),translations=words.filter(w=>!w.example_translation?.trim()).map(w=>w.id),modes=[];
  const add=(id,missing=[],requiresAi=false,maxWords=100)=>{
    const exceeds=total>maxWords&&id!=='comprehensive_core';
    modes.push({id,ready:total>0&&!missing.length&&(!requiresAi||aiConfigured)&&!exceeds,requires_ai:requiresAi,max_words:maxWords,requires_subset:total>maxWords,missing_fields:missing,blocked_reason:!total?'EMPTY_SET':exceeds?'SELECTION_LIMIT':missing.length?'MISSING_CONTENT':requiresAi&&!aiConfigured?'AI_NOT_CONFIGURED':null});
  };
  for(const id of ['flashcard','learn','write','quiz','dictation','match','exam'])add(id);
  add('comprehensive_core',[],false,5);
  add('sentence_dictation',examples.length?['example']:[]);
  add('grammar_order',examples.length?['example']:[],false,30);
  add('grammar_translate',[...(examples.length?['example']:[]),...(translations.length?['example_translation']:[])],false,30);
  add('speaking',[],true,20);add('conversation',[],true);add('reading',[],true,30);
  return {total_words:total,examples_available:total-examples.length,translations_available:total-translations.length,missing_example_ids:examples,missing_translation_ids:translations,modes,
    assessment_scope:'content_and_provider_configuration',limitations:['Sẵn sàng dữ liệu không bảo đảm chất lượng nội dung, trình độ phù hợp hoặc provider còn hạn mức.','Các chế độ được đánh giá cho phạm vi từ đang chọn; không tự bỏ từ thiếu ví dụ. Học kết hợp chia nhóm tối đa 5 từ.','Tạo mới và mở lại bài đã lưu là hai thao tác khác nhau; trạng thái AI ở đây dành cho tạo mới.']};
}

export function contentReadinessService(content,aiConfigured){
  function registerRoutes(route){
    route('GET','/sets/:id/readiness',c=>{
      const set=content.setAccess(c.params.id,c.user),words=content.words(set.id,c.user);let selected=words;
      if(c.query.has('word_ids')){
        const ids=list(c.query.get('word_ids').split(','),'word_ids',100).map(id=>integer(id,'word_id')),wanted=new Set(ids);selected=words.filter(w=>wanted.has(w.id));
        if(selected.length!==wanted.size)fail(400,'INVALID_WORD_SELECTION','Danh sách từ không thuộc bộ đang chọn.');
      }
      return {set_id:set.id,...setReadiness(selected,{aiConfigured:aiConfigured(c.user)})};
    },{summary:'Own exact selected-word readiness after private/prepared example enrichment; no AI generation'});
  }
  return {registerRoutes};
}
