from dataclasses import dataclass
from typing import List, Optional, Tuple
from client.src.utils.config import config
from client.src.utils.logger import logger


@dataclass
class TowerStats:
    """Характеристики башни"""
    damage: float = 10.0
    attack_speed: float = 1.0  # Атак в секунду
    attack_range: float = 200.0
    critical_chance: float = 0.1  # 10%
    critical_multiplier: float = 2.0

    @property
    def attack_cooldown(self) -> float:
        """Время между атаками (в секундах)"""
        return 1.0 / self.attack_speed if self.attack_speed > 0 else float('inf')


class Tower:
    """Класс башни игрока"""

    def __init__(self):
        self.position = config.screen_center
        self.base_stats = TowerStats()
        self.current_stats = TowerStats()
        self.level = 1
        self.experience = 0
        self.experience_to_next_level = 100

        # Визуальные параметры
        self.radius = 50
        self.color = (70, 130, 180)  # Steel blue

        logger.info("Tower created")

    def upgrade_damage(self, cost: int) -> bool:
        """Улучшить урон башни"""
        # Здесь будет логика улучшения
        logger.info(f"Damage upgrade attempted (cost: {cost})")
        return True

    def upgrade_attack_speed(self, cost: int) -> bool:
        """Улучшить скорость атаки"""
        logger.info(f"Attack speed upgrade attempted (cost: {cost})")
        return True

    def add_experience(self, amount: int):
        """Добавить опыт башне"""
        self.experience += amount
        logger.debug(f"Tower gained {amount} XP. Total: {self.experience}/{self.experience_to_next_level}")

        # Проверка уровня
        while self.experience >= self.experience_to_next_level:
            self.level_up()

    def level_up(self):
        """Повышение уровня башни"""
        self.level += 1
        self.experience -= self.experience_to_next_level
        self.experience_to_next_level = int(self.experience_to_next_level * 1.5)

        # Автоматическое улучшение характеристик при уровне
        self.current_stats.damage *= 1.1
        self.current_stats.attack_speed *= 1.05

        logger.info(f"Tower reached level {self.level}!")

    def can_level_up(self) -> bool:
        """Можно ли повысить уровень"""
        return self.experience >= self.experience_to_next_level