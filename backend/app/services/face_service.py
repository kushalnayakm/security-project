"""
Demo-friendly face embedding helpers.

These utilities keep the backend architecture ready for a future InsightFace
integration while providing deterministic local behavior during development.
"""
from __future__ import annotations

import base64
import hashlib
import math
from pathlib import Path


def _normalize_vector(values: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / magnitude for value in values]


def _bytes_to_embedding(raw: bytes) -> list[float]:
    digest = hashlib.sha256(raw).digest()
    values = [((digest[index] / 255.0) * 2.0) - 1.0 for index in range(16)]
    return _normalize_vector(values)


def create_embedding_from_file(file_path: Path) -> list[float]:
    return _bytes_to_embedding(file_path.read_bytes())


def create_embedding_from_image_data(image_data: str) -> list[float]:
    _, _, payload = image_data.partition(",")
    decoded = base64.b64decode(payload or image_data)
    return _bytes_to_embedding(decoded)


def create_face_profile_key(embedding: list[float], country_code: str, phone_number: str) -> str:
    payload = "|".join(f"{value:.8f}" for value in embedding)
    payload = f"{payload}|{country_code}|{phone_number}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    return sum(left * right for left, right in zip(vector_a, vector_b))
