"""Turns the voice catalogue (voice_catalog.py) into one vertical video: a card per voice with its number, name,
measured pitch and a live waveform, the clip playing over it.
Usage: python3 voice_catalog_video.py <clips_dir> <out.mp4>
"""
import json
import os
import subprocess
import sys
import tempfile

clips, out = sys.argv[1], sys.argv[2]
fonts = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts")
FX, FS = f"{fonts}/Montserrat-800.ttf", f"{fonts}/Montserrat-600.ttf"
cat = json.load(open(f"{clips}/catalog.json"))


def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode())


with tempfile.TemporaryDirectory() as d:
    segs = []
    for e in cat["entries"]:
        wav = f"{clips}/{e['n']:02d}.wav"
        norm = f"{d}/{e['n']:02d}.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "2", norm], check=True)
        D = dur(norm) + 1.3
        texts = {"head": "CATALOGUE DES VOIX", "num": f"{e['n']:02d}", "name": e["name"], "desc": f"{e['desc']}  ·  ≈ {e['f0']} Hz" if e.get("f0") else e["desc"],
                 "line1": "« Tu enverrais 450 volts à un inconnu…", "line2": "juste parce qu'on te le demande ? »", "foot": f"{e['n']} / {len(cat['entries'])}"}
        for k, v in texts.items():
            open(f"{d}/{k}.txt", "w").write(v)
        dt = lambda k, font, size, color, y: f"drawtext=fontfile={font}:textfile={d}/{k}.txt:fontsize={size}:fontcolor={color}:x=(w-text_w)/2:y={y}"
        vf = ",".join([
            dt("head", FX, 40, "0xFFFFFF@0.55", 230), dt("num", FX, 300, "0xFFC93C", 420), dt("name", FX, 64, "white", 820),
            dt("desc", FS, 44, "0xFFFFFF@0.75", 920), dt("line1", FS, 44, "0xFFFFFF@0.9", 1500), dt("line2", FS, 44, "0xFFFFFF@0.9", 1565),
            dt("foot", FS, 34, "0xFFFFFF@0.45", 1760)])
        seg = f"{d}/seg{e['n']:02d}.mp4"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"color=c=0x0D0F17:s=1080x1920:d={D:.2f}:r=30", "-i", norm,
                        "-filter_complex", f"[1]adelay=500|500,apad,atrim=0:{D:.2f}[a];[a]asplit[a1][a2];[a2]showwaves=s=900x260:mode=cline:rate=30:colors=white,format=rgba,colorchannelmixer=rr=1:gg=0.79:bb=0.24[wv];"
                        f"[0]{vf}[bg];[bg][wv]overlay=(W-w)/2:1120[v]",
                        "-map", "[v]", "-map", "[a1]", "-t", f"{D:.2f}", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "160k", "-ar", "44100", seg], check=True)
        segs.append(seg)
        print(e["n"], e["name"], f"{D:.1f}s", flush=True)
    lst = f"{d}/list.txt"
    open(lst, "w").write("\n".join(f"file '{s}'" for s in segs))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out], check=True)
print("done ->", out)
