"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

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
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: "high-performance" }); }
    catch { host.style.backgroundImage = "url('/fern-cave.webp')"; host.style.backgroundSize = "cover"; host.style.backgroundPosition = "center"; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "fern-cave-webgl";
    renderer.domElement.setAttribute("aria-hidden","true");
    host.appendChild(renderer.domElement);
    const composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),mobile?.42:.68,.45,.82));

    const ambient = new THREE.HemisphereLight(0x9a8c83, 0x17100b, 1.05);
    scene.add(ambient);
    const warm = new THREE.PointLight(0xffd49a, 150, 44, 1.8);
    warm.position.set(0, 5.5, -31); scene.add(warm);
    const fill = new THREE.PointLight(0xe89aaf, 36, 25, 2);
    fill.position.set(-5, 1.4, -16); scene.add(fill);
    const rim = new THREE.PointLight(0xf2b76f, 65, 35, 2);
    rim.position.set(5, 3.2, -48); scene.add(rim);
    const keyLight=new THREE.DirectionalLight(0xffd9aa,mobile?1.2:2.1);
    keyLight.position.set(-2,8,-24);keyLight.castShadow=!mobile;
    keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.near=.5;keyLight.shadow.camera.far=38;
    keyLight.shadow.camera.left=-12;keyLight.shadow.camera.right=12;keyLight.shadow.camera.top=12;keyLight.shadow.camera.bottom=-8;
    scene.add(keyLight);

    // A curved, segmented rock tunnel: a real navigable environment, not a flat image.
    const rockMat = new THREE.MeshStandardMaterial({ color:0x30251e, roughness:.96, metalness:0, side:THREE.DoubleSide });
    const rockDark = new THREE.MeshStandardMaterial({ color:0x17120f, roughness:1 });
    const rockGeo = new THREE.BufferGeometry();
    const verts:number[] = [], indices:number[] = [];
    const rings=58, around=48, length=100;
    for(let j=0;j<=rings;j++){
      const z=8-(j/rings)*length;
      for(let i=0;i<=around;i++){
        const a=(i/around)*Math.PI;
        const noise=Math.sin(j*1.7+i*.7)*.32+Math.cos(j*.8+i*1.9)*.2+Math.sin(j*.17+i*.23)*.38;
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
    rockInstances.castShadow=!mobile;rockInstances.receiveShadow=true;
    const dummy=new THREE.Object3D();
    for(let i=0;i<(mobile?95:180);i++){
      const side=i%2?1:-1, z=7-Math.random()*94, x=side*(5.4+Math.random()*2.8);
      dummy.position.set(x,-1.1+Math.random()*1.4,z);
      dummy.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
      const s=.3+Math.random()*1.5; dummy.scale.set(s*1.2,s,s); dummy.updateMatrix(); rockInstances.setMatrixAt(i,dummy.matrix);
    }
    scene.add(rockInstances);
    const stalactiteGeo=new THREE.ConeGeometry(.2,.95,6);
    const stalactites=new THREE.InstancedMesh(stalactiteGeo,rockMat,mobile?36:72);
    for(let i=0;i<(mobile?36:72);i++){
      const x=(Math.random()-.5)*14,z=6-Math.random()*92;
      const ceilingY=Math.sqrt(Math.max(.5,1-(x*x)/(9.1*9.1)))*6.3-1.15;
      dummy.position.set(x,ceilingY-.42,z);dummy.rotation.set(0,0,Math.PI+(Math.random()-.5)*.16);
      const scale=.45+Math.random()*1.15;dummy.scale.set(scale,scale,scale);dummy.updateMatrix();stalactites.setMatrixAt(i,dummy.matrix);
    }
    stalactites.castShadow=!mobile;scene.add(stalactites);

    // A photograph-backed distant opening keeps the supplied reference image in the scene.
    const loader=new THREE.TextureLoader();
    loader.load("/fern-cave.webp",(texture)=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      const plate=new THREE.Mesh(new THREE.PlaneGeometry(100,56),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide}));
      plate.position.set(0,4,-102); scene.add(plate);
    },undefined,()=>{host.style.backgroundImage="url('/fern-cave.webp')";host.style.backgroundSize="cover";host.style.backgroundPosition="center";});

    // Hundreds of instanced blossoms. Petals and centers sway and react to cursor proximity.
    const flowerCount=mobile?210:560;
    const flowers:Flower[]=[];
    const petalGeo=new THREE.SphereGeometry(.105,7,6); petalGeo.scale(1,.55,1.65);
    const petalMat=new THREE.MeshStandardMaterial({color:0xd887a1,emissive:0x6f203e,emissiveIntensity:.48,roughness:.7});
    const petals=new THREE.InstancedMesh(petalGeo,petalMat,flowerCount*5);
    const centerGeo=new THREE.SphereGeometry(.065,7,6);
    const centerMat=new THREE.MeshStandardMaterial({color:0xffdca0,emissive:0xd18b37,emissiveIntensity:1.5});
    const centers=new THREE.InstancedMesh(centerGeo,centerMat,flowerCount);
    const stemGeo=new THREE.CylinderGeometry(.018,.035,.42,5);
    const stemMat=new THREE.MeshStandardMaterial({color:0x40583a,roughness:.95});
    const stems=new THREE.InstancedMesh(stemGeo,stemMat,flowerCount);
    const leafGeo=new THREE.SphereGeometry(.13,6,5); leafGeo.scale(.45,.12,1.7);
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
      flowerDummy.position.set(x,y,z); flowerDummy.scale.setScalar(scale); flowerDummy.updateMatrix(); centers.setMatrixAt(i,flowerDummy.matrix);
      flowerDummy.position.set(x,y-.22*scale,z);flowerDummy.scale.setScalar(scale);flowerDummy.updateMatrix();stems.setMatrixAt(i,flowerDummy.matrix);
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
    const lightBeams=new THREE.Group();
    for(let i=0;i<3;i++){
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(0,2.4+i*.55,14,20,1,true),new THREE.MeshBasicMaterial({color:0xffd69c,transparent:true,opacity:.055-i*.009,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
      beam.position.set((i-1)*2.1,3.4,-27-i*7);beam.rotation.z=(i-1)*-.07;lightBeams.add(beam);
    }
    scene.add(lightBeams);

    let pointerX=0,pointerY=0,targetX=0,targetY=0,wheelDistance=0,hover=0,hoverEase=0,frame=0,last=0,touchY=0;
    const onPointer=(e:PointerEvent)=>{targetX=(e.clientX/innerWidth-.5)*2;targetY=(e.clientY/innerHeight-.5)*2;};
    const onWheel=(e:WheelEvent)=>{wheelDistance=Math.min(58,Math.max(-4,wheelDistance+e.deltaY*.012));};
    const onTouchStart=(e:TouchEvent)=>{touchY=e.touches[0]?.clientY??0;};
    const onTouchMove=(e:TouchEvent)=>{const y=e.touches[0]?.clientY??touchY;wheelDistance=Math.min(58,Math.max(-4,wheelDistance+(touchY-y)*.11));touchY=y;};
    const onEnter=()=>{hover=1;}; const onLeave=()=>{hover=0;};
    window.addEventListener("pointermove",onPointer,{passive:true});
    window.addEventListener("wheel",onWheel,{passive:true});
    window.addEventListener("touchstart",onTouchStart,{passive:true});
    window.addEventListener("touchmove",onTouchMove,{passive:true});
    const ctas=Array.from(document.querySelectorAll(".hero-actions .primary-link,.ws-send-payment-btn,.ws-connect-btn"));
    ctas.forEach((cta)=>{cta.addEventListener("pointerenter",onEnter);cta.addEventListener("pointerleave",onLeave);});
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();

    const animate=(time:number)=>{
      frame=requestAnimationFrame(animate);
      last=time;
      pointerX+=(targetX-pointerX)*.035;pointerY+=(targetY-pointerY)*.035;
      hoverEase+=(hover-hoverEase)*.045;
      const auto=reduced?0:Math.min(58,time*.00045)*(1-hoverEase);
      const travel=Math.min(58,Math.max(-4,wheelDistance+auto));
      camera.position.z=5.5-travel;
      camera.position.x=Math.sin(travel*.045)*1.2+pointerX*.48;
      camera.position.y=.15+Math.sin(travel*.08)*.12-pointerY*.28;
      camera.rotation.y=Math.cos(travel*.045)*.025-pointerX*.055;
      camera.rotation.x=pointerY*.035;
      camera.rotation.z=-pointerX*.012;
      warm.intensity=145+Math.sin(time*.0007)*12;
      lightBeams.children.forEach((object,i)=>{const beam=object as THREE.Mesh;beam.rotation.y=Math.sin(time*.00022+i)*.035;const material=beam.material as THREE.MeshBasicMaterial;material.opacity=.045+Math.sin(time*.0005+i)*.012;});
      fill.intensity=35+Math.sin(time*.0009+1)*8;
      const disperse=hoverEase;
      let cursorGlow=0;
      for(let i=0;i<flowerCount;i++){
        const f=flowers[i],near=Math.max(0,1-Math.abs(f.z-camera.position.z)/8);
        const sway=reduced?0:Math.sin(time*.0011+f.phase)*.06;
        let worldX=f.x+sway+pointerX*(.1+near*.22)*-1;
        const worldZ=f.z;
        const projected=new THREE.Vector3(worldX,f.y,worldZ).project(camera);
        const screenX=(projected.x*.5+.5)*host.clientWidth;
        const screenY=(-projected.y*.5+.5)*host.clientHeight;
        const cursorDX=screenX-(targetX*.5+.5)*host.clientWidth;
        const cursorDY=screenY-(targetY*.5+.5)*host.clientHeight;
        const cursorDistance=Math.hypot(cursorDX,cursorDY);
        const cursorPush=Math.max(0,1-cursorDistance/165)*.65;
        cursorGlow=Math.max(cursorGlow,cursorPush);
        worldX+=(cursorDX/Math.max(1,host.clientWidth))*cursorPush*2.8;
        const worldY=f.y+(cursorDY/Math.max(1,host.clientHeight))*cursorPush*1.8;
        const dx=worldX-camera.position.x,dy=f.y-camera.position.y,dz=worldZ-camera.position.z;
        const distance=Math.sqrt(dx*dx+dy*dy+dz*dz);
        const repel=distance<2.5?(1-distance/2.5)*.75:0;
        const scale=f.scale*(.65+Math.min(1,Math.max(0,(12-distance)/10))*.5);
        const flowerZ=worldZ+disperse*Math.sin(time*.001+f.phase)*.8;
        for(let k=0;k<5;k++){
          const a=k*Math.PI*2/5;
          flowerDummy.position.set(worldX+Math.cos(a)*(.13*scale+repel*.35),worldY+Math.sin(a)*.13*scale+repel*.18,flowerZ);
          flowerDummy.rotation.set(0,-a+sway,disperse* Math.sin(time*.001+f.phase)*.8);
          flowerDummy.scale.setScalar(scale*(1+disperse*.6));flowerDummy.updateMatrix();petals.setMatrixAt(i*5+k,flowerDummy.matrix);
        }
        flowerDummy.position.set(worldX+repel*.2,worldY+repel*.1,flowerZ);
        flowerDummy.scale.setScalar(scale*(1+disperse*.5));flowerDummy.updateMatrix();centers.setMatrixAt(i,flowerDummy.matrix);
        // Keep stems and leaves attached as the blossoms sway and disperse.
        const stemLength=Math.max(.08,worldY+1.18);
        flowerDummy.position.set(worldX,(worldY-1.18)*.5,flowerZ);
        flowerDummy.rotation.set(0,sway,disperse*Math.sin(time*.001+f.phase)*.35);
        flowerDummy.scale.set(scale,stemLength/.42,scale);flowerDummy.updateMatrix();stems.setMatrixAt(i,flowerDummy.matrix);
        for(let k=0;k<2;k++){
          flowerDummy.position.set(worldX+f.side*(.18+k*.13),worldY-.12,flowerZ+.12-k*.18);
          flowerDummy.rotation.set(.2,f.side*.5+k*.5+sway,.5*f.side+disperse*.3);
          flowerDummy.scale.setScalar(scale);flowerDummy.updateMatrix();leaves.setMatrixAt(i*2+k,flowerDummy.matrix);
        }
      }
      petals.instanceMatrix.needsUpdate=true;centers.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;leaves.instanceMatrix.needsUpdate=true;
      petalMat.emissiveIntensity=.48+cursorGlow*.9;centerMat.emissiveIntensity=1.5+cursorGlow*2;
      if(!reduced){dust.rotation.y=Math.sin(time*.00012)*.04;dust.position.y=Math.sin(time*.0003)*.08;}
      composer.render();
    };
    if(!reduced)frame=requestAnimationFrame(animate);else composer.render();
    return ()=>{
      cancelAnimationFrame(frame);observer.disconnect();
      window.removeEventListener("pointermove",onPointer);window.removeEventListener("wheel",onWheel);
      window.removeEventListener("touchstart",onTouchStart);
      window.removeEventListener("touchmove",onTouchMove);
      ctas.forEach((cta)=>{cta.removeEventListener("pointerenter",onEnter);cta.removeEventListener("pointerleave",onLeave);});
      scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points){const renderable=object as THREE.Mesh|THREE.Points;renderable.geometry.dispose();const materials=Array.isArray(renderable.material)?renderable.material:[renderable.material];materials.forEach(material=>{const textured=material as THREE.Material & {map?:THREE.Texture};textured.map?.dispose();material.dispose();});}});
      composer.dispose();renderer.dispose();renderer.domElement.remove();
    };
  },[]);

  return <div ref={hostRef} className="fern-cave-scene" aria-hidden="true" />;
}
