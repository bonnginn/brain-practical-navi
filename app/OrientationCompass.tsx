export function OrientationCompass({rotation,compact=false,english=false}:{rotation:{x:number;y:number;z?:number};compact?:boolean;english?:boolean}) {
  const ax=rotation.x*Math.PI/180,ay=rotation.y*Math.PI/180,az=(rotation.z??0)*Math.PI/180;
  const cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az);
  const matrix=[cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,-sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy];
  const axes:{positive:string;negative:string;vector:[number,number,number]}[]=[
    {positive:"R",negative:"L",vector:[1,0,0]},
    {positive:"S",negative:"I",vector:[0,1,0]},
    {positive:"A",negative:"P",vector:[0,0,1]},
  ];
  return <div className={`orientationCompass ${compact?"compact":""}`} aria-label={english?"Current anatomical orientation: R right, L left, A anterior, P posterior, S superior, I inferior":"現在の解剖学的方位。R 右、L 左、A 前、P 後、S 上、I 下"}>
    {axes.map(axis=>{
      const [x,y,z]=axis.vector,rx=matrix[0]*x+matrix[3]*y+matrix[6]*z,ry=matrix[1]*x+matrix[4]*y+matrix[7]*z,rz=matrix[2]*x+matrix[5]*y+matrix[8]*z;
      const length=compact?15:24,dx=rx*length,dy=-ry*length;
      // An axis pointing into/out of the screen has no truthful 2D endpoint.
      if(Math.hypot(dx,dy)<8)return null;
      return <div className="compassAxis" key={axis.positive} style={{opacity:.48+Math.abs(rz)*.42}}>
        <i style={{transform:`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`,width:`${Math.hypot(dx,dy)}px`}}/>
        <b className="compassPositive" style={{transform:`translate(${dx}px,${dy}px)`,zIndex:rz<0?2:1}}>{axis.positive}</b>
        <b className="compassNegative" style={{transform:`translate(${-dx}px,${-dy}px)`,zIndex:rz>0?2:1}}>{axis.negative}</b>
      </div>;
    })}
    <span>R/L · A/P · S/I</span>
  </div>;
}
