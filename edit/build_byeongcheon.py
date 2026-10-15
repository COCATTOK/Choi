import subprocess, os
FONT=os.path.abspath('fonts/BlackHanSans.ttf')
W,H,FPS=1080,1920,30
Y='0xFFE23A'; WH='white'
# (src, ss, dur_src, speed, zoom_from, zoom_to, [(text,size,color,y)])
SEGS=[
 ('IMG_0919',3.8,2.4,1.0,1.00,1.07,[('순대국밥',140,Y,1240),('10,000원',110,WH,1400)]),
 ('IMG_0917',0.2,2.2,1.0,1.00,1.06,[('뽀얀 국물',130,Y,1240),('한 그릇',130,WH,1400)]),
 ('IMG_0923',1.2,1.2,0.5,1.00,1.08,[('큼직한',130,Y,1240),('고기 한 점',130,WH,1400)]),
 ('IMG_0920',1.0,2.4,1.0,1.00,1.06,[('밥 한 숟갈',130,Y,1240),('푹 떠서~',130,WH,1400)]),
 ('IMG_0922',1.3,2.2,1.0,1.06,1.00,[('깍두기 얹어',124,Y,1240),('한입에',130,WH,1400)]),
 ('IMG_0921',0.3,2.2,1.0,1.00,1.06,[('김치 깍두기',124,Y,1240),('코너',130,WH,1400)]),
 ('IMG_0919',6.5,2.6,1.0,1.00,1.07,[('한입에 쏙!',140,Y,1240),('든든한 한 끼',110,WH,1410)]),
 ('IMG_0916',0.0,2.3,1.0,1.00,1.05,[('병천순대',150,Y,380),('영통구청점',88,WH,560),('경기 수원시 영통구',80,WH,700),
   ('매탄로 102',80,WH,795),('이삭프라자 110호',80,WH,890),('매탄권선역',76,WH,1020),('4번 출구에서 826m',76,WH,1115),
   ('라스트오더 21:30',70,WH,1230),('순대국밥 10,000원',92,Y,1370)],True),
]
outs=[]; t0=0.0; draw=[]
for i,seg in enumerate(SEGS):
    src,ss,d,sp,z0,z1,caps=seg[:7]; dim=len(seg)>7
    od=d/sp; n=round(od*FPS)
    z=f"({z0}+({z1}-{z0})*t/{od:.3f})"
    vf=(f"trim=start={ss}:duration={d},setpts=(PTS-STARTPTS)/{sp},fps={FPS},"
        f"scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame,crop={W}:{H},setsar=1"+(",eq=brightness=-0.32:saturation=0.85" if dim else "")+",format=yuv420p")
    o=f'seg/b{i}.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-i',f'raw3/{src}.MOV','-an','-vf',vf,'-frames:v',str(n),
        '-c:v','libx264','-crf','14','-preset','fast','-r',str(FPS),o],check=True)
    a,b=t0+0.12,t0+od-0.08
    for j,(tx,sz,col,y) in enumerate(caps):
        f=f'cap/c{i}_{j}.txt'; open(f,'w').write(tx)
        al=f"if(lt(t,{a+0.15:.2f}),(t-{a:.2f})/0.15,if(gt(t,{b-0.12:.2f}),({b:.2f}-t)/0.12,1))"
        draw.append(f"drawtext=fontfile={FONT}:textfile={f}:fontsize={sz}:fontcolor={col}:borderw=11:bordercolor=black:"
                    f"shadowx=4:shadowy=5:shadowcolor=black@0.6:x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})':alpha='{al}'")
    outs.append(o); t0+=od
end=t0-SEGS[-1][2]
open('cap/tag.txt','w').write('수원 영통 병천순대')
draw.append(f"drawtext=fontfile={FONT}:textfile=cap/tag.txt:fontsize=72:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=26:x=(w-text_w)/2:y=190:enable='between(t,0.1,{end-0.1:.2f})'")
print('total',t0)
open('list4.txt','w').write(''.join(f"file '{o}'\n" for o in outs))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-i','list4.txt','-f','lavfi','-i','anullsrc=r=44100:cl=stereo',
    '-vf',','.join(draw),'-shortest','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','128k','-movflags','+faststart','out4.mp4'],check=True)
