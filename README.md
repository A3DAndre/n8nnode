# n8n AWS S3 Vector Store Node

A standalone n8n node package that provides AWS S3 Vector Store integration for vector storage and similarity search operations.

## 🚀 Features

- **AWS S3 Vector Integration**: Direct integration with AWS S3 Vectors API
- **LangChain Compatible**: Works seamlessly with LangChain embeddings and documents
- **Multiple Operations**: Support for insert, retrieve, load, update, and retrieve-as-tool modes
- **Batch Processing**: Efficient handling of large document sets
- **Metadata Support**: Store and filter by document metadata
- **Namespace Support**: Organize vectors within indexes using namespaces
- **Error Handling**: Comprehensive AWS-specific error handling

## 📦 Installation

```bash
npm install n8n-nodes-aws-s3-vector
```

Or with pnpm:

```bash
pnpm install n8n-nodes-aws-s3-vector
```

## 🛠️ Setup

### Prerequisites

1. **AWS Account** with S3 Vectors enabled in your region
2. **AWS Credentials** with appropriate permissions for S3 Vectors operations
3. **n8n Instance** (version 1.82.0 or higher)

### AWS Permissions Required

Your AWS credentials need the following permissions:
- `s3vectors:CreateIndex`
- `s3vectors:DeleteIndex`
- `s3vectors:PutVectors`
- `s3vectors:QueryVectors`
- `s3vectors:GetIndex`

### n8n Configuration

1. Install the package in your n8n instance
2. Configure AWS credentials in n8n (use the 'aws' credential type)
3. The node will appear in the Vector Store category

## 🔧 Configuration Parameters

### Required Parameters

- **Bucket Name**: S3 bucket name for vector storage
- **Index Name**: Vector index identifier within the bucket
- **Region**: AWS region where the S3 bucket is located

### Optional Parameters

- **Namespace**: Partition vectors within the index for organization
- **Metadata Filter**: JSON object to filter search results
- **Batch Size**: Number of vectors to process in each batch (default: 100)
- **Clear Index**: Whether to clear the index before inserting new data

## 📋 Usage Examples

### Basic Insert Operation

```javascript
// Connect an embedding model (e.g., OpenAI Embeddings)
// Connect document input (e.g., from Text Splitter)
// Configure AWS S3 Vector Store:
{
  "bucketName": "my-vector-bucket",
  "indexName": "my-documents-index",
  "region": "us-east-1",
  "options": {
    "namespace": "documents",
    "batchSize": 50
  }
}
```

### Search/Retrieve Operation

```javascript
// Configure for similarity search:
{
  "bucketName": "my-vector-bucket",
  "indexName": "my-documents-index",
  "region": "us-east-1",
  "mode": "load",
  "prompt": "What is machine learning?",
  "topK": 5,
  "options": {
    "namespace": "documents",
    "metadataFilter": "{\"category\": \"tech\"}"
  }
}
```

## 🏗️ Architecture

### Components

1. **VectorStoreAwsS3.node.ts**: Main n8n node implementation
2. **S3VectorStore.ts**: LangChain-compatible vector store wrapper
3. **Utility Functions**: Shared fields and helper functions

### Integration Flow

```
Documents → Embeddings → S3VectorStore → AWS S3 Vectors API
                ↓
Query → Embeddings → Similarity Search → Results
```

## 🔍 Operation Modes

### Insert Mode
- Accepts documents from AI Document connections
- Generates embeddings using connected embedding models
- Stores vectors in AWS S3 with metadata

### Load Mode
- Performs similarity search based on text query
- Returns matching documents with scores
- Supports metadata filtering

### Retrieve Mode
- Returns vector store client for use in AI chains
- Enables integration with RAG workflows
- Supports advanced querying patterns

## 🚨 Error Handling

The node provides detailed error messages for common issues:

- **Authentication Errors**: Invalid AWS credentials
- **Region Issues**: S3 Vectors not available in selected region
- **Index Problems**: Index creation or access failures
- **Vector Dimension Mismatches**: Embedding model compatibility issues

## 🔧 Development

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd n8n-nodes-aws-s3-vector

# Install dependencies
pnpm install

# Build the package
npm run build

# Test the build
node test.js
```

### Project Structure

```
src/
├── VectorStoreAwsS3.node.ts    # Main n8n node
├── S3VectorStore.ts            # Vector store implementation
├── utils/
│   └── sharedFields.ts         # Shared UI components
└── shared/
    └── createVectorStoreNode.ts # Node factory function
```

## 📊 Performance Considerations

- **Batch Processing**: Uses configurable batch sizes for efficient operations
- **Connection Pooling**: Reuses AWS SDK connections
- **Memory Management**: Streams large datasets when possible
- **Rate Limiting**: Handles AWS API rate limits gracefully

## 🔗 Integration Examples

### With OpenAI Embeddings

```javascript
// Workflow: Text Splitter → OpenAI Embeddings → AWS S3 Vector Store
{
  "embedding": "OpenAI Embeddings (text-embedding-ada-002)",
  "vectorStore": {
    "bucketName": "ai-documents",
    "indexName": "openai-embeddings",
    "region": "us-east-1"
  }
}
```

### With RAG Chains

```javascript
// Use in AI chains for retrieval-augmented generation
{
  "mode": "retrieve-as-tool",
  "description": "Search company documents for relevant information"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **"S3 Vectors not available in region"**
   - Ensure S3 Vectors is supported in your selected AWS region
   - Check AWS documentation for regional availability

2. **"Failed to create index"**
   - Verify AWS credentials have necessary permissions
   - Check if index name conflicts with existing indexes

3. **"Vector dimension mismatch"**
   - Ensure embedding model dimensions match index configuration
   - Recreate index if dimension requirements change

### Debug Mode

Enable detailed logging by setting the log level in your n8n configuration:

```javascript
{
  "logLevel": "debug"
}
```

## 📄 License

ISC License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review AWS S3 Vectors documentation
- Open an issue in the repository

## 🔄 Version History

### 1.0.0
- Initial release
- Basic insert and retrieve operations
- AWS S3 Vectors API integration
- LangChain compatibility
- Batch processing support
- Metadata filtering
- Namespace support

---

**Note**: This package requires AWS S3 Vectors to be available in your selected region. Check AWS documentation for the latest regional availability.
