# AWS S3 Vector Store Node for n8n

An improved n8n custom node for working with AWS S3 Vector Store using LangChain Bedrock embeddings.

## Features

### Embedding Configuration
- **Configurable Embedding Models**: Choose from multiple Bedrock embedding models:
  - Amazon Titan Text Embeddings v1 (1536 dimensions)
  - Amazon Titan Text Embeddings v2 (1024 dimensions)
  - Cohere Embed English v3 (1024 dimensions)
  - Cohere Embed Multilingual v3 (1024 dimensions)

### Flexible Input Processing
- **Text Field**: Extract text from a specific field in your input data
- **Full JSON**: Use the entire JSON object as text (stringified)
- **Custom Expression**: Use n8n expressions to combine multiple fields (e.g., `{{ $json.title + " " + $json.content }}`)

### Text Chunking
- **Configurable Chunk Size**: Set the maximum size of each text chunk (100-8000 characters)
- **Chunk Overlap**: Configure overlap between chunks to maintain context (0-1000 characters)
- **Smart Word Boundary Splitting**: Automatically breaks at word boundaries when possible

### Operations
- **Insert Documents**: Process input data, generate embeddings, and store in S3 Vector Store
- **Search Documents**: Perform similarity search with configurable result count and metadata filtering

### Advanced Options
- **Namespace Support**: Partition vectors within the index
- **Batch Processing**: Configure batch size for efficient insertion
- **Index Management**: Option to clear index before inserting new data
- **Metadata Filtering**: JSON-based filtering for search operations
- **Source Metadata**: Include original input data as metadata

## Usage

### Insert Operation
1. Configure your AWS credentials
2. Select "Insert Documents" operation
3. Choose your embedding model
4. Configure input data source (text field, JSON, or expression)
5. Set chunk size and overlap parameters
6. Configure S3 bucket, index name, and region
7. Run the node with your input data

### Search Operation
1. Configure your AWS credentials
2. Select "Search Documents" operation
3. Choose the same embedding model used for insertion
4. Enter your search query
5. Set the number of results to return
6. Optionally add metadata filters
7. Run the node to get similarity search results

## Output

### Insert Operation Output
```json
{
  "success": true,
  "operation": "insert",
  "documentsInserted": 5,
  "chunksCreated": 12,
  "insertedIds": ["vec_123...", "vec_456..."],
  "bucketName": "my-vector-bucket",
  "indexName": "my-index",
  "embeddingModel": "amazon.titan-embed-text-v1",
  "textLength": 5000,
  "chunkSize": 1000,
  "chunkOverlap": 200
}
```

### Search Operation Output
```json
{
  "success": true,
  "operation": "search",
  "query": "your search query",
  "resultsCount": 3,
  "embeddingModel": "amazon.titan-embed-text-v1",
  "results": [
    {
      "content": "matching text chunk...",
      "metadata": {
        "chunkIndex": 0,
        "totalChunks": 5,
        "source": "text"
      },
      "score": 0.95
    }
  ]
}
```

## Requirements

- n8n workflow automation platform
- AWS credentials with access to Bedrock and S3
- AWS S3 bucket configured for vector storage

## Installation

1. Copy the node files to your n8n custom nodes directory
2. Install dependencies: `npm install`
3. Build the node: `npm run build`
4. Restart n8n to load the custom node

## Improvements Made

This version includes several key improvements over the original implementation:

1. **Internal Embedding Generation**: The node now generates embeddings internally using LangChain Bedrock, eliminating the need to pass embeddings in the input data
2. **Model Selection**: Users can choose from multiple Bedrock embedding models through a dropdown interface
3. **Flexible Input Processing**: Support for extracting text from specific fields, using entire JSON objects, or custom expressions
4. **Configurable Text Chunking**: Built-in text splitting with configurable chunk size and overlap
5. **Enhanced User Experience**: Clear parameter organization and helpful descriptions
6. **Better Error Handling**: Comprehensive error messages and validation
7. **Rich Output Information**: Detailed output including processing statistics and configuration used

## License

This project is licensed under the MIT License.
