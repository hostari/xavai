#!/bin/bash

# Clear or create the destination file
> chotikai-48-chunk-summary.txt

# Loop through all chunk summary files in numerical order
for file in $(ls chotikai_chunk_*_summary.txt | sort -V); do
    # Append each file's contents to the combined file
    cat "$file" >> chotikai-48-chunk-summary.txt
    # Add a newline between chunks
    echo "" >> chotikai-48-chunk-summary.txt
done
