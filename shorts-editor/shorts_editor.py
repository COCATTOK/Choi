#!/usr/bin/env python3
"""맛집 쇼츠/릴스 자동 편집기.

영상만 넣으면 → 베스트 장면 자동 선별 → 9:16 변환 → 푸드 보정 → 전환 효과
→ 자막(가게명/정보/CTA) → 소리 정규화(+BGM) 까지 한 번에 처리합니다.
필요한 것: Python 3.8+, ffmpeg (추가 pip 설치 없음)
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unicodedata

W, H, FPS = 1080, 1920, 30
VIDEO_EXT = (".mp4", ".mov", ".m4v", ".mkv", ".avi", ".webm", ".mts", ".3gp")

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumSquareRoundEB.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "C:/Windows/Fonts/malgunbd.ttf",
    "C:/Windows/Fonts/malgun.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]


def run(cmd, capture=False):
    r = subprocess.run(cmd, stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                       stderr=subprocess.PIPE, text=True)
    if r.returncode != 0:
        sys.exit("ffmpeg 오류:\n" + " ".join(cmd[:6]) + " ...\n" + r.stderr[-1500:])
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams",
               "-show_format", path], capture=True)
    j = json.loads(out)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    if not v:
        return None
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    rot = int(v.get("tags", {}).get("rotate", rot) or rot)
    if abs(rot) % 180 == 90:  # 세로 촬영 영상 (ffmpeg가 자동 회전하므로 크기만 교환)
        w, h = h, w
    dur = float(j["format"].get("duration") or v.get("duration") or 0)
    has_audio = any(s["codec_type"] == "audio" for s in j["streams"])
    return {"path": path, "w": w, "h": h, "dur": dur, "audio": has_audio}


def gather(inputs):
    files = []
    for p in inputs:
        if os.path.isdir(p):
            files += sorted(f for f in glob.glob(os.path.join(p, "*"))
                            if f.lower().endswith(VIDEO_EXT))
        else:
            files += sorted(glob.glob(p)) or [p]
    files = [f for f in files if os.path.isfile(f)]
    if not files:
        sys.exit("영상 파일을 찾지 못했습니다.")
    return files


# ---------------------------------------------------------------- 장면 점수화
def analyze(info, seg):
    """영상을 seg초 단위로 나눠 '맛있어 보이는' 정도를 점수화."""
    cmd = ["ffmpeg", "-v", "error", "-i", info["path"], "-vf",
           "fps=3,scale=192:-2,signalstats,metadata=print:file=-", "-an", "-f", "null", "-"]
    out = run(cmd, capture=True)
    frames, cur = [], {}
    for line in out.splitlines():
        if line.startswith("frame:"):
            if cur:
                frames.append(cur)
            cur = {"t": float(line.split("pts_time:")[1])}
        elif "signalstats." in line:
            k, v = line.split("=")
            cur[k.split(".")[-1]] = float(v)
    if cur:
        frames.append(cur)

    chunks = []
    t = 0.0
    while t + 1.0 <= info["dur"]:
        d = min(seg, info["dur"] - t)
        fs = [f for f in frames if t <= f["t"] < t + d and "SATAVG" in f]
        if fs:
            avg = lambda k: sum(f.get(k, 0) for f in fs) / len(fs)
            yavg = avg("YAVG")
            chunks.append({
                "file": info, "start": t, "dur": d,
                "sat": avg("SATAVG"),
                "motion": min(avg("YDIF"), 12.0),
                "expo": max(0.0, 1 - abs(yavg - 115) / 115),
            })
        t += d
    return chunks


def score_all(chunks):
    ms = max(c["sat"] for c in chunks) or 1
    mm = max(c["motion"] for c in chunks) or 1
    for c in chunks:
        c["score"] = 0.45 * c["sat"] / ms + 0.25 * c["motion"] / mm + 0.30 * c["expo"]


def select(files_info, target, seg, xf, hook):
    n = max(1, round((target - xf) / (seg - xf)))
    per_file = []
    for info in files_info:
        cs = analyze(info, seg)
        per_file.append(cs)
    allc = [c for cs in per_file for c in cs]
    if not allc:
        sys.exit("분석 가능한 장면이 없습니다 (영상이 너무 짧을 수 있어요).")
    score_all(allc)
    quota = -(-n // len(files_info))
    picked = []
    for cs in per_file:
        picked += sorted(cs, key=lambda c: -c["score"])[:quota]
    picked = sorted(picked, key=lambda c: -c["score"])[:n]
    best = picked[0]
    order = {id(i): k for k, i in enumerate(files_info)}
    picked.sort(key=lambda c: (order[id(c["file"])], c["start"]))
    if hook and len(picked) > 2:  # 가장 먹음직스러운 컷을 맨 앞(훅)으로
        picked.remove(best)
        picked.insert(0, best)
    return picked


# ---------------------------------------------------------------- 렌더링
GRADE = ("eq=contrast=1.08:saturation=1.28:brightness=0.02:gamma=1.04,"
         "colorbalance=rs=.04:rm=.03:bs=-.05:bm=-.03,"
         "unsharp=5:5:0.8:3:3:0.0")


def vfilter(info, fit):
    aspect = info["w"] / info["h"]
    crop = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
    if fit == "crop" or (fit == "auto" and aspect < 0.8):
        base = f"[0:v]{crop},setsar=1[bg]"
        return f"{base};[bg]{GRADE},fps={FPS},format=yuv420p[v]"
    return (f"[0:v]split[a][b];[a]{crop},boxblur=24:3,eq=brightness=-0.12[bg];"
            f"[b]scale={W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,"
            f"{GRADE},fps={FPS},format=yuv420p[v]")


def render_clip(c, out, fit, tmp):
    info, d = c["file"], c["dur"]
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{c['start']:.3f}", "-t", f"{d:.3f}",
           "-i", info["path"]]
    if info["audio"]:
        af = f"[0:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:{d:.3f}[a]"
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        af = f"[1:a]atrim=0:{d:.3f}[a]"
    cmd += ["-filter_complex", vfilter(info, fit) + ";" + af, "-map", "[v]", "-map", "[a]",
            "-t", f"{d:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k", out]
    run(cmd)


def join(clips, out, xf):
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for p in clips:
        cmd += ["-i", p]
    if len(clips) == 1:
        shutil.copy(clips[0], out)
        return
    trans = ["fade", "slideleft", "fade", "circleopen", "fade", "wipeleft"]
    parts, vlast, alast, length = [], "[0:v]", "[0:a]", None
    durs = [float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                       "-of", "csv=p=0", p], capture=True)) for p in clips]
    length = durs[0]
    for i in range(1, len(clips)):
        v, a = f"[v{i}]", f"[a{i}]"
        parts.append(f"{vlast}[{i}:v]xfade=transition={trans[(i - 1) % len(trans)]}:"
                     f"duration={xf}:offset={length - xf:.3f}{v}")
        parts.append(f"{alast}[{i}:a]acrossfade=d={xf}{a}")
        length += durs[i] - xf
        vlast, alast = v, a
    cmd += ["-filter_complex", ";".join(parts), "-map", vlast, "-map", alast,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k", out]
    run(cmd)


def wrap(text, size):
    """한글(전각)=1칸, 영문/숫자=0.55칸으로 계산해 가로폭에 맞게 줄바꿈."""
    maxw = (W - 200) / size
    lines, cur, w = [], "", 0.0
    for ch in text:
        cw = 1.0 if unicodedata.east_asian_width(ch) in "WF" else 0.55
        if w + cw > maxw and ch != " ":
            lines.append(cur)
            cur, w = "", 0.0
        cur += ch
        w += cw
    lines.append(cur)
    return "\n".join(l.strip() for l in lines if l.strip())


def find_font(user):
    if user:
        return user
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return f
    sys.exit("한글 폰트를 찾지 못했습니다. --font 로 .ttf 경로를 지정하세요.")


def finish(src, out, a, total, tmp):
    font = find_font(a.font).replace("\\", "/").replace(":", "\\:")
    layers = []  # (text, size, y, start, end)
    if a.name:
        layers.append((a.name, 92, 230, 0.2, total - 0.2))
    y = 1330
    for line in a.info or []:
        layers.append((line, 54, y, 0.9, total - 2.6))
        y += 120
    if a.cta:
        layers.append((a.cta, 70, 1480, total - 2.4, total))
    vf, prev = [], "0:v"
    for i, (text, size, ypos, t0, t1) in enumerate(layers):
        path = os.path.join(tmp, f"t{i}.txt")
        with open(path, "w", encoding="utf-8") as f:
            f.write(wrap(text, size))
        tf = path.replace("\\", "/").replace(":", "\\:")
        alpha = f"if(lt(t,{t0}+0.35),(t-{t0})/0.35,if(gt(t,{t1}-0.3),({t1}-t)/0.3,1))"
        vf.append(f"[{prev}]drawtext=fontfile='{font}':textfile='{tf}':fontsize={size}:"
                  f"fontcolor=white:borderw=4:bordercolor=black@0.85:"
                  f"box=1:boxcolor=black@0.35:boxborderw=22:line_spacing=14:"
                  f"x=(w-text_w)/2:y={ypos}:alpha='{alpha}':"
                  f"enable='between(t,{t0},{t1})'[t{i}]")
        prev = f"t{i}"
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src]
    if a.bgm:
        cmd += ["-stream_loop", "-1", "-i", a.bgm]
        orig = "volume=0" if a.mute else "volume=1.0"
        af = (f"[0:a]{orig}[o];[1:a]volume={a.bgm_vol},afade=t=in:d=1,"
              f"afade=t=out:st={total - 1.5:.2f}:d=1.5[m];"
              f"[o][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[a]")
    else:
        af = "[0:a]loudnorm=I=-14:TP=-1.5[a]"
    vf_all = ";".join(vf + [f"[{prev}]format=yuv420p[v]"])
    cmd += ["-filter_complex", vf_all + ";" + af, "-map", "[v]", "-map", "[a]",
            "-t", f"{total:.2f}", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart", out]
    run(cmd)


def main():
    p = argparse.ArgumentParser(description="맛집 쇼츠/릴스 자동 편집기")
    p.add_argument("inputs", nargs="+", help="영상 파일 또는 폴더 (여러 개 가능)")
    p.add_argument("-o", "--output", default="shorts_output.mp4")
    p.add_argument("-n", "--name", help="가게 이름 (상단 자막)")
    p.add_argument("-i", "--info", action="append",
                   help='정보 자막, 여러 번 가능 (예: -i "📍성수동" -i "시그니처 8,000원")')
    p.add_argument("--cta", default="저장해두고 가보세요!", help='마지막 문구 ("" 이면 끔)')
    p.add_argument("-t", "--target", type=float, default=20, help="목표 길이(초), 기본 20")
    p.add_argument("--seg", type=float, default=2.4, help="컷 1개 길이(초), 기본 2.4")
    p.add_argument("--xfade", type=float, default=0.25, help="전환 길이(초)")
    p.add_argument("--fit", choices=["auto", "crop", "blur"], default="auto",
                   help="가로 영상 처리: crop=꽉 채우기, blur=블러 배경")
    p.add_argument("--no-hook", action="store_true", help="베스트 컷을 맨 앞으로 옮기지 않음")
    p.add_argument("--bgm", help="배경음악 파일")
    p.add_argument("--bgm-vol", type=float, default=0.28)
    p.add_argument("--mute", action="store_true", help="BGM 사용 시 원본 소리 제거")
    p.add_argument("--font", help="자막 폰트 파일(.ttf/.otf/.ttc)")
    a = p.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"{tool} 이 필요합니다. https://ffmpeg.org 에서 설치하세요.")
    a.target = min(a.target, 90)

    files = gather(a.inputs)
    infos = [i for i in map(probe, files) if i and i["dur"] > 1]
    if not infos:
        sys.exit("사용 가능한 영상이 없습니다.")
    print(f"[1/4] 영상 {len(infos)}개 분석 중...")
    picked = select(infos, a.target, a.seg, a.xfade, not a.no_hook)

    with tempfile.TemporaryDirectory() as tmp:
        print(f"[2/4] 베스트 장면 {len(picked)}컷 변환/보정 중...")
        parts = []
        for k, c in enumerate(picked):
            o = os.path.join(tmp, f"c{k:02d}.mp4")
            render_clip(c, o, a.fit, tmp)
            parts.append(o)
        print("[3/4] 전환 효과 적용 중...")
        joined = os.path.join(tmp, "joined.mp4")
        join(parts, joined, a.xfade)
        total = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                           "-of", "csv=p=0", joined], capture=True))
        print("[4/4] 자막/사운드 마무리 중...")
        finish(joined, a.output, a, total, tmp)
    print(f"완료! → {a.output} ({total:.1f}초, {W}x{H})")


if __name__ == "__main__":
    main()
