"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreAwsS3 = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const S3VectorStore_1 = require("./S3VectorStore");
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
                const bucketName = this.getNodeParameter('bucketName', i);
                const indexName = this.getNodeParameter('indexName', i);
                const region = this.getNodeParameter('region', i);
                const options = this.getNodeParameter('options', i, {});
                const credentials = await this.getCredentials('aws');
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
                    // For insert operation, expect documents in the input data
                    const documents = items[i].json.documents || [];
                    const embeddings = items[i].json.embeddings;
                    if (!documents.length) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'No documents provided for insertion', { itemIndex: i });
                    }
                    if (!embeddings) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'No embeddings model provided', { itemIndex: i });
                    }
                    const vectorStore = new S3VectorStore_1.S3VectorStore(embeddings, config);
                    await vectorStore.initialize();
                    // Clear index if requested
                    if (options.clearIndex) {
                        await vectorStore.clearIndex();
                    }
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
                            insertedIds,
                            bucketName,
                            indexName,
                        },
                    });
                }
                else if (operation === 'search') {
                    const searchQuery = this.getNodeParameter('searchQuery', i);
                    const topK = this.getNodeParameter('topK', i);
                    const embeddings = items[i].json.embeddings;
                    if (!embeddings) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'No embeddings model provided', { itemIndex: i });
                    }
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