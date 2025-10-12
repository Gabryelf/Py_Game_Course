from typing import List, Dict, Any, Tuple
from client.src.entities.enemy import Enemy
from client.src.entities.projectile import Projectile
from client.src.utils.logger import logger


class BattleManager:
    """Менеджер боевой системы - обрабатывает все взаимодействия в битве"""

    def __init__(self):
        self.active_enemies: List[Enemy] = []
        self.active_projectiles: List[Projectile] = []
        self.defeated_enemies = 0

        logger.info("BattleManager initialized")

    def spawn_enemy(self, enemy_type: str, path: List[Tuple[float, float]]) -> Enemy:
        """Создание нового врага"""
        enemy = Enemy(enemy_type, path)
        self.active_enemies.append(enemy)
        logger.debug(f"Spawned {enemy_type} at position {enemy.position}")
        return enemy

    def update(self, delta_time: float, tower, game_state) -> List[Enemy]:
        """Обновление всей боевой системы. Возвращает убитых врагов"""
        defeated_enemies = []

        # Обновление врагов
        self._update_enemies(delta_time, game_state)

        # Обновление снарядов от башни
        new_projectiles = tower.update(delta_time, self.active_enemies)
        self.active_projectiles.extend(new_projectiles)

        # Обновление снарядов и проверка попаданий
        self._update_projectiles(game_state)

        # Сбор убитых врагов
        for enemy in self.active_enemies[:]:
            if not enemy.is_alive():
                self.active_enemies.remove(enemy)
                defeated_enemies.append(enemy)
                self.defeated_enemies += 1

                # Награда за убийство
                reward = enemy.type.reward
                experience = enemy.type.experience
                game_state.player_progress.add_coins(reward)
                game_state.player_progress.enemies_defeated += 1
                tower.add_experience(experience)

                logger.debug(f"Enemy defeated! Reward: {reward} coins, {experience} XP")

        return defeated_enemies

    def _update_enemies(self, delta_time: float, game_state):
        """Обновление позиций врагов"""
        for enemy in self.active_enemies[:]:
            reached_end = enemy.update(delta_time)

            if reached_end and enemy.is_alive():
                # Враг дошел до конца - наносим урон игроку
                self.active_enemies.remove(enemy)
                damage = enemy.type.health // 10  # Урон пропорционален здоровью врага
                game_state.player_progress.coins = max(0, game_state.player_progress.coins - damage)
                logger.warning(f"Enemy reached tower! Lost {damage} coins")

    def _update_projectiles(self, game_state):
        """Обновление снарядов и проверка попаданий"""
        active_projectiles = []

        for projectile in self.active_projectiles:
            target_reached = projectile.update()

            if target_reached and projectile.active:
                # Снаряд достиг цели - наносим урон
                if projectile.target.is_alive():
                    killed = projectile.target.take_damage(projectile.damage)
                    if killed:
                        # Награда будет обработана в основном update
                        pass
                projectile.active = False

            if projectile.active:
                active_projectiles.append(projectile)

        self.active_projectiles = active_projectiles

    def draw(self, screen):
        """Отрисовка всех боевых объектов"""
        for enemy in self.active_enemies:
            enemy.draw(screen)

        for projectile in self.active_projectiles:
            projectile.draw(screen)

    def get_enemy_count(self) -> int:
        """Количество активных врагов"""
        return len(self.active_enemies)