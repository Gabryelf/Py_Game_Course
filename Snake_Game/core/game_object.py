from abc import ABC, abstractmethod
from typing import Tuple
import pygame


class GameObject(ABC):

    @abstractmethod
    def update(self):
        pass

    @abstractmethod
    def draw(self, surface: pygame.Surface):
        pass

    @abstractmethod
    def get_position(self) -> Tuple[int, int]:
        pass