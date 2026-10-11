from pathlib import Path
import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a large UTF-8 fixture for editor testing")
    parser.add_argument("output", type=Path)
    parser.add_argument("--megabytes", type=int, default=5)
    args = parser.parse_args()

    paragraph = (
        "Large document performance fixture. "
        "This paragraph exists only to exercise chunked editing on a mobile device. "
        "한글 입력과 줄바꿈도 함께 확인합니다.\n\n"
    )
    target = args.megabytes * 1024 * 1024

    with args.output.open("w", encoding="utf-8") as handle:
        written = 0
        while written < target:
            handle.write(paragraph)
            written += len(paragraph.encode("utf-8"))

    print(f"Wrote approximately {args.megabytes} MiB to {args.output}")


if __name__ == "__main__":
    main()
