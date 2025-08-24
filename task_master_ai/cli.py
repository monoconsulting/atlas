"""Simple CLI for task_master_ai.

Usage: python -m task_master_ai.cli --prompt "Write a commit message"
"""
import argparse
from .ai import chat


def main():
    parser = argparse.ArgumentParser(description="task_master_ai CLI")
    parser.add_argument("--prompt", "-p", required=True, help="Prompt to send to the AI")
    parser.add_argument("--model", "-m", default="gpt-3.5-turbo", help="Model name (if using OpenAI)")
    args = parser.parse_args()

    out = chat(args.prompt, model=args.model)
    print(out)


if __name__ == "__main__":
    main()
