from typing import List, Dict, Any
import random
from client.src.utils.logger import logger


class WaveManager:
    """Менеджер волн врагов"""

    def __init__(self):
        self.current_wave = 0
        self.enemies_per_wave = 5
        self.wave_in_progress = False
        self.enemies_spawned = 0
        self.enemies_defeated = 0
        self.spawn_timer = 0
        self.spawn_interval = 2.0  # секунды между спавном

        logger.info("WaveManager initialized")

    def start_wave(self, wave_number: int):
        """Начать волну"""
        self.current_wave = wave_number
        self.enemies_per_wave = 5 + wave_number * 2
        self.enemies_spawned = 0
        self.enemies_defeated = 0
        self.wave_in_progress = True
        self.spawn_timer = 0

        logger.info(f"Wave {wave_number} started. Enemies: {self.enemies_per_wave}")

    def update(self, delta_time: float, game_state) -> List[str]:
        """Обновление логики волны"""
        enemies_to_spawn = []

        if not self.wave_in_progress:
            return enemies_to_spawn

        self.spawn_timer += delta_time

        # Спавн новых врагов
        if (self.spawn_timer >= self.spawn_interval and
                self.enemies_spawned < self.enemies_per_wave):
            enemy_type = self._get_enemy_type_for_wave()
            enemies_to_spawn.append(enemy_type)
            self.enemies_spawned += 1
            self.spawn_timer = 0

            logger.debug(f"Spawning {enemy_type}. Total spawned: {self.enemies_spawned}")

        # Проверка завершения волны
        if (self.enemies_spawned >= self.enemies_per_wave and
                self.enemies_defeated >= self.enemies_per_wave):
            self.wave_in_progress = False
            game_state.player_progress.current_wave += 1
            logger.info(f"Wave {self.current_wave} completed!")

        return enemies_to_spawn

    def _get_enemy_type_for_wave(self) -> str:
        """Определение типа врага в зависимости от волны"""
        if self.current_wave <= 2:
            return "goblin"
        elif self.current_wave <= 5:
            return random.choice(["goblin", "orc"])
        else:
            choices = ["goblin", "orc"]
            if self.current_wave % 5 == 0:  # Каждая 5-я волна - босс
                choices.append("boss")
            return random.choice(choices)

    def on_enemy_defeated(self):
        """Вызывается при победе над врагом"""
        self.enemies_defeated += 1
        logger.debug(f"Enemy defeated. Total: {self.enemies_defeated}/{self.enemies_per_wave}")