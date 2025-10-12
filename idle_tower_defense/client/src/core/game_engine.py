import time
from typing import Optional
import pygame  # Переносим импорт pygame в начало файла

# АБСОЛЮТНЫЕ импорты через корневой пакет client.src
from client.src.core.renderer import Renderer, PygameRenderer
from client.src.core.game_state import GameState, GameStateType
from client.src.core.wave_manager import WaveManager
from client.src.entities.tower import Tower
from client.src.ui.components import Button, InfoPanel
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

        self.game_state = None
        self.wave_manager = None
        self.tower = None
        self.ui_components = []

    def initialize(self) -> bool:
        """Инициализация игрового движка"""
        self.logger.info("Initializing game engine...")

        # Создаем и инициализируем рендерер
        self.renderer = PygameRenderer()
        if not self.renderer.initialize():
            self.logger.error("Failed to initialize renderer")
            return False

        # Инициализация часов для контроля FPS
        self.clock = pygame.time.Clock()

        # Инициализация игрового состояния
        self.game_state = GameState()
        self.wave_manager = WaveManager()
        self.tower = Tower()

        # Создание UI
        self._create_ui()

        logger.info("Game systems initialized")
        return True

    def _create_ui(self):
        """Создание пользовательского интерфейса"""
        # Кнопка начала битвы
        start_button = Button(
            (config.SCREEN_WIDTH // 2 - 100, config.SCREEN_HEIGHT // 2, 200, 50),
            "Start Battle",
            self._on_start_battle
        )

        # Панель информации
        info_panel = InfoPanel((10, 10, 200, 150))

        self.ui_components = [start_button, info_panel]

    def _on_start_battle(self):
        """Обработчик начала битвы"""
        self.game_state.start_battle()
        self.wave_manager.start_wave(1)

    def run(self):
        """Запуск основного игрового цикла"""
        if not self.initialize():
            self.logger.error("Cannot run game - initialization failed")
            return

        self.running = True
        self.logger.info("Starting main game loop")

        # Добавляем расчет delta_time
        last_time = time.time()

        # Основной игровой цикл
        while self.running:
            current_time = time.time()
            delta_time = current_time - last_time
            last_time = current_time

            self._handle_events()
            self._update(delta_time)  # Передаем delta_time
            self._render()
            self._update_fps()

            # Контроль FPS
            self.clock.tick(config.FPS)

        self._shutdown()

    def _handle_events(self):
        """Обработка событий ввода"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                self.logger.info("Quit event received")
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                    self.logger.info("Escape key pressed - quitting")

            # Передача событий UI компонентам
            for component in self.ui_components:
                if component.handle_event(event):
                    break

    def _update(self, delta_time: float):
        """Обновление игровой логики"""
        self.frame_count += 1

        if self.game_state and self.game_state.game_active:
            # Обновление волн
            enemies_to_spawn = self.wave_manager.update(delta_time, self.game_state)

            # Здесь будет логика создания врагов
            for enemy_type in enemies_to_spawn:
                logger.debug(f"Should spawn: {enemy_type}")

    def _render(self):
        """Отрисовка игрового состояния"""
        if not self.renderer:
            return

        self.renderer.clear_screen()

        # Отрисовка в зависимости от состояния
        if self.game_state and self.game_state.current_state:
            if self.game_state.current_state.name == "LOBBY":
                self._render_lobby()
            elif self.game_state.current_state.name == "BATTLE":
                self._render_battle()

        # Отрисовка UI
        self._render_ui()

        # Отладочная информация
        #self._render_debug_info()

        self.renderer.update_display()

    def _render_battle(self):
        """Отрисовка битвы"""
        # Центральная башня
        tower_pos = config.screen_center
        self.renderer.draw_circle(tower_pos, 50, (70, 130, 180))

        # Радиус атаки башни (для отладки) - ИСПРАВЛЯЕМ ЗДЕСЬ
        if self.tower:
            attack_range = self.tower.current_stats.attack_range
            self.renderer.draw_circle(tower_pos, attack_range, (255, 255, 255), 1)

        # Информация о волне
        if self.game_state:
            wave_text = f"Wave: {self.game_state.player_progress.current_wave}"
            self.renderer.draw_text(wave_text, (config.SCREEN_WIDTH // 2 - 50, 20),
                                    (255, 255, 255), 28)

    def _render_ui(self):
        """Отрисовка UI компонентов"""
        for component in self.ui_components:
            if hasattr(component, 'draw'):
                # Используем isinstance без импорта, проверяя по классу
                if type(component).__name__ == 'InfoPanel' and self.game_state:
                    component.draw(self.renderer.screen, self.game_state)
                else:
                    component.draw(self.renderer.screen)

    def _render_lobby(self):
        """Отрисовка лобби"""
        # Заголовок
        title_text = "Idle Tower Defense - Lobby"
        self.renderer.draw_text(title_text,
                                (config.SCREEN_WIDTH // 2 - 200, 100),
                                (255, 255, 255), 36)

        # Центральная башня
        self.renderer.draw_circle(config.screen_center, 60, (70, 130, 180))

    def _render_debug_info(self):
        """Отрисовка отладочной информации"""
        fps_text = f"FPS: {self.fps:.1f}"
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
        pygame.quit()