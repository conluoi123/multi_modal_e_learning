from functools import lru_cache

from faster_whisper import WhisperModel


@lru_cache(maxsize=1)
def get_whisper_model():
    return WhisperModel("base", device="cpu", compute_type="int8")


def transcribe_audio(file_path: str) -> str:
    model = get_whisper_model()
    segments, _ = model.transcribe(file_path, language="vi")

    text_parts = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            text_parts.append(text)

    return " ".join(text_parts).strip()