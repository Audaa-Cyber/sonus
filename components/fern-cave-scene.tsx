"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Flower = { x:number; y:number; z:number; scale:number; phase:number; side:number };

export default function FernCaveScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const mobile = window.matchMedia("(max-width: 820px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090705);
    scene.fog = new THREE.FogExp2(0x100b08, mobile ? .025 : .018);
    const camera = new THREE.PerspectiveCamera(mobile ? 68 : 62, 1, .1, 180);
    camera.position.set(0, .15, 5.5);
    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "fern-cave-webgl";
    renderer.domElement.setAttribute("aria-hidden","true");
    host.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0x9a8c83, 0x17100b, 1.05);
    scene.add(ambient);
    const warm = new THREE.PointLight(0xffd49a, 150, 44, 1.8);
    warm.position.set(0, 5.5, -31); scene.add(warm);
    const fill = new THREE.PointLight(0xe89aaf, 36, 25, 2);
    fill.position.set(-5, 1.4, -16); scene.add(fill);
    const rim = new THREE.PointLight(0xf2b76f, 65, 35, 2);
    rim.position.set(5, 3.2, -48); scene.add(rim);

    // A curved, segmented rock tunnel: a real navigable environment, not a flat image.
    const rockMat = new THREE.MeshStandardMaterial({ color:0x30251e, roughness:.96, metalness:0 });
    const rockDark = new THREE.MeshStandardMaterial({ color:0x17120f, roughness:1 });
    const rockGeo = new THREE.BufferGeometry();
    const verts:number[] = [], indices:number[] = [];
    const rings=38, around=36, length=100;
    for(let j=0;j<=rings;j++){
      const z=8-(j/rings)*length;
      for(let i=0;i<=around;i++){
        const a=(i/around)*Math.PI;
        const noise=Math.sin(j*1.7+i*.7)*.16+Math.cos(j*.8+i*1.9)*.09;
        const rx=9.1+noise, ry=6.3+noise;
        verts.push(Math.cos(a)*rx, Math.sin(a)*ry-1.15, z);
      }
    }
    for(let j=0;j<rings;j++) for(let i=0;i<around;i++){
      const a=j*(around+1)+i,b=a+around+1;
      indices.push(a,b,a+1,b,b+1,a+1);
    }
    rockGeo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
    rockGeo.setIndex(indices); rockGeo.computeVertexNormals();
    const tunnel=new THREE.Mesh(rockGeo,rockMat); tunnel.receiveShadow=true; scene.add(tunnel);

    const floor=new THREE.Mesh(new THREE.PlaneGeometry(22,112,24,100),new THREE.MeshStandardMaterial({color:0x211a13,roughness:1}));
    floor.rotation.x=-Math.PI/2; floor.position.set(0,-1.18,-43); floor.receiveShadow=true; scene.add(floor);

    // Stalagmites and broken rock silhouettes along both sides.
    const rockGeoSmall=new THREE.DodecahedronGeometry(1,1);
    const rockInstances=new THREE.InstancedMesh(rockGeoSmall,rockDark,mobile?95:180);
    const dummy=new THREE.Object3D();
    for(let i=0;i<(mobile?95:180);i++){
      const side=i%2?1:-1, z=7-Math.random()*94, x=side*(5.4+Math.random()*2.8);
      dummy.position.set(x,-1.1+Math.random()*1.4,z);
      dummy.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
      const s=.3+Math.random()*1.5; dummy.scale.set(s*1.2,s,s); dummy.updateMatrix(); rockInstances.setMatrixAt(i,dummy.matrix);
    }
    scene.add(rockInstances);

    // A photograph-backed distant opening keeps the supplied reference image in the scene.
    const loader=new THREE.TextureLoader();
    loader.load("/fern-cave.webp",(texture)=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      const plate=new THREE.Mesh(new THREE.PlaneGeometry(27,15.1),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.8,depthWrite:false}));
      plate.position.set(0,3.8,-96); scene.add(plate);
    });

    // Hundreds of instanced blossoms. Petals and centers sway and react to cursor proximity.
    const flowerCount=mobile?210:560;
    const flowers:Flower[]=[];
    const petalGeo=new THREE.SphereGeometry(.105,7,6); petalGeo.scale(1,.55,1.65);
    const petalMat=new THREE.MeshStandardMaterial({color:0xd887a1,emissive:0x6f203e,emissiveIntensity:.48,roughness:.7});
    const petals=new THREE.InstancedMesh(petalGeo,petalMat,flowerCount*5);
    const centerGeo=new THREE.SphereGeometry(.065,7,6);
    const centerMat=new THREE.MeshStandardMaterial({color:0xffdca0,emissive:0xd18b37,emissiveIntensity:1.5});
    const centers=new THREE.InstancedMesh(centerGeo,centerMat,flowerCount);
    const stemGeo=new THREE.CylinderGeometry(.018,.035,.42,5);\n    const stemMat=new THREE.MeshStandardMaterial({color:0x40583a,roughness:.95});\n    const stems=new THREE.InstancedMesh(stemGeo,stemMat,flowerCount);\n    const leafGeo=new THREE.SphereGeometry(.13,6,5); leafGeo.scale(.45,.12,1.7);
    const leafMat=new THREE.MeshStandardMaterial({color:0x526c42,roughness:.9});
    const leaves=new THREE.InstancedMesh(leafGeo,leafMat,flowerCount*2);
    const flowerDummy=new THREE.Object3D();
    for(let i=0;i<flowerCount;i++){
      const side=Math.random()<.5?-1:1;
      const z=5-Math.random()*94;
      const x=side*(1.8+Math.random()*6.3);
      const y=-1.02+Math.random()*.55;
      const scale=.45+Math.random()*1.5;
      flowers.push({x,y,z,scale,phase:Math.random()*Math.PI*2,side});
      for(let k=0;k<5;k++){
        const a=k*Math.PI*2/5;
        flowerDummy.position.set(x+Math.cos(a)*.13*scale,y+Math.sin(a)*.13*scale,z);
        flowerDummy.rotation.set(0,-a,0); flowerDummy.scale.setScalar(scale);
        flowerDummy.updateMatrix(); petals.setMatrixAt(i*5+k,flowerDummy.matrix);
      }
      flowerDummy.position.set(x,y,z); flowerDummy.scale.setScalar(scale); flowerDummy.updateMatrix(); centers.setMatrixAt(i,flowerDummy.matrix);\n      flowerDummy.position.set(x,y-.22*scale,z);flowerDummy.scale.setScalar(scale);flowerDummy.updateMatrix();stems.setMatrixAt(i,flowerDummy.matrix);
      for(let k=0;k<2;k++){
        flowerDummy.position.set(x+side*(.18+k*.13),y-.12,z+.12-k*.18);
        flowerDummy.rotation.set(.2,side*.5+k*.5,.5*side); flowerDummy.scale.setScalar(scale);
        flowerDummy.updateMatrix(); leaves.setMatrixAt(i*2+k,flowerDummy.matrix);
      }
    }
    scene.add(stems,petals,centers,leaves);

    // Warm floating dust and pollen.
    const dustCount=mobile?320:900;
    const dustPositions=new Float32Array(dustCount*3);
    for(let i=0;i<dustCount;i++){
      dustPositions[i*3]=(Math.random()-.5)*18;
      dustPositions[i*3+1]=Math.random()*9-1;
      dustPositions[i*3+2]=5-Math.random()*100;
    }
    const dustGeo=new THREE.BufferGeometry(); dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPositions,3));
    const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xffd9a4,size:mobile?.035:.045,transparent:true,opacity:.62,depthWrite:false}));
    scene.add(dust);

    // Stepping stones guide the camera through the cave.
    const stoneMat=new THREE.MeshStandardMaterial({color:0x61513d,roughness:.92});
    const stones=new THREE.Group();
    for(let i=0;i<78;i++){
      const stone=new THREE.Mesh(new THREE.CylinderGeometry(.35+Math.random()*.35,.4+Math.random()*.35,.12,7),stoneMat);
      stone.position.set((Math.random()-.5)*2.8,-1.03,5-i*1.22);
      stone.rotation.y=Math.random()*Math.PI; stone.receiveShadow=true; stones.add(stone);
    }
    scene.add(stones);

    let pointerX=0,pointerY=0,targetX=0,targetY=0,wheelDistance=0,hover=0,hoverEase=0,frame=0,last=0,touchY=0;
    const onPointer=(e:PointerEvent)=>{targetX=(e.clientX/innerWidth-.5)*2;targetY=(e.clientY/innerHeight-.5)*2;};
    const onWheel=(e:WheelEvent)=>{wheelDistance=Math.min(58,Math.max(-4,wheelDistance+e.deltaY*.012));};
    const onTouchStart=(e:TouchEvent)=>{touchY=e.touches[0]?.clientY??0;};
    const onTouchMove=(e:TouchEvent)=>{const y=e.touches[0]?.clientY??touchY;wheelDistance=Math.min(58,Math.max(-4,wheelDistance+(touchY-y)*.11));touchY=y;};
    const onEnter=()=>{hover=1;}; const onLeave=()=>{hover=0;};
    window.addEventListener("pointermove",onPointer,{passive:true});
    window.addEventListener("wheel",onWheel,{passive:true});\n    window.addEventListener("touchstart",onTouchStart,{passive:true});\n    window.addEventListener("touchmove",onTouchMove,{passive:true});
    const ctas=Array.from(document.querySelectorAll(".hero-actions .primary-link,.ws-send-payment-btn,.ws-connect-btn"));
    ctas.forEach((cta)=>{cta.addEventListener("pointerenter",onEnter);cta.addEventListener("pointerleave",onLeave);});
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();

    const animate=(time:number)=>{
      frame=requestAnimationFrame(animate);
      last=time;
      pointerX+=(targetX-pointerX)*.035;pointerY+=(targetY-pointerY)*.035;
      hoverEase+=(hover-hoverEase)*.045;
      const auto=reduced?0:time*.00045*(1-hoverEase);
      const travel=wheelDistance+auto;
      camera.position.z=5.5-travel;
      camera.position.x=pointerX*.48;
      camera.position.y=.15-pointerY*.28;
      camera.rotation.y=-pointerX*.055;
      camera.rotation.x=pointerY*.035;
      camera.rotation.z=-pointerX*.012;
      warm.intensity=145+Math.sin(time*.0007)*12;
      fill.intensity=35+Math.sin(time*.0009+1)*8;
      const disperse=hoverEase;
      for(let i=0;i<flowerCount;i++){
        const f=flowers[i],near=Math.max(0,1-Math.abs(f.z-camera.position.z)/8);
        const sway=reduced?0:Math.sin(time*.0011+f.phase)*.06;
        const worldX=f.x+sway+pointerX*(.1+near*.22)*-1;
        const worldZ=f.z;
        const dx=worldX-camera.position.x,dy=f.y-camera.position.y,dz=worldZ-camera.position.z;
        const distance=Math.sqrt(dx*dx+dy*dy+dz*dz);
        const repel=distance<2.5?(1-distance/2.5)*.75:0;
        const scale=f.scale*(.65+Math.min(1,Math.max(0,(12-distance)/10))*.5);
        for(let k=0;k<5;k++){
          const a=k*Math.PI*2/5;
          flowerDummy.position.set(worldX+Math.cos(a)*(.13*scale+repel*.35),f.y+Math.sin(a)*.13*scale+repel*.18,worldZ+disperse*Math.sin(time*.001+f.phase)*.8);
          flowerDummy.rotation.set(0,-a+sway,disperse* Math.sin(time*.001+f.phase)*.8);
          flowerDummy.scale.setScalar(scale*(1+disperse*.6));flowerDummy.updateMatrix();petals.setMatrixAt(i*5+k,flowerDummy.matrix);
        }
        flowerDummy.position.set(worldX+repel*.2,f.y+repel*.1,worldZ);
        flowerDummy.scale.setScalar(scale*(1+disperse*.5));flowerDummy.updateMatrix();centers.setMatrixAt(i,flowerDummy.matrix);
      }
      petals.instanceMatrix.needsUpdate=true;centers.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;
      if(!reduced){dust.rotation.y=Math.sin(time*.00012)*.04;dust.position.y=Math.sin(time*.0003)*.08;}
      renderer.render(scene,camera);
    };
    if(!reduced)frame=requestAnimationFrame(animate);else renderer.render(scene,camera);
    return ()=>{
      cancelAnimationFrame(frame);observer.disconnect();
      window.removeEventListener("pointermove",onPointer);window.removeEventListener("wheel",onWheel);\n      window.removeEventListener("touchstart",onTouchStart);\n      window.removeEventListener("touchmove",onTouchMove);
      ctas.forEach((cta)=>{cta.removeEventListener("pointerenter",onEnter);cta.removeEventListener("pointerleave",onLeave);});
      scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});
      renderer.dispose();renderer.domElement.remove();
    };
  },[]);

  return <div ref={hostRef} className="fern-cave-scene" aria-hidden="true" />;
}
