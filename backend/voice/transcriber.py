from functools import lru_cache

from faster_whisper import WhisperModel


@lru_cache(maxsize=1)
def get_whisper_model():
    return WhisperModel("small", device="cpu", compute_type="int8")

def transcribe_audio(file_path: str) -> str:
    model = get_whisper_model()
    segments, _ = model.transcribe(
        file_path, 
        language="vi", 
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    text_parts = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            text_parts.append(text)

    return " ".join(text_parts).strip()