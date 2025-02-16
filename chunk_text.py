import tiktoken
import os
import math

def count_tokens(text):
    """Count tokens in text using GPT tokenizer"""
    enc = tiktoken.get_encoding("cl100k_base")  # GPT-4 tokenizer
    return len(enc.encode(text))

def chunk_text(input_file, tokens_per_chunk=8000):
    """Split text file into chunks of approximately equal token counts"""
    
    # Read the entire file
    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Get total tokens
    total_tokens = count_tokens(text)
    
    # Calculate number of chunks needed
    num_chunks = math.ceil(total_tokens / tokens_per_chunk)
    
    # Split text into paragraphs
    paragraphs = text.split('\n\n')
    
    chunks = []
    current_chunk = []
    current_tokens = 0
    
    for para in paragraphs:
        para_tokens = count_tokens(para)
        
        # If adding this paragraph would exceed the chunk size
        if current_tokens + para_tokens > tokens_per_chunk and current_chunk:
            # Save current chunk and start a new one
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = []
            current_tokens = 0
        
        current_chunk.append(para)
        current_tokens += para_tokens
    
    # Add the last chunk if it exists
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
    
    # Write chunks to files
    base_name = os.path.splitext(input_file)[0]
    for i, chunk in enumerate(chunks, 1):
        output_file = f"{base_name}_chunk_{i}.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(chunk)
        print(f"Created {output_file} with {count_tokens(chunk)} tokens")

if __name__ == "__main__":
    chunk_text("chotikai.txt")
