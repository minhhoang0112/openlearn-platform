// Original examples for this personal learning app, not copied premium material.
const colors={
  red:'The traffic light is red.',blue:'He is wearing a blue shirt.',green:'The leaves turn green in spring.',yellow:'She carries a yellow umbrella.',
  pink:'My sister has a pink bicycle.',purple:'The flowers in the garden are purple.',brown:'This table is made of brown wood.',black:'I wear black shoes to work.',
  white:'The walls of the kitchen are white.',gray:'The sky looks gray before the rain.',grey:'The sky looks grey before the rain.',orange:'The child drew an orange sun.',
  circle:'Draw a circle around the correct answer.',square:'Each side of a square has the same length.',triangle:'A triangle has three sides.',rectangle:'The classroom window is shaped like a rectangle.',
  oval:'The mirror above the sink is oval.',round:'We sat around a round table.',diamond:'The kite has a diamond shape.',heart:'She drew a heart on the card.',
  star:'The child cut a star out of yellow paper.',straight:'Draw a straight line across the page.',curved:'The chair has a curved back.',
  dark:'The room is too dark to read in.',light:'She painted the room light blue.'
};
export function authoredExample(word,setTitle){
  if(/màu sắc|colors|colours|shapes|hình dạng/i.test(setTitle))return colors[word.term.toLowerCase()]||'';
  return '';
}
