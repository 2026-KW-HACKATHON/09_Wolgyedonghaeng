from typing import Protocol

from schemas import ClassifyResult


class Classifier(Protocol):
    async def classify(self, images: list[bytes]) -> ClassifyResult: ...
