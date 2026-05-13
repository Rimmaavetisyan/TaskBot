from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://taskuser:taskpass@db:5432/taskdb"
    REDIS_URL: str = "redis://redis:6379/0"
    TELEGRAM_TOKEN: str
    GROQ_API_KEY: str

    class Config:
        env_file = ".env"


settings = Settings()
