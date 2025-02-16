from chunk_text import count_tokens

def main():
    try:
        with open('chotikai-48-chunk-summary.txt', 'r', encoding='utf-8') as file:
            text = file.read()
            token_count = count_tokens(text)
            print(f"Number of tokens in chotikai-48-chunk-summary.txt: {token_count}")
    except FileNotFoundError:
        print("Error: chotikai-48-chunk-summary.txt not found")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main()
