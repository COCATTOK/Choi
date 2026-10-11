import subprocess, os
FONT=os.path.abspath('fonts/BlackHanSans.ttf')
W,H,FPS=1080,1920,30
Y='0xFFE23A'; WH='white'
# (src, ss, dur_src, speed, zoom_from, zoom_to, [(text,size,color,y)])
SEGS=[
 ('IMG_0765',0.0,2.8,1.0,1.00,1.07,[('탕수육 + 짬뽕',118,Y,1180),('한 번에 즐기는 반반 구성',58,WH,1330)]),
 ('IMG_0768',0.3,2.4,1.0,1.00,1.07,[('소스 듬뿍',92,Y,1200),('바삭한 탕수육',92,WH,1320)]),
 ('IMG_0766',0.0,3.0,1.0,1.08,1.00,[('얼큰한',92,Y,1200),('짬뽕 국물',92,WH,1320)]),
 ('IMG_0767',0.2,1.4,1.0,1.00,1.06,[('쫄깃한 면발',92,Y,1200),('들어올리면~',92,WH,1320)]),
 ('IMG_0767',1.6,1.5,0.5,1.06,1.12,[('쭈우욱~',120,Y,1250)]),
 ('IMG_0768',3.2,3.3,1.0,1.00,1.07,[('한입에 쏙!',110,Y,1200),('먹고 싶어지는 비주얼',62,WH,1350)]),
]
outs=[]; t0=0.0; draw=[]
for i,(src,ss,d,sp,z0,z1,caps) in enumerate(SEGS):
    od=d/sp; n=round(od*FPS)
    z=f"({z0}+({z1}-{z0})*t/{od:.3f})"
    vf=(f"trim=start={ss}:duration={d},setpts=(PTS-STARTPTS)/{sp},fps={FPS},"
        f"scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame,crop={W}:{H},setsar=1,format=yuv420p")
    o=f'seg/s{i}.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-i',f'raw/{src}.MOV','-an','-vf',vf,'-frames:v',str(n),
        '-c:v','libx264','-crf','14','-preset','fast','-r',str(FPS),o],check=True)
    a,b=t0+0.12,t0+od-0.08
    for j,(tx,sz,col,y) in enumerate(caps):
        f=f'cap/c{i}_{j}.txt'; open(f,'w').write(tx)
        al=f"if(lt(t,{a+0.15:.2f}),(t-{a:.2f})/0.15,if(gt(t,{b-0.12:.2f}),({b:.2f}-t)/0.12,1))"
        draw.append(f"drawtext=fontfile={FONT}:textfile={f}:fontsize={sz}:fontcolor={col}:borderw=8:bordercolor=black:"
                    f"shadowx=3:shadowy=4:shadowcolor=black@0.6:x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})':alpha='{al}'")
    outs.append(o); t0+=od
print('total',t0)
open('list.txt','w').write(''.join(f"file '{o}'\n" for o in outs))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-i','list.txt','-f','lavfi','-i','anullsrc=r=44100:cl=stereo',
    '-vf',','.join(draw),'-shortest','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','128k','-movflags','+faststart','out.mp4'],check=True)
