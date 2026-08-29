from backend.settings import Settings


def test_settings_accepts_database_url_alias(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("DB_URL", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@localhost/testdb")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-testing-only")

    settings = Settings()

    assert settings.db_url == "postgresql+psycopg://user:pass@localhost/testdb"
