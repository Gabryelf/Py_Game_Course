#!/usr/bin/env python3
"""
Главная точка входа в клиентское приложение Idle Tower Defense
"""

import sys
import os

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from core.game_engine import GameEngine
from utils.logger import logger


def main():
    """Основная функция запуска игры"""
    logger.info("Starting Idle Tower Defense Client")

    try:
        # Создаем и запускаем игровой движок
        engine = GameEngine()
        engine.run()

    except Exception as e:
        logger.error(f"Critical error in main: {e}")
        print(f"Game crashed with error: {e}")
        return 1

    logger.info("Game exited successfully")
    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
