import subprocess, os
FONT=os.path.abspath('fonts/BlackHanSans.ttf')
W,H,FPS=1080,1920,30
Y='0xFFE23A'; WH='white'
# (src, ss, dur_src, speed, zoom_from, zoom_to, [(text,size,color,y)])
SEGS=[
 ('IMG_0765',0.0,2.8,1.0,1.00,1.07,[('탕수육 + 짬뽕',124,Y,1230),('탕짬면 10,000원',92,WH,1390)]),
 ('IMG_0768',0.3,2.4,1.0,1.00,1.07,[('소스 듬뿍',130,Y,1240),('바삭한 탕수육',122,WH,1400)]),
 ('IMG_0766',0.0,3.0,1.0,1.08,1.00,[('얼큰한',130,Y,1240),('짬뽕 국물',130,WH,1400)]),
 ('IMG_0767',0.2,1.4,1.0,1.00,1.06,[('쫄깃한 면발',128,Y,1240),('들어올리면~',122,WH,1400)]),
 ('IMG_0767',1.6,1.5,0.5,1.06,1.12,[('쭈우욱~',160,Y,1320)]),
 ('IMG_0768',3.2,3.3,1.0,1.00,1.07,[('한입에 쏙!',140,Y,1230),('군침 도는 비주얼',96,WH,1400)]),
 ('IMG_0767',3.6,2.8,1.0,1.00,1.05,[('뽕박사',170,Y,520),('경기 수원시 영통구',88,WH,790),('영통로 277-18 1층',88,WH,905),
   ('망포역 6번 출구 766m',88,WH,1040),('매일 10:30 ~ 21:30',88,WH,1145),('탕짬면 10,000원',100,Y,1310)],True),
]
outs=[]; t0=0.0; draw=[]
for i,seg in enumerate(SEGS):
    src,ss,d,sp,z0,z1,caps=seg[:7]; dim=len(seg)>7
    od=d/sp; n=round(od*FPS)
    z=f"({z0}+({z1}-{z0})*t/{od:.3f})"
    vf=(f"trim=start={ss}:duration={d},setpts=(PTS-STARTPTS)/{sp},fps={FPS},"
        f"scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame,crop={W}:{H},setsar=1"+(",eq=brightness=-0.32:saturation=0.85" if dim else "")+",format=yuv420p")
    o=f'seg/s{i}.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-i',f'raw/{src}.MOV','-an','-vf',vf,'-frames:v',str(n),
        '-c:v','libx264','-crf','14','-preset','fast','-r',str(FPS),o],check=True)
    a,b=t0+0.12,t0+od-0.08
    for j,(tx,sz,col,y) in enumerate(caps):
        f=f'cap/c{i}_{j}.txt'; open(f,'w').write(tx)
        al=f"if(lt(t,{a+0.15:.2f}),(t-{a:.2f})/0.15,if(gt(t,{b-0.12:.2f}),({b:.2f}-t)/0.12,1))"
        draw.append(f"drawtext=fontfile={FONT}:textfile={f}:fontsize={sz}:fontcolor={col}:borderw=11:bordercolor=black:"
                    f"shadowx=4:shadowy=5:shadowcolor=black@0.6:x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})':alpha='{al}'")
    outs.append(o); t0+=od
end=t0-SEGS[-1][2]
open('cap/tag.txt','w').write('수원 영통 맛집 뽕박사')
draw.append(f"drawtext=fontfile={FONT}:textfile=cap/tag.txt:fontsize=72:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=26:x=(w-text_w)/2:y=190:enable='between(t,0.1,{end-0.1:.2f})'")
print('total',t0)
open('list.txt','w').write(''.join(f"file '{o}'\n" for o in outs))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-i','list.txt','-f','lavfi','-i','anullsrc=r=44100:cl=stereo',
    '-vf',','.join(draw),'-shortest','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','128k','-movflags','+faststart','out.mp4'],check=True)
