"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Vector = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const aws_1 = require("@langchain/aws");
const client_s3vectors_1 = require("@aws-sdk/client-s3vectors");
/**
 * Simple S3 Vector Node - Everything in one file
 * Based on the Python example for AWS S3 Vectors
 */
class S3Vector {
    constructor() {
        this.description = {
            displayName: 'S3 Vector',
            name: 's3Vector',
            group: ['transform'],
            version: 1,
            description: 'Simple S3 Vector operations - insert and search',
            defaults: {
                name: 'S3 Vector',
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
                            description: 'Insert documents into S3 Vector store',
                        },
                        {
                            name: 'Search Documents',
                            value: 'search',
                            description: 'Search for similar documents',
                        },
                    ],
                },
                // S3 Configuration
                {
                    displayName: 'Bucket Name',
                    name: 'bucketName',
                    type: 'string',
                    default: 'processed-documents',
                    required: true,
                    description: 'S3 bucket name for vector storage',
                },
                {
                    displayName: 'Index Name',
                    name: 'indexName',
                    type: 'string',
                    required: true,
                    default: 'aws',
                    description: 'Vector index name',
                },
                {
                    displayName: 'Region',
                    name: 'region',
                    type: 'string',
                    required: true,
                    default: 'us-east-1',
                    description: 'AWS region',
                },
                // Embedding Configuration
                {
                    displayName: 'Embedding Model',
                    name: 'embeddingModel',
                    type: 'string',
                    required: true,
                    default: 'amazon.titan-embed-text-v1',
                    description: 'Bedrock embedding model ID',
                },
                {
                    displayName: 'Embedding Dimensions',
                    name: 'embeddingDimensions',
                    type: 'number',
                    default: 1536,
                    description: 'Number of embedding dimensions',
                },
                // Insert Configuration
                {
                    displayName: 'Text Field',
                    name: 'textField',
                    type: 'string',
                    required: true,
                    default: 'text',
                    description: 'Field containing text to embed',
                    displayOptions: {
                        show: {
                            operation: ['insert'],
                        },
                    },
                },
                // Search Configuration
                {
                    displayName: 'Search Query',
                    name: 'searchQuery',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'Text to search for',
                    displayOptions: {
                        show: {
                            operation: ['search'],
                        },
                    },
                },
                {
                    displayName: 'Limit',
                    name: 'limit',
                    type: 'number',
                    default: 4,
                    description: 'Number of results to return',
                    displayOptions: {
                        show: {
                            operation: ['search'],
                        },
                    },
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        console.log(`[S3Vector] Starting ${operation} operation with ${items.length} items`);
        for (let i = 0; i < items.length; i++) {
            try {
                // Get parameters
                const bucketName = this.getNodeParameter('bucketName', i);
                const indexName = this.getNodeParameter('indexName', i);
                const region = this.getNodeParameter('region', i);
                const embeddingModel = this.getNodeParameter('embeddingModel', i);
                const embeddingDimensions = this.getNodeParameter('embeddingDimensions', i);
                console.log(`[S3Vector] Config - Bucket: ${bucketName}, Index: ${indexName}, Region: ${region}`);
                const credentials = await this.getCredentials('aws');
                // Create Bedrock embeddings instance
                const bedrock_embeddings = new aws_1.BedrockEmbeddings({
                    model: embeddingModel,
                    region,
                    credentials: {
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey,
                        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
                    },
                });
                // Create S3 Vectors client
                const s3vec = new client_s3vectors_1.S3VectorsClient({
                    region,
                    credentials: {
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey,
                        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
                    },
                });
                switch (operation) {
                    case 'insert': {
                        const textField = this.getNodeParameter('textField', i);
                        const textToProcess = items[i].json[textField];
                        if (!textToProcess || typeof textToProcess !== 'string') {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No valid text found in field '${textField}'`, { itemIndex: i });
                        }
                        console.log(`[S3Vector] Processing text of length: ${textToProcess.length}`);
                        // Generate embedding using BedrockEmbeddings
                        const embedding = await bedrock_embeddings.embedQuery(textToProcess);
                        console.log(`[S3Vector] Generated embedding with ${embedding.length} dimensions`);
                        const vectorId = `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        await s3vec.send(new client_s3vectors_1.PutVectorsCommand({
                            indexName: indexName,
                            vectorBucketName: bucketName,
                            vectors: [{
                                    key: vectorId,
                                    data: {
                                        float32: embedding
                                    },
                                    metadata: {
                                        text: textToProcess,
                                        ...items[i].json, // Include other metadata fields
                                    }
                                }]
                        }));
                        console.log(`[S3Vector] Inserted vector ${vectorId} into bucket ${bucketName}, index ${indexName}`);
                        returnData.push({
                            json: {
                                success: true,
                                operation: 'insert',
                                vectorId,
                                bucketName,
                                indexName,
                                textLength: textToProcess.length,
                                embeddingDimensions: embedding.length,
                                metadata: {
                                    ...items[i].json,
                                    [textField]: undefined, // Remove the original text field
                                },
                            },
                        });
                        break;
                    }
                    case 'search': {
                        const searchQuery = this.getNodeParameter('searchQuery', i);
                        const limit = this.getNodeParameter('limit', i);
                        console.log(`[S3Vector] Searching for: "${searchQuery}", limit: ${limit}`);
                        // Generate embedding for query using BedrockEmbeddings
                        const queryEmbedding = await bedrock_embeddings.embedQuery(searchQuery);
                        console.log(`[S3Vector] Generated query embedding with ${queryEmbedding.length} dimensions`);
                        // Query vectors using QueryVectorsCommand
                        // const queryData = Float32Array.from(queryEmbedding);
                        const queryResponse = await s3vec.send(new client_s3vectors_1.QueryVectorsCommand({
                            queryVector: {
                                float32: queryEmbedding
                            },
                            topK: limit,
                            indexName: indexName,
                            vectorBucketName: bucketName,
                            returnMetadata: true,
                        }));
                        const searchResults = queryResponse.vectors || [];
                        console.log(`[S3Vector] Found ${searchResults.length} results`);
                        returnData.push({
                            json: {
                                success: true,
                                operation: 'search',
                                query: searchQuery,
                                resultsCount: searchResults.length,
                                bucketName,
                                indexName,
                                results: searchResults,
                            },
                        });
                        break;
                    }
                    default:
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
                }
            }
            catch (error) {
                console.error(`[S3Vector] Error processing item ${i + 1}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            error: errorMessage,
                            operation,
                            itemIndex: i,
                        },
                    });
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), errorMessage, { itemIndex: i });
                }
            }
        }
        console.log(`[S3Vector] Completed processing ${items.length} items`);
        return [returnData];
    }
}
exports.S3Vector = S3Vector;
//# sourceMappingURL=S3Vector.node.js.map