from core.map import GameMap

""" Главная точка входа в игру, запуск проекта!!!"""


def main():

    game_map = GameMap(width=50, height=50)

    tile_at_0_0 = game_map.get_tile(0, 0)
    print(f"Tile at (1,1) is {tile_at_0_0}. Is passable? {tile_at_0_0.is_passable}")
    tile_at_1_1 = game_map.get_tile(1, 1)
    print(f"Tile at (1,1) is {tile_at_1_1}. Is passable? {tile_at_1_1.is_passable}")

    print("\n--- Game Map ---")
    game_map.render()


if __name__ == "__main__":
    main()
