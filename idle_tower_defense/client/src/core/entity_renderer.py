import pygame
from typing import List
from client.src.entities.tower import Tower
from client.src.entities.enemy import Enemy
from client.src.entities.projectile import Projectile
from client.src.utils.logger import logger


class EntityRenderer:
    """Рендерер для игровых сущностей"""

    def __init__(self):
        self.logger = logger

    def draw_tower(self, screen, tower: Tower):
        """Отрисовка башни"""
        pygame.draw.circle(screen, tower.color,
                           (int(tower.position[0]), int(tower.position[1])),
                           tower.radius)

    def draw_enemy(self, screen, enemy: Enemy):
        """Отрисовка врага с полоской здоровья"""
        if not enemy.is_alive():
            return

        # Тело врага
        pygame.draw.circle(screen, enemy.color,
                           (int(enemy.position[0]), int(enemy.position[1])),
                           enemy.radius)

        # Полоска здоровья
        health_width = 40
        health_height = 6
        health_x = enemy.position[0] - health_width // 2
        health_y = enemy.position[1] - enemy.radius - 10

        # Фон полоски здоровья
        pygame.draw.rect(screen, (255, 0, 0),
                         (health_x, health_y, health_width, health_height))

        # Текущее здоровье
        current_health_width = max(2, health_width * enemy.health_ratio)
        pygame.draw.rect(screen, (0, 255, 0),
                         (health_x, health_y, current_health_width, health_height))

    def draw_projectile(self, screen, projectile: Projectile):
        """Отрисовка снаряда"""
        if projectile.active:
            pygame.draw.circle(screen, projectile.color,
                               (int(projectile.position[0]), int(projectile.position[1])),
                               projectile.radius)

    def draw_battle_entities(self, screen, tower: Tower, enemies: List[Enemy], projectiles: List[Projectile]):
        """Отрисовка всех боевых сущностей"""
        # Башня
        self.draw_tower(screen, tower)

        # Враги
        for enemy in enemies:
            self.draw_enemy(screen, enemy)

        # Снаряды
        for projectile in projectiles:
            self.draw_projectile(screen, projectile)