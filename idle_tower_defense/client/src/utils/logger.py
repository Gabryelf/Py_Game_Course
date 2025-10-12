import logging
import sys
from datetime import datetime
import os


class GameLogger:
    """Система логгирования для отслеживания работы игры"""

    def __init__(self, name: str = "GameLogger"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)

        # Форматтер для логов
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

        # Консольный обработчик
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)

        # Файловый обработчик
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, f"game_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)

        # Добавляем обработчики к логгеру
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)

    def info(self, message: str):
        """Логирование информационного сообщения"""
        self.logger.info(message)

    def warning(self, message: str):
        """Логирование предупреждения"""
        self.logger.warning(message)

    def error(self, message: str):
        """Логирование ошибки"""
        self.logger.error(message)

    def debug(self, message: str):
        """Логирование отладочной информации"""
        self.logger.debug(message)


# Глобальный экземпляр логгера
logger = GameLogger("IdleTowerDefense")