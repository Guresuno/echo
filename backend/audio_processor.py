import os
import subprocess
import tempfile
import struct
import math
import logging

logger = logging.getLogger("echo.audio")

def extract_waveform_peaks(audio_bytes: bytes, num_peaks: int = 40) -> list[float]:
    """
    Extracts an array of normalized amplitude peaks (0.0 to 1.0) with exactly `num_peaks` samples.
    Used for rendering interactive Discord/WhatsApp-style sound waves.
    """
    if not audio_bytes:
        return [0.1] * num_peaks

    # Strategy 1: Use ffmpeg to convert to raw 16-bit mono PCM, then calculate RMS/peaks
    try:
        with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as in_file:
            in_file.write(audio_bytes)
            in_path = in_file.name

        out_path = in_path + ".raw"

        # Convert to 8000Hz 16-bit little-endian mono PCM
        cmd = [
            "ffmpeg", "-y", "-i", in_path,
            "-ac", "1", "-ar", "8000", "-f", "s16le", out_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
        
        if res.returncode == 0 and os.path.exists(out_path):
            with open(out_path, "rb") as rf:
                raw_pcm = rf.read()
            os.remove(out_path)
            os.remove(in_path)

            total_samples = len(raw_pcm) // 2
            if total_samples > 0:
                samples = struct.unpack(f"<{total_samples}h", raw_pcm)
                chunk_size = max(1, total_samples // num_peaks)
                peaks = []
                for i in range(num_peaks):
                    start = i * chunk_size
                    end = min(total_samples, start + chunk_size)
                    chunk = samples[start:end]
                    if chunk:
                        peak = max(abs(s) for s in chunk) / 32768.0
                        peaks.append(round(min(1.0, max(0.08, peak)), 2))
                    else:
                        peaks.append(0.08)
                return peaks
        else:
            if os.path.exists(in_path):
                os.remove(in_path)
    except Exception as e:
        logger.warning(f"Error extrayendo forma de onda con ffmpeg: {e}")

    # Strategy 2: Fallback deterministic synthetic/sampled waveform
    peaks = []
    step = max(1, len(audio_bytes) // num_peaks)
    for i in range(num_peaks):
        byte_sample = audio_bytes[(i * step) % len(audio_bytes)]
        val = abs(byte_sample - 128) / 128.0
        # Smooth with sine
        val = 0.2 + 0.7 * (val * 0.7 + 0.3 * math.sin(i * 0.4))
        peaks.append(round(min(1.0, max(0.08, abs(val))), 2))
    return peaks

def transcode_to_opus(audio_bytes: bytes) -> tuple[bytes, str]:
    """
    Transcodes input audio into Opus (.ogg/.opus) using FFmpeg.
    Returns (transcoded_bytes, mime_type).
    """
    try:
        with tempfile.NamedTemporaryFile(suffix=".input", delete=False) as in_f:
            in_f.write(audio_bytes)
            in_path = in_f.name

        out_path = in_path + ".opus"
        cmd = [
            "ffmpeg", "-y", "-i", in_path,
            "-c:a", "libopus", "-b:a", "48k", "-vbr", "on", out_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        
        if res.returncode == 0 and os.path.exists(out_path):
            with open(out_path, "rb") as out_f:
                opus_bytes = out_f.read()
            os.remove(out_path)
            os.remove(in_path)
            return opus_bytes, "audio/ogg; codecs=opus"
    except Exception as e:
        logger.warning(f"FFmpeg transcode to opus failed: {e}")

    return audio_bytes, "audio/ogg"
