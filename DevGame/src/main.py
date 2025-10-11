import sys
import os
# Добавляем корень проекта в Python path для абсолютных импортов
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.game import GameController


def main():

    try:
        game = GameController()
        game.run()
    except KeyboardInterrupt:
        print("\n\nGame interrupted by user. Goodbye!")
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
