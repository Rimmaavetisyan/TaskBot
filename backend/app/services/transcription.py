from groq import Groq
from ..config import settings

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def transcribe_audio(audio_bytes: bytes, filename: str = "voice.ogg") -> str:
    client = _get_client()
    transcription = client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3",
        response_format="json",
        temperature=0.0,
    )
    return transcription.text.strip()
