import subprocess, os
FONT=os.path.abspath('fonts/BlackHanSans.ttf')
W,H,FPS=1080,1920,30
Y='0xFFE23A'; WH='white'
# (src, ss, dur_src, speed, zoom_from, zoom_to, [(text,size,color,y)])
SEGS=[
 ('IMG_0919',3.8,2.4,1.0,1.00,1.07,[('푸짐한 건더기',124,Y,1240),('한가득!',130,WH,1400)]),
 ('IMG_0917',0.2,2.2,1.0,1.00,1.06,[('뽀얀 국물',130,Y,1240),('한 그릇',130,WH,1400)]),
 ('IMG_0923',1.2,1.2,0.5,1.00,1.08,[('큼직한',130,Y,1240),('고기 한 점',130,WH,1400)]),
 ('IMG_0920',1.0,2.4,1.0,1.00,1.06,[('밥 한 숟갈',130,Y,1240),('푹 떠서~',130,WH,1400)]),
 ('IMG_0922',1.3,2.2,1.0,1.06,1.00,[('깍두기 얹어',124,Y,1240),('한입에',130,WH,1400)]),
 ('IMG_0921',0.3,2.2,1.0,1.00,1.06,[('김치 깍두기',124,Y,1240),('코너',130,WH,1400)]),
 ('IMG_0919',6.5,2.6,1.0,1.00,1.07,[('한입에 쏙!',140,Y,1240),('든든한 한 끼',110,WH,1410)]),
]
outs=[]; t0=0.0; draw=[]
for i,seg in enumerate(SEGS):
    src,ss,d,sp,z0,z1,caps=seg[:7]; dim=len(seg)>7
    od=d/sp; n=round(od*FPS)
    z=f"({z0}+({z1}-{z0})*t/{od:.3f})"
    vf=(f"trim=start={ss}:duration={d},setpts=(PTS-STARTPTS)/{sp},fps={FPS},"
        f"scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame,crop={W}:{H},setsar=1"+(",eq=brightness=-0.32:saturation=0.85" if dim else "")+",format=yuv420p")
    o=f'seg/m{i}.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-i',f'raw3/{src}.MOV','-an','-vf',vf,'-frames:v',str(n),
        '-c:v','libx264','-crf','14','-preset','fast','-r',str(FPS),o],check=True)
    a,b=t0+0.12,t0+od-0.08
    for j,(tx,sz,col,y) in enumerate(caps):
        f=f'cap/c{i}_{j}.txt'; open(f,'w').write(tx)
        al=f"if(lt(t,{a+0.15:.2f}),(t-{a:.2f})/0.15,if(gt(t,{b-0.12:.2f}),({b:.2f}-t)/0.12,1))"
        draw.append(f"drawtext=fontfile={FONT}:textfile={f}:fontsize={sz}:fontcolor={col}:borderw=11:bordercolor=black:"
                    f"shadowx=4:shadowy=5:shadowcolor=black@0.6:x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})':alpha='{al}'")
    outs.append(o); t0+=od
print('total',t0)
open('list3.txt','w').write(''.join(f"file '{o}'\n" for o in outs))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-i','list3.txt','-f','lavfi','-i','anullsrc=r=44100:cl=stereo',
    '-vf',','.join(draw),'-shortest','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','128k','-movflags','+faststart','out3.mp4'],check=True)
