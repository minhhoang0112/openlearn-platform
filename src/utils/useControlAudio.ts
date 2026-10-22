import {useEffect} from 'react';
/** A tap of Ctrl speaks; Ctrl+C/Ctrl+L keep browser behavior. */
export function useControlAudio(speak:()=>void){
  useEffect(()=>{let tapped=false;
    const down=(e:KeyboardEvent)=>{if(e.key==='Control'&&!e.repeat)tapped=true;else if(e.ctrlKey)tapped=false;};
    const up=(e:KeyboardEvent)=>{if(e.key==='Control'){if(tapped&&!e.altKey&&!e.metaKey&&!e.shiftKey)speak();tapped=false;}};
    const reset=()=>{tapped=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',reset);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',reset);};
  },[speak]);
}
