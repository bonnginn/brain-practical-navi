import {useEffect,type RefObject} from 'react';

/** Reserve space for the slice controls before sizing the observation image. */
export function useSectionViewport(stageRef:RefObject<HTMLDivElement|null>,active:boolean,layout:string){
  useEffect(()=>{
    const stage=stageRef.current,area=stage?.closest<HTMLElement>('.workArea');
    const panel=stage?.closest<HTMLElement>('.slicePanel');
    const timeline=panel?.querySelector<HTMLElement>('.sliceTimeline');
    if(!active||!stage||!area||!panel||!timeline)return;
    let frame=0;
    const measure=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        // Scroll position must not change the initial framing or create a resize loop.
        const top=stage.getBoundingClientRect().top+area.scrollTop;
        const dock=document.querySelector<HTMLElement>('.phoneDock');
        const dockHeight=dock?.getBoundingClientRect().height??0;
        const available=window.innerHeight-top-timeline.getBoundingClientRect().height-dockHeight-12;
        const minimum=window.innerWidth<=760&&layout==='both'?320:170;
        panel.style.setProperty('--section-fit-height',`${Math.max(minimum,Math.min(760,available))}px`);
      });
    };
    const observer=new ResizeObserver(measure);
    observer.observe(timeline);
    const header=panel.querySelector('.panelHead');if(header)observer.observe(header);
    for(const child of area.children)if(!child.classList.contains('visualGrid'))observer.observe(child);
    window.addEventListener('resize',measure);measure();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure);panel.style.removeProperty('--section-fit-height')};
  },[active,stageRef,layout]);
}
