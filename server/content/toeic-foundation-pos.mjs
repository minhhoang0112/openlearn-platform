// Word class in this beginner lesson's intended use. Ambiguous items retain both classes.
const groups={
 'p1-01':'noun','p1-02':'pronoun','p1-03':'adjective','p1-04':'verb','p1-05':'numeral',
 'p1-06':'noun','p1-07':'noun','p1-08':'noun','p1-09':'verb','p1-10':'noun',
 'p1-11':'adjective','p1-12':'verb','p1-13':'verb','p1-14':'noun','p1-15':'noun',
 'p1-16':'noun','p1-17':'preposition','p1-18':'noun','p1-19':'noun','p1-20':'noun',
 'p2-01':'verb','p2-02':'noun','p2-03':'modal verb','p2-04':'determiner','p2-05':'noun',
 'p2-06':'adjective','p2-07':'adjective','p2-08':'conjunction','p2-09':'verb','p2-10':'noun',
 'p2-11':'verb','p2-12':'noun','p2-13':'noun','p2-14':'adjective','p2-15':'noun',
 'p2-16':'noun','p2-17':'noun','p2-18':'noun','p2-19':'noun','p2-20':'noun',
};
const overrides={};
function assign(unit,pos,terms){for(const term of terms.split('|'))overrides[unit+':'+term]=pos;}
assign('p1-02','verb','am|is|are');assign('p1-02','possessive determiner','my|your|his|her|our');
assign('p1-03','adverb','slowly');assign('p1-05','noun','Monday|Tuesday|Wednesday|Thursday|Friday');
assign('p1-06','adverb','today|tomorrow|yesterday|usually|often|sometimes');assign('p1-06','determiner','every');
assign('p1-07','verb','cook|eat');assign('p1-11','verb','was|were');assign('p1-11','adverb','ago|here|there');
assign('p1-14','verb','travel|leave');assign('p1-14','noun / verb','plan|visit');
assign('p1-15','adjective','first|second|third|next');assign('p1-15','adverb','soon|then|now');assign('p1-15','preposition / conjunction','before|after');
assign('p1-18','pronoun','who|what');assign('p1-18','adverb','where|when|why|how');assign('p1-18','determiner','which|whose|many|much');assign('p1-18','verb','buy|pay');
assign('p1-19','verb','send|receive|reply|confirm|cancel|change|request');assign('p1-19','noun / verb','email|schedule|message|address|contact');
assign('p1-20','noun / verb','order|return|discount');
assign('p2-01','noun','experience');assign('p2-01','adverb','already|yet|just|ever|never|recently');
assign('p2-02','preposition / conjunction','since|until');assign('p2-02','preposition','during');assign('p2-02','adjective','recent|previous|current');assign('p2-02','verb','begin|end');
assign('p2-03','verb','allowed|required');assign('p2-03','noun','permission|rule|safety|notice');
assign('p2-04','noun','amount|piece');assign('p2-08','adverb','however|therefore|also|instead');
assign('p2-12','adjective','broken|missing|delayed|attached|enclosed');
assign('p2-14','noun','success|care');assign('p2-14','adverb','successfully|carefully|quickly|clearly|accurately');
assign('p2-15','verb','reserve|hold|transfer');assign('p2-15','adjective','booked');
assign('p2-16','verb','notify|announce|remind|invite|apologize|suggest');assign('p2-17','verb','attend');
assign('p2-20','noun / verb','purchase|refund|exchange|charge');
export function toeicPartOfSpeech(unit,term){if(!groups[unit])throw new Error('Unmapped TOEIC word class group: '+unit);return overrides[unit+':'+term]??groups[unit];}
export const toeicPosVersion=1;
