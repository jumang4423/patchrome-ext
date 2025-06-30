import anyio
from claude_code_sdk import query, Config, CLINotFoundError
import sys


async def main():
    try:
        # Simple example - ask Claude a question
        print("Asking Claude: What is 2 + 2?")
        print("-" * 40)
        
        async for message in query(prompt="What is 2 + 2?"):
            print(message, end="", flush=True)
        
        print("\n" + "-" * 40)
        
        # More complex example with configuration
        config = Config(
            system_prompt="You are a helpful Python programming assistant.",
            max_conversation_turns=3,
            allowed_tools=["Read", "Write", "Bash"],
            working_directory="."
        )
        
        print("\nAsking Claude to help with Python:")
        print("-" * 40)
        
        async for message in query(
            prompt="Create a simple hello world function in Python and explain it",
            config=config
        ):
            print(message, end="", flush=True)
        
        print("\n" + "-" * 40)
        
    except CLINotFoundError:
        print("Error: Claude Code CLI not found. Please install it with:")
        print("npm install -g @anthropic-ai/claude-code")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    anyio.run(main)