from typing import List
from .tiles.tile import Tile

""" Сетка тайлов, глобальный класс для реализации игровой карты"""


# игровая логика построения тайлов
class GameMap:
    # хранилище игровых тайлов
    def __init__(self, width: int, height: int):
        self._width = width
        self._height = height
        self._tiles = self._generate_map(width, height)

    #метод для генерации карты - пока простой - временный
    def _generate_map(self, width: int, height: int) -> List[List[Tile]]:
        tiles = []
        for y in range(height):
            row = []
            for x in range(width):
                from.tiles.grass import GrassTile
                from.tiles.mountain import MountainTile

                if (x+y) % 3 == 0:
                    tile = MountainTile(x, y)
                else:
                    tile = GrassTile(x, y)
                row.append(tile)
            tiles.append(row)
        return tiles

    # возврат тайла по координатам
    def get_tile(self, x: int, y: int) -> Tile:
        if 0 <= x < self._width and  0 <= y < self._height:
            return self._tiles[x][y]
        # временная гора за пределами сетки - проверка - удалить потом!!!
        from .tiles.mountain import MountainTile
        return MountainTile(x, y)

    @property
    def width(self):
        return self._width

    @property
    def height(self):
        return self._height

    # временная отрисовка в консоль
    def render(self):
        for row in self._tiles:
            print(' '.join(str(tile) for tile in row))




