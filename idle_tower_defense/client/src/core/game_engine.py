import time
from typing import Optional, List
import pygame

from .renderer import Renderer, PygameRenderer
from .game_state import GameState
from .wave_manager import WaveManager
from .battle_manager import BattleManager
from .entity_renderer import EntityRenderer
from ..entities.tower import Tower
from ..ui.components import Button, InfoPanel
from ..ui.upgrade_ui import UpgradePanel
from ..database.base_database import MockDatabase
from ..systems.upgrade_system import UpgradeSystem
from ..utils.config import config
from ..utils.logger import logger


class GameEngine:
    """Основной игровой движок, управляющий всем циклом игры"""

    def __init__(self) -> None:
        # Системы рендеринга
        self.renderer: Optional[Renderer] = None
        self.entity_renderer: Optional[EntityRenderer] = None
        self.clock: Optional[pygame.time.Clock] = None

        # Игровые системы
        self.game_state: Optional[GameState] = None
        self.wave_manager: Optional[WaveManager] = None
        self.battle_manager: Optional[BattleManager] = None
        self.tower: Optional[Tower] = None
        self.upgrade_system: Optional[UpgradeSystem] = None
        self.database: Optional[MockDatabase] = None

        # UI компоненты
        self.ui_components: List[Button | InfoPanel | UpgradePanel] = []
        self.upgrade_panel: Optional[UpgradePanel] = None

        # Состояние игры
        self.running: bool = False
        self.current_player_id: str = "test_player_001"

        # Статистика производительности
        self.frame_count: int = 0
        self.fps: float = 0.0
        self.last_fps_update: float = time.time()

    def initialize(self) -> bool:
        """Инициализация игрового движка"""
        logger.info("Initializing game engine...")

        # Инициализация рендерера
        self.renderer = PygameRenderer()
        if not self.renderer.initialize():
            logger.error("Failed to initialize renderer")
            return False

        # Инициализация систем
        self.clock = pygame.time.Clock()
        self.game_state = GameState()
        self.wave_manager = WaveManager()
        self.battle_manager = BattleManager()
        self.tower = Tower()
        self.entity_renderer = EntityRenderer()
        self.database = MockDatabase()
        self.upgrade_system = UpgradeSystem()

        # Подключение к базе данных
        if not self.database.connect():
            logger.warning("Failed to connect to database, using mock data")

        # Загрузка данных игрока
        self._load_player_data()

        # Создание UI
        self._create_ui()

        logger.info("Game systems initialized")
        return True

    def _load_player_data(self) -> None:
        """Загрузка данных игрока из базы данных"""
        if not self.database:
            return

        player_data = self.database.load_player_data(self.current_player_id)
        if player_data and 'upgrades' in player_data:
            self.upgrade_system.load_upgrades(player_data['upgrades'])
            logger.info("Player upgrades loaded from database")

    def _save_player_data(self) -> None:
        """Сохранение данных игрока в базу данных"""
        if not self.database:
            return

        player_data = {
            'player_id': self.current_player_id,
            'upgrades': self.upgrade_system.save_upgrades(),
            'high_score': self.game_state.player_progress.score if self.game_state else 0,
            'level': self.tower.level if self.tower else 1,
            'last_save': time.time()
        }

        if self.database.save_player_data(self.current_player_id, player_data):
            logger.info("Player data saved successfully")
        else:
            logger.error("Failed to save player data")

    def _create_ui(self) -> None:
        """Создание пользовательского интерфейса"""
        # Основные UI компоненты
        start_button = Button(
            (config.SCREEN_WIDTH // 2 - 100, config.SCREEN_HEIGHT // 2, 200, 50),
            "Start Battle",
            self._on_start_battle
        )
        info_panel = InfoPanel((10, 10, 200, 150))

        # Панель улучшений
        self.upgrade_panel = UpgradePanel((config.SCREEN_WIDTH - 320, 100, 300, 500))
        self.upgrade_panel.set_systems(self.upgrade_system, self.tower, self.game_state)
        self.upgrade_panel.visible = False

        self.ui_components = [start_button, info_panel, self.upgrade_panel]

    def _on_start_battle(self) -> None:
        """Обработчик начала битвы"""
        if not self.game_state or not self.wave_manager:
            return

        self.game_state.start_battle()
        self.wave_manager.start_wave(1)

        # Обновление UI
        for component in self.ui_components:
            if isinstance(component, Button) and component.text == "Start Battle":
                component.visible = False
            elif isinstance(component, UpgradePanel):
                component.visible = True

        logger.info("Start battle button hidden, upgrade panel shown")

    def run(self) -> None:
        """Запуск основного игрового цикла"""
        if not self.initialize():
            logger.error("Cannot run game - initialization failed")
            return

        self.running = True
        logger.info("Starting main game loop")

        last_time = time.time()

        # Основной игровой цикл
        while self.running:
            current_time = time.time()
            delta_time = current_time - last_time
            last_time = current_time

            self._handle_events()
            self._update(delta_time)
            self._render()
            self._update_fps()

            # Контроль FPS
            if self.clock:
                self.clock.tick(config.FPS)

        self._shutdown()

    def _handle_events(self) -> None:
        """Обработка событий ввода"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                logger.info("Quit event received")
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                    logger.info("Escape key pressed - quitting")

            # Передача событий UI компонентам
            for component in self.ui_components:
                if component.handle_event(event):
                    break

    def _update(self, delta_time: float) -> None:
        """Обновление игровой логики"""
        self.frame_count += 1

        if not self.game_state or not self.game_state.game_active:
            return

        # Обновление волн и спавн врагов
        if self.wave_manager and self.battle_manager and self.tower:
            enemies_to_spawn = self.wave_manager.update(delta_time, self.game_state)

            for enemy_type in enemies_to_spawn:
                enemy = self.battle_manager.spawn_enemy(enemy_type, config.enemy_path)
                logger.debug(f"Spawned {enemy_type} at wave {self.game_state.player_progress.current_wave}")

            # Обновление боевой системы
            defeated_enemies = self.battle_manager.update(delta_time, self.tower, self.game_state)

            # Обновление счета
            for enemy in defeated_enemies:
                self.game_state.player_progress.score += enemy.type.reward * 10

        # Автосохранение каждые 120 секунд
        if self.frame_count % (120 * config.FPS) == 0:
            self._save_player_data()

    def _render(self) -> None:
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
        self._render_debug_info()

        self.renderer.update_display()

    def _render_battle(self) -> None:
        """Отрисовка битвы"""
        # Отрисовка боевых сущностей
        if (self.entity_renderer and self.battle_manager and
                self.tower and self.renderer):
            self.entity_renderer.draw_battle_entities(
                self.renderer.screen,
                self.tower,
                self.battle_manager.active_enemies,
                self.battle_manager.active_projectiles
            )

        # Радиус атаки башни (для отладки)
        if self.tower and self.renderer:
            attack_range = self.tower.current_stats.attack_range
            self.renderer.draw_circle(self.tower.position, attack_range, (255, 255, 255), 1)

        # Информация о волне и врагах
        if self.game_state and self.battle_manager and self.renderer:
            wave_text = f"Wave: {self.game_state.player_progress.current_wave}"
            self.renderer.draw_text(wave_text, (config.SCREEN_WIDTH // 2 - 50, 20),
                                    (255, 255, 255), 28)

            enemies_text = f"Enemies: {self.battle_manager.get_enemy_count()}"
            self.renderer.draw_text(enemies_text, (config.SCREEN_WIDTH // 2 - 50, 50),
                                    (255, 255, 255), 24)

    def _render_ui(self) -> None:
        """Отрисовка UI компонентов"""
        if not self.renderer:
            return

        for component in self.ui_components:
            if hasattr(component, 'draw'):
                if type(component).__name__ == 'InfoPanel' and self.game_state:
                    component.draw(self.renderer.screen, self.game_state)
                else:
                    component.draw(self.renderer.screen)

    def _render_lobby(self) -> None:
        """Отрисовка лобби"""
        if not self.renderer:
            return

        # Заголовок
        title_text = "Idle Tower Defense - Lobby"
        self.renderer.draw_text(title_text,
                                (config.SCREEN_WIDTH // 2 - 200, 100),
                                (255, 255, 255), 36)

        # Центральная башня
        self.renderer.draw_circle(config.screen_center, 60, (70, 130, 180))

    def _render_debug_info(self) -> None:
        """Отрисовка отладочной информации"""
        if not self.renderer:
            return

        fps_text = f"FPS: {self.fps:.1f}"
        self.renderer.draw_text(fps_text, (10, 10), (0, 255, 0), 24)

        frame_text = f"Frames: {self.frame_count}"
        self.renderer.draw_text(frame_text, (10, 40), (0, 255, 0), 24)

    def _update_fps(self) -> None:
        """Обновление счетчика FPS"""
        current_time = time.time()
        if current_time - self.last_fps_update >= 1.0:
            self.fps = self.clock.get_fps() if self.clock else 0
            self.last_fps_update = current_time

    def _shutdown(self) -> None:
        """Корректное завершение работы"""
        # Сохраняем данные при выходе
        self._save_player_data()

        if self.database:
            self.database.disconnect()

        logger.info("Shutting down game engine")
        pygame.quit()