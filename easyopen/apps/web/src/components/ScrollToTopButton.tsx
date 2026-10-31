'use client';

import {useEffect,useState} from 'react';

export function ScrollToTopButton(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const update=()=>setVisible(window.scrollY>480);
    update();
    window.addEventListener('scroll',update,{passive:true});
    return ()=>window.removeEventListener('scroll',update);
  },[]);
  function moveToTop(){
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});
  }
  return <button type="button" className={`scroll-top-button ${visible?'is-visible':''}`} onClick={moveToTop} aria-label="페이지 맨 위로 이동" aria-hidden={!visible} tabIndex={visible?0:-1}><span aria-hidden="true">↑</span><span>맨 위로</span></button>;
}
