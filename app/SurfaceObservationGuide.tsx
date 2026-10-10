import {surfaceObservationGuides,type SurfaceStudyView,type SurfaceStudyMode} from '../src/surfaceObservationGuides';
import './surface-study.css';

export function SurfaceObservationGuide({view,english,open,onOpenChange,active,onObserve,lessons,onLesson}:{
  view:SurfaceStudyView;english:boolean;open:boolean;onOpenChange:(open:boolean)=>void;
  active:SurfaceStudyMode|null;onObserve:(mode:SurfaceStudyMode)=>void;
  lessons:{key:string;name:string}[];onLesson:(key:string)=>void;
}){
  const copy=surfaceObservationGuides[view][english?'en':'ja'];
  return <details className="surfaceStudyGuide" data-no-localize open={open} onToggle={event=>onOpenChange(event.currentTarget.open)}>
    <summary>{english?'A short observation exercise':'ミニ観察ガイド'} — {copy.title}</summary>
    <div className="surfaceStudyBody">
      <ol><li>{copy.landmark}</li><li>{copy.compare}</li><li>{copy.check}</li></ol>
      <div className="surfaceStudyActions" aria-label={english?'Observation display':'観察ガイドの表示'}>
        {(['landmarks','compare','uncolored'] as const).map((mode,index)=><button key={mode} type="button" aria-pressed={active===mode} onClick={()=>onObserve(mode)}>{index+1}. {english?{landmarks:'Show landmarks',compare:'Compare gyri',uncolored:'Hide colour and guides'}[mode]:{landmarks:'目印を表示',compare:'脳回を比較',uncolored:'色とガイドを消す'}[mode]}</button>)}
      </div>
      <p className="surfaceStudyScope">{english?'These buttons replace the current highlighted structures and guides. You can still rotate the model and select other structures.':'ボタンは現在の着色構造とガイドを切り替えます。回転や個別の構造選択も続けられます。'}</p>
      <div className="surfaceStudyLessons"><span>{english?'Region explanations (close to restore colours)':'部位の解説（閉じると元の着色へ）'}</span>{lessons.map(item=><button type="button" key={item.key} onClick={()=>onLesson(item.key)}>{item.name}</button>)}</div>
    </div>
  </details>;
}
