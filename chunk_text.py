import tiktoken
import os
import math
import requests
import json

def count_tokens(text):
    """Count tokens in text using GPT tokenizer"""
    enc = tiktoken.get_encoding("cl100k_base")  # GPT-4 tokenizer
    return len(enc.encode(text))

def call_lm_studio(context):
    """Call LM Studio API to generate summary"""
    url = "http://localhost:1234/v1/chat/completions"
    headers = {'Content-Type': 'application/json'}
    
    payload = {
        "model": "deepseek-r1-distill-qen-7b",
        "messages": [
            {
                "role": "system",
                "content": f"I have the following context, which is a conversation between Charlotte and Xavi. The message directly below 'Charlotte' or 'Charlotte replied to Xavi' is a message from Charlotte. The message below 'Xavi' or 'Xavi replied to Charlotte' is a message from Xavi: <context>{context}</context>."
            },
            {
                "role": "user",
                "content": "Create a summary of this conversation between Xavi and Charlotte. Answer: "
            }
        ],
        "temperature": 0.7,
        "max_tokens": -1,
        "stream": False
    }
    
    response = requests.post(url, headers=headers, json=payload)
    return response.json()['choices'][0]['message']['content']

def create_chunks(input_file, tokens_per_chunk=8000):
    """Split text file into chunks of approximately equal token counts and save them"""
    
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
    chunk_files = []
    
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
        chunk_files.append(output_file)
        print(f"Created {output_file} with {count_tokens(chunk)} tokens")
    
    return chunk_files

def create_summaries(chunk_files):
    """Generate and save summaries for each chunk file"""
    summary_files = []
    for chunk_file in chunk_files:
        with open(chunk_file, 'r', encoding='utf-8') as f:
            chunk_content = f.read()
        
        # Generate summary
        summary = call_lm_studio(chunk_content)
        
        # Save summary
        summary_file = f"{os.path.splitext(chunk_file)[0]}_summary.txt"
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(summary)
        
        summary_files.append(summary_file)
        print(f"Created summary file {summary_file}")
    
    return summary_files

def create_summaries_range(start=4, end=48):
    """Generate and save summaries for chunk files in a specific range"""
    summary_files = []
    for i in range(start, end + 1):
        chunk_file = f"chotikai_chunk_{i}.txt"
        print(chunk_file)
        
        # Skip if file doesn't exist
        if not os.path.exists(chunk_file):
            print(f"Warning: {chunk_file} not found, skipping...")
            continue
            
        with open(chunk_file, 'r', encoding='utf-8') as f:
            chunk_content = f.read()
        
        # Generate summary
        summary = call_lm_studio(chunk_content)
        
        # Save summary
        summary_file = f"chotikai_chunk_{i}_summary.txt"
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(summary)
        
        summary_files.append(summary_file)
        print(f"Created summary file {summary_file}")
    
    return summary_files

if __name__ == "__main__":
    input_file = "chotikai.txt"
    # chunk_files = create_chunks(input_file)
    summary_files = create_summaries_range(49,50)
