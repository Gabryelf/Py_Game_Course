import time
from typing import Optional

from client.src.core.renderer import Renderer, PygameRenderer
from client.src.utils.config import config
from client.src.utils.logger import logger


class GameEngine:
    """Основной игровой движок, управляющий всем циклом игры"""

    def __init__(self):
        self.renderer: Optional[Renderer] = None
        self.running = False
        self.clock = None
        self.logger = logger

        # Статистика производительности
        self.frame_count = 0
        self.fps = 0
        self.last_fps_update = time.time()

    def initialize(self) -> bool:
        """Инициализация игрового движка"""
        self.logger.info("Initializing game engine...")

        # Создаем и инициализируем рендерер
        self.renderer = PygameRenderer()
        if not self.renderer.initialize():
            self.logger.error("Failed to initialize renderer")
            return False

        # Инициализация часов для контроля FPS
        import pygame
        self.clock = pygame.time.Clock()

        self.logger.info("Game engine initialized successfully")
        return True

    def run(self):
        """Запуск основного игрового цикла"""
        if not self.initialize():
            self.logger.error("Cannot run game - initialization failed")
            return

        self.running = True
        self.logger.info("Starting main game loop")

        # Основной игровой цикл
        while self.running:
            self._handle_events()
            self._update()
            self._render()
            self._update_fps()

            # Контроль FPS
            self.clock.tick(config.FPS)

        self._shutdown()

    def _handle_events(self):
        """Обработка событий ввода"""
        import pygame

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                self.logger.info("Quit event received")
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                    self.logger.info("Escape key pressed - quitting")

    def _update(self):
        """Обновление игровой логики"""
        # Здесь будет обновление состояния игры
        self.frame_count += 1

    def _render(self):
        """Отрисовка игрового состояния"""
        if not self.renderer:
            return

        # Очистка экрана
        self.renderer.clear_screen()

        # Отрисовка тестовой сцены
        self._render_test_scene()

        # Отрисовка FPS
        self._render_debug_info()

        # Обновление дисплея
        self.renderer.update_display()

    def _render_test_scene(self):
        """Отрисовка тестовой сцены для демонстрации"""
        # Центральная башня (круг)
        tower_center = config.screen_center
        tower_radius = 50
        self.renderer.draw_circle(tower_center, tower_radius, config.UI_PRIMARY_COLOR)

        # Текст с названием игры
        title_text = "Idle Tower Defense - Lesson 1"
        text_position = (config.SCREEN_WIDTH // 2 - 200, 50)
        self.renderer.draw_text(title_text, text_position, (255, 255, 255), 32)

        # Инструкция
        instruction = "Press ESC to exit"
        instruction_pos = (config.SCREEN_WIDTH // 2 - 100, config.SCREEN_HEIGHT - 50)
        self.renderer.draw_text(instruction, instruction_pos, (200, 200, 200), 24)

    def _render_debug_info(self):
        """Отрисовка отладочной информации"""
        fps_text = f"FPS: {self.fps}"
        self.renderer.draw_text(fps_text, (10, 10), (0, 255, 0), 24)

        frame_text = f"Frames: {self.frame_count}"
        self.renderer.draw_text(frame_text, (10, 40), (0, 255, 0), 24)

    def _update_fps(self):
        """Обновление счетчика FPS"""
        current_time = time.time()
        if current_time - self.last_fps_update >= 1.0:  # Раз в секунду
            self.fps = self.clock.get_fps() if self.clock else 0
            self.last_fps_update = current_time

    def _shutdown(self):
        """Корректное завершение работы"""
        self.logger.info("Shutting down game engine")
        import pygame
        pygame.quit()