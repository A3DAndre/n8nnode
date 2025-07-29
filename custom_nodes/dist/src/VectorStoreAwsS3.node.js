"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreAwsS3 = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const S3VectorStore_1 = require("./S3VectorStore");
const documents_1 = require("@langchain/core/documents");
const aws_1 = require("@langchain/aws");
class VectorStoreHelper {
    /**
     * Simple text splitter implementation
     */
    static splitText(text, chunkSize, chunkOverlap) {
        if (text.length <= chunkSize) {
            return [text];
        }
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            let end = start + chunkSize;
            // If we're not at the end of the text, try to break at a word boundary
            if (end < text.length) {
                const lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start) {
                    end = lastSpace;
                }
            }
            chunks.push(text.slice(start, end));
            // Move start position, accounting for overlap
            start = end - chunkOverlap;
            if (start <= 0)
                start = end;
        }
        return chunks.filter(chunk => chunk.trim().length > 0);
    }
}
class VectorStoreAwsS3 {
    constructor() {
        this.description = {
            displayName: 'AWS S3 Vector Store',
            name: 'vectorStoreAwsS3',
            group: ['transform'],
            version: 1,
            description: 'Work with your data in AWS S3 Vector Store',
            defaults: {
                name: 'AWS S3 Vector Store',
                color: '#FF9900',
            },
            inputs: [{ displayName: '', type: 'main' }],
            outputs: [{ displayName: '', type: 'main' }],
            credentials: [
                {
                    name: 'aws',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    default: 'insert',
                    options: [
                        {
                            name: 'Insert Documents',
                            value: 'insert',
                            description: 'Insert documents into the vector store',
                        },
                        {
                            name: 'Search Documents',
                            value: 'search',
                            description: 'Search for similar documents',
                        },
                    ],
                },
                // Embedding Configuration
                {
                    displayName: 'Embedding Model',
                    name: 'embeddingModel',
                    type: 'options',
                    required: true,
                    default: 'amazon.titan-embed-text-v1',
                    description: 'Bedrock embedding model to use',
                    options: [
                        {
                            name: 'Amazon Titan Text Embeddings v1',
                            value: 'amazon.titan-embed-text-v1',
                            description: 'Amazon Titan Text Embeddings v1 (1536 dimensions)',
                        },
                        {
                            name: 'Amazon Titan Text Embeddings v2',
                            value: 'amazon.titan-embed-text-v2:0',
                            description: 'Amazon Titan Text Embeddings v2 (1024 dimensions)',
                        },
                        {
                            name: 'Cohere Embed English v3',
                            value: 'cohere.embed-english-v3',
                            description: 'Cohere Embed English v3 (1024 dimensions)',
                        },
                        {
                            name: 'Cohere Embed Multilingual v3',
                            value: 'cohere.embed-multilingual-v3',
                            description: 'Cohere Embed Multilingual v3 (1024 dimensions)',
                        },
                    ],
                },
                // Input Configuration
                {
                    displayName: 'Text Field Name',
                    name: 'textField',
                    type: 'string',
                    required: true,
                    default: 'text',
                    description: 'Name of the field containing the text to embed',
                    placeholder: 'content, text, description, etc.',
                    displayOptions: {
                        show: {
                            operation: ['insert'],
                        },
                    },
                },
                // Text Splitting Configuration
                {
                    displayName: 'Chunk Size',
                    name: 'chunkSize',
                    type: 'number',
                    default: 1000,
                    description: 'Maximum size of each text chunk in characters',
                    typeOptions: {
                        minValue: 100,
                        maxValue: 8000,
                    },
                    displayOptions: {
                        show: {
                            operation: ['insert'],
                        },
                    },
                },
                {
                    displayName: 'Chunk Overlap',
                    name: 'chunkOverlap',
                    type: 'number',
                    default: 200,
                    description: 'Number of characters to overlap between chunks',
                    typeOptions: {
                        minValue: 0,
                        maxValue: 1000,
                    },
                    displayOptions: {
                        show: {
                            operation: ['insert'],
                        },
                    },
                },
                // S3 Configuration
                {
                    displayName: 'Bucket Name',
                    name: 'bucketName',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'S3 bucket name for vector storage',
                    placeholder: 'my-vector-bucket',
                },
                {
                    displayName: 'Index Name',
                    name: 'indexName',
                    type: 'string',
                    required: true,
                    description: 'Vector index identifier within the bucket',
                    placeholder: 'my-vector-index',
                    default: '',
                },
                {
                    displayName: 'Region',
                    name: 'region',
                    type: 'options',
                    required: true,
                    default: 'us-east-1',
                    description: 'AWS region where the S3 bucket is located',
                    options: [
                        {
                            name: 'US East (N. Virginia)',
                            value: 'us-east-1',
                        },
                        {
                            name: 'US East (Ohio)',
                            value: 'us-east-2',
                        },
                        {
                            name: 'US West (N. California)',
                            value: 'us-west-1',
                        },
                        {
                            name: 'US West (Oregon)',
                            value: 'us-west-2',
                        },
                        {
                            name: 'Europe (Ireland)',
                            value: 'eu-west-1',
                        },
                        {
                            name: 'Europe (London)',
                            value: 'eu-west-2',
                        },
                        {
                            name: 'Europe (Frankfurt)',
                            value: 'eu-central-1',
                        },
                        {
                            name: 'Asia Pacific (Tokyo)',
                            value: 'ap-northeast-1',
                        },
                        {
                            name: 'Asia Pacific (Singapore)',
                            value: 'ap-southeast-1',
                        },
                        {
                            name: 'Asia Pacific (Sydney)',
                            value: 'ap-southeast-2',
                        },
                    ],
                },
                // Search Configuration
                {
                    displayName: 'Search Query',
                    name: 'searchQuery',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'Text to search for similar documents',
                    displayOptions: {
                        show: {
                            operation: ['search'],
                        },
                    },
                },
                {
                    displayName: 'Number of Results',
                    name: 'topK',
                    type: 'number',
                    default: 4,
                    description: 'Number of similar documents to return',
                    displayOptions: {
                        show: {
                            operation: ['search'],
                        },
                    },
                },
                // Advanced Options
                {
                    displayName: 'Options',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    options: [
                        {
                            displayName: 'Namespace',
                            name: 'namespace',
                            type: 'string',
                            description: 'Namespace to partition vectors within the index',
                            default: '',
                        },
                        {
                            displayName: 'Batch Size',
                            name: 'batchSize',
                            type: 'number',
                            default: 100,
                            description: 'Number of vectors to insert in each batch',
                            typeOptions: {
                                minValue: 1,
                                maxValue: 1000,
                            },
                            displayOptions: {
                                show: {
                                    '/operation': ['insert'],
                                },
                            },
                        },
                        {
                            displayName: 'Clear Index Before Insert',
                            name: 'clearIndex',
                            type: 'boolean',
                            default: false,
                            description: 'Whether to clear the index before inserting new data',
                            displayOptions: {
                                show: {
                                    '/operation': ['insert'],
                                },
                            },
                        },
                        {
                            displayName: 'Metadata Filter',
                            name: 'metadataFilter',
                            type: 'string',
                            default: '',
                            description: 'JSON object to filter results by metadata. Example: {"category": "documents"}',
                            placeholder: '{"key": "value"}',
                            displayOptions: {
                                show: {
                                    '/operation': ['search'],
                                },
                            },
                        },
                        {
                            displayName: 'Include Source Metadata',
                            name: 'includeMetadata',
                            type: 'boolean',
                            default: true,
                            description: 'Whether to include original input data as metadata',
                            displayOptions: {
                                show: {
                                    '/operation': ['insert'],
                                },
                            },
                        },
                    ],
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                // Get common parameters
                const bucketName = this.getNodeParameter('bucketName', i);
                const indexName = this.getNodeParameter('indexName', i);
                const region = this.getNodeParameter('region', i);
                const embeddingModel = this.getNodeParameter('embeddingModel', i);
                const options = this.getNodeParameter('options', i, {});
                const credentials = await this.getCredentials('aws');
                // Create embeddings instance
                const embeddings = new aws_1.BedrockEmbeddings({
                    model: embeddingModel,
                    region,
                    credentials: {
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey,
                        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
                    },
                });
                const config = {
                    bucketName,
                    indexName,
                    region,
                    namespace: options.namespace,
                    credentials: {
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey,
                        sessionToken: credentials.sessionToken,
                    },
                };
                if (operation === 'insert') {
                    // Get text processing parameters
                    const textField = this.getNodeParameter('textField', i);
                    const chunkSize = this.getNodeParameter('chunkSize', i);
                    const chunkOverlap = this.getNodeParameter('chunkOverlap', i);
                    // Extract text from the specified field
                    const textToProcess = items[i].json[textField];
                    if (!textToProcess || typeof textToProcess !== 'string') {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No valid text found in field '${textField}'`, { itemIndex: i });
                    }
                    // Prepare source metadata (exclude the text field)
                    let sourceMetadata = {};
                    if (options.includeMetadata !== false) {
                        sourceMetadata = { ...items[i].json };
                        delete sourceMetadata[textField]; // Remove the text field from metadata
                    }
                    // Split text into chunks using simple text splitter
                    const textChunks = VectorStoreHelper.splitText(textToProcess, chunkSize, chunkOverlap);
                    // Create documents from chunks
                    const documents = textChunks.map((chunk, index) => new documents_1.Document({
                        pageContent: chunk,
                        metadata: {
                            ...sourceMetadata,
                            chunkIndex: index,
                            totalChunks: textChunks.length,
                            originalLength: textToProcess.length,
                            chunkSize: chunk.length,
                            textField,
                            ...(options.namespace && { namespace: options.namespace }),
                        },
                    }));
                    // Initialize vector store
                    const vectorStore = new S3VectorStore_1.S3VectorStore(embeddings, config);
                    await vectorStore.initialize();
                    // Insert documents in batches
                    const batchSize = options.batchSize || 100;
                    const insertedIds = [];
                    for (let j = 0; j < documents.length; j += batchSize) {
                        const batch = documents.slice(j, j + batchSize);
                        const ids = await vectorStore.addDocuments(batch);
                        insertedIds.push(...ids);
                    }
                    returnData.push({
                        json: {
                            success: true,
                            operation: 'insert',
                            documentsInserted: documents.length,
                            chunksCreated: textChunks.length,
                            insertedIds,
                            bucketName,
                            indexName,
                            embeddingModel,
                            textLength: textToProcess.length,
                            chunkSize,
                            chunkOverlap,
                        },
                    });
                }
                else if (operation === 'search') {
                    const searchQuery = this.getNodeParameter('searchQuery', i);
                    const topK = this.getNodeParameter('topK', i);
                    let filter;
                    if (options.metadataFilter) {
                        try {
                            filter = JSON.parse(options.metadataFilter);
                        }
                        catch (error) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid JSON in metadata filter', { itemIndex: i });
                        }
                    }
                    const vectorStore = new S3VectorStore_1.S3VectorStore(embeddings, { ...config, filter });
                    await vectorStore.initialize();
                    const results = await vectorStore.similaritySearchWithScore(searchQuery, topK, filter);
                    returnData.push({
                        json: {
                            success: true,
                            operation: 'search',
                            query: searchQuery,
                            resultsCount: results.length,
                            embeddingModel,
                            results: results.map(([doc, score]) => ({
                                content: doc.pageContent,
                                metadata: doc.metadata,
                                score,
                            })),
                        },
                    });
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            error: errorMessage,
                            operation,
                        },
                    });
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), errorMessage, { itemIndex: i });
                }
            }
        }
        return [returnData];
    }
}
exports.VectorStoreAwsS3 = VectorStoreAwsS3;
//# sourceMappingURL=VectorStoreAwsS3.node.js.map