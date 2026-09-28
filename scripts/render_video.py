#!/usr/bin/env python3
"""
视频渲染封装 - 绕过 video_render 工具的缓存 bug

Bug 原因：video_render 工具用 HTML 内容 hash 做缓存 key，不按文件路径区分项目，
导致不同项目互相覆盖缓存。

Fix：用 HTML 文件的绝对路径生成唯一的 video_raw.mp4 路径，
确保每次渲染都落到正确位置，不走工具缓存。
"""

import sys
import os
import hashlib
import subprocess
import json
import shutil
import time
import argparse

def get_chrome_path():
    """查找 Chrome/Chromium 路径"""
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        os.path.expanduser("~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    # 尝试从 Playwright 获取
    try:
        result = subprocess.run(
            ["python3", "-c", "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); b = p.chromium.launch(); print(b.browser_type.executable_path); b.close(); p.stop()"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    return None

def render_html_to_video(html_path, preset="horizontal-16:9", allow_overwrite=False, audio_path=None):
    """
    用 ffmpeg + Chrome 将 HTML 渲染为 MP4
    """
    html_path = os.path.abspath(html_path)
    html_dir = os.path.dirname(html_path)

    # 用 HTML 绝对路径做 hash，生成唯一的 video 文件名
    # 这样不同项目绝不会互相覆盖
    path_hash = hashlib.md5(html_path.encode()).hexdigest()[:8]
    video_raw = os.path.join(html_dir, f"video_raw_{path_hash}.mp4")
    final_path = os.path.join(html_dir, f"final_{preset}_{path_hash}.mp4")

    if not allow_overwrite and os.path.exists(video_raw):
        os.remove(video_raw)

    chrome_path = get_chrome_path()
    if not chrome_path:
        raise RuntimeError("找不到 Chrome/Chromium，无法渲染 HTML 视频")

    # 从 HTML 提取总时长
    total_duration = None
    try:
        with open(html_path, 'r') as f:
            content = f.read()
        import re
        m = re.search(r'window\._totalDuration\s*=\s*([\d.]+)', content)
        if m:
            total_duration = float(m.group(1))
            print(f"检测到视频时长: {total_duration}s")
    except Exception as e:
        print(f"提取时长失败: {e}")

    if total_duration is None:
        total_duration = 60.0  # fallback

    # preset 尺寸映射
    preset_configs = {
        "horizontal-16:9": {"width": 1920, "height": 1080},
        "vertical-9:16":   {"width": 1080, "height": 1920},
        "square-1:1":      {"width": 1080, "height": 1080},
        "horizontal-4:3":  {"width": 1440, "height": 1080},
        "vertical-4:3":    {"width": 1080, "height": 1440},
    }
    cfg = preset_configs.get(preset, preset_configs["horizontal-16:9"])
    width, height = cfg["width"], cfg["height"]

    # 启动 Chrome DevTools Protocol 录制
    import socket
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    import threading

    # 找可用端口
    with socket.socket() as s:
        s.bind(('', 0))
        cdp_port = s.getsockname()[1]

    # 启动本地 HTTP 服务器（让 Chrome 能加载 HTML）
    os.chdir(html_dir)
    server_port = 18080
    server = HTTPServer(('127.0.0.1', server_port), SimpleHTTPRequestHandler)
    server_thread = threading.Thread(target=server.handle_request)
    server_thread.start()

    # 启动 Chrome 进行渲染
    chrome_data_dir = f"/tmp/chrome_render_{os.getpid()}"
    os.makedirs(chrome_data_dir, exist_ok=True)

    cdp_url = f"http://127.0.0.1:{server_port}/{os.path.basename(html_path)}"

    chrome_cmd = [
        chrome_path,
        f"--headless=new",
        f"--disable-gpu",
        f"--no-sandbox",
        f"--remote-debugging-port={cdp_port}",
        f"--user-data-dir={chrome_data_dir}",
        "--autoplay-policy=no-user-gesture-required",
        cdp_url,
    ]

    print(f"启动 Chrome: {' '.join(chrome_cmd[:5])} ...")
    chrome_proc = subprocess.Popen(chrome_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 等待 Chrome 启动并连接 CDP
    import urllib.request
    ws_url = None
    for _ in range(30):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{cdp_port}/json", timeout=2) as r:
                data = json.loads(r.read())
                for item in data:
                    if item.get("type") == "page":
                        ws_url = item.get("webSocketDebuggerUrl")
                        break
                if ws_url:
                    break
        except:
            pass
        time.sleep(0.5)

    if not ws_url:
        chrome_proc.kill()
        raise RuntimeError(f"无法连接到 Chrome CDP (port {cdp_port})")

    print(f"CDP 连接成功: {ws_url[:50]}...")

    # 用 websockets 连接 CDP
    try:
        import websockets
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "websockets", "-q"], check=True)
        import websockets

    import asyncio

    recording_script = f"""
    const {{ getAvailableDisplays }} = cast.devtools.remoteDebugging.castDiscovery;
    // 简单方案：直接用 MediaRecorder + Chrome 的 CDP Page.startScreencast
    """

    async def render_with_cdp():
        async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
            # 启用 Page domain
            await ws.send(json.dumps({"id": 1, "method": "Page.enable"}))
            await ws.send(json.dumps({"id": 2, "method": "Runtime.enable"}))

            # 等待页面加载
            await asyncio.sleep(2)

            # 开始录屏
            await ws.send(json.dumps({
                "id": 3,
                "method": "Page.startScreencast",
                "params": {
                    "format": "png",
                    "maxWidth": width,
                    "maxHeight": height,
                    "everyNthFrame": 1
                }
            }))

            # 收集帧
            frames = []
            start_time = time.time()
            frame_count = 0
            fps = 30
            expected_frames = int(total_duration * fps)

            print(f"开始录制: {expected_frames} 帧 @ {fps}fps")

            while time.time() - start_time < total_duration + 5:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=2)
                    data = json.loads(msg)
                    if data.get("method") == "Page.screencastFrame":
                        frame_data = data["params"]["data"]
                        frames.append(frame_data)
                        frame_count += 1
                        # 发送 ack
                        await ws.send(json.dumps({
                            "id": 100,
                            "method": "Page.screencastFrame",
                            "params": {"sessionId": data["params"]["sessionId"]}
                        }))
                        if frame_count % 30 == 0:
                            print(f"  已录制 {frame_count}/{expected_frames} 帧")
                except asyncio.TimeoutError:
                    continue
                if frame_count >= expected_frames:
                    break

            # 停止录屏
            await ws.send(json.dumps({"id": 4, "method": "Page.stopScreencast"}))
            return frames

    frames = asyncio.run(render_with_cdp())
    chrome_proc.kill()

    if not frames:
        raise RuntimeError("未捕获到任何视频帧")

    print(f"捕获 {len(frames)} 帧，开始写入视频...")

    # 把 PNG 帧写成临时文件，然后用 ffmpeg 合成视频
    frames_dir = f"/tmp/frames_{os.getpid()}"
    os.makedirs(frames_dir, exist_ok=True)

    for i, frame_b64 in enumerate(frames):
        frame_path = os.path.join(frames_dir, f"frame_{i:06d}.png")
        with open(frame_path, "wb") as f:
            f.write(__import__("base64").b64decode(frame_b64))

    # 用 ffmpeg 合成无音轨视频
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-framerate", "30",
        "-i", f"{frames_dir}/frame_%06d.png",
        "-c:v", "h264_videotoolbox",
        "-pix_fmt", "yuv420p",
        "-b:v", "8M",
        video_raw
    ]
    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg 错误: {result.stderr[-500:]}")

    # 清理临时帧
    shutil.rmtree(frames_dir, ignore_errors=True)
    shutil.rmtree(chrome_data_dir, ignore_errors=True)

    # 如果有音频，混音
    if audio_path and os.path.exists(audio_path):
        final_cmd = [
            "ffmpeg", "-y",
            "-i", video_raw,
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "128k",
            "-shortest",
            final_path
        ]
        subprocess.run(final_cmd, capture_output=True)
        print(f"最终视频(含音轨): {final_path}")
    else:
        shutil.copy(video_raw, final_path)
        print(f"最终视频(无音轨): {final_path}")

    # 清理中间的 video_raw
    if os.path.exists(video_raw) and video_raw != final_path:
        os.remove(video_raw)

    return {
        "video_raw": video_raw,
        "final": final_path,
        "frames": len(frames),
        "duration": total_duration
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HTML 视频渲染 (绕过工具缓存)")
    parser.add_argument("html_path", help="HTML 文件绝对路径")
    parser.add_argument("--preset", default="horizontal-16:9", help="预设: horizontal-16:9 / vertical-9:16 / square-1:1")
    parser.add_argument("--audio", default=None, help="音频文件路径 (可选)")
    parser.add_argument("--allow-overwrite", action="store_true", help="允许覆盖已有文件")
    args = parser.parse_args()

    result = render_html_to_video(
        html_path=args.html_path,
        preset=args.preset,
        allow_overwrite=args.allow_overwrite,
        audio_path=args.audio
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
