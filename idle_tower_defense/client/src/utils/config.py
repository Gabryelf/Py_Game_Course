import os
from dataclasses import dataclass
from typing import Tuple


@dataclass
class GameConfig:

    SCREEN_WIDTH: int = 1200
    SCREEN_HEIGHT: int = 800

    BACKGROUND_COLOR: Tuple[int, int, int] = (45, 45, 65)
    UI_PRIMARY_COLOR: Tuple[int, int, int] = (70, 130, 180)
    UI_SECONDARY_COLOR: Tuple[int, int, int] = (100, 160, 200)

    FPS: int = 60
    GAME_TITLE: str = "Idle Tower Defense"

    ASSETS_PATH: str = os.path.join(os.path.dirname(__file__), "../../../assets")

    @property
    def screen_center(self) -> Tuple[float, float]:
        return self.SCREEN_WIDTH // 2, self.SCREEN_HEIGHT // 2


config = GameConfig()

